#!/usr/bin/env node

import { execSync } from 'child_process';

// Test notification payload based on recent logs
const testPayload = {
  message: "Claude needs your permission to use Bash",
  transcript_path: "/Users/arach/.claude/projects/-Users-arach-dev-blink/b338187f-4add-4333-a9ad-813db854f72f.jsonl"
};

// Simulate the notification flow
console.log('🧪 Testing notification system...');
console.log('📤 Sending test payload:', JSON.stringify(testPayload, null, 2));

// Execute the notification script with test data
try {
  const result = execSync(`echo '${JSON.stringify(testPayload)}' | pnpx tsx notification.ts test-notification`, {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log('✅ Test completed successfully!');
  console.log('📋 Output:', result);
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  if (error.stdout) {
    console.log('📤 stdout:', error.stdout);
  }
  if (error.stderr) {
    console.log('📤 stderr:', error.stderr);
  }
}

console.log('\n📊 Check the logs at ~/logs/claude-hooks/notification.log'); 