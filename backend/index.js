
// Set up the environment
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const analyzeRoutes = require('./routes/analyze');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Quick check that the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/analyze', analyzeRoutes);

// Must come after all routes so it can catch their errors
app.use(errorHandler);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // 0.0.0.0 lets your phone reach the server over Wi-Fi
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });