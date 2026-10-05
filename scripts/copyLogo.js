const { execSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'generateAllIcons.py');
console.log('Running icon generator...');
try {
  execSync(`python "${scriptPath}"`, { stdio: 'inherit' });
  console.log('Icons generated successfully.');
} catch (err) {
  console.error('Error generating icons:', err.message);
  process.exit(1);
}
