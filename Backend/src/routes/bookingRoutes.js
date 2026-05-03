const express = require('express');
const router = express.Router();
const {
  getAvailableTimeSlots,
  createTimeSlot,
  getBookings,
  createBooking,
  updateBookingStatus,
  getAllTimeSlots,
  getAllBookings,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Time slots
router.route('/timeslots')
  .get(protect, getAvailableTimeSlots)
  .post(protect, authorize('staff', 'admin'), createTimeSlot);

// All timeslots (for staff/admin management view)
router.route('/timeslots/all')
  .get(protect, authorize('staff', 'admin'), getAllTimeSlots);

// Bookings
router.route('/')
  .get(protect, getBookings)
  .post(protect, authorize('student'), createBooking);

// All bookings (staff/admin)
router.route('/all')
  .get(protect, authorize('staff', 'admin'), getAllBookings);

router.route('/:id/status')
  .put(protect, authorize('staff', 'admin'), updateBookingStatus);

module.exports = router;
