# MERN Stack Chat Application with Socket.io

A real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js) and Socket.io for instant messaging. Features user authentication, multiple chat rooms, and a modern UI with TailwindCSS.

## Features

- 📱 Responsive design with TailwindCSS
- 🔐 User authentication (signup/login) with JWT
- 💬 Real-time messaging using Socket.io
- 🏠 Multiple chat rooms (general, tech, random, support)
- 📄 Message history persistence
- 🎯 Online/offline status indicators
- ⚡ Fast and scalable architecture

## Tech Stack

**Frontend:**

- React 18
- TailwindCSS 3
- React Router DOM
- Socket.io Client
- Axios

**Backend:**

- Node.js
- Express
- MongoDB with Mongoose
- Socket.io
- JWT authentication
- bcryptjs for password hashing

## Prerequisites

- Node.js (v14 or higher)
- MongoDB installed and running locally
- npm or yarn package manager

## Getting Started

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables

**Backend:**
Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your-secret-key-here-change-in-production
```

### 3. Start the Application

**Backend:**

```bash
cd backend
npm run dev
```

The backend server will start on http://localhost:5000

**Frontend:**

```bash
cd frontend
npm start
```

The frontend application will start on http://localhost:3000

### 4. Access the Application

Open your browser and navigate to:

- http://localhost:3000 - Main chat application
- Sign up for a new account or login with existing credentials

## Project Structure

### Backend

```
backend/
├── models/
│   ├── User.js          # User schema with authentication methods
│   └── Message.js       # Message schema for chat messages
├── routes/
│   ├── auth.js          # Authentication routes (signup, login, me)
│   └── messages.js      # Message retrieval routes
├── middleware/
│   └── auth.js          # JWT authentication middleware
├── server.js            # Express server with Socket.io integration
├── package.json         # Backend dependencies and scripts
└── .env                # Environment variables
```

### Frontend

```
frontend/
├── src/
│   ├── components/
│   │   ├── Login.js     # Login page component
│   │   ├── Signup.js    # Signup page component
│   │   └── ChatRoom.js  # Main chat interface
│   ├── context/
│   │   ├── AuthContext.js    # Authentication context and provider
│   │   └── SocketContext.js  # Socket.io context and provider
│   ├── App.js           # Main App component with routing
│   ├── index.js         # React entry point
│   └── index.css        # Global styles with Tailwind directives
├── public/
│   └── index.html       # HTML template
├── package.json         # Frontend dependencies and scripts
├── tailwind.config.js   # TailwindCSS configuration
└── postcss.config.js    # PostCSS configuration
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user (requires token)

### Messages

- `GET /api/messages` - Get all messages with pagination
- `GET /api/messages/recent` - Get recent messages (20 by default)

## Socket.io Events

### Client to Server

- `joinRoom` - Join a specific chat room
- `leaveRoom` - Leave a specific chat room
- `sendMessage` - Send a new message

### Server to Client

- `newMessage` - Receive a new message in the current room
- `connect` - Connection established
- `disconnect` - Connection lost

## Usage

1. **Sign Up/Login:** Create an account or login with existing credentials
2. **Select Chat Room:** Choose from available chat rooms (general, tech, random, support)
3. **Send Messages:** Type your message in the input field and press Send
4. **Real-time Updates:** Messages are delivered instantly to all users in the same room
5. **Logout:** Click the Logout button in the top-right corner

## Database

The application uses MongoDB to store:

- **Users:** User profiles with username, email, and hashed passwords
- **Messages:** Chat messages with sender info, content, and chat room details

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Linting

```bash
# Backend
cd backend
npm run lint

# Frontend
cd frontend
npm run lint
```

## Production Deployment

1. Build the frontend:

```bash
cd frontend
npm run build
```

2. Set up a production MongoDB database (e.g., MongoDB Atlas)
3. Update environment variables in `.env`
4. Deploy backend to a hosting service (e.g., Heroku, Vercel, AWS)
5. Serve the frontend build files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Create a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security Considerations

- Passwords are hashed using bcryptjs with 10 salt rounds
- JWT tokens are used for authentication with 7-day expiration
- CORS is configured to only allow requests from the frontend domain
- Input validation is performed on all API endpoints
- Socket.io connections are authenticated

## Future Enhancements

- ✨ Private messaging
- 📁 File attachments
- 🎭 User profiles with avatars
- 🔔 Push notifications
- 📊 Message reactions
- 🔍 Message search
- 📱 Mobile app versions

## Troubleshooting

**MongoDB connection issues:**

- Make sure MongoDB is running locally
- Check the MONGODB_URI in .env
- Verify that the database name matches

**Socket.io connection problems:**

- Check that both frontend and backend are running
- Verify the server URL in SocketContext.js
- Check for CORS errors in browser console

**Authentication issues:**

- Clear browser cache and localStorage
- Verify token validity in backend logs
- Check for expired tokens
# mern-chat-app
