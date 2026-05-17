import type { TimerMode } from './hooks/useTimer'

export const MODE_CONFIG: { mode: TimerMode; label: string }[] = [
  { mode: 'work', label: '专注' },
  { mode: 'shortBreak', label: '短休' },
  { mode: 'longBreak', label: '长休' },
]
