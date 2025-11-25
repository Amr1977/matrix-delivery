// Test OSRM route calculation
const testOSRM = async () => {
    const pickup = { lat: 30.0444, lng: 31.2357 }; // Cairo Downtown
    const delivery = { lat: 30.1219, lng: 31.4056 }; // Cairo Airport

    const API_URL = 'http://localhost:5000/api';

    try {
        console.log('Testing OSRM route calculation...');
        console.log('Pickup:', pickup);
        console.log('Delivery:', delivery);

        const response = await fetch(`${API_URL}/locations/calculate-route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pickup, delivery })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        console.log('✅ OSRM Response:', data);
        console.log('Distance:', data.distance_km, 'km');
        console.log('Has polyline:', !!data.polyline);
        console.log('Route found:', data.route_found);
        console.log('Polyline length:', data.polyline?.length || 0, 'characters');

        if (data.polyline) {
            console.log('Polyline preview:', data.polyline.substring(0, 50) + '...');
        }

        return data;
    } catch (error) {
        console.error('❌ OSRM Test Failed:', error);
        throw error;
    }
};

// Run the test
testOSRM();
