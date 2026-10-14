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

    // When the password was last reset. Login tokens issued before this
    // stop working (see config/passport.js), so resetting a password logs
    // out anyone else using the account.
    passwordChangedAt: Date,

    // The current "forgot password" code, if one has been requested.
    // Only a bcrypt hash of the code is stored, like the password, and it's
    // left out of queries unless asked for. Removed once the password is reset.
    passwordReset: {
      type: {
        codeHash: String,
        sentAt: Date,
        // Wrong guesses so far; the code stops working after a few
        attempts: { type: Number, default: 0 },
      },
      select: false,
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
        delete ret.passwordChangedAt;
        delete ret.passwordReset;
        delete ret.updatedAt;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
