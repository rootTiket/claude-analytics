// ── Claude Analytics Server — Entry Point ──
// Routes + server startup only. All logic is in separate modules.

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

import { resolveProjectsDir, loadConfig, saveConfig, autoDetectProjectsDir, validateProjectsDir } from './config.js';
import { getProjectsList } from './parser.js';
import { getSessionsList, getSessionDetail, getAnalytics } from './analyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json());

// ── Helper: resolve projects dir per-request ──
function getProjectsDir(): string {
    return resolveProjectsDir();
}

// ════════════════════════════════════════════════════════════
// Config / Setup API (항목 1: Init 페이지)
// ════════════════════════════════════════════════════════════

app.get('/api/config', (_req, res) => {
    const config = loadConfig();
    const detected = autoDetectProjectsDir();
    const resolvedPath = resolveProjectsDir();
    const validation = validateProjectsDir(resolvedPath);
    res.json({
        ...config,
        detected_path: detected.path,
        detected: detected.found,
        resolved_path: resolvedPath,
        auto_detected: detected.found && !config.initialized,
        ready: validation.valid,
        projectCount: validation.projectCount
    });
});

app.post('/api/config', (req, res) => {
    try {
        const { claude_projects_dir } = req.body;
        if (!claude_projects_dir) {
            return res.status(400).json({ error: 'claude_projects_dir is required' });
        }

        const validation = validateProjectsDir(claude_projects_dir);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Invalid projects directory — no Claude project folders found',
                path: claude_projects_dir
            });
        }

        saveConfig({ claude_projects_dir, initialized: true });
        res.json({ success: true, projectCount: validation.projectCount });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

// ════════════════════════════════════════════════════════════
// Data API
// ════════════════════════════════════════════════════════════

app.get('/api/projects', (_req, res) => {
    res.json(getProjectsList(getProjectsDir()));
});

app.get('/api/sessions', (req, res) => {
    const projectPath = req.query.project as string | undefined;
    const startDate = req.query.from as string | undefined;
    const endDate = req.query.to as string | undefined;
    res.json(getSessionsList(getProjectsDir(), projectPath, startDate, endDate));
});

app.get('/api/sessions/:id', (req, res) => {
    const projectPath = req.query.project as string | undefined;
    const detail = getSessionDetail(getProjectsDir(), req.params.id, projectPath);
    if (!detail) return res.status(404).json({ error: 'Session not found' });
    res.json(detail);
});

app.get('/api/analytics', (req, res) => {
    const projectPath = req.query.project as string | undefined;
    const startDate = req.query.from as string | undefined;
    const endDate = req.query.to as string | undefined;
    res.json(getAnalytics(getProjectsDir(), projectPath, startDate, endDate));
});

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.post('/api/refresh', (req, res) => {
    const projectPath = req.body.project as string | undefined;
    const analytics = getAnalytics(getProjectsDir(), projectPath);
    res.json({ success: true, analytics });
});

// ════════════════════════════════════════════════════════════
// Static file serving (SPA)
// ════════════════════════════════════════════════════════════

const distPath = path.resolve(__dirname, '../client');
const indexHtmlPath = path.join(distPath, 'index.html');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(indexHtmlPath);
    });
    console.log(`📦 Serving frontend from: ${distPath}`);
} else {
    console.log(`⚠️  Frontend not found at: ${distPath}`);
    console.log(`   Run in dev mode: npm run dev`);
}

// ════════════════════════════════════════════════════════════
// Server startup
// ════════════════════════════════════════════════════════════

const server = app.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n  🔍 Claude Analytics Dashboard`);
    console.log(`  ${url}\n`);

    const projectsDir = getProjectsDir();
    const detected = autoDetectProjectsDir();

    if (detected.found) {
        console.log(`  ✅ Auto-detected: ${projectsDir}`);
    } else if (process.env.CLAUDE_PROJECTS_DIR) {
        console.log(`  📁 Using env var: ${projectsDir}`);
    } else {
        console.log(`  ⚠️  Projects dir not found: ${projectsDir}`);
        console.log(`     Set CLAUDE_PROJECTS_DIR or install Claude Code first.`);
    }

    try {
        const projects = getProjectsList(projectsDir);
        console.log(`  📊 Found ${projects.length} projects\n`);
    } catch {
        console.log(`  📊 No projects found yet\n`);
    }

    const openCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${openCmd} ${url}`, (err) => {
        if (err) console.log(`  Open your browser at: ${url}`);
    });
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});
process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err);
});
server.on('close', () => {
    console.log('Server closed');
});
