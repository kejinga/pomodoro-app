import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TimerMode, TimerStatus } from '../hooks/useTimer'
import { MODE_CONFIG } from '../constants'

interface Props {
  mode: TimerMode
  status: TimerStatus
  onToggle: () => void
  onReset: () => void
  onSwitchMode: (mode: TimerMode) => void
}

export default React.memo(function Controls({ mode, status, onToggle, onReset, onSwitchMode }: Props) {
  const isRunning = status === 'running'
  const isPaused = status === 'paused'

  return (
    <div className="w-full space-y-4">
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.94 }}
        onClick={onToggle}
        className="btn-apple w-full py-3 rounded-2xl text-base font-semibold tracking-wide
                   bg-[#C05040] hover:bg-[#B0483A] text-white
                   shadow-lg shadow-[#C05040]/25
                   transition-colors duration-200"
      >
        {isRunning ? '⏸  暂停' : isPaused ? '▶  继续' : '▶  开始'}
      </motion.button>

      <AnimatePresence>
        {status !== 'idle' && (
          <motion.button
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onClick={onReset}
            className="btn-apple w-full py-2.5 rounded-2xl text-sm font-medium
                       bg-[#5C4A4A]/10 hover:bg-[#5C4A4A]/18 text-[#5C4A4A]
                       dark:bg-white/10 dark:hover:bg-white/20 dark:text-white/80
                       backdrop-blur-xl transition-colors duration-200"
          >
            ↺  重置
          </motion.button>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        {MODE_CONFIG.map(({ mode: m, label }) => {
          const isActive = mode === m
          return (
            <motion.button
              key={m}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSwitchMode(m)}
              className={`btn-apple flex-1 py-2 rounded-xl text-xs font-medium
                         backdrop-blur-xl transition-all duration-200
                         ${isActive
                           ? 'bg-[#5C4A4A]/12 text-[#4A3838] shadow-sm dark:bg-white/15 dark:text-white'
                           : 'bg-[#5C4A4A]/5 text-[#8B7B7B] hover:bg-[#5C4A4A]/8 dark:bg-white/5 dark:text-white/50 dark:hover:bg-white/12'
                         }`}
            >
              {label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
})
