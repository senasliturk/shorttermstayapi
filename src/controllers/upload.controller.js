'use strict';

const uploadService = require('../services/upload.service');

async function uploadListingsCsv(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'CSV file is required' });
    }

    // Accept text/csv or text/plain or application/octet-stream (browser quirk)
    const allowedMimes = ['text/csv', 'text/plain', 'application/octet-stream', 'application/vnd.ms-excel'];
    const isCSV = allowedMimes.includes(req.file.mimetype) || req.file.originalname.endsWith('.csv');

    if (!isCSV) {
      return res.status(400).json({ success: false, message: 'Only CSV files are accepted' });
    }

    const host_id = req.user.id;
    const csvText = req.file.buffer.toString('utf-8');

    const result = await uploadService.insertListingsFromCsv(host_id, csvText);

    return res.status(201).json({
      success: true,
      data: {
        message: `File processed. ${result.created} listing(s) created.`,
        created: result.created,
        errors: result.errors,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadListingsCsv };
