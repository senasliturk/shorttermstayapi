'use strict';

const reviewService = require('../services/review.service');

async function reviewStay(req, res, next) {
  try {
    const guest_id = req.user.id;
    const { stay_id, rating, comment } = req.body;

    if (!stay_id || !rating) {
      return res.status(400).json({
        success: false,
        message: 'stay_id and rating are required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const review = await reviewService.reviewStay({ stay_id, guest_id, rating, comment });
    return res.status(201).json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
}

module.exports = { reviewStay };
