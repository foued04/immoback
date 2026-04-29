const express = require('express');
const { auth, authorize } = require('../middlewares/auth.middleware');
const userController = require('../controllers/user.controller');

const router = express.Router();

// All routes here are protected and admin-only
router.use(auth);
router.use(authorize('admin'));

router.get('/stats', userController.getAdminStats);
router.get('/', userController.getUsers);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
