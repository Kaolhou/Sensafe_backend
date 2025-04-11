import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@generated';

const prisma = new PrismaClient();

// Define a type for the JWT payload structure used in your app
interface JwtPayload {
    id: string;
    email: string;
    recordType: string; // Adjust if using the enum type directly
    sessionId: string;
    expiresAt: string | number; // Match the type used in generateToken
    iat?: number; // Issued at timestamp (added by jwt.sign)
    exp?: number; // Expiration timestamp (added by jwt.sign)
}

// Extend the Express Request interface to include the 'user' property
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

export const isLogged = async (req: Request, res: Response, next: NextFunction) => {
    // 1. Get token from cookies (assuming cookie named 'authToken')
    const token = req.cookies?.authToken; // Requires cookie-parser middleware

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET environment variable is not set.');
            return res.status(500).json({ message: 'Internal server error: Authentication configuration missing.' });
        }

        const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

        // 3. Optional: Check if the session associated with the token still exists and hasn't expired
        const session = await prisma.userSession.findUnique({
            where: { id: decoded.sessionId },
        });

        if (!session || session.expiresAt < new Date()) {
             // If session doesn't exist or is expired in DB, invalidate
             // Clear the potentially invalid cookie
             res.clearCookie('authToken');
             return res.status(401).json({ message: 'Unauthorized: Session expired or invalid.' });
        }

        // 4. Check if the user associated with the token still exists
        // (Optional, but good practice in case user was deleted)
        const userExists = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true } // Only select necessary field
        });

        if (!userExists) {
            res.clearCookie('authToken');
            return res.status(401).json({ message: 'Unauthorized: User not found.' });
        }


        // 5. Attach user info to request object
        req.user = {
            id: decoded.id,
            email: decoded.email,
            recordType: decoded.recordType,
            sessionId: decoded.sessionId,
        };

        // 6. Proceed to the next middleware/controller
        next();

    } catch (error) {
        console.error('JWT Verification Error:', error);
        if (error instanceof jwt.TokenExpiredError) {
            res.clearCookie('authToken'); // Clear expired cookie
            return res.status(401).json({ message: 'Unauthorized: Token expired.' });
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.clearCookie('authToken'); // Clear invalid cookie
            return res.status(401).json({ message: 'Unauthorized: Invalid token.' });
        }
        // Generic error
        return res.status(401).json({ message: 'Unauthorized.' });
    }
};
