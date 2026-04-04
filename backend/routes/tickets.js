const express = require('express');
const { body, param, query } = require('express-validator');
const Ticket = require('../models/Ticket');
const Task = require('../models/Task');
const User = require('../models/User');
const Counter = require('../models/Counter');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = express.Router();

// Helper to escape regex special characters (prevents ReDoS)
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Create ticket (student only)
router.post('/', auth, requireRole('student'), upload.single('image'), [
  body('message').isLength({ min: 10, max: 5000 }).withMessage('Message must be 10-5000 characters'),
  body('topic').isLength({ min: 3, max: 200 }).withMessage('Topic must be 3-200 characters')
], validate, async (req, res, next) => {
  try {
    const { message, topic } = req.body;
    const seq = await Counter.getNextSequence('ticket');
    const ticketId = `TKT-${seq}`;

    const ticket = new Ticket({
      ticketId,
      studentId: req.userId,
      message,
      topic,
      priority: null,
      imagePath: req.file ? `/uploads/${req.file.filename}` : null
    });

    await ticket.save();

    res.status(201).json({ ticket });
  } catch (err) {
    next(err);
  }
});

// Get all tickets (admin or auth users) with pagination and filters
router.get('/', auth, async (req, res, next) => {
  try {
    // Admin sees all tickets, others see their own
    const filter = req.role === 'admin' ? {} : { studentId: req.userId };
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status;
    const priority = req.query.priority;
    const search = req.query.search;

    if (status && ['open', 'assigned', 'in_progress', 'resolved', 'rejected'].includes(status)) {
      filter.status = status;
    }
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      filter.priority = priority;
    }
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { topic: { $regex: escaped, $options: 'i' } },
        { message: { $regex: escaped, $options: 'i' } },
        { ticketId: { $regex: escaped, $options: 'i' } }
      ];
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('studentId', 'name')
        .populate('assignedWorker', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(filter)
    ]);

    res.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get student's own tickets with pagination (student or admin)
router.get('/my-tickets', auth, async (req, res, next) => {
  try {
    // Admin can view any student's tickets via query param
    const targetStudentId = req.query.studentId && req.role === 'admin' ? req.query.studentId : req.userId;
    
    // Non-admin must be student
    if (req.role !== 'admin' && req.role !== 'student') {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { studentId: targetStudentId };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('assignedWorker', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(filter)
    ]);

    res.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get worker's assigned tickets with pagination
router.get('/assigned', auth, requireRole('worker'), async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter = { assignedWorker: req.userId };
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [tickets, total] = await Promise.all([
      Ticket.find(filter)
        .populate('studentId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(filter)
    ]);

    // Get associated tasks for these tickets
    const ticketIds = tickets.map(t => t._id);
    const tasks = await Task.find({ ticketId: { $in: ticketIds }, workerId: req.userId });

    const ticketsWithTasks = tickets.map(ticket => {
      const ticketObj = ticket.toObject();
      ticketObj.task = tasks.find(t => t.ticketId.toString() === ticket._id.toString()) || null;
      return ticketObj;
    });

    res.json({
      tickets: ticketsWithTasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
});

// Get single ticket by ticketId string
router.get('/id/:ticketId', auth, async (req, res, next) => {
  try {
    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId })
      .populate('studentId', 'name')
      .populate('assignedWorker', 'name');

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    // Authorization: student sees own, worker sees assigned, admin sees all
    if (
      req.role === 'student' && ticket.studentId._id.toString() !== req.userId.toString() &&
      req.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    if (
      req.role === 'worker' && (!ticket.assignedWorker || ticket.assignedWorker._id.toString() !== req.userId.toString()) &&
      req.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Include task if exists
    let task = null;
    if (ticket.assignedWorker) {
      const workerId = ticket.assignedWorker._id || ticket.assignedWorker;
      task = await Task.findOne({ ticketId: ticket._id, workerId: workerId });
    }

    res.json({ ticket, task });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    // Only admin gets email fields
    const studentSelect = req.role === 'admin' ? 'name email' : 'name';
    const workerSelect = req.role === 'admin' ? 'name email rating totalRatings' : 'name rating totalRatings';

    const ticket = await Ticket.findById(req.params.id)
      .populate('studentId', studentSelect)
      .populate('assignedWorker', workerSelect);

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    // Admin has full access to all tickets
    if (req.role !== 'admin' && req.role !== 'student' && req.role !== 'worker') {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    // Student can only see own tickets
    if (req.role === 'student' && ticket.studentId._id.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    // Worker can only see assigned tickets
    if (req.role === 'worker' && (!ticket.assignedWorker || ticket.assignedWorker._id.toString() !== req.userId.toString())) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Admin gets the task regardless of worker
    let task = null;
    if (ticket.assignedWorker) {
      const workerId = ticket.assignedWorker._id || ticket.assignedWorker;
      if (req.role === 'admin') {
        task = await Task.findOne({ ticketId: ticket._id });
      } else {
        task = await Task.findOne({ ticketId: ticket._id, workerId: workerId });
      }
    }

    res.json({ ticket, task });
  } catch (err) {
    next(err);
  }
});

// Set priority (admin only, only open/assigned tickets)
router.put('/:id/priority', auth, requireRole('admin'), [
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], validate, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (['resolved', 'rejected'].includes(ticket.status)) {
      return res.status(400).json({ message: 'Cannot set priority on a resolved or rejected ticket.' });
    }

    ticket.priority = req.body.priority;
    await ticket.save();

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

// Reject ticket (admin only, only open tickets)
router.put('/:id/reject', auth, requireRole('admin'), [
  body('rejectionReason').trim().isLength({ min: 5, max: 1000 }).withMessage('Rejection reason must be 5-1000 characters')
], validate, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (ticket.status !== 'open') {
      return res.status(400).json({ message: 'Only open tickets can be rejected.' });
    }

    ticket.status = 'rejected';
    ticket.rejectionReason = req.body.rejectionReason;
    await ticket.save();

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

// Assign/reassign ticket to worker (admin only, for open/in_progress/resolved tickets)
router.put('/:id/assign', auth, requireRole('admin'), [
  body('workerId').isMongoId().withMessage('Valid worker ID is required')
], validate, async (req, res, next) => {
  try {
    const { workerId } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (ticket.status === 'rejected') {
      return res.status(400).json({ message: 'Cannot assign rejected tickets.' });
    }

    const worker = await User.findById(workerId);
    if (!worker || worker.role !== 'worker' || !worker.isActive) {
      return res.status(400).json({ message: 'Invalid or inactive worker.' });
    }

    // If reassigning to a different worker
    if (ticket.assignedWorker && ticket.assignedWorker.toString() !== workerId) {
      // Delete existing task for old worker
      await Task.deleteOne({ ticketId: ticket._id, workerId: ticket.assignedWorker });
      
      // Create new task for new worker
      const task = new Task({
        ticketId: ticket._id,
        workerId,
        description: ticket.message,
        status: 'assigned'
      });
      await task.save();
      
      // Reset ticket status
      ticket.status = 'assigned';
      ticket.assignedWorker = workerId;
      ticket.resolvedAt = null;
    } else if (!ticket.assignedWorker) {
      // First assignment
      const task = new Task({
        ticketId: ticket._id,
        workerId,
        description: ticket.message
      });
      await task.save();
      
      ticket.assignedWorker = workerId;
      ticket.status = 'assigned';
    }
    
    await ticket.save();

    const populated = await Ticket.findById(ticket._id)
      .populate('studentId', 'name')
      .populate('assignedWorker', 'name');

    res.json({ ticket: populated });
  } catch (err) {
    next(err);
  }
});

// Worker: mark ticket in_progress
router.put('/:id/start', auth, requireRole('worker'), async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (ticket.assignedWorker.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You are not assigned to this ticket.' });
    }

    if (ticket.status !== 'assigned') {
      return res.status(400).json({ message: 'Only assigned tickets can be started.' });
    }

    ticket.status = 'in_progress';
    await ticket.save();

    await Task.findOneAndUpdate(
      { ticketId: ticket._id, workerId: req.userId },
      { status: 'in_progress', startedAt: new Date() }
    );

    const populated = await Ticket.findById(ticket._id)
      .populate('studentId', 'name')
      .populate('assignedWorker', 'name');

    res.json({ ticket: populated });
  } catch (err) {
    next(err);
  }
});

// Worker: mark ticket resolved
router.put('/:id/resolve', auth, requireRole('worker'), [
  body('actualMinutesSpent').optional().isInt({ min: 0 }).withMessage('Time must be a non-negative integer'),
  body('notes').optional().trim().isLength({ max: 5000 })
], validate, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (ticket.assignedWorker.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'You are not assigned to this ticket.' });
    }

    if (ticket.status !== 'in_progress') {
      return res.status(400).json({ message: 'Only in-progress tickets can be resolved.' });
    }

    ticket.status = 'resolved';
    ticket.resolvedAt = new Date();
    await ticket.save();

    const taskUpdate = {
      status: 'completed',
      completedAt: new Date()
    };
    if (req.body.actualMinutesSpent !== undefined) {
      taskUpdate.actualMinutesSpent = req.body.actualMinutesSpent;
    }
    if (req.body.notes) {
      taskUpdate.notes = req.body.notes;
    }

    await Task.findOneAndUpdate(
      { ticketId: ticket._id, workerId: req.userId },
      taskUpdate
    );

    const populated = await Ticket.findById(ticket._id)
      .populate('studentId', 'name')
      .populate('assignedWorker', 'name');

    res.json({ ticket: populated });
  } catch (err) {
    next(err);
  }
});

// Student: rate and review completed ticket
router.put('/:id/rate', auth, requireRole('student'), [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('review').optional().trim().isLength({ max: 1000 })
], validate, async (req, res, next) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (ticket.studentId.toString() !== req.userId.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    if (ticket.status !== 'resolved') {
      return res.status(400).json({ message: 'Can only rate resolved tickets.' });
    }

    if (ticket.rating !== null) {
      return res.status(400).json({ message: 'Ticket already rated.' });
    }

    const ratingValue = req.body.rating;
    ticket.rating = ratingValue;
    ticket.review = req.body.review || null;
    ticket.reviewedAt = new Date();
    await ticket.save();

    // Update worker's average rating
    if (ticket.assignedWorker) {
      const workerId = ticket.assignedWorker;
      
      // Get all ratings for this worker from resolved tickets
      const allRatings = await Ticket.find({
        assignedWorker: workerId,
        status: 'resolved',
        rating: { $ne: null }
      }).select('rating');
      
      const totalRatings = allRatings.length;
      const sumRatings = allRatings.reduce((sum, t) => sum + t.rating, 0);
      const averageRating = totalRatings > 0 ? (sumRatings / totalRatings).toFixed(1) : 0;
      
      // Update worker
      await User.findByIdAndUpdate(workerId, {
        rating: parseFloat(averageRating),
        totalRatings: totalRatings
      });
    }

    const populated = await Ticket.findById(ticket._id)
      .populate('studentId', 'name')
      .populate('assignedWorker', 'name');

    res.json({ ticket: populated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
