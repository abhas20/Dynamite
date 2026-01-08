import chalk from "chalk";
import { getStoredToken } from "../../../lib/token.ts"
import yoctoSpinner from "yocto-spinner";
import { prisma } from "../../../lib/prisma.ts";
import { select } from "@clack/prompts";
import { Command } from "commander";
import { startChat } from "../../chat/chat-with-ai.ts";
import startToolChatwithAI from "../../chat/chat-ai-tools.ts";
import { startAgentChat } from "../../chat/chat-ai-agents.ts";


const wakeUpAction = async ()=> {
    const token = await getStoredToken();
    if(!token || !token?.access_token){
        console.log(chalk.bgRed("Not authorised. Please login before continuing."));
        return;
    }

    const spinner = yoctoSpinner({text:"Fetching up user details..."}).start();

    const user = await prisma.user.findFirst({
        where:{
            sessions:{
                some: {
                    token: token.access_token
                }
            }
        },
        select:{
            id:true,
            email:true,
            name:true
        }
    })

    spinner.stop();
    if(!user){
        console.log(chalk.bgRed("Invalid session. Please login again."));
        return;
    }
    console.log(chalk.green(`Hello, ${user.name || user.email}! Your session is active.`));

    const choice = await select({
        message: "Do you want to wake up the AI services?",
        options:[
            {
                value: "chat",
                label: "AI Chat",
                hint: "Use the AI chat service"
            },
            {
                value: "tools",
                label: "AI Tools",
                hint: "Use the AI tools(Google Search, Code Execution,and more) service"
            },
            {
                value: "agent",
                label: "AI Agent",
                hint: "Use the AI agent service"
            },
        ]
    });

    switch(choice){
        case "chat":
            await startChat({mode:"chat"})
            break;
        case "tools":
            await startToolChatwithAI({mode:"tool-chat"});
            break;
        case "agent":
            await startAgentChat({mode:"ai-agent"});
            break;
        default:
            console.log(chalk.red("Invalid choice"));
            break;
    }

}

export const wakeUp = new Command("wake-up")
    .description("Wake up the AI services")
    .action(async () => {
        await wakeUpAction();
    });