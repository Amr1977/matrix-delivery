const fs = require('fs');
const path = require('path');

function generateReport() {
  console.log('📊 Generating test report...');
  
  const jsonReport = path.join(__dirname, '../../reports/cucumber-report.json');
  
  if (!fs.existsSync(jsonReport)) {
    console.log('   ⚠️  No test results found. Run tests first.');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(jsonReport, 'utf8'));
  
  let totalScenarios = 0;
  let passedScenarios = 0;
  let failedScenarios = 0;
  let totalSteps = 0;
  let passedSteps = 0;
  let failedSteps = 0;
  
  data.forEach(feature => {
    feature.elements.forEach(scenario => {
      totalScenarios++;
      let scenarioPassed = true;
      
      scenario.steps.forEach(step => {
        totalSteps++;
        if (step.result.status === 'passed') {
          passedSteps++;
        } else if (step.result.status === 'failed') {
          failedSteps++;
          scenarioPassed = false;
        }
      });
      
      if (scenarioPassed) {
        passedScenarios++;
      } else {
        failedScenarios++;
      }
    });
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('           TEST RESULTS SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`Features:   ${data.length}`);
  console.log(`Scenarios:  ${passedScenarios}/${totalScenarios} passed`);
  console.log(`Steps:      ${passedSteps}/${totalSteps} passed`);
  
  if (failedScenarios > 0) {
    console.log(`\n❌ Failed:    ${failedScenarios} scenarios, ${failedSteps} steps`);
  } else {
    console.log('\n✅ All tests passed!');
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`📄 HTML Report: reports/cucumber-report.html`);
  console.log(`📄 JSON Report: reports/cucumber-report.json`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

if (require.main === module) {
  generateReport();
}

module.exports = generateReport;
