'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('../../controllers/booking.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { generalLimiter } = require('../../middleware/rateLimiter.middleware');

/**
 * @swagger
 * tags:
 *   name: Bookings
 *   description: Stay booking
 */

/**
 * @swagger
 * /api/v1/bookings:
 *   post:
 *     summary: Book a stay (Guest only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [listing_id, date_from, date_to, guest_count]
 *             properties:
 *               listing_id:
 *                 type: integer
 *                 example: 1
 *               date_from:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-01"
 *               date_to:
 *                 type: string
 *                 format: date
 *                 example: "2025-07-07"
 *               guest_count:
 *                 type: integer
 *                 example: 2
 *               guest_names:
 *                 type: string
 *                 example: "Alice, Bob"
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       400:
 *         description: Validation error or capacity exceeded
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Dates already booked
 */
router.post('/', authMiddleware, generalLimiter, bookingController.bookStay);

module.exports = router;
