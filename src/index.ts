import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import authRoutes from './routes/auth.routes';
import userPreferences from './routes/preferences.routes';

export const app = express();

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/user/preferences', userPreferences);

const httpServer = createServer(app);

export const io = new Server(httpServer);

app.listen(3000, () => {
  console.log(`Server running on http://localhost:3000`);
});
