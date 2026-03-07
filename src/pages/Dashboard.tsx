// ── Dashboard Page ──
// Antigravity 스타일 리디자인: pill buttons, borderless cards, Inter font

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

import InfoTooltip from '../components/InfoTooltip'
import GradeBadge from '../components/badges/GradeBadge'
import DangerBadge from '../components/badges/DangerBadge'
import { formatNumber, formatDate, shortenProjectPath } from '../utils/format'
import type { Analytics, Session, Project } from '../types'

const HEALTH_COLORS = ['#1a73e8', '#1e8e3e', '#e37400', '#d93025']

export default function Dashboard() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const [analytics, setAnalytics] = useState<Analytics | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [projects, setProjects] = useState<Project[]>([])
    const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project') || '')
    const [dateFrom, setDateFrom] = useState<string>(searchParams.get('from') || '')
    const [dateTo, setDateTo] = useState<string>(searchParams.get('to') || '')

    const fetchAnalytics = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (selectedProject) params.set('project', selectedProject)
            if (dateFrom) params.set('from', dateFrom)
            if (dateTo) params.set('to', dateTo)
            const res = await fetch(`/api/analytics?${params}`)
            if (!res.ok) throw new Error('Failed to fetch analytics')
            const data = await res.json()
            setAnalytics(data)
            setProjects(data.projects || [])
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setLoading(false)
        }
    }, [selectedProject, dateFrom, dateTo])

    useEffect(() => { fetchAnalytics() }, [fetchAnalytics])
    useEffect(() => {
        const interval = setInterval(fetchAnalytics, 30000)
        return () => clearInterval(interval)
    }, [fetchAnalytics])

    useEffect(() => {
        const params = new URLSearchParams()
        if (selectedProject) params.set('project', selectedProject)
        if (dateFrom) params.set('from', dateFrom)
        if (dateTo) params.set('to', dateTo)
        setSearchParams(params)
    }, [selectedProject, dateFrom, dateTo, setSearchParams])

    if (loading && !analytics) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div className="loading-spinner" />
        </div>
    }

    if (error) {
        return <div style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#d93025', marginBottom: 12 }}>오류 발생</div>
            <p style={{ color: '#5f6368', marginBottom: 20 }}>{error}</p>
            <button onClick={() => window.location.reload()} className="btn btn-primary">새로고침</button>
        </div>
    }

    if (!analytics) return null
    const { summary } = analytics

    // Chart data
    const healthData = [
        { name: '최적', value: summary.optimal_sessions, color: '#1a73e8' },
        { name: '안전', value: summary.safe_sessions, color: '#1e8e3e' },
        { name: '주의', value: summary.caution_sessions, color: '#e37400' },
        { name: '위험', value: summary.critical_sessions, color: '#d93025' }
    ].filter(d => d.value > 0)

    const gradeData = [
        { name: 'S', value: summary.grade_s, fill: '#e37400' },
        { name: 'A', value: summary.grade_a, fill: '#1a73e8' },
        { name: 'B', value: summary.grade_b, fill: '#1e8e3e' },
        { name: 'C', value: summary.grade_c, fill: '#9aa0a6' }
    ].filter(d => d.value > 0)

    // Compute hypothesis metrics
    const hyp = summary.hypothesis_check
    const contextData = analytics.sessions
        ?.filter((s: Session) => s.total_context_tokens > 0)
        .slice(0, 20)
        .map((s: Session) => ({
            name: formatDate(s.start_time),
            ctx: Math.round(s.avg_context_size / 1000)
        })).reverse() || []

    return (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
            {/* ── Filters ── */}
            <div className="card" style={{
                padding: '14px 20px', marginBottom: 24, display: 'flex', gap: 10,
                alignItems: 'center', flexWrap: 'wrap',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--bg-primary)',
            }}>
                <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
                    style={{
                        padding: '8px 32px 8px 14px', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-pill)', fontSize: 13, background: '#fff',
                        fontFamily: 'inherit', appearance: 'none',
                        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235f6368' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 10px center',
                    }}>
                    <option value="">전체 프로젝트</option>
                    {projects.map(p => <option key={p.path} value={p.path}>{p.name} ({p.session_count})</option>)}
                </select>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    style={{
                        padding: '8px 14px', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-pill)', fontSize: 13, fontFamily: 'inherit',
                    }} />
                <span style={{ color: '#9aa0a6', fontSize: 13, fontWeight: 500 }}>—</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    style={{
                        padding: '8px 14px', border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-pill)', fontSize: 13, fontFamily: 'inherit',
                    }} />
                <button onClick={fetchAnalytics}
                    style={{
                        padding: '8px 20px', background: '#202124', color: '#fff',
                        border: 'none', borderRadius: 'var(--radius-pill)',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 150ms ease',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#3c4043')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#202124')}
                >
                    조회
                </button>
            </div>

            {/* ── Anthropic Summary Cards ── */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
                {/* Q1: Skill Trigger Rate */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 13, color: '#9aa0a6', marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                        Q1. 스킬 트리거율
                        <InfoTooltip text="관련 쿼리의 90%에서 스킬이 트리거되어야 합니다. 캐시 히트율 + 스펙 컨텍스트 활용률" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 32, fontWeight: 700, color: '#202124', letterSpacing: '-0.03em' }}>
                            {summary.anthropic_aggregate.avg_skill_trigger_rate}%
                        </span>
                        <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                            background: summary.anthropic_aggregate.avg_skill_trigger_rate >= 70 ? '#e6f4ea' : '#fef7e0',
                            color: summary.anthropic_aggregate.avg_skill_trigger_rate >= 70 ? '#1e8e3e' : '#e37400'
                        }}>캐시 히트</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 6 }}>
                        스펙 활용률 {summary.anthropic_aggregate.avg_spec_trigger_rate}% · {summary.total_sessions}개 세션
                    </div>
                </div>

                {/* Q2+Q3: Tool Efficiency & API Reliability */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 13, color: '#9aa0a6', marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                        Q2·Q3. 도구 효율 & API 안정
                        <InfoTooltip text="X도구 호출로 완료 + 워크플로당 API 실패 0회 목표" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 32, fontWeight: 700, color: '#202124', letterSpacing: '-0.03em' }}>
                            {summary.anthropic_aggregate.avg_tool_calls_per_session}
                        </span>
                        <span style={{ fontSize: 13, color: '#9aa0a6' }}>평균 도구 호출</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 6 }}>
                        총 에러 {summary.anthropic_aggregate.total_tool_errors}회 · 에러율 {summary.avg_tool_error_rate}%
                    </div>
                </div>

                {/* Q4+Q5: User Intervention & Workflow Autonomy */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 13, color: '#9aa0a6', marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                        Q4·Q5. 자율 실행 & 워크플로우
                        <InfoTooltip text="사용자 개입 없이 워크플로우가 자립적으로 완료되어야 합니다" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 32, fontWeight: 700, color: '#202124', letterSpacing: '-0.03em' }}>
                            {summary.anthropic_aggregate.avg_autonomy_rate}%
                        </span>
                        <span style={{
                            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                            background: summary.anthropic_aggregate.avg_autonomy_rate >= 60 ? '#e6f4ea' : '#fef7e0',
                            color: summary.anthropic_aggregate.avg_autonomy_rate >= 60 ? '#1e8e3e' : '#e37400'
                        }}>자율 실행률</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 6 }}>
                        워크플로우 완료율 {summary.anthropic_aggregate.workflow_completion_rate}%
                    </div>
                </div>
            </div>

            {/* ── Charts Row ── */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
                {/* Session Health Pie */}
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#202124', margin: '0 0 16px', letterSpacing: '-0.01em' }}>Q1. 스킬 트리거 현황</h3>
                    <div style={{ height: 160 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={healthData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                                    paddingAngle={3} strokeWidth={0}>
                                    {healthData.map((_e, i) => <Cell key={i} fill={HEALTH_COLORS[i % HEALTH_COLORS.length]} />)}
                                </Pie>
                                <Tooltip formatter={(value?: number) => [`${value}개`, '']}
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(32,33,36,0.1)', fontSize: 13 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center', marginTop: 10 }}>
                        {healthData.map(d => (
                            <span key={d.name} style={{ fontSize: 12, color: '#5f6368', display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                                {d.name} {d.value}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Grade Distribution */}
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#202124', margin: '0 0 16px', letterSpacing: '-0.01em' }}>Q6. 일관성 분포</h3>
                    <div style={{ height: 160 }}>
                        <ResponsiveContainer>
                            <BarChart data={gradeData} barSize={32}>
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5f6368' }} axisLine={false} tickLine={false} />
                                <YAxis hide />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {gradeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                </Bar>
                                <Tooltip formatter={(value?: number) => [`${value}개`, '']}
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(32,33,36,0.1)', fontSize: 13 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Context Size Trend */}
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#202124', margin: '0 0 16px', letterSpacing: '-0.01em' }}>컨텍스트 크기 추이 (K)</h3>
                    <div style={{ height: 160 }}>
                        <ResponsiveContainer>
                            <BarChart data={contextData} barSize={14}>
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9aa0a6' }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={40} />
                                <YAxis hide />
                                <Bar dataKey="ctx" fill="#1a73e8" radius={[4, 4, 0, 0]} opacity={0.85} />
                                <Tooltip formatter={(value?: number) => [`${value}K`, '평균 컨텍스트']}
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(32,33,36,0.1)', fontSize: 13 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ── Spec 자율성 효과 (HT/E · SEI · P99) ── */}
            {(hyp.sessions_with_spec > 0 || hyp.sessions_without_spec > 0) && (
                <div className="card" style={{ padding: 28, marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: '#202124', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '-0.01em' }}>
                        Q4·Q5. Spec 자율성 효과 (HT/E · SEI · P99)
                        <InfoTooltip text="Anthropic 프레임워크 기반: HT/E(편집당 인간 턴 — 낮을수록 자율적), SEI(Spec 효율성 지수 — 높을수록 효율적), P99(99th percentile 자율 실행 시간 — 길수록 신뢰)" />
                    </h3>

                    <div className="grid-3" style={{ gap: 16 }}>
                        {/* HT/E: Human Turns per Edit */}
                        <div style={{ background: '#f8f9fa', borderRadius: 16, padding: 20 }}>
                            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                                HT/E 비교 (편집당 인간 턴)
                                <InfoTooltip text={`코드 수정 1회당 사용자가 개입한 횟수.\nSpec 있음: ${hyp.hte_with_spec}\nSpec 없음: ${hyp.hte_without_spec}\n\n낮을수록 에이전트가 자율적으로 작업 (양수 = 개선)`} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{
                                    fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
                                    color: hyp.hte_improvement > 0 ? '#1e8e3e' : hyp.hte_improvement < 0 ? '#d93025' : '#202124'
                                }}>
                                    {hyp.hte_improvement > 0 ? '+' : ''}{hyp.hte_improvement}%
                                </span>
                                <span style={{
                                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                                    background: hyp.hte_improvement > 0 ? '#e6f4ea' : hyp.hte_improvement < 0 ? '#fce8e6' : '#f1f3f4',
                                    color: hyp.hte_improvement > 0 ? '#1e8e3e' : hyp.hte_improvement < 0 ? '#d93025' : '#9aa0a6'
                                }}>
                                    {hyp.hte_improvement > 0 ? '↓ 감독 감소' : hyp.hte_improvement < 0 ? '↑ 감독 증가' : '동일'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                                <span style={{ fontSize: 11, color: '#1a73e8' }}>Spec: {hyp.hte_with_spec}</span>
                                <span style={{ fontSize: 11, color: '#9aa0a6' }}>비Spec: {hyp.hte_without_spec}</span>
                            </div>
                        </div>

                        {/* SEI: Spec Efficiency Index */}
                        <div style={{ background: '#f8f9fa', borderRadius: 16, padding: 20 }}>
                            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                                SEI 비교 (Spec 효율성 지수)
                                <InfoTooltip text={`Spec 문서를 에이전트가 얼마나 효율적으로 활용했는지.\nSpec 있음: ${hyp.avg_sei_with_spec}\nSpec 없음: ${hyp.avg_sei_without_spec}\n\nSEI > 25: Elite 워크플로우`} />
                            </div>
                            <div style={{ display: 'flex', gap: 24 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 2 }}>Spec 있음</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1a73e8', letterSpacing: '-0.03em' }}>
                                        {hyp.avg_sei_with_spec}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 2 }}>Spec 없음</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#9aa0a6', letterSpacing: '-0.03em' }}>
                                        {hyp.avg_sei_without_spec}
                                    </div>
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 8 }}>
                                높을수록 Spec 활용 효율적 (≥25 Elite)
                            </div>
                        </div>

                        {/* P99 Autonomous Duration */}
                        <div style={{ background: '#f8f9fa', borderRadius: 16, padding: 20 }}>
                            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                                P99 자율 실행 시간 (분)
                                <InfoTooltip text={`99th percentile 세션 시간 — 가장 오래 자율 실행된 상위 세션.\n평균이 아닌 tail-end 추적이 진정한 자율성 진전을 보여줍니다.\n\nSpec 있음: ${hyp.p99_duration_with_spec}분\nSpec 없음: ${hyp.p99_duration_without_spec}분`} />
                            </div>
                            <div style={{ display: 'flex', gap: 24 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 2 }}>Spec 있음</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1a73e8', letterSpacing: '-0.03em' }}>
                                        {hyp.p99_duration_with_spec}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 2 }}>Spec 없음</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#9aa0a6', letterSpacing: '-0.03em' }}>
                                        {hyp.p99_duration_without_spec}
                                    </div>
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 8 }}>
                                Spec: {hyp.sessions_with_spec}개 / 비Spec: {hyp.sessions_without_spec}개
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Sessions Table ── */}
            <div className="card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#202124', margin: '0 0 20px', letterSpacing: '-0.01em' }}>
                    최근 세션
                </h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>날짜</th>
                                <th>프로젝트</th>
                                <th>등급</th>
                                <th>효율</th>
                                <th>자율률</th>
                                <th style={{ textAlign: 'right' }}>컨텍스트</th>
                                <th>상태</th>
                                <th>에러율</th>
                                <th>종료</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analytics.sessions.map((session: Session) => (
                                <tr key={session.session_id}
                                    onClick={() => navigate(`/session/${session.session_id}?project=${session.project}`)}
                                    style={{ cursor: 'pointer' }}>
                                    <td>{formatDate(session.start_time)}</td>
                                    <td title={session.project.replace(/-/g, '/').replace(/^\//, '')} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'help' }}>
                                        {shortenProjectPath(session.project)}
                                    </td>
                                    <td><GradeBadge grade={session.session_grade} /></td>
                                    <td>
                                        <span style={{
                                            fontWeight: 600,
                                            color: session.efficiency_score >= 70 ? '#1e8e3e'
                                                : session.efficiency_score >= 40 ? '#e37400' : '#d93025'
                                        }}>
                                            {session.efficiency_score}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            fontSize: 12, fontWeight: 600,
                                            color: session.anthropic_metrics.user_intervention.autonomy_rate >= 60 ? '#1e8e3e'
                                                : session.anthropic_metrics.user_intervention.autonomy_rate >= 30 ? '#e37400' : '#d93025'
                                        }}>
                                            {session.anthropic_metrics.user_intervention.autonomy_rate}%
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontFamily: 'ui-monospace, monospace', fontSize: 12, letterSpacing: '-0.02em' }}>
                                        {formatNumber(session.avg_context_size)}
                                    </td>
                                    <td><DangerBadge level={session.danger_level} /></td>
                                    <td>
                                        <span style={{
                                            fontFamily: 'ui-monospace, monospace', fontSize: 12,
                                            color: session.tool_error_rate > 5 ? '#d93025' : '#5f6368'
                                        }}>
                                            {session.tool_error_rate}%
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            fontSize: 11, fontWeight: 600,
                                            padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                                            background: session.session_exit === 'clean' ? '#e6f4ea'
                                                : session.session_exit === 'forced' ? '#fce8e6' : '#f1f3f4',
                                            color: session.session_exit === 'clean' ? '#1e8e3e'
                                                : session.session_exit === 'forced' ? '#d93025' : '#9aa0a6'
                                        }}>
                                            {session.session_exit === 'clean' ? '정상' : session.session_exit === 'forced' ? '강제' : '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
