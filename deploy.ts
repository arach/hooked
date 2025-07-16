#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Paths
const hooksDir = join(homedir(), '.claude', 'hooks');
const settingsFile = join(homedir(), '.claude', 'settings.json');
const sourceFiles = ['notification.ts', 'package.json', 'package-lock.json'];

console.log('🚀 Deploying hooked notification system...');

// Create hooks directory if it doesn't exist
if (!existsSync(hooksDir)) {
  mkdirSync(hooksDir, { recursive: true });
  console.log('📁 Created ~/.claude/hooks/ directory');
}

// Copy TypeScript files and dependencies
sourceFiles.forEach(file => {
  const sourcePath = join(__dirname, 'hooks', file);
  const targetPath = join(hooksDir, file);
  
  if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, targetPath);
    console.log(`📄 Copied ${file} to ~/.claude/hooks/`);
  } else {
    console.warn(`⚠️  Warning: ${file} not found in hooks directory`);
  }
});

// Install dependencies in the hooks directory
console.log('📦 Installing dependencies...');
try {
  execSync('npm install', { cwd: hooksDir, stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  console.error('❌ Failed to install dependencies:', error.message);
  process.exit(1);
}

// Update settings.json
console.log('⚙️  Updating Claude settings...');

let settings: any = {};
if (existsSync(settingsFile)) {
  try {
    const settingsContent = readFileSync(settingsFile, 'utf8');
    settings = JSON.parse(settingsContent);
    console.log('📖 Read existing settings.json');
  } catch (error) {
    console.warn('⚠️  Warning: Could not parse existing settings.json, creating new one');
  }
}

// Ensure hooks object exists
if (!settings.hooks) {
  settings.hooks = {};
}

// Add or update the Notification hook
settings.hooks.Notification = [
  {
    "matcher": "",
    "hooks": [
      {
        "type": "command",
        "command": `npx tsx ${join(hooksDir, 'notification.ts')}`
      }
    ]
  }
];

// Write updated settings
try {
  writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  console.log('✅ Updated settings.json with notification hook');
} catch (error) {
  console.error('❌ Failed to update settings.json:', error.message);
  process.exit(1);
}

console.log('🎉 Deployment complete!');
console.log('');
console.log('📋 Summary:');
console.log(`   • Files copied to: ${hooksDir}`);
console.log(`   • Settings updated: ${settingsFile}`);
console.log(`   • Hook command: npx tsx ${join(hooksDir, 'notification.ts')}`);
console.log('');
console.log('🧪 Test the deployment:');
console.log(`   echo '{"message": "Test notification", "transcript_path": "/test/path"}' | npx tsx ${join(hooksDir, 'notification.ts')} test`);