import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.ts";
import { redis } from "../lib/redis.ts";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
  };
  session?: {
    id: string;
    token: string;
    expiresAt: string | Date;
  };
}

export async function authenticateCLI(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized. Missing token." });
      return;
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      res.status(401).json({ error: "Unauthorized. Invalid token structure." });
      return;
    }

    // Check Redis Cache
    const cachedSession = await redis.get(`session:${token}`);
    if (cachedSession) {
      const parsed = JSON.parse(cachedSession);
      if (new Date(parsed.expiresAt) > new Date()) {
        req.user = parsed.user;
        req.session = {
          id: parsed.id,
          token: parsed.token,
          expiresAt: parsed.expiresAt,
        };
        next();
        return;
      } else {
        await redis.del(`session:${token}`);
      }
    }

    // Query Database
    const dbSession = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!dbSession || new Date(dbSession.expiresAt) <= new Date()) {
      res.status(401).json({ error: "Unauthorized. Invalid or expired token." });
      return;
    }

    // Cache in Redis
    const remainingMs = new Date(dbSession.expiresAt).getTime() - Date.now();
    const remainingSec = Math.max(1, Math.floor(remainingMs / 1000));
    
    const sessionCacheObj = {
      id: dbSession.id,
      token: dbSession.token,
      expiresAt: dbSession.expiresAt,
      user: dbSession.user,
    };
    
    const cacheTtl = Math.min(3600, remainingSec);
    await redis.set(
      `session:${token}`,
      JSON.stringify(sessionCacheObj),
      "EX",
      cacheTtl
    );

    req.user = dbSession.user;
    req.session = {
      id: dbSession.id,
      token: dbSession.token,
      expiresAt: dbSession.expiresAt,
    };
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error during authentication." });
  }
}
