"""
番茄钟 (Pomodoro Timer) — 桌面计时器应用

基于 tkinter 的桌面番茄工作法计时器，帮助用户按照"专注→短休→长休"的节奏工作。

核心逻辑：
  1. 默认 25分钟专注 → 5分钟短休息，每完成4个番茄进入一次 15分钟长休息
  2. 计时器在后台线程运行，不阻塞 GUI
  3. 倒计时归零时播放系统提示音并自动切换到下一阶段
  4. 支持手动切换模式、暂停/继续、重置、窗口置顶

运行方式：python pomodoro.py（无需安装第三方库，仅使用 Python 标准库）
"""

import tkinter as tk           # GUI 框架
from tkinter import ttk         # 主题化控件（用于进度条）
from tkinter import messagebox  # 消息弹窗（预留，当前未使用）
import winsound                 # Windows 系统提示音（仅 Windows 可用）
import threading                # 后台线程，让计时器不阻塞界面
import time                     # sleep 实现倒计时
from dataclasses import dataclass  # 简洁的数据容器


# ---------------------------------------------------------------------------
# TimerState — 用常量表示当前所处的阶段
# ---------------------------------------------------------------------------
@dataclass
class TimerState:
    """番茄钟三种工作状态的文本标签"""
    WORK: str = "专注"            # 正在专注工作
    SHORT_BREAK: str = "短休息"   # 短休息（每两个番茄之间）
    LONG_BREAK: str = "长休息"    # 长休息（每4个番茄之后）


# ---------------------------------------------------------------------------
# PomodoroTimer — 主控制器，包含界面构建、计时逻辑、状态切换
# ---------------------------------------------------------------------------
class PomodoroTimer:
    """番茄钟主类，封装全部 UI 和计时逻辑"""

    # ======================== 可调节的参数 ========================
    WORK_MIN = 25            # 专注时长（分钟）
    SHORT_BREAK_MIN = 5      # 短休息时长（分钟）
    LONG_BREAK_MIN = 15      # 长休息时长（分钟）
    SESSIONS_BEFORE_LONG = 4 # 每完成几个番茄后进入一次长休息

    # ======================== 初始化 ========================
    def __init__(self):
        # --- 创建主窗口 ---
        self.root = tk.Tk()
        self.root.title("番茄钟")
        self.root.geometry("380x480")          # 固定窗口尺寸（宽 x 高）
        self.root.resizable(False, False)      # 禁止拉伸窗口
        self.root.configure(bg="#1e1e2e")      # 暗色主题背景

        # 尝试加载自定义图标（没有则忽略）
        self.root.iconbitmap(default=None)
        try:
            self.root.iconbitmap("tomato.ico")
        except Exception:
            pass

        # --- 运行时状态变量 ---
        self.remaining = self.WORK_MIN * 60    # 剩余秒数，初始为25分钟
        self.running = False                   # 计时器是否在运行
        self.paused = False                    # 是否处于暂停状态
        self.current_state = TimerState.WORK   # 当前所处阶段（专注/短休/长休）
        self.session_count = 0                 # 今日完成的番茄数
        self.always_on_top = tk.BooleanVar(value=True)  # 窗口置顶开关（默认开启）

        # --- 构建界面 ---
        self._build_ui()
        self._update_display()

        # --- 绑定事件 ---
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)  # 点 × 关闭窗口时调用
        self.root.attributes("-topmost", True)                   # 启动时默认置顶

    # ======================== 界面构建 ========================
    def _build_ui(self):
        """构建全部 UI 控件（标签、按钮、进度条等）"""

        # 颜色方案 — 基于 Catppuccin Mocha 暗色主题
        colors = {
            "bg": "#1e1e2e",          # 窗口背景色
            "card": "#2a2a3e",        # 卡片/槽色（进度条背景）
            "text": "#cdd6f4",        # 主文字颜色
            "subtext": "#9399b2",     # 次要文字颜色
            "work": "#f38ba8",        # 专注模式的强调色（粉红）
            "break": "#a6e3a1",       # 短休息模式的强调色（绿）
            "long_break": "#89b4fa",  # 长休息模式的强调色（蓝）
            "btn_bg": "#45475a",      # 普通按钮背景
            "btn_fg": "#cdd6f4",      # 普通按钮文字
            "progress": "#cba6f7",    # 进度条填充色（紫）
        }
        self.colors = colors

        # ---- 标题 ----
        title_frame = tk.Frame(self.root, bg=colors["bg"])
        title_frame.pack(pady=(24, 8))  # 上边距24px，下边距8px
        tk.Label(
            title_frame,
            text="🍅 番茄钟",
            font=("Segoe UI", 22, "bold"),
            bg=colors["bg"],
            fg=colors["work"],
        ).pack()

        # ---- 时间数字显示（如 25:00） ----
        self.timer_label = tk.Label(
            self.root,
            text="25:00",
            font=("Segoe UI", 56, "bold"),  # 大号等宽字体
            bg=colors["bg"],
            fg=colors["text"],
        )
        self.timer_label.pack(pady=(8, 4))

        # ---- 状态文本（专注 / 短休息 / 长休息） ----
        self.state_label = tk.Label(
            self.root,
            text="专注",
            font=("Segoe UI", 13),
            bg=colors["bg"],
            fg=colors["work"],
        )
        self.state_label.pack()

        # ---- 进度条（显示当前阶段的时间消耗比例） ----
        self.progress = ttk.Progressbar(
            self.root,
            length=300,
            mode="determinate",  # 确定性进度（0%~100%）
            style="TProgressbar",
        )
        self.progress.pack(pady=(12, 12))
        self._style_progress()  # 自定义进度条配色

        # ---- 番茄计数（今日完成数量） ----
        session_frame = tk.Frame(self.root, bg=colors["bg"])
        session_frame.pack(pady=(0, 6))
        self.session_label = tk.Label(
            session_frame,
            text="今日完成: 0 个番茄",
            font=("Segoe UI", 10),
            bg=colors["bg"],
            fg=colors["subtext"],
        )
        self.session_label.pack()

        # ---- 模式切换按钮（手动选择专注/短休/长休） ----
        preset_frame = tk.Frame(self.root, bg=colors["bg"])
        preset_frame.pack(pady=(4, 4))
        for text, state, color in [
            ("专注 25min", TimerState.WORK, colors["work"]),
            ("短休 5min", TimerState.SHORT_BREAK, colors["break"]),
            ("长休 15min", TimerState.LONG_BREAK, colors["long_break"]),
        ]:
            btn = tk.Button(
                preset_frame,
                text=text,
                font=("Segoe UI", 10),
                bg=colors["btn_bg"],
                fg=color,
                activebackground=colors["btn_bg"],
                activeforeground=color,
                relief="flat",       # 扁平按钮
                padx=10,
                pady=4,
                cursor="hand2",      # 鼠标悬停时显示手型
                # 注意：使用默认参数 s=state 避免 lambda 闭包延迟绑定问题
                command=lambda s=state: self._switch_mode(s),
            )
            btn.pack(side="left", padx=5)

        # ---- 主控制按钮：开始/暂停 + 重置 ----
        ctrl_frame = tk.Frame(self.root, bg=colors["bg"])
        ctrl_frame.pack(pady=(8, 4))

        self.start_btn = tk.Button(
            ctrl_frame,
            text="▶  开始",
            font=("Segoe UI", 12, "bold"),
            bg=colors["work"],
            fg="#1e1e2e",                # 按钮文字用深色，形成对比
            activebackground=colors["work"],
            activeforeground="#1e1e2e",
            relief="flat",
            padx=24,
            pady=8,
            cursor="hand2",
            command=self._toggle_pause,  # 同一按钮负责"开始"和"暂停"两个动作
        )
        self.start_btn.pack(side="left", padx=6)

        self.reset_btn = tk.Button(
            ctrl_frame,
            text="↺  重置",
            font=("Segoe UI", 12),
            bg=colors["btn_bg"],
            fg=colors["text"],
            activebackground=colors["btn_bg"],
            activeforeground=colors["text"],
            relief="flat",
            padx=20,
            pady=8,
            cursor="hand2",
            command=self._reset,          # 重置当前阶段，回到初始时间
        )
        self.reset_btn.pack(side="left", padx=6)

        # ---- 窗口置顶复选框 ----
        top_frame = tk.Frame(self.root, bg=colors["bg"])
        top_frame.pack(pady=(14, 0))
        cb = tk.Checkbutton(
            top_frame,
            text="窗口置顶",
            variable=self.always_on_top,   # 绑定到 BooleanVar
            command=self._toggle_topmost,  # 勾选/取消时立即生效
            font=("Segoe UI", 9),
            bg=colors["bg"],
            fg=colors["subtext"],
            selectcolor=colors["card"],
            activebackground=colors["bg"],
            activeforeground=colors["subtext"],
        )
        cb.pack()

    def _style_progress(self):
        """自定义进度条的配色（由于 ttk 的限制，需要单独用 style 配置）"""
        style = ttk.Style()
        style.theme_use("clam")  # clam 主题支持更多自定义项
        style.configure(
            "TProgressbar",
            thickness=10,                          # 进度条高度
            background=self.colors["progress"],    # 已填充部分的颜色
            troughcolor=self.colors["card"],       # 轨道（未填充部分）的颜色
            bordercolor=self.colors["card"],
            lightcolor=self.colors["progress"],
            darkcolor=self.colors["progress"],
        )

    # ======================== 模式切换 ========================
    def _switch_mode(self, state):
        """
        手动切换到指定模式（专注/短休/长休）。
        会停止当前计时，重置为该模式的完整时长。
        """
        self.running = False                     # 停止计时线程
        self.paused = False                      # 清除暂停状态
        self.current_state = state               # 更新当前阶段
        self._set_duration_by_state()            # 按新模式设置剩余秒数
        self._update_display()                   # 刷新界面
        self.start_btn.config(text="▶  开始", bg=self.colors["work"], fg="#1e1e2e")

    def _set_duration_by_state(self):
        """
        根据 current_state 将 remaining 设置为对应模式的完整时长。
        加1秒是让显示从 XX:00 开始（而非 XX:59），用户体验更好。
        """
        if self.current_state == TimerState.WORK:
            self.remaining = self.WORK_MIN * 60 + 1
        elif self.current_state == TimerState.SHORT_BREAK:
            self.remaining = self.SHORT_BREAK_MIN * 60 + 1
        else:
            self.remaining = self.LONG_BREAK_MIN * 60 + 1

    def _total_seconds(self):
        """返回当前阶段的总秒数（不含+1偏移），用于计算进度百分比"""
        if self.current_state == TimerState.WORK:
            return self.WORK_MIN * 60
        elif self.current_state == TimerState.SHORT_BREAK:
            return self.SHORT_BREAK_MIN * 60
        return self.LONG_BREAK_MIN * 60

    # ======================== 计时控制 ========================
    def _toggle_pause(self):
        """
        开始按钮的回调。根据当前状态执行不同操作：
          - 未运行 → 启动计时线程
          - 运行中 → 切换暂停/继续
        """
        if self.running:
            # 正在运行 → 切换暂停状态
            self.paused = not self.paused
            if self.paused:
                self.start_btn.config(text="▶  继续", bg=self.colors["break"], fg="#1e1e2e")
            else:
                self.start_btn.config(text="⏸  暂停", bg=self.colors["work"], fg="#1e1e2e")
        else:
            # 未运行 → 启动新的一轮计时
            self.running = True
            self.paused = False
            self.start_btn.config(text="⏸  暂停", bg=self.colors["work"], fg="#1e1e2e")
            # 在后台线程中运行倒计时，避免阻塞 GUI 主循环
            threading.Thread(target=self._countdown, daemon=True).start()

    def _reset(self):
        """
        重置当前阶段：停止计时，恢复到完整时长，清空暂停状态。
        不会改变 current_state 和 session_count。
        """
        self.running = False
        self.paused = False
        self._set_duration_by_state()
        self._update_display()
        self.start_btn.config(text="▶  开始", bg=self.colors["work"], fg="#1e1e2e")

    # ======================== 倒计时线程 ========================
    def _countdown(self):
        """
        后台倒计时线程。每秒 decrement remaining，并通过 root.after()
        将 UI 更新调度回主线程（tkinter 不是线程安全的）。
        """
        while self.running and self.remaining > 0:
            if not self.paused:
                time.sleep(1)                              # 等待1秒
                self.remaining -= 1                         # 减少1秒
                self.root.after(0, self._update_display)    # 调度 UI 刷新
            else:
                time.sleep(0.1)  # 暂停时降低轮询频率，减少 CPU 占用

        # 倒计时自然归零（而非手动停止）→ 触发计时结束逻辑
        if self.running and self.remaining <= 0:
            self.running = False
            self.paused = False
            self.root.after(0, self._on_timer_end)  # 在主线程中执行

    # ======================== 计时结束处理 ========================
    def _on_timer_end(self):
        """
        计时归零时调用：
          1. 播放提示音 + 窗口闪烁提醒
          2. 如果是完成了一个专注番茄 → 番茄数+1，判断进短休还是长休
          3. 如果是完成了一次休息 → 自动切回专注模式
        """
        self._play_sound()      # 系统蜂鸣提示
        self._flash_window()    # 窗口闪烁引起注意

        if self.current_state == TimerState.WORK:
            # 完成一个专注番茄
            self.session_count += 1
            # 每完成 SESSIONS_BEFORE_LONG 个番茄 → 长休息，否则 → 短休息
            if self.session_count % self.SESSIONS_BEFORE_LONG == 0:
                next_state = TimerState.LONG_BREAK
            else:
                next_state = TimerState.SHORT_BREAK
        else:
            # 休息结束 → 回到专注模式
            next_state = TimerState.WORK

        self.current_state = next_state              # 切换到下一阶段
        self._set_duration_by_state()               # 载入对应时长
        self._update_display()                       # 刷新界面
        self.start_btn.config(text="▶  开始", bg=self.colors["work"], fg="#1e1e2e")

    def _play_sound(self):
        """
        播放提示音：三组高低音交替的蜂鸣。
        使用 winsound.Beep(频率, 时长)，仅 Windows 平台可用。
        """
        for _ in range(3):
            winsound.Beep(880, 200)   # 高音 880Hz，持续 200ms
            time.sleep(0.1)
            winsound.Beep(1100, 300)  # 更高音 1100Hz，持续 300ms
            time.sleep(0.1)

    def _flash_window(self):
        """
        窗口闪烁：临时强制置顶再恢复，引起用户注意。
        """
        try:
            self.root.attributes("-topmost", True)
            self.root.update()
            time.sleep(0.3)
            self.root.attributes("-topmost", self.always_on_top.get())
        except Exception:
            pass

    # ======================== UI 刷新 ========================
    def _update_display(self):
        """
        更新界面上的所有动态元素：
          - 时间数字（MM:SS）
          - 进度条百分比
          - 状态标签颜色和文字
          - 今日番茄计数
        """
        # 将剩余秒数格式化为 MM:SS
        mins, secs = divmod(max(self.remaining, 0), 60)
        self.timer_label.config(text=f"{mins:02d}:{secs:02d}")

        # 计算并更新进度条（0~100）
        total = self._total_seconds()
        elapsed = total - self.remaining
        self.progress["value"] = (elapsed / total) * 100 if total > 0 else 0

        # 根据当前状态切换标签颜色
        state_colors = {
            TimerState.WORK: self.colors["work"],
            TimerState.SHORT_BREAK: self.colors["break"],
            TimerState.LONG_BREAK: self.colors["long_break"],
        }
        color = state_colors[self.current_state]
        self.state_label.config(text=self.current_state, fg=color)
        self.session_label.config(text=f"今日完成: {self.session_count} 个番茄")

    # ======================== 窗口控制 ========================
    def _toggle_topmost(self):
        """切换窗口是否始终置顶"""
        self.root.attributes("-topmost", self.always_on_top.get())

    def _on_close(self):
        """
        关闭窗口时的清理逻辑：
          1. 停止计时线程（让 while 循环退出）
          2. 销毁窗口
        """
        self.running = False
        self.root.destroy()

    # ======================== 启动入口 ========================
    def run(self):
        """启动 tkinter 主事件循环，进入应用"""
        self.root.mainloop()


# ---------------------------------------------------------------------------
# 程序入口
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    PomodoroTimer().run()
