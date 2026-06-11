import { requireAuth } from "../lib/token.ts";
import dotenv from "dotenv";

dotenv.config();

const SERVER_URL = process.env.DYNAMITE_SERVER_URL || "http://localhost:5000";

export async function makeAPIRequest(endpoint: string, options: RequestInit = {}) {
  const token = await requireAuth();
  
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token.access_token}`,
    ...(options.headers || {}),
  };

  const response = await fetch(`${SERVER_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = `Request failed with status ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody?.error) errMsg = errBody.error;
    } catch (_) {}
    throw new Error(errMsg);
  }

  return response;
}
