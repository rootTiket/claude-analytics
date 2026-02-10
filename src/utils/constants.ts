// ── Shared color constants and style mappings ──

export const COLORS = {
    blue: '#3182f6',
    green: '#03b26c',
    orange: '#f59e0b',
    red: '#f04452',
    purple: '#8b5cf6',
    gray: '#8b95a1'
} as const

export const DANGER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    optimal: { bg: '#e8f3ff', text: '#3182f6', label: '최적' },
    safe: { bg: '#e4f8ef', text: '#03b26c', label: '안전' },
    caution: { bg: '#fff8e6', text: '#f59e0b', label: '주의' },
    critical: { bg: '#ffebee', text: '#f04452', label: '위험' }
}

export const GRADE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    S: { bg: '#fef3c7', text: '#b45309', label: 'S' },
    A: { bg: '#dbeafe', text: '#1d4ed8', label: 'A' },
    B: { bg: '#d1fae5', text: '#047857', label: 'B' },
    C: { bg: '#f3f4f6', text: '#6b7280', label: 'C' }
}

export const TOOL_ICONS: Record<string, string> = {
    Read: '◻', Edit: '✎', Write: '➕', Bash: '▸',
    Grep: '⌕', Glob: '⊞', Task: '☰', TaskCreate: '➕',
    TaskUpdate: '⟳', TaskList: '☰', tool: '⚙'
}
