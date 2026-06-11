import { Redis } from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(REDIS_URL, {
  lazyConnect: true, // Don't block startup if Redis isn't running yet
});

redis.on("error", (err: Error) => {
  console.warn("Redis connection error:", err.message);
});

redis.on("connect", () => {
  console.log("Connected to Redis successfully.");
});
