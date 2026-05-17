import { motion } from 'framer-motion'
import type { TimerMode } from '../hooks/useTimer'

interface Props {
  progress: number
  mode?: TimerMode
  darkMode?: boolean
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
}

const COLORS: Record<TimerMode, { ring: string; glow: string; ringDark: string; glowDark: string }> = {
  work:       { ring: '#C05040', ringDark: '#f87171', glow: '#E08070', glowDark: '#fca5a5' },
  shortBreak: { ring: '#7AAA7A', ringDark: '#4ade80', glow: '#9CC89C', glowDark: '#86efac' },
  longBreak:  { ring: '#8BA0B8', ringDark: '#60a5fa', glow: '#A8BCD0', glowDark: '#93c5fd' },
}

export default function RingProgress({
  progress,
  mode = 'work',
  darkMode = false,
  size = 240,
  strokeWidth = 6,
  children,
}: Props) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - strokeWidth - 8
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(progress, 1))
  const { ring, glow } = COLORS[mode]
  const { ring: ringD, glow: glowD } = COLORS[mode]
  const stroke = darkMode ? ringD : ring
  const glowStroke = darkMode ? glowD : glow

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* 外层发光 */}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ filter: 'blur(10px)', opacity: 0.18 }}
      >
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={glowStroke}
          strokeWidth={strokeWidth + 4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </svg>

      {/* 主环形进度条 */}
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="absolute inset-0"
      >
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          className="ring-bg"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}
