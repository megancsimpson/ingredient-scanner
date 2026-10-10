/**
 * An error with an HTTP status code and a message that is safe to show the
 * user. Services throw these; errorHandler turns them into a response.
 *
 *   throw new HttpError(409, 'An account with this email already exists.');
 *   -> 409 { "error": "An account with this email already exists." }
 */
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = HttpError;
