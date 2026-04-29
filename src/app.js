const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PORT } = require('./config/env');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const propertyRoutes = require('./routes/property.routes');
const rentalRequestRoutes = require('./routes/rentalRequest.routes');
const contractRoutes = require('./routes/contract.routes');
const notificationRoutes = require('./routes/notification.routes');
const furnitureRoutes = require('./routes/furniture.routes');
const userRoutes = require('./routes/user.routes');
const messageRoutes = require('./routes/message.routes');
const verificationRoutes = require('./routes/verification.routes');
const chatbotRoutes = require('./routes/chatbot.routes');
const housingNeedRoutes = require('./routes/housingNeed.routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// Heartbeat route
app.get('/', (req, res) => res.send('API Running'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/rental-requests', rentalRequestRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/furniture', furnitureRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/housing-needs', housingNeedRoutes);


// Error Handler
app.use(errorHandler);

// Database and Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
