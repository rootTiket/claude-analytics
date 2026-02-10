// ── Floating Particles Background ──
// Antigravity 스타일 떠다니는 점 애니메이션

import { useEffect, useRef } from 'react'

interface Particle {
    x: number
    y: number
    size: number
    color: string
    opacity: number
    vx: number
    vy: number
    pulse: number
    pulseSpeed: number
}

const COLORS = [
    '#202124',  // Darkest grey/black
    '#3c4043',
    '#5f6368',
    '#9aa0a6',  // Light grey
]

export default function FloatingParticles() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let animationId: number
        let particles: Particle[] = []
        let mouseX = -1000
        let mouseY = -1000

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }

        const createParticles = () => {
            const count = Math.floor((canvas.width * canvas.height) / 25000) // Sparse density
            particles = Array.from({ length: count }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 1.5 + Math.random() * 2.5, // Slightly smaller uniform circles
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                opacity: 0.1 + Math.random() * 0.3, // Lower opacity for subtle effect
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: 0.005 + Math.random() * 0.015,
            }))
        }

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            for (const p of particles) {
                // Pulse opacity
                p.pulse += p.pulseSpeed
                const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulse))

                // Mouse repel
                const dx = p.x - mouseX
                const dy = p.y - mouseY
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < 120) {
                    const force = (120 - dist) / 120 * 0.8
                    p.x += (dx / dist) * force
                    p.y += (dy / dist) * force
                }

                // Move
                p.x += p.vx
                p.y += p.vy

                // Wrap edges
                if (p.x < -10) p.x = canvas.width + 10
                if (p.x > canvas.width + 10) p.x = -10
                if (p.y < -10) p.y = canvas.height + 10
                if (p.y > canvas.height + 10) p.y = -10

                // Draw — always circle
                ctx.globalAlpha = currentOpacity
                ctx.fillStyle = p.color
                ctx.beginPath()
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
                ctx.fill()
            }
            ctx.globalAlpha = 1
            animationId = requestAnimationFrame(draw)
        }

        const handleMouseMove = (e: MouseEvent) => {
            mouseX = e.clientX
            mouseY = e.clientY
        }

        const handleMouseLeave = () => {
            mouseX = -1000
            mouseY = -1000
        }

        resize()
        createParticles()
        draw()

        window.addEventListener('resize', () => { resize(); createParticles() })
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseleave', handleMouseLeave)

        return () => {
            cancelAnimationFrame(animationId)
            window.removeEventListener('resize', resize)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseleave', handleMouseLeave)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    )
}
