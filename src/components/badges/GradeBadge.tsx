// ── Grade Badge Component ──

import { GRADE_STYLES } from '../../utils/constants'

interface GradeBadgeProps {
    grade: string
    size?: 'sm' | 'md'
}

export default function GradeBadge({ grade, size = 'sm' }: GradeBadgeProps) {
    const style = GRADE_STYLES[grade] || GRADE_STYLES.C
    const sz = size === 'md' ? { padding: '4px 10px', fontSize: 13 } : { padding: '2px 8px', fontSize: 11 }

    return (
        <span style={{
            ...sz,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            borderRadius: 4,
            fontWeight: 600,
            background: style.bg,
            color: style.text,
            letterSpacing: '0.02em'
        }}>
            {style.label}
        </span>
    )
}
