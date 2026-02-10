// ── JSONL file parsing and project discovery ──

import fs from 'fs';
import path from 'path';
import type { Message, Project } from './types.js';

/**
 * Parse a single JSONL file into an array of Message records.
 */
export function parseJsonlFile(filepath: string): Message[] {
    const records: Message[] = [];
    try {
        const content = fs.readFileSync(filepath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        for (const line of lines) {
            try {
                records.push(JSON.parse(line));
            } catch {
                continue;
            }
        }
    } catch (err) {
        console.error(`Error reading ${filepath}:`, err);
    }
    return records;
}

/**
 * Get sorted list of all projects from the Claude projects directory.
 */
export function getProjectsList(projectsDir: string): Project[] {
    const projects: Project[] = [];

    if (!fs.existsSync(projectsDir)) {
        console.error(`Projects directory not found: ${projectsDir}`);
        return projects;
    }

    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('-')) {
            const projectPath = path.join(projectsDir, entry.name);
            const jsonlFiles = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));

            projects.push({
                name: entry.name.replace(/-/g, '/').slice(1),
                path: entry.name,
                session_count: jsonlFiles.length
            });
        }
    }

    return projects.sort((a, b) => b.session_count - a.session_count);
}
