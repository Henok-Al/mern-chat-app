import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/auth';
import messagesRoutes from './routes/messages';
import Message from './models/Message';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    credentials: true
  }
});

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI as string, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('MongoDB connection error:', error));

app.use('/api/auth', authRoutes);
app.use('/api/messages', messagesRoutes);

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  socket.on('joinRoom', (data: { chatRoom: string }) => {
    socket.join(data.chatRoom);
    console.log(`User ${socket.id} joined room: ${data.chatRoom}`);
  });

  socket.on('leaveRoom', (data: { chatRoom: string }) => {
    socket.leave(data.chatRoom);
    console.log(`User ${socket.id} left room: ${data.chatRoom}`);
  });

  socket.on('sendMessage', async (data: { senderId: string; content: string; chatRoom?: string }) => {
    try {
      const message = new Message({
        sender: data.senderId,
        content: data.content,
        chatRoom: data.chatRoom || 'general'
      });

      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'username');

      io.to(data.chatRoom || 'general').emit('newMessage', populatedMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});