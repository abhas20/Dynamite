import chalk from "chalk";
import { ChatService } from "../../service/chat.service.ts";
import boxen from "boxen";
import { displayMessages } from "./chat-with-ai.ts";
import { confirm, intro, isCancel, outro, text } from "@clack/prompts";
import { getUserFromToken } from "../../lib/token.ts";
import yoctoSpinner from "yocto-spinner";
import { generateApplicationStructurePrompt, modifyApplicationStructurePrompt, routeUserIntent } from "../../config/agent.config.ts";
import path from "path";
import { existsSync } from "fs";
import { prisma } from "../../lib/prisma.ts";



const chatService = new ChatService();

async function initConversation(
  conversationId: string | undefined,
  mode: string = "Agent Mode",
  userId: string
) {
  const conversation = await chatService.getorCreateConversations(
    userId,
    conversationId,
    mode
  );
  if (!conversation) {
    throw new Error("Failed to initialize conversation");
  }

  const conversationInfo = boxen(
    `${chalk.greenBright.bold("Conversation ID:")} ${chalk.white.bold(
      conversation.id
    )}\n` +
      `${chalk.greenBright.bold("Mode:")} ${chalk.white.bold(
        conversation.mode
      )}\n` +
      `${chalk.greenBright.bold("Title:")} ${chalk.white.bold(
        conversation.title || "New Chat"
      )}\n` +
      `${chalk.greenBright.bold("Working Directory:")} ${chalk.white.bold(
        process.cwd()
      )}\n`,
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "green",
      title: chalk.greenBright.bold("Conversation Initialized"),
      titleAlignment: "center",
    }
  );

  console.log(conversationInfo);

  if (conversation.messages && conversation.messages.length > 0) {
    console.log(
      chalk.yellowBright.bold("Previous messages in this conversation:")
    );
    displayMessages(conversation.messages);
  }

  return conversation;
}


async function agentLoop(conversation: {
  id: string;
  userId: string;
  mode: string;
  title: string;
}, initialPath?:string) {
  let continueChat = true;
  let currWorkingDir = initialPath || process.cwd();

  const getHelpBox = () => boxen(
    chalk.cyanBright.bold(
      `AI Agent Mode Active 🕵️\n\n` +
      `Current Working Directory: ${chalk.yellow(currWorkingDir)}\n\n` +
      `Commands:\n` +
      `• /cd <path>   : Change working directory\n` +
      `• /exit        : Quit agent mode\n` +
      `• /help        : Show this menu\n\n` +
      `Examples:\n` +
      `"Create a Next.js app named 'my-blog'"`     
    ),
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
      title: chalk.cyanBright.bold("Agent Control Panel"),
    }
  );

  console.log(getHelpBox());

  while (continueChat) {
    const userInput = await text({
      message: chalk.blueBright.bold(`Agent (${path.basename(currWorkingDir)}):`),
      placeholder: "Instruction or command...",
      validate(value: string) {
        if (value.trim().length === 0) return "Please enter a message.";
      },
    });

    if (isCancel(userInput)) {
      console.log(chalk.greenBright.bold("Exiting chat. Goodbye 👋!"));
      process.exit(0);
    }

    const inputStr = userInput.toString();

    // --- COMMANDS ---

    if (inputStr.toLowerCase() === "/exit") {
      console.log(chalk.greenBright.bold("Exiting chat. Goodbye 👋!"));
      process.exit(0);
    }

    if (inputStr.toLowerCase() === "/help") {
      console.log(getHelpBox());
      continue;
    }

    if (inputStr.toLowerCase().startsWith("/cd ")) {
      const newPath = inputStr.substring(4).trim();
      const resolvedPath = path.resolve(currWorkingDir, newPath);
      
      if (existsSync(resolvedPath)) {
        currWorkingDir = resolvedPath;
        console.log(chalk.green(`✓ Directory changed to: ${chalk.bold(currWorkingDir)}`));
      } else {
        console.log(chalk.red(`⚠ Directory not found: ${resolvedPath}`));
        // ADD FEATURE: Ask if they want to create it? 
      }
      continue;
    }

    try {
      await chatService.addMessage(conversation.id, "user", userInput.toString());

      const data = await prisma.conversations.findUnique({
        where: { id: conversation.id },
        include: { messages: true },
      })

      const history = [];
      if(data){
        for(const msg of data.messages){
          history.push({role: msg.role, content: msg.content});
        }
      }

      const routingSpinner = yoctoSpinner({text:"Processing your instruction with AI Agent...",color:"cyan"}).start();
      const routing = await routeUserIntent({userInput:userInput.toString(),history:history});
      routingSpinner.stop();

      let resultMessage = "";
      if(routing.intent === "create"){
        const result = await generateApplicationStructurePrompt({description:userInput.toString(), location: currWorkingDir});
  
        if(result && result.application){
          const responseMessage = `Application "${result.application.folderName}" has been generated successfully with the following structure:\n\n` +
          `No. of Files: ${result.application.files.length}\n` +
          `SetUp Commands: ${result.application.setupCommands?.length != null ? result.application.setupCommands.join(", ") : "No setup required"}\n` +
          `Application Directory: ${result.appDir}\n\n` +
          `Application Structure:\n` +
          `${result.tree}\n\n` +
          `You can now navigate to the application directory and start working on your project.`;
          resultMessage = responseMessage;
        }
        else{
          resultMessage = "Failed to generate application structure. Please try again.";
        }
      }

      else if(routing.intent === "modify"){
        const result = await modifyApplicationStructurePrompt({description:userInput.toString(), location: currWorkingDir,history:history});

        if(result && result.modifications){
          const responseMessage = `The following modifications have been made to your application:\n\n` +
          `Reason: ${result.modifications.explanation}\n` +
          `Folder Modified: ${result.modifications.targetFolder}\n` +
          `No. of Files Modified: ${result.modifications.files.length}\n` 

          resultMessage = responseMessage;
        }
        else{
          resultMessage = "Failed to modify application structure. Please try again.";
        }
      }
      else{
        resultMessage = "I am currently specialized in Creating or Modifying file structures. Please provide a task related to that.";
      }

      if(resultMessage){

        await chatService.addMessage(conversation.id, "assistant", resultMessage);
        console.log(chalk.greenBright.bold("\nAI Agent Response:"));
        console.log(chalk.whiteBright.bold(resultMessage));
        
        const continueResponse = await confirm({
          message: chalk.yellowBright.bold(
            "Do you want to give more instructions to the AI Agent or create another application? " 
          ),
          initialValue: false,
        });
        
        if (!continueResponse || isCancel(continueResponse)) {
          console.log(chalk.cyan("Exiting Agent Mode"));
          continueChat = false;
        }
      }
      else{
        const errorMsg = "Failed to generate application structure. Please try again.";
        await chatService.addMessage(conversation.id, "assistant", errorMsg);
        console.log(chalk.redBright.bold("\nAI Agent Response:"));
        console.log(chalk.whiteBright.bold(errorMsg));
      }

    }
      
    catch (error) {
      
      console.log('\n');
      const errorBox=boxen(chalk.redBright.bold("Error: " + (error as Error).message), {
        padding: 1,
        borderColor: "red",
      });
      console.log(errorBox);

    }
}
}

export async function startAgentChat({
  mode = "ai-agent-chat",
  conversationId,
}: {
  mode?: string;
  conversationId?: string;
}) {

   intro(
     boxen(chalk.greenBright.bold("Welcome to Dynamite AI Agent Mode!"), {
       padding: 1,
       margin: 1,
       borderStyle: "round",
       borderColor: "magenta",
     })
   );

   try {
    const spinner = yoctoSpinner({text:"Authenticating user...",color:"cyan"}).start();
    const user = await getUserFromToken();
    
    if (!user) {
      spinner.error("Authentication failed. Please login again.");
      process.exit(1);
    }

    spinner.success("User authenticated successfully.");

    const targetDir = await text({
      message: chalk.yellowBright.bold("Set working directory:"),
      placeholder: "Press Enter for current directory",
      initialValue: process.cwd(),
    });

    if (isCancel(targetDir)) {
      console.log(chalk.red("Cancelled."));
      process.exit(0);
    }

    const finalPath = targetDir.toString();
    if (!existsSync(finalPath)) {
      console.log(chalk.yellow(`⚠ Warning: Path '${finalPath}' does not exist. Agent may fail if it expects to read files.`));
    }

    const shouldContinue = await confirm({
      message: chalk.yellowBright.bold(
        `You are about to start an AI Agent chat in the directory: ${finalPath}. Do you want to continue?`,
      ),
      initialValue: true,
    })

    if (!shouldContinue || isCancel(shouldContinue)) {
      console.log("Exiting Agent Mode");
      console.log(chalk.redBright.bold("Operation cancelled by user."));
      process.exit(0);
    }

    const initSpinner = yoctoSpinner({
      text: "Initializing agent conversation...",
      color: "magenta",
    }).start();
    const conversation = await initConversation(conversationId, mode, user.id);
    initSpinner.stop();

    await agentLoop({
      ...conversation,
      userId: user.id,
      title: conversation.title || "New Agent Chat",
    },finalPath);

    outro(chalk.greenBright.bold("Thank you for using Dynamite AI Agent Mode!"));
    
   } 
   catch (error) {
    console.log('\n');
    const errorBox=boxen(chalk.redBright.bold("Error: " + (error as Error).message), {
      padding: 1,
      borderColor: "red",
    });
    console.log(errorBox);
    process.exit(1);

   }
  
}