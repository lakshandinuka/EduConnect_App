const express = require('express');
const router = express.Router();
const { getAnalytics } = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getAnalytics);

module.exports = router;
