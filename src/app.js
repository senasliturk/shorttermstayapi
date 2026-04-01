'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const { gatewayMiddleware, errorHandler } = require('./gateway/gateway.middleware');

// Route imports
const authRoutes    = require('./routes/v1/auth.routes');
const listingRoutes = require('./routes/v1/listing.routes');
const bookingRoutes = require('./routes/v1/booking.routes');
const reviewRoutes  = require('./routes/v1/review.routes');
const adminRoutes   = require('./routes/v1/admin.routes');

const app = express();

// ── Trust proxy (for rate limiting behind load balancers) ────────────────────
app.set('trust proxy', 1);

// ── Core Middleware ───────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Gateway Middleware ────────────────────────────────────────────────────
app.use(gatewayMiddleware);

// ── Swagger Configuration ─────────────────────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Short-Term Stay API',
      version: '1.0.0',
      description:
        'SE 4458 – Software Architecture & Design of Modern Large Scale Systems\n' +
        'Midterm Project — Group 2 (Airbnb-like short-term stay platform)\n\n' +
        '**Test credentials:** email: `test@test.com`, password: `123456` (role: guest)\n\n' +
        'Login via POST /api/v1/auth/login to obtain a JWT token, then click Authorize.',
      contact: { name: 'Sena Aslı Türk' },
    },
    servers: [{ url: process.env.BASE_URL || 'http://localhost:3000' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/v1/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Short-Term Stay API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── API v1 Routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth',     authRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reviews',  reviewRoutes);
app.use('/api/v1/admin',    adminRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`✅  Short-Term Stay API running on http://localhost:${PORT}`);
  console.log(`📄  Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`❤️   Health:    http://localhost:${PORT}/api/health`);
});

module.exports = app;
