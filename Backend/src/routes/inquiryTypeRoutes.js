const express = require('express');
const router = express.Router();
const { getInquiryTypes, createInquiryType } = require('../controllers/inquiryTypeController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(getInquiryTypes)
  .post(protect, createInquiryType);

module.exports = router;
