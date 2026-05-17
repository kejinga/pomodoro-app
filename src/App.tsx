import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTimer } from './hooks/useTimer'
import { MODE_CONFIG } from './constants'
import RingProgress from './components/RingProgress'
import Controls from './components/Controls'
import TrafficLights from './components/TrafficLights'

const MODE_LABELS = Object.fromEntries(MODE_CONFIG.map(m => [m.mode, m.label]))

function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const notes = [
      [880, 0.15],
      [1100, 0.2],
      [880, 0.15],
      [1100, 0.2],
      [880, 0.15],
      [1320, 0.35],
    ]
    notes.forEach(([freq, dur], i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.25)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.25 + dur)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.25)
      osc.stop(ctx.currentTime + i * 0.25 + dur)
    })
    setTimeout(() => ctx.close(), 2000)
  } catch {
    // 静默失败
  }
}

export default function App() {
  const {
    mode,
    status,
    remaining,
    sessions,
    progress,
    start,
    pause,
    resume,
    reset,
    switchMode,
  } = useTimer()

  const [alwaysOnTop, setAlwaysOnTop] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const prevStatus = useRef(status)

  // 计时结束提示音
  useEffect(() => {
    if (prevStatus.current === 'running' && status === 'idle' && remaining === 0) {
      playNotificationSound()
    }
    prevStatus.current = status
  }, [status, remaining])

  // 深色模式 class 切换
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  // 窗口置顶 — 函数式更新避免闭包陈旧引用
  const toggleAlwaysOnTop = useCallback(() => {
    setAlwaysOnTop((prev) => {
      const next = !prev
      window.electronAPI?.toggleAlwaysOnTop(next)
      return next
    })
  }, [])

  const handleToggle = useCallback(() => {
    if (status === 'running') pause()
    else if (status === 'paused') resume()
    else start()
  }, [status, start, pause, resume])

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl">
      <div className="app-bg absolute inset-0" />

      <div className="relative z-10 flex flex-col items-center h-full px-6 pt-4 pb-6">
        {/* 顶部：拖拽区 + 红绿灯 + 主题切换 */}
        <div className="drag-region flex items-center justify-between w-full mb-3 px-1">
          <TrafficLights alwaysOnTop={alwaysOnTop} onToggleTop={toggleAlwaysOnTop} />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setDarkMode(!darkMode)}
            className="no-drag w-7 h-7 flex items-center justify-center rounded-full
                       theme-btn text-sm transition-colors duration-200"
            title={darkMode ? '切换浅色模式' : '切换深色模式'}
          >
            {darkMode ? '🌙' : '☀️'}
          </motion.button>
        </div>

        {/* 番茄计数 */}
        <motion.p
          key={sessions}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-medium tracking-wider text-[#8B7B7B] dark:text-white/30 mb-2"
        >
          今日完成 {sessions} 个番茄
        </motion.p>

        {/* 环形进度条 + 时间数字 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-${status}`}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col items-center"
          >
            <RingProgress progress={progress} mode={mode} darkMode={darkMode} size={240} strokeWidth={6}>
              <div className="flex flex-col items-center">
                <span className="text-[64px] font-semibold tracking-tighter leading-none
                                 text-[#4A3838] dark:text-white/95">
                  {mins < 10 ? `0${mins}` : mins}
                </span>
                <span className="text-[42px] font-light tracking-tight leading-none -mt-1
                                 text-[#8B7B7B] dark:text-white/65">
                  {secs < 10 ? `0${secs}` : secs}
                </span>
              </div>
            </RingProgress>

            <p className="mt-3 text-sm font-medium tracking-widest text-[#C05040]">
              {MODE_LABELS[mode]}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* 控制按钮 */}
        <div className="mt-auto w-full max-w-[240px]">
          <Controls
            mode={mode}
            status={status}
            onToggle={handleToggle}
            onReset={reset}
            onSwitchMode={switchMode}
          />
        </div>
      </div>
    </div>
  )
}
