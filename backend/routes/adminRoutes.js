const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// All admin routes require authentication + admin role
router.use(authenticateToken, requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUserById);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.patch('/users/:id/block', adminController.toggleBlock);
router.post('/users/:id/reset-password', adminController.resetPassword);
router.get('/users/:id/progress', adminController.getUserProgress);

module.exports = router;
