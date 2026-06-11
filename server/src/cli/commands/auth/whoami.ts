import chalk from "chalk";
import { makeAPIRequest } from "../../api-client.ts";
import { Command } from "commander";
import yoctoSpinner from "yocto-spinner";


export async function whoamiAction() {
    const spinner = yoctoSpinner({text:"Fetching user details..."}).start();

    try {
        const res = await makeAPIRequest("/api/user/me");
        const body = await res.json();
        const user = body.user;

        if(!user){
            spinner.stop();
            console.log("\nPlease log in again.");
            process.exit(1);
        }
        spinner.stop();
        console.log(chalk.bold.green(`\nUser: ${user.name}, E-mail: ${user.email}`));
    } catch (err) {
        spinner.stop();
        console.log(chalk.red(`\nFailed to fetch user details: ${(err as Error).message}`));
        process.exit(1);
    }
}

export const whoami = new Command("whoami")
    .description("Display the currently authenticated user")
    .action(async () => {
        await whoamiAction();
    });