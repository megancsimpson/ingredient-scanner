const mongoose = require('mongoose');
const HttpError = require('../utils/httpError');

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

  // Errors thrown on purpose by our services, with a message for the user
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  // Mongoose schema validation failed, e.g. a missing name or a badly formed
  // email. Send the first problem's message (set in the model).
  if (err instanceof mongoose.Error.ValidationError) {
    const [firstProblem] = Object.values(err.errors);
    return res.status(400).json({ error: firstProblem.message });
  }

  // A unique field already exists. This can happen if two registrations
  // with the same email arrive at the same moment.
  if (err.code === 11000) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  // Anything else is unexpected: log the details on the server, but don't
  // send them to the app, where they could expose how the server works
  console.error(err);
  res.status(err.status || 500).json({ error: 'Something went wrong. Please try again.' });
}

module.exports = errorHandler;
