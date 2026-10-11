
// Set up the environment
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Stop straight away with a clear message instead of failing on the first login
for (const name of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[name]) {
    console.error(`${name} is not set. Add it to backend/.env (see .env.example).`);
    process.exit(1);
  }
}

const authRoutes = require('./routes/auth');
const analyzeRoutes = require('./routes/analyze');
const productRoutes = require('./routes/products');
const ingredientRoutes = require('./routes/ingredients');
const ocrRoutes = require('./routes/ocr');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
// Photo uploads have their own, larger size limit, so this route comes
// before the app-wide JSON parser (which allows 100 KB)
app.use('/api/ocr', ocrRoutes);
app.use(express.json());

// Quick check that the server is running
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ingredients', ingredientRoutes);

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