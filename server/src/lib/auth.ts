import { betterAuth } from "better-auth";
import {prismaAdapter} from 'better-auth/adapters/prisma'
import { prisma } from "./prisma.ts";
import dotenv from 'dotenv'

dotenv.config();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins:["http://localhost:3000"],
  // basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:{
    github:{
      clientId: process.env.GITHUB_CLIENT_ID as string || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string || "",
    }
  }
});
