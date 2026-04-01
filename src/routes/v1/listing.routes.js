'use strict';

const express = require('express');
const router = express.Router();
const listingController = require('../../controllers/listing.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { queryListingsLimiter, generalLimiter } = require('../../middleware/rateLimiter.middleware');

/**
 * @swagger
 * tags:
 *   name: Listings
 *   description: Listing management
 */

/**
 * @swagger
 * /api/v1/listings:
 *   post:
 *     summary: Insert a new listing (Host only)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, location, country, city, capacity, price_per_night]
 *             properties:
 *               title:
 *                 type: string
 *                 example: Cozy Istanbul Apartment
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *                 example: Beyoglu, Istanbul
 *               country:
 *                 type: string
 *                 example: Turkey
 *               city:
 *                 type: string
 *                 example: Istanbul
 *               capacity:
 *                 type: integer
 *                 example: 4
 *               price_per_night:
 *                 type: number
 *                 example: 85.00
 *     responses:
 *       201:
 *         description: Listing created successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, generalLimiter, listingController.insertListing);

/**
 * @swagger
 * /api/v1/listings/query:
 *   get:
 *     summary: Query available listings (Guest, 3 calls/day per IP, paged 10)
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         example: Turkey
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         example: Istanbul
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-07-01"
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         example: "2025-07-07"
 *       - in: query
 *         name: no_of_people
 *         schema:
 *           type: integer
 *         example: 2
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: List of available listings
 *       429:
 *         description: Rate limit exceeded (3 per day)
 */
router.get('/query', queryListingsLimiter, listingController.queryListings);

module.exports = router;
