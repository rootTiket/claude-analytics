#!/usr/bin/env node

// ── Claude CLI Analytics — CLI Entry Point (CJS) ──

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');

const PID_DIR = path.join(os.homedir(), '.claude-analytics');
const PID_FILE = path.join(PID_DIR, 'server.pid');
const LOG_FILE = path.join(PID_DIR, 'server.log');
const SERVER_SCRIPT = path.resolve(__dirname, '..', 'dist', 'server', 'index.js');

const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('-'));

// ── Help ──
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
  Claude CLI Analytics Dashboard

  Usage: claude-cli-analytics [command] [options]

  Commands:
    (default)         Start dashboard (background)
    exit, stop        Stop the running dashboard
    status            Check if dashboard is running

  Options:
    --port <number>   Server port (default: 3001)
    --path <dir>      Claude projects directory
    --foreground, -f  Run in foreground (Ctrl+C to stop)
    --help, -h        Show this help

  Examples:
    claude-cli-analytics              # background start
    claude-cli-analytics exit         # stop
    claude-cli-analytics -f           # foreground
    claude-cli-analytics --port 8080  # custom port
`);
    process.exit(0);
}

// ── Helpers ──
function readPid() {
    try {
        if (fs.existsSync(PID_FILE)) {
            return parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim(), 10);
        }
    } catch { /* */ }
    return null;
}

function isRunning(pid) {
    try { process.kill(pid, 0); return true; } catch { return false; }
}

function getPort() {
    const i = args.indexOf('--port');
    return (i !== -1 && args[i + 1]) || process.env.PORT || '3001';
}

function cleanPid() {
    try { fs.unlinkSync(PID_FILE); } catch { /* */ }
}

// ── exit / stop ──
if (command === 'exit' || command === 'stop') {
    const pid = readPid();
    if (pid && isRunning(pid)) {
        try {
            process.kill(pid, 'SIGTERM');
            cleanPid();
            console.log(`  ✅ Dashboard stopped (PID: ${pid})`);
        } catch (e) {
            console.error(`  ❌ Failed to stop PID ${pid}: ${e.message}`);
        }
    } else {
        cleanPid();
        console.log('  ⚠️  Dashboard is not running');
    }
    process.exit(0);
}

// ── status ──
if (command === 'status') {
    const pid = readPid();
    if (pid && isRunning(pid)) {
        console.log(`  🟢 Running (PID: ${pid}) → http://localhost:${getPort()}`);
    } else {
        cleanPid();
        console.log('  ⚪ Dashboard is not running');
    }
    process.exit(0);
}

// ── Start ──
try {
    const existingPid = readPid();
    if (existingPid && isRunning(existingPid)) {
        console.log(`  ⚠️  Already running (PID: ${existingPid}) → http://localhost:${getPort()}`);
        console.log(`  Run 'claude-cli-analytics exit' to stop`);
        process.exit(0);
    }

    // Parse env
    const env = { ...process.env };
    const portIdx = args.indexOf('--port');
    if (portIdx !== -1 && args[portIdx + 1]) env.PORT = args[portIdx + 1];
    const pathIdx = args.indexOf('--path');
    if (pathIdx !== -1 && args[pathIdx + 1]) env.CLAUDE_PROJECTS_DIR = args[pathIdx + 1];

    const foreground = args.includes('--foreground') || args.includes('-f');

    if (foreground) {
        // Foreground: import directly (CJS can require() the script, but default export handling might differ)
        // Since `dist/server/index.js` is ESM (due to type: module in package.json), we might need `import()`
        // However, we are in CJS now. Dynamic import works in CJS.
        Object.assign(process.env, env);
        (async () => {
            try {
                await import('../dist/server/index.js');
            } catch (e) {
                console.error('[CLI CRASH]', e);
                process.exit(1);
            }
        })();
    } else {
        // Background
        if (!fs.existsSync(PID_DIR)) fs.mkdirSync(PID_DIR, { recursive: true });

        // Use append mode for log
        const logFd = fs.openSync(LOG_FILE, 'a');
        const port = env.PORT || '3001';

        const child = spawn(process.execPath, [SERVER_SCRIPT], {
            detached: true,
            stdio: ['ignore', logFd, logFd],
            env,
        });

        const pid = child.pid;
        if (!pid) throw new Error("Failed to spawn process");

        fs.writeFileSync(PID_FILE, String(pid));
        child.unref();

        console.log(`
  🔍 Claude Analytics Dashboard
  🌐 http://localhost:${port}
  📋 PID: ${pid}

  Stop:   claude-cli-analytics exit
  Status: claude-cli-analytics status`);

        try {
            const cmd = process.platform === 'darwin' ? 'open'
                : process.platform === 'win32' ? 'start' : 'xdg-open';
            execSync(`${cmd} http://localhost:${port}`, { stdio: 'ignore' });
        } catch { /* */ }

        process.exit(0);
    }
} catch (err) {
    console.error('[CLI CRASH]', err);
    process.exit(1);
}
