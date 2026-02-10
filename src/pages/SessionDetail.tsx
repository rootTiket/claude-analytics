// ── Session Detail Page ──
// Antigravity 스타일 리디자인: borderless cards, pill badges, Inter font

import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

import InfoTooltip from '../components/InfoTooltip'
import GradeBadge from '../components/badges/GradeBadge'
import DangerBadge from '../components/badges/DangerBadge'
import { formatNumber, formatDateFull, shortenPath } from '../utils/format'
import { TOOL_ICONS } from '../utils/constants'
import type { SessionDetailData } from '../types'

export default function SessionDetail() {
    const { id } = useParams<{ id: string }>()
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()

    const [session, setSession] = useState<SessionDetailData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set())

    useEffect(() => {
        const fetchSession = async () => {
            try {
                setLoading(true)
                const project = searchParams.get('project') || ''
                const res = await fetch(`/api/sessions/${id}?project=${encodeURIComponent(project)}`)
                if (!res.ok) throw new Error('Session not found')
                setSession(await res.json())
            } catch (err) {
                setError((err as Error).message)
            } finally {
                setLoading(false)
            }
        }
        fetchSession()
    }, [id, searchParams])

    const toggleExpanded = (msgId: number) => {
        setExpandedMessages(prev => {
            const next = new Set(prev)
            if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
            return next
        })
    }

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="loading-spinner" /></div>
    if (error || !session) return <div style={{ padding: 60, textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#d93025', marginBottom: 12 }}>오류</div>
        <p style={{ color: '#5f6368' }}>{error}</p>
    </div>

    const quality = session.quality

    // Context growth chart data
    let runningContext = 0
    const contextGrowth = session.messages
        .filter(m => m.type === 'assistant' && m.usage)
        .map((m, i) => {
            runningContext += (m.usage?.input_tokens || 0) + (m.usage?.cache_read_input_tokens || 0)
            return { turn: i + 1, ctx: Math.round(runningContext / 1000), name: `Turn ${i + 1}` }
        })


    return (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
            {/* ── Back Button + Header ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <button onClick={() => navigate(-1)}
                    style={{
                        padding: '8px 18px', border: '1px solid #e8eaed', borderRadius: 'var(--radius-pill)',
                        background: '#fff', fontSize: 13, cursor: 'pointer', color: '#5f6368',
                        fontFamily: 'inherit', fontWeight: 500,
                        transition: 'all 150ms ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#f1f3f4'; e.currentTarget.style.borderColor = '#dadce0' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e8eaed' }}
                >
                    ← 돌아가기
                </button>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: '#202124', margin: 0, letterSpacing: '-0.02em' }}>
                        세션 상세
                    </h2>
                    <span style={{ fontSize: 12, color: '#9aa0a6', fontFamily: 'ui-monospace, monospace' }}>
                        {session.session_id}
                    </span>
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid-4" style={{ marginBottom: 24 }}>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 6, fontWeight: 500 }}>시간</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#202124' }}>{formatDateFull(session.start_time)}</div>
                    <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 2 }}>→ {formatDateFull(session.end_time)}</div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 6, fontWeight: 500 }}>등급</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <GradeBadge grade={quality?.session_grade || 'C'} size="md" />
                        <span style={{ fontSize: 13, color: '#9aa0a6' }}>효율: {quality?.efficiency_score || 0}</span>
                    </div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 6, fontWeight: 500 }}>컨텍스트</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: '#202124', letterSpacing: '-0.03em' }}>
                            {formatNumber(session.summary.avg_context_size)}
                        </span>
                        <DangerBadge level={session.summary.danger_level} />
                    </div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 6, fontWeight: 500 }}>종료</div>
                    <div style={{
                        fontSize: 13, fontWeight: 600,
                        display: 'inline-flex', padding: '4px 12px', borderRadius: 'var(--radius-pill)',
                        background: quality?.session_exit === 'clean' ? '#e6f4ea'
                            : quality?.session_exit === 'forced' ? '#fce8e6' : '#f1f3f4',
                        color: quality?.session_exit === 'clean' ? '#1e8e3e'
                            : quality?.session_exit === 'forced' ? '#d93025' : '#9aa0a6'
                    }}>
                        {quality?.session_exit === 'clean' ? '정상 종료' : quality?.session_exit === 'forced' ? '강제 종료' : '알 수 없음'}
                    </div>
                </div>
            </div>

            {/* ── Quality Metrics ── */}
            {quality && (
                <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: '#202124', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
                        품질 지표
                    </h3>
                    <div className="grid-4" style={{ gap: 12 }}>
                        <MetricBox label="R/E 비율" value={quality.read_edit_ratio}
                            sub={`Read ${quality.read_count} / Edit ${quality.edit_count}`}
                            tooltip="파일 읽기 횟수 / 편집 횟수. 3-20이 이상적" />
                        <MetricBox label="중복 읽기율" value={`${quality.duplicate_read_rate}%`}
                            sub={`도구 에러율 ${quality.tool_error_rate}%`}
                            tooltip="같은 파일을 여러 번 읽은 비율. 낮을수록 좋음" />
                        <MetricBox label="캐시 적중률" value={`${quality.cache_hit_rate}%`}
                            sub={`Edit당 토큰 ${formatNumber(quality.tokens_per_edit)}`}
                            tooltip="캐시에서 읽은 토큰 비율. 높을수록 좋음" />
                        <MetricBox label="반복 편집율" value={`${quality.repeated_edit_rate}%`}
                            sub={`토큰/Edit ${formatNumber(quality.tokens_per_edit)}`}
                            tooltip="같은 파일을 여러 번 편집한 비율. 낮을수록 좋음" />
                    </div>

                    {/* Score breakdown */}
                    {quality.score_breakdown && (
                        <div style={{ marginTop: 20, padding: '16px 20px', background: '#f8f9fa', borderRadius: 16 }}>
                            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 10, fontWeight: 500 }}>점수 상세</div>
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                {[
                                    { name: '캐시', val: quality.score_breakdown.cache, max: 30 },
                                    { name: '도구 안정', val: quality.score_breakdown.tool_reliability, max: 20 },
                                    { name: '작업 효율', val: quality.score_breakdown.work_efficiency, max: 25 },
                                    { name: '종료', val: quality.score_breakdown.termination, max: 10 },
                                    { name: '비용 효율', val: quality.score_breakdown.cost_efficiency, max: 15 }
                                ].map(item => (
                                    <div key={item.name} style={{ fontSize: 13 }}>
                                        <span style={{ color: '#9aa0a6' }}>{item.name}: </span>
                                        <span style={{
                                            fontWeight: 600,
                                            color: item.val >= item.max * 0.7 ? '#1e8e3e' : item.val >= item.max * 0.4 ? '#e37400' : '#d93025'
                                        }}>
                                            {item.val}/{item.max}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error details */}
                    {quality.error_details && quality.error_details.length > 0 && (
                        <div style={{ marginTop: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#d93025', marginBottom: 8 }}>에러 상세</div>
                            {quality.error_details.map((err, i) => (
                                <div key={i} style={{ fontSize: 12, padding: '8px 0', borderBottom: '1px solid #f1f3f4', display: 'flex', gap: 8 }}>
                                    <span style={{ color: '#9aa0a6', minWidth: 60 }}>{err.tool}</span>
                                    <span style={{ color: '#d93025', fontWeight: 600 }}>×{err.count}</span>
                                    <span style={{ color: '#5f6368', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {err.error}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Context Growth Chart ── */}
            {contextGrowth.length > 0 && (
                <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: '#202124', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
                        컨텍스트 증가 추이 (K tokens)
                    </h3>
                    <div style={{ height: 200 }}>
                        <ResponsiveContainer>
                            <BarChart data={contextGrowth} barSize={Math.max(4, Math.min(20, 600 / contextGrowth.length))}>
                                <XAxis dataKey="turn" tick={{ fontSize: 10, fill: '#9aa0a6' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#9aa0a6' }} axisLine={false} tickLine={false} />
                                <Bar dataKey="ctx" radius={[4, 4, 0, 0]}>
                                    {contextGrowth.map((d, i) => (
                                        <Cell key={i} fill={
                                            d.ctx < 10 ? '#1a73e8' : d.ctx < 20 ? '#1e8e3e' : d.ctx < 50 ? '#e37400' : '#d93025'
                                        } opacity={0.85} />
                                    ))}
                                </Bar>
                                <Tooltip formatter={(value?: number) => [`${value}K`, '누적 컨텍스트']}
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(32,33,36,0.1)', fontSize: 13 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* ── Files Read ── */}
            {session.summary.files_read.length > 0 && (
                <div className="card" style={{ padding: 24, marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: '#202124', margin: '0 0 16px', letterSpacing: '-0.01em' }}>
                        읽은 파일 ({session.summary.files_read.length})
                        {session.summary.spec_files_read.length > 0 && (
                            <span style={{ fontSize: 12, fontWeight: 500, color: '#1a73e8', marginLeft: 8 }}>
                                Spec {session.summary.spec_files_read.length}개
                            </span>
                        )}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {session.summary.files_read.map((f, i) => {
                            const isSpec = f.includes('.claude/') || f.includes('CLAUDE.md')
                            return (
                                <span key={i} style={{
                                    fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                                    background: isSpec ? '#e8f0fe' : '#f1f3f4',
                                    color: isSpec ? '#1a73e8' : '#5f6368',
                                    fontFamily: 'ui-monospace, monospace'
                                }}>
                                    {shortenPath(f)}
                                </span>
                            )
                        })}
                    </div>

                    {/* Duplicate files */}
                    {quality?.duplicate_files && quality.duplicate_files.length > 0 && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f3f4' }}>
                            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 8, fontWeight: 500 }}>중복 읽기</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {quality.duplicate_files.map((d, i) => (
                                    <span key={i} style={{
                                        fontSize: 11, padding: '4px 10px', borderRadius: 'var(--radius-pill)',
                                        background: '#fef7e0', color: '#e37400',
                                        fontFamily: 'ui-monospace, monospace'
                                    }}>
                                        {d.file} ×{d.count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Conversation Timeline ── */}
            <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#202124', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
                    대화 타임라인 ({session.messages.length} 메시지)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {session.messages.map(msg => {
                        const isUser = msg.type === 'user'
                        const isExpanded = expandedMessages.has(msg.id)
                        const isLong = msg.content.length > 300
                        const displayContent = isLong && !isExpanded ? msg.content.substring(0, 300) + '...' : msg.content

                        // Subtype label
                        let subtypeLabel = ''
                        if (msg.subtype === 'command') subtypeLabel = '명령어'
                        else if (msg.subtype === 'continuation') subtypeLabel = '이어하기'
                        else if (msg.subtype === 'tool_result') subtypeLabel = '도구 결과'

                        return (
                            <div key={msg.id} style={{
                                padding: '14px 18px', borderRadius: 16,
                                background: isUser ? '#f8f9fa' : '#fff',
                                border: `1px solid ${isUser ? '#e8eaed' : '#f1f3f4'}`,
                                borderLeft: `3px solid ${isUser ? '#1a73e8' : '#1e8e3e'}`,
                                transition: 'box-shadow 150ms ease',
                            }}>
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <span style={{
                                        fontSize: 11, fontWeight: 700, letterSpacing: '0.03em',
                                        color: isUser ? '#1a73e8' : '#1e8e3e',
                                        textTransform: 'uppercase'
                                    }}>
                                        {isUser ? 'User' : 'Assistant'}
                                    </span>
                                    {subtypeLabel && (
                                        <span style={{
                                            fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-pill)',
                                            background: '#e8eaed', color: '#5f6368', fontWeight: 500
                                        }}>
                                            {subtypeLabel}
                                        </span>
                                    )}
                                    {msg.timestamp && (
                                        <span style={{ fontSize: 10, color: '#9aa0a6', marginLeft: 'auto' }}>
                                            {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                {displayContent && (
                                    <div style={{
                                        fontSize: 13, color: '#3c4043', lineHeight: 1.7,
                                        whiteSpace: 'pre-wrap', wordBreak: 'break-word'
                                    }}>
                                        {displayContent}
                                    </div>
                                )}
                                {isLong && (
                                    <button onClick={() => toggleExpanded(msg.id)} style={{
                                        marginTop: 6, padding: '4px 12px', border: 'none',
                                        background: '#e8f0fe', borderRadius: 'var(--radius-pill)',
                                        color: '#1a73e8', fontSize: 12, cursor: 'pointer', fontWeight: 600
                                    }}>
                                        {isExpanded ? '접기' : '전체 보기'}
                                    </button>
                                )}

                                {/* Tool uses */}
                                {msg.tool_uses.length > 0 && (
                                    <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {msg.tool_uses.map((tool, i) => (
                                            <span key={i} style={{
                                                fontSize: 11, padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                                                background: '#e8f0fe', color: '#1a73e8',
                                                fontFamily: 'ui-monospace, monospace',
                                                display: 'inline-flex', alignItems: 'center', gap: 4
                                            }}>
                                                <span style={{ fontSize: 10 }}>{TOOL_ICONS[tool.name] || TOOL_ICONS.tool}</span>
                                                {tool.name}
                                                {tool.detail && (
                                                    <span style={{ color: '#9aa0a6', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                                        {shortenPath(tool.detail)}
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* Files read */}
                                {msg.files_read.length > 0 && (
                                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {msg.files_read.map((f, i) => {
                                            const isSpec = f.includes('.claude/') || f.includes('CLAUDE.md')
                                            return (
                                                <span key={i} style={{
                                                    fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius-pill)',
                                                    background: isSpec ? '#e8f0fe' : '#f1f3f4',
                                                    color: isSpec ? '#1a73e8' : '#9aa0a6',
                                                    fontFamily: 'ui-monospace, monospace'
                                                }}>
                                                    {shortenPath(f)}
                                                </span>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Usage info */}
                                {msg.usage && (
                                    <div style={{ marginTop: 8, fontSize: 10, color: '#9aa0a6' }}>
                                        In: {formatNumber(msg.usage.input_tokens)} / Out: {formatNumber(msg.usage.output_tokens)}
                                        {msg.usage.cache_read_input_tokens > 0 && ` / Cache: ${formatNumber(msg.usage.cache_read_input_tokens)}`}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ── Small helper components ──

function MetricBox({ label, value, sub, tooltip }: { label: string; value: string | number; sub?: string; tooltip?: string }) {
    return (
        <div style={{ background: '#f8f9fa', borderRadius: 16, padding: '14px 18px' }}>
            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 6, display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                {label}
                {tooltip && <InfoTooltip text={tooltip} />}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#202124', letterSpacing: '-0.03em' }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 4 }}>{sub}</div>}
        </div>
    )
}
