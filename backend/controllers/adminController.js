const User = require('../models/User');
const Submission = require('../models/Submission');
const MockTest = require('../models/MockTest');
const bcrypt = require('bcryptjs');

// ── GET /api/admin/stats ────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalTests,
      totalSubmissions,
      passedSubmissions,
      failedSubmissions,
      todayRegistrations,
      allSubmissions
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      MockTest.countDocuments(),
      Submission.countDocuments(),
      Submission.countDocuments({ passed: true }),
      Submission.countDocuments({ passed: false }),
      User.countDocuments({ role: 'user', createdAt: { $gte: today } }),
      Submission.find({}, 'score').lean()
    ]);

    const avgScore = allSubmissions.length
      ? (allSubmissions.reduce((acc, s) => acc + s.score, 0) / allSubmissions.length).toFixed(1)
      : 0;

    // Active users = users who have logged in in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ role: 'user', lastLogin: { $gte: sevenDaysAgo } });

    res.json({
      totalUsers,
      totalTests,
      totalExamsTaken: totalSubmissions,
      passedUsers: passedSubmissions,
      failedUsers: failedSubmissions,
      averageScore: parseFloat(avgScore),
      todayRegistrations,
      activeUsers
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ message: 'Failed to fetch dashboard stats.' });
  }
};

// ── GET /api/admin/users ─────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const { search = '', filter = 'all', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    let query = { role: 'user' };
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (filter === 'active') query.status = 'active';
    if (filter === 'blocked') query.status = 'blocked';

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(query)
    ]);

    // Attach submission stats per user
    const userIds = users.map(u => u.username);
    const submissionStats = await Submission.aggregate([
      { $match: { username: { $in: userIds } } },
      {
        $group: {
          _id: '$username',
          total: { $sum: 1 },
          passed: { $sum: { $cond: ['$passed', 1, 0] } },
          avgScore: { $avg: '$score' }
        }
      }
    ]);

    const statsMap = {};
    submissionStats.forEach(s => {
      statsMap[s._id] = { total: s.total, passed: s.passed, avgScore: parseFloat(s.avgScore.toFixed(1)) };
    });

    const enriched = users.map(u => ({
      ...u,
      totalTests: statsMap[u.username]?.total || 0,
      passedTests: statsMap[u.username]?.passed || 0,
      avgScore: statsMap[u.username]?.avgScore || 0
    }));

    res.json({ users: enriched, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
};

// ── GET /api/admin/users/:id ─────────────────────────────────────────────────
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });

    // Fetch submission stats
    const submissions = await Submission.find({ username: user.username })
      .populate('testId', 'title')
      .sort({ createdAt: -1 })
      .lean();

    const scores = submissions.map(s => s.score);
    const stats = {
      totalTests: submissions.length,
      passed: submissions.filter(s => s.passed).length,
      failed: submissions.filter(s => !s.passed).length,
      highestScore: scores.length ? Math.max(...scores) : 0,
      lowestScore: scores.length ? Math.min(...scores) : 0,
      averageScore: scores.length ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0,
      totalTimeTaken: submissions.reduce((acc, s) => acc + (s.timeTaken || 0), 0),
      lastTestDate: submissions[0]?.createdAt || null,
      recentSubmissions: submissions.slice(0, 10).map(s => ({
        _id: s._id,
        testTitle: s.testId?.title || 'Deleted Test',
        score: s.score,
        passed: s.passed,
        timeTaken: s.timeTaken || 0,
        createdAt: s.createdAt
      }))
    };

    res.json({ user, stats });
  } catch (err) {
    console.error('Get user by id error:', err);
    res.status(500).json({ message: 'Failed to fetch user details.' });
  }
};

// ── PUT /api/admin/users/:id ─────────────────────────────────────────────────
exports.updateUser = async (req, res) => {
  try {
    const { fullName, email, phone, role, status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { fullName, email, phone, role, status },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ message: 'User updated successfully.', user });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(409).json({ message: `${field} is already in use.` });
    }
    console.error('Update user error:', err);
    res.status(500).json({ message: 'Failed to update user.' });
  }
};

// ── DELETE /api/admin/users/:id ──────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot delete admin accounts.' });

    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      Submission.deleteMany({ username: user.username })
    ]);

    res.json({ message: 'User and their submissions deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ message: 'Failed to delete user.' });
  }
};

// ── PATCH /api/admin/users/:id/block ────────────────────────────────────────
exports.toggleBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role === 'admin') return res.status(403).json({ message: 'Cannot block admin accounts.' });

    user.status = user.status === 'blocked' ? 'active' : 'blocked';
    await user.save({ validateBeforeSave: false });

    res.json({ message: `User ${user.status === 'blocked' ? 'blocked' : 'unblocked'} successfully.`, status: user.status });
  } catch (err) {
    console.error('Toggle block error:', err);
    res.status(500).json({ message: 'Failed to update user status.' });
  }
};

// ── POST /api/admin/users/:id/reset-password ────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.password = newPassword;
    await user.save();

    res.json({ message: `Password reset successfully for user: ${user.username}` });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Failed to reset password.' });
  }
};

// ── GET /api/admin/users/:id/progress ───────────────────────────────────────
exports.getUserProgress = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const submissions = await Submission.find({ username: user.username })
      .populate('testId', 'title isDynamic')
      .sort({ createdAt: -1 })
      .lean();

    const totalTests = submissions.length;
    if (totalTests === 0) {
      return res.json({ username: user.username, totalTests: 0, recentSubmissions: [], scoreTrend: [] });
    }

    const passedCount = submissions.filter(s => s.passed).length;
    const scores = submissions.map(s => s.score);

    res.json({
      username: user.username,
      totalTests,
      passed: passedCount,
      failed: totalTests - passedCount,
      passRate: parseFloat(((passedCount / totalTests) * 100).toFixed(1)),
      averageScore: parseFloat((scores.reduce((a, b) => a + b, 0) / totalTests).toFixed(1)),
      bestScore: Math.max(...scores),
      totalTimeTaken: submissions.reduce((acc, s) => acc + (s.timeTaken || 0), 0),
      scoreTrend: [...submissions].reverse().slice(-10).map(s => ({
        date: s.createdAt, score: s.score, passed: s.passed,
        testTitle: s.testId?.title || 'Deleted Test'
      })),
      recentSubmissions: submissions.slice(0, 20).map(s => ({
        _id: s._id,
        testTitle: s.testId?.title || 'Deleted Test',
        isDynamic: s.testId?.isDynamic || false,
        score: s.score, correctAnswersCount: s.correctAnswersCount,
        wrongAnswersCount: s.wrongAnswersCount, passed: s.passed,
        timeTaken: s.timeTaken || 0, createdAt: s.createdAt
      }))
    });
  } catch (err) {
    console.error('Get user progress error:', err);
    res.status(500).json({ message: 'Failed to fetch user progress.' });
  }
};
