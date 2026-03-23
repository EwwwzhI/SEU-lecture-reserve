(() => {
  if (window.__seuLectureReserveInjected) return;
  window.__seuLectureReserveInjected = true;
  const isTopWindow = (() => {
    try {
      return window.top === window.self;
    } catch (err) {
      return true;
    }
  })();

  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;700&family=Nunito:wght@400;600;700&display=swap');

    :root {
      --seu-paper-bg: #fdfbf7;
      --seu-paper-texture: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmRmYmY3Ii8+CjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4wMikiLz4KPC9zdmc+');
      --seu-ink-primary: #2c3e50;
      --seu-ink-secondary: #5d6d7e;
    }

    .seu-reserve-handle {
      position: fixed;
      right: 0;
      bottom: clamp(60px, 15vh, 120px);
      z-index: 2147483647;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      
      /* Bookmark Style */
      background: #1a5276; /* Elegant Deep Blue */
      color: #ffffff;
      padding: clamp(12px, 0.4vw + 8px, 20px) clamp(8px, 0.2vw + 4px, 14px);
      font-size: clamp(12px, 0.2vw + 10px, 15px);
      font-family: 'Noto Serif SC', serif;
      font-weight: 700;
      
      border-radius: 4px 0 0 4px;
      cursor: pointer;
      letter-spacing: 0.15em;
      box-shadow: -2px 4px 12px rgba(0, 0, 0, 0.2);
      user-select: none;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .seu-reserve-handle:hover {
      padding-right: 20px;
      background: #154360;
    }
    
    .seu-reserve-dock {
      position: fixed;
      right: 20px;
      bottom: clamp(40px, 10vh, 100px);
      z-index: 2147483647;
      transform: translateX(120%);
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .seu-reserve-dock.open {
      transform: translateX(0);
    }
    
    /* True Proportional Scaling (1K to 4K Fluidity) */
    .seu-reserve-notebook {
      /* Width scales consistently as a percentage of viewport width */
      width: clamp(280px, 18vw, 680px); 
      max-width: calc(100vw - 30px);
      
      /* Lowering font floor and raising ceiling to allow fluidity at 1K */
      font-size: clamp(12px, 0.7vw, 24px); 
      
      background: var(--seu-paper-bg);
      background-image: 
        radial-gradient(at top left, rgba(255,255,255,0.8) 0%, transparent 70%),
        var(--seu-paper-texture);
      border: 1px solid #e6e3dd;
      box-shadow: -8px 12px 32px rgba(44, 62, 80, 0.1);
      border-radius: clamp(3px, 0.3vw, 10px);
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      font-family: 'Nunito', sans-serif;
      color: var(--seu-ink-primary);
      position: relative;
      overflow: hidden;
      transition: transform 0.4s ease;
    }

    .seu-reserve-inner {
      padding: clamp(14px, 1.2vw, 36px); 
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden; /* Main container no longer scrolls */
    }

    .seu-reserve-title {
      font-family: 'Noto Serif SC', serif;
      font-size: clamp(16px, 1.1vw, 24px); 
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: clamp(10px, 0.8vw, 24px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #2c3e50;
      padding-bottom: clamp(4px, 0.4vw, 12px);
      flex-shrink: 0;
    }

    /* Scrollable Areas */
    .seu-reserve-detected-list {
      display: none !important;
    }
    
    .seu-reserve-tasks {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    
    #seu-task-list {
      overflow-y: auto;
      padding-right: 4px;
      flex: 1;
      scrollbar-width: thin;
      scrollbar-color: #d6dbdf transparent;
    }

    .seu-reserve-close {
      border: 1.5px solid #2c3e50;
      background: transparent;
      color: #2c3e50;
      width: clamp(20px, 1vw, 26px); /* Slightly smaller close button */
      height: clamp(20px, 1vw, 26px);
      cursor: pointer;
      font-size: clamp(12px, 0.7vw, 15px);
      font-weight: 700;
      border-radius: 2px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .seu-reserve-lecture-item {
      padding: clamp(6px, 0.5vw, 12px); /* Tighter padding */
      margin-bottom: clamp(6px, 0.5vw, 12px); /* Tighter margin */
      border-left: clamp(3px, 0.2vw, 5px) solid #1a5276;
      background: #ffffff;
      border: 1px solid #e6e3dd;
      border-left: clamp(3px, 0.2vw, 5px) solid #1a5276;
      box-shadow: 2px 2px 4px rgba(0,0,0,0.03);
    }

    .seu-reserve-lecture-title {
      font-weight: 700;
      font-family: 'Noto Serif SC', serif;
      font-size: 1.05em;
      margin-bottom: 8px; /* Fixed smaller margin */
      line-height: 1.3;
      word-break: break-all;
    }
    .seu-reserve-lecture-item:hover {
      transform: translateY(-2px) rotate(0.5deg);
      box-shadow: 4px 6px 12px rgba(0,0,0,0.08);
    }
    
    .seu-reserve-lecture-inputs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap; /* Allow wrapping */
    }

    .seu-reserve-input {
      flex: 1;
      min-width: 120px;
      padding: 6px 8px;
      border: none;
      border-bottom: 1px dashed #7f8c8d;
      background: #f9fafb;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }
    
    .seu-reserve-input:focus {
      outline: none;
      border-bottom-style: solid;
      background: #fff;
    }

    .seu-reserve-btn {
      background: #2c3e50;
      color: white;
      border: none;
      padding: 6px 12px;
      font-weight: 700;
      font-family: 'Noto Serif SC', serif;
      cursor: pointer;
      border-radius: 2px;
      transition: all 0.2s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    
    /* Make button shrink/wrap gracefully */
    @container (max-width: 300px) {
       .seu-reserve-lecture-inputs {
          flex-direction: column;
       }
       .seu-reserve-btn {
          width: 100%;
       }
    }
    
    .seu-reserve-btn:hover {
      background: #34495e;
      box-shadow: 2px 2px 0 rgba(44, 62, 80, 0.3);
    }
    .seu-reserve-btn:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
    }

    /* Tasks as clean cards */
    .seu-reserve-task {
      padding: 12px 16px;
      border: 1px solid #e6e3dd;
      background: #ffffff;
      margin-bottom: 10px;
      font-size: 0.9em;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 2px 2px 4px rgba(0,0,0,0.03);
    }

    .seu-reserve-task-meta {
      font-size: 0.85em;
      color: #7f8c8d;
      margin-top: 6px;
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }

    .time-label {
      white-space: nowrap;
    }

    /* Clean Status Tags */
    .status-sticker {
      display: inline-block;
      padding: 2px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      border-radius: 2px;
      white-space: nowrap;
    }
    .status-sticker.scheduled { background: #d6eaf8; color: #2874a6; border: 1px solid #aed6f1; }
    .status-sticker.running { background: #fcf3cf; color: #b7950b; border: 1px solid #f9e79f; }
    .status-sticker.success { background: #d5f5e3; color: #1e8449; border: 1px solid #abebc6; }
    .status-sticker.failed { background: #fadbd8; color: #943126; border: 1px solid #f5b7b1; }

    .result-label {
      margin-top: 5px;
      font-size: 11px;
      color: #7f8c8d;
      word-break: break-all;
      line-height: 1.35;
    }

    .cancel-btn {
      background: transparent;
      border: 1px solid #c0392b;
      color: #c0392b;
      padding: 4px 8px;
      font-size: 11px;
      cursor: pointer;
      font-family: 'Noto Serif SC', serif;
    }
    .cancel-btn:hover {
      background: #c0392b;
      color: white;
    }

    .seu-reserve-status {
      padding: 10px 0;
      font-style: italic;
      font-size: 0.9em;
      text-align: center;
    }

    .seu-reserve-tasks h4 {
      font-family: 'Noto Serif SC', serif;
      margin: 0 0 10px;
      border-bottom: 1px solid #bdc3c7;
      padding-bottom: 4px;
    }

    .seu-reserve-task-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .seu-reserve-task-refresh {
      background: none;
      border: none;
      color: #2980b9;
      text-decoration: underline;
      cursor: pointer;
      font-size: 0.85em;
    }

    .seu-reserve-hidden {
      opacity: 0;
      pointer-events: none;
      transform: translateX(100%);
    }

    .seu-inline-reserve-host {
      position: relative;
    }

    .seu-inline-reserve-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px dashed rgba(26, 82, 118, 0.24);
    }

    .seu-inline-reserve-copy {
      min-width: 160px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      color: #5d6d7e;
      font-size: 12px;
      line-height: 1.4;
    }

    .seu-inline-reserve-label {
      font-family: 'Noto Serif SC', serif;
      font-size: 12px;
      font-weight: 700;
      color: #1a5276;
    }

    .seu-inline-reserve-time {
      word-break: break-all;
    }

    .seu-inline-reserve-btn {
      border: 1px solid #1a5276;
      background: linear-gradient(135deg, #1a5276, #2874a6);
      color: #fff;
      min-height: 34px;
      padding: 7px 14px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
      box-shadow: 0 4px 12px rgba(26, 82, 118, 0.18);
    }

    .seu-inline-reserve-btn:hover {
      background: linear-gradient(135deg, #154360, #1f618d);
      box-shadow: 0 6px 14px rgba(26, 82, 118, 0.22);
      transform: translateY(-1px);
    }

    .seu-inline-reserve-btn:disabled {
      border-color: #c7d1d9;
      background: #eef2f5;
      color: #7f8c8d;
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }
  `;
  document.head.appendChild(style);

  const handle = document.createElement("div");
  handle.className = "seu-reserve-handle";
  handle.textContent = "东南大学讲座预约";

  const dock = document.createElement("div");
  dock.className = "seu-reserve-dock";

  const notebook = document.createElement("div");
  notebook.className = "seu-reserve-notebook";

  notebook.innerHTML = `
    <div class="seu-reserve-inner">
      <div class="seu-reserve-title">
        <span>东南大学讲座预约</span>
        <button class="seu-reserve-close" id="seu-close" aria-label="关闭">×</button>
      </div>
      <div class="seu-reserve-detected-list" id="seu-detected-list">
        <!-- Lectures will be injected here -->
      </div>
      <div class="seu-reserve-status" id="seu-status"></div>
      <div class="seu-reserve-tasks">
        <div class="seu-reserve-task-header">
          <h4>计划任务</h4>
          <button class="seu-reserve-task-refresh" id="seu-refresh">同步</button>
        </div>
        <div id="seu-task-list"></div>
      </div>
    </div>
  `;

  dock.appendChild(notebook);
  document.body.appendChild(handle);
  document.body.appendChild(dock);
  if (!isTopWindow) {
    handle.style.display = "none";
    dock.style.display = "none";
  }

  let isOpen = false;
  let refreshTimer = null;

  const setOpen = (open, immediate = false) => {
    isOpen = open;
    if (open) {
      dock.classList.add("open");
      handle.classList.add("seu-reserve-hidden");
      refreshAll();
      if (!refreshTimer) {
        refreshTimer = setInterval(refreshAll, 5000);
      }
    } else {
      dock.classList.remove("open");
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      if (immediate) {
        handle.classList.remove("seu-reserve-hidden");
        return;
      }
      const onEnd = () => {
        handle.classList.remove("seu-reserve-hidden");
        handle.classList.add("reveal");
        setTimeout(() => handle.classList.remove("reveal"), 260);
        dock.removeEventListener("transitionend", onEnd);
      };
      dock.addEventListener("transitionend", onEnd);
    }
  };

  setOpen(false, true);
  requestAnimationFrame(() => setOpen(false, true));

  handle.addEventListener("click", () => setOpen(!isOpen));
  notebook.querySelector("#seu-close").addEventListener("click", () => setOpen(false));

  const statusEl = notebook.querySelector("#seu-status");
  const detectedListEl = notebook.querySelector("#seu-detected-list");
  const taskListEl = notebook.querySelector("#seu-task-list");
  const refreshBtn = notebook.querySelector("#seu-refresh");

  const updateStatus = (text, isError = false) => {
    statusEl.textContent = text;
    statusEl.style.color = isError ? "#c0392b" : "#5d6d7e";
  };

  const statusLabel = (status) => {
    switch (status) {
      case "scheduled": return "已安排";
      case "running": return "进行中";
      case "success": return "已成功";
      case "full": return "名额已满";
      case "failed": return "失败";
      case "cancelled": return "已取消";
      default: return status || "-";
    }
  };

  const resultLabel = (result) => {
    const key = String(result || "").trim();
    if (!key) return "";
    const table = {
      captcha_not_configured: "\u9a8c\u8bc1\u7801\u914d\u7f6e\u4e0d\u5b8c\u6574",
      wid_not_found: "\u672a\u5339\u914d\u5230\u6d3b\u52a8ID",
      max_attempts: "\u8fbe\u5230\u6700\u5927\u91cd\u8bd5\u6b21\u6570",
      login_required: "\u767b\u5f55\u5931\u6548\uff0c\u8bf7\u91cd\u65b0\u767b\u5f55",
      wid_resolved: "\u5df2\u81ea\u52a8\u5339\u914d\u6d3b\u52a8ID",
      already_reserved: "\u5df2\u9884\u7ea6\uff0c\u65e0\u9700\u91cd\u590d\u63d0\u4ea4",
      network_error: "\u7f51\u7edc\u5f02\u5e38",
      ended: "\u6d3b\u52a8\u5df2\u622a\u6b62"
    };
    return table[key] || key;
  };

  const formatTime = (ms) => {
    if (!ms) return "-";
    const dt = new Date(ms);
    return dt.toLocaleString('sv-SE', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).replace(' ', 'T');
  };

  const parseTime = (value) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return null;
    const timeOnly = /^\d{2}:\d{2}(:\d{2})?$/;
    const dateTime = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/;

    if (timeOnly.test(trimmed)) {
      const now = new Date();
      const parts = trimmed.split(":").map((p) => Number(p));
      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1], parts[2] || 0, 0);
      return target.getTime();
    }
    if (dateTime.test(trimmed.replace(' ', 'T'))) {
      const dt = new Date(trimmed.replace(' ', 'T'));
      return isNaN(dt.getTime()) ? null : dt.getTime();
    }
    return null;
  };

  const normalizeTaskTitle = (title) => normalizeLectureText(title)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[【】[\]()（）"'`.,，。!！?？:：;；\-—_]/g, "");

  const normalizeTimeKey = (timeText) => normalizeLectureText(timeText).replace(/\s+/g, "").replace(/[-/:]/g, "");

  const titleLooksMatched = (a, b) => {
    const x = normalizeTaskTitle(a);
    const y = normalizeTaskTitle(b);
    if (!x || !y) return false;
    return x === y || x.includes(y) || y.includes(x);
  };

  const getLectureTaskKey = (item) => {
    const wid = String((item && item.wid) || "").trim();
    if (wid) return `w:${wid}`;
    const titleKey = normalizeTaskTitle(item && item.title);
    return titleKey ? `t:${titleKey}` : "";
  };

  const getExistingTaskKeys = (tasks = []) => new Set(
    (tasks || []).map((task) => getLectureTaskKey(task)).filter(Boolean)
  );

  const getLectureScheduleText = (lecture) => normalizeLectureText(
    (lecture && (lecture.reserveStartStr || lecture.timeStr)) || ""
  );

  const getTaskScheduleText = (task) => {
    const direct = normalizeLectureText(
      (task && (task.reserveStartStr || task.timeStr)) || ""
    );
    if (direct) return direct;

    const scheduledAt = Number(task && task.scheduledAt);
    if (!Number.isFinite(scheduledAt) || scheduledAt <= 0) return "";
    const dt = new Date(scheduledAt);
    return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
  };

  const doesTaskMatchLecture = (task, lecture) => {
    if (!task || !lecture) return false;

    const taskWid = String(task.wid || "").trim();
    const lectureWid = String(lecture.wid || "").trim();
    if (taskWid && lectureWid) return taskWid === lectureWid;

    if (!titleLooksMatched(task.title, lecture.title)) return false;

    const taskTimeKey = normalizeTimeKey(getTaskScheduleText(task));
    const lectureTimeKey = normalizeTimeKey(getLectureScheduleText(lecture));
    if (!taskTimeKey || !lectureTimeKey) return true;
    return taskTimeKey === lectureTimeKey || taskTimeKey.includes(lectureTimeKey) || lectureTimeKey.includes(taskTimeKey);
  };

  const isHardBlockedStatus = (statusText) => /(已满|已结束|截止)/.test(String(statusText || ""));

  const scrapeAndRenderLectures = (tasks = []) => {
    detectedListEl.innerHTML = "";
    const existingTaskWIDs = new Set(tasks.map(t => t.wid));

    const lectureItems = document.querySelectorAll('div.bh-mb-16');
    if (lectureItems.length === 0) {
      detectedListEl.innerHTML = '<p style="font-size:12px; color:#5a4c34; text-align:center;">当前页面似乎没有可预约的活动。</p>';
      return;
    }

    lectureItems.forEach(item => {
      try {
        const linkElement = item.querySelector('a.bh-text-color-primary[title]');
        const timeElement = item.querySelector('div.bh-color-primary-light-3');
        if (!linkElement) return;

        const title = linkElement.getAttribute('title');
        const href = linkElement.getAttribute('href');
        const widMatch = href ? href.match(/WID=(\w+)/) : null;
        const wid = widMatch ? widMatch[1] : null;
        if (!wid || !title) return;

        let timeStr = "";
        if (timeElement) {
          const timeText = timeElement.textContent || "";
          const timeMatch = timeText.match(/(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2})/);
          if (timeMatch) timeStr = `${timeMatch[1]}:00`;
        }

        const lectureEl = document.createElement('div');
        lectureEl.className = 'seu-reserve-lecture-item';
        lectureEl.innerHTML = `
          <div class="seu-reserve-lecture-title"></div>
          <div class="seu-reserve-lecture-inputs">
            <input class="seu-reserve-input time-input" placeholder="预约时间 YYYY-MM-DD HH:MM:SS" />
            <button class="seu-reserve-btn primary schedule-btn">预约</button>
          </div>
        `;

        lectureEl.querySelector('.seu-reserve-lecture-title').textContent = title;
        const timeInput = lectureEl.querySelector('.time-input');
        timeInput.value = timeStr;

        const scheduleBtn = lectureEl.querySelector('.schedule-btn');
        scheduleBtn.dataset.wid = wid;
        scheduleBtn.dataset.title = title;

        if (existingTaskWIDs.has(wid)) {
          scheduleBtn.disabled = true;
          scheduleBtn.textContent = '已预约';
        }

        scheduleBtn.addEventListener('click', (e) => {
          const btn = e.target;
          if (btn.disabled) return;

          const scheduledAt = parseTime(timeInput.value);
          if (!scheduledAt) {
            updateStatus("时间格式不正确", true);
            return;
          }

          btn.disabled = true;
          updateStatus("正在创建任务...");

          chrome.runtime.sendMessage(
            { type: "createTask", wid: btn.dataset.wid, title: btn.dataset.title, scheduledAt },
            (resp) => {
              if (resp && resp.ok) {
                updateStatus("已创建定时任务。");
                btn.textContent = '已预约';
                refreshAll(); // Refresh both lists
              } else {
                updateStatus("定时任务创建失败。", true);
                btn.disabled = false; // Re-enable on failure
              }
            }
          );
        });

        detectedListEl.appendChild(lectureEl);
      } catch (err) {
        console.warn("SEU reserve - error parsing a lecture item:", err);
      }
    });

    if (detectedListEl.children.length === 0) {
      detectedListEl.innerHTML = '<p style="font-size:12px; color:#5a4c34; text-align:center;">当前页面似乎没有可预约的活动。</p>';
    }
  };

  const LECTURE_SEED_SELECTOR = 'div.bh-mb-16, [data-wid], [wid], a[href*="WID="], a[href*="wid="], [onclick*="WID"], [onclick*="wid"], [data-href*="WID"], [data-url*="WID"], .mint-text.ydd-text-overflow.mt-color-default[title], [class*="ydd-text-overflow"][title], [title*="【"]';

  const normalizeLectureText = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const pad2 = (value) => String(value).padStart(2, "0");
  const decodeMaybeUri = (value) => {
    const text = String(value || "");
    if (!text) return "";
    try {
      return decodeURIComponent(text);
    } catch (err) {
      return text;
    }
  };

  const parseDateTimeText = (text) => {
    const source = normalizeLectureText(text);
    const match = source.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+|\/)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return "";
    const [, y, m, d, hh, mm, ss] = match;
    return `${y}-${pad2(m)}-${pad2(d)} ${pad2(hh)}:${pad2(mm)}:${pad2(ss || "00")}`;
  };

  const parseReserveStartText = (text) => {
    const source = normalizeLectureText(text);
    if (!source) return "";
    const hit = source.match(/(?:预约起止时间|预约时间|报名时间)\s*[:：]?\s*([0-9]{4}[-/.][0-9]{1,2}[-/.][0-9]{1,2}(?:\s+|\/)[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)/);
    if (hit && hit[1]) return parseDateTimeText(hit[1]);
    return parseDateTimeText(source);
  };

  const extractWidFromRaw = (raw) => {
    const rawText = String(raw || "");
    if (!rawText) return null;
    const candidates = [rawText, decodeMaybeUri(rawText)];
    const patterns = [
      /(?:\?|&|#)(?:WID|wid)=([^&#"'`\s]+)/i,
      /(?:%3F|%26)(?:WID|wid)(?:=|%3D)([^&#"'`\s%]+)/i,
      /["'`](?:WID|wid)["'`]\s*:\s*["'`]([^"'`]+)["'`]/i,
      /(?:^|[{"'`\s,;])(?:WID|wid)\s*[:=]\s*["'`]?([A-Za-z0-9._:-]{4,})/i,
      /\/(?:WID|wid)\/([^/?#"'`\s]+)/i
    ];
    for (const text of candidates) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match || !match[1]) continue;
        const cleaned = decodeMaybeUri(match[1]).replace(/["'`,;)}\]]+$/g, "").trim();
        if (cleaned && !/^WID$/i.test(cleaned)) return cleaned;
      }
    }
    return null;
  };

  const looksLikeWidValue = (value) => {
    const s = String(value || "").trim();
    if (!s) return false;
    if (/^[a-fA-F0-9]{32}$/.test(s)) return true;
    if (/^[A-Za-z0-9._:-]{16,64}$/.test(s)) return true;
    return false;
  };

  const extractWidFromObject = (input, maxDepth = 5, maxNodes = 1200) => {
    if (!input || (typeof input !== "object" && typeof input !== "function")) return null;

    const queue = [{ value: input, depth: 0 }];
    const visited = new Set();
    let scanned = 0;

    while (queue.length > 0 && scanned < maxNodes) {
      const { value, depth } = queue.shift();
      if (!value) continue;

      const t = typeof value;
      if (t !== "object" && t !== "function") {
        if (t === "string") {
          const fromRaw = extractWidFromRaw(value);
          if (fromRaw) return fromRaw;
          if (looksLikeWidValue(value)) return String(value).trim();
        }
        continue;
      }

      if (visited.has(value)) continue;
      visited.add(value);
      scanned += 1;
      if (depth > maxDepth) continue;

      let keys = [];
      try {
        keys = Object.keys(value);
      } catch (err) {
        continue;
      }

      for (const key of keys) {
        let child = null;
        try {
          child = value[key];
        } catch (err) {
          continue;
        }

        if (/(?:^|[_-])(wid|WID)(?:$|[_-])/.test(String(key))) {
          const direct = extractWidFromRaw(child);
          if (direct) return direct;
          if (looksLikeWidValue(child)) return String(child).trim();
        }

        const childType = typeof child;
        if (childType === "string") {
          const parsed = extractWidFromRaw(child);
          if (parsed) return parsed;
        } else if ((childType === "object" || childType === "function") && child) {
          queue.push({ value: child, depth: depth + 1 });
        }
      }
    }

    return null;
  };

  const extractWidFromVueNode = (node) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

    const candidates = [];
    const seen = new Set();
    const push = (v) => {
      if (!v || seen.has(v)) return;
      seen.add(v);
      candidates.push(v);
    };

    let cur = node;
    let hop = 0;
    while (cur && hop < 6) {
      hop += 1;
      try {
        push(cur.__vue__);
      } catch (err) {}
      try {
        push(cur.__vueParentComponent);
      } catch (err) {}
      try {
        push(cur.__vnode);
      } catch (err) {}
      try {
        const own = Object.keys(cur).filter((k) => /^__v|^__vue/i.test(k)).slice(0, 20);
        for (const k of own) push(cur[k]);
      } catch (err) {}
      cur = cur.parentElement;
    }

    for (const c of candidates) {
      const wid = extractWidFromObject(c);
      if (wid) return wid;
    }
    return null;
  };

  const extractWidFromNodeDeep = (root) => {
    if (!root || !root.querySelectorAll) return null;
    const queue = [root, ...Array.from(root.querySelectorAll("*")).slice(0, 300)];
    for (const node of queue) {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) continue;
      const direct = extractWidFromElement(node);
      if (direct) return direct;

      if (node.attributes) {
        for (const attr of Array.from(node.attributes)) {
          const value = `${attr.name || ""}=${attr.value || ""}`;
          const wid = extractWidFromRaw(value);
          if (wid) return wid;
        }
      }

      const vueWid = extractWidFromVueNode(node);
      if (vueWid) return vueWid;

      const textWid = extractWidFromRaw(node.textContent);
      if (textWid) return textWid;
    }
    const rootVueWid = extractWidFromVueNode(root);
    if (rootVueWid) return rootVueWid;
    const htmlWid = extractWidFromRaw(root.innerHTML || "");
    if (htmlWid) return htmlWid;
    return null;
  };

  const extractWidFromElement = (element) => {
    if (!element) return null;
    const vueWid = extractWidFromVueNode(element);
    if (vueWid) return vueWid;
    const attrs = ["data-wid", "wid", "href", "onclick", "data-url", "data-href", "data-link", "value"];
    for (const attr of attrs) {
      const wid = extractWidFromRaw(element.getAttribute && element.getAttribute(attr));
      if (wid) return wid;
    }
    if (element.dataset) {
      for (const value of Object.values(element.dataset)) {
        const wid = extractWidFromRaw(value);
        if (wid) return wid;
      }
    }
    return null;
  };

  const collectAccessibleRoots = () => {
    const roots = [document];
    for (const frameEl of Array.from(document.querySelectorAll("iframe, frame"))) {
      try {
        const subDoc = frameEl.contentDocument;
        if (subDoc && subDoc.documentElement) roots.push(subDoc);
      } catch (err) {
        // Ignore cross-origin frames.
      }
    }
    return roots;
  };

  const querySeedsDeep = (root, selector) => {
    const out = [];
    const stack = [root];
    const visited = new Set();
    while (stack.length > 0) {
      const node = stack.pop();
      if (!node || visited.has(node) || !node.querySelectorAll) continue;
      visited.add(node);
      out.push(...Array.from(node.querySelectorAll(selector)));
      const hosts = node.querySelectorAll("*");
      for (const host of hosts) {
        if (host && host.shadowRoot) stack.push(host.shadowRoot);
      }
    }
    return out;
  };

  const collectLecturesFromLocalPage = () => {
    const statusWordRe = /(?:\u672A\u5F00\u653E|\u5F85\u5F00\u653E|\u5DF2\u5F00\u653E|\u53EF\u9884\u7EA6|\u9884\u7EA6\u4E2D|\u5DF2\u6EE1|\u5DF2\u7ED3\u675F|\u672A\u5F00\u59CB|\u5DF2\u9884\u7EA6|\u9884\u7EA6|\u62A5\u540D|\u8FDB\u884C\u4E2D|\u5F00\u653E|\u622A\u6B62|reserve|signup|registration|open|full|closed|available|unavailable)/i;
    const titleBanRe = /^(?:\u672A\u5F00\u653E|\u5DF2\u6EE1|\u5DF2\u7ED3\u675F|\u9884\u7EA6|\u62A5\u540D|\u8FDB\u884C\u4E2D|\u5F00\u653E|\u5DF2\u9884\u7EA6|\u622A\u6B62|reserve|signup|registration|open|full|closed|available|unavailable)$/i;
    const lectureHintRe = /(?:\u8BB2\u5EA7|\u62A5\u544A|\u5B66\u672F|\u8BBA\u575B|\u6C99\u9F99|\u5BA3\u8BB2|\u5927\u8BB2\u5802|lecture|seminar|colloquium|symposium)/i;
    const cultureEventRe = /(?:\u827A\u672F|\u821E\u5267|\u8BDD\u5267|\u97F3\u4E50\u4F1A|\u89C1\u9762\u4F1A|\u6F14\u51FA|\u5C55\u6F14|\u4E00[\u201C\"']?\u5267[\u201D\"']?\u949F\u60C5|\u7EFF\u8272\u901A\u9053|\u5E38\u89C4\u901A\u9053|\u7EBF\u4E0B)/i;
    const excludeTitleRe = /(?:\u9009\u542C\u7814\u7A76\u751F\u4EBA\u6587\u4E0E\u79D1\u5B66\u7D20\u517B\u7CFB\u5217\u8BB2\u5EA7)/i;
    const nonLectureRe = /(?:\u4F53\u80B2|\u7FBD\u6BDB\u7403|\u7BEE\u7403|\u8DB3\u7403|\u4E52\u4E53\u7403|\u6E38\u6CF3|\u5065\u8EAB|\u573A\u9986|\u7403\u573A|\u573A\u5730|\u793E\u56E2|\u5FD7\u613F|\u7ADE\u8D5B|\u8DEF\u6F14|\u7968\u52A1|movie|sport|gym|stadium|court)/i;
    const pageUrl = String((window.location && window.location.href) || "");
    const isYddjPage = /\/yddjzxxtjappseu\//i.test(pageUrl);
    const routeHash = String((window.location && window.location.hash) || "");
    const isHdyyRoute = /^#\/hdyy(?:$|[/?])/i.test(routeHash);
    const hasActionNode = (node) => {
      if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
      const actionSel = "button, a[href], [onclick], [role='button'], [data-action]";
      try {
        if (node.matches && node.matches(actionSel)) return true;
      } catch (err) {}
      return Boolean(node.querySelector && node.querySelector(actionSel));
    };

    const isLikelyLecture = (title, scopeText, hasWid, context = {}) => {
      const text = normalizeLectureText(`${title || ""} ${scopeText || ""}`);
      if (!text) return false;
      if (excludeTitleRe.test(text)) return false;
      if (nonLectureRe.test(text)) return false;
      const hasLectureWord = lectureHintRe.test(text);
      const hasCultureWord = cultureEventRe.test(text);
      const hasStatus = statusWordRe.test(text);
      const hasAction = Boolean(context.hasAction);
      const hasDateTime = Boolean(context.hasDateTime);
      const hasTagTitle = /【[^】]{1,12}】/.test(text);

      if (!isYddjPage || !isHdyyRoute) return false;
      if (hasLectureWord) return true;
      if (hasCultureWord && (hasTagTitle || hasLectureWord || hasAction || hasStatus || hasDateTime)) return true;
      if (hasTagTitle && (hasCultureWord || hasLectureWord)) return true;
      if (hasTagTitle && (hasAction || hasStatus || hasDateTime)) return true;
      if (hasWid && /(?:\u5B66\u672F|\u62A5\u544A|\u8BBA\u575B|\u8BB2\u5802|lecture|seminar)/i.test(text)) return true;
      return hasWid && hasDateTime && hasStatus && hasAction;
    };
    if (!isYddjPage || !isHdyyRoute) {
      return { lectures: [], rootsCount: 0, seedsCount: 0 };
    }
    const roots = collectAccessibleRoots();
    const rootHtmlCache = roots.map((root) => {
      try {
        return (root.documentElement && root.documentElement.innerHTML) || "";
      } catch (err) {
        return "";
      }
    }).filter(Boolean);

    const inferWidFromPageByHint = (...hints) => {
      const candidates = hints
        .map((x) => normalizeLectureText(x))
        .filter((x) => x && x.length >= 4)
        .slice(0, 6);
      if (candidates.length === 0 || rootHtmlCache.length === 0) return "";

      for (const html of rootHtmlCache) {
        for (const hint of candidates) {
          let from = 0;
          for (let i = 0; i < 3; i += 1) {
            const idx = html.indexOf(hint, from);
            if (idx < 0) break;
            const slice = html.slice(Math.max(0, idx - 1800), Math.min(html.length, idx + hint.length + 1800));
            const wid = extractWidFromRaw(slice);
            if (wid) return wid;
            from = idx + hint.length;
          }
        }
      }
      return "";
    };

    const seeds = [];
    const seedSet = new Set();
    const pushSeed = (node) => {
      if (!node || seedSet.has(node)) return;
      seedSet.add(node);
      seeds.push(node);
    };

    for (const root of roots) {
      try {
        for (const n of querySeedsDeep(root, LECTURE_SEED_SELECTOR)) pushSeed(n);
      } catch (err) {
        console.warn("SEU reserve - query in root failed:", err);
      }
    }

    if (seeds.length === 0) {
      const fallbackSelector = [
        ".bh-list-item", ".bh-card", ".ant-list-item", ".el-card", ".el-table__row",
        "[class*='item']", "[class*='card']", "[class*='list']",
        "li", "tr", "article", "section", "[role='listitem']", "[role='row']"
      ].join(", ");
      for (const root of roots) {
        try {
          const nodes = querySeedsDeep(root, fallbackSelector).slice(0, 2500);
          for (const node of nodes) {
            const text = normalizeLectureText(node.textContent || "");
            if (!text || text.length < 2 || text.length > 260) continue;
            const hasDate = /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(text);
            const hasTime = /\d{1,2}:\d{2}/.test(text);
            const hasAction = hasActionNode(node);
            const hinted = statusWordRe.test(text) || cultureEventRe.test(text) || (lectureHintRe.test(text) && hasAction) || ((hasDate && hasTime) && !nonLectureRe.test(text));
            if (!hinted) continue;
            if (!hasAction && !(hasDate && hasTime) && !statusWordRe.test(text)) continue;
            pushSeed(node);
          }
        } catch (err) {
          console.warn("SEU reserve - fallback seed scan failed:", err);
        }
      }
    }

    const seen = new Set();
    const lectures = [];
    const addLecture = (wid, title, timeStr = "", statusText = "", fallbackNo = 0, reserveStartStr = "") => {
      const cleanWid = String(wid || "").trim();
      const cleanTitle = normalizeLectureText(title);
      const cleanTime = normalizeLectureText(timeStr);
      const cleanStatus = normalizeLectureText(statusText);
      const cleanReserveStart = normalizeLectureText(reserveStartStr);
      const key = cleanWid
        ? `wid:${cleanWid}`
        : `virtual:${cleanTitle || `item-${fallbackNo || lectures.length + 1}`}|${cleanReserveStart || cleanTime}`;
      if (seen.has(key)) return;
      if (!cleanWid && !cleanTitle && !cleanStatus) return;
      seen.add(key);
      lectures.push({
        id: key,
        wid: cleanWid,
        title: cleanTitle || `讲座 ${fallbackNo || lectures.length}`,
        timeStr: cleanTime,
        reserveStartStr: cleanReserveStart,
        statusText: cleanStatus
      });
    };

    let fallbackCounter = 1;

    // Specialized parser for yddj activity cards.
    for (const root of roots) {
      try {
        const cards = querySeedsDeep(root, ".activity-container");
        for (const card of cards) {
          const titleEl = card.querySelector(".activity-name .mint-text[title], .activity-name [title], .activity-name .mint-text");
          if (!titleEl) continue;

          const title = normalizeLectureText(
            (titleEl.getAttribute && (titleEl.getAttribute("title") || titleEl.getAttribute("data-title")))
            || titleEl.textContent
          );
          if (!title || excludeTitleRe.test(title)) continue;

          const category = normalizeLectureText(
            (card.querySelector(".hdxq-hdlx .mint-text") && card.querySelector(".hdxq-hdlx .mint-text").textContent) || ""
          );
          const statusText = normalizeLectureText(
            (card.querySelector(".ydd-button-small") && card.querySelector(".ydd-button-small").textContent) || ""
          );
          const lectureTimeText = normalizeLectureText(
            (card.querySelector(".activity-text .mint-text[title*='/']") && card.querySelector(".activity-text .mint-text[title*='/']").getAttribute("title")) || ""
          );
          const reserveTimeText = normalizeLectureText(
            (card.querySelector(".activity-time") && card.querySelector(".activity-time").textContent) || ""
          );
          const scopeText = normalizeLectureText(card.textContent || "");
          const hasAction = hasActionNode(card);
          const hasDateTime = Boolean(parseDateTimeText(lectureTimeText || reserveTimeText || scopeText));
          let wid = extractWidFromNodeDeep(card) || "";
          if (!wid) wid = inferWidFromPageByHint(title, lectureTimeText, reserveTimeText, scopeText) || "";

          if (!isLikelyLecture(`${title} ${category}`, scopeText, Boolean(wid), { hasAction, hasDateTime })) {
            continue;
          }

          const timeStr = parseDateTimeText(lectureTimeText || reserveTimeText || scopeText);
          const reserveStartStr = parseReserveStartText(reserveTimeText || scopeText);
          addLecture(wid, title, timeStr, statusText || category, fallbackCounter++, reserveStartStr);
        }
      } catch (err) {
        console.warn("SEU reserve - parse activity-container failed:", err);
      }
    }

    for (const seed of seeds) {
      try {
        if (seed.closest && seed.closest(".activity-container")) continue;
        const nested = seed.querySelector ? seed.querySelector("a[href], [data-wid], [onclick], button, input") : null;
        let wid = extractWidFromElement(seed)
          || extractWidFromElement(nested)
          || extractWidFromRaw(seed.textContent)
          || extractWidFromRaw(seed.innerHTML)
          || extractWidFromNodeDeep(seed);

        const container = seed.closest && seed.closest("div.bh-mb-16, tr, li, .bh-card, .bh-list-item, .ant-list-item, .el-card, .el-table__row, [class*='item'], [class*='card'], [class*='list']");
        const scope = container || seed;
        const titleNode = scope.querySelector && scope.querySelector(".mint-text.ydd-text-overflow.mt-color-default[title], [class*='ydd-text-overflow'][title], [title], [data-title], h1, h2, h3, h4, .title, .name, .bh-text-color-primary, a, strong, b");
        let title = (titleNode && titleNode.getAttribute && (titleNode.getAttribute("title") || titleNode.getAttribute("data-title")))
          || (titleNode && titleNode.textContent)
          || (seed.getAttribute && (seed.getAttribute("title") || seed.getAttribute("aria-label")))
          || "";
        title = normalizeLectureText(title);
        if (!title || titleBanRe.test(title)) {
          const scopeText = normalizeLectureText(scope.textContent || "");
          const cleaned = scopeText
            .replace(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\s+\d{1,2}:\d{2}(?::\d{2})?/g, " ")
            .replace(/(?:\u672A\u5F00\u653E|\u5DF2\u6EE1|\u5DF2\u7ED3\u675F|\u9884\u7EA6|\u62A5\u540D|\u8FDB\u884C\u4E2D|\u5F00\u653E|\u5DF2\u9884\u7EA6|\u622A\u6B62|reserve|signup|registration|open|full|closed|available|unavailable)/gi, " ")
            .replace(/\s+/g, " ")
            .trim();
          title = cleaned || "";
        }
        const statusText = normalizeLectureText(seed.textContent || "");
        const scopeText = normalizeLectureText(scope.textContent || "");
        const hasAction = hasActionNode(scope);
        const hasDateTime = /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(scopeText) && /\d{1,2}:\d{2}/.test(scopeText);
        const timeStr = parseDateTimeText(scope.textContent);
        const reserveStartStr = parseReserveStartText(scopeText);
        if (!wid) wid = inferWidFromPageByHint(title, scopeText, timeStr, reserveStartStr) || "";
        if (!isLikelyLecture(title, scopeText, Boolean(wid), { hasAction, hasDateTime })) {
          continue;
        }
        if (wid) {
          addLecture(wid, title, timeStr, statusText, fallbackCounter++, reserveStartStr);
          continue;
        }
        if (statusWordRe.test(statusText) || lectureHintRe.test(statusText) || cultureEventRe.test(title) || /【[^】]{1,16}】/.test(title)) {
          addLecture("", title, timeStr, statusText, fallbackCounter++, reserveStartStr);
        }
      } catch (err) {
        console.warn("SEU reserve - parse item failed:", err);
      }
    }

    if (lectures.length === 0) {
      for (const root of roots) {
        try {
          const html = (root.documentElement && root.documentElement.innerHTML) || "";
          const patterns = [
            /(?:\?|&)(?:WID|wid)=([A-Za-z0-9_-]+)/g,
            /"(?:WID|wid)"\s*:\s*"([A-Za-z0-9_-]+)"/g
          ];
          for (const re of patterns) {
            let m = null;
            while ((m = re.exec(html)) !== null) {
              addLecture(m[1], `讲座 ${m[1]}`, "", "", fallbackCounter++, "");
            }
          }
        } catch (err) {
          console.warn("SEU reserve - html fallback parse failed:", err);
        }
      }
    }

    return { lectures, rootsCount: roots.length, seedsCount: seeds.length };
  };

  const reportDetectedLectures = (lectures) => {
    try {
      if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) return;
      chrome.runtime.sendMessage({ type: "reportDetectedLectures", lectures }, () => {
        void chrome.runtime.lastError;
      });
    } catch (err) {
      // Ignore reporting failures.
    }
  };

  const clearInlineReservationButtons = () => {
    for (const node of Array.from(document.querySelectorAll(".seu-inline-reserve-action"))) {
      node.remove();
    }
    for (const node of Array.from(document.querySelectorAll(".seu-inline-reserve-host"))) {
      node.classList.remove("seu-inline-reserve-host");
    }
  };

  const collectInlineLectureHosts = () => {
    const hosts = [];
    const seenRoots = new Set();

    const buildHost = (root) => {
      if (!root || seenRoots.has(root)) return;
      seenRoots.add(root);

      const titleNode = root.querySelector && root.querySelector(
        ".activity-name .mint-text[title], .activity-name [title], .activity-name .mint-text, .mint-text.ydd-text-overflow.mt-color-default[title], [class*='ydd-text-overflow'][title], [data-title], [title], .bh-text-color-primary, a, strong, b"
      );
      const title = normalizeLectureText(
        (titleNode && titleNode.getAttribute && (titleNode.getAttribute("title") || titleNode.getAttribute("data-title")))
        || (titleNode && titleNode.textContent)
        || ""
      );
      const scopeText = normalizeLectureText(root.textContent || "");
      const lectureTimeText = normalizeLectureText(
        (root.querySelector && root.querySelector(".activity-text .mint-text[title*='/']") && root.querySelector(".activity-text .mint-text[title*='/']").getAttribute("title")) || ""
      );
      const reserveTimeText = normalizeLectureText(
        (root.querySelector && root.querySelector(".activity-time") && root.querySelector(".activity-time").textContent) || ""
      );
      const statusText = normalizeLectureText(
        (root.querySelector && root.querySelector(".ydd-button-small") && root.querySelector(".ydd-button-small").textContent) || ""
      );
      const wid = extractWidFromNodeDeep(root) || "";
      const reserveStartStr = parseReserveStartText(reserveTimeText || scopeText);
      const timeStr = parseDateTimeText(lectureTimeText || reserveTimeText || scopeText);
      const anchor = (root.querySelector && root.querySelector(".ydd-button-small, .activity-time, .activity-name")) || root.lastElementChild || root;

      hosts.push({
        root,
        anchor,
        wid,
        title,
        reserveStartStr,
        timeStr,
        statusText,
        scopeText
      });
    };

    for (const card of querySeedsDeep(document, ".activity-container")) {
      buildHost(card);
    }

    if (hosts.length === 0) {
      const fallbackRoots = querySeedsDeep(document, "div.bh-mb-16, .bh-card, .bh-list-item, .ant-list-item, .el-card, li, tr");
      for (const root of fallbackRoots.slice(0, 120)) {
        buildHost(root);
      }
    }

    return hosts.filter((host) => host.title || host.wid || host.reserveStartStr || host.timeStr);
  };

  const findBestInlineHost = (lecture, hosts, usedRoots) => {
    let best = null;
    let bestScore = -1;
    const lectureTimeKey = normalizeTimeKey(getLectureScheduleText(lecture));

    for (const host of hosts) {
      if (!host || !host.root || usedRoots.has(host.root)) continue;

      let score = 0;
      if (lecture.wid && host.wid && lecture.wid === host.wid) score += 100;
      if (titleLooksMatched(lecture.title, host.title)) score += 40;
      if (lectureTimeKey) {
        const hostTimeKey = normalizeTimeKey(host.reserveStartStr || host.timeStr);
        if (hostTimeKey && (lectureTimeKey === hostTimeKey || lectureTimeKey.includes(hostTimeKey) || hostTimeKey.includes(lectureTimeKey))) {
          score += 20;
        }
      }
      if (/activity-container/.test(String(host.root.className || ""))) score += 5;
      if (score > bestScore) {
        bestScore = score;
        best = host;
      }
    }

    return bestScore > 0 ? best : null;
  };

  const renderInlineReservationButtons = (tasks = [], localData = null) => {
    clearInlineReservationButtons();
    const local = localData || collectLecturesFromLocalPage();
    const lectures = Array.isArray(local && local.lectures) ? local.lectures : [];
    if (lectures.length === 0) return;

    const hosts = collectInlineLectureHosts();
    const usedRoots = new Set();

    for (const lecture of lectures) {
      const host = findBestInlineHost(lecture, hosts, usedRoots);
      if (!host || !host.root) continue;
      usedRoots.add(host.root);
      host.root.classList.add("seu-inline-reserve-host");

      const scheduleText = getLectureScheduleText(lecture);
      const scheduledAt = parseTime(scheduleText);
      const matchedTask = (tasks || []).find((task) => doesTaskMatchLecture(task, lecture)) || null;
      const taskKey = getLectureTaskKey(matchedTask || lecture);
      const isExisting = Boolean(matchedTask);
      const hardBlocked = isHardBlockedStatus(lecture.statusText);

      const action = document.createElement("div");
      action.className = "seu-inline-reserve-action";
      action.dataset.seuInlineKey = taskKey || normalizeTaskTitle(lecture.title);

      const stopHostPropagation = (event) => {
        if (!event) return;
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === "function") {
          event.stopImmediatePropagation();
        }
      };

      const swallowHostNavigation = (event) => {
        if (!event) return;
        event.preventDefault();
        stopHostPropagation(event);
      };

      for (const eventName of ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend"]) {
        action.addEventListener(eventName, stopHostPropagation);
      }
      for (const eventName of ["click", "dblclick"]) {
        action.addEventListener(eventName, swallowHostNavigation);
      }

      const copy = document.createElement("div");
      copy.className = "seu-inline-reserve-copy";
      copy.innerHTML = `
        <span class="seu-inline-reserve-label">预约助手</span>
        <span class="seu-inline-reserve-time"></span>
      `;

      const noteEl = copy.querySelector(".seu-inline-reserve-time");
      if (scheduleText) {
        noteEl.textContent = `预约时间：${scheduleText}`;
      } else if (lecture.statusText) {
        noteEl.textContent = lecture.statusText;
      } else {
        noteEl.textContent = "未识别到预约时间";
      }

      const button = document.createElement("button");
      button.type = "button";
      button.className = "seu-inline-reserve-btn";
      button.textContent = "提前预约";

      if (isExisting) {
        button.disabled = true;
        button.textContent = "已预约";
      } else if (hardBlocked) {
        button.disabled = true;
        button.textContent = lecture.statusText || "暂不可预约";
      } else if (!scheduledAt) {
        button.disabled = true;
        button.textContent = "缺少时间";
      }

      button.addEventListener("click", (event) => {
        swallowHostNavigation(event);
        if (button.disabled || !scheduledAt) return;

        button.disabled = true;
        updateStatus(lecture.wid ? "正在创建预约任务..." : "正在创建提前预约任务...");

        chrome.runtime.sendMessage(
          {
            type: "createTask",
            wid: lecture.wid || "",
            title: lecture.title || "",
            scheduledAt,
            reserveStartStr: lecture.reserveStartStr || "",
            preSchedule: !lecture.wid
          },
          (resp) => {
            const runtimeErr = chrome.runtime.lastError;
            if (runtimeErr) {
              updateStatus(`创建任务失败：${runtimeErr.message || "未知错误"}`, true);
              button.disabled = false;
              return;
            }
            if (resp && resp.ok) {
              updateStatus(lecture.wid ? "任务已加入计划。" : "提前预约任务已创建，开放后会自动匹配并提交。");
              refreshAll(local);
            } else {
              updateStatus("创建任务失败。", true);
              button.disabled = false;
            }
          }
        );
      });

      action.appendChild(copy);
      action.appendChild(button);
      host.root.appendChild(action);
    }
  };

  const scrapeAndRenderLecturesV2 = (tasks = []) => {
    detectedListEl.innerHTML = "";
    const normalizeTaskTitle = (title) => normalizeLectureText(title)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[【】[\]()（）"'`.,，。!！?？:：;；\-—_]/g, "");
    const normalizeTimeKey = (timeText) => normalizeLectureText(timeText).replace(/\s+/g, "").replace(/[-/:]/g, "");
    const existingTaskKeys = new Set(
      (tasks || []).map((t) => {
        const wid = String((t && t.wid) || "").trim();
        if (wid) return `w:${wid}`;
        const keyTitle = normalizeTaskTitle(t && t.title);
        return keyTitle ? `t:${keyTitle}` : "";
      }).filter(Boolean)
    );
    const emptyHtml = '<p style="font-size:12px; color:#5a4c34; text-align:center;">当前页面没有可识别的讲座。</p>';

    const local = collectLecturesFromLocalPage();
    const lectureMap = new Map();
    const titleKeyIndex = new Map();

    const addFromAny = (item) => {
      const wid = String(item && item.wid ? item.wid : "").trim();
      const id = String(item && item.id ? item.id : "").trim();
      const title = normalizeLectureText(item && item.title) || (wid ? `讲座 ${wid}` : "讲座");
      const reserveStartStr = normalizeLectureText(item && item.reserveStartStr);
      const timeStr = normalizeLectureText(item && item.timeStr);
      const statusText = normalizeLectureText(item && item.statusText);
      const titleKey = normalizeTaskTitle(title);
      const whenKey = normalizeTimeKey(reserveStartStr || timeStr);

      let key = "";
      if (wid) {
        key = `w:${wid}`;
      } else if (titleKey && titleKeyIndex.has(titleKey)) {
        key = titleKeyIndex.get(titleKey);
      } else if (titleKey) {
        key = `t:${titleKey}|${whenKey}`;
      } else if (id) {
        key = `i:${id}`;
      }
      if (!key) return;

      if (wid && titleKey && titleKeyIndex.has(titleKey)) {
        const oldKey = titleKeyIndex.get(titleKey);
        const oldVal = lectureMap.get(oldKey);
        if (oldVal && !oldVal.wid) {
          lectureMap.delete(oldKey);
        }
      }

      const existing = lectureMap.get(key);
      if (existing) {
        const existingFromLocal = Boolean(existing._fromLocal);
        const currentFromLocal = Boolean(item && item._fromLocal);
        const preferCurrent = currentFromLocal && !existingFromLocal;
        lectureMap.set(key, {
          ...existing,
          wid: existing.wid || wid,
          title: preferCurrent ? title : (existing.title || title),
          timeStr: preferCurrent ? (timeStr || existing.timeStr) : (existing.timeStr || timeStr),
          reserveStartStr: preferCurrent ? (reserveStartStr || existing.reserveStartStr) : (existing.reserveStartStr || reserveStartStr),
          statusText: preferCurrent ? (statusText || existing.statusText) : (existing.statusText || statusText),
          _fromLocal: existingFromLocal || currentFromLocal
        });
      } else {
        lectureMap.set(key, {
          id: key,
          wid,
          title,
          timeStr,
          reserveStartStr,
          statusText,
          _fromLocal: Boolean(item && item._fromLocal)
        });
      }
      if (titleKey) titleKeyIndex.set(titleKey, key);
    };

    local.lectures.forEach((x) => addFromAny({ ...x, _fromLocal: true }));
    reportDetectedLectures(local.lectures);
    const lectures = Array.from(lectureMap.values());

    if (lectures.length === 0) {
      let sampleHtml = "";
      try {
        const sample = Array.from(document.querySelectorAll(LECTURE_SEED_SELECTOR))
          .slice(0, 2)
          .map((el) => normalizeLectureText(el.outerHTML || "").slice(0, 180))
          .filter(Boolean)
          .join(" | ");
        if (sample) {
          sampleHtml = `<p style="font-size:10px; color:#9aa0a6; text-align:center; margin:6px 6px 0; word-break:break-all;">样本：${sample}</p>`;
        }
      } catch (err) {
        // Ignore sample build errors.
      }
      detectedListEl.innerHTML = `${emptyHtml}<p style="font-size:11px; color:#9aa0a6; text-align:center; margin-top:6px;">根节点数：${local.rootsCount}，候选数：${local.seedsCount}</p>${sampleHtml}`;
      return;
    }

    lectures.forEach(({ wid, title, timeStr, reserveStartStr, statusText }) => {
      const lectureEl = document.createElement("div");
      lectureEl.className = "seu-reserve-lecture-item";
      lectureEl.innerHTML = `
        <div class="seu-reserve-lecture-title"></div>
        <div class="seu-reserve-lecture-inputs">
          <input class="seu-reserve-input time-input" placeholder="预约时间 YYYY-MM-DD HH:MM:SS" />
          <button class="seu-reserve-btn primary schedule-btn">预约</button>
        </div>
      `;

      lectureEl.querySelector(".seu-reserve-lecture-title").textContent = title;
      const timeInput = lectureEl.querySelector(".time-input");
      timeInput.value = reserveStartStr || timeStr;

      const scheduleBtn = lectureEl.querySelector(".schedule-btn");
      scheduleBtn.dataset.wid = wid || "";
      scheduleBtn.dataset.title = title;
      scheduleBtn.dataset.reserveStartStr = reserveStartStr || "";
      const lectureKey = wid ? `w:${wid}` : `t:${normalizeTaskTitle(title)}`;
      const isExisting = existingTaskKeys.has(lectureKey);
      const hardBlocked = /(已满|已结束|截止)/.test(String(statusText || ""));
      if (!wid) {
        scheduleBtn.textContent = hardBlocked ? (statusText || "暂不可预约") : "提前预约";
        timeInput.disabled = false;
      }

      if (isExisting) {
        scheduleBtn.disabled = true;
        scheduleBtn.textContent = "已预约";
      }
      if (!isExisting && hardBlocked) {
        scheduleBtn.disabled = true;
      }

      scheduleBtn.addEventListener("click", (e) => {
        const btn = e.target;
        if (btn.disabled) return;

        const scheduledAt = parseTime(timeInput.value);
        if (!scheduledAt) {
          updateStatus("时间格式不正确", true);
          return;
        }

        btn.disabled = true;
        updateStatus(btn.dataset.wid ? "正在创建任务..." : "正在创建提前预约任务...");

        chrome.runtime.sendMessage(
          {
            type: "createTask",
            wid: btn.dataset.wid || "",
            title: btn.dataset.title || "",
            scheduledAt,
            reserveStartStr: btn.dataset.reserveStartStr || "",
            preSchedule: !btn.dataset.wid
          },
          (resp) => {
            if (resp && resp.ok) {
              updateStatus(btn.dataset.wid ? "任务已创建。" : "提前预约任务已创建，开放后会自动匹配并提交。");
              btn.textContent = "已预约";
              refreshAll();
            } else {
              updateStatus("创建任务失败。", true);
              btn.disabled = false;
            }
          }
        );
      });

      detectedListEl.appendChild(lectureEl);
    });
  };

  const renderTasks = (tasks) => {
    taskListEl.innerHTML = "";
    if (!tasks || tasks.length === 0) {
      taskListEl.innerHTML = '<p style="font-size:12px; color:#7f8c8d; text-align:center; padding: 20px 0;">暂无计划中的预约任务</p>';
      return;
    }
    tasks
      .sort((a, b) => (a.scheduledAt || 0) - (b.scheduledAt || 0))
      .forEach((task) => {
        const item = document.createElement("div");
        item.className = "seu-reserve-task";
        item.innerHTML = `
          <div style="flex: 1; padding-right: 10px;">
            <div class="seu-reserve-task-title"></div>
            <div class="seu-reserve-task-meta">
              <span class="status-sticker ${task.status || ''}"></span>
              <span class="time-label"></span>
            </div>
            <div class="result-label"></div>
          </div>
          <div class="seu-reserve-task-actions">
            <button class="cancel-btn">取消</button>
          </div>
        `;
        item.querySelector('.seu-reserve-task-title').textContent = task.title || "未命名任务";
        item.querySelector('.status-sticker').textContent = statusLabel(task.status);
        item.querySelector('.time-label').textContent = formatTime(task.scheduledAt);
        const reasonEl = item.querySelector('.result-label');
        const reasonText = resultLabel(task.lastResult);
        if (reasonText) {
          reasonEl.textContent = `\u7ed3\u679c\uff1a${reasonText}`;
          if (task.status === "failed") reasonEl.style.color = "#c0392b";
          if (task.status === "success") reasonEl.style.color = "#1e8449";
        } else {
          reasonEl.remove();
        }

        item.querySelector('.cancel-btn').addEventListener('click', () => {
          if (!task || !task.id) {
            updateStatus("任务信息无效，无法取消。", true);
            return;
          }
          try {
            if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
              updateStatus("扩展上下文不可用，请刷新页面后重试。", true);
              return;
            }
            chrome.runtime.sendMessage({ type: "removeTask", id: task.id }, () => {
              const runtimeErr = chrome.runtime.lastError;
              if (runtimeErr) {
                const msg = String(runtimeErr.message || "");
                if (msg.includes("Extension context invalidated")) {
                  updateStatus("扩展已更新，请刷新页面后重试。", true);
                } else {
                  updateStatus(`取消失败：${msg || "未知错误"}`, true);
                }
                return;
              }
              refreshAll();
            });
          } catch (err) {
            const msg = String((err && err.message) || err || "");
            if (msg.includes("Extension context invalidated")) {
              updateStatus("扩展已更新，请刷新页面后重试。", true);
            } else {
              console.warn("SEU reserve cancel error:", err);
              updateStatus("取消失败，请稍后重试。", true);
            }
          }
        });
        taskListEl.appendChild(item);
      });
  };

  const refreshAll = (localData = null) => {
    if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) return;
    try {
      chrome.runtime.sendMessage({ type: "listTasks" }, (resp) => {
        if (chrome.runtime.lastError) return;
        const tasks = (resp && resp.ok) ? (resp.tasks || []) : [];
        if (isOpen && taskListEl && document.body.contains(taskListEl)) {
          renderTasks(tasks);
        }
        renderInlineReservationButtons(tasks, localData);
      });
    } catch (err) {
      if (String(err.message).includes("Extension context invalidated")) {
        if (refreshTimer) clearInterval(refreshTimer);
      } else {
        console.warn("SEU reserve refreshAll error:", err);
      }
    }
  };

  let observer = null;
  let refreshScheduled = null;

  const isNodeInPanel = (node) => {
    if (!node) return false;
    if (node === dock || node === handle) return true;
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    return dock.contains(node) || handle.contains(node);
  };

  const isNodeInInlineReserveUi = (node) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    if (node.classList && node.classList.contains("seu-inline-reserve-action")) return true;
    return Boolean(node.closest && node.closest(".seu-inline-reserve-action"));
  };

  const shouldRefreshFromMutations = (mutations) => {
    for (const mutation of mutations) {
      if (isNodeInPanel(mutation.target) || isNodeInInlineReserveUi(mutation.target)) continue;
      for (const node of mutation.addedNodes || []) {
        if (!isNodeInPanel(node) && !isNodeInInlineReserveUi(node)) return true;
      }
      for (const node of mutation.removedNodes || []) {
        if (!isNodeInPanel(node) && !isNodeInInlineReserveUi(node)) return true;
      }
    }
    return false;
  };

  const scheduleRefresh = () => {
    if (refreshScheduled) return;
    refreshScheduled = setTimeout(() => {
      refreshScheduled = null;
      refreshAll();
    }, 800);
  };

  const startObserver = () => {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (shouldRefreshFromMutations(mutations)) scheduleRefresh();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  startObserver();

  refreshBtn.addEventListener("click", refreshAll);
  refreshAll();

  let frameReportTimer = null;
  let frameReportDebounce = null;
  let frameReportObserver = null;

  const reportLocalLecturesNow = () => {
    const local = collectLecturesFromLocalPage();
    reportDetectedLectures(local.lectures);
  };

  reportLocalLecturesNow();
  frameReportTimer = setInterval(reportLocalLecturesNow, isTopWindow ? 5000 : 3000);
  frameReportObserver = new MutationObserver((mutations) => {
    if (!shouldRefreshFromMutations(mutations)) return;
    if (frameReportDebounce) return;
    frameReportDebounce = setTimeout(() => {
      frameReportDebounce = null;
      reportLocalLecturesNow();
    }, 700);
  });
  if (document.body) {
    frameReportObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      if (document.body && frameReportObserver) {
        frameReportObserver.observe(document.body, { childList: true, subtree: true });
      }
    }, { once: true });
  }

  window.addEventListener("beforeunload", () => {
    if (refreshTimer) clearInterval(refreshTimer);
    if (refreshScheduled) clearTimeout(refreshScheduled);
    if (observer) observer.disconnect();
    if (frameReportTimer) clearInterval(frameReportTimer);
    if (frameReportDebounce) clearTimeout(frameReportDebounce);
    if (frameReportObserver) frameReportObserver.disconnect();
  });

})();

