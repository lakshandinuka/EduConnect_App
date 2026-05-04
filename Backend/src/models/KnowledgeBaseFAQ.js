const mongoose = require('mongoose');

const knowledgeBaseFAQSchema = new mongoose.Schema({
  question: {
    type: String,
    required: [true, 'Please add a question'],
    trim: true,
    maxlength: 512,
  },
  answer: {
    type: String,
    required: [true, 'Please add an answer'],
    trim: true,
  },
  category: {
    type: String,
    default: 'General',
    trim: true,
    maxlength: 120,
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED'],
    default: 'PUBLISHED',
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

knowledgeBaseFAQSchema.index({ status: 1, sortOrder: 1, updatedAt: -1 });
knowledgeBaseFAQSchema.index({ category: 1 });

module.exports = mongoose.model('KnowledgeBaseFAQ', knowledgeBaseFAQSchema);
