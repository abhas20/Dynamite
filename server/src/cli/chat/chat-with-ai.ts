import chalk from "chalk";
import { marked } from "marked";
import { intro, isCancel, outro, select, text } from "@clack/prompts";
import boxen from "boxen";
import { makeAPIRequest } from "../api-client.ts";
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
  mode: string = "chat"
) {
  const res = await makeAPIRequest("/api/chat/init", {
    method: "POST",
    body: JSON.stringify({ conversationId, mode }),
  });
  const body = await res.json();
  const conversation = body.conversation;

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
        await makeAPIRequest(`/api/chat/${conversation.id}/title`, {
          method: "PUT",
          body: JSON.stringify({ title: newTitle }),
        });
        currentTitle = newTitle;
        conversation.title = newTitle;
        shouldAutoUpdateTitle = false;
        console.log(chalk.green(`✓ Conversation renamed to: ${newTitle}`));
      } else {
        console.log(chalk.blue(`Current Title:${conversation.title}`));
        console.log(
          chalk.yellow("⚠ Please provide a title to change. Usage: /title My Cool Chat")
        );
      }
      continue;
    }

    if (inputStr.toLowerCase() === "/history") {
      const historySpinner = yoctoSpinner({ text: "Fetching chat history..." }).start();
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
        await makeAPIRequest(`/api/chat/${conversation.id}`, {
          method: "DELETE",
        });
        conversation.messages = [];
        clearSpinner.success("Chat history cleared.");
      } catch (err) {
        clearSpinner.error("Failed to clear chat history.");
        console.log(chalk.red(`Error: ${(err as Error).message}`));
      }
      process.exit(0);
    }

    // --- CHAT FLOW ---

    const spinner = yoctoSpinner({ text: "AI is thinking..." }).start();
    try {
      const response = await makeAPIRequest("/api/chat/message", {
        method: "POST",
        body: JSON.stringify({
          conversationId: conversation.id,
          content: inputStr,
          useTools: false,
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
    const userRes = await makeAPIRequest("/api/user/me");
    const userBody = await userRes.json();
    const user = userBody.user;

    if (!user) {
      spinner.error("Authentication failed. Please login again.");
      process.exit(1);
    }

    spinner.success("Authenticated as " + user.name);

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

    outro(chalk.greenBright.bold("Thank you for using Dynamite AI Chat!"));
  } catch (error) {
    console.log("\n");
    const errorBox = boxen(chalk.redBright.bold("Error: " + (error as Error).message), {
      padding: 1,
      borderColor: "red",
    });
    console.log(errorBox);
    process.exit(1);
  }
}
