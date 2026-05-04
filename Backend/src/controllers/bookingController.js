const Booking = require('../models/Booking');
const TimeSlot = require('../models/TimeSlot');

// @desc    Get available time slots (for student booking)
// @route   GET /api/bookings/timeslots
// @access  Private
const getAvailableTimeSlots = async (req, res, next) => {
  try {
    const timeSlots = await TimeSlot.find({ isAvailable: true }).sort({ date: 1, startTime: 1 });
    res.json(timeSlots);
  } catch (error) {
    next(error);
  }
};

// @desc    Get ALL time slots (for staff/admin management)
// @route   GET /api/bookings/timeslots/all
// @access  Private (staff, admin)
const getAllTimeSlots = async (req, res, next) => {
  try {
    const timeSlots = await TimeSlot.find()
      .populate('assignedStaff', 'name')
      .sort({ date: 1, startTime: 1 });
    res.json(timeSlots);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new time slot
// @route   POST /api/bookings/timeslots
// @access  Private (staff, admin)
const createTimeSlot = async (req, res, next) => {
  try {
    const { date, startTime, endTime } = req.body;
    const timeSlot = await TimeSlot.create({
      date,
      startTime,
      endTime,
      assignedStaff: req.user._id,
    });
    res.status(201).json(timeSlot);
  } catch (error) {
    next(error);
  }
};

// @desc    Get student's own bookings
// @route   GET /api/bookings
// @access  Private (student)
const getBookings = async (req, res, next) => {
  try {
    const query = req.user.role === 'student' ? { student: req.user._id } : {};
    const bookings = await Booking.find(query)
      .populate('student', 'name email')
      .populate('timeSlot')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

// @desc    Get ALL bookings (for staff/admin management)
// @route   GET /api/bookings/all
// @access  Private (staff, admin)
const getAllBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('student', 'name email')
      .populate('timeSlot')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private (student)
const createBooking = async (req, res, next) => {
  try {
    const { timeSlotId, reason } = req.body;

    const timeSlot = await TimeSlot.findById(timeSlotId);
    if (!timeSlot || !timeSlot.isAvailable) {
      return res.status(400).json({ message: 'Time slot is not available' });
    }

    const booking = await Booking.create({
      student: req.user._id,
      timeSlot: timeSlotId,
      reason,
    });

    timeSlot.isAvailable = false;
    await timeSlot.save();

    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
};

// @desc    Update booking status (approve/reject)
// @route   PUT /api/bookings/:id/status
// @access  Private (staff, admin)
const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;
    await booking.save();

    if (status === 'REJECTED' || status === 'CANCELLED') {
      const timeSlot = await TimeSlot.findById(booking.timeSlot);
      if (timeSlot) {
        timeSlot.isAvailable = true;
        await timeSlot.save();
      }
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// @desc    Student edits their own booking reason
// @route   PUT /api/bookings/:id
// @access  Private (student)
const updateBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    // Only the student who owns it can edit, and only if still PENDING
    if (booking.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ message: 'Can only edit a pending booking' });
    }
    booking.reason = req.body.reason || booking.reason;
    await booking.save();
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// @desc    Student cancels their own booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private (student)
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ message: 'Can only cancel a pending booking' });
    }
    booking.status = 'CANCELLED';
    await booking.save();
    // Free the time slot back
    const timeSlot = await TimeSlot.findById(booking.timeSlot);
    if (timeSlot) {
      timeSlot.isAvailable = true;
      await timeSlot.save();
    }
    res.json(booking);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailableTimeSlots,
  getAllTimeSlots,
  createTimeSlot,
  getBookings,
  getAllBookings,
  createBooking,
  updateBookingStatus,
  updateBooking,
  cancelBooking,
};
