const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.log('.env file not found');
    process.exit(1);
}

const secrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];
let hasError = false;

secrets.forEach(key => {
    const value = process.env[key];
    if (!value) {
        console.log(`❌ ${key} is missing`);
        hasError = true;
    } else {
        // console.log(`✅ ${key} exists (length: ${value.length})`);
        if (key === 'ENCRYPTION_KEY') {
            if (value.length !== 64) {
                console.log(`❌ ${key} length is ${value.length}, required: 64`);
                hasError = true;
            } else {
                console.log(`✅ ${key} is valid length`);
            }
        } else {
            if (value.length < 64) {
                console.log(`❌ ${key} length is ${value.length}, required: >= 64`);
                hasError = true;
            } else {
                console.log(`✅ ${key} is valid length`);
            }
        }
    }
});

if (hasError) {
    process.exit(1);
}
console.log('All secrets valid');
