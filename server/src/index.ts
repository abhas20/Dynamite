import express from "express";
import dotenv from "dotenv";
import cors from "cors"
import { toNodeHandler } from 'better-auth/node'
import { auth } from "./lib/auth.ts";

dotenv.config();

export const app = express();

const PORT = process.env.PORT || 5001;

app.use(
  cors({
    origin: "http://your-frontend-domain.com", 
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth)); 
// Mount express json middleware after Better Auth handler
// or only apply it to routes that don't interact with Better Auth
app.use(express.json());

app.get("/",(req,res)=>{
    res.send("Dynamite Server is Running");
})

app.listen(PORT, ()=>{
    console.log(`Server is at port ${PORT}`)
})

