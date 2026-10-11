const mongoose = require('mongoose');

/**
 * Ingredient
 * Reference data: potentially pore-clogging ingredients.
 * Loaded by seed/seedIngredients.js — users never create or edit these.
 */
const ingredientSchema = new mongoose.Schema(
  {
    // Display name, as written in the source list (e.g. "Coconut Oil")
    name: {
      type: String,
      required: true,
      trim: true,
    },

    // Normalized name used for matching (e.g. "coconut oil").
    // Unique so the same ingredient can't be stored twice.
    normalized: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Other names this ingredient appears under on labels (normalized)
    aliases: {
      type: [String],
      default: [],
      index: true,
    },

    // Which reference list(s) the ingredient came from
    sources: {
      type: [String],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    // What the API sends: { id, name, aliases, sources, notes? }, without
    // Mongo internals or the matching-only "normalized" field
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.normalized;
        delete ret.createdAt;
        delete ret.updatedAt;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('Ingredient', ingredientSchema);
