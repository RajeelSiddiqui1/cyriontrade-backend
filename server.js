const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const watchlistRoutes = require('./routes/watchlist');
const cryptoRoutes = require('./routes/crypto');
const adminRoutes = require('./routes/admin');
const referralRoutes = require('./routes/referral');
const bonusRoutes = require('./routes/bonus');
const adsRoutes = require('./routes/ads');
const { requestLogger } = require('./middleware/activityLogger');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for rate limiting behind reverse proxy and proper IP detection)
app.set('trust proxy', true);

// Middleware
app.use(helmet());

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://cyriontrade1.vercel.app',
  'https://cyriontrade-himo.vercel.app',
  'https://cyriontrade-backend.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean).map(url => url.replace(/\/$/, ''));

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.includes(origin) ||
      origin.includes('cyriontrade') ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production';

    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS Blocked for origin:', origin);
      callback(null, false); // Don't throw error, just don't allow
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Manual Headers Fallback (Extra safety for Vercel)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('cyriontrade') || origin.endsWith('.vercel.app') || origin.includes('localhost'))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Body parser with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
app.use(morgan('dev'));
app.use(requestLogger);

// Request timeout
app.use((req, res, next) => {
  req.setTimeout(15000); // 15 seconds
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/bonus', bonusRoutes);
app.use('/api/ads', adsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Clear rate limits (development only)
if (process.env.NODE_ENV === 'development') {
  const { clearAllRateLimits } = require('./middleware/rateLimiter');
  app.post('/api/dev/clear-rate-limits', (req, res) => {
    clearAllRateLimits();
    res.json({
      success: true,
      message: 'All rate limits cleared'
    });
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Start server only if not in production/vercel environment
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

module.exports = app;
