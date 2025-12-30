/**
 * Test Balance Transactions API
 * Quick test to verify the transaction history endpoint works correctly
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api/v1';

async function testTransactionHistory() {
    console.log('🧪 Testing Balance Transactions API\n');

    try {
        // You'll need a valid user ID and auth token
        // This is just the structure - update with real values when testing
        const userId = '1767110262918csoa98bd0'; // from your 404 request
        const token = 'your_jwt_token_here'; // You need to provide this

        console.log(`📍 Testing: GET ${BASE_URL}/balance/${userId}/transactions`);

        // Test 1: Basic request with limit
        console.log('\n1️⃣ Test basic request with limit=5');
        const response1 = await axios.get(
            `${BASE_URL}/balance/${userId}/transactions`,
            {
                params: { limit: 5 },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cookie': `token=${token}`
                }
            }
        );
        console.log('✅ Response:', JSON.stringify(response1.data, null, 2));

        // Test 2: With pagination
        console.log('\n2️⃣  Test pagination (offset=5, limit=10)');
        const response2 = await axios.get(
            `${BASE_URL}/balance/${userId}/transactions`,
            {
                params: { limit: 10, offset: 5 },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cookie': `token=${token}`
                }
            }
        );
        console.log('✅ Pagination:', response2.data.data.pagination);

        // Test 3: Filter by type
        console.log('\n3️⃣ Test filter by type=earnings');
        const response3 = await axios.get(
            `${BASE_URL}/balance/${userId}/transactions`,
            {
                params: { type: 'earnings', limit: 5 },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cookie': `token=${token}`
                }
            }
        );
        console.log('✅ Filtered transactions:', response3.data.data.transactions.length);

        // Test 4: Date range filter
        console.log('\n4️⃣ Test date range filter');
        const startDate = new Date('2025-12-01').toISOString();
        const endDate = new Date().toISOString();
        const response4 = await axios.get(
            `${BASE_URL}/balance/${userId}/transactions`,
            {
                params: { startDate, endDate, limit: 5 },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cookie': `token=${token}`
                }
            }
        );
        console.log('✅ Transactions in date range:', response4.data.data.transactions.length);

        // Test 5: Sorting
        console.log('\n5️⃣ Test sorting by amount DESC');
        const response5 = await axios.get(
            `${BASE_URL}/balance/${userId}/transactions`,
            {
                params: { sortBy: 'amount', sortOrder: 'DESC', limit: 5 },
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cookie': `token=${token}`
                }
            }
        );
        console.log('✅ Sorted by amount:', response5.data.data.transactions.map(t => t.amount));

        console.log('\n✅ All tests passed!');
    } catch (error) {
        console.error('\n❌ Test failed:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

// Run if called directly
if (require.main === module) {
    testTransactionHistory();
}

module.exports = { testTransactionHistory };
