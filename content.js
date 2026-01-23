(() => {
  if (window.__seuLectureReserveInjected) return;
  window.__seuLectureReserveInjected = true;

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
      /* Strictly approx 2 items height */
      max-height: 22vh; 
      min-height: 100px;
      overflow-y: auto;
      padding-right: 4px;
      margin-bottom: 12px;
      flex-shrink: 0;
      
      /* Scrollbar Styling */
      scrollbar-width: thin;
      scrollbar-color: #d6dbdf transparent;
    }
    
    .seu-reserve-tasks {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0; 
      /* Strictly approx 2 items height */
      max-height: 24vh;
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
      margin: 20px 0 10px;
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

  const scrapeAndRenderLectures = (tasks = []) => {
    detectedListEl.innerHTML = "";
    const existingTaskWIDs = new Set(tasks.map(t => t.wid));

    const lectureItems = document.querySelectorAll('div.bh-mb-16');
    if (lectureItems.length === 0) {
      detectedListEl.innerHTML = '<p style="font-size:12px; color:#5a4c34; text-align:center;">当前页面似乎没有可预约的讲座。</p>';
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
            <input class="seu-reserve-input time-input" placeholder="YYYY-MM-DD HH:MM:SS" />
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
      detectedListEl.innerHTML = '<p style="font-size:12px; color:#5a4c34; text-align:center;">当前页面似乎没有可预约的讲座。</p>';
    }
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
          </div>
          <div class="seu-reserve-task-actions">
            <button class="cancel-btn">取消</button>
          </div>
        `;
        item.querySelector('.seu-reserve-task-title').textContent = task.title || "未命名任务";
        item.querySelector('.status-sticker').textContent = statusLabel(task.status);
        item.querySelector('.time-label').textContent = formatTime(task.scheduledAt);

        item.querySelector('.cancel-btn').addEventListener('click', () => {
          try {
            chrome.runtime.sendMessage({ type: "removeTask", id: task.id }, () => {
              if (!chrome.runtime.lastError) refreshAll();
            });
          } catch (err) { console.warn("SEU reserve cancel error:", err); }
        });
        taskListEl.appendChild(item);
      });
  };

  const refreshAll = () => {
    if (!isOpen || !chrome || !chrome.runtime || !chrome.runtime.sendMessage) return;
    try {
      chrome.runtime.sendMessage({ type: "listTasks" }, (resp) => {
        if (chrome.runtime.lastError) return;
        if (!taskListEl || !document.body.contains(taskListEl)) return;

        const tasks = (resp && resp.ok) ? (resp.tasks || []) : [];
        renderTasks(tasks);
        scrapeAndRenderLectures(tasks);
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

  const shouldRefreshFromMutations = (mutations) => {
    for (const mutation of mutations) {
      if (isNodeInPanel(mutation.target)) continue;
      for (const node of mutation.addedNodes || []) {
        if (!isNodeInPanel(node)) return true;
      }
      for (const node of mutation.removedNodes || []) {
        if (!isNodeInPanel(node)) return true;
      }
    }
    return false;
  };

  const scheduleRefresh = () => {
    if (!isOpen) return;
    if (refreshScheduled) return;
    refreshScheduled = setTimeout(() => {
      refreshScheduled = null;
      refreshAll();
    }, 800);
  };

  const startObserver = () => {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      if (!isOpen) return;
      if (shouldRefreshFromMutations(mutations)) scheduleRefresh();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  startObserver();

  refreshBtn.addEventListener("click", refreshAll);

  window.addEventListener("beforeunload", () => {
    if (refreshTimer) clearInterval(refreshTimer);
    if (refreshScheduled) clearTimeout(refreshScheduled);
    if (observer) observer.disconnect();
  });

})();
