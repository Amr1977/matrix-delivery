const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    demandFile: path.join(__dirname, '../data/training_demand.csv'),
    interactionsFile: path.join(__dirname, '../data/training_interactions.csv'),
    startDate: new Date(), // Will subtract 1 year from this
    zones: ['ZONE_DOWNTOWN', 'ZONE_SUBURBS', 'ZONE_AIRPORT'],
    drivers: 50,
    totalRecords: 1000 // Just a base number for scaling
};

// Set start date to 1 year ago
CONFIG.startDate.setFullYear(CONFIG.startDate.getFullYear() - 1);

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- 1. Generate Demand Data (Amazon Forecast) ---
// Schema: timestamp, item_id, target_value
function generateDemandData() {
    console.log('Generating Demand Data...');
    let csvContent = 'timestamp,item_id,target_value\n';
    let currentDate = new Date(CONFIG.startDate);
    const endDate = new Date();

    while (currentDate <= endDate) {
        const hour = currentDate.getHours();
        const day = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
        const isWeekend = (day === 0 || day === 6);

        CONFIG.zones.forEach(zone => {
            let baseDemand = 10;

            // Demand Logic
            if (zone === 'ZONE_DOWNTOWN') {
                if (!isWeekend && (hour >= 11 && hour <= 13)) baseDemand += 50; // Lunch rush
            } else if (zone === 'ZONE_SUBURBS') {
                if ((hour >= 18 && hour <= 21)) baseDemand += 40; // Dinner rush
            } else if (zone === 'ZONE_AIRPORT') {
                // Random flight arrivals
                if (Math.random() > 0.8) baseDemand += 100;
            }

            // Add Random Noise
            const demand = Math.max(0, baseDemand + getRandomInt(-5, 15));

            // Format Timestamp: YYYY-MM-DD HH:MM:SS
            const timestampStr = currentDate.toISOString().replace('T', ' ').substring(0, 19);

            csvContent += `${timestampStr},${zone},${demand}\n`;
        });

        // Increment by 1 hour
        currentDate.setHours(currentDate.getHours() + 1);
    }

    fs.writeFileSync(CONFIG.demandFile, csvContent);
    console.log(`Saved ${CONFIG.demandFile}`);
}

// --- 2. Generate Interaction Data (Amazon Personalize) ---
// Schema: USER_ID, ITEM_ID, TIMESTAMP, EVENT_TYPE
function generateInteractionData() {
    console.log('Generating Interaction Data...');
    let csvContent = 'USER_ID,ITEM_ID,TIMESTAMP,EVENT_TYPE\n';

    // Create Driver Profiles
    const drivers = [];
    for (let i = 1; i <= CONFIG.drivers; i++) {
        drivers.push({
            id: `DRIVER_${i}`,
            type: i <= 10 ? 'PREMIUM' : 'STANDARD', // Top 10 are super reliable
            vehicle: i % 2 === 0 ? 'CAR' : 'BIKE'
        });
    }

    // Simulate 1000 orders
    for (let i = 0; i < 5000; i++) {
        // Random time in the last year
        const timestamp = new Date(CONFIG.startDate.getTime() + Math.random() * (new Date().getTime() - CONFIG.startDate.getTime()));
        const unixTimestamp = Math.floor(timestamp.getTime() / 1000); // Unix epoch

        // Pick a random order/zone
        const zone = CONFIG.zones[getRandomInt(0, CONFIG.zones.length - 1)];
        const orderId = `ORDER_${zone}_${i}`;

        // Pick a random driver
        const driver = drivers[getRandomInt(0, drivers.length - 1)];

        // Acceptance Logic
        let accepted = false;
        if (driver.type === 'PREMIUM') {
            accepted = Math.random() > 0.1; // 90% acceptance
        } else {
            // Standard drivers hate long distance (represented by Airport)
            if (zone === 'ZONE_AIRPORT' && driver.vehicle === 'BIKE') {
                accepted = Math.random() > 0.9; // 10% acceptance
            } else {
                accepted = Math.random() > 0.6; // 60% acceptance
            }
        }

        if (accepted) {
            csvContent += `${driver.id},${zone},${unixTimestamp},ORDER_ACCEPTED\n`;
            // Add delivery event 30 mins later
            csvContent += `${driver.id},${zone},${unixTimestamp + 1800},ORDER_DELIVERED\n`;
        } else {
            csvContent += `${driver.id},${zone},${unixTimestamp},ORDER_DECLINED\n`;
        }
    }

    fs.writeFileSync(CONFIG.interactionsFile, csvContent);
    console.log(`Saved ${CONFIG.interactionsFile}`);
}

// Run
try {
    generateDemandData();
    generateInteractionData();
    console.log('✅ Synthetic Data Generation Complete!');
} catch (error) {
    console.error('Error generating data:', error);
}
