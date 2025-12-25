// Add this after line 3239 in server.js (after driver location endpoints)

// Switch user's primary primary_role
app.post('/api/users/me/switch-primary_role', verifyToken, async (req, res) => {
    try {
        const { newRole } = req.body;

        if (!newRole) {
            return res.status(400).json({ error: 'New primary_role is required' });
        }

        // Get user's current granted_roles
        const userResult = await pool.query(
            'SELECT id, email, name, primary_role, granted_roles FROM users WHERE id = $1',
            [req.user.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Verify user has this primary_role in granted_roles
        if (!user.granted_roles || !user.granted_roles.includes(newRole)) {
            return res.status(403).json({
                error: 'primary_role not granted',
                grantedRoles: user.granted_roles || []
            });
        }

        // Update primary_role
        await pool.query(
            'UPDATE users SET primary_role = $1 WHERE id = $2',
            [newRole, req.user.userId]
        );

        // Issue new token with updated primary_role
        const newToken = jwt.sign(
            {
                userId: req.user.userId,
                primary_role: newRole,  // Keep 'primary_role' for backward compatibility
                primary_role: newRole,
                granted_roles: user.granted_roles
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Set new cookie
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        logger.auth('primary_role switched successfully', {
            userId: req.user.userId,
            oldRole: user.primary_role,
            newRole,
            ip: req.ip || req.connection.remoteAddress,
            category: 'auth'
        });

        res.json({
            success: true,
            newRole,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                primary_role: newRole,
                granted_roles: user.granted_roles
            }
        });
    } catch (error) {
        logger.error('primary_role switch error:', {
            error: error.message,
            userId: req.user?.userId,
            requestedRole: req.body.newRole,
            category: 'error'
        });
        res.status(500).json({ error: 'Failed to switch primary_role' });
    }
});
