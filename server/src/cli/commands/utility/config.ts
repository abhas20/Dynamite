import { cancel, confirm, intro, isCancel, outro, password, select } from "@clack/prompts";
import chalk from "chalk";
import { getStoredApiKey, storeApiKey, clearStoredApiKey } from "../../../lib/config.ts";
import { Command } from "commander";
import { requireAuth } from "../../../lib/token.ts";
import yoctoSpinner from "yocto-spinner";
import { makeAPIRequest } from "../../api-client.ts";

export async function configActions() {
  const token = await requireAuth();
  if(!token || !token?.access_token){
      console.log(chalk.bgRed("Not authorised. Please login before continuing."));
      return;
  }

  const spinner = yoctoSpinner({text:"Fetching up user details..."}).start();

  let user;
  try {
      const res = await makeAPIRequest("/api/user/me");
      const body = await res.json();
      user = body.user;
  } catch (err) {
      spinner.stop();
      console.log(chalk.bgRed("Invalid session or server unreachable. Please login again."));
      return;
  }

  spinner.stop();

  if(!user){
      console.log(chalk.bgRed("Invalid session.Please login again to continue."));
      return;
  }
    
  intro(chalk.bold("⚙️  Dynamite Config ..."));

  const choice = await select({
    message: "What configuration action would you like to perform?",
    options: [
      { value: "show", label: "Show Gemini API Key", hint: "View the currently configured key" },
      { value: "set", label: "Set Gemini API Key", hint: "Input a new Gemini API key" },
      { value: "remove", label: "Remove Gemini API Key", hint: "Delete the stored Gemini API key" },
      { value: "exit", label: "Exit", hint: "Go back" },
    ],
  });

  if (isCancel(choice) || choice === "exit") {
    cancel("Config cancelled.");
    process.exit(0);
  }

  if (choice === "show") {
    const key = await getStoredApiKey();
    if (!key) {
      outro(chalk.yellow("No Gemini API key is currently configured."));
    } else {
      const masked = key.length > 8 ? `${key.substring(0, 7)}...${key.substring(key.length - 4)}` : "***";
      outro(chalk.green(`Currently configured key: ${chalk.bold(masked)}`));
    }
  } else if (choice === "set") {
    const keyInput = await password({
      message: "Enter your Gemini API Key:",
      validate(value) {
        if (!value.trim()) return "API Key cannot be empty.";
        if (!value.startsWith("AIzaSy")) return "Gemini API Keys typically start with 'AIzaSy'.";
      },
    });

    if (isCancel(keyInput)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    await storeApiKey(keyInput.toString());
    outro(chalk.greenBright("✅ Gemini API Key stored successfully!"));
  } else if (choice === "remove") {
    const confirmRemove = await confirm({
      message: "Are you sure you want to remove your Gemini API key?",
      initialValue: false,
    });

    if (isCancel(confirmRemove) || !confirmRemove) {
      cancel("Operation cancelled.");
      process.exit(0);
    }

    await clearStoredApiKey();
    outro(chalk.greenBright("✅ Gemini API Key removed successfully!"));
  }
}

export const config = new Command("config")
  .description("Configure Dynamite CLI settings (e.g. Gemini API Key)")
  .action(async () => {
    await configActions();
  });
