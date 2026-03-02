const DEFAULT_SETTINGS = {
  captchaUser: "",
  captchaPass: "",
  captchaSoftid: "",
  captchaCodetype: 1902,
  apiBaseUrl: "https://ehall.seu.edu.cn",
  chaojiyingUrl: "http://upload.chaojiying.net/Upload/Processing.php",
  retryIntervalMs: 500,
  retryMaxAttempts: 120,
  requestTimeoutMs: 3000,
  captchaTimeoutMs: 5000,
  requestRetry: 1,
  requestRetryBackoffMs: 150,
  retryJitterMs: 120
};

const API_PATHS = {
  vcode: "/gsapp/sys/yddjzxxtjappseu/modules/hdyy/vcode.do",
  reserve: "/gsapp/sys/yddjzxxtjappseu/modules/hdyy/addReservation.do"
};

const detectedLecturesByTab = Object.create(null);
const DETECTED_LECTURE_TTL_MS = 2 * 60 * 1000;

function normalizeDetectedLecture(item) {
  if (!item || typeof item !== "object") return null;
  const wid = String(item.wid || "").trim();
  const id = String(item.id || "").trim();
  if (!wid && !id) return null;
  return {
    id: id || (wid ? `wid:${wid}` : ""),
    wid,
    title: String(item.title || "").trim(),
    timeStr: String(item.timeStr || "").trim(),
    statusText: String(item.statusText || "").trim()
  };
}

function pruneDetectedLectures(tabId) {
  const bucket = detectedLecturesByTab[tabId];
  if (!bucket) return;
  const now = Date.now();
  for (const frameKey of Object.keys(bucket)) {
    const entry = bucket[frameKey];
    if (!entry || now - Number(entry.updatedAt || 0) > DETECTED_LECTURE_TTL_MS) {
      delete bucket[frameKey];
    }
  }
  if (Object.keys(bucket).length === 0) delete detectedLecturesByTab[tabId];
}

function listDetectedLecturesForTab(tabId) {
  pruneDetectedLectures(tabId);
  const bucket = detectedLecturesByTab[tabId] || {};
  const merged = new Map();

  for (const entry of Object.values(bucket)) {
    const lectures = Array.isArray(entry && entry.lectures) ? entry.lectures : [];
    for (const raw of lectures) {
      const item = normalizeDetectedLecture(raw);
      if (!item) continue;
      const key = item.wid || item.id;
      if (!key) continue;
      if (!merged.has(key)) merged.set(key, item);
    }
  }
  return Array.from(merged.values());
}

function normalizeTitleForMatch(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[【】[\]()（）"'`.,，。!！?？:：;；\-—_]/g, "");
}

function titleLooksMatched(a, b) {
  const x = normalizeTitleForMatch(a);
  const y = normalizeTitleForMatch(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return x.includes(y) || y.includes(x);
}

function resolveWidForTask(task) {
  if (!task) return "";
  const existingWid = String(task.wid || "").trim();
  if (existingWid) return existingWid;

  const tabCandidates = [];
  const sourceTabId = Number(task.sourceTabId);
  if (Number.isFinite(sourceTabId)) tabCandidates.push(sourceTabId);
  for (const key of Object.keys(detectedLecturesByTab)) {
    const id = Number(key);
    if (!Number.isFinite(id)) continue;
    if (!tabCandidates.includes(id)) tabCandidates.push(id);
  }

  for (const tabId of tabCandidates) {
    const lectures = listDetectedLecturesForTab(tabId);
    for (const lecture of lectures) {
      const wid = String((lecture && lecture.wid) || "").trim();
      if (!wid) continue;
      if (titleLooksMatched(task.title, lecture.title)) return wid;
    }
  }
  return "";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function delayWithJitter(baseMs, jitterMs) {
  const jitter = Math.max(0, Math.floor(Math.random() * (jitterMs || 0)));
  return delay(Math.max(0, baseMs + jitter));
}

let settings = {};
let settingsReady = null;

async function getSettings() {
  const data = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...data };
}

function ensureSettingsLoaded() {
  if (!settingsReady) {
    settingsReady = getSettings().then((data) => {
      settings = data;
      return data;
    });
  }
  return settingsReady;
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (changes[key]) settings[key] = changes[key].newValue;
  }
});

ensureSettingsLoaded();

async function getTasksMap() {
  const data = await chrome.storage.local.get({ tasks: {} });
  return data.tasks || {};
}

async function saveTasksMap(tasks) {
  await chrome.storage.local.set({ tasks });
}

async function updateTask(id, patch) {
  const tasks = await getTasksMap();
  const existing = tasks[id];
  if (!existing) return null;
  tasks[id] = { ...existing, ...patch, updatedAt: Date.now() };
  await saveTasksMap(tasks);
  return tasks[id];
}

async function createTask(task) {
  const tasks = await getTasksMap();
  tasks[task.id] = task;
  await saveTasksMap(tasks);
  await scheduleTask(task);
  return task;
}

async function removeTask(id) {
  await chrome.alarms.clear(`task:${id}`);
  const tasks = await getTasksMap();
  if (tasks[id]) {
    delete tasks[id];
    await saveTasksMap(tasks);
  }
  return null;
}

async function scheduleTask(task) {
  if (!task || !task.scheduledAt) return;
  if (task.scheduledAt <= Date.now()) {
    chrome.alarms.create(`task:${task.id}`, { when: Date.now() + 500 });
    return;
  }
  chrome.alarms.create(`task:${task.id}`, { when: task.scheduledAt });
}

async function rebuildAlarms() {
  const tasks = await getTasksMap();
  const now = Date.now();
  for (const task of Object.values(tasks)) {
    if (task.status !== "scheduled") continue;
    if (task.scheduledAt && task.scheduledAt > now) {
      await scheduleTask(task);
      continue;
    }
    const jitter = Math.floor(Math.random() * 300);
    const nextAt = now + 500 + jitter;
    await updateTask(task.id, { scheduledAt: nextAt });
    await scheduleTask({ ...task, scheduledAt: nextAt });
  }
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = Number(timeoutMs || 0);
  const timer = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;
  try {
    const res = await fetch(url, { ...(options || {}), signal: controller.signal });
    return res;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fetchJson(url, options, timeoutMs) {
  try {
    const res = await fetchWithTimeout(url, options, timeoutMs);
    const text = await res.text();
    try {
      return { ok: res.ok, status: res.status, json: JSON.parse(text), text, headers: res.headers };
    } catch (err) {
      return { ok: res.ok, status: res.status, json: null, text, headers: res.headers, _parseError: true };
    }
  } catch (err) {
    return { ok: false, error: err };
  }
}

async function fetchJsonWithRetry(url, options, retryOpts) {
  const retries = Math.max(0, Number(retryOpts.retries || 0));
  const timeoutMs = Number(retryOpts.timeoutMs || 0);
  const backoffMs = Math.max(0, Number(retryOpts.backoffMs || 0));
  let last = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    last = await fetchJson(url, options, timeoutMs);
    if (last && last.ok && last.json) return last;
    if (attempt < retries) await delay(backoffMs * (attempt + 1));
  }
  return last;
}

function isCaptchaConfigured(_settings) {
  return Boolean(_settings.captchaUser && _settings.captchaPass && _settings.captchaSoftid);
}

function classifyReserveResponse(res) {
  if (!res) {
    return { success: false, full: false, needLogin: false, invalidVcode: false, msg: "network_error" };
  }

  const msg = (res.msg || res.message || "").toString();
  const success = res.code === 0 && res.datas === 1;
  const full = msg.includes("满") || msg.includes("名额已满") || msg.includes("人数已满");
  const needLogin = msg.includes("登录") || msg.includes("会话") || msg.includes("身份") || msg.includes("cookie");
  const invalidVcode = msg.includes("验证码") && (msg.includes("错误") || msg.includes("不正确") || msg.includes("无效"));

  return { success, full, needLogin, invalidVcode, msg };
}

function joinBase(baseUrl, path) {
  const cleaned = String(baseUrl || "").replace(/\/+$/, "");
  return `${cleaned}${path}`;
}

async function fetchVCodeBase64(_settings) {
  const url = `${joinBase(_settings.apiBaseUrl, API_PATHS.vcode)}?_=${Date.now()}`;
  const result = await fetchJsonWithRetry(
    url,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    },
    {
      retries: _settings.requestRetry,
      timeoutMs: _settings.requestTimeoutMs,
      backoffMs: _settings.requestRetryBackoffMs
    }
  );

  const res = result && result.json;
  if (!result || !result.ok || !res || !res.datas) return null;
  const base64 = String(res.datas);
  const idx = base64.indexOf("base64,");
  if (idx >= 0) return base64.slice(idx + 7);
  return base64;
}

async function decodeCaptcha(base64, _settings) {
  if (!base64 || !isCaptchaConfigured(_settings)) return null;
  const body = new URLSearchParams({
    user: _settings.captchaUser,
    pass: _settings.captchaPass,
    softid: _settings.captchaSoftid,
    codetype: String(_settings.captchaCodetype),
    file_base64: base64
  });

  const result = await fetchJsonWithRetry(
    _settings.chaojiyingUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store"
    },
    {
      retries: _settings.requestRetry,
      timeoutMs: _settings.captchaTimeoutMs,
      backoffMs: _settings.requestRetryBackoffMs
    }
  );

  const res = result && result.json;
  if (result && result.ok && res && res.err_no === 0) return res.pic_str;
  return null;
}

async function reserveLecture(wid, vcode, _settings) {
  const body = new URLSearchParams({ wid, vcode });
  const result = await fetchJson(joinBase(_settings.apiBaseUrl, API_PATHS.reserve), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  }, _settings.requestTimeoutMs);

  const res = result && result.json;
  const info = classifyReserveResponse(res);
  return { res, ...info };
}

async function attemptReserveLoop(taskId, initialWid) {
  const intervalMs = Math.max(100, Number(settings.retryIntervalMs || 1000));
  const jitterMs = Math.max(0, Number(settings.retryJitterMs || 0));
  const maxAttempts = Math.max(1, Number(settings.retryMaxAttempts || 1));
  const backoffStepMs = Math.max(100, Math.floor(intervalMs * 0.6));
  const backoffMaxMs = Math.max(intervalMs * 3, 1500);
  const captchaCooldownBaseMs = Math.max(600, Math.floor(intervalMs * 1.2));
  let consecutiveFail = 0;
  let captchaFail = 0;
  let runtimeWid = String(initialWid || "").trim();

  if (!isCaptchaConfigured(settings)) {
    return { status: "failed", msg: "captcha_not_configured" };
  }

  for (let i = 1; i <= maxAttempts; i += 1) {
    const task = (await getTasksMap())[taskId];
    if (!task || task.status === "cancelled") {
      return { status: "cancelled" };
    }

    runtimeWid = String(task.wid || runtimeWid || "").trim();
    if (!runtimeWid) {
      const resolved = resolveWidForTask(task);
      if (resolved) {
        runtimeWid = resolved;
        await updateTask(taskId, { wid: resolved, lastResult: "wid_resolved" });
      } else {
        await delayWithJitter(intervalMs, jitterMs);
        continue;
      }
    }

    try {
      const vcodeBase64 = await fetchVCodeBase64(settings);
      if (!vcodeBase64) {
        consecutiveFail += 1;
        const backoff = Math.min(backoffMaxMs, intervalMs + backoffStepMs * consecutiveFail);
        await delayWithJitter(backoff, jitterMs);
        continue;
      }

      const vcode = await decodeCaptcha(vcodeBase64, settings);
      if (!vcode) {
        consecutiveFail += 1;
        captchaFail += 1;
        const cooldown = Math.min(backoffMaxMs, captchaCooldownBaseMs + captchaFail * backoffStepMs);
        await delayWithJitter(cooldown, jitterMs);
        continue;
      }

      const { success, full, needLogin, invalidVcode, msg } = await reserveLecture(runtimeWid, vcode, settings);
      if (success) return { status: "success", msg };
      if (full) return { status: "full", msg };
      if (needLogin) return { status: "failed", msg: msg || "login_required" };
      if (invalidVcode) {
        captchaFail += 1;
        const cooldown = Math.min(backoffMaxMs, captchaCooldownBaseMs + captchaFail * backoffStepMs);
        await delayWithJitter(cooldown, jitterMs);
        continue;
      }
      consecutiveFail = 0;
      captchaFail = 0;
    } catch (err) {
      console.warn("[Background] Reserve attempt error:", err);
    }

    await delayWithJitter(intervalMs, jitterMs);
  }

  return { status: "failed", msg: runtimeWid ? "max_attempts" : "wid_not_found" };
}

async function runTask(taskId) {
  const tasks = await getTasksMap();
  const task = tasks[taskId];
  if (!task) return;

  settings = await getSettings();
  settingsReady = Promise.resolve(settings);

  if (!isCaptchaConfigured(settings)) {
    await updateTask(taskId, { status: "failed", finishedAt: Date.now(), lastResult: "captcha_not_configured" });
    return;
  }

  let startWid = String(task.wid || "").trim();
  if (!startWid) {
    const resolved = resolveWidForTask(task);
    if (resolved) {
      startWid = resolved;
      await updateTask(taskId, { wid: resolved, lastResult: "wid_resolved" });
    }
  }

  await updateTask(taskId, { status: "running", startedAt: Date.now() });
  const result = await attemptReserveLoop(taskId, startWid);

  if (result.status === "cancelled") {
    await updateTask(taskId, { status: "cancelled", finishedAt: Date.now() });
    return;
  }

  await updateTask(taskId, {
    status: result.status,
    finishedAt: Date.now(),
    lastResult: result.msg || ""
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (!alarm || !alarm.name || !alarm.name.startsWith("task:")) return;
  const id = alarm.name.slice("task:".length);
  runTask(id);
});

chrome.runtime.onInstalled.addListener(() => rebuildAlarms());
chrome.runtime.onStartup.addListener(() => rebuildAlarms());
if (chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    delete detectedLecturesByTab[tabId];
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || !msg.type) {
      sendResponse({ ok: false, error: "invalid_message" });
      return;
    }

    if (msg.type === "reportDetectedLectures") {
      const tabId = sender && sender.tab ? sender.tab.id : null;
      const frameId = sender && Number.isFinite(sender.frameId) ? sender.frameId : 0;
      if (tabId == null) {
        sendResponse({ ok: false, error: "missing_tab" });
        return;
      }

      const lectures = Array.isArray(msg.lectures)
        ? msg.lectures.map(normalizeDetectedLecture).filter(Boolean).slice(0, 300)
        : [];

      if (!detectedLecturesByTab[tabId]) detectedLecturesByTab[tabId] = Object.create(null);
      detectedLecturesByTab[tabId][String(frameId)] = {
        updatedAt: Date.now(),
        lectures
      };
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "listDetectedLectures") {
      const tabId = sender && sender.tab ? sender.tab.id : null;
      if (tabId == null) {
        sendResponse({ ok: true, lectures: [] });
        return;
      }
      sendResponse({ ok: true, lectures: listDetectedLecturesForTab(tabId) });
      return;
    }

    if (msg.type === "getSettings") {
      const currentSettings = await getSettings();
      sendResponse({ ok: true, settings: currentSettings });
      return;
    }

    if (msg.type === "saveSettings") {
      const next = { ...DEFAULT_SETTINGS, ...(msg.settings || {}) };
      try {
        await chrome.storage.local.set(next);
        settings = await getSettings();
        sendResponse({ ok: true });
      } catch (err) {
        console.error("[Background] Error saving settings:", err);
        sendResponse({ ok: false, error: err.message });
      }
      return;
    }

    if (msg.type === "listTasks") {
      const tasks = await getTasksMap();
      sendResponse({ ok: true, tasks: Object.values(tasks) });
      return;
    }

    if (msg.type === "createTask") {
      const now = Date.now();
      const sourceTabId = sender && sender.tab ? sender.tab.id : null;
      const task = {
        id: `t_${now}_${Math.random().toString(36).slice(2, 8)}`,
        wid: String(msg.wid || "").trim(),
        title: msg.title || "",
        scheduledAt: msg.scheduledAt || now,
        reserveStartStr: String(msg.reserveStartStr || "").trim(),
        sourceTabId: Number.isFinite(sourceTabId) ? sourceTabId : null,
        preSchedule: Boolean(msg.preSchedule),
        status: "scheduled",
        createdAt: now,
        updatedAt: now
      };
      await createTask(task);
      sendResponse({ ok: true, task });
      return;
    }

    if (msg.type === "runTaskNow") {
      const tasks = await getTasksMap();
      const task = tasks[msg.id];
      if (!task) {
        sendResponse({ ok: false, error: "not_found" });
        return;
      }
      await updateTask(task.id, { status: "scheduled", scheduledAt: Date.now() + 500 });
      await scheduleTask({ ...task, scheduledAt: Date.now() + 500 });
      sendResponse({ ok: true });
      return;
    }

    if (msg.type === "removeTask") {
      await removeTask(msg.id);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, error: "unknown_type" });
  })();

  return true;
});

