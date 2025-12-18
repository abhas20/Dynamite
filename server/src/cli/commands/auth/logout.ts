import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";
import chalk from "chalk";
import { clearStoredToken, getStoredToken } from "../../../lib/token.ts";
import { Command } from "commander";

export async function logoutActions() {
  intro(chalk.bold("🔒 CLI Logout ..."));

  const existingToken = await getStoredToken();
  if (!existingToken) {
    outro(chalk.yellow("You are not logged in."));
    process.exit(0);
  }

  const shouldLogout = await confirm({
    message: "Are you sure you want to log out?",
    initialValue: false,
  });

  if (isCancel(shouldLogout) || !shouldLogout) {
    cancel("Logout cancelled. You are still logged in.");
    process.exit(0);
  }

  try {
    const isLoggedOut = await clearStoredToken();
    if (!isLoggedOut) {
      console.log(
        chalk.yellow(
          "\n ⚠️Warning: Could not clear stored authentication token"
        )
      );
      console.log(chalk.yellow("You need to logout again"));
    }
    outro(chalk.greenBright("✅ Logout successful!"));
  } catch (error) {
    console.log(chalk.red("Error occured while logging out...", error));
  }
}

export const logout = new Command("logout")
  .description("Log out from Dynamite CLI")
  .action(async () => {
    await logoutActions();
  });
