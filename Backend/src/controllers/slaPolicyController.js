const SLAPolicy = require('../models/SLAPolicy');

// @desc    Get all SLA Policies
// @route   GET /api/sla-policies
// @access  Private (Admin only)
const getSLAPolicies = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const policies = await SLAPolicy.find();
    res.json(policies);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single SLA Policy
// @route   GET /api/sla-policies/:id
// @access  Private (Admin only)
const getSLAPolicyById = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const policy = await SLAPolicy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: 'SLA policy not found' });
    }

    res.json(policy);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new SLA Policy
// @route   POST /api/sla-policies
// @access  Private (Admin only)
const createSLAPolicy = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const {
      name,
      department,
      priority,
      status,
      responseTimeValue,
      responseTimeUnit,
      resolutionTimeValue,
      resolutionTimeUnit,
      escalationTimeValue,
      escalationTimeUnit,
      escalationRules,
    } = req.body;

    const policy = await SLAPolicy.create({
      name,
      department,
      priority,
      status,
      responseTimeValue,
      responseTimeUnit,
      resolutionTimeValue,
      resolutionTimeUnit,
      escalationTimeValue,
      escalationTimeUnit,
      escalationRules,
    });

    res.status(201).json(policy);
  } catch (error) {
    next(error);
  }
};

// @desc    Update SLA Policy
// @route   PUT /api/sla-policies/:id
// @access  Private (Admin only)
const updateSLAPolicy = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const policy = await SLAPolicy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: 'SLA policy not found' });
    }

    const {
      name,
      department,
      priority,
      status,
      responseTimeValue,
      responseTimeUnit,
      resolutionTimeValue,
      resolutionTimeUnit,
      escalationTimeValue,
      escalationTimeUnit,
      escalationRules,
    } = req.body;

    policy.name = name !== undefined ? name : policy.name;
    policy.department = department !== undefined ? department : policy.department;
    policy.priority = priority !== undefined ? priority : policy.priority;
    policy.status = status !== undefined ? status : policy.status;
    policy.responseTimeValue = responseTimeValue !== undefined ? responseTimeValue : policy.responseTimeValue;
    policy.responseTimeUnit = responseTimeUnit !== undefined ? responseTimeUnit : policy.responseTimeUnit;
    policy.resolutionTimeValue = resolutionTimeValue !== undefined ? resolutionTimeValue : policy.resolutionTimeValue;
    policy.resolutionTimeUnit = resolutionTimeUnit !== undefined ? resolutionTimeUnit : policy.resolutionTimeUnit;
    policy.escalationTimeValue = escalationTimeValue !== undefined ? escalationTimeValue : policy.escalationTimeValue;
    policy.escalationTimeUnit = escalationTimeUnit !== undefined ? escalationTimeUnit : policy.escalationTimeUnit;
    policy.escalationRules = escalationRules !== undefined ? escalationRules : policy.escalationRules;

    const updatedPolicy = await policy.save();

    res.json(updatedPolicy);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete SLA Policy
// @route   DELETE /api/sla-policies/:id
// @access  Private (Admin only)
const deleteSLAPolicy = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const policy = await SLAPolicy.findById(req.params.id);

    if (!policy) {
      return res.status(404).json({ message: 'SLA policy not found' });
    }

    await policy.deleteOne();

    res.json({ message: 'SLA policy deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSLAPolicies,
  getSLAPolicyById,
  createSLAPolicy,
  updateSLAPolicy,
  deleteSLAPolicy,
};