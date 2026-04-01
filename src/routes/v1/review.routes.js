'use strict';

const express = require('express');
const router = express.Router();
const reviewController = require('../../controllers/review.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { generalLimiter } = require('../../middleware/rateLimiter.middleware');

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Stay reviews
 */

/**
 * @swagger
 * /api/v1/reviews:
 *   post:
 *     summary: Review a stay (Guest only, after stay ends)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [stay_id, rating]
 *             properties:
 *               stay_id:
 *                 type: integer
 *                 example: 1
 *                 description: The booking ID to review
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               comment:
 *                 type: string
 *                 example: Lovely place, highly recommend!
 *     responses:
 *       201:
 *         description: Review added successfully
 *       400:
 *         description: Stay not ended yet or invalid rating
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not your booking
 *       409:
 *         description: Already reviewed
 */
router.post('/', authMiddleware, generalLimiter, reviewController.reviewStay);

module.exports = router;
