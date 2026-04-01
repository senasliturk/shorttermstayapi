'use strict';

const listingService = require('../services/listing.service');

async function insertListing(req, res, next) {
  try {
    const host_id = req.user.id;
    const { title, description, location, country, city, capacity, price_per_night } = req.body;

    if (!title || !location || !country || !city || !capacity || !price_per_night) {
      return res.status(400).json({
        success: false,
        message: 'title, location, country, city, capacity, and price_per_night are required',
      });
    }

    const listing = await listingService.insertListing({
      host_id,
      title,
      description,
      location,
      country,
      city,
      capacity,
      price_per_night,
    });

    return res.status(201).json({ success: true, data: listing });
  } catch (err) {
    next(err);
  }
}

async function queryListings(req, res, next) {
  try {
    const { date_from, date_to, no_of_people, country, city } = req.query;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));

    const result = await listingService.queryListings(
      { date_from, date_to, no_of_people, country, city },
      page
    );

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { insertListing, queryListings };
