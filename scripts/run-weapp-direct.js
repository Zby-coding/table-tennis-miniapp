const { spawn } = require('node:child_process');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['run', 'build:weapp'];
if (process.argv.includes('--watch')) args.push('--', '--watch');
const env = { ...process.env };
for (const name of ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']) delete env[name];
env.NO_PROXY = [env.NO_PROXY, 'localhost', '127.0.0.1', '::1', '192.168.0.102'].filter(Boolean).join(',');
const child = spawn(npmCommand, args, { stdio: 'inherit', env, cwd: process.cwd(), shell: process.platform === 'win32' });
child.on('exit', (code, signal) => { process.exitCode = signal ? 1 : (code ?? 1); });

