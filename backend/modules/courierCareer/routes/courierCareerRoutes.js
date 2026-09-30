const express = require('express');
const router = express.Router();
const { verifyToken, requireRole } = require('../../../middleware/auth');
const courierCareerController = require('../controllers/courierCareerController');

/**
 * Public courier profile - accessible by anyone if profile is public
 * Owners and admins can always access
 */
router.get('/:id/profile', verifyToken, courierCareerController.getPublicProfile);

/**
 * Career history - accessible by anyone if profile is public
 * Owners and admins can always access
 */
router.get('/:id/career-history', verifyToken, courierCareerController.getCareerHistory);

/**
 * Update own profile visibility
 */
router.patch('/me/profile-visibility', verifyToken, courierCareerController.updateProfileVisibility);

/**
 * Team routes
 */

// Create a team (become team leader)
router.post('/teams', verifyToken, requireRole('driver'), courierCareerController.createTeam);

// Get current user's team
router.get('/me/team', verifyToken, courierCareerController.getMyTeam);

// Get team by ID with stats
router.get('/teams/:id', verifyToken, courierCareerController.getTeam);

// Add member to team (team leader only)
router.post('/teams/:id/members', verifyToken, requireRole('driver'), courierCareerController.addTeamMember);

// Remove member from team (team leader or member themselves)
router.delete('/teams/:id/members/:courierUserId', verifyToken, courierCareerController.removeTeamMember);

/**
 * Public courier directory - only shows couriers with public profiles
 */
router.get('/directory', courierCareerController.getDirectory);

/**
 * Admin: manually trigger tier recalculation
 */
router.post('/recalculate-tier', verifyToken, requireRole('admin'), courierCareerController.recalculateTier);

module.exports = router;