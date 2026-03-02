// ── Shared type definitions for the Claude Analytics server ──

// ── Anthropic Skill Evaluation Framework Types ──

export interface AnthropicSkillTrigger {
    cache_hit_rate: number;
    spec_trigger_rate: number;
    danger_level: 'optimal' | 'safe' | 'caution' | 'critical';
    limit_impact: number;
}

export interface AnthropicToolEfficiency {
    read_edit_ratio: number;
    tokens_per_edit: number;
    duplicate_read_rate: number;
    repeated_edit_rate: number;
    total_tool_calls: number;
}

export interface AnthropicApiReliability {
    tool_error_rate: number;
    tool_error_count: number;
    session_exit: 'clean' | 'forced' | 'unknown';
    error_details?: { tool: string; error: string; count: number }[];
}

export interface AnthropicUserIntervention {
    human_turns: number;
    auto_turns: number;
    autonomy_rate: number;
    ht_per_edit: number;
}

export interface AnthropicWorkflowAutonomy {
    repeated_edit_rate: number;
    efficiency_score: number;
    sei?: {
        sei_score: number;
        accuracy: number;
        volume_tokens: number;
        interpretation: string;
    };
}

export interface AnthropicSessionConsistency {
    grade: 'S' | 'A' | 'B' | 'C';
    grade_breakdown: {
        efficiency: number;
        stability: number;
        precision: number;
        penalty: number;
        final_score: number;
    };
}

export interface AnthropicMetrics {
    skill_trigger: AnthropicSkillTrigger;
    tool_efficiency: AnthropicToolEfficiency;
    api_reliability: AnthropicApiReliability;
    user_intervention: AnthropicUserIntervention;
    workflow_autonomy: AnthropicWorkflowAutonomy;
    session_consistency: AnthropicSessionConsistency;
}

export interface AnthropicAggregate {
    avg_skill_trigger_rate: number;
    avg_spec_trigger_rate: number;
    avg_tool_calls_per_session: number;
    total_tool_errors: number;
    avg_autonomy_rate: number;
    avg_ht_per_edit: number;
    workflow_completion_rate: number;
    grade_consistency: number;
}

export interface UsageData {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
}

export interface Message {
    type: string;
    timestamp?: string;
    message?: {
        usage?: UsageData;
        content?: ContentBlock[] | string;
    };
    toolUseResult?: {
        file?: { filePath: string };
    };
    isMeta?: boolean;
    gitBranch?: string;
    content?: ContentBlock[] | string;
}

export interface ContentBlock {
    type: string;
    text?: string;
    name?: string;
    id?: string;
    input?: Record<string, unknown>;
    tool_use_id?: string;
    content?: string | ContentBlock[];
    is_error?: boolean;
}

export interface ToolUseDetail {
    name: string;
    detail?: string;
    question?: string;
    answer?: string;
}

export interface ProcessedMessage {
    id: number;
    type: 'user' | 'assistant';
    subtype?: 'human' | 'command' | 'continuation' | 'tool_result' | '';
    timestamp: string;
    content: string;
    usage?: UsageData;
    files_read: string[];
    tool_uses: ToolUseDetail[];
}

export interface Project {
    name: string;
    path: string;
    session_count: number;
}

export interface SessionSummary {
    session_id: string;
    project: string;
    start_time: string;
    end_time: string;
    git_branch: string;
    total_requests: number;
    avg_context_size: number;
    danger_level: 'optimal' | 'safe' | 'caution' | 'critical';
    limit_impact: number;
    total_context_tokens: number;
    total_output_tokens: number;
    // Quality metrics
    duplicate_read_rate: number;
    read_edit_ratio: number;
    repeated_edit_rate: number;
    tokens_per_edit: number;
    // SWE-agent metrics
    tool_error_rate: number;
    session_exit: 'clean' | 'forced' | 'unknown';
    efficiency_score: number;
    session_grade: 'S' | 'A' | 'B' | 'C';
    // Productivity metrics
    duration_minutes: number;
    spec_files_count: number;
    has_spec_context: boolean;
    // Turn decomposition
    human_turns: number;
    auto_turns: number;
    command_turns: number;
    human_turns_per_edit: number;
    // Advanced metrics
    spec_efficiency?: {
        sei_score: number;
        accuracy: number;
        volume_tokens: number;
        interpretation: string;
    };
    grade_breakdown?: {
        efficiency: number;
        stability: number;
        precision: number;
        penalty: number;
        final_score: number;
    };
    // Anthropic Skill Evaluation Framework
    anthropic_metrics: AnthropicMetrics;
}

export interface ScoreBreakdown {
    cache: number;
    tool_reliability: number;
    work_efficiency: number;
    termination: number;
    cost_efficiency: number;
}

export interface SessionDetail {
    session_id: string;
    project: string;
    start_time: string;
    end_time: string;
    git_branch: string;
    messages: ProcessedMessage[];
    summary: {
        total_requests: number;
        avg_context_size: number;
        danger_level: 'optimal' | 'safe' | 'caution' | 'critical';
        limit_impact: number;
        total_context_tokens: number;
        files_read: string[];
        spec_files_read: string[];
    };
    quality: {
        read_count: number;
        edit_count: number;
        read_edit_ratio: number;
        duplicate_read_rate: number;
        duplicate_files: { file: string; count: number }[];
        repeated_edit_rate: number;
        tokens_per_edit: number;
        tool_error_rate: number;
        cache_hit_rate: number;
        efficiency_score: number;
        session_grade: 'S' | 'A' | 'B' | 'C';
        session_exit: 'clean' | 'forced' | 'unknown';
        score_breakdown: ScoreBreakdown;
        error_details: { tool: string; error: string; count: number }[];
        spec_efficiency?: {
            sei_score: number;
            accuracy: number;
            volume_tokens: number;
            interpretation: string;
        };
        grade_breakdown?: {
            efficiency: number;
            stability: number;
            precision: number;
            penalty: number;
            final_score: number;
        };
    };
    // Anthropic Skill Evaluation Framework
    anthropic_metrics: AnthropicMetrics;
}

export interface AppConfig {
    claude_projects_dir: string;
    initialized?: boolean;
}

export interface HypothesisCheck {
    avg_turns_with_spec: number;
    avg_turns_without_spec: number;
    avg_human_turns_with_spec: number;
    avg_human_turns_without_spec: number;
    human_turn_improvement: number;
    avg_ht_per_edit_with_spec: number;
    avg_ht_per_edit_without_spec: number;
    normalized_improvement: number;
    avg_duration_with_spec: number;
    avg_duration_without_spec: number;
    sessions_with_spec: number;
    sessions_without_spec: number;
}

export interface AnalyticsSummary {
    total_sessions: number;
    total_projects: number;
    total_context_tokens: number;
    total_output_tokens: number;
    avg_context_size: number;
    danger_level: string;
    limit_impact: number;
    optimal_sessions: number;
    safe_sessions: number;
    caution_sessions: number;
    critical_sessions: number;
    grade_s: number;
    grade_a: number;
    grade_b: number;
    grade_c: number;
    avg_efficiency_score: number;
    avg_tool_error_rate: number;
    clean_exits: number;
    forced_exits: number;
    hypothesis_check: HypothesisCheck;
    // Anthropic Aggregate Metrics
    anthropic_aggregate: AnthropicAggregate;
}

export interface AnalyticsResponse {
    summary: AnalyticsSummary;
    projects: Project[];
    sessions: SessionSummary[];
}
