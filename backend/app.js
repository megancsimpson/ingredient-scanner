const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const analyzeRoutes = require('./routes/analyze');
const productRoutes = require('./routes/products');
const ingredientRoutes = require('./routes/ingredients');
const ocrRoutes = require('./routes/ocr');
const errorHandler = require('./middleware/errorHandler');
const { apiLimit } = require('./middleware/rateLimits');

/**
 * The Express app: middleware and routes, but no database connection and no
 * listening on a port. index.js does those to run the server; tests load
 * this file to send requests to the app without a real database.
 */
const app = express();

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

// Every group of routes and where it's attached. Listed here so the tests
// (tests/routeProtection.test.js) can check every route has the right login
// check; they also check nothing is attached without being listed.
const routers = {
  '/api/ocr': ocrRoutes,
  '/api/auth': authRoutes,
  '/api/analyze': analyzeRoutes,
  '/api/products': productRoutes,
  '/api/ingredients': ingredientRoutes,
};

// Photo uploads have their own, larger size limit, so this route comes
// before the app-wide JSON parser (which allows 100 KB)
app.use('/api/ocr', routers['/api/ocr']);
app.use(express.json());

for (const [path, router] of Object.entries(routers)) {
  if (path !== '/api/ocr') app.use(path, router);
}

// Any address no route above answered: reply in the same { error } shape as
// every other error. Express's default is an HTML page ("Cannot GET /...")
// that the app can't read and that tells anyone probing the server it runs
// Express.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Must come after all routes so it can catch their errors
app.use(errorHandler);

module.exports = { app, routers };
