'use strict';

const bookingService = require('../services/booking.service');

async function bookStay(req, res, next) {
  try {
    const guest_id = req.user.id;
    const { listing_id, date_from, date_to, guest_count, guest_names } = req.body;

    if (!listing_id || !date_from || !date_to || !guest_count) {
      return res.status(400).json({
        success: false,
        message: 'listing_id, date_from, date_to, and guest_count are required',
      });
    }

    const booking = await bookingService.bookStay({
      listing_id,
      guest_id,
      date_from,
      date_to,
      guest_count,
      guest_names,
    });

    return res.status(201).json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
}

module.exports = { bookStay };
