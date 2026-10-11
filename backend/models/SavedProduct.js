const mongoose = require('mongoose');

// Subdocuments are stored inside the product, not as separate documents.
// "_id: false" stops Mongoose adding an ID to each one, since nothing
// needs to look them up individually.
const ingredientSchema = new mongoose.Schema(
  { name: String, normalized: String },
  { _id: false }
);

const matchSchema = new mongoose.Schema({ name: String, sources: [String] }, { _id: false });

// Product categories, stored as short codes. The app shows them with
// display names (frontend/src/utils/categories.js), so keep the two lists
// in sync. Codes rather than display names are stored, so a name can be
// changed later without updating saved products.
const PRODUCT_CATEGORIES = [
  'cleanser',
  'toner',
  'astringent',
  'exfoliant',
  'serum',
  'retinoid',
  'moisturizer',
  'eye',
  'lip',
  'sunscreen',
  'mask',
  'makeup',
  'hair',
  'body',
  'detergent',
  'other',
];

const flaggedSchema = new mongoose.Schema(
  { name: String, normalized: String, sources: [String], matches: [matchSchema] },
  { _id: false }
);

/**
 * SavedProduct
 * A product a user checked and chose to keep. The results are a snapshot:
 * they show what the user saw when they saved it, even if the ingredient
 * list changes later (see docs/ARCHITECTURE.md, "Relationships").
 */
const savedProductSchema = new mongoose.Schema(
  {
    // Always set on the server from the login token, never from the request
    // body, so users can't save products to someone else's account.
    // Indexed because every query filters by it.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    productName: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
      maxlength: [100, 'Product name must be 100 characters or fewer.'],
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, 'Brand must be 100 characters or fewer.'],
    },
    // Optional; one of PRODUCT_CATEGORIES
    category: {
      type: String,
      enum: { values: PRODUCT_CATEGORIES, message: 'Please choose a category from the list.' },
    },

    // The ingredient text as analyzed
    rawText: { type: String, required: true },
    // The parsed ingredient list, in label order
    ingredients: { type: [ingredientSchema], default: [] },
    // Flagged ingredients at the time of saving
    flagged: { type: [flaggedSchema], default: [] },

    // How the ingredient list was entered
    source: {
      type: String,
      enum: { values: ['photo', 'paste'], message: 'Source must be "photo" or "paste".' },
      default: 'paste',
    },
  },
  {
    timestamps: true,
    // What the API sends: "id" instead of "_id", without Mongo internals or
    // the owner's ID (the owner is always the logged-in user anyway)
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.user;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('SavedProduct', savedProductSchema);
