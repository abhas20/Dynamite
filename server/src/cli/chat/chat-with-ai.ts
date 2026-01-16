import chalk from "chalk";
import { marked } from "marked";
import { AIService } from "../ai/service.ts";
import { ChatService } from "../../service/chat.service.ts";
import { intro, isCancel, outro, select, text } from "@clack/prompts";
import boxen from "boxen";
import { getUserFromToken } from "../../lib/token.ts";
import yoctoSpinner from "yocto-spinner";
import TerminalRenderer from "marked-terminal";

marked.setOptions({
  // @ts-ignore
  renderer: new TerminalRenderer({
    code: chalk.cyanBright,
    blockquote: chalk.gray,
    em: chalk.italic,
    strong: chalk.bold,
    heading: chalk.greenBright,
    link: chalk.blueBright.underline,
    listitem: chalk.reset,
    hr: chalk.gray,
    list: chalk.reset,
    codespan: chalk.cyanBright,
    del: chalk.strikethrough,
    href: chalk.blueBright.underline,
    firstHeading: chalk.greenBright.bold.underline,
  }),
});

const aiService = new AIService();
const chatService = new ChatService();

// --- Helpers ---

export function displayMessages(messages: { role: string; content: string }[]) {
  messages.forEach((msg) => {
    if (msg.role === "user") {
      console.log(
        boxen(chalk.blueBright.bold("User:") + "\n" + msg.content, {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "blue",
          title: chalk.blueBright.bold("User 👤"),
        })
      );
    } else if (msg.role === "assistant") {
      console.log(
        boxen(
          chalk.greenBright.bold("AI:") + "\n" + marked.parse(msg.content),
          {
            padding: 1,
            margin: 1,
            borderStyle: "round",
            borderColor: "green",
            title: chalk.greenBright.bold("AI 🤖"),
          }
        )
      );
    }
  });
}

async function initConversation(
  conversationId: string | undefined,
  mode: string = "chat",
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


async function getAIResponse(conversationId: string) {
  const spinner = yoctoSpinner({ text: "AI is thinking..." }).start();

  try {
    const dbMessages = await chatService.getMessages(conversationId);

    const aiMessages = chatService.formatMessagesForModel(dbMessages);

    let fullRes = "";
    let isFirstChunk = true;

    const result = await aiService.sendMessage(aiMessages, (chunk: string) => {
      if (isFirstChunk) {
        spinner.text = "AI is typing...";
        isFirstChunk = false;
      }
      fullRes += chunk;
    });

    spinner.success("Response received");
    return result.content;
  } catch (error) {
    spinner.error("Failed to get AI response.");
    throw error;
  }
}

async function chatLoop(conversation: {
  id: string;
  userId: string;
  title: string;
  messages: { role: string; content: string }[];
}) {

  let currentTitle = conversation.title || "New Chat";

  let shouldAutoUpdateTitle = currentTitle === "New Chat";

  const helpBox = boxen(
    `${chalk.greenBright.bold("Type your message and press Enter.")}\n` +
      `${chalk.greenBright.bold(
        "Type " +
          chalk.yellowBright.bold("/title <new name>") +
          " to rename chat."
      )}\n` +
      `${chalk.greenBright.bold(
        "Type " + chalk.yellowBright.bold("/history") + " to view chat history."
      )}\n` +
      `${chalk.greenBright.bold(
        "Type " + chalk.yellowBright.bold("/clear") + " to clear chat history."
      )}\n` +
      `${chalk.greenBright.bold(
        "Type " + chalk.yellowBright.bold("/exit") + " to end."
      )}\n` +
      `${chalk.greenBright.bold(
        "Type " + chalk.yellowBright.bold("/help") + " for commands."
      )}`,
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
      title: chalk.cyan.bold("Chat Commands"),
      titleAlignment: "center",
    }
  );

  console.log(helpBox);

  while (true) {
    const userInput = await text({
      message: chalk.blueBright.bold("You:"),
      placeholder: "Type your message here...",
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
      console.log(helpBox);
      continue;
    }

    if (inputStr.toLowerCase().startsWith("/title")) {
      const newTitle = inputStr.replace("/title", "").trim();
      if (newTitle.length > 0) {
        await chatService.updateConversationTitle(
          conversation.id,
          newTitle,
          conversation.userId
        );
        currentTitle = newTitle;
        conversation.title = newTitle;
        shouldAutoUpdateTitle = false;
        console.log(chalk.green(`✓ Conversation renamed to: ${newTitle}`));
      } else {
        console.log(
          chalk.yellow("⚠ Please provide a title. Usage: /title My Cool Chat")
        );
      }
      continue;
    }

    if (inputStr.toLowerCase() === "/history") {
      const historySpinner = yoctoSpinner({ text: "Fetching chat history..." }).start();
      try {
        if (!conversation.userId) {
          throw new Error("User ID is missing from the current session.");
        }
        const conversations = await chatService.getConversationsByUser(
          conversation.userId
        );
        historySpinner.stop();

        if (!conversations || conversations.length === 0) {
          console.log(chalk.yellow("No previous chat history found."));
          continue;
        }

        const options = conversations.map((c: any) => ({
          value: String(c.id),
          label:
            c.id === conversation.id
              ? `${c.title || "Untitled"} (Current)`
              : c.title || "Untitled",
          hint: c.id === conversation.id ? "You are here" : undefined,
        }));

        const selectedId = await select({
          message: "Select a conversation to continue:",
          options: [
            { value: "cancel", label: chalk.red("Cancel") },
            ...options,
          ],
        });

        if (isCancel(selectedId) || selectedId === "cancel") {
          console.log(chalk.gray("Action cancelled."));
          continue;
        }

        if (selectedId === conversation.id) {
          console.log(chalk.green("You are already in this chat."));
          continue;
        }

        const switchSpinner = yoctoSpinner({
          text: "Switching conversation...",
        }).start();
        console.log("Debug Switching:", { userId: conversation.userId, selectedId });

        const newConversation = await chatService.getorCreateConversations(
          conversation.userId,
          selectedId.toString()
        );

        if (!newConversation) {
          switchSpinner.error("Failed to switch conversation.");
          continue;
        }

        conversation.id = newConversation.id;
        conversation.title = newConversation.title || "Prev Chat";
        conversation.messages = newConversation.messages || [];
        currentTitle = newConversation.title || "New Chat";
        shouldAutoUpdateTitle = currentTitle === "New Chat";

        switchSpinner.success(`Switched to: ${chalk.bold(currentTitle)}`);

        console.log(chalk.yellowBright.bold("\n--- History Loaded ---"));
        if (conversation.messages.length > 0) {
          displayMessages(conversation.messages);
        } else {
          console.log(chalk.gray("No messages in this conversation yet."));
        }
        console.log(chalk.yellowBright.bold("----------------------\n"));
      }
      catch (err)
      {
        historySpinner.stop();
        console.log(chalk.red(`Error fetching history: ${(err as Error).message}`));
      }
      continue;
    }
    
    if (inputStr.toLowerCase() === "/clear") {
      const confirmClear = await select({
        message: "Are you sure you want to clear the chat history?",
        options: [
          { value: "yes", label: chalk.red("Yes, clear it") },
          { value: "no", label: chalk.green("No, keep it") },
        ],
      });

      if (isCancel(confirmClear) || confirmClear === "no") {
        console.log(chalk.gray("Chat history not cleared."));
        continue;
      }

      const clearSpinner = yoctoSpinner({ text: "Clearing chat history..." }).start();
      try {
        await chatService.deleteConversation(conversation.id,conversation.userId);
        conversation.messages = [];
        clearSpinner.success("Chat history cleared.");
      } catch (err) {
        clearSpinner.error("Failed to clear chat history.");
        console.log(chalk.red(`Error: ${(err as Error).message}`));
      }
      continue;
    }

    // --- CHAT FLOW ---

    try {
      await chatService.addMessage(conversation.id, "user", inputStr);

      const aiResponse = await getAIResponse(conversation.id);
      await chatService.addMessage(conversation.id, "assistant", aiResponse);

      console.log(
        boxen(chalk.greenBright.bold("AI:") + "\n" + marked.parse(aiResponse), {
          padding: 1,
          margin: 1,
          borderStyle: "round",
          borderColor: "green",
          title: chalk.greenBright.bold("AI 🤖"),
        })
      );

      if (shouldAutoUpdateTitle) {
        const titleSnippet =
          inputStr.slice(0, 50) + (inputStr.length > 50 ? "..." : "");
        await chatService.updateConversationTitle(
          conversation.id,
          titleSnippet,
          conversation.userId
        );

        currentTitle = titleSnippet;
        shouldAutoUpdateTitle = false;
        // console.log("Debug: Title auto-updated");
      }
    } catch (error) {
      console.log(chalk.red(`Something went wrong: ${error}`));
    }
  }
}

export async function startChat({
  mode = "chat",
  conversationId,
}: {
  mode?: string;
  conversationId?: string;
}) {
  intro(
    boxen(chalk.greenBright.bold("Welcome to Dynamite AI Chat!"), {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "cyan",
    })
  );

  try {
    const spinner = yoctoSpinner({ text: "Authenticating..." }).start();
    const user = await getUserFromToken();

    if (!user) {
      spinner.error("Authentication failed. Please login again.");
      process.exit(1);
    }

    spinner.success("Authenticated as " + user.name);

    const initSpinner = yoctoSpinner({
      text: "Initializing conversation...",
    }).start();
    const conversation = await initConversation(conversationId, mode, user.id);
    initSpinner.stop();

    await chatLoop({
      ...conversation,
      userId: user.id,
      title: conversation.title || "New Chat",
    });

    outro(chalk.greenBright.bold("Thank you for using Dynamite AI Chat!"));
    
  } 
  catch (error) {
    console.log("\n");
    const errorBox=boxen(chalk.redBright.bold("Error: " + (error as Error).message), {
      padding: 1,
      borderColor: "red",
    });
    console.log(errorBox);
    process.exit(1);
  }
}
