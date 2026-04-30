const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const inquiryTypeRoutes = require('./routes/inquiryTypeRoutes');
const slaPolicyRoutes = require('./routes/slaPolicyRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/inquiry-types', inquiryTypeRoutes);
app.use('/api/sla-policies', slaPolicyRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
