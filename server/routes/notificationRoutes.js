const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const verifySessionToken = require('../middleware/verifySessionToken');

router.use(verifySessionToken);

router.post('/register-token', notificationController.registerToken);
router.post('/remove-token', notificationController.removeToken);
router.get('/', notificationController.getNotifications);
router.patch('/:id/read', notificationController.markRead);
router.patch('/read-all', notificationController.markAllRead);

module.exports = router;
