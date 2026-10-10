const mongoose = require('mongoose');

/**
 * User
 * Someone with an account. Passwords are never stored, only a bcrypt hash.
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      // Simple shape check (something@something.something); the real test
      // of an email address is whether mail reaches it
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'],
    },

    // bcrypt hash of the password. "select: false" leaves it out of query
    // results unless asked for with .select('+passwordHash'), so it can't
    // be sent to the app by accident.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      maxlength: [100, 'Name must be 100 characters or fewer.'],
    },
  },
  {
    timestamps: true,
    // What the API sends when a user is turned into JSON:
    // { id, email, name, createdAt } with no password hash or Mongo internals
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.updatedAt;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
