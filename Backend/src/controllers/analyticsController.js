const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');

// @desc    Get dashboard analytics
// @route   GET /api/analytics
// @access  Private (Admin only)
const getAnalytics = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // ── 1. Total Tickets ──────────────────────────────────────────────────
    const totalTickets = await Ticket.countDocuments();

    // ── 2. Tickets by status ──────────────────────────────────────────────
    const ticketsByStatus = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const ticketStatsObj = { OPEN: 0, IN_PROGRESS: 0, ESCALATED: 0, RESOLVED: 0, CLOSED: 0 };
    ticketsByStatus.forEach(stat => { ticketStatsObj[stat._id] = stat.count; });

    // ── 3. Avg Resolution Time (hours) ────────────────────────────────────
    const resolutionAgg = await Ticket.aggregate([
      {
        $match: {
          resolvedAt: { $ne: null, $exists: true },
          createdAt:  { $exists: true },
        }
      },
      {
        $project: {
          diffMs: { $subtract: ['$resolvedAt', '$createdAt'] }
        }
      },
      {
        $group: {
          _id: null,
          avgMs: { $avg: '$diffMs' }
        }
      }
    ]);
    const avgResolutionTimeHours =
      resolutionAgg.length > 0
        ? parseFloat((resolutionAgg[0].avgMs / 3600000).toFixed(2))
        : null;

    // ── 4. Avg Satisfaction Rating ────────────────────────────────────────
    const ratingAgg = await Ticket.aggregate([
      { $match: { rating: { $ne: null, $exists: true } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const avgRating =
      ratingAgg.length > 0
        ? parseFloat(ratingAgg[0].avgRating.toFixed(2))
        : null;
    const ratedCount = ratingAgg.length > 0 ? ratingAgg[0].count : 0;

    // ── 5. Ticket Volume by Date (last 30 days) ────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const volumeAgg = await Ticket.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year:  { $year:  '$createdAt' },
            month: { $month: '$createdAt' },
            day:   { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Fill in every calendar day so the chart has no gaps
    const volumeByDate = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const found = volumeAgg.find(
        v => v._id.year === d.getFullYear() && v._id.month === d.getMonth() + 1 && v._id.day === d.getDate()
      );
      volumeByDate.push({ date: label, count: found ? found.count : 0 });
    }

    // ── 6. Bookings ────────────────────────────────────────────────────────
    const totalBookings = await Booking.countDocuments();
    const bookingsByStatus = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const bookingStatsObj = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
    bookingsByStatus.forEach(stat => { bookingStatsObj[stat._id] = stat.count; });

    // ── Response ──────────────────────────────────────────────────────────
    res.json({
      tickets: {
        total: totalTickets,
        byStatus: ticketStatsObj,
        avgResolutionTimeHours,
        avgRating,
        ratedCount,
        volumeByDate,
      },
      bookings: {
        total: totalBookings,
        byStatus: bookingStatsObj,
      },
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics };
