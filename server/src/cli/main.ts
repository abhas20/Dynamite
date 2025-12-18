#!/usr/bin/env node

import chalk from 'chalk'
import { Command } from 'commander'
import figlet from 'figlet'
import { login } from './commands/auth/login.ts'
import { logout } from './commands/auth/logout.ts'
import { whoami } from './commands/auth/whoami.ts'

async function main() {
    try {
        console.log(
            chalk.cyan(
                await figlet.text("Dynamite CLI",{
                    horizontalLayout: 'default',
                    verticalLayout: 'default',
                    font: 'Standard',
                })
            )
        )
        console.log(chalk.green("An AI based CLI god\n"))

        const program = new Command("Dynamite");

        program.version("1.0.0").description("Dynamite CLI Application")
        .addCommand(login)
        .addCommand(logout)
        .addCommand(whoami);

        program.action(()=>{
            program.help();
        })

        program
            .command("start")
            .description("Start the Dynamite application")
            .action(() => {
                console.log(chalk.yellow("Starting Dynamite..."));
                // Add your start logic here
            });

        program.parse()

    } 
    catch (error) {
        console.log("Something went wrong")
        console.log(error)
    }
}

main().catch((err)=>{
    console.log(chalk.red("Error in running CLI",err));
    process.exit(1);
});