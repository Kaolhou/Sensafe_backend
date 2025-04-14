import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

interface JwtPayload {
  id: string;
  email: string;
  recordType: string;
  sessionId: string;
  expiresAt: string | number;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        recordType: string;
        sessionId: string;
      };
    }
  }
}

export const isLogged = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.authToken;

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Unauthorized: No token provided.' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET environment variable is not set.');
      return res.status(500).json({
        message: 'Internal server error: Authentication configuration missing.',
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    const session = await prisma.userSession.findUnique({
      where: { id: decoded.sessionId },
    });

    if (!session || session.expiresAt < new Date()) {
      res.clearCookie('authToken');
      return res
        .status(401)
        .json({ message: 'Unauthorized: Session expired or invalid.' });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true },
    });

    if (!userExists) {
      res.clearCookie('authToken');
      return res.status(401).json({ message: 'Unauthorized: User not found.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      recordType: decoded.recordType,
      sessionId: decoded.sessionId,
    };

    next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    if (error instanceof jwt.TokenExpiredError) {
      res.clearCookie('authToken');
      return res.status(401).json({ message: 'Unauthorized: Token expired.' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.clearCookie('authToken');
      return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
    }
    return res.status(401).json({ message: 'Unauthorized.' });
  }
};
