import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";


const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({path: path.resolve(__dirname, '../../.env')});

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
};

declare global {
  var prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
}

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
