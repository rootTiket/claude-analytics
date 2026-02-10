// ── Dashboard Page ──
// Antigravity 스타일 리디자인: pill buttons, borderless cards, Inter font

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

import InfoTooltip from '../components/InfoTooltip'
import GradeBadge from '../components/badges/GradeBadge'
import DangerBadge from '../components/badges/DangerBadge'
import { formatNumber, formatDate } from '../utils/format'
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

            {/* ── Summary Cards ── */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
                {/* Session Count */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 13, color: '#9aa0a6', marginBottom: 8, fontWeight: 500 }}>세션</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#202124', letterSpacing: '-0.03em' }}>{summary.total_sessions}</div>
                    <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 6 }}>{summary.total_projects}개 프로젝트</div>
                </div>

                {/* Avg Efficiency */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 13, color: '#9aa0a6', marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                        평균 효율 점수
                        <InfoTooltip text="캐시 적중률, 도구 안정성, 작업 효율성 등을 종합한 0-100점 점수" />
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#202124', letterSpacing: '-0.03em' }}>{summary.avg_efficiency_score}</div>
                    <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 6 }}>
                        정상 종료율 {summary.total_sessions > 0 ? Math.round(summary.clean_exits / summary.total_sessions * 100) : 0}%
                    </div>
                </div>

                {/* Context Size */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontSize: 13, color: '#9aa0a6', marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                        평균 컨텍스트
                        <InfoTooltip text="요청당 평균 전송된 컨텍스트 토큰 수. 적을수록 효율적" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 32, fontWeight: 700, color: '#202124', letterSpacing: '-0.03em' }}>
                            {formatNumber(summary.avg_context_size)}
                        </span>
                        <DangerBadge level={summary.danger_level} size="md" />
                    </div>
                    <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 6 }}>
                        에러율 {summary.avg_tool_error_rate}%
                    </div>
                </div>
            </div>

            {/* ── Charts Row ── */}
            <div className="grid-3" style={{ marginBottom: 24 }}>
                {/* Session Health Pie */}
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#202124', margin: '0 0 16px', letterSpacing: '-0.01em' }}>세션 상태 분포</h3>
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
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#202124', margin: '0 0 16px', letterSpacing: '-0.01em' }}>등급 분포</h3>
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

            {/* ── Spec 컨텍스트 효과 분석 ── */}
            {(hyp.sessions_with_spec > 0 || hyp.sessions_without_spec > 0) && (
                <div className="card" style={{ padding: 28, marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: '#202124', margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '-0.01em' }}>
                        Spec 컨텍스트 효과 분석
                        <InfoTooltip text=".claude/ 또는 CLAUDE.md 파일이 있는 세션과 없는 세션의 생산성을 비교 분석합니다" />
                    </h3>

                    <div className="grid-3" style={{ gap: 16 }}>
                        {/* Productivity improvement */}
                        <div style={{ background: '#f8f9fa', borderRadius: 16, padding: 20 }}>
                            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                                생산성 변화
                                <InfoTooltip text={`Edit당 사용자 개입 횟수 기준.\nSpec 있음: ${hyp.avg_ht_per_edit_with_spec}회\nSpec 없음: ${hyp.avg_ht_per_edit_without_spec}회\n\n양수(+) = Spec 사용 시 더 효율적 (좋음)\n음수(-) = Spec 없이 더 효율적`} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                <span style={{
                                    fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
                                    color: hyp.normalized_improvement > 0 ? '#1e8e3e' : hyp.normalized_improvement < 0 ? '#d93025' : '#202124'
                                }}>
                                    {hyp.normalized_improvement > 0 ? '+' : ''}{hyp.normalized_improvement}%
                                </span>
                                <span style={{
                                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-pill)',
                                    background: hyp.normalized_improvement > 0 ? '#e6f4ea' : '#fce8e6',
                                    color: hyp.normalized_improvement > 0 ? '#1e8e3e' : '#d93025'
                                }}>
                                    {hyp.normalized_improvement > 0 ? '↑ 효율적' : hyp.normalized_improvement < 0 ? '↓ 비효율' : '동일'}
                                </span>
                            </div>
                            <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 8 }}>
                                높을수록 Spec이 생산성에 도움 됨
                            </div>
                        </div>

                        {/* Human turn comparison */}
                        <div style={{ background: '#f8f9fa', borderRadius: 16, padding: 20 }}>
                            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 10, fontWeight: 500 }}>
                                Edit당 사용자 개입
                            </div>
                            <div style={{ display: 'flex', gap: 24 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 2 }}>Spec 있음</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1a73e8', letterSpacing: '-0.03em' }}>
                                        {hyp.avg_ht_per_edit_with_spec}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 2 }}>Spec 없음</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#9aa0a6', letterSpacing: '-0.03em' }}>
                                        {hyp.avg_ht_per_edit_without_spec}
                                    </div>
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 8 }}>
                                낮을수록 자율적 (적은 개입)
                            </div>
                        </div>

                        {/* Session duration */}
                        <div style={{ background: '#f8f9fa', borderRadius: 16, padding: 20 }}>
                            <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 10, fontWeight: 500 }}>
                                평균 세션 시간 (분)
                            </div>
                            <div style={{ display: 'flex', gap: 24 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 2 }}>Spec 있음</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#1a73e8', letterSpacing: '-0.03em' }}>
                                        {hyp.avg_duration_with_spec}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: '#9aa0a6', marginBottom: 2 }}>Spec 없음</div>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#9aa0a6', letterSpacing: '-0.03em' }}>
                                        {hyp.avg_duration_without_spec}
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
                                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {session.project.replace(/-/g, '/').replace(/^\//, '')}
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
