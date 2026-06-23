import { type Response } from "express";
import { type AuthenticatedRequest } from "../middleware/auth.ts";
import { ChatService } from "../service/chat.service.ts";
import { AIService } from "../cli/ai/service.ts";
import { routeUserIntent } from "../config/agent.config.ts";
import { getEnabledTools } from "../config/tool.config.ts";
import { generateText, Output } from "ai";
import z from "zod";

const chatService = new ChatService();
let defaultAIService: AIService | null = null;
const getAIService = (req: AuthenticatedRequest) => {
  const userApiKey = req.headers["x-gemini-api-key"] as string | undefined;
  if (userApiKey) {
    return new AIService(userApiKey);
  }
  if (!defaultAIService) {
    defaultAIService = new AIService();
  }
  return defaultAIService;
};

const ApplicationSchema = z.object({
  folderName: z.string().describe("Name of the application folder"),
  description: z.string().describe("Brief description of the application").optional(),
  files: z.array(z.object({
      path: z.string().describe("Relative path from application root ex: src/index.js"),
      content: z.string().describe("Complete content of the file"),
  })).describe("List of files to be created in the application"),
  setupCommands: z.array(z.string()).describe("Commands to setup the application environment (ex: npm install)").optional(),
  runCommand: z.string().describe("Command to run the application (ex: node src/index.js or npm run dev)"),
  dependencies: z.array(z.object({
      name: z.string(),
      version: z.string().optional()
  })).optional().describe("List of dependencies (if any)"),
});

const ModificationSchema = z.object({
  targetFolder: z.string().describe("Target folder name (or '.' for current dir)"),
  explanation: z.string().describe("Summary of changes made"),
  files: z.array(z.object({
      path: z.string().describe("File path relative to target folder"),
      content: z.string().optional().describe("New content (required for create/update)"),
      action: z.enum(['create', 'update', 'delete']).describe("Action to perform")
  })).describe("List of file modifications")
});

export const getMe = (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
};

export const initChat = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId, mode } = req.body;
    const userId = req.user!.id;
    const conversation = await chatService.getorCreateConversations(userId, conversationId, mode);
    res.json({ conversation });
  } catch (error) {
    console.error("Error in init:", error);
    res.status(500).json({ error: "Failed to initialize conversation" });
  }
};

export const listChats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversations = await chatService.getConversationsByUser(userId);
    res.json({ conversations });
  } catch (error) {
    console.error("Error in list:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

export const renameChat = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const userId = req.user!.id;
    await chatService.updateConversationTitle(id as string, title, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in update title:", error);
    res.status(500).json({ error: "Failed to update title" });
  }
};

export const deleteChat = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await chatService.deleteConversation(id as string, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error in delete:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
};

export const streamMessage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { conversationId, content, enabledTools } = req.body;

    if (!conversationId || !content) {
      res.status(400).json({ error: "Missing conversationId or content" });
      return;
    }

    await chatService.addMessage(conversationId, "user", content);

    const dbMessages = await chatService.getMessages(conversationId);
    const aiMessages = chatService.formatMessagesForModel(dbMessages);

    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Transfer-Encoding", "chunked");

    const tools = getEnabledTools(enabledTools);

    const reqAIService = getAIService(req);
    const aiResponse = await reqAIService.sendMessage(
      aiMessages,
      (chunk: string) => {
        res.write(JSON.stringify({ type: "text", content: chunk }) + "\n");
      },
      tools,
      (toolName: string, toolArgs: any) => {
        res.write(JSON.stringify({ type: "tool-call", name: toolName, args: toolArgs }) + "\n");
      }
    );

    if (aiResponse.toolResults && aiResponse.toolResults.length > 0) {
      for (const tr of aiResponse.toolResults) {
        res.write(JSON.stringify({ type: "tool-result", name: tr.toolName, result: tr.toolResult }) + "\n");
      }
    }

    await chatService.addMessage(conversationId, "assistant", aiResponse.content);
    res.end();
  } catch (error) {
    console.error("Error in stream message:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process chat message" });
    } else {
      res.end();
    }
  }
};

export const routeAgent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userInput, history } = req.body;
    const apiKey = req.headers["x-gemini-api-key"] as string | undefined;
    const result = await routeUserIntent({ userInput, history, apiKey });
    res.json(result);
  } catch (error) {
    console.error("Error routing user intent:", error);
    res.status(500).json({ error: "Failed to route intent" });
  }
};

export const generateAgentApp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { description } = req.body;

    if (!description) {
      res.status(400).json({ error: "Missing description" });
      return;
    }

    const PROMPT = `
    You are an expert software developer. Your task is to create a complete production ready application structure based on the user's request.
    User description: ${description}
    Here are the IMPORTANT requirements:
    1. The application should be created in a folder named appropriately to the application purpose.
    2. Create all necessary files and folders required for the application to run.
    3. Each file should have complete content with proper code, comments, and structure along with proper spacing and line break.
    4. Include a brief description of the application.
    5. List any setup commands required to install dependencies or prepare the environment if required.
    6. Provide the commands or steps to run the application.
    7. List all dependencies required by the application in key-value pairs if required.
    8. Include README.md and config files (like .gitignore,.env) as necessary.
    9. Ensure the application is production ready with proper structure and best practices.`;

    const { output: application } = await generateText({
      model: getAIService(req).model,
      output: Output.object({
        schema: ApplicationSchema,
        description: "The structure of the application to be created based on the user's request",
      }),
      prompt: `${PROMPT}\nProvide the response in the specified JSON format only.`,
    });

    res.json({ application });
  } catch (error) {
    console.error("Error generating application structure:", error);
    res.status(500).json({ error: "Failed to generate application structure" });
  }
};

export const modifyAgentApp = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { description, location, history } = req.body;

    if (!description) {
      res.status(400).json({ error: "Missing description" });
      return;
    }

    const conversationHistory = history ? `${history.map((h: any) => `${h.role}: ${h.content}`).join('\n')}` : 'No prior conversation history.';

    const PROMPT = `
    You are an expert software developer. Your task is to modify existing application files based on the user's request.
    Current Working Directory: ${location || "."}
    Recent Conversation History: ${conversationHistory}
    User description: ${description}
    Here are the IMPORTANT requirements:
    1. Identify the target folder to apply modifications (use '.' for current directory).
    2. If the user request refers to previous applications in history, use that context to determine what needs to be modified. If no context is found, assume modifications are to be made in the current directory, otherwise modify the target folder as specified by the user.
    3. Specify the changes needed for each file: create, update, or delete.
    4. For 'create' and 'update' actions, provide the complete new content of the file.
    5. Ensure all modifications align with best practices and maintain application integrity.`;

    const { output: modifications } = await generateText({
      model: getAIService(req).model,
      output: Output.object({
        schema: ModificationSchema,
        description: "The modifications to be made to the existing application based on the user's request",
      }),
      prompt: `${PROMPT}\nProvide the response in the specified JSON format only.`,
    });

    res.json({ modifications });
  } catch (error) {
    console.error("Error generating modifications:", error);
    res.status(500).json({ error: "Failed to generate modifications" });
  }
};
