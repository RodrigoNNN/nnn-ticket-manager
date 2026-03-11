require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb, closeDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Initialize database on startup
getDb();
console.log('Database initialized');

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/spas', require('./routes/spas'));
app.use('/api/ticket-types', require('./routes/ticketTypes'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/tickets', require('./routes/comments'));
app.use('/api/onboarding-forms', require('./routes/onboarding'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`NNN Ticket Manager API running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});
