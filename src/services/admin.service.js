'use strict';

const pool = require('../db/db');

/**
 * Returns a paginated report of listings filtered by country/city, sorted by rating.
 * @param {object} filters - { country, city }
 * @param {number} page
 */
async function reportListings(filters, page = 1) {
  const { country, city } = filters;
  const limit = 10;
  const offset = (page - 1) * limit;

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

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const query = `
    SELECT
      l.id,
      l.title,
      l.country,
      l.city,
      l.capacity,
      l.price_per_night,
      u.name          AS host_name,
      ROUND(AVG(r.rating), 2) AS avg_rating,
      COUNT(r.id)     AS review_count
    FROM listings l
    JOIN users u ON u.id = l.host_id
    LEFT JOIN reviews r ON r.listing_id = l.id
    ${whereClause}
    GROUP BY l.id, u.name
    ORDER BY avg_rating DESC NULLS LAST, l.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;

  params.push(limit, offset);

  const countQuery = `
    SELECT COUNT(DISTINCT l.id) AS total
    FROM listings l
    ${whereClause}
  `;

  const [dataResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, params.slice(0, params.length - 2)),
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

module.exports = { reportListings };
