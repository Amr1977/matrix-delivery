const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testRevocation() {
    const email = `revoketest_${Date.now()}@example.com`;
    const password = 'Password123!';

    console.log('1. Registering user...');
    try {
        await axios.post(`${API_URL}/auth/register`, {
            name: 'Test User',
            email,
            password,
            phone: '1234567890',
            primary_role: 'customer',
            country: 'Egypt',
            city: 'Cairo',
            area: 'Maadi'
        });
    } catch (error) {
        if (error.response?.data?.error !== 'Email already registered') {
            console.error('Registration failed:', error.response?.data || error.message);
            return;
        }
    }

    console.log('2. Logging in...');
    let token;
    try {
        const loginRes = await axios.post(`${API_URL}/auth/login`, { email, password });
        // Token might be in cookie or body (dev mode usually body too or we parse cookie header)
        // The controller removes it from body for security, but puts it in cookie.
        // However, for API clients, we usually need it in response. 
        // Wait, the controller code said: "Remove token from response body for security".
        // So we MUST rely on the set-cookie header.

        const cookies = loginRes.headers['set-cookie'];
        if (!cookies) {
            console.error('No cookies received!');
            return;
        }
        const tokenCookie = cookies.find(c => c.startsWith('token='));
        if (!tokenCookie) {
            console.error('No token cookie found!');
            return;
        }

        token = tokenCookie.split(';')[0].split('=')[1];
        console.log('   Token received:', token.substring(0, 10) + '...');
    } catch (error) {
        console.error('Login failed:', error.response?.data || error.message);
        return;
    }

    const headers = { Cookie: `token=${token}` };

    console.log('3. Verifying access (Pre-Logout)...');
    try {
        await axios.get(`${API_URL}/auth/me`, { headers });
        console.log('   ✅ Access confirmed.');
    } catch (error) {
        console.error('   ❌ Access failed unexpectedly:', error.message);
        return;
    }

    console.log('4. Logging out...');
    try {
        await axios.post(`${API_URL}/auth/logout`, {}, { headers });
        console.log('   ✅ Logout successful.');
    } catch (error) {
        console.error('   ❌ Logout failed:', error.message);
        return;
    }

    console.log('5. Verifying access denied (Post-Logout)...');
    try {
        await axios.get(`${API_URL}/auth/me`, { headers });
        console.error('   ❌ FAIL: Access still granted after logout!');
    } catch (error) {
        if (error.response?.status === 401) {
            console.log('   ✅ PASS: Access denied (401) as expected.');
            console.log('   Error:', error.response.data.error);
        } else {
            console.error('   ❌ Unexpected error code:', error.response?.status);
        }
    }
}

testRevocation();
