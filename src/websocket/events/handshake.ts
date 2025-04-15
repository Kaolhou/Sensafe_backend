import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export default function handshake(io: Server, socket: Socket) {
  const token = socket.handshake.auth.token;

  if (!token) {
    console.error(
      `[Auth] Connection rejected: No token provided by socket ${socket.id}`
    );
    return socket.disconnect(true);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error(
      '[Auth] Server error: JWT_SECRET environment variable is not set.'
    );
    return socket.disconnect(true);
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;

    console.log(
      `[Auth] Token verified successfully for socket ${socket.id}. User data:`,
      decoded
    );

    socket.data.user = decoded;
  } catch (err) {
    socket.disconnect(true);
    if (err instanceof Error) {
      console.error(
        `[Auth] Connection rejected: Invalid token provided by socket ${socket.id}. Error: ${err.message}`
      );
    }
    console.error(err);
  }
}
