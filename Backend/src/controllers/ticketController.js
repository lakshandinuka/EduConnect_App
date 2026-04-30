const Ticket = require('../models/Ticket');

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
      .populate('slaPolicy', 'name')
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

    const ticket = await Ticket.create({
      title,
      description,
      department,
      inquiryType,
      student: req.user._id,
    });

    res.status(201).json(ticket);
  } catch (error) {
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
      .populate('slaPolicy', 'name responseTime resolutionTime')
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

    if (note) {
      ticket.comments.push({ text: `[ADMIN] ${note}`, author: req.user._id });
    }

    await ticket.save();

    const updated = await Ticket.findById(ticket._id)
      .populate('student', 'name email')
      .populate('assignedTo', 'name')
      .populate('department', 'name')
      .populate('inquiryType', 'name')
      .populate('slaPolicy', 'name')
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
    ).populate('slaPolicy', 'name responseTime resolutionTime');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json(ticket);
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
};
