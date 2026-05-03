const PDFDocument = require('pdfkit');
const Ticket = require('../models/Ticket');

// @desc    Export all tickets as a formatted PDF table (admin only)
// @route   GET /api/tickets/export/pdf
// @access  Private (admin)
const exportTicketsPDF = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({})
      .sort({ createdAt: -1 })
      .populate('student', 'name email')
      .populate('assignedTo', 'name')
      .populate('department', 'name')
      .populate('inquiryType', 'name')
      .populate('slaPolicy', 'name');

    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="educonnect-tickets-${new Date().toISOString().split('T')[0]}.pdf"`
    );

    doc.pipe(res);

    // ─── Header ───────────────────────────────────────────────────────────
    doc
      .rect(0, 0, doc.page.width, 70)
      .fill('#2C3E50');

    doc
      .fillColor('#FFFFFF')
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('EduConnect — Ticket Report', 30, 20);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#BDC3C7')
      .text(`Generated on ${new Date().toLocaleString()}   |   Total Tickets: ${tickets.length}`, 30, 48);

    doc.moveDown(4);

    // ─── Table Setup ──────────────────────────────────────────────────────
    const tableTop = 85;
    const pageWidth = doc.page.width - 60; // 30px margin each side

    const cols = {
      no:          { x: 30,   width: 35 },
      title:       { x: 65,   width: 130 },
      student:     { x: 195,  width: 110 },
      department:  { x: 305,  width: 100 },
      inquiryType: { x: 405,  width: 100 },
      status:      { x: 505,  width: 80 },
      sla:         { x: 585,  width: 80 },
      created:     { x: 665,  width: 90 },
    };

    const rowHeight = 22;
    const headerHeight = 26;
    const fontSize = 8;

    const statusColors = {
      OPEN:        '#3498DB',
      IN_PROGRESS: '#F39C12',
      ESCALATED:   '#E74C3C',
      RESOLVED:    '#27AE60',
      CLOSED:      '#7F8C8D',
    };

    // Draw table header background
    doc
      .rect(30, tableTop, pageWidth, headerHeight)
      .fill('#34495E');

    // Draw header text
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(fontSize);
    const headers = [
      { key: 'no',          label: '#' },
      { key: 'title',       label: 'Title' },
      { key: 'student',     label: 'Student' },
      { key: 'department',  label: 'Department' },
      { key: 'inquiryType', label: 'Inquiry Type' },
      { key: 'status',      label: 'Status' },
      { key: 'sla',         label: 'SLA Policy' },
      { key: 'created',     label: 'Created' },
    ];

    headers.forEach(h => {
      doc.text(h.label, cols[h.key].x + 4, tableTop + 8, {
        width: cols[h.key].width - 6,
        ellipsis: true,
      });
    });

    // ─── Table Rows ───────────────────────────────────────────────────────
    let y = tableTop + headerHeight;

    tickets.forEach((ticket, idx) => {
      // Page break check
      if (y + rowHeight > doc.page.height - 40) {
        doc.addPage();
        y = 30;

        // Re-draw header on new page
        doc.rect(30, y, pageWidth, headerHeight).fill('#34495E');
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(fontSize);
        headers.forEach(h => {
          doc.text(h.label, cols[h.key].x + 4, y + 8, {
            width: cols[h.key].width - 6,
            ellipsis: true,
          });
        });
        y += headerHeight;
      }

      // Alternating row background
      const rowBg = idx % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
      doc.rect(30, y, pageWidth, rowHeight).fill(rowBg);

      // Row border bottom
      doc
        .moveTo(30, y + rowHeight)
        .lineTo(30 + pageWidth, y + rowHeight)
        .strokeColor('#E0E6ED')
        .lineWidth(0.5)
        .stroke();

      doc.font('Helvetica').fontSize(fontSize).fillColor('#2C3E50');

      const textY = y + 7;

      // #
      doc.text(String(idx + 1), cols.no.x + 4, textY, { width: cols.no.width - 6, ellipsis: true });

      // Title
      doc.text(ticket.title || '—', cols.title.x + 4, textY, { width: cols.title.width - 6, ellipsis: true });

      // Student (name + email)
      const studentName = ticket.student?.name || 'N/A';
      doc.text(studentName, cols.student.x + 4, textY, { width: cols.student.width - 6, ellipsis: true });

      // Department
      doc.text(ticket.department?.name || '—', cols.department.x + 4, textY, { width: cols.department.width - 6, ellipsis: true });

      // Inquiry Type
      doc.text(ticket.inquiryType?.name || '—', cols.inquiryType.x + 4, textY, { width: cols.inquiryType.width - 6, ellipsis: true });

      // Status badge (colored pill)
      const statusColor = statusColors[ticket.status] || '#7F8C8D';
      const badgeW = 64;
      const badgeH = 14;
      const badgeX = cols.status.x + 4;
      const badgeY = y + (rowHeight - badgeH) / 2;
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 4).fill(statusColor);
      doc
        .fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(6.5)
        .text(ticket.status, badgeX, badgeY + 3.5, { width: badgeW, align: 'center' });
      doc.font('Helvetica').fontSize(fontSize).fillColor('#2C3E50');

      // SLA
      doc.text(ticket.slaPolicy?.name || 'None', cols.sla.x + 4, textY, { width: cols.sla.width - 6, ellipsis: true });

      // Created date
      const created = ticket.createdAt
        ? new Date(ticket.createdAt).toLocaleDateString('en-GB')
        : '—';
      doc.text(created, cols.created.x + 4, textY, { width: cols.created.width - 6, ellipsis: true });

      y += rowHeight;
    });

    // ─── Footer ───────────────────────────────────────────────────────────
    doc
      .fillColor('#7F8C8D')
      .fontSize(8)
      .font('Helvetica')
      .text(
        'EduConnect — Confidential Admin Report',
        30,
        doc.page.height - 30,
        { align: 'center', width: pageWidth }
      );

    doc.end();
  } catch (error) {
    next(error);
  }
};

module.exports = { exportTicketsPDF };
