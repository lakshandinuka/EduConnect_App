const mongoose = require('mongoose');

const knowledgeBaseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a category name'],
    trim: true,
    unique: true,
    maxlength: 120,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('KnowledgeBaseCategory', knowledgeBaseCategorySchema);
