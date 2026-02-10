// ── Shared TypeScript types for the frontend ──

export interface Session {
    session_id: string
    project: string
    start_time: string
    end_time: string
    git_branch: string
    total_requests: number
    avg_context_size: number
    danger_level: 'optimal' | 'safe' | 'caution' | 'critical'
    limit_impact: number
    total_context_tokens: number
    total_output_tokens: number
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
    human_turns_per_edit: number
}

export interface Project {
    name: string
    path: string
    session_count: number
}

export interface HypothesisCheck {
    avg_turns_with_spec: number
    avg_turns_without_spec: number
    avg_human_turns_with_spec: number
    avg_human_turns_without_spec: number
    human_turn_improvement: number
    avg_ht_per_edit_with_spec: number
    avg_ht_per_edit_without_spec: number
    normalized_improvement: number
    avg_duration_with_spec: number
    avg_duration_without_spec: number
    sessions_with_spec: number
    sessions_without_spec: number
}

export interface Analytics {
    summary: {
        total_sessions: number
        total_projects: number
        total_context_tokens: number
        total_output_tokens: number
        avg_context_size: number
        danger_level: string
        limit_impact: number
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
}

export interface SessionDetailData {
    session_id: string
    project: string
    start_time: string
    end_time: string
    git_branch: string
    messages: Message[]
    summary: {
        total_requests: number
        avg_context_size: number
        danger_level: 'optimal' | 'safe' | 'caution' | 'critical'
        limit_impact: number
        total_context_tokens: number
        files_read: string[]
        spec_files_read: string[]
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
}

export interface AppConfig {
    claude_projects_dir: string
    initialized: boolean
    detected_path?: string
    detected?: boolean
}
