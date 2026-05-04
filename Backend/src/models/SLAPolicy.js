const mongoose = require('mongoose');

const escalationRuleSchema = new mongoose.Schema({
  level: {
    type: Number,
    required: true,
  },
  afterValue: {
    type: Number,
    required: true,
  },
  afterUnit: {
    type: String, // e.g. "HOURS", "MINUTES", "DAYS"
    required: true,
  },
  escalateTo: {
    type: String, // could be a role name or department
    required: true,
  },
  increasePriority: {
    type: Boolean,
    default: false,
  },
});

const slaPolicySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a policy name'],
    unique: true,
  },
  department: {
    type: String, // or ObjectId ref to Department
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
  },
  responseTimeValue: {
    type: Number,
  },
  responseTimeUnit: {
    type: String,
  },
  resolutionTimeValue: {
    type: Number,
  },
  resolutionTimeUnit: {
    type: String,
  },
  escalationTimeValue: {
    type: Number,
  },
  escalationTimeUnit: {
    type: String,
  },
  escalationRules: [escalationRuleSchema],
}, { timestamps: true });

module.exports = mongoose.model('SLAPolicy', slaPolicySchema);