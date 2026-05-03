const express = require('express');
const router = express.Router();
const { getDepartments, createDepartment } = require('../controllers/departmentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(getDepartments)
  .post(protect, createDepartment);

module.exports = router;
