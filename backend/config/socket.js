const pool = require('./db');
const logger = require('./logger');

const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const configureSocket = (io) => {
    // Middleware for authentication
    io.use((socket, next) => {
        try {
            const cookies = cookie.parse(socket.request.headers.cookie || '');
            const token = cookies.token;

            if (!token) {
                logger.warn('Socket connection attempt without token', { category: 'websocket' });
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.userName = decoded.name; // Assuming name is in token, or fetch from DB if critical
            socket.userRole = decoded.role || decoded.primary_role;

            logger.info('Socket authenticated', {
                socketId: socket.id,
                userId: socket.userId,
                category: 'websocket'
            });

            next();
        } catch (error) {
            logger.error('Socket authentication failed:', error);
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        // Join the user to their own room for targeted notifications
        socket.join(`user_${socket.userId}`);

        logger.info('Socket.IO client connected', {
            socketId: socket.id,
            userId: socket.userId,
            userName: socket.userName,
            transport: socket.conn.transport.name,
            room: `user_${socket.userId}`,
            category: 'websocket'
        });

        // Handle transport upgrade
        socket.conn.on('upgrade', (transport) => {
            logger.info('Socket.IO transport upgraded', {
                socketId: socket.id,
                userId: socket.userId,
                from: socket.conn.transport.name,
                to: transport.name,
                category: 'websocket'
            });
        });

        socket.on('join_order', async (data) => {
            const { orderId } = data;

            try {
                // User is already authenticated via middleware
                const orderResult = await pool.query(
                    'SELECT customer_id, assigned_driver_user_id FROM orders WHERE id = $1',
                    [orderId]
                );

                if (orderResult.rows.length === 0) {
                    socket.emit('error', { message: 'Order not found' });
                    return;
                }

                const order = orderResult.rows[0];
                if (order.customer_id !== socket.userId && order.assigned_driver_user_id !== socket.userId) {
                    socket.emit('error', { message: 'Unauthorized' });
                    return;
                }

                socket.join(`order_${orderId}`);
                logger.info('User joined order tracking', {
                    userId: socket.userId,
                    userName: socket.userName,
                    orderId,
                    category: 'websocket'
                });

                const locationResult = await pool.query(
                    'SELECT current_location_lat, current_location_lng FROM orders WHERE id = $1',
                    [orderId]
                );

                if (locationResult.rows[0].current_location_lat) {
                    socket.emit('location_update', {
                        orderId,
                        latitude: parseFloat(locationResult.rows[0].current_location_lat),
                        longitude: parseFloat(locationResult.rows[0].current_location_lng),
                        timestamp: new Date().toISOString()
                    });
                }

            } catch (error) {
                logger.error('Join order error:', error);
                socket.emit('error', { message: 'Failed to join order tracking' });
            }
        });

        socket.on('update_location', async (data) => {
            const { orderId, latitude, longitude } = data;

            try {
                // User is already authenticated via middleware
                const orderResult = await pool.query(
                    'SELECT assigned_driver_user_id, status FROM orders WHERE id = $1',
                    [orderId]
                );

                if (orderResult.rows.length === 0 || orderResult.rows[0].assigned_driver_user_id !== socket.userId) {
                    socket.emit('error', { message: 'Unauthorized' });
                    return;
                }

                await pool.query(
                    'UPDATE orders SET current_location_lat = $1, current_location_lng = $2 WHERE id = $3',
                    [parseFloat(latitude), parseFloat(longitude), orderId]
                );

                await pool.query(
                    'INSERT INTO location_updates (order_id, driver_id, latitude, longitude, status) VALUES ($1, $2, $3, $4, $5)',
                    [orderId, socket.userId, parseFloat(latitude), parseFloat(longitude), orderResult.rows[0].status]
                );

                io.to(`order_${orderId}`).emit('location_update', {
                    orderId,
                    latitude: parseFloat(latitude),
                    longitude: parseFloat(longitude),
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                logger.error('Update location error:', error);
                socket.emit('error', { message: 'Failed to update location' });
            }
        });

        // Typing indicator events
        socket.on('typing', (data) => {
            const { orderId, userId } = data;
            if (orderId && userId) {
                socket.to(`order_${orderId}`).emit('user_typing', {
                    orderId,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });

        socket.on('stopped_typing', (data) => {
            const { orderId, userId } = data;
            if (orderId && userId) {
                socket.to(`order_${orderId}`).emit('user_stopped_typing', {
                    orderId,
                    userId,
                    timestamp: new Date().toISOString()
                });
            }
        });

        socket.on('leave_order', (orderId) => {
            socket.leave(`order_${orderId}`);
        });

        socket.on('disconnect', (reason) => {
            logger.info('Socket.IO client disconnected', {
                socketId: socket.id,
                userId: socket.userId,
                userName: socket.userName,
                reason,
                category: 'websocket'
            });
        });
    });
};

module.exports = configureSocket;
