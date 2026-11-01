require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 5000;

// Internal Microservices URLs
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:5001';
const ASSESSMENT_SERVICE_URL = process.env.ASSESSMENT_SERVICE_URL || 'http://127.0.0.1:5002';
const SUBMISSION_SERVICE_URL = process.env.SUBMISSION_SERVICE_URL || 'http://127.0.0.1:5003';
const REPORTING_SERVICE_URL = process.env.REPORTING_SERVICE_URL || 'http://127.0.0.1:5004';

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allowed for frontend client assets
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000').split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for local development
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  })
);

app.use(morgan('combined'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please slow down.'
  }
});
app.use(limiter);

// Gateway Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    routes: {
      auth: AUTH_SERVICE_URL,
      assessment: ASSESSMENT_SERVICE_URL,
      submission: SUBMISSION_SERVICE_URL,
      reporting: REPORTING_SERVICE_URL
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Proxy helper with error resilience
function createServiceProxy(targetUrl) {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    logLevel: 'warn',
    onError: (err, req, res) => {
      console.error(`[API Gateway] Proxy error to ${targetUrl}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          error: `Service temporarily unavailable (${err.code || 'PROXY_ERROR'}). Please verify backend services are running.`
        });
      }
    }
  });
}

// ------------------------------------------------------------------------------
// Service Route Proxies
// ------------------------------------------------------------------------------

// Auth Service Routes
app.use('/api/auth', createServiceProxy(AUTH_SERVICE_URL));

// Question and Assessment Service Routes
app.use('/api/questions', createServiceProxy(ASSESSMENT_SERVICE_URL));
app.use('/api/assessments', createServiceProxy(ASSESSMENT_SERVICE_URL));

// Submission and Code Execution Service Routes
app.use('/api/execute', createServiceProxy(SUBMISSION_SERVICE_URL));
app.use('/api/submissions', createServiceProxy(SUBMISSION_SERVICE_URL));

// Reporting and Anti-Cheating Service Routes
app.use('/api/anticheat', createServiceProxy(REPORTING_SERVICE_URL));
app.use('/api/reports', createServiceProxy(REPORTING_SERVICE_URL));
app.use('/api/admin', createServiceProxy(REPORTING_SERVICE_URL));

// Fallback 404 for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found on API Gateway: ${req.originalUrl}`
  });
});

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[API Gateway] Listening on port ${PORT}`);
    console.log(`[API Gateway] Routing /api/auth -> ${AUTH_SERVICE_URL}`);
    console.log(`[API Gateway] Routing /api/questions & /api/assessments -> ${ASSESSMENT_SERVICE_URL}`);
    console.log(`[API Gateway] Routing /api/execute & /api/submissions -> ${SUBMISSION_SERVICE_URL}`);
    console.log(`[API Gateway] Routing /api/anticheat & /api/reports & /api/admin -> ${REPORTING_SERVICE_URL}`);
  });
}

module.exports = app;
