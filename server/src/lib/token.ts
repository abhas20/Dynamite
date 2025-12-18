import fs from 'fs'
import { CONFIG_DIR, TOKEN_PATH } from '../cli/commands/auth/login.ts';
import chalk from 'chalk';

export async function getStoredToken(): Promise<Record<string,any> | null> {
    try {
        const tokenData = await fs.promises.readFile(TOKEN_PATH, 'utf-8');
        const tokenJson = JSON.parse(tokenData);
        return tokenJson;
    } catch (error) {
        return null;
    }   
}

export async function storeToken(token:Record<string,any>): Promise<Record<string,any>> {
    try {
        
        await fs.promises.mkdir(CONFIG_DIR, { recursive: true });

        const tokenData = {
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            token_type: token.token_type || "Bearer",
            expires_at: token.expires_in ? Date.now() + token.expires_in * 1000 : null,
            scope: token.scope,
            obtained_at: Date.now().toString()
        }

        await fs.promises.writeFile(TOKEN_PATH, JSON.stringify(tokenData, null, 2), 'utf-8');
        return tokenData;

    } catch (error) {
        console.log(chalk.red("Failed to store token"),error);
        throw error;
    }
}

export async function clearStoredToken(): Promise<boolean> {
    try {
        await fs.promises.unlink(TOKEN_PATH);
        return true;
    } catch (error) {
        // Ignore errors if the file does not exist
        return false;
    }
}

export async function isTokenExpired(): Promise<boolean> {
    const tokenData = await getStoredToken();
    if (!tokenData || tokenData.expires_at==null) {
        return true;
    }

    const expiredAt = tokenData.expires_at;
    return Date.now() >= expiredAt;
}

export async function requireAuth(): Promise<Record<string,any>> {
    const tokenData = await getStoredToken();
    if (!tokenData) {
        console.log(chalk.red("Not authenticated. Please log in. Run 'dynamite login' to log in."));
        process.exit(1);
    }
    if(await isTokenExpired()){
        console.log(chalk.red("Authentication token has expired. Please log in again. Run 'dynamite login' to log in."));
        process.exit(1);
    }
    return tokenData;
}