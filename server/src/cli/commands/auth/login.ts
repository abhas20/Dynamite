import dotenv from 'dotenv'
import path from 'path';
import os from 'os'
import * as z from 'zod/v4'
import { cancel, confirm, intro, isCancel, outro } from '@clack/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import {createAuthClient} from 'better-auth/client'
import { deviceAuthorizationClient } from 'better-auth/plugins';
import yoctoSpinner from 'yocto-spinner'
import { logger } from 'better-auth';
import open from 'open'
import { getStoredToken, isTokenExpired, storeToken } from '../../../lib/token.ts';

dotenv.config()

const URL = process.env.DYNAMITE_SERVER_URL || 'http://localhost:5000'
const CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
export const CONFIG_DIR = path.join(os.homedir(), '.dynamite-cli'); // Configuration directory
export const TOKEN_PATH = path.join(CONFIG_DIR, 'token.json'); // Path to store the token


interface PollOptions {
    authClient: any;
    deviceCode: string;
    clientId: string;
    interval: number;
}

export async function loginActions() {
    const optins = z.object({
        serverUrl: z.string().optional(),
        clientID: z.string().optional()
    })

    const parsed = optins.parse({
        serverUrl:URL,
        clientID:CLIENT_ID,
    })

    const serverUrl=parsed.serverUrl || URL
    const clientID=parsed.clientID || CLIENT_ID

    intro(chalk.bold("🔓 CLI Login ..."));
    
    const existingToken =await getStoredToken(); 
    const isExpired = await isTokenExpired();

    if (existingToken && !isExpired) {
        const shouldContinue = await confirm({
            message: 'You are already logged in. Do you want to log in again?',
            initialValue: false
        })

        if (isCancel(shouldContinue) || !shouldContinue) {
            cancel('Login cancelled. You are still logged in.');
            process.exit(0);
        }
    }
    const authClient = createAuthClient({
        baseURL: serverUrl,
        plugins: [deviceAuthorizationClient()],
    });
    
    const spinner = yoctoSpinner({text: 'Requesting device authorization...'}).start();

    try {
        const {data, error} = await authClient.device.code({
            client_id: clientID,
            scope: 'openid profile email',
        })
        spinner.stop();
        if (error || !data) {
            logger.error('Error requesting device code:', error);
            process.exit(1);
        }

        const {user_code,expires_in,verification_uri,verification_uri_complete} = data;
        console.log(chalk.cyanBright("Device Authorization Required"))
        console.log(`\n1. Visit: ${chalk.underline.blue(verification_uri || verification_uri_complete)}`);

        if (user_code) {
            console.log(`2. Enter the code: ${chalk.yellowBright(user_code)}`);
        }
        console.log(`\nThis code will expire in ${chalk.redBright((expires_in/60).toString())} minutes.\n`);

        const shouldOpen = await confirm({
            message: 'Do you want to open the verification URL in your default browser automatically?',
            initialValue: true
        })
        if (!isCancel(shouldOpen) && shouldOpen) {
            const urlToOpen = verification_uri_complete || verification_uri;
            if (urlToOpen) {
                await open(urlToOpen);
            }
        }
        console.log(chalk.gray(
            `\nWating for authorization link expire in ${expires_in/60} minutes...`
        ))

        const token = await pollForToken({
            authClient,
            deviceCode: data.device_code,
            clientId: clientID,
            interval: 5000,
        });
        if (token){
            const saved = await storeToken(token);
            if(!saved){
                console.log(
                    chalk.yellow(
                        "\n ⚠️Warning: Could not store authentication token"
                    )
                );
                console.log(chalk.yellow("You may need to login again"));
            }
            outro(chalk.greenBright("\n✅ Login successful!"));
        }
        

    } catch (error) {
        spinner.stop();
        console.log(chalk.red("Error during device authorization:", error));
        process.exit(1);
    }

}

const pollForToken = async (
    { authClient, deviceCode, clientId, interval }: PollOptions
) => {
    let pollingInterval = interval;
    let dots = 0;
    const spinner = yoctoSpinner({text: '',color:'cyan'})

    return new Promise<any>(async (resolve, reject) => {
        const poll = async () => {
            dots = (dots + 1) % 4;
            let dotString = '.'.repeat(dots);
            spinner.text = chalk.grey(`\nPolling for authorization${dotString}${' '.repeat(3 - dots)}`);
            if (!spinner.isSpinning) spinner.start();

            try {
                const {data, error} = await authClient.device.token({
                    client_id: clientId,
                    device_code: deviceCode,
                    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                    fetchOptions:{
                        headers:{
                            'user-agent':'Dynamite-CLI',
                        }
                    }
                });

                if (data?.access_token) {
                    console.log("Authorization successful!",data.access_token);
                    spinner.stop();
                    resolve(data);
                    return data;
                } 
                else if (error) {
                    switch (error.error) {
                    case "authorization_pending":
                        // Continue polling
                        break;
                    case "slow_down":
                        pollingInterval += 5;
                        break;
                    case "access_denied":
                        console.error("Access was denied by the user");
                        return;
                    case "expired_token":
                        console.error("The device code has expired. Please try again.");
                        return;
                    default:
                        spinner.stop();
                        logger.error(`Error: ${error.error_description}`);
                        process.exit(1);
                    }
                }

                
            } catch (error) {
                spinner.stop();
                logger.error("Error polling for token:", error);
                reject(error);
                process.exit(1);
            }

            setTimeout(poll, pollingInterval);
        }
        setTimeout(poll, pollingInterval);
    });
}


export const login = new Command("login").description("Login to Dynamite CLI")
    .option('--server-url <url>', 'Dynamite server URL',URL)
    .option('--client-id <id>', 'GitHub OAuth Client ID',CLIENT_ID)
    .action(async () => {
        try {
            await loginActions();
        } catch (error) {
            console.log(chalk.red("Error during login:", error));
            process.exit(1);
        }
    });



