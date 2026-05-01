const Announcement = require('../models/Announcement');

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Public (or protected based on audience)
const getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 }).populate('createdBy', 'name');
    res.json(announcements);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new announcement
// @route   POST /api/announcements
// @access  Private (Admin/Staff only)
const createAnnouncement = async (req, res, next) => {
  try {
    // Only allow admin/staff to create (can be moved to middleware)
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Not authorized to create announcements' });
    }

    const { title, content, targetAudience } = req.body;

    const announcement = await Announcement.create({
      title,
      content,
      targetAudience: targetAudience || 'all',
      createdBy: req.user._id,
    });

    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnnouncements,
  createAnnouncement,
};
