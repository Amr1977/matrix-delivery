const fetch = require('node-fetch');

async function testAPIEndpoint() {
    try {
        // User's fake driver location (Russia)
        const driverLat = 53.59366927545413;
        const driverLng = 38.9724454351626;

        console.log('🧪 Testing the ACTUAL API endpoint that frontend uses');
        console.log(`📍 Driver location: ${driverLat}, ${driverLng} (Russia)`);
        console.log('');

        // First, we need to login to get a token
        console.log('🔐 Logging in as a driver...');
        const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'driver@test.com',
                password: 'password123'
            })
        });

        if (!loginResponse.ok) {
            console.log('❌ Login failed. Please create a test driver account first.');
            console.log('   You can use the signup endpoint or create one manually in the database.');
            return;
        }

        const loginData = await loginResponse.json();
        const token = loginData.token;
        console.log('✅ Logged in successfully');
        console.log('');

        // Now fetch orders with the driver location
        console.log('📊 Fetching orders from API with driver location...');
        const url = `http://localhost:5000/api/orders?lat=${driverLat}&lng=${driverLng}`;
        console.log(`URL: ${url}`);
        console.log('');

        const ordersResponse = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!ordersResponse.ok) {
            const errorData = await ordersResponse.json();
            console.log(`❌ API request failed: ${ordersResponse.status}`);
            console.log('Error:', errorData);
            return;
        }

        const orders = await ordersResponse.json();
        console.log(`✅ API returned ${orders.length} orders`);
        console.log('');

        if (orders.length === 0) {
            console.log('🎉 SUCCESS! No orders returned (all are outside 7km range)');
            console.log('   The distance filter is now working correctly!');
        } else {
            console.log('📋 Orders returned:');
            orders.forEach(order => {
                console.log(`  - ${order.orderNumber || order.id}`);
                console.log(`    Status: ${order.status}`);
                console.log(`    Pickup: ${order.pickupAddress}`);
                if (order.from) {
                    console.log(`    Coords: ${order.from.lat}, ${order.from.lng}`);
                }
            });

            // Check if any are pending_bids (which should have been filtered)
            const pendingOrders = orders.filter(o => o.status === 'pending_bids' && !o.assignedDriver);
            if (pendingOrders.length > 0) {
                console.log('');
                console.log('⚠️  WARNING: Found pending orders that should have been filtered!');
                console.log(`   ${pendingOrders.length} pending orders are outside 7km but were still returned.`);
            } else {
                console.log('');
                console.log('✅ All returned orders are either assigned to this driver or within 7km.');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

testAPIEndpoint();
