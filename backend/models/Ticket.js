const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: [true, 'Ticket ID is required'],
    index: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
    minlength: [10, 'Message must be at least 10 characters'],
    maxlength: [5000, 'Message cannot exceed 5000 characters']
  },
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true,
    minlength: [3, 'Topic must be at least 3 characters'],
    maxlength: [200, 'Topic cannot exceed 200 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['open', 'assigned', 'in_progress', 'resolved', 'rejected'],
      message: 'Invalid status value'
    },
    default: 'open',
    index: true
  },
  priority: {
    type: String,
    enum: {
      values: [null, 'low', 'medium', 'high', 'urgent'],
      message: 'Invalid priority value'
    },
    default: null
  },
  assignedWorker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [1000, 'Rejection reason cannot exceed 1000 characters'],
    default: null
  },
  imagePath: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    default: null
  },
  review: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review cannot exceed 1000 characters'],
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

ticketSchema.index({ studentId: 1, createdAt: -1 });
ticketSchema.index({ assignedWorker: 1, status: 1 });
ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ priority: 1, status: 1 });

ticketSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

ticketSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
