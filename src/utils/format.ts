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

export function shortenPath(path: string): string {
    const parts = path.split('/')
    if (parts.length <= 2) return path
    return parts.slice(-2).join('/')
}
