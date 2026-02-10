// ── Reusable InfoTooltip component ──

import { useState } from 'react'

interface InfoTooltipProps {
    text: string
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
    const [show, setShow] = useState(false)
    return (
        <span style={{ position: 'relative', display: 'inline-block', marginLeft: 4, cursor: 'help' }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}>
            <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 14, height: 14, borderRadius: '50%',
                background: show ? '#3182f6' : '#e5e8eb',
                color: show ? '#fff' : '#8b95a1',
                fontSize: 9, fontWeight: 700, lineHeight: 1,
                transition: 'all 0.2s'
            }}>?</span>
            {show && (
                <div style={{
                    position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                    width: 'max-content', maxWidth: 240,
                    padding: '8px 12px', background: 'rgba(30, 41, 59, 0.95)', color: '#fff',
                    borderRadius: 6, fontSize: 11, fontWeight: 400, lineHeight: 1.4,
                    zIndex: 1000, pointerEvents: 'none',
                    whiteSpace: 'pre-wrap', textAlign: 'left',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(4px)'
                }}>
                    {text}
                    <div style={{
                        position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
                        borderWidth: 5, borderStyle: 'solid',
                        borderColor: 'rgba(30, 41, 59, 0.95) transparent transparent transparent'
                    }} />
                </div>
            )}
        </span>
    )
}
