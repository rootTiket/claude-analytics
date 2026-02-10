// ── Setup Page — Antigravity 스타일 ──

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { AppConfig } from '../types'

export default function Setup() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const isInitFlow = searchParams.get('init') === '1'

    const [config, setConfig] = useState<AppConfig | null>(null)
    const [inputPath, setInputPath] = useState('')
    const [status, setStatus] = useState<'loading' | 'ready' | 'saving' | 'error'>('loading')
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    useEffect(() => {
        fetch('/api/config')
            .then(res => res.json())
            .then((data: AppConfig) => {
                setConfig(data)
                setInputPath(data.claude_projects_dir || '')
                if (isInitFlow && data.initialized) {
                    navigate('/')
                } else {
                    setStatus('ready')
                }
            })
            .catch(() => setStatus('ready'))
    }, [navigate, isInitFlow])

    const handleSave = async () => {
        setStatus('saving')
        setErrorMsg('')
        setSuccessMsg('')
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claude_projects_dir: inputPath })
            })
            const data = await res.json()
            if (res.ok) {
                setSuccessMsg('설정이 저장되었습니다')
                setStatus('ready')
                setTimeout(() => navigate('/'), 1200)
            } else {
                setErrorMsg(data.error || '설정 저장에 실패했습니다')
                setStatus('error')
            }
        } catch {
            setErrorMsg('서버에 연결할 수 없습니다')
            setStatus('error')
        }
    }

    if (status === 'loading') {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: '#f8f9fa'
            }}>
                <div className="loading-spinner" />
            </div>
        )
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: '#f8f9fa', padding: 20,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
        }}>
            <div style={{
                width: '100%', maxWidth: 520, background: '#fff',
                borderRadius: 32, padding: '56px 44px',
                boxShadow: '0 1px 3px rgba(32,33,36,0.04), 0 8px 24px rgba(32,33,36,0.06)',
                animation: 'fadeIn 0.4s ease',
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 52, height: 52, borderRadius: 16,
                        background: '#202124', marginBottom: 20
                    }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.5px' }}>CA</span>
                    </div>
                    <h1 style={{
                        fontSize: 24, fontWeight: 700, color: '#202124',
                        margin: '0 0 8px', letterSpacing: '-0.02em'
                    }}>Claude Analytics 설정</h1>
                    <p style={{
                        fontSize: 14, color: '#9aa0a6', margin: 0, lineHeight: 1.5
                    }}>
                        Claude CLI의 프로젝트 경로를 설정해주세요
                    </p>
                </div>

                {/* Auto-detect info */}
                {config?.detected && (
                    <div style={{
                        background: '#e8f0fe', border: 'none',
                        borderRadius: 16, padding: '14px 18px', marginBottom: 24,
                        fontSize: 13, color: '#1a73e8', lineHeight: 1.5, fontWeight: 500
                    }}>
                        자동으로 프로젝트 경로가 감지되었습니다
                    </div>
                )}

                {/* Path input */}
                <div style={{ marginBottom: 28 }}>
                    <label style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: '#5f6368', marginBottom: 8
                    }}>
                        Projects 경로
                    </label>
                    <input
                        type="text"
                        value={inputPath}
                        onChange={e => setInputPath(e.target.value)}
                        placeholder="~/.claude/projects"
                        style={{
                            width: '100%', padding: '14px 18px',
                            border: '1px solid #e8eaed', borderRadius: 12,
                            fontSize: 14, color: '#202124',
                            background: '#f8f9fa',
                            outline: 'none',
                            transition: 'border-color 150ms ease, box-shadow 150ms ease',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            boxSizing: 'border-box'
                        }}
                        onFocus={e => { e.target.style.borderColor = '#1a73e8'; e.target.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.12)' }}
                        onBlur={e => { e.target.style.borderColor = '#e8eaed'; e.target.style.boxShadow = 'none' }}
                    />
                    <p style={{
                        fontSize: 12, color: '#9aa0a6', marginTop: 8, lineHeight: 1.4
                    }}>
                        일반적으로 <code style={{ background: '#f1f3f4', padding: '2px 6px', borderRadius: 6, fontSize: 11 }}>~/.claude/projects</code> 에 위치합니다
                    </p>
                </div>

                {/* Error message */}
                {errorMsg && (
                    <div style={{
                        background: '#fce8e6', border: 'none',
                        borderRadius: 16, padding: '14px 18px', marginBottom: 24,
                        fontSize: 13, color: '#d93025', lineHeight: 1.5, fontWeight: 500
                    }}>
                        {errorMsg}
                    </div>
                )}

                {/* Success message */}
                {successMsg && (
                    <div style={{
                        background: '#e6f4ea', border: 'none',
                        borderRadius: 16, padding: '14px 18px', marginBottom: 24,
                        fontSize: 13, color: '#1e8e3e', lineHeight: 1.5, fontWeight: 500
                    }}>
                        {successMsg}
                    </div>
                )}

                {/* Submit button — dark pill */}
                <button
                    onClick={handleSave}
                    disabled={status === 'saving' || !inputPath.trim()}
                    style={{
                        width: '100%', padding: '14px 0',
                        background: status === 'saving' ? '#9aa0a6' : '#202124',
                        color: '#fff', border: 'none', borderRadius: 999,
                        fontSize: 15, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 150ms ease',
                        opacity: !inputPath.trim() ? 0.5 : 1,
                        fontFamily: 'inherit',
                        letterSpacing: '-0.01em',
                    }}
                    onMouseEnter={e => { if (inputPath.trim()) e.currentTarget.style.background = '#3c4043' }}
                    onMouseLeave={e => { e.currentTarget.style.background = status === 'saving' ? '#9aa0a6' : '#202124' }}
                >
                    {status === 'saving' ? '설정 저장 중...' : '시작하기'}
                </button>
            </div>
        </div>
    )
}
