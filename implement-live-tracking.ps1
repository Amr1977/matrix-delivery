# PowerShell Script to Implement Live Order Tracking on Map
# Run this script in your project root directory

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Live Order Tracking Implementation" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "backend") -or -not (Test-Path "frontend")) {
    Write-Host "Error: backend and frontend directories not found. Please run this script from project root." -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] Installing backend dependencies..." -ForegroundColor Yellow
Push-Location backend
npm install socket.io --save
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install backend dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "Backend dependencies installed successfully" -ForegroundColor Green
Write-Host ""

Write-Host "[2/5] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location frontend
npm install socket.io-client --save
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to install frontend dependencies" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location
Write-Host "Frontend dependencies installed successfully" -ForegroundColor Green
Write-Host ""

Write-Host "[3/5] Creating WebSocket server integration..." -ForegroundColor Yellow

# Backup server.js
Copy-Item "backend/server.js" "backend/server.js.backup" -Force
Write-Host "Created backup: backend/server.js.backup" -ForegroundColor Gray

# Read server.js
$serverContent = Get-Content "backend/server.js" -Raw

# Check if WebSocket is already integrated
if ($serverContent.Contains("socket.io")) {
    Write-Host "WebSocket already integrated, skipping..." -ForegroundColor Yellow
} else {
    # Add WebSocket imports
    $serverContent = $serverContent.Replace(
        "const { getDistance } = require('geolib');",
        "const { getDistance } = require('geolib');`nconst http = require('http');`nconst socketIo = require('socket.io');"
    )

    # Replace server initialization
    $oldServerInit = "const PORT = process.env.PORT || 5000;`nconst server = app.listen(PORT, '0.0.0.0'"
    
    $newServerInit = @'
// ============ WEBSOCKET INTEGRATION FOR LIVE TRACKING ============
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Connected client:', socket.id);

  socket.on('join_order', async (data) => {
    const { orderId, token } = data;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const orderResult = await pool.query(
        'SELECT customer_id, assigned_driver_user_id FROM orders WHERE id = $1',
        [orderId]
      );
      
      if (orderResult.rows.length === 0) {
        socket.emit('error', { message: 'Order not found' });
        return;
      }
      
      const order = orderResult.rows[0];
      if (order.customer_id !== decoded.userId && order.assigned_driver_user_id !== decoded.userId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }
      
      socket.join(`order_${orderId}`);
      console.log(`User ${decoded.name} joined tracking for order ${orderId}`);
      
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
      console.error('Join order error:', error);
      socket.emit('error', { message: 'Failed to join order tracking' });
    }
  });

  socket.on('update_location', async (data) => {
    const { orderId, latitude, longitude, token } = data;
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const orderResult = await pool.query(
        'SELECT assigned_driver_user_id, status FROM orders WHERE id = $1',
        [orderId]
      );
      
      if (orderResult.rows.length === 0 || orderResult.rows[0].assigned_driver_user_id !== decoded.userId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }
      
      await pool.query(
        'UPDATE orders SET current_location_lat = $1, current_location_lng = $2 WHERE id = $3',
        [parseFloat(latitude), parseFloat(longitude), orderId]
      );
      
      await pool.query(
        'INSERT INTO location_updates (order_id, driver_id, latitude, longitude, status) VALUES ($1, $2, $3, $4, $5)',
        [orderId, decoded.userId, parseFloat(latitude), parseFloat(longitude), orderResult.rows[0].status]
      );
      
      io.to(`order_${orderId}`).emit('location_update', {
        orderId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Update location error:', error);
    }
  });

  socket.on('leave_order', (orderId) => {
    socket.leave(`order_${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected client:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
const server = httpServer.listen(PORT, '0.0.0.0'
'@
    
    $serverContent = $serverContent.Replace($oldServerInit, $newServerInit)
    
    # Save modified server.js
    $serverContent | Set-Content "backend/server.js" -NoNewline
    Write-Host "WebSocket server integration added" -ForegroundColor Green
}
Write-Host ""

Write-Host "[4/5] Adding live tracking to App.js..." -ForegroundColor Yellow

# Restore from backup if corruption detected
if (Test-Path "frontend/src/App.js.backup") {
    $checkContent = Get-Content "frontend/src/App.js" -Raw
    if ($checkContent.Contains("\[") -or $checkContent.Contains("\]") -or $checkContent.Contains("\(") -or $checkContent.Contains("\)")) {
        Write-Host "Detected corrupted file, restoring from backup..." -ForegroundColor Yellow
        Copy-Item "frontend/src/App.js.backup" "frontend/src/App.js" -Force
    }
}

# Backup App.js
Copy-Item "frontend/src/App.js" "frontend/src/App.js.backup" -Force
Write-Host "Created backup: frontend/src/App.js.backup" -ForegroundColor Gray

# Read App.js
$appContent = Get-Content "frontend/src/App.js" -Raw

# Check if already integrated
if ($appContent.Contains("LiveTrackingMap")) {
    Write-Host "Live tracking already exists, skipping..." -ForegroundColor Yellow
} else {
    # Add imports
    $appContent = $appContent.Replace(
        "import ReCAPTCHA from 'react-google-recaptcha';",
        "import ReCAPTCHA from 'react-google-recaptcha';`nimport { Polyline } from 'react-leaflet';`nimport io from 'socket.io-client';"
    )

    # Add LiveTrackingMap component
    $componentToAdd = @'

  // Live Tracking Map Component
  const LiveTrackingMap = React.memo(({ order, token }) => {
    const [driverLocation, setDriverLocation] = React.useState(null);
    const [locationHistory, setLocationHistory] = React.useState([]);
    const [isConnected, setIsConnected] = React.useState(false);
    const socketRef = React.useRef(null);
    const mapRef = React.useRef(null);

    React.useEffect(() => {
      const apiUrl = API_URL.replace('/api', '');
      const socket = io(apiUrl);
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        socket.emit('join_order', { orderId: order._id, token: token });
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('location_update', (data) => {
        const newLocation = { lat: data.latitude, lng: data.longitude, timestamp: data.timestamp };
        setDriverLocation(newLocation);
        setLocationHistory(prev => [...prev, newLocation]);
        if (mapRef.current && mapRef.current.setView) {
          mapRef.current.setView([data.latitude, data.longitude], 15);
        }
      });

      let locationInterval;
      if (currentUser?.role === 'driver' && order.assignedDriver?.userId === currentUser.id) {
        locationInterval = setInterval(() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                socket.emit('update_location', {
                  orderId: order._id,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  token: token
                });
              }
            );
          }
        }, 30000);
      }

      return () => {
        socket.emit('leave_order', order._id);
        socket.disconnect();
        if (locationInterval) clearInterval(locationInterval);
      };
    }, [order._id, token]);

    const MapUpdater = () => {
      const map = useMap();
      React.useEffect(() => { mapRef.current = map; }, [map]);
      return null;
    };

    return (
      <div style={{ height: '500px', width: '100%', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{ background: isConnected ? '#10B981' : '#EF4444', color: 'white', padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>
          {isConnected ? 'Live Tracking Active' : 'Connecting...'}
        </div>
        <MapContainer center={driverLocation ? [driverLocation.lat, driverLocation.lng] : [order.from.lat, order.from.lng]} zoom={13} style={{ height: 'calc(100% - 40px)', width: '100%' }}>
          <MapUpdater />
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[order.from.lat, order.from.lng]} icon={L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', iconSize: [25, 41], iconAnchor: [12, 41] })}><Popup><strong>Pickup</strong></Popup></Marker>
          <Marker position={[order.to.lat, order.to.lng]} icon={L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', iconSize: [25, 41], iconAnchor: [12, 41] })}><Popup><strong>Delivery</strong></Popup></Marker>
          {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', iconSize: [25, 41], iconAnchor: [12, 41] })}><Popup><strong>Driver</strong></Popup></Marker>}
          {locationHistory.length > 1 && <Polyline positions={locationHistory.map(loc => [loc.lat, loc.lng])} color="#4F46E5" weight={3} opacity={0.7} />}
        </MapContainer>
      </div>
    );
  });

'@

    $insertMarker = "  // State variables"
    $insertIndex = $appContent.IndexOf($insertMarker)
    if ($insertIndex -gt 0) {
        $appContent = $appContent.Insert($insertIndex, $componentToAdd)
    }

    # Add state
    $appContent = $appContent.Replace(
        "  const [showReviewsModal, setShowReviewsModal] = useState(false);",
        "  const [showReviewsModal, setShowReviewsModal] = useState(false);`n  const [showLiveTracking, setShowLiveTracking] = useState(false);"
    )

    # Add modal
    $modalToAdd = @'

        {showLiveTracking && selectedOrder && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '64rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Live Tracking - {selectedOrder.orderNumber}</h2>
                <button onClick={() => setShowLiveTracking(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <LiveTrackingMap order={selectedOrder} token={token} />
                <button onClick={() => setShowLiveTracking(false)} style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: '#F3F4F6', color: '#374151', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}>Close</button>
              </div>
            </div>
          </div>
        )}

      <footer style={{
'@

    $appContent = $appContent.Replace("      <footer style={{", $modalToAdd)

    # Update track button
    $appContent = $appContent.Replace(
        "onClick={() => fetchOrderTracking(order._id)}",
        "onClick={() => { setSelectedOrder(order); setShowLiveTracking(true); }}"
    )

    # Save
    $appContent | Set-Content "frontend/src/App.js" -NoNewline
    Write-Host "Live tracking added to App.js" -ForegroundColor Green
}
Write-Host ""

Write-Host "[5/5] Creating start script..." -ForegroundColor Yellow

$startScript = @'
Write-Host "Starting Matrix Delivery..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm start"
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"
Write-Host "Servers starting..." -ForegroundColor Green
'@

$startScript | Set-Content "start-with-tracking.ps1"
Write-Host "Created start-with-tracking.ps1" -ForegroundColor Green
Write-Host ""

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run: .\start-with-tracking.ps1" -ForegroundColor Yellow
Write-Host ""