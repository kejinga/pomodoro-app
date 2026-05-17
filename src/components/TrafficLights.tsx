import { motion } from 'framer-motion'

interface Props {
  alwaysOnTop: boolean
  onToggleTop: () => void
}

const closeWindow = () => window.close()

const minimizeWindow = () => {
  window.close() // 触发 Electron close 事件 → 隐藏到托盘
}

export default function TrafficLights({ alwaysOnTop, onToggleTop }: Props) {
  const dots = [
    { color: '#ff5f57', hover: '#ff3b30', title: '关闭', onClick: closeWindow },
    { color: '#ffbd2e', hover: '#ff9500', title: '最小化到托盘', onClick: minimizeWindow },
    {
      color: alwaysOnTop ? '#34c759' : '#3a3a3a',
      hover: alwaysOnTop ? '#30d158' : '#4a4a4a',
      title: alwaysOnTop ? '取消置顶' : '窗口置顶',
      onClick: onToggleTop,
    },
  ]

  return (
    <div className="flex items-center gap-2.5 no-drag">
      {dots.map(({ color, hover, title, onClick }) => (
        <motion.button
          key={title}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClick}
          className="w-3 h-3 rounded-full shadow-inner transition-colors duration-150"
          style={{ backgroundColor: color }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = color)}
          title={title}
        />
      ))}
    </div>
  )
}
