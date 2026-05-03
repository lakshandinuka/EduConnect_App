const InquiryType = require('../models/InquiryType');

// @desc    Get all inquiry types
// @route   GET /api/inquiry-types
// @access  Public
const getInquiryTypes = async (req, res, next) => {
  try {
    const inquiryTypes = await InquiryType.find();
    res.json(inquiryTypes);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new inquiry type
// @route   POST /api/inquiry-types
// @access  Private (Admin only)
const createInquiryType = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const { name, description } = req.body;
    const inquiryType = await InquiryType.create({ name, description });
    res.status(201).json(inquiryType);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInquiryTypes,
  createInquiryType,
};
