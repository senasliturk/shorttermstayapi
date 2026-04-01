'use strict';

const pool = require('../db/db');

/**
 * Parses CSV text and bulk-inserts listings.
 * Expected CSV columns (header-driven, order flexible):
 *   no_of_people, country, city, price, title, description, location
 *
 * @param {number} host_id
 * @param {string} csvText  - raw CSV string
 * @returns {{ created: number, errors: string[] }}
 */
async function insertListingsFromCsv(host_id, csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    const err = new Error('CSV file must contain a header row and at least one data row');
    err.status = 400;
    throw err;
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  const getCol = (row, name) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? row[idx].trim() : null;
  };

  let created = 0;
  const errors = [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const row = line.split(',');
      const country = getCol(row, 'country');
      const city = getCol(row, 'city');
      const capacity = getCol(row, 'no_of_people');
      const price = getCol(row, 'price');
      const title = getCol(row, 'title') || `Listing ${i}`;
      const description = getCol(row, 'description') || null;
      const location = getCol(row, 'location') || `${city}, ${country}`;

      if (!country || !city || !capacity || !price) {
        errors.push(`Row ${i + 1}: Missing required fields (country, city, no_of_people, price)`);
        continue;
      }

      try {
        await client.query(
          `INSERT INTO listings (host_id, title, description, location, country, city, capacity, price_per_night)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [host_id, title, description, location, country, city, parseInt(capacity, 10), parseFloat(price)]
        );
        created++;
      } catch (rowErr) {
        errors.push(`Row ${i + 1}: ${rowErr.message}`);
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return { created, errors };
}

module.exports = { insertListingsFromCsv };
