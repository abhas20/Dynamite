import { cancel, intro, isCancel, outro, select } from "@clack/prompts";
import chalk from "chalk";
import { requireAuth } from "../../../lib/token.ts";
import yoctoSpinner from "yocto-spinner";
import { makeAPIRequest } from "../../api-client.ts";
import { Command } from "commander";
import { startChat } from "../../chat/chat-with-ai.ts";
import startToolChatwithAI from "../../chat/chat-ai-tools.ts";
import { startAgentChat } from "../../chat/chat-ai-agents.ts";

export async function historyActions() {
  intro(chalk.bold("📜 Chat History ..."));

  const token = await requireAuth();
  if (!token || !token?.access_token) {
    console.log(chalk.bgRed("Not authorised. Please login before continuing."));
    return;
  }

  const spinner = yoctoSpinner({ text: "Fetching chat history..." }).start();
  let conversations: any[] = [];

  try {
    const res = await makeAPIRequest("/api/chat/conversations");
    const body = await res.json();
    conversations = body.conversations || [];
  } catch (err) {
    spinner.stop();
    console.log(chalk.red("Failed to fetch chat history from server."));
    return;
  }

  spinner.stop();

  if (conversations.length === 0) {
    outro(chalk.yellow("No previous chat history found. Start a new one using 'dynamite wake-up'!"));
    return;
  }

  const options = conversations.map((c) => {
    const modeLabel = 
      c.mode === "chat" ? "AI Chat" :
      c.mode === "tool-chat" ? "AI Tools" :
      c.mode === "ai-agent" || c.mode === "ai-agent-chat" ? "AI Agent" : c.mode;

    const lastMsg = c.messages && c.messages[0] 
      ? ` (${c.messages[0].content.substring(0, 30)}${c.messages[0].content.length > 30 ? "..." : ""})`
      : "";

    return {
      value: JSON.stringify({ id: c.id, mode: c.mode }),
      label: `${c.title || "Untitled Chat"} - [${modeLabel}]`,
      hint: `Last updated: ${new Date(c.updatedAt).toLocaleDateString()}${lastMsg}`
    };
  });

  const selected = await select({
    message: "Select a previous conversation to resume:",
    options: [
      { value: "exit", label: chalk.red("Go Back") },
      ...options
    ]
  });

  if (isCancel(selected) || selected === "exit") {
    cancel("Operation cancelled.");
    return;
  }

  const { id, mode } = JSON.parse(selected as string);

  outro(chalk.green(`Resuming conversation mode: ${mode}...`));

  if (mode === "tool-chat" || mode === "tools" || mode === "tool-chat-chat") {
    await startToolChatwithAI({ conversationId: id, mode });
  } else if (mode === "ai-agent" || mode === "ai-agent-chat") {
    await startAgentChat({ conversationId: id, mode });
  } else {
    await startChat({ conversationId: id, mode });
  }
}

export const historyCmd = new Command("history")
  .description("Resume a previous chat conversation")
  .action(async () => {
    await historyActions();
  });
