declare global {
  namespace Express {
    interface Request {
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
  }
}

export {}; // Ensure this file is treated as a module