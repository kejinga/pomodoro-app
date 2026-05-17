import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  screen,
  type BackgroundMaterial,
} from 'electron'
import { join } from 'path'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createTrayIcon(): nativeImage {
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = size / 2
      const cy = size / 2
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      const i = (y * size + x) * 4
      const radius = size / 2 - 1
      if (dist < radius) {
        buf[i] = 245
        buf[i + 1] = 82
        buf[i + 2] = 82
        buf[i + 3] = 255
      } else if (dist < radius + 1) {
        const alpha = Math.round(255 * (radius + 1 - dist))
        buf[i] = 245
        buf[i + 1] = 82
        buf[i + 2] = 82
        buf[i + 3] = alpha
      }
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

function createTray(): void {
  tray = new Tray(createTrayIcon())
  tray.setToolTip('番茄钟')

  const toggleWindow = (): void => {
    if (!mainWindow) return
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  }

  tray.on('click', toggleWindow)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示/隐藏窗口',
      click: toggleWindow,
    },
    { type: 'separator' },
    {
      label: '始终置顶',
      type: 'checkbox',
      checked: false,
      click: (mi) => {
        mainWindow?.setAlwaysOnTop(mi.checked)
      },
    },
    { type: 'separator' },
    {
      label: '退出番茄钟',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(contextMenu)
}

function createWindow(): void {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: 360,
    height: 540,
    x: Math.round(screenWidth - 380),
    y: Math.round(screenHeight / 2 - 270),
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: false,
    alwaysOnTop: false,
    backgroundMaterial: 'acrylic',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.setBackgroundColor('#00000000')

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
}

// IPC handlers
ipcMain.handle('toggle-always-on-top', (_event, flag: boolean) => {
  mainWindow?.setAlwaysOnTop(flag)
  return mainWindow?.isAlwaysOnTop()
})

ipcMain.handle('set-background-material', (_event, material: BackgroundMaterial) => {
  try {
    mainWindow?.setBackgroundMaterial(material)
  } catch {
    // 部分系统不支持
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  app.isQuitting = true
  tray?.destroy()
  tray = null
})
