const express = require('express');
const { body } = require('express-validator');
const Task = require('../models/Task');
const Ticket = require('../models/Ticket');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = express.Router();

// Get tasks assigned to current worker with pagination (worker or admin)
router.get('/my-tasks', auth, async (req, res, next) => {
  try {
    // Admin can view all workers' tasks by passing workerId
    const targetWorkerId = req.query.workerId && req.role === 'admin' ? req.query.workerId : req.userId;
    
    // Non-admin must be worker
    if (req.role !== 'admin' && req.role !== 'worker') {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const filter = { workerId: targetWorkerId };
    if (status && ['assigned', 'in_progress', 'completed'].includes(status)) {
      filter.status = status;
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate({
          path: 'ticketId',
          populate: { path: 'studentId', select: 'name' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter)
    ]);

    res.json({
      tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
});

// Get worker stats (worker or admin can view any worker stats)
router.get('/stats', auth, async (req, res, next) => {
  try {
    const targetWorkerId = req.query.workerId && req.role === 'admin' ? req.query.workerId : req.userId;
    
    if (req.role !== 'admin' && req.role !== 'worker') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const [total, assigned, inProgress, completed] = await Promise.all([
      Task.countDocuments({ workerId: targetWorkerId }),
      Task.countDocuments({ workerId: targetWorkerId, status: 'assigned' }),
      Task.countDocuments({ workerId: targetWorkerId, status: 'in_progress' }),
      Task.countDocuments({ workerId: targetWorkerId, status: 'completed' })
    ]);

    res.json({ total, assigned, inProgress, completed });
  } catch (err) {
    next(err);
  }
});

// Get single task by ID
router.get('/:id', auth, requireRole('worker', 'admin'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate({
        path: 'ticketId',
        populate: [
          { path: 'studentId', select: 'name' },
          { path: 'assignedWorker', select: 'name' }
        ]
      })
      .populate('workerId', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (req.role === 'worker' && task.workerId._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ task });
  } catch (err) {
    next(err);
  }
});

// Worker: start task
router.put('/:id/start', auth, requireRole('worker'), async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.workerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (task.status !== 'assigned') {
      return res.status(400).json({ message: 'Only assigned tasks can be started.' });
    }

    task.status = 'in_progress';
    task.startedAt = new Date();
    await task.save();

    // Also update the ticket status
    await Ticket.findByIdAndUpdate(task.ticketId, { status: 'in_progress' });

    const populated = await Task.findById(task._id)
      .populate({
        path: 'ticketId',
        populate: { path: 'studentId', select: 'name' }
      });

    res.json({ task: populated });
  } catch (err) {
    next(err);
  }
});

// Worker: complete task
router.put('/:id/complete', auth, requireRole('worker'), upload.single('image'), [
  body('actualMinutesSpent').optional().isInt({ min: 0 }).withMessage('Time must be a non-negative integer'),
  body('notes').optional().trim().isLength({ max: 5000 })
], validate, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.workerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (task.status !== 'in_progress') {
      return res.status(400).json({ message: 'Only in-progress tasks can be completed.' });
    }

    task.status = 'completed';
    task.completedAt = new Date();
    if (req.body.actualMinutesSpent !== undefined) {
      task.actualMinutesSpent = req.body.actualMinutesSpent;
    }
    if (req.body.notes) {
      task.notes = req.body.notes;
    }
    
    if (req.file) {
      task.completionImagePath = `/uploads/${req.file.filename}`;
    }
    
    await task.save();
    
    // Also update the ticket status
    await Ticket.findByIdAndUpdate(task.ticketId, { status: 'resolved', resolvedAt: new Date() });

    const populated = await Task.findById(task._id)
      .populate({
        path: 'ticketId',
        populate: { path: 'studentId', select: 'name' }
      });

    res.json({ task: populated });
  } catch (err) {
    next(err);
  }
});

// Worker: add notes to task
router.put('/:id/notes', auth, requireRole('worker'), [
  body('notes').trim().isLength({ min: 1, max: 5000 }).withMessage('Notes must be 1-5000 characters')
], validate, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.workerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    task.notes = req.body.notes;
    await task.save();

    res.json({ task });
  } catch (err) {
    next(err);
  }
});

// Worker: update estimated time
router.put('/:id/estimate', auth, requireRole('worker'), [
  body('estimatedMinutes').isInt({ min: 0 }).withMessage('Estimated time must be a non-negative integer')
], validate, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    if (task.workerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    task.estimatedMinutes = req.body.estimatedMinutes;
    await task.save();

    res.json({ task });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
