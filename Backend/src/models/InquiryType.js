const mongoose = require('mongoose');

const inquiryTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an inquiry type name'],
    unique: true,
  },
  description: {
    type: String,
  },
}, { timestamps: true });

module.exports = mongoose.model('InquiryType', inquiryTypeSchema);
