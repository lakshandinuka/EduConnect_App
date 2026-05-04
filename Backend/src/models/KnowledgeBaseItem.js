const mongoose = require('mongoose');

const knowledgeBaseItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  type: {
    type: String,
    enum: ['ARTICLE', 'PDF'],
    default: 'ARTICLE',
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    default: 'DRAFT',
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBaseCategory',
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
  pdfUrl: {
    type: String,
    default: '',
    trim: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  isRecommended: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

knowledgeBaseItemSchema.index({ status: 1, updatedAt: -1 });
knowledgeBaseItemSchema.index({ category: 1, status: 1 });
knowledgeBaseItemSchema.index({ title: 'text', description: 'text', content: 'text' });

module.exports = mongoose.model('KnowledgeBaseItem', knowledgeBaseItemSchema);
