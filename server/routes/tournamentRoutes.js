const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const optionalAuth = require('../middleware/optionalAuth');
const verifySessionToken = require('../middleware/verifySessionToken');

// Public / User Tournament Endpoints
router.get('/available', optionalAuth, tournamentController.getAvailableTournaments);
router.get('/my', verifySessionToken, tournamentController.getMyTournaments);
router.post('/', verifySessionToken, tournamentController.createUserTournament);
router.put('/:id', verifySessionToken, tournamentController.updateTournament);
router.post('/:id/publish', verifySessionToken, tournamentController.publishTournament);
router.patch('/:id/publish', verifySessionToken, tournamentController.publishTournament);
router.post('/:id/cancel', verifySessionToken, tournamentController.cancelTournament);
router.delete('/:id', verifySessionToken, tournamentController.cancelTournament);

// Shared identifier resolution (Public)
router.get('/share/:shareIdentifier', tournamentController.getPublicTournamentByShareId);

// Individual tournament detail (Public if published, creator-only if draft)
router.get('/:id', optionalAuth, tournamentController.getTournamentById);

// Team Registration Endpoints (UserApp)
router.post('/:id/register', verifySessionToken, tournamentController.registerTeam);
router.get('/:id/my-registration', verifySessionToken, tournamentController.getMyRegistration);

module.exports = router;
