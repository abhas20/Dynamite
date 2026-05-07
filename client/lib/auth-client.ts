import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
// console.log(BACKEND_URL)

export const authClient = createAuthClient({
  baseURL: BACKEND_URL,
  plugins: [deviceAuthorizationClient()],
});
