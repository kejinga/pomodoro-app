import { useState, useEffect, useRef, useCallback } from 'react'

export type TimerMode = 'work' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface TimerState {
  mode: TimerMode
  status: TimerStatus
  remaining: number
  total: number
  sessions: number
}

const DURATIONS: Record<TimerMode, number> = {
  work: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60,
}

const SESSIONS_BEFORE_LONG = 4

function getNextMode(currentMode: TimerMode, sessions: number): TimerMode {
  if (currentMode !== 'work') return 'work'
  return sessions % SESSIONS_BEFORE_LONG === 0 ? 'longBreak' : 'shortBreak'
}

export function useTimer() {
  const [state, setState] = useState<TimerState>({
    mode: 'work',
    status: 'idle',
    remaining: DURATIONS.work,
    total: DURATIONS.work,
    sessions: 0,
  })

  const intervalRef = useRef<number | null>(null)
  const sessionsRef = useRef(0)
  sessionsRef.current = state.sessions

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // 倒计时循环 — 仅依赖 status，mode 变化无需重建 interval
  useEffect(() => {
    if (state.status === 'running') {
      intervalRef.current = window.setInterval(() => {
        setState((prev) => {
          if (prev.remaining <= 1) {
            clearTimer()
            const newSessions = prev.mode === 'work' ? prev.sessions + 1 : prev.sessions
            const nextMode = getNextMode(prev.mode, newSessions)
            return {
              mode: nextMode,
              status: 'idle',
              remaining: DURATIONS[nextMode],
              total: DURATIONS[nextMode],
              sessions: newSessions,
            }
          }
          return { ...prev, remaining: prev.remaining - 1 }
        })
      }, 1000)
    }
    return clearTimer
  }, [state.status, clearTimer])

  const start = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'running',
      remaining: prev.remaining > 0 ? prev.remaining : prev.total,
    }))
  }, [])

  const pause = useCallback(() => {
    clearTimer()
    setState((prev) => ({ ...prev, status: 'paused' }))
  }, [clearTimer])

  const resume = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'running' }))
  }, [])

  const reset = useCallback(() => {
    clearTimer()
    setState((prev) => ({
      ...prev,
      status: 'idle',
      remaining: DURATIONS[prev.mode],
      total: DURATIONS[prev.mode],
    }))
  }, [clearTimer])

  const switchMode = useCallback(
    (mode: TimerMode) => {
      clearTimer()
      setState({
        mode,
        status: 'idle',
        remaining: DURATIONS[mode],
        total: DURATIONS[mode],
        sessions: sessionsRef.current,
      })
    },
    [clearTimer],
  )

  const progress = state.total > 0 ? 1 - state.remaining / state.total : 0

  return {
    ...state,
    progress,
    start,
    pause,
    resume,
    reset,
    switchMode,
  }
}
