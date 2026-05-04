const Ticket = require('../models/Ticket');
const { findActiveSLAPolicyForDepartment } = require('../services/slaEscalationService');

// @desc    Get all tickets (students see own, staff/admin see all)
// @route   GET /api/tickets
// @access  Private
const getTickets = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'student') {
      query.student = req.user._id;
    }

    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
      .populate('student', 'name email')
      .populate('assignedTo', 'name')
      .populate('department', 'name')
      .populate('inquiryType', 'name')
      .populate(
        'slaPolicy',
        'name responseTimeValue responseTimeUnit resolutionTimeValue resolutionTimeUnit escalationTimeValue escalationTimeUnit'
      )
      .populate('comments.author', 'name role');

    res.json(tickets);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new ticket (student only)
// @route   POST /api/tickets
// @access  Private (student)
const createTicket = async (req, res, next) => {
  try {
    const { title, description, department, inquiryType } = req.body;

    console.log('[createTicket] body:', { title, description, department, inquiryType });
    console.log('[createTicket] student:', req.user._id);

    if (!title || !description || !department || !inquiryType) {
      return res.status(400).json({ message: 'All fields (title, description, department, inquiryType) are required' });
    }

    const matchingSLAPolicy = await findActiveSLAPolicyForDepartment(department);

    const ticket = await Ticket.create({
      title,
      description,
      department,
      inquiryType,
      student: req.user._id,
      slaPolicy: matchingSLAPolicy ? matchingSLAPolicy._id : undefined,
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('[createTicket] error:', error.message);
    next(error);
  }
};

// @desc    Get single ticket
// @route   GET /api/tickets/:id
// @access  Private
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('student', 'name email')
      .populate('assignedTo', 'name')
      .populate('department', 'name')
      .populate('inquiryType', 'name')
      .populate(
        'slaPolicy',
        'name responseTimeValue responseTimeUnit resolutionTimeValue resolutionTimeUnit escalationTimeValue escalationTimeUnit'
      )
      .populate('comments.author', 'name role');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Students can only view their own tickets
    if (req.user.role === 'student' && ticket.student._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this ticket' });
    }

    res.json(ticket);
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment to ticket
// @route   POST /api/tickets/:id/comments
// @access  Private
const addTicketComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Students can only comment on their own tickets
    if (req.user.role === 'student' && ticket.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to comment on this ticket' });
    }

    const comment = { text, author: req.user._id };
    ticket.comments.push(comment);
    await ticket.save();

    const updatedTicket = await Ticket.findById(req.params.id)
      .populate('comments.author', 'name role');

    res.status(201).json(updatedTicket.comments);
  } catch (error) {
    next(error);
  }
};

// @desc    Escalate ticket to admin (staff only)
// @route   PUT /api/tickets/:id/escalate
// @access  Private (staff)
const escalateTicket = async (req, res, next) => {
  try {
    const { note } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.status = 'ESCALATED';
    ticket.assignedTo = req.user._id;
    ticket.autoEscalated = false;
    ticket.escalatedAt = new Date();
    ticket.escalationReason = note || 'Manually escalated by staff/admin';

    // Add escalation note as a comment
    if (note) {
      ticket.comments.push({ text: `[ESCALATED] ${note}`, author: req.user._id });
    }

    await ticket.save();

    const updated = await Ticket.findById(ticket._id)
      .populate('student', 'name email')
      .populate('assignedTo', 'name')
      .populate('department', 'name')
      .populate('inquiryType', 'name')
      .populate(
        'slaPolicy',
        'name responseTimeValue responseTimeUnit resolutionTimeValue resolutionTimeUnit escalationTimeValue escalationTimeUnit'
      )
      .populate('comments.author', 'name role');

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Approve / resolve escalated ticket (admin only)
// @route   PUT /api/tickets/:id/approve
// @access  Private (admin)
const approveTicket = async (req, res, next) => {
  try {
    const { status, note } = req.body; // status: 'RESOLVED' | 'CLOSED' | 'IN_PROGRESS'
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.status = status || 'RESOLVED';

    // Stamp resolvedAt when ticket is resolved or closed
    if (['RESOLVED', 'CLOSED'].includes(ticket.status) && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }

    if (note) {
      ticket.comments.push({ text: `[ADMIN] ${note}`, author: req.user._id });
    }

    await ticket.save();

    const updated = await Ticket.findById(ticket._id)
      .populate('student', 'name email')
      .populate('assignedTo', 'name')
      .populate('department', 'name')
      .populate('inquiryType', 'name')
      .populate(
        'slaPolicy',
        'name responseTimeValue responseTimeUnit resolutionTimeValue resolutionTimeUnit escalationTimeValue escalationTimeUnit'
      )
      .populate('comments.author', 'name role');

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Attach SLA policy to ticket (admin only)
// @route   PUT /api/tickets/:id/sla
// @access  Private (admin)
const updateTicketSLA = async (req, res, next) => {
  try {
    const { slaPolicyId } = req.body;
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      { slaPolicy: slaPolicyId },
      { new: true }
    ).populate(
      'slaPolicy',
      'name responseTimeValue responseTimeUnit resolutionTimeValue resolutionTimeUnit escalationTimeValue escalationTimeUnit'
    );

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    next(error);
  }
};

// @desc    Rate a resolved/closed ticket (student only, once)
// @route   PUT /api/tickets/:id/rate
// @access  Private (student)
const rateTicket = async (req, res, next) => {
  try {
    const { rating, ratingComment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Only the ticket owner can rate
    if (ticket.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to rate this ticket' });
    }

    // Only rate resolved or closed tickets
    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      return res.status(400).json({ message: 'You can only rate resolved or closed tickets' });
    }

    // Prevent re-rating
    if (ticket.rating !== null && ticket.rating !== undefined) {
      return res.status(400).json({ message: 'You have already rated this ticket' });
    }

    ticket.rating = rating;
    ticket.ratingComment = ratingComment || null;
    await ticket.save();

    res.json({ message: 'Rating submitted successfully', rating: ticket.rating });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTickets,
  createTicket,
  getTicketById,
  addTicketComment,
  escalateTicket,
  approveTicket,
  updateTicketSLA,
  rateTicket,
};