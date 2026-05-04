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

// Diagnostic Route for Email
app.get('/api/test-email', async (req, res) => {
  const emailService = require('./services/email.service');
  try {
    const info = await emailService.sendEmail(
      process.env.SMTP_USER,
      'Test Render Email',
      'Ceci est un test depuis Render.',
      '<h1>Test Render</h1>'
    );
    res.send({ success: true, messageId: info.messageId, response: info.response });
  } catch (error) {
    res.status(500).send({ 
      success: false, 
      error: error.message, 
      stack: error.stack,
      env_check: {
        user: process.env.SMTP_USER ? 'OK' : 'MISSING',
        pass: process.env.SMTP_PASS ? 'OK' : 'MISSING',
        service: process.env.SMTP_SERVICE || 'none'
      }
    });
  }
});

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

// Start Server immediately (Important for Render)
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Connect to Database in background
  connectDB();
});
