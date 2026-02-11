// ── Configuration management for Claude Analytics ──

import fs from 'fs';
import path from 'path';
import os from 'os';
import type { AppConfig } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.claude-analytics');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');

/**
 * Load the application config from disk, or return defaults.
 */
export function loadConfig(): AppConfig {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (err) {
        console.error('Error loading config:', err);
    }

    return {
        claude_projects_dir: '',
        initialized: false
    };
}

/**
 * Save the application config to disk.
 */
export function saveConfig(config: AppConfig): void {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error saving config:', err);
        throw err;
    }
}

/**
 * Resolve the Claude projects directory.
 * Priority: env var > config file > auto-detect > default path.
 * Auto-detection makes `init` unnecessary for most users.
 */
export function resolveProjectsDir(): string {
    // 1. Environment variable (highest priority)
    if (process.env.CLAUDE_PROJECTS_DIR) {
        return process.env.CLAUDE_PROJECTS_DIR;
    }

    // 2. Saved config (user explicitly set via UI/API)
    const config = loadConfig();
    if (config.claude_projects_dir && config.initialized) {
        return config.claude_projects_dir;
    }

    // 3. Auto-detect from common Claude Code installation paths
    const detected = autoDetectProjectsDir();
    if (detected.found) {
        return detected.path;
    }

    // 4. Fallback to default
    return DEFAULT_PROJECTS_DIR;
}

/**
 * Check if a given path looks like a valid Claude projects directory.
 * Claude projects dir contains subdirectories starting with '-' (hashed project paths).
 */
export function validateProjectsDir(dirPath: string): { valid: boolean; projectCount: number } {
    try {
        if (!fs.existsSync(dirPath)) {
            return { valid: false, projectCount: 0 };
        }
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        const projects = entries.filter(e => e.isDirectory() && e.name.startsWith('-'));
        return { valid: projects.length > 0, projectCount: projects.length };
    } catch {
        return { valid: false, projectCount: 0 };
    }
}

/**
 * Auto-detect Claude projects directory from all known locations.
 * 
 * Claude Code stores session data at ~/.claude/projects regardless of
 * installation method (homebrew, npm, direct install).
 * 
 * We also check XDG-based and custom env var paths for edge cases.
 */
export function autoDetectProjectsDir(): { path: string; found: boolean } {
    const home = os.homedir();
    const candidates: string[] = [];

    // Standard path — works for all installation methods
    // (homebrew: brew install --cask claude-code)
    // (npm: npm install -g @anthropic-ai/claude-code)
    // (direct: downloaded binary)
    candidates.push(path.join(home, '.claude', 'projects'));

    // XDG config path (Linux users who set XDG_CONFIG_HOME)
    const xdgConfigHome = process.env.XDG_CONFIG_HOME;
    if (xdgConfigHome) {
        candidates.push(path.join(xdgConfigHome, 'claude', 'projects'));
    }

    // Custom Claude config dir (if user has set CLAUDE_CONFIG_DIR)
    const claudeConfigDir = process.env.CLAUDE_CONFIG_DIR;
    if (claudeConfigDir) {
        candidates.push(path.join(claudeConfigDir, 'projects'));
    }

    // Linux snap installation path
    if (process.platform === 'linux') {
        candidates.push(path.join(home, 'snap', 'claude', 'common', '.claude', 'projects'));
    }

    // Deduplicate
    const uniqueCandidates = [...new Set(candidates)];

    for (const candidate of uniqueCandidates) {
        const result = validateProjectsDir(candidate);
        if (result.valid) {
            return { path: candidate, found: true };
        }
    }

    return { path: DEFAULT_PROJECTS_DIR, found: false };
}
