const { spawn } = require('child_process');
const path = require('path');

const rootDir = __dirname;
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';
const nodeCmd = 'node';

console.log('🚀 Memulai sistem KP4 (Backend + Frontend)...');
console.log('--------------------------------------------------');

const serverProc = spawn(nodeCmd, ['server.js'], {
  cwd: serverDir,
  stdio: 'inherit',
  shell: true
});

const clientProc = spawn(npmCmd, ['run', 'dev'], {
  cwd: clientDir,
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  console.log('\n🛑 Menghentikan server KP4...');
  if (serverProc) serverProc.kill();
  if (clientProc) clientProc.kill();
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
