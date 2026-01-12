import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";


const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [deviceAuthorizationClient()],
});
