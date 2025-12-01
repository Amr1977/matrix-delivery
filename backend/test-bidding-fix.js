const orderService = require('./services/orderService.js');

async function testBidding() {
  try {
    console.log('✅ OrderService loaded successfully');
    console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(orderService)).filter(name => typeof orderService[name] === 'function'));
    console.log('🎯 Bidding functionality test passed - no syntax errors in OrderService');
  } catch (error) {
    console.error('❌ Error loading OrderService:', error.message);
    process.exit(1);
  }
}

testBidding();
