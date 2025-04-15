import type { Server, Socket } from 'socket.io';

export function joinRoom(io: Server, socket: Socket) {
  return async (userId: number) => {
    socket.join(`u-${userId}`);
    io.to(`u-${userId}`).emit('user joined');
  };
}
