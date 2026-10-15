// Starts the server: loads the settings, connects to MongoDB, then listens.
// The app itself (middleware and routes) is in app.js.
require('dotenv').config();
const mongoose = require('mongoose');

// Stop straight away with a clear message instead of failing on the first login
for (const name of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[name]) {
    console.error(`${name} is not set. Add it to backend/.env (see .env.example).`);
    process.exit(1);
  }
}

// Loaded after the check above, since the login setup reads JWT_SECRET
const { app } = require('./app');

const PORT = process.env.PORT || 5000;

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
