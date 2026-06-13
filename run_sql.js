const { execSync } = require('child_process');
const fs = require('fs');

const sql = fs.readFileSync('insforge_schema.sql', 'utf8');
const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);

for (const stmt of statements) {
  console.log(`Executing: ${stmt.substring(0, 50)}...`);
  try {
    execSync(`npx -y @insforge/cli db query "${stmt.replace(/"/g, '\\"')}"`, { 
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--use-system-ca' }
    });
  } catch (e) {
    console.error('Failed to execute statement');
    process.exit(1);
  }
}
console.log('All statements executed successfully!');
