const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const verifySessionToken = require('../middleware/verifySessionToken');

// All match and scorecard routes require authenticated user
router.use(verifySessionToken);

router.post('/', matchController.createMatch);
router.post('/join', matchController.joinMatch);
router.post('/:id/invite', matchController.invitePlayers);
router.get('/mine', matchController.getMyMatches);
router.get('/:id', matchController.getMatchById);
router.patch('/:id/teams', matchController.updateTeams);
router.patch('/:id/toss', matchController.saveToss);
router.patch('/:id/scorecard', matchController.updateScorecard);

module.exports = router;
