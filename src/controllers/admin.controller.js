'use strict';

const adminService = require('../services/admin.service');

async function reportListings(req, res, next) {
  try {
    const { country, city } = req.query;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));

    const result = await adminService.reportListings({ country, city }, page);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { reportListings };
