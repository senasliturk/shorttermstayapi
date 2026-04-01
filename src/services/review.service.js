'use strict';

const pool = require('../db/db');

/**
 * Adds a review for a completed stay.
 * Only the guest who booked can review, and only after the stay ends.
 * @param {object} dto
 */
async function reviewStay(dto) {
  const { stay_id, guest_id, rating, comment } = dto;

  // Verify the booking exists and belongs to this guest
  const bookingResult = await pool.query(
    `SELECT id, listing_id, guest_id, to_date FROM bookings WHERE id = $1`,
    [stay_id]
  );

  if (bookingResult.rowCount === 0) {
    const err = new Error('Booking not found');
    err.status = 404;
    throw err;
  }

  const booking = bookingResult.rows[0];

  if (booking.guest_id !== guest_id) {
    const err = new Error('You can only review your own bookings');
    err.status = 403;
    throw err;
  }

  // Enforce "after stay" rule
  const today = new Date();
  const stayEnd = new Date(booking.to_date);
  if (today <= stayEnd) {
    const err = new Error('You can only review a stay after it has ended');
    err.status = 400;
    throw err;
  }

  // Check for duplicate review
  const existing = await pool.query(
    'SELECT id FROM reviews WHERE booking_id = $1',
    [stay_id]
  );

  if (existing.rowCount > 0) {
    const err = new Error('You have already reviewed this stay');
    err.status = 409;
    throw err;
  }

  const result = await pool.query(
    `INSERT INTO reviews (booking_id, listing_id, guest_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, booking_id, listing_id, rating, comment, created_at`,
    [stay_id, booking.listing_id, guest_id, rating, comment || null]
  );

  return result.rows[0];
}

module.exports = { reviewStay };
