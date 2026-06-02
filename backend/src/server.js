require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'", "ws://localhost:3002", "http://localhost:5000"],
  },
}));



// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/temp', express.static(path.join(__dirname, '..', 'temp')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctor'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/specializations', require('./routes/specializations'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/availability', require('./routes/availability'));
app.use('/api/fee-items', require('./routes/feeItems'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Tbibi.tn', version: '1.0.0' });
});

// Socket.io - Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

const onlineUsers = new Set();

io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);

  // Join personal room
  socket.join(`user:${socket.userId}`);
  onlineUsers.add(socket.userId);

  // Send current online users to the newly connected socket
  socket.emit('online_users', { userIds: [...onlineUsers] });
  // Broadcast to others that this user is online
  socket.broadcast.emit('user_online', { userId: socket.userId });

  socket.on('join_conversation', (otherUserId) => {
    const room = [socket.userId, otherUserId].sort().join('_');
    socket.join(room);
  });

  socket.on('send_message', (data) => {
    const room = [socket.userId, data.receiverId].sort().join('_');
    io.to(room).emit('new_message', {
      senderId: socket.userId,
      receiverId: data.receiverId,
      content: data.content,
      created_at: new Date(),
    });
  });

  socket.on('typing', (data) => {
    socket.to(`user:${data.receiverId}`).emit('typing', {
      senderId: socket.userId,
    });
  });

  socket.on('stop_typing', (data) => {
    socket.to(`user:${data.receiverId}`).emit('stop_typing', {
      senderId: socket.userId,
    });
  });

  socket.on('get_online_users', () => {
    socket.emit('online_users', { userIds: [...onlineUsers] });
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
    onlineUsers.delete(socket.userId);
    socket.broadcast.emit('user_offline', { userId: socket.userId });
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Tbibi.tn API running on port ${PORT}`);
  // Initialize WhatsApp client
  const whatsapp = require('./utils/whatsapp');
  whatsapp.init();
});
