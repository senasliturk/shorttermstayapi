'use strict';

const pool = require('../db/db');

/**
 * Inserts a new listing (host only).
 * @param {object} dto
 */
async function insertListing(dto) {
  const { host_id, title, description, location, country, city, capacity, price_per_night } = dto;

  const result = await pool.query(
    `INSERT INTO listings (host_id, title, description, location, country, city, capacity, price_per_night)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, title, country, city, capacity, price_per_night, created_at`,
    [host_id, title, description || null, location, country, city, capacity, price_per_night]
  );

  return result.rows[0];
}

/**
 * Queries available listings with paging (10 per page).
 * Excludes listings that are fully booked for the requested dates.
 * @param {object} filters
 * @param {number} page
 */
async function queryListings(filters, page = 1) {
  const { date_from, date_to, no_of_people, country, city } = filters;
  const limit = 10;
  const offset = (page - 1) * limit;

  // Build dynamic WHERE clauses
  const conditions = [];
  const params = [];
  let idx = 1;

  if (country) {
    conditions.push(`LOWER(l.country) = LOWER($${idx++})`);
    params.push(country);
  }
  if (city) {
    conditions.push(`LOWER(l.city) = LOWER($${idx++})`);
    params.push(city);
  }
  if (no_of_people) {
    conditions.push(`l.capacity >= $${idx++}`);
    params.push(parseInt(no_of_people, 10));
  }

  // Exclude listings booked for the requested date range
  let dateExclusion = '';
  if (date_from && date_to) {
    dateExclusion = `
      AND l.id NOT IN (
        SELECT listing_id FROM bookings
        WHERE NOT (to_date <= $${idx} OR from_date >= $${idx + 1})
      )
    `;
    params.push(date_from, date_to);
    idx += 2;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      l.id,
      l.title,
      l.description,
      l.location,
      l.country,
      l.city,
      l.capacity,
      l.price_per_night,
      ROUND(AVG(r.rating), 2) AS rating,
      COUNT(DISTINCT r.id)    AS review_count
    FROM listings l
    LEFT JOIN reviews r ON r.listing_id = l.id
    ${whereClause}
    ${dateExclusion}
    GROUP BY l.id
    ORDER BY l.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  params.push(limit, offset);

  // Count total
  const countQuery = `
    SELECT COUNT(DISTINCT l.id) AS total
    FROM listings l
    ${whereClause}
    ${dateExclusion}
  `;

  const [dataResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params.slice(0, params.length - 2)), // exclude limit/offset
  ]);

  const total = parseInt(countResult.rows[0].total, 10);

  return {
    page,
    pageSize: limit,
    total,
    totalPages: Math.ceil(total / limit),
    listings: dataResult.rows,
  };
}

module.exports = { insertListing, queryListings };
