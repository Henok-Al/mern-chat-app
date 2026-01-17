"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const auth_1 = __importDefault(require("./routes/auth"));
const messages_1 = __importDefault(require("./routes/messages"));
const Message_1 = __importDefault(require("./models/Message"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        credentials: true
    }
});
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
mongoose_1.default.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('MongoDB connection error:', error));
app.use('/api/auth', auth_1.default);
app.use('/api/messages', messages_1.default);
io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);
    socket.on('joinRoom', (data) => {
        socket.join(data.chatRoom);
        console.log(`User ${socket.id} joined room: ${data.chatRoom}`);
    });
    socket.on('leaveRoom', (data) => {
        socket.leave(data.chatRoom);
        console.log(`User ${socket.id} left room: ${data.chatRoom}`);
    });
    socket.on('sendMessage', async (data) => {
        try {
            const message = new Message_1.default({
                sender: data.senderId,
                content: data.content,
                chatRoom: data.chatRoom || 'general'
            });
            await message.save();
            const populatedMessage = await Message_1.default.findById(message._id)
                .populate('sender', 'username');
            io.to(data.chatRoom || 'general').emit('newMessage', populatedMessage);
        }
        catch (error) {
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
//# sourceMappingURL=server.js.map