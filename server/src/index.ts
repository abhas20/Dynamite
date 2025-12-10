import express from "express";
import dotenv from "dotenv";
import cors from "cors"
import { toNodeHandler } from 'better-auth/node'
import { auth } from "./lib/auth.ts";

dotenv.config();

export const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3000", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // credentials (cookies, authorization headers, etc.)
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

