import chalk from "chalk";
import { marked } from "marked";
import { cancel, intro, isCancel, multiselect, outro, select, text } from "@clack/prompts";
import boxen from "boxen";
import { makeAPIRequest } from "../api-client.ts";
import yoctoSpinner from "yocto-spinner";
import { availableTools, enableTool, getEnabledToolNames, resetTools } from "../../config/tool.config.ts";
import { displayMessages } from "./chat-with-ai.ts";
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

// -- Helpers --

async function selectToolsForChat() {
  const tools = availableTools.map((tool) => ({
    label: `${tool.name} - ${tool.description}`,
    value: tool.name,
  }));

  const selectedTools = await multiselect({
    message: "Select the tools you want to enable for this chat (SPACE to select, ENTER to confirm):\n",
    options: tools,
    required: false,
  });

  if (isCancel(selectedTools)) {
    cancel("Chat setup cancelled.");
    process.exit(0);
  }

  enableTool(selectedTools.map(t => {
    const tool = availableTools.find(tool => tool.name === t);
    return tool ? tool.id : '';
  }).filter(id => id !== ''));

  if (selectedTools.length === 0) {
    console.log(chalk.yellow("\nNo tools selected. Proceeding without tools."));
  } else {
    console.log(chalk.greenBright(`\nEnabled tools: ${selectedTools.join(', ')}`));
  }

  return selectedTools.length > 0;
}

async function editToolsDuringChat() {
  const currentToolNames = getEnabledToolNames();

  const tools = availableTools.map((tool) => ({
    label: `${tool.name} - ${tool.description}`,
    value: tool.name,
  }));

  const selectedTools = await multiselect({
    message: "Update your enabled tools (SPACE to toggle, ENTER to confirm):",
    options: tools,
    required: false,
    initialValues: currentToolNames,
  });

  if (isCancel(selectedTools)) {
    console.log(chalk.yellow("Tool update cancelled. Returning to chat..."));
    return;
  }

  resetTools();

  enableTool(
    selectedTools
      .map((t) => {
        const tool = availableTools.find((tool) => tool.name === t);
        return tool ? tool.id : "";
      })
      .filter((id) => id !== "")
  );

  if (selectedTools.length === 0) {
    console.log(chalk.yellow("⚠ All tools disabled."));
  } else {
    console.log(
      chalk.greenBright(`✓ Tools updated: ${selectedTools.join(", ")}`)
    );
  }
}

async function initConversation(
  conversationId: string | undefined,
  mode: string = "tool-chat"
) {
  const spinner = yoctoSpinner({ text: "Initializing conversation..." }).start();

  try {
    const res = await makeAPIRequest("/api/chat/init", {
      method: "POST",
      body: JSON.stringify({ conversationId, mode }),
    });
    const body = await res.json();
    const conversation = body.conversation;

    if (!conversation) {
      spinner.error("Failed to initialize conversation");
      throw new Error("Failed to initialize conversation");
    }

    const enabledToolNames = getEnabledToolNames();
    spinner.success("Conversation initialized");

    const toolInfo = enabledToolNames.length > 0 ?
      `The following tools are enabled for this chat: ${enabledToolNames.join(", ")}.` :
      "No tools are enabled for this chat.";

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
        `${chalk.greenBright.bold("Tools:")} ${chalk.white.bold(
          toolInfo
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
  } catch (error) {
    spinner.error("Initialization failed");
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
        "Type " + chalk.yellowBright.bold("/exit") + " to end."
      )}\n` +
      `${chalk.greenBright.bold(
        "Type " + chalk.yellowBright.bold("/help") + " for commands."
      )}\n` +
      `${chalk.greenBright.bold(
        "Type " + chalk.yellowBright.bold("/tools") + " to view enabled tools."
      )}\n` +
      `${chalk.greenBright.bold(
        "Type " + chalk.yellowBright.bold("/history") + " to view chat history."
      )}\n` +
      `${chalk.greenBright.bold(
        "Type " + chalk.yellowBright.bold("/clear") + " to clear chat history."
      )}\n` +
      `${chalk.greenBright.bold(
        "Type " + chalk.yellowBright.bold("/change-tools") + " to enable/disable tools."
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

    if (inputStr.toLowerCase().startsWith("/title")) {
      const newTitle = inputStr.substring(7).trim();
      if (newTitle.length === 0) {
        console.log(chalk.redBright.bold("⚠ Please provide a title. Usage: /title My Cool Chat"));
      } else {
        await makeAPIRequest(`/api/chat/${conversation.id}/title`, {
          method: "PUT",
          body: JSON.stringify({ title: newTitle }),
        });
        currentTitle = newTitle;
        shouldAutoUpdateTitle = false;
        console.log(
          chalk.greenBright.bold(`Conversation renamed to "${currentTitle}".`)
        );
      }
      continue;
    }

    if (inputStr.toLowerCase() === "/help") {
      console.log(helpBox);
      continue;
    }

    if (inputStr.toLowerCase() === "/change-tools") {
      await editToolsDuringChat();
      continue;
    }

    if (inputStr.toLowerCase() === "/tools") {
      const enabledToolNames = getEnabledToolNames();
      if (enabledToolNames.length === 0) {
        console.log(chalk.yellowBright.bold("No tools are enabled for this chat."));
      } else {
        console.log(chalk.greenBright.bold(`Enabled tools: ${enabledToolNames.join(', ')}`));
      }
      continue;
    }

    if (inputStr.toLowerCase() === "/history") {
      const historySpinner = yoctoSpinner({
        text: "Fetching chat history...",
      }).start();
      try {
        const historyRes = await makeAPIRequest("/api/chat/conversations");
        const historyBody = await historyRes.json();
        const conversations = historyBody.conversations;
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

        const selectedStr = selectedId as string;

        if (selectedStr === conversation.id) {
          console.log(chalk.green("You are already in this chat."));
          continue;
        }

        const switchSpinner = yoctoSpinner({
          text: "Switching conversation...",
        }).start();

        const switchRes = await makeAPIRequest("/api/chat/init", {
          method: "POST",
          body: JSON.stringify({ conversationId: selectedStr }),
        });
        const switchBody = await switchRes.json();
        const newConversation = switchBody.conversation;

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
      } catch (err) {
        historySpinner.stop();
        console.log(
          chalk.red(`Error fetching history: ${(err as Error).message}`)
        );
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

      const clearSpinner = yoctoSpinner({
        text: "Clearing chat history...",
      }).start();
      try {
        await makeAPIRequest(`/api/chat/${conversation.id}`, {
          method: "DELETE",
        });
        conversation.messages = [];
        clearSpinner.success("Chat history cleared.");
      } catch (err) {
        clearSpinner.error("Failed to clear chat history.");
        console.log(chalk.red(`Error: ${(err as Error).message}`));
      }
      continue;
    }

    // --- CHAT FLOW ---

    const spinner = yoctoSpinner({ text: "AI is thinking..." }).start();
    try {
      const enabledTools = availableTools.filter(t => t.enabled).map(t => t.id);

      const response = await makeAPIRequest("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          conversationId: conversation.id,
          content: inputStr,
          enabledTools: enabledTools,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to read stream from server");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let isFirstChunk = true;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);

            if (parsed.type === "text") {
              if (isFirstChunk) {
                spinner.stop();
                process.stdout.write(chalk.greenBright.bold("AI 🤖: "));
                isFirstChunk = false;
              }
              process.stdout.write(parsed.content);
            } 
            
            else if (parsed.type === "tool-call") {
              spinner.stop();
              console.log("\n");

              let details = "";
              if (parsed.args?.code) {
                details = chalk.white("\nCode to execute:\n") + chalk.yellow(parsed.args.code);
              } else {
                details = chalk.gray(JSON.stringify(parsed.args, null, 2));
              }

              console.log(boxen(`${chalk.yellowBright.bold("⚡ Tool Call:")} ${chalk.white.bold(parsed.name)}\n${details}`, {
                padding: 1,
                borderColor: "yellow",
                margin: 1,
                title: chalk.yellowBright.bold("Tool Execution Request"),
              }));
            } 
            
            else if (parsed.type === "tool-result") {
              console.log("\n");
              console.log(boxen(
                `${chalk.cyanBright.bold("Result (" + parsed.name + "):")}\n${chalk.white(JSON.stringify(parsed.result, null, 2))}`,
                {
                  padding: 1,
                  borderColor: "cyan",
                  margin: 1,
                  title: chalk.cyanBright.bold("Tool Results"),
                }
              ));
            }
          } catch (err) {}
        }
      }
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer);
          if (parsed.type === "text") {
            if (isFirstChunk) {
              spinner.stop();
              process.stdout.write(chalk.greenBright.bold("AI 🤖: "));
              isFirstChunk = false;
            }
            process.stdout.write(parsed.content);
          }
        } catch (err) {}
      }
      console.log("\n");

      if (shouldAutoUpdateTitle) {
        const titleSnippet =
          inputStr.slice(0, 50) + (inputStr.length > 50 ? "..." : "");
        await makeAPIRequest(`/api/chat/${conversation.id}/title`, {
          method: "PUT",
          body: JSON.stringify({ title: titleSnippet }),
        });
        currentTitle = titleSnippet;
        shouldAutoUpdateTitle = false;
      }
    } catch (error) {
      spinner.stop();
      console.log(chalk.red(`Something went wrong: ${error}`));
    }
  }
}

export default async function startToolChatwithAI(
  { conversationId, mode = "tool-chat" }:
  { conversationId?: string; mode?: string; }
) {
  intro(
    boxen(
      chalk.greenBright.bold("Welcome to Dynamite AI Chat with Tools! 🚀"),
      {
        padding: 1,
        margin: 1,
        borderStyle: "round",
        borderColor: "green",
        title: chalk.greenBright.bold("Dynamite AI 🤖"),
      }
    )
  );

  try {
    const spinner = yoctoSpinner({ text: "Authenticating..." }).start();
    const userRes = await makeAPIRequest("/api/user/me");
    const userBody = await userRes.json();
    const user = userBody.user;

    if (!user) {
      spinner.error("Authentication failed. Please login again.");
      process.exit(1);
    }

    spinner.success("Authenticated as " + user.name);

    await selectToolsForChat();
    const initSpinner = yoctoSpinner({
      text: "Initializing conversation...",
    }).start();
    const conversation = await initConversation(conversationId, mode);
    initSpinner.stop();

    await chatLoop({
      ...conversation,
      userId: user.id,
      title: conversation.title || "New Chat",
    });

    resetTools();
    outro(chalk.greenBright.bold("Thank you for using Dynamite AI Chat!"));
  } catch (error) {
    console.log("\n");
    const errorBox = boxen(chalk.redBright.bold("Error: " + (error as Error).message), {
      padding: 1,
      borderColor: "red",
    });

    console.log(errorBox);
    resetTools();
    process.exit(1);
  }
}
