const express = require('express');
const Ticket = require('../models/Ticket');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// Get student's own tickets with pagination (student or admin)
router.get('/my-tickets', auth, async (req, res, next) => {
  try {
    // Allow admin to view any student's tickets via query param
    const targetStudentId = req.query.studentId && req.role === 'admin' ? req.query.studentId : req.userId;
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const filter = { studentId: targetStudentId };
    if (status) filter.status = status;

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
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    next(err);
  }
});

// Get student dashboard stats (student or admin)
router.get('/stats', auth, async (req, res, next) => {
  try {
    // Allow admin to view any student's stats via query param
    const targetStudentId = req.query.studentId && req.role === 'admin' ? req.query.studentId : req.userId;
    
    const [total, open, assigned, inProgress, resolved, rejected] = await Promise.all([
      Ticket.countDocuments({ studentId: targetStudentId }),
      Ticket.countDocuments({ studentId: targetStudentId, status: 'open' }),
      Ticket.countDocuments({ studentId: targetStudentId, status: 'assigned' }),
      Ticket.countDocuments({ studentId: targetStudentId, status: 'in_progress' }),
      Ticket.countDocuments({ studentId: targetStudentId, status: 'resolved' }),
      Ticket.countDocuments({ studentId: targetStudentId, status: 'rejected' })
    ]);

    res.json({ total, open, assigned, inProgress, resolved, rejected });
  } catch (err) {
    next(err);
  }
});

// Admin: get dashboard statistics
router.get('/dashboard', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const [
      totalTickets,
      openTickets,
      assignedTickets,
      inProgressTickets,
      resolvedTickets,
      rejectedTickets,
      totalWorkers,
      totalStudents
    ] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'assigned' }),
      Ticket.countDocuments({ status: 'in_progress' }),
      Ticket.countDocuments({ status: 'resolved' }),
      Ticket.countDocuments({ status: 'rejected' }),
      require('../models/User').countDocuments({ role: 'worker' }),
      require('../models/User').countDocuments({ role: 'student' })
    ]);

    res.json({
      tickets: {
        total: totalTickets,
        open: openTickets,
        assigned: assignedTickets,
        inProgress: inProgressTickets,
        resolved: resolvedTickets,
        rejected: rejectedTickets
      },
      users: {
        workers: totalWorkers,
        students: totalStudents
      }
    });
  } catch (err) {
    next(err);
  }
});

// Admin: get recent tickets
router.get('/recent', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const tickets = await Ticket.find()
      .populate('studentId', 'name')
      .populate('assignedWorker', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ tickets });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
