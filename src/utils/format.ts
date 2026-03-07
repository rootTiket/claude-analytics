// ── Shared formatting utilities ──

export function formatNumber(num: number): string {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M'
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K'
    return num.toLocaleString()
}

export function formatDate(dateStr: string): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
    })
}

export function formatDateFull(dateStr: string): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export function formatTime(dateStr: string): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit'
    })
}

export function shortenPath(fullPath: string, maxSegments = 3): string {
    const parts = fullPath.split('/')
    if (parts.length <= maxSegments) return fullPath
    return '…/' + parts.slice(-maxSegments).join('/')
}

/** Convert hashed project path (e.g. "-Users-igeunpyo-myproject") to last folder name */
export function shortenProjectPath(projectPath: string): string {
    // Remove leading dash, convert dashes to slashes
    const decoded = projectPath.replace(/^-/, '').replace(/-/g, '/')
    const parts = decoded.split('/').filter(Boolean)
    if (parts.length === 0) return projectPath
    // Return last meaningful segment (skip common prefixes like Users/username)
    return parts[parts.length - 1] || projectPath
}
