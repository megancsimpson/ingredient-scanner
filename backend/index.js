
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
const { apiLimit } = require('./middleware/rateLimits');

const app = express();
const PORT = process.env.PORT || 5000;

// On Render, requests reach the server through Render's proxies, so the
// connection comes from a proxy, not the user's phone. The proxies add the
// real address to the X-Forwarded-For header. "trust proxy" tells Express
// how many proxies to skip to find it (req.ip), which the rate limits rely
// on. TRUST_PROXY_HOPS is that number: set it on Render, leave it unset
// locally (no proxy). Too high would let anyone fake their address by
// sending their own header, so it's a set number, never "true".
const proxyHops = Number(process.env.TRUST_PROXY_HOPS) || 0;
app.set('trust proxy', proxyHops);

// Logs the X-Forwarded-For header of the first request that has one, so
// the right TRUST_PROXY_HOPS can be read from Render's logs: it's the
// number of addresses in the header. Logged once per server start.
let loggedForwardedFor = false;
app.use((req, res, next) => {
  const forwardedFor = req.get('x-forwarded-for');
  if (forwardedFor && !loggedForwardedFor) {
    loggedForwardedFor = true;
    const count = forwardedFor.split(',').length;
    console.log(
      `X-Forwarded-For has ${count} address(es); TRUST_PROXY_HOPS is ${proxyHops}. ` +
        `The first request's client IP: ${req.ip}`
    );
  }
  next();
});

app.use(cors());

// Quick check that the server is running. Before the rate limit, since
// Render calls it every few seconds.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// A backstop limit on every API request (middleware/rateLimits.js); the
// routes for logins, emails and photos have stricter limits of their own
app.use('/api', apiLimit);

// Photo uploads have their own, larger size limit, so this route comes
// before the app-wide JSON parser (which allows 100 KB)
app.use('/api/ocr', ocrRoutes);
app.use(express.json());

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