'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const adminController = require('../../controllers/admin.controller');
const uploadController = require('../../controllers/upload.controller');
const authMiddleware = require('../../middleware/auth.middleware');
const { generalLimiter } = require('../../middleware/rateLimiter.middleware');

// Use memory storage so buffer is available for CSV parsing
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints
 */

/**
 * @swagger
 * /api/v1/admin/report:
 *   get:
 *     summary: Report listings with ratings (Admin, paged 10)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Paginated listings report with ratings
 *       401:
 *         description: Unauthorized
 */
router.get('/report', authMiddleware, generalLimiter, adminController.reportListings);

/**
 * @swagger
 * /api/v1/admin/listings/upload:
 *   post:
 *     summary: Bulk insert listings from CSV file (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with columns - title, description, location, country, city, no_of_people, price
 *     responses:
 *       201:
 *         description: File processed, listings created
 *       400:
 *         description: Invalid file or format
 *       401:
 *         description: Unauthorized
 */
router.post('/listings/upload', authMiddleware, generalLimiter, upload.single('file'), uploadController.uploadListingsCsv);

module.exports = router;
