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

    // 1–5 pore-clogging rating. Optional until the ratings vs. flagging
    // decision is made (see docs/ARCHITECTURE.md, "Open decisions").
    rating: {
      type: Number,
      min: 1,
      max: 5,
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
  { timestamps: true }
);

module.exports = mongoose.model('Ingredient', ingredientSchema);
