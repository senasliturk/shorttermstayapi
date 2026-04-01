'use strict';

const pool = require('../db/db');

/**
 * Books a stay for a guest.
 * @param {object} dto
 */
async function bookStay(dto) {
  const { listing_id, guest_id, date_from, date_to, guest_count, guest_names } = dto;

  // Check listing exists and has enough capacity
  const listingResult = await pool.query(
    'SELECT id, capacity FROM listings WHERE id = $1',
    [listing_id]
  );

  if (listingResult.rowCount === 0) {
    const err = new Error('Listing not found');
    err.status = 404;
    throw err;
  }

  const { capacity } = listingResult.rows[0];

  if (parseInt(guest_count, 10) > capacity) {
    const err = new Error(`Listing capacity (${capacity}) is less than guest count (${guest_count})`);
    err.status = 400;
    throw err;
  }

  // Check for overlapping bookings
  const overlapResult = await pool.query(
    `SELECT id FROM bookings
     WHERE listing_id = $1
       AND NOT (to_date <= $2 OR from_date >= $3)`,
    [listing_id, date_from, date_to]
  );

  if (overlapResult.rowCount > 0) {
    const err = new Error('Listing is already booked for the selected dates');
    err.status = 409;
    throw err;
  }

  // Create booking
  const result = await pool.query(
    `INSERT INTO bookings (listing_id, guest_id, from_date, to_date, guest_count, guest_names)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, listing_id, guest_id, from_date, to_date, guest_count, guest_names, created_at`,
    [listing_id, guest_id, date_from, date_to, guest_count, guest_names || null]
  );

  return result.rows[0];
}

module.exports = { bookStay };
