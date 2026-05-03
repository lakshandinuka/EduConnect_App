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

// @desc    Create a new SLA Policy
// @route   POST /api/sla-policies
// @access  Private (Admin only)
const createSLAPolicy = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { 
      name, department, priority, status, 
      responseTimeValue, responseTimeUnit, 
      resolutionTimeValue, resolutionTimeUnit, 
      escalationRules 
    } = req.body;

    const policy = await SLAPolicy.create({
      name, department, priority, status,
      responseTimeValue, responseTimeUnit,
      resolutionTimeValue, resolutionTimeUnit,
      escalationRules
    });
    
    res.status(201).json(policy);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSLAPolicies,
  createSLAPolicy,
};
