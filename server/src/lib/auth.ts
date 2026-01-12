import { betterAuth } from "better-auth";
import {prismaAdapter} from 'better-auth/adapters/prisma'
import { prisma } from "./prisma.ts";
import dotenv from 'dotenv'
import { deviceAuthorization } from "better-auth/plugins"; 

dotenv.config();

const URL = process.env.FRONTEND_URL || "http://localhost:3000";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  trustedOrigins:[URL],
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
  },
  socialProviders:{
    github:{
      clientId: process.env.GITHUB_CLIENT_ID as string || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string || "",
    }
  },
  plugins:[
    deviceAuthorization({
      expiresIn:"30m",
      interval:"5s",
    })
  ]
});
