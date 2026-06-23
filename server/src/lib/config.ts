import fs from 'fs';
import path from 'path';
import os from 'os';

export const CONFIG_DIR = path.join(os.homedir(), '.dynamite-cli');
export const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export async function getStoredApiKey(): Promise<string | null> {
  try {
    const configData = await fs.promises.readFile(CONFIG_PATH, 'utf-8');
    const configJson = JSON.parse(configData);
    return configJson.gemini_api_key || null;
  } catch (error) {
    return null;
  }
}

export async function storeApiKey(apiKey: string): Promise<void> {
  try {
    await fs.promises.mkdir(CONFIG_DIR, { recursive: true });
    let currentConfig: Record<string, any> = {};
    try {
      const configData = await fs.promises.readFile(CONFIG_PATH, 'utf-8');
      currentConfig = JSON.parse(configData);
    } catch (_) {}

    currentConfig.gemini_api_key = apiKey;

    await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), 'utf-8');
  } catch (error) {
    console.error("Failed to store API key:", error);
    throw error;
  }
}

export async function clearStoredApiKey(): Promise<void> {
  try {
    let currentConfig: Record<string, any> = {};
    try {
      const configData = await fs.promises.readFile(CONFIG_PATH, 'utf-8');
      currentConfig = JSON.parse(configData);
      delete currentConfig.gemini_api_key;
      await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), 'utf-8');
    } catch (_) {}
  } catch (error) {
    console.error("Failed to clear API key:", error);
  }
}
