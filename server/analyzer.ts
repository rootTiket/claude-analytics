// ── Session analysis, scoring, and aggregation ──

import fs from 'fs';
import path from 'path';
import type {
    Message, SessionSummary, SessionDetail, ProcessedMessage,
    ToolUseDetail, AnalyticsResponse, AnthropicMetrics
} from './types.js';
import { parseJsonlFile, getProjectsList } from './parser.js';

// ── Model cost multiplier (Sonnet = 1.0 baseline) ──
const MODEL_COST_MULTIPLIER: Record<string, number> = {
    haiku: 0.25,
    sonnet: 1.0,
    opus: 5.0,
};

function getModelCostMultiplier(modelName: string): number {
    const lower = modelName.toLowerCase();
    for (const [key, value] of Object.entries(MODEL_COST_MULTIPLIER)) {
        if (lower.includes(key)) return value;
    }
    return 1.0; // default to sonnet
}

function extractModelName(record: Message): string | null {
    const model = record.message?.model;
    if (model && typeof model === 'string') return model;
    return null;
}

// ── Helper: compute efficiency score ──
function computeEfficiencyScore(
    cacheHitRate: number,
    toolErrorRate: number,
    toolErrorCount: number,
    duplicateReadRate: number,
    readEditRatio: number,
    repeatedEditRate: number,
    sessionExit: 'clean' | 'forced' | 'unknown',
    tokensPerEdit: number,
    modelName: string = 'sonnet'
): number {
    let score = 0;

    // 1. Cache efficiency (30 pts)
    score += cacheHitRate >= 95 ? 30 : cacheHitRate >= 90 ? 25 : cacheHitRate >= 80 ? 20 : cacheHitRate >= 60 ? 10 : 0;

    // 2. Tool reliability (20 pts)
    score += toolErrorRate <= 2 ? 20 : toolErrorRate <= 5 ? 15 : toolErrorRate <= 10 ? 10 : 5;

    // 3. Work efficiency (25 pts)
    score += (duplicateReadRate < 10 ? 10 : duplicateReadRate < 20 ? 5 : 0)
        + (readEditRatio >= 5 && readEditRatio <= 20 ? 10 : readEditRatio >= 3 ? 5 : 0)
        + (repeatedEditRate < 10 ? 5 : repeatedEditRate < 20 ? 3 : 0);

    // 4. Session termination (10 pts)
    score += sessionExit === 'clean' ? 10 : sessionExit === 'unknown' ? 5 : 0;

    // 5. Cost efficiency (15 pts) — normalized by model cost multiplier
    const costPerEdit = tokensPerEdit * getModelCostMultiplier(modelName);
    score += costPerEdit > 0 && costPerEdit < 30000 ? 15
        : costPerEdit < 50000 ? 10
            : costPerEdit < 80000 ? 5 : 0;

    // 6. Error penalty
    score = Math.max(0, score - (toolErrorCount * 5));

    return score;
}

// ── Helper: compute SEI (Spec Efficiency Index) ──
function computeSEI(
    postSpecReadTotal: number,
    postSpecReadErrors: number,
    cacheRead: number,
    specFilesCount: number
) {
    const seiAccuracy = postSpecReadTotal > 0 ? 1.0 - (postSpecReadErrors / postSpecReadTotal) : 1.0;
    let specVolumeTokens = cacheRead;
    if (specVolumeTokens === 0) specVolumeTokens = specFilesCount * 500;

    let volFactor = Math.log10(specVolumeTokens + 1);
    if (volFactor === 0) volFactor = 1;

    const seiScore = (seiAccuracy * 100) / volFactor;
    const interpretation = seiScore > 25 ? "Elite" : seiScore > 20 ? "Good" : seiScore > 15 ? "Average" : "Low";

    return {
        sei_score: Math.round(seiScore * 100) / 100,
        accuracy: Math.round(seiAccuracy * 1000) / 10,
        volume_tokens: Math.round(specVolumeTokens),
        interpretation
    };
}

// ── Helper: compute comprehensive grade ──
function computeGrade(
    cacheHitRate: number,
    toolErrorCount: number,
    requests: number,
    readEditRatio: number
) {
    const gradeEfficiency = Math.min(40, (cacheHitRate / 100) * 40);
    const errorRateVal = requests > 0 ? toolErrorCount / requests : 0;
    const gradeStability = Math.max(0, 30 - (errorRateVal * 300));
    const gradePrecision = readEditRatio >= 1.0 ? 30 : (readEditRatio * 30);
    const gradePenalty = 0;
    const finalScore = Math.max(0, gradeEfficiency + gradeStability + gradePrecision - gradePenalty);
    const letter = finalScore >= 90 ? 'S' : finalScore >= 80 ? 'A' : finalScore >= 60 ? 'B' : 'C';

    return {
        breakdown: {
            efficiency: Math.round(gradeEfficiency * 10) / 10,
            stability: Math.round(gradeStability * 10) / 10,
            precision: Math.round(gradePrecision * 10) / 10,
            penalty: gradePenalty,
            final_score: Math.round(finalScore * 10) / 10
        },
        letter: letter as 'S' | 'A' | 'B' | 'C'
    };
}

// ── Helper: compute danger level ──
function getDangerLevel(avgContextSize: number, modelName: string = 'sonnet'): 'optimal' | 'safe' | 'caution' | 'critical' {
    const normalizedCost = avgContextSize * getModelCostMultiplier(modelName);
    if (normalizedCost < 10000) return 'optimal';
    if (normalizedCost < 20000) return 'safe';
    if (normalizedCost > 50000) return 'critical';
    return 'caution';
}

// ── Get the list of projects to scan ──
function getProjectsToScan(projectsDir: string, projectPath?: string): { name: string; path: string }[] {
    if (projectPath) {
        const fullPath = path.join(projectsDir, projectPath);
        if (fs.existsSync(fullPath)) {
            return [{ name: projectPath, path: fullPath }];
        }
        return [];
    }

    if (!fs.existsSync(projectsDir)) return [];

    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
    return entries
        .filter(e => e.isDirectory() && e.name.startsWith('-'))
        .map(e => ({ name: e.name, path: path.join(projectsDir, e.name) }));
}

// ════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════

/**
 * Get list of all sessions, optionally filtered by project and date range.
 */
export function getSessionsList(
    projectsDir: string,
    projectPath?: string,
    startDate?: string,
    endDate?: string
): SessionSummary[] {
    const sessions: SessionSummary[] = [];
    const projectsToScan = getProjectsToScan(projectsDir, projectPath);

    for (const project of projectsToScan) {
        const files = fs.readdirSync(project.path).filter(f => f.endsWith('.jsonl'));

        for (const file of files) {
            const filepath = path.join(project.path, file);
            const records = parseJsonlFile(filepath);
            if (records.length === 0) continue;

            // Date filtering
            const firstRecord = records.find(r => r.timestamp);
            if (firstRecord?.timestamp) {
                const sessionDate = new Date(firstRecord.timestamp);
                if (startDate && sessionDate < new Date(startDate)) continue;
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (sessionDate > end) continue;
                }
            }

            let inputTokens = 0, cacheRead = 0, requests = 0;
            const filesReadList: string[] = [];
            const filesEdited: string[] = [];
            const specFilesRead: string[] = [];
            let readCount = 0, editCount = 0;
            let firstSpecReadIndex = -1;
            let postSpecReadTotal = 0, postSpecReadErrors = 0;
            let recordIndex = 0;
            let toolResultCount = 0, toolErrorCount = 0;
            let humanTurns = 0, autoTurns = 0, commandTurns = 0;
            let sessionModel = 'sonnet';

            for (const record of records) {
                if (record.type === 'assistant') {
                    // Extract model name from first assistant message
                    const model = extractModelName(record);
                    if (model && sessionModel === 'sonnet') sessionModel = model;

                    if (record.message?.usage) {
                        const usage = record.message.usage;
                        inputTokens += usage.input_tokens || 0;
                        // outputTokens += usage.output_tokens || 0;
                        cacheRead += usage.cache_read_input_tokens || 0;
                        requests++;

                        if (record.message?.content && Array.isArray(record.message.content)) {
                            for (const block of record.message.content) {
                                if (block.type === 'tool_use') {
                                    const toolName = block.name?.toLowerCase() || '';
                                    if (toolName.includes('read') || toolName.includes('view') || toolName.includes('grep') || toolName.includes('glob') || toolName.includes('list')) {
                                        readCount++;
                                        const input = (block.input as Record<string, unknown>) || {};
                                        const fp = (input.file_path as string) || (input.path as string) || '';
                                        if (firstSpecReadIndex === -1 && (fp.includes('.claude/') || fp.includes('CLAUDE.md'))) {
                                            firstSpecReadIndex = recordIndex;
                                        }
                                    } else if (toolName.includes('edit') || toolName.includes('write') || toolName.includes('replace')) {
                                        editCount++;
                                        const input = block.input as Record<string, unknown> | undefined;
                                        const filePath = (input?.file_path as string) || (input?.filePath as string);
                                        if (filePath) filesEdited.push(filePath);
                                    }
                                }
                            }
                        }
                    }
                }

                if (record.type === 'user' && record.message?.content) {
                    const msgContent = record.message.content;
                    if (Array.isArray(msgContent)) {
                        for (const block of msgContent) {
                            if (block.type === 'tool_result') {
                                toolResultCount++;
                                if (block.is_error) {
                                    toolErrorCount++;
                                    if (firstSpecReadIndex !== -1 && recordIndex > firstSpecReadIndex) postSpecReadErrors++;
                                }
                                if (firstSpecReadIndex !== -1 && recordIndex > firstSpecReadIndex) postSpecReadTotal++;
                            }
                        }
                    }
                }

                if (record.type === 'user' && record.toolUseResult?.file?.filePath) {
                    const fp = record.toolUseResult.file.filePath;
                    filesReadList.push(fp);
                    if (fp.includes('.claude/') || fp.includes('CLAUDE.md')) specFilesRead.push(fp);
                }

                // Human vs auto vs command turn detection
                if (record.type === 'user') {
                    const hasTUR = !!record.toolUseResult;
                    const isMeta = !!record.isMeta;
                    const msgContent = record.message?.content;

                    if (hasTUR) {
                        autoTurns++;
                    } else if (isMeta) {
                        // skip
                    } else if (typeof msgContent === 'string' && msgContent.trim().length > 0) {
                        const raw = msgContent.trim();
                        // Slash commands (/feature, /init, etc.) are skill triggers, not user interventions
                        if (raw.includes('<command-name>') || raw.startsWith('This session is being continued')) {
                            commandTurns++;
                        } else if (raw.startsWith('<local-command-stdout>') || raw.startsWith('<local-command-caveat>')) {
                            autoTurns++;
                        } else {
                            humanTurns++;
                        }
                    } else if (Array.isArray(msgContent)) {
                        const hasToolResults = msgContent.some(b => b.type === 'tool_result');
                        // Tool results (even with contextual text) are automatic, not user interventions
                        if (hasToolResults) {
                            autoTurns++;
                        } else {
                            const hasText = msgContent.some(b => b.type === 'text' && b.text?.trim().length);
                            if (hasText) humanTurns++;
                        }
                    }
                }

                recordIndex++;
            }

            // Compute derived metrics
            const lastRecordRaw = records[records.length - 1];
            const sessionExit: 'clean' | 'forced' | 'unknown' =
                lastRecordRaw?.type === 'summary' ? 'clean' :
                    lastRecordRaw?.type === 'system' ? 'forced' : 'unknown';

            const totalContextSent = inputTokens + cacheRead;
            const avgContextSize = requests > 0 ? Math.round(totalContextSent / requests) : 0;
            const dangerLevel = getDangerLevel(avgContextSize, sessionModel);

            const uniqueFilesRead = new Set(filesReadList).size;
            const duplicateReads = filesReadList.length - uniqueFilesRead;
            const duplicateReadRate = filesReadList.length > 0 ? Math.round((duplicateReads / filesReadList.length) * 100) : 0;
            const readEditRatio = editCount > 0 ? Math.round((readCount / editCount) * 10) / 10 : readCount;
            const uniqueFilesEdited = new Set(filesEdited).size;
            const repeatedEdits = filesEdited.length - uniqueFilesEdited;
            const repeatedEditRate = filesEdited.length > 0 ? Math.round((repeatedEdits / filesEdited.length) * 100) : 0;
            const tokensPerEdit = editCount > 0 ? Math.round(totalContextSent / editCount) : 0;
            const toolErrorRate = toolResultCount > 0 ? Math.round((toolErrorCount / toolResultCount) * 1000) / 10 : 0;
            const cacheHitRate = (inputTokens + cacheRead) > 0 ? (cacheRead / (inputTokens + cacheRead)) * 100 : 0;

            const efficiencyScore = computeEfficiencyScore(
                cacheHitRate, toolErrorRate, toolErrorCount,
                duplicateReadRate, readEditRatio, repeatedEditRate,
                sessionExit, tokensPerEdit, sessionModel
            );

            const sei = computeSEI(postSpecReadTotal, postSpecReadErrors, cacheRead, new Set(specFilesRead).size);
            const grade = computeGrade(cacheHitRate, toolErrorCount, requests, readEditRatio);

            // Timestamps & duration
            const firstTimestampRecord = records.find(r => r.timestamp);
            const lastTimestampRecord = [...records].reverse().find(r => r.timestamp);
            const startTs = (firstTimestampRecord as Message)?.timestamp || '';
            const endTs = (lastTimestampRecord as Message)?.timestamp || '';
            let durationMinutes = 0;
            if (startTs && endTs) {
                durationMinutes = Math.round((new Date(endTs).getTime() - new Date(startTs).getTime()) / 60000);
                if (durationMinutes < 0) durationMinutes = 0;
            }

            const specCount = new Set(specFilesRead).size;

            const specTriggerRate = specCount > 0 ? 100 : 0;
            // Command turns are skill triggers (automatic), include them in auto side for autonomy calculation
            const effectiveAutoTurns = autoTurns + commandTurns;
            const autonomyRate = (effectiveAutoTurns + humanTurns) > 0
                ? Math.round((effectiveAutoTurns / (effectiveAutoTurns + humanTurns)) * 1000) / 10 : 0;
            const totalToolCalls = readCount + editCount;

            const anthropicMetrics: AnthropicMetrics = {
                skill_trigger: {
                    cache_hit_rate: Math.round(cacheHitRate * 10) / 10,
                    spec_trigger_rate: specTriggerRate,
                    danger_level: dangerLevel,
                },
                tool_efficiency: {
                    read_edit_ratio: readEditRatio,
                    tokens_per_edit: tokensPerEdit,
                    duplicate_read_rate: duplicateReadRate,
                    repeated_edit_rate: repeatedEditRate,
                    total_tool_calls: totalToolCalls,
                },
                api_reliability: {
                    tool_error_rate: toolErrorRate,
                    tool_error_count: toolErrorCount,
                    session_exit: sessionExit,
                },
                user_intervention: {
                    human_turns: humanTurns,
                    auto_turns: effectiveAutoTurns,
                    autonomy_rate: autonomyRate,
                },
                workflow_autonomy: {
                    efficiency_score: efficiencyScore,
                    sei,
                },
                session_consistency: {
                    grade: grade.letter,
                    grade_breakdown: grade.breakdown,
                },
            };

            sessions.push({
                session_id: file.replace('.jsonl', ''),
                project: project.name,
                model: sessionModel,
                start_time: startTs,
                end_time: endTs,
                git_branch: firstTimestampRecord?.gitBranch || '',
                total_requests: requests,
                avg_context_size: avgContextSize,
                danger_level: dangerLevel,
                total_context_tokens: totalContextSent,
                duplicate_read_rate: duplicateReadRate,
                read_edit_ratio: readEditRatio,
                repeated_edit_rate: repeatedEditRate,
                tokens_per_edit: tokensPerEdit,
                tool_error_rate: toolErrorRate,
                session_exit: sessionExit,
                efficiency_score: efficiencyScore,
                session_grade: grade.letter,
                duration_minutes: durationMinutes,
                spec_files_count: specCount,
                has_spec_context: specCount > 0,
                human_turns: humanTurns,
                auto_turns: effectiveAutoTurns,
                command_turns: commandTurns,
                edit_count: editCount,
                spec_efficiency: sei,
                grade_breakdown: grade.breakdown,
                anthropic_metrics: anthropicMetrics,
            });
        }
    }

    return sessions.sort((a, b) => {
        if (!a.start_time && !b.start_time) return 0;
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
    });
}

/**
 * Get detailed session data with processed messages.
 */
export function getSessionDetail(
    projectsDir: string,
    sessionId: string,
    projectPath?: string
): SessionDetail | null {
    let filepath: string | null = null;
    let foundProject = '';

    if (projectPath) {
        const testPath = path.join(projectsDir, projectPath, `${sessionId}.jsonl`);
        if (fs.existsSync(testPath)) {
            filepath = testPath;
            foundProject = projectPath;
        }
    } else {
        if (!fs.existsSync(projectsDir)) return null;
        const entries = fs.readdirSync(projectsDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name.startsWith('-')) {
                const testPath = path.join(projectsDir, entry.name, `${sessionId}.jsonl`);
                if (fs.existsSync(testPath)) {
                    filepath = testPath;
                    foundProject = entry.name;
                    break;
                }
            }
        }
    }

    if (!filepath) return null;

    const records = parseJsonlFile(filepath);
    const messages: ProcessedMessage[] = [];
    const filesRead: string[] = [];
    const specFilesRead: string[] = [];

    let inputTokens = 0, cacheRead = 0, requests = 0;
    let readCount = 0, editCount = 0;
    let toolResultCount = 0, toolErrorCount = 0;
    const filesEdited: string[] = [];
    const allReadFiles: string[] = [];

    let firstSpecReadIndex = -1;
    let postSpecReadTotal = 0, postSpecReadErrors = 0;
    let recordIndex = 0;
    let sessionModel = 'sonnet';

    const toolIdMap = new Map<string, string>();
    const errorMap = new Map<string, { tool: string; error: string; count: number }>();
    // Track pending questions from interactive tools (AskFollowupQuestion etc.)
    const pendingQuestions = new Map<string, ToolUseDetail>();

    // Track which files were read by the assistant via tool_use
    // so we can deduplicate them from user's "context load" display
    let lastAssistantReadFiles: Set<string> = new Set();

    // ── Skill tracking: detect slash commands and associate subsequent work ──
    let activeSkill: string | null = null;

    let messageId = 0;

    for (const record of records) {
        if (record.type === 'user') {
            if (record.isMeta) continue;

            const hasTUR = !!record.toolUseResult;
            const msgContent = record.message?.content;

            let content = '';
            let messageSubtype: ProcessedMessage['subtype'] = '';

            if (typeof msgContent === 'string' && msgContent.trim().length > 0) {
                const raw = msgContent.trim();
                if (raw.startsWith('<local-command-stdout>') || raw.startsWith('<local-command-caveat>')) {
                    // Skip system messages
                } else if (raw.includes('<command-name>')) {
                    const cmdMatch = raw.match(/<command-name>\/?(.+?)<\/command-name>/);
                    const argsMatch = raw.match(/<command-args>([\s\S]*?)<\/command-args>/);
                    const cmdName = cmdMatch ? `/${cmdMatch[1]}` : '';
                    const cmdArgs = argsMatch ? argsMatch[1].trim() : '';
                    content = cmdArgs ? `${cmdName} ${cmdArgs}` : cmdName;
                    messageSubtype = 'command';
                    // Set active skill from slash command
                    activeSkill = cmdMatch ? cmdMatch[1].replace(/^\//, '') : null;
                } else if (raw.startsWith('This session is being continued')) {
                    content = '(세션 이어하기 — 이전 대화 요약 자동 삽입)';
                    messageSubtype = 'continuation';
                } else {
                    content = raw;
                    messageSubtype = 'human';
                    // User typed a message → reset active skill
                    activeSkill = null;
                }
            } else if (Array.isArray(msgContent)) {
                for (const block of msgContent) {
                    if (block.type === 'text' && block.text?.trim()) {
                        content += block.text;
                    }
                }
                if (content) messageSubtype = 'human';
            }

            const fileList: string[] = [];
            const toolUses: ToolUseDetail[] = [];

            if (hasTUR) {
                const tur = record.toolUseResult;
                if (tur?.file?.filePath) {
                    const fp = tur.file.filePath;

                    // ── BUG FIX (항목 4): Only add to files_read if NOT already
                    // shown in the previous assistant's tool_use list ──
                    if (!lastAssistantReadFiles.has(fp)) {
                        fileList.push(fp);
                    }

                    filesRead.push(fp);
                    if (fp.includes('.claude/') || fp.includes('CLAUDE.md')) {
                        specFilesRead.push(fp);
                    }
                }
                if (!content) {
                    toolUses.push({ name: 'tool_result' });
                }
            }

            // Track tool results and errors
            if (Array.isArray(msgContent)) {
                for (const block of msgContent) {
                    if (block?.type === 'tool_result') {
                        toolResultCount++;

                        // Link answer back to pending interactive tool question
                        const resultToolId = block.tool_use_id;
                        if (resultToolId && pendingQuestions.has(resultToolId)) {
                            let answerText = '';
                            if (typeof block.content === 'string') answerText = block.content;
                            else if (Array.isArray(block.content)) answerText = block.content.map(c => c.text || '').join(' ');
                            const pending = pendingQuestions.get(resultToolId)!;
                            pending.answer = answerText || undefined;
                            pendingQuestions.delete(resultToolId);
                        }

                        if (block.is_error) {
                            toolErrorCount++;
                            if (firstSpecReadIndex !== -1 && recordIndex > firstSpecReadIndex) postSpecReadErrors++;

                            const toolId = block.tool_use_id!;
                            const toolName = toolIdMap.get(toolId) || 'unknown';
                            let errorMsg = '';
                            if (typeof block.content === 'string') errorMsg = block.content;
                            else if (Array.isArray(block.content)) errorMsg = block.content.map(c => c.text || '').join(' ');

                            if (errorMsg) {
                                const displayMsg = errorMsg.length > 200 ? errorMsg.substring(0, 200) + '...' : errorMsg;
                                const key = `${toolName}|||${displayMsg}`;
                                const existing = errorMap.get(key) || { tool: toolName, error: displayMsg, count: 0 };
                                existing.count++;
                                errorMap.set(key, existing);
                            }
                        }
                        if (firstSpecReadIndex !== -1 && recordIndex > firstSpecReadIndex) postSpecReadTotal++;
                    }
                }
            }

            // Clear assistant read tracking for next cycle
            lastAssistantReadFiles = new Set();

            if (content || fileList.length > 0) {
                messages.push({
                    id: messageId++,
                    type: 'user',
                    subtype: messageSubtype || (hasTUR ? 'tool_result' : ''),
                    timestamp: record.timestamp || '',
                    content,
                    files_read: fileList,
                    tool_uses: toolUses,
                    skill_name: messageSubtype === 'command' ? activeSkill || undefined : undefined,
                });
            }
        } else if (record.type === 'assistant') {
            // Extract model name from first assistant message
            const model = extractModelName(record);
            if (model && sessionModel === 'sonnet') sessionModel = model;

            const usage = record.message?.usage;
            const content: string[] = [];
            const toolUses: ToolUseDetail[] = [];

            // Reset assistant read files tracking for this message
            lastAssistantReadFiles = new Set();

            if (record.message?.content && Array.isArray(record.message.content)) {
                for (const block of record.message.content) {
                    if (block.type === 'text' && block.text) {
                        content.push(block.text);
                    } else if (block.type === 'tool_use') {
                        const toolName = block.name || 'tool';
                        const input = (block.input as Record<string, unknown>) || {};
                        const toolId = block.id;
                        if (toolId) toolIdMap.set(toolId, toolName);

                        let detail = '';

                        const nameLower = toolName.toLowerCase();
                        if (nameLower === 'read' || nameLower === 'view') {
                            const fp = (input.file_path as string) || (input.filePath as string) || '';
                            const isSpec = fp.includes('.claude/') || fp.includes('CLAUDE.md');
                            if (fp) {
                                detail = fp;
                                // Track that this file was read by assistant tool
                                lastAssistantReadFiles.add(fp);

                                const parts: string[] = [];
                                if (input.offset !== undefined) parts.push(`offset:${input.offset}`);
                                if (input.limit !== undefined) parts.push(`limit:${input.limit}`);
                                if (input.start_line !== undefined) parts.push(`L${input.start_line}`);
                                if (input.end_line !== undefined) parts.push(`L${input.end_line}`);
                                if (input.view_range) parts.push(`range:${Array.isArray(input.view_range) ? input.view_range.join('-') : input.view_range}`);
                                if (parts.length > 0) detail += ` (${parts.join(', ')})`;

                                readCount++;
                                allReadFiles.push(detail);

                                if (firstSpecReadIndex === -1 && (fp.includes('.claude/') || fp.includes('CLAUDE.md'))) {
                                    firstSpecReadIndex = recordIndex;
                                }
                            }
                            toolUses.push({ name: toolName, detail: detail || undefined, category: isSpec ? 'read_spec' : 'read_code' });
                            continue;
                        } else if (nameLower === 'edit' || nameLower === 'replace') {
                            detail = (input.file_path as string) || (input.filePath as string) || '';
                            editCount++;
                            if (detail) filesEdited.push(detail);
                            toolUses.push({ name: toolName, detail: detail || undefined, category: 'edit' });
                            continue;
                        } else if (nameLower === 'write') {
                            detail = (input.file_path as string) || (input.filePath as string) || '';
                            editCount++;
                            if (detail) filesEdited.push(detail);
                            toolUses.push({ name: toolName, detail: detail || undefined, category: 'edit' });
                            continue;
                        } else if (nameLower === 'bash') {
                            detail = (input.command as string) || '';
                        } else if (nameLower === 'grep') {
                            detail = `${(input.pattern as string) || ''} in ${(input.path as string) || ''}`;
                        } else if (nameLower === 'glob') {
                            detail = `${(input.pattern as string) || ''} in ${(input.path as string) || ''}`;
                        } else if (nameLower === 'skill') {
                            detail = (input.skill as string) || '';
                        } else if (nameLower === 'task') {
                            detail = (input.description as string) || '';
                        } else if (nameLower === 'taskcreate') {
                            detail = (input.subject as string) || '';
                        } else if (nameLower === 'taskupdate') {
                            detail = `#${input.taskId || ''} → ${input.status || ''}`;
                        } else if (nameLower === 'tasklist') {
                            detail = '';
                        } else if (nameLower.includes('ask') || nameLower.includes('question') || nameLower.includes('followup') || nameLower === 'attempt_completion') {
                            // Interactive tools: capture the question/message
                            // AskUserQuestion format: input.questions[{question, header, options[{label, description}]}]
                            let question = '';
                            const questions = input.questions as Array<{ question?: string; header?: string; options?: Array<{ label?: string; description?: string }> }> | undefined;
                            if (Array.isArray(questions) && questions.length > 0) {
                                const parts: string[] = [];
                                for (const q of questions) {
                                    let qText = '';
                                    if (q.header) qText += `[${q.header}] `;
                                    if (q.question) qText += q.question;
                                    if (q.options && q.options.length > 0) {
                                        qText += '\n' + q.options.map((o, idx) => `  ${idx + 1}. ${o.label || ''}${o.description ? ` - ${o.description}` : ''}`).join('\n');
                                    }
                                    parts.push(qText);
                                }
                                question = parts.join('\n\n');
                            } else {
                                question = (input.question as string) || (input.message as string) || (input.result as string) || (input.text as string) || '';
                            }
                            detail = question.length > 100 ? question.substring(0, 100) + '...' : question;
                            const toolEntry: ToolUseDetail = { name: toolName, detail: detail || undefined, question: question || undefined };
                            toolUses.push(toolEntry);
                            if (toolId) pendingQuestions.set(toolId, toolEntry);
                            continue; // skip the generic push below
                        } else {
                            detail = (input.file_path as string) || (input.filePath as string) || (input.command as string) || (input.description as string) || '';
                            if (nameLower.includes('read') || nameLower.includes('view') || nameLower.includes('grep') || nameLower.includes('glob') || nameLower.includes('list')) {
                                readCount++;
                                if (detail) {
                                    allReadFiles.push(detail);
                                    lastAssistantReadFiles.add(detail);
                                    if (firstSpecReadIndex === -1 && (detail.includes('.claude/') || detail.includes('CLAUDE.md'))) {
                                        firstSpecReadIndex = recordIndex;
                                    }
                                }
                            } else if (nameLower.includes('edit') || nameLower.includes('write') || nameLower.includes('replace')) {
                                editCount++;
                                if (detail) filesEdited.push(detail);
                            }
                        }

                        toolUses.push({
                            name: toolName, detail: detail || undefined,
                            category: nameLower.includes('read') || nameLower.includes('view') || nameLower.includes('list')
                                ? (detail && (detail.includes('.claude/') || detail.includes('CLAUDE.md')) ? 'read_spec' : 'read_code')
                                : nameLower.includes('grep') || nameLower.includes('glob') || nameLower.includes('search')
                                    ? 'search'
                                    : nameLower.includes('edit') || nameLower.includes('write') || nameLower.includes('replace')
                                        ? 'edit' : 'other'
                        });
                    }
                }
            }

            if (usage) {
                inputTokens += usage.input_tokens || 0;
                // outputTokens += usage.output_tokens || 0; // Unused
                cacheRead += usage.cache_read_input_tokens || 0;
                requests++;
            }

            messages.push({
                id: messageId++,
                type: 'assistant',
                timestamp: record.timestamp || '',
                content: content.join('\n'),
                usage,
                files_read: [],
                tool_uses: toolUses,
                skill_name: activeSkill || undefined,
            });
        }

        recordIndex++;
    }

    const firstRecord = records.find(r => r.timestamp) || {};
    const lastRecord = [...records].reverse().find(r => r.timestamp) || {};

    const toolErrorRate = toolResultCount > 0 ? (toolErrorCount / toolResultCount) * 100 : 0;
    const errorDetails = Array.from(errorMap.values()).sort((a, b) => b.count - a.count);

    const sessionExit: 'clean' | 'forced' | 'unknown' =
        messages.length > 0 && messages[messages.length - 1].type === 'user' ? 'forced' :
            messages.length > 0 && messages[messages.length - 1].type === 'assistant' ? 'clean' : 'unknown';

    const totalContextSent = inputTokens + cacheRead;
    const avgContextSize = requests > 0 ? Math.round(totalContextSent / requests) : 0;
    const dangerLevel = getDangerLevel(avgContextSize, sessionModel);

    const readEditRatio = editCount > 0 ? Math.round((readCount / editCount) * 10) / 10 : readCount;
    const uniqueFilesRead = new Set(allReadFiles).size;
    const duplicateReads = allReadFiles.length - uniqueFilesRead;
    const duplicateReadRate = allReadFiles.length > 0 ? Math.round((duplicateReads / allReadFiles.length) * 100) : 0;

    const fileReadCounts: Record<string, number> = {};
    for (const fp of allReadFiles) {
        const shortPath = fp.split('/').slice(-2).join('/');
        fileReadCounts[shortPath] = (fileReadCounts[shortPath] || 0) + 1;
    }
    const duplicateFiles = Object.entries(fileReadCounts)
        .filter(([, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .map(([file, count]) => ({ file, count }));

    const uniqueFilesEdited = new Set(filesEdited).size;
    const repeatedEdits = filesEdited.length - uniqueFilesEdited;
    const repeatedEditRate = filesEdited.length > 0 ? Math.round((repeatedEdits / filesEdited.length) * 100) : 0;
    const tokensPerEdit = editCount > 0 ? Math.round(totalContextSent / editCount) : 0;

    const cacheHitRate = (inputTokens + cacheRead) > 0 ? (cacheRead / (inputTokens + cacheRead)) * 100 : 0;
    const efficiencyScore = computeEfficiencyScore(
        cacheHitRate, toolErrorRate, toolErrorCount,
        duplicateReadRate, readEditRatio, repeatedEditRate,
        sessionExit, tokensPerEdit, sessionModel
    );

    const specFilesReadList = allReadFiles.filter(f => f.includes('.claude/') || f.includes('CLAUDE.md'));
    const sei = computeSEI(postSpecReadTotal, postSpecReadErrors, cacheRead, specFilesReadList.length);
    const grade = computeGrade(cacheHitRate, toolErrorCount, requests, readEditRatio);

    return {
        session_id: sessionId,
        project: foundProject,
        model: sessionModel,
        start_time: (firstRecord as Message).timestamp || '',
        end_time: (lastRecord as Message).timestamp || '',
        git_branch: (firstRecord as Message)?.gitBranch || '',
        messages,
        summary: {
            total_requests: requests,
            avg_context_size: avgContextSize,
            danger_level: dangerLevel,
            total_context_tokens: totalContextSent,
            files_read: [...new Set(filesRead)],
            spec_files_read: [...new Set(specFilesRead)],
            skills_loaded: (() => {
                const skills: { name: string; type: 'command' | 'spec_file'; path?: string }[] = [];
                const seen = new Set<string>();
                // Collect slash commands used and AI-invoked skills
                for (const msg of messages) {
                    if (msg.skill_name && !seen.has(`cmd:${msg.skill_name}`)) {
                        seen.add(`cmd:${msg.skill_name}`);
                        skills.push({ name: msg.skill_name, type: 'command' });
                    }
                    for (const tu of msg.tool_uses) {
                        if (tu.name.toLowerCase() === 'skill' && tu.detail) {
                            if (!seen.has(`cmd:${tu.detail}`)) {
                                seen.add(`cmd:${tu.detail}`);
                                skills.push({ name: tu.detail, type: 'command' });
                            }
                        }
                    }
                }
                // Collect .claude/ spec files read (commands, settings, etc.)
                for (const msg of messages) {
                    for (const tu of msg.tool_uses) {
                        if (tu.category === 'read_spec' && tu.detail) {
                            const p = tu.detail;
                            if (!seen.has(`file:${p}`)) {
                                seen.add(`file:${p}`);
                                // Extract a friendly name from the path
                                const match = p.match(/\.claude\/commands\/([^/]+?)(?:\.\w+)?$/) ||
                                    p.match(/\.claude\/([^/]+?)(?:\.\w+)?$/) ||
                                    p.match(/([^/]+?)(?:\.\w+)?$/);
                                const name = match ? match[1] : p;
                                skills.push({ name, type: 'spec_file', path: p });
                            }
                        }
                    }
                }
                return skills;
            })()
        },
        quality: {
            read_count: readCount,
            edit_count: editCount,
            read_edit_ratio: readEditRatio,
            duplicate_read_rate: duplicateReadRate,
            duplicate_files: duplicateFiles,
            repeated_edit_rate: repeatedEditRate,
            tokens_per_edit: tokensPerEdit,
            tool_error_rate: Math.round(toolErrorRate * 10) / 10,
            error_details: errorDetails,
            cache_hit_rate: Math.round(cacheHitRate * 10) / 10,
            efficiency_score: Math.round(efficiencyScore),
            session_grade: grade.letter,
            session_exit: sessionExit,
            score_breakdown: {
                cache: cacheHitRate >= 95 ? 30 : cacheHitRate >= 90 ? 25 : cacheHitRate >= 80 ? 20 : cacheHitRate >= 60 ? 10 : 0,
                tool_reliability: (toolErrorRate <= 2 ? 20 : toolErrorRate <= 5 ? 15 : toolErrorRate <= 10 ? 10 : 5) - (toolErrorCount * 5),
                work_efficiency: (duplicateReadRate < 10 ? 10 : duplicateReadRate < 20 ? 5 : 0)
                    + (readEditRatio >= 5 && readEditRatio <= 20 ? 10 : readEditRatio >= 3 ? 5 : 0)
                    + (repeatedEditRate < 10 ? 5 : repeatedEditRate < 20 ? 3 : 0),
                termination: sessionExit === 'clean' ? 10 : sessionExit === 'unknown' ? 5 : 0,
                cost_efficiency: (() => {
                    const costPerEdit = tokensPerEdit * getModelCostMultiplier(sessionModel);
                    return costPerEdit > 0 && costPerEdit < 30000 ? 15 : costPerEdit < 50000 ? 10 : costPerEdit < 80000 ? 5 : 0;
                })()
            },
            spec_efficiency: sei,
            grade_breakdown: grade.breakdown
        },
        anthropic_metrics: (() => {
            const humanTurns = messages.filter(m => m.type === 'user' && m.subtype === 'human').length;
            const commandTurnsDetail = messages.filter(m => m.type === 'user' && (m.subtype === 'command' || m.subtype === 'continuation')).length;
            const autoTurns = messages.filter(m => m.type === 'user' && (m.subtype === 'tool_result' || m.subtype === '')).length + commandTurnsDetail;
            const autonomyRate = (autoTurns + humanTurns) > 0
                ? Math.round((autoTurns / (autoTurns + humanTurns)) * 1000) / 10 : 0;
            const specFilesInSession = allReadFiles.filter(f => f.includes('.claude/') || f.includes('CLAUDE.md'));
            const specTriggerRate = specFilesInSession.length > 0 ? 100 : 0;
            const totalToolCalls = readCount + editCount;

            return {
                skill_trigger: {
                    cache_hit_rate: Math.round(cacheHitRate * 10) / 10,
                    spec_trigger_rate: specTriggerRate,
                    danger_level: dangerLevel,
                },
                tool_efficiency: {
                    read_edit_ratio: readEditRatio,
                    tokens_per_edit: tokensPerEdit,
                    duplicate_read_rate: duplicateReadRate,
                    repeated_edit_rate: repeatedEditRate,
                    total_tool_calls: totalToolCalls,
                },
                api_reliability: {
                    tool_error_rate: Math.round(toolErrorRate * 10) / 10,
                    tool_error_count: toolErrorCount,
                    session_exit: sessionExit,
                    error_details: errorDetails,
                },
                user_intervention: {
                    human_turns: humanTurns,
                    auto_turns: autoTurns,
                    autonomy_rate: autonomyRate,
                },
                workflow_autonomy: {
                    efficiency_score: Math.round(efficiencyScore),
                    sei,
                },
                session_consistency: {
                    grade: grade.letter,
                    grade_breakdown: grade.breakdown,
                },
            } as AnthropicMetrics;
        })(),
    };
}

/**
 * Get aggregated analytics across all sessions.
 */
export function getAnalytics(
    projectsDir: string,
    projectPath?: string,
    startDate?: string,
    endDate?: string
): AnalyticsResponse {
    const sessions = getSessionsList(projectsDir, projectPath, startDate, endDate);
    const projects = getProjectsList(projectsDir);

    let totalInput = 0, totalCacheRead = 0;

    const projectsToScan = getProjectsToScan(projectsDir, projectPath);

    for (const projectDir of projectsToScan) {
        if (!fs.existsSync(projectDir.path)) continue;
        const files = fs.readdirSync(projectDir.path).filter(f => f.endsWith('.jsonl'));

        for (const file of files) {
            const filepath = path.join(projectDir.path, file);
            const records = parseJsonlFile(filepath);

            for (const record of records) {
                if (record.type === 'assistant' && record.message?.usage) {
                    const usage = record.message.usage;
                    totalInput += usage.input_tokens || 0;
                    totalCacheRead += usage.cache_read_input_tokens || 0;
                }
            }
        }
    }

    const totalContextSent = totalInput + totalCacheRead;
    const totalRequests = sessions.reduce((sum, s) => sum + s.total_requests, 0);
    const avgContextSize = totalRequests > 0 ? Math.round(totalContextSent / totalRequests) : 0;
    const dangerLevel = getDangerLevel(avgContextSize);

    const avgEfficiency = sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.efficiency_score, 0) / sessions.length) : 0;
    const avgToolErrorRate = sessions.length > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.tool_error_rate, 0) / sessions.length * 10) / 10 : 0;

    // Hypothesis Check — Anthropic-aligned metrics (HT/E, SEI, P99)
    const withSpec = sessions.filter(s => s.has_spec_context && s.total_requests > 0);
    const withoutSpec = sessions.filter(s => !s.has_spec_context && s.total_requests > 0);

    // HT/E: Human Turns per Edit (lower = more autonomous)
    const computeAvgHTE = (arr: SessionSummary[]) => {
        const valid = arr.filter(s => s.edit_count > 0);
        if (valid.length === 0) return 0;
        return Math.round(valid.reduce((sum, s) => sum + (s.human_turns / s.edit_count), 0) / valid.length * 100) / 100;
    };
    const hteWithSpec = computeAvgHTE(withSpec);
    const hteWithoutSpec = computeAvgHTE(withoutSpec);
    const hteImprovement = hteWithoutSpec > 0
        ? Math.round((1 - hteWithSpec / hteWithoutSpec) * 1000) / 10 : 0;

    // SEI: Spec Efficiency Index comparison
    const computeAvgSEI = (arr: SessionSummary[]) => {
        const valid = arr.filter(s => s.spec_efficiency && s.spec_efficiency.sei_score > 0);
        if (valid.length === 0) return 0;
        return Math.round(valid.reduce((sum, s) => sum + (s.spec_efficiency?.sei_score || 0), 0) / valid.length * 10) / 10;
    };

    // P99 duration: 99th percentile tail-end (minutes)
    const computeP99Duration = (arr: SessionSummary[]) => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].map(s => s.duration_minutes).sort((a, b) => a - b);
        const idx = Math.min(Math.floor(sorted.length * 0.99), sorted.length - 1);
        return sorted[idx];
    };

    return {
        summary: {
            total_sessions: sessions.length,
            total_projects: projects.length,
            total_context_tokens: totalContextSent,
            avg_context_size: avgContextSize,
            danger_level: dangerLevel,
            optimal_sessions: sessions.filter(s => s.danger_level === 'optimal').length,
            safe_sessions: sessions.filter(s => s.danger_level === 'safe').length,
            caution_sessions: sessions.filter(s => s.danger_level === 'caution').length,
            critical_sessions: sessions.filter(s => s.danger_level === 'critical').length,
            grade_s: sessions.filter(s => s.session_grade === 'S').length,
            grade_a: sessions.filter(s => s.session_grade === 'A').length,
            grade_b: sessions.filter(s => s.session_grade === 'B').length,
            grade_c: sessions.filter(s => s.session_grade === 'C').length,
            avg_efficiency_score: avgEfficiency,
            avg_tool_error_rate: avgToolErrorRate,
            clean_exits: sessions.filter(s => s.session_exit === 'clean').length,
            forced_exits: sessions.filter(s => s.session_exit === 'forced').length,
            hypothesis_check: {
                hte_with_spec: hteWithSpec,
                hte_without_spec: hteWithoutSpec,
                hte_improvement: hteImprovement,
                avg_sei_with_spec: computeAvgSEI(withSpec),
                avg_sei_without_spec: computeAvgSEI(withoutSpec),
                p99_duration_with_spec: computeP99Duration(withSpec),
                p99_duration_without_spec: computeP99Duration(withoutSpec),
                sessions_with_spec: withSpec.length,
                sessions_without_spec: withoutSpec.length
            },
            anthropic_aggregate: {
                avg_skill_trigger_rate: sessions.length > 0
                    ? Math.round(sessions.reduce((sum, s) => sum + s.anthropic_metrics.skill_trigger.cache_hit_rate, 0) / sessions.length * 10) / 10 : 0,
                avg_spec_trigger_rate: sessions.length > 0
                    ? Math.round(sessions.filter(s => s.has_spec_context).length / sessions.length * 1000) / 10 : 0,
                avg_tool_calls_per_session: sessions.length > 0
                    ? Math.round(sessions.reduce((sum, s) => sum + s.anthropic_metrics.tool_efficiency.total_tool_calls, 0) / sessions.length * 10) / 10 : 0,
                total_tool_errors: sessions.reduce((sum, s) => sum + s.anthropic_metrics.api_reliability.tool_error_count, 0),
                avg_autonomy_rate: sessions.length > 0
                    ? Math.round(sessions.reduce((sum, s) => sum + s.anthropic_metrics.user_intervention.autonomy_rate, 0) / sessions.length * 10) / 10 : 0,
                workflow_completion_rate: sessions.length > 0
                    ? Math.round(sessions.filter(s => s.anthropic_metrics.workflow_autonomy.efficiency_score >= 60).length / sessions.length * 1000) / 10 : 0,
                grade_consistency: sessions.length > 0
                    ? Math.round(sessions.filter(s => s.anthropic_metrics.session_consistency.grade === 'S' || s.anthropic_metrics.session_consistency.grade === 'A').length / sessions.length * 1000) / 10 : 0,
            }
        },
        projects,
        sessions: sessions.slice(0, 100)
    };
}
