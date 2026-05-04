const express = require('express');
const router = express.Router();
const {
  getTickets,
  createTicket,
  getTicketById,
  addTicketComment,
  escalateTicket,
  approveTicket,
  updateTicketSLA,
  rateTicket,
} = require('../controllers/ticketController');
const { exportTicketsPDF } = require('../controllers/pdfController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getTickets)
  .post(protect, authorize('student'), createTicket);

// PDF export – must be declared before /:id to prevent shadowing
router.get('/export/pdf', protect, authorize('admin'), exportTicketsPDF);

router.route('/:id')
  .get(protect, getTicketById);

router.route('/:id/comments')
  .post(protect, addTicketComment);

router.route('/:id/escalate')
  .put(protect, authorize('staff', 'admin'), escalateTicket);

router.route('/:id/approve')
  .put(protect, authorize('admin'), approveTicket);

router.route('/:id/sla')
  .put(protect, authorize('admin'), updateTicketSLA);

router.route('/:id/rate')
  .put(protect, authorize('student'), rateTicket);

module.exports = router;