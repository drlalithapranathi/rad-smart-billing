
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static frontend files
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));

// Import routes
const epicRoutes = require('./routes/epic');
// const cernerRoutes = require('./routes/cerner');  // TODO: Add later
// const openemrRoutes = require('./routes/openemr'); // TODO: Add later

// Mount routes
app.use('/epic', epicRoutes);
// app.use('/cerner', cernerRoutes);  // TODO: Add later
// app.use('/openemr', openemrRoutes); // TODO: Add later

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'SMART Claims backend is running' });
});

// Root endpoint - list available EHR integrations
app.get('/', (req, res) => {
  res.json({
    message: 'SMART Claims Backend API',
    availableIntegrations: [
      { ehr: 'Epic', launchUrl: '/epic/launch', status: 'active' },
      { ehr: 'Cerner', launchUrl: '/cerner/launch', status: 'coming soon' },
      { ehr: 'OpenEMR', launchUrl: '/openemr/launch', status: 'coming soon' }
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   SMART Claims Backend Server             ║
║   Running on: http://localhost:${PORT}    ║
╚═══════════════════════════════════════════╝

Available endpoints:
  - Epic Launch:    http://localhost:${PORT}/epic/launch
  - Epic Callback:  http://localhost:${PORT}/epic/callback
  - Health Check:   http://localhost:${PORT}/health

Frontend served at: http://localhost:${PORT}/frontend/
  `);
});