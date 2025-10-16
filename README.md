# DeliverHub - P2P Delivery Marketplace (SQLite Edition)

## Features

✅ **SQLite Database** - Fast, lightweight, perfect for Termux
✅ **JWT Authentication** - Secure user login/registration
✅ **P2P Bidding System** - Drivers bid on delivery orders
✅ **Order Management** - Track orders from creation to completion
✅ **Real-time Updates** - Auto-refresh every 5 seconds
✅ **Mobile-Friendly** - Optimized for Termux on Android

## Quick Start

### 1. Install Dependencies

**Backend:**
```bash
cd ~/deliverhub/backend
npm install
```

**Frontend:**
```bash
cd ~/deliverhub/frontend
npm install
```

### 2. Start Services

**Easy way (both at once):**
```bash
bash ~/deliverhub/start_all.sh
```

**Manual way:**

Terminal 1 - Backend:
```bash
cd ~/deliverhub/backend
node server.js
```

Terminal 2 - Frontend:
```bash
cd ~/deliverhub/frontend
npm start
```

### 3. Access the App

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:5000/api
- **Database:** ~/deliverhub/backend/deliverhub.db

## Database Management

### View Database
```bash
cd ~/deliverhub/backend
sqlite3 deliverhub.db
.tables
SELECT * FROM Users;
SELECT * FROM Orders;
.quit
```

### Backup Database
```bash
cp ~/deliverhub/backend/deliverhub.db ~/deliverhub/backend/deliverhub.db.backup
```

### Reset Database
```bash
rm ~/deliverhub/backend/deliverhub.db
# Will recreate on next server start
```

## Test Accounts

Create new accounts by signing up, or manually insert test data:

```bash
sqlite3 ~/deliverhub/backend/deliverhub.db
-- View existing users
SELECT id, name, email, role FROM Users;
```

## Usage Flow

1. **Customer:** Sign up → Create order
2. **Driver:** Sign up → Browse orders → Place bid
3. **Customer:** View bids → Accept best bid
4. **Driver:** Complete delivery
5. **System:** Update driver stats

## Commands

**Start:**
```bash
bash ~/deliverhub/start_all.sh
```

**Stop:**
```bash
bash ~/deliverhub/stop_all.sh
```

**View Logs:**
```bash
tail -f ~/deliverhub/logs/backend.log
tail -f ~/deliverhub/logs/frontend.log
```

**Check if Running:**
```bash
ps aux | grep -E "node|npm"
```

## File Structure

```
~/deliverhub/
├── backend/
│   ├── server.js          # Backend API (SQLite)
│   ├── deliverhub.db      # SQLite database file
│   ├── package.json
│   └── .env
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js         # Main React app
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── scripts/
│   └── update_ddns.sh     # DDNS updater (optional)
├── logs/
│   ├── backend.log
│   └── frontend.log
├── start_all.sh           # Start script
├── stop_all.sh            # Stop script
└── README.md
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Orders
- POST `/api/orders` - Create order
- GET `/api/orders` - Get all orders
- GET `/api/orders/:id` - Get single order
- POST `/api/orders/:id/bid` - Place bid
- POST `/api/orders/:id/accept-bid` - Accept bid
- POST `/api/orders/:id/complete` - Complete order
- DELETE `/api/orders/:id` - Delete order

## Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
lsof -i :5000

# Kill process if needed
kill -9 PID
```

### Frontend won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill process if needed
kill -9 PID
```

### Database errors
```bash
# Reset database
rm ~/deliverhub/backend/deliverhub.db
cd ~/deliverhub/backend
node server.js
```

### Dependencies installation failed
```bash
# Clear npm cache
npm cache clean --force

# Reinstall
cd ~/deliverhub/backend && npm install
cd ~/deliverhub/frontend && npm install
```

## DDNS Setup (Optional)

To access from the internet:

1. Go to https://www.duckdns.org
2. Get your domain and token
3. Edit `~/deliverhub/scripts/update_ddns.sh`
4. Set up port forwarding on router (ports 3000 & 5000)

## Production Deployment

For production, consider:
- Use environment-based configuration
- Enable HTTPS with SSL certificates
- Set up proper CORS restrictions
- Use PM2 or similar for process management
- Regular database backups
- Rate limiting on API endpoints

## Support

Check logs for errors:
```bash
tail -f ~/deliverhub/logs/backend.log
tail -f ~/deliverhub/logs/frontend.log
```

## License

MIT License - Feel free to use and modify!
