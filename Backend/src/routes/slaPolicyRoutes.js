const express = require('express');
const router = express.Router();

const {
  getSLAPolicies,
  getSLAPolicyById,
  createSLAPolicy,
  updateSLAPolicy,
  deleteSLAPolicy,
} = require('../controllers/slaPolicyController');

const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSLAPolicies)
  .post(protect, createSLAPolicy);

router.route('/:id')
  .get(protect, getSLAPolicyById)
  .put(protect, updateSLAPolicy)
  .delete(protect, deleteSLAPolicy);

module.exports = router;