#!/usr/bin/env node

import chalk from 'chalk'
import { Command } from 'commander'
import figlet from 'figlet'
import { login } from './commands/auth/login.ts'
import { logout } from './commands/auth/logout.ts'
import { whoami } from './commands/auth/whoami.ts'
import { wakeUp } from './commands/ai/wakeUp.ts'

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
        console.log(chalk.green.bold("An AI based CLI god\n"))

        const program = new Command("Dynamite");

        program.version("1.0.0").description("Dynamite CLI Application")
        .addCommand(login)
        .addCommand(logout)
        .addCommand(whoami)
        .addCommand(wakeUp);
        
        program
            .command("hello")
            .description("Checking the Dynamite application")
            .action(() => {
                console.log(chalk.magentaBright("HELLO From DYNAMITE CLI!"));
            });

        program.action(()=>{
            program.help();
        })

        program.on("command:*", (operands) => {
          const wrongCommand = operands[0];

          console.log(
            chalk.redBright(`\n❌ Error: Unknown command '${wrongCommand}'`)
          );
          console.log(chalk.yellow("Did you mean one of these?"));
          console.log(chalk.gray("-----------------------------------"));
        });
        program.showHelpAfterError();


        program.parse(process.argv);

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