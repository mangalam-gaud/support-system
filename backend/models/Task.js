const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: [true, 'Ticket ID is required'],
    index: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Worker ID is required'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  status: {
    type: String,
    enum: {
      values: ['assigned', 'in_progress', 'completed'],
      message: 'Invalid task status'
    },
    default: 'assigned',
    index: true
  },
  estimatedMinutes: {
    type: Number,
    min: [0, 'Estimated time cannot be negative'],
    default: null
  },
  actualMinutesSpent: {
    type: Number,
    min: [0, 'Actual time cannot be negative'],
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [5000, 'Notes cannot exceed 5000 characters'],
    default: null
  },
  completionImagePath: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

taskSchema.index({ workerId: 1, status: 1 });
taskSchema.index({ ticketId: 1, workerId: 1 });

taskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

taskSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Task', taskSchema);
