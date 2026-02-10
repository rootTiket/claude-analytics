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

    // Default: detect if ~/.claude/projects exists
    const defaultExists = fs.existsSync(DEFAULT_PROJECTS_DIR);
    return {
        claude_projects_dir: DEFAULT_PROJECTS_DIR,
        initialized: defaultExists
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
 * Priority: env var > config file > default path.
 */
export function resolveProjectsDir(): string {
    if (process.env.CLAUDE_PROJECTS_DIR) {
        return process.env.CLAUDE_PROJECTS_DIR;
    }
    const config = loadConfig();
    return config.claude_projects_dir || DEFAULT_PROJECTS_DIR;
}

/**
 * Check if a given path looks like a valid Claude projects directory.
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
 * Auto-detect Claude projects directory from common locations.
 */
export function autoDetectProjectsDir(): { path: string; found: boolean } {
    const candidates = [
        DEFAULT_PROJECTS_DIR,
        path.join(os.homedir(), '.claude', 'projects'),
    ];

    for (const candidate of candidates) {
        const result = validateProjectsDir(candidate);
        if (result.valid) {
            return { path: candidate, found: true };
        }
    }

    return { path: DEFAULT_PROJECTS_DIR, found: false };
}
