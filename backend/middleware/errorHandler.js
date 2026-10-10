/**
 * Catches any error thrown in a route and sends a JSON response, so the app
 * always gets { error: "..." } instead of an HTML error page.
 *
 * Express 5 passes errors from async controllers here automatically.
 * It must be registered after all routes in index.js.
 */
// "next" is unused, but Express only treats a function as an error handler
// when it takes all four arguments
function errorHandler(err, req, res, next) {
  // The request body wasn't valid JSON (thrown by express.json())
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON.' });
  }
  // The request body was over express.json()'s size limit (100kb)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large.' });
  }

  // Anything else is unexpected: log the details on the server, but don't
  // send them to the app, where they could expose how the server works
  console.error(err);
  res.status(err.status || 500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = errorHandler;
