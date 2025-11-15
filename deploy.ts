#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Paths
const hooksDir = join(homedir(), '.claude', 'hooks');
const settingsFile = join(homedir(), '.claude', 'settings.json');
const sourceDir = join(__dirname, 'src');
const sourceFiles = ['notification.ts'];

console.log('🚀 Deploying hooked notification system...');

// Create hooks directory if it doesn't exist
if (!existsSync(hooksDir)) {
  mkdirSync(hooksDir, { recursive: true });
  console.log('📁 Created ~/.claude/hooks/ directory');
}

// Copy notification handler to hooks directory
sourceFiles.forEach(file => {
  const sourcePath = join(sourceDir, file);
  const targetPath = join(hooksDir, file);

  if (existsSync(sourcePath)) {
    copyFileSync(sourcePath, targetPath);
    console.log(`📄 Copied ${file} to ~/.claude/hooks/`);
  } else {
    console.warn(`⚠️  Warning: ${file} not found in src directory`);
  }
});

// Copy package.json and install dependencies in hooks directory
const rootPackageJson = join(__dirname, 'package.json');
const targetPackageJson = join(hooksDir, 'package.json');
if (existsSync(rootPackageJson)) {
  copyFileSync(rootPackageJson, targetPackageJson);
  console.log('📄 Copied package.json to ~/.claude/hooks/');
}

// Install dependencies in the hooks directory
console.log('📦 Installing dependencies...');
try {
  execSync('bun install', { cwd: hooksDir, stdio: 'inherit' });
  console.log('✅ Dependencies installed successfully');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('❌ Failed to install dependencies:', errorMessage);
  process.exit(1);
}

// Update settings.json safely
console.log('⚙️  Updating Claude settings...');

interface HookConfig {
  matcher: string;
  hooks: Array<{
    type: string;
    command: string;
  }>;
}

interface Settings {
  hooks?: {
    [key: string]: HookConfig[];
  };
  [key: string]: unknown;
}

let settings: Settings = {};
if (existsSync(settingsFile)) {
  try {
    const settingsContent = readFileSync(settingsFile, 'utf8');
    settings = JSON.parse(settingsContent) as Settings;
    console.log('📖 Read existing settings.json');
  } catch (error) {
    console.warn('⚠️  Warning: Could not parse existing settings.json, creating new one');
    settings = {};
  }
}

// Ensure hooks object exists
if (!settings.hooks) {
  settings.hooks = {};
}

// Create our hook configuration with logging enabled
const hookCommand = `HOOKED_LOG_FILE=true bun ${join(hooksDir, 'notification.ts')}`;
const hookConfig: HookConfig[] = [
  {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: hookCommand
      }
    ]
  }
];

// Update Notification hook
if (settings.hooks.Notification) {
  console.log('⚠️  Notification hook already exists. Checking if update is needed...');

  const existingConfig = JSON.stringify(settings.hooks.Notification);
  const newConfig = JSON.stringify(hookConfig);

  if (existingConfig === newConfig) {
    console.log('✅ Notification hook is already up to date');
  } else {
    console.log('🔄 Updating existing Notification hook configuration');
    settings.hooks.Notification = hookConfig;
  }
} else {
  console.log('➕ Adding new Notification hook');
  settings.hooks.Notification = hookConfig;
}

// Update Stop hook
if (settings.hooks.Stop) {
  console.log('⚠️  Stop hook already exists. Checking if update is needed...');

  const existingConfig = JSON.stringify(settings.hooks.Stop);
  const newConfig = JSON.stringify(hookConfig);

  if (existingConfig === newConfig) {
    console.log('✅ Stop hook is already up to date');
  } else {
    console.log('🔄 Updating existing Stop hook configuration');
    settings.hooks.Stop = hookConfig;
  }
} else {
  console.log('➕ Adding new Stop hook');
  settings.hooks.Stop = hookConfig;
}

// Write updated settings
try {
  writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
  console.log('✅ Settings.json updated successfully');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('❌ Failed to update settings.json:', errorMessage);
  process.exit(1);
}

console.log('🎉 Deployment complete!');
console.log('');
console.log('📋 Summary:');
console.log(`   • Files copied to: ${hooksDir}`);
console.log(`   • Settings safely updated: ${settingsFile}`);
console.log(`   • Hook command: ${hookCommand}`);
console.log(`   • Logging enabled: Console + File (~/logs/claude-hooks/notification.log)`);
console.log(`   • Existing hooks and settings preserved`);
console.log('');
console.log('🧪 Test the deployment:');
console.log(`   echo '{"message": "Test notification", "transcript_path": "/test/path"}' | ${hookCommand} test`);
console.log('');
console.log('💡 Run the local test suite:');
console.log('   bun test');