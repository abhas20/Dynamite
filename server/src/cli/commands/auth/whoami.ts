import chalk from "chalk";
import { prisma } from "../../../lib/prisma.ts";
import { requireAuth } from "../../../lib/token.ts";
import { Command } from "commander";
import yoctoSpinner from "yocto-spinner";


export async function whoamiAction() {
    const token = await requireAuth();
    if(!token || !token.access_token){
        console.log("Not authenticated.Please log in again.");
        process.exit(1);
    }
    const spinner = yoctoSpinner({text:"Fetching user details..."}).start();

    const user = await prisma.user.findFirst({
        where:{
            sessions:{
                some:{
                    token:token.access_token
                }
            }
        },
        select:{
            id:true,
            email:true,
            name:true,
            image:true
        }
    })

    if(!user){
        console.log("User not found. Please log in again.");
        process.exit(1);
    }
    spinner.text = "Authenticated user details:";
    console.log(chalk.bold.green(`\n User:${user.name}, E-mail:${user.email}`))
    spinner.stop();
}

export const whoami = new Command("whoami")
    .description("Display the currently authenticated user")
    .action(async () => {
        await whoamiAction();
    });