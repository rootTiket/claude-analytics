#!/usr/bin/env node

// ── Claude Analytics CLI ──
// Supports: --port <number>, --path <dir>, --help

const args = process.argv.slice(2);

// Handle --help
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
  Claude Analytics Dashboard
  
  Usage: claude-cli-analytics [options]

  Options:
    --port <number>   Server port (default: 3001)
    --path <dir>      Claude projects directory (overrides auto-detection)
    --help, -h        Show this help message

  Auto-detection:
    Automatically finds Claude Code data at ~/.claude/projects
    Works with all installation methods (homebrew, npm, direct install)

  Environment variables:
    CLAUDE_PROJECTS_DIR   Override projects directory path
    PORT                  Override server port
`);
    process.exit(0);
}

// Parse --port
const portIdx = args.indexOf('--port');
if (portIdx !== -1 && args[portIdx + 1]) {
    process.env.PORT = args[portIdx + 1];
}

// Parse --path
const pathIdx = args.indexOf('--path');
if (pathIdx !== -1 && args[pathIdx + 1]) {
    process.env.CLAUDE_PROJECTS_DIR = args[pathIdx + 1];
}

// Start the server
import('../dist/server/index.js');
