// ── Shared TypeScript types for the frontend ──

// ── Anthropic Skill Evaluation Framework Types ──

export interface AnthropicMetrics {
    skill_trigger: {
        cache_hit_rate: number
        spec_trigger_rate: number
        danger_level: 'optimal' | 'safe' | 'caution' | 'critical'
    }
    tool_efficiency: {
        read_edit_ratio: number
        tokens_per_edit: number
        duplicate_read_rate: number
        repeated_edit_rate: number
        total_tool_calls: number
    }
    api_reliability: {
        tool_error_rate: number
        tool_error_count: number
        session_exit: 'clean' | 'forced' | 'unknown'
        error_details?: { tool: string; error: string; count: number }[]
    }
    user_intervention: {
        human_turns: number
        auto_turns: number
        autonomy_rate: number
    }
    workflow_autonomy: {
        efficiency_score: number
        sei?: { sei_score: number; accuracy: number; volume_tokens: number; interpretation: string }
    }
    session_consistency: {
        grade: 'S' | 'A' | 'B' | 'C'
        grade_breakdown: {
            efficiency: number
            stability: number
            precision: number
            penalty: number
            final_score: number
        }
    }
}

export interface AnthropicAggregate {
    avg_skill_trigger_rate: number
    avg_spec_trigger_rate: number
    avg_tool_calls_per_session: number
    total_tool_errors: number
    avg_autonomy_rate: number
    workflow_completion_rate: number
    grade_consistency: number
}

export interface Session {
    session_id: string
    project: string
    model: string
    start_time: string
    end_time: string
    git_branch: string
    total_requests: number
    avg_context_size: number
    danger_level: 'optimal' | 'safe' | 'caution' | 'critical'
    total_context_tokens: number
    duplicate_read_rate: number
    read_edit_ratio: number
    repeated_edit_rate: number
    tokens_per_edit: number
    tool_error_rate: number
    session_exit: 'clean' | 'forced' | 'unknown'
    efficiency_score: number
    session_grade: 'S' | 'A' | 'B' | 'C'
    duration_minutes: number
    spec_files_count: number
    has_spec_context: boolean
    human_turns: number
    auto_turns: number
    command_turns: number
    edit_count: number
    anthropic_metrics: AnthropicMetrics
}

export interface Project {
    name: string
    path: string
    session_count: number
}

export interface HypothesisCheck {
    // HT/E: Human Turns per Edit (lower = more autonomous)
    hte_with_spec: number
    hte_without_spec: number
    hte_improvement: number
    // SEI: Spec Efficiency Index comparison
    avg_sei_with_spec: number
    avg_sei_without_spec: number
    // P99 autonomous duration (minutes)
    p99_duration_with_spec: number
    p99_duration_without_spec: number
    sessions_with_spec: number
    sessions_without_spec: number
}

export interface Analytics {
    summary: {
        total_sessions: number
        total_projects: number
        total_context_tokens: number
        avg_context_size: number
        danger_level: string
        optimal_sessions: number
        safe_sessions: number
        caution_sessions: number
        critical_sessions: number
        grade_s: number
        grade_a: number
        grade_b: number
        grade_c: number
        avg_efficiency_score: number
        avg_tool_error_rate: number
        clean_exits: number
        forced_exits: number
        hypothesis_check: HypothesisCheck
        anthropic_aggregate: AnthropicAggregate
    }
    projects: Project[]
    sessions: Session[]
}

export interface UsageData {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens: number
    cache_creation_input_tokens: number
}

export interface ToolUseDetail {
    name: string
    detail?: string
    question?: string
    answer?: string
    category?: 'read_spec' | 'read_code' | 'edit' | 'command' | 'search' | 'other'
}

export interface Message {
    id: number
    type: 'user' | 'assistant'
    subtype?: 'human' | 'command' | 'continuation' | 'tool_result' | ''
    timestamp: string
    content: string
    usage?: UsageData
    files_read: string[]
    tool_uses: ToolUseDetail[]
    skill_name?: string
}

export interface SessionDetailData {
    session_id: string
    project: string
    model: string
    start_time: string
    end_time: string
    git_branch: string
    messages: Message[]
    summary: {
        total_requests: number
        avg_context_size: number
        danger_level: 'optimal' | 'safe' | 'caution' | 'critical'
        total_context_tokens: number
        files_read: string[]
        spec_files_read: string[]
        skills_loaded?: { name: string; type: 'command' | 'spec_file'; path?: string }[]
    }
    quality?: {
        read_count: number
        edit_count: number
        read_edit_ratio: number
        duplicate_read_rate: number
        duplicate_files?: { file: string; count: number }[]
        repeated_edit_rate: number
        tokens_per_edit: number
        tool_error_rate: number
        cache_hit_rate: number
        efficiency_score: number
        session_grade: 'S' | 'A' | 'B' | 'C'
        session_exit: 'clean' | 'forced' | 'unknown'
        score_breakdown: {
            cache: number
            tool_reliability: number
            work_efficiency: number
            termination: number
            cost_efficiency: number
        }
        error_details?: { tool: string; error: string; count: number }[]
    }
    anthropic_metrics?: AnthropicMetrics
}

export interface AppConfig {
    claude_projects_dir: string
    initialized: boolean
    detected_path?: string
    detected?: boolean
}
