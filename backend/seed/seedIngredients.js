/**
 * Seeds the Ingredient collection from seed/data/ingredients.json.
 *
 * Usage (from the server folder):
 *   npm run seed            add new ingredients and update existing ones
 *   npm run seed -- --reset delete all ingredients first, then load the list
 *
 * Safe to run more than once: ingredients are matched on their normalized
 * name, so re-running updates them instead of creating duplicates.
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const Ingredient = require('../models/Ingredient');
const { normalizeIngredient } = require('../utils/normalize');

const DATA_FILE = path.join(__dirname, 'data', 'ingredients.json');

/**
 * Reads the JSON file and turns each entry into an Ingredient document.
 * Entries with the same normalized name are merged (sources combined).
 */
function loadIngredients(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(raw)) {
    throw new Error(`${filePath} must contain an array of ingredients`);
  }

  const byNormalized = new Map();

  raw.forEach((entry, i) => {
    // Accept either a plain string ("Coconut Oil") or an object ({ name: ... })
    const item = typeof entry === 'string' ? { name: entry } : entry;
    if (!item || !item.name) {
      throw new Error(`Entry ${i} is missing a name`);
    }

    const normalized = normalizeIngredient(item.name);
    if (!normalized) return; // skip blank lines

    const existing = byNormalized.get(normalized);
    if (existing) {
      existing.sources = [...new Set([...existing.sources, ...(item.sources || [])])];
      return;
    }

    const doc = {
      name: item.name.trim(),
      normalized,
      aliases: (item.aliases || []).map(normalizeIngredient).filter(Boolean),
      sources: item.sources || [],
    };
    // Only include optional fields when the list provides them
    if (item.rating !== undefined) doc.rating = item.rating;
    if (item.notes) doc.notes = item.notes;

    byNormalized.set(normalized, doc);
  });

  return [...byNormalized.values()];
}

async function seed() {
  const reset = process.argv.includes('--reset');

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set. Add it to server/.env');
  }

  const ingredients = loadIngredients(DATA_FILE);
  console.log(`Loaded ${ingredients.length} ingredients from ${path.basename(DATA_FILE)}`);

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Make sure the unique index on "normalized" exists before inserting
  await Ingredient.syncIndexes();

  if (reset) {
    const { deletedCount } = await Ingredient.deleteMany({});
    console.log(`Reset: deleted ${deletedCount} existing ingredients`);
  }

  // Upsert: update if the normalized name exists, insert if it doesn't
  const ops = ingredients.map((doc) => ({
    updateOne: {
      filter: { normalized: doc.normalized },
      update: { $set: doc },
      upsert: true,
    },
  }));

  const result = await Ingredient.bulkWrite(ops);
  console.log(
    `Done: ${result.upsertedCount} added, ${result.modifiedCount} updated, ` +
      `${await Ingredient.countDocuments()} total in database`
  );
}

if (require.main === module) {
  seed()
    .catch((err) => {
      console.error('Seeding failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}

module.exports = { loadIngredients };
