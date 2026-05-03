const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  registerStaffOrAdmin,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/register', registerUser);            // Public - students only
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.post('/register-staff', protect, authorize('admin'), registerStaffOrAdmin); // Admin-only

module.exports = router;
