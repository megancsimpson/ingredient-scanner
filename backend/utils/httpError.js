/**
 * An error with an HTTP status code and a message that is safe to show the
 * user. Services throw these; errorHandler turns them into a response.
 *
 *   throw new HttpError(409, 'An account with this email already exists.');
 *   -> 409 { "error": "An account with this email already exists." }
 *
 * Extra details for the app can be passed as a third argument and are sent
 * alongside the message:
 *
 *   throw new HttpError(409, 'Already saved.', { duplicate: { id: '...' } });
 *   -> 409 { "error": "Already saved.", "duplicate": { "id": "..." } }
 */
class HttpError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = HttpError;
