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
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getTickets)
  .post(protect, authorize('student'), createTicket);

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

module.exports = router;
