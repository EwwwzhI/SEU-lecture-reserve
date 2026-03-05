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
    .replace(/[\u3010\u3011\[\]\(\)\uFF08\uFF09"'`.,\uFF0C\u3002!\uFF01?\uFF1F:\uFF1A;\uFF1B\-\u2014_]/g, "");
}

function titleLooksMatched(a, b) {
  const x = normalizeTitleForMatch(a);
  const y = normalizeTitleForMatch(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return x.includes(y) || y.includes(x);
}

const widProbeMemo = new Map();

function upsertDetectedLecture(tabId, lecture) {
  const normalized = normalizeDetectedLecture(lecture);
  if (!normalized) return;
  if (!detectedLecturesByTab[tabId]) detectedLecturesByTab[tabId] = Object.create(null);
  const frameKey = "__probe__";
  const bucket = detectedLecturesByTab[tabId][frameKey] || { updatedAt: 0, lectures: [] };
  const list = Array.isArray(bucket.lectures) ? bucket.lectures.slice(0, 300) : [];
  const key = normalized.wid || normalized.id;
  const map = new Map();
  for (const x of list) {
    const n = normalizeDetectedLecture(x);
    if (!n) continue;
    const k = n.wid || n.id;
    if (!k) continue;
    map.set(k, n);
  }
  map.set(key, normalized);
  detectedLecturesByTab[tabId][frameKey] = {
    updatedAt: Date.now(),
    lectures: Array.from(map.values()).slice(0, 300)
  };
}

function executeScriptCompat(details) {
  return new Promise((resolve, reject) => {
    if (!chrome || !chrome.scripting || !chrome.scripting.executeScript) {
      reject(new Error("scripting_unavailable"));
      return;
    }
    chrome.scripting.executeScript(details, (results) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(String(err.message || err)));
        return;
      }
      resolve(results || []);
    });
  });
}

async function resolveWidFromTabProbe(tabId, taskTitle) {
  const numericTabId = Number(tabId);
  if (!Number.isFinite(numericTabId)) return "";
  const normalizedTitle = normalizeTitleForMatch(taskTitle);
  if (!normalizedTitle) return "";

  const memoKey = `${numericTabId}|${normalizedTitle}`;
  const now = Date.now();
  const memo = widProbeMemo.get(memoKey);
  if (memo && now - Number(memo.ts || 0) < 5000) {
    return String(memo.wid || "").trim();
  }

  const runProbe = async (mainWorld) => {
    const details = {
      target: { tabId: numericTabId, allFrames: true },
      args: [String(taskTitle || "")],
      func: (taskTitleArg) => {
        const normalize = (v) => String(v || "")
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[\u3010\u3011\[\]\(\)\uFF08\uFF09"'`.,\uFF0C\u3002!\uFF01?\uFF1F:\uFF1A;\uFF1B\-\u2014_]/g, "");

        const targetNorm = normalize(taskTitleArg);
        if (!targetNorm) return "";

        const titleMatch = (a, b) => {
          const x = normalize(a);
          const y = normalize(b);
          if (!x || !y) return false;
          return x === y || x.includes(y) || y.includes(x);
        };

        const extractWidRaw = (raw) => {
          const text = String(raw || "");
          if (!text) return "";
          const patterns = [
            /(?:\?|&|#)(?:WID|wid)=([^&#"'`\s]+)/i,
            /(?:%3F|%26)(?:WID|wid)(?:=|%3D)([^&#"'`\s%]+)/i,
            /["'`](?:WID|wid)["'`]\s*:\s*["'`]([^"'`]+)["'`]/i,
            /(?:^|[{"'`\s,;])(?:WID|wid)\s*[:=]\s*["'`]?([A-Za-z0-9._:-]{4,})/i,
            /\/(?:WID|wid)\/([^/?#"'`\s]+)/i
          ];
          for (const pattern of patterns) {
            const m = text.match(pattern);
            if (!m || !m[1]) continue;
            const cleaned = String(m[1]).replace(/["'`,;)}\]]+$/g, "").trim();
            if (cleaned && !/^WID$/i.test(cleaned)) return cleaned;
          }
          return "";
        };

        const looksLikeWid = (value) => {
          const s = String(value || "").trim();
          if (!s) return false;
          if (/^[a-fA-F0-9]{32}$/.test(s)) return true;
          if (/^[A-Za-z0-9._:-]{16,64}$/.test(s)) return true;
          return false;
        };

        const extractWidFromObject = (input, maxDepth = 5, maxNodes = 1500) => {
          if (!input || (typeof input !== "object" && typeof input !== "function")) return "";
          const queue = [{ value: input, depth: 0 }];
          const visited = new Set();
          let scanned = 0;
          while (queue.length > 0 && scanned < maxNodes) {
            const { value, depth } = queue.shift();
            if (!value) continue;
            const t = typeof value;
            if (t !== "object" && t !== "function") continue;
            if (visited.has(value)) continue;
            visited.add(value);
            scanned += 1;
            if (depth > maxDepth) continue;

            let keys = [];
            try { keys = Object.keys(value); } catch (err) { continue; }

            let titleHit = false;
            for (const key of keys) {
              let child;
              try { child = value[key]; } catch (err) { continue; }
              if (typeof child === "string" && titleMatch(child, taskTitleArg)) titleHit = true;
            }

            for (const key of keys) {
              let child;
              try { child = value[key]; } catch (err) { continue; }

              if (/(?:^|[_-])wid(?:$|[_-])/i.test(String(key))) {
                const direct = extractWidRaw(child);
                if (direct) return direct;
                if (looksLikeWid(child) && titleHit) return String(child).trim();
              }

              if (typeof child === "string") {
                const fromRaw = extractWidRaw(child);
                if (fromRaw && titleHit) return fromRaw;
              } else if ((typeof child === "object" || typeof child === "function") && child) {
                queue.push({ value: child, depth: depth + 1 });
              }
            }
          }
          return "";
        };

        const extractWidFromNode = (node) => {
          if (!node || node.nodeType !== 1) return "";
          const attrs = ["data-wid", "wid", "href", "onclick", "data-url", "data-href", "data-link", "value"];
          for (const attr of attrs) {
            const v = node.getAttribute && node.getAttribute(attr);
            const wid = extractWidRaw(v);
            if (wid) return wid;
          }
          if (node.dataset) {
            for (const v of Object.values(node.dataset)) {
              const wid = extractWidRaw(v);
              if (wid) return wid;
            }
          }
          const vueCandidates = [];
          const pushVue = (v) => { if (v) vueCandidates.push(v); };
          let cur = node;
          let hop = 0;
          while (cur && hop < 6) {
            hop += 1;
            try { pushVue(cur.__vue__); } catch (err) {}
            try { pushVue(cur.__vueParentComponent); } catch (err) {}
            try { pushVue(cur.__vnode); } catch (err) {}
            cur = cur.parentElement;
          }
          for (const v of vueCandidates) {
            const w = extractWidFromObject(v);
            if (w) return w;
          }
          const htmlWid = extractWidRaw(node.outerHTML || "");
          if (htmlWid) return htmlWid;
          return "";
        };

        const cards = Array.from(document.querySelectorAll(".activity-container"));
        for (const card of cards) {
          const titleEl = card.querySelector(".activity-name .mint-text[title], .activity-name [title], .activity-name .mint-text");
          const title = (titleEl && ((titleEl.getAttribute && titleEl.getAttribute("title")) || titleEl.textContent)) || "";
          if (!titleMatch(title, taskTitleArg)) continue;
          const wid = extractWidFromNode(card);
          if (wid) return wid;
        }

        const bodyHtml = (document.documentElement && document.documentElement.innerHTML) || "";
        if (bodyHtml && taskTitleArg) {
          let from = 0;
          for (let i = 0; i < 5; i += 1) {
            const idx = bodyHtml.indexOf(taskTitleArg, from);
            if (idx < 0) break;
            const slice = bodyHtml.slice(Math.max(0, idx - 2500), Math.min(bodyHtml.length, idx + taskTitleArg.length + 2500));
            const wid = extractWidRaw(slice);
            if (wid) return wid;
            from = idx + taskTitleArg.length;
          }
        }

        const globalCandidates = [window, window.__INITIAL_STATE__, window.__APP__, window.app, window.__NUXT__];
        for (const g of globalCandidates) {
          const wid = extractWidFromObject(g, 4, 1200);
          if (wid) return wid;
        }

        return "";
      }
    };
    if (mainWorld) details.world = "MAIN";
    const results = await executeScriptCompat(details);
    for (const entry of results || []) {
      const candidate = String((entry && entry.result) || "").trim();
      if (candidate) return candidate;
    }
    return "";
  };

  let wid = "";
  try {
    wid = await runProbe(true);
  } catch (err) {
    try {
      wid = await runProbe(false);
    } catch (_err) {
      wid = "";
    }
  }

  widProbeMemo.set(memoKey, { ts: now, wid });
  if (wid) {
    upsertDetectedLecture(numericTabId, { wid, title: String(taskTitle || "") });
  }
  return wid;
}

async function resolveWidForTask(task) {
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

  for (const tabId of tabCandidates) {
    const probedWid = await resolveWidFromTabProbe(tabId, task.title);
    if (probedWid) return probedWid;
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
    return {
      success: false,
      full: false,
      needLogin: false,
      invalidVcode: false,
      alreadyReserved: false,
      notOpen: false,
      ended: false,
      msg: "network_error"
    };
  }

  const msg = (res.msg || res.message || "").toString();
  const compactMsg = msg.replace(/\s+/g, "");
  const code = res.code;
  const datas = res.datas;
  const codeOk = code === 0 || code === "0";
  const dataOk = datas === 1 || datas === "1" || datas === true || datas === "true";
  const successByCode = codeOk && dataOk;
  const successByText = /(?:\u6210\u529f|\u9884\u7ea6\u6210\u529f|\u63d0\u4ea4\u6210\u529f)/.test(compactMsg);
  const alreadyReserved = /(?:\u5df2\u9884\u7ea6|\u91cd\u590d\u9884\u7ea6|\u8bf7\u52ff\u91cd\u590d|\u4e0d\u80fd\u91cd\u590d)/.test(compactMsg);
  const full = /(?:\u540d\u989d\u5df2\u6ee1|\u4eba\u6570\u5df2\u6ee1|\u5df2\u6ee1)/.test(compactMsg);
  const needLogin = /(?:\u767b\u5f55|\u4f1a\u8bdd|\u8eab\u4efd|cookie|\u672a\u8ba4\u8bc1|\u672a\u767b\u5f55)/i.test(compactMsg);
  const invalidVcode = /(?:\u9a8c\u8bc1\u7801)/.test(compactMsg) && /(?:\u9519\u8bef|\u4e0d\u6b63\u786e|\u65e0\u6548|\u5931\u8d25)/.test(compactMsg);
  const notOpen = /(?:\u672a\u5f00\u653e|\u672a\u5f00\u59cb|\u5c1a\u672a\u5f00\u59cb|\u9884\u7ea6\u672a\u5f00\u59cb)/.test(compactMsg);
  const ended = /(?:\u5df2\u7ed3\u675f|\u5df2\u622a\u6b62|\u622a\u6b62)/.test(compactMsg);

  return {
    success: successByCode || successByText,
    full,
    needLogin,
    invalidVcode,
    alreadyReserved,
    notOpen,
    ended,
    msg
  };
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
  let lastReserveMsg = "";

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
      const resolved = await resolveWidForTask(task);
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

      const { success, full, needLogin, invalidVcode, alreadyReserved, notOpen, ended, msg } = await reserveLecture(runtimeWid, vcode, settings);
      if (msg) lastReserveMsg = String(msg);
      if (success || alreadyReserved) return { status: "success", msg: msg || "already_reserved" };
      if (full) return { status: "full", msg };
      if (ended) return { status: "failed", msg: msg || "ended" };
      if (needLogin) return { status: "failed", msg: msg || "login_required" };
      if (invalidVcode) {
        captchaFail += 1;
        const cooldown = Math.min(backoffMaxMs, captchaCooldownBaseMs + captchaFail * backoffStepMs);
        await delayWithJitter(cooldown, jitterMs);
        continue;
      }
      if (notOpen) {
        await delayWithJitter(intervalMs, jitterMs);
        continue;
      }
      consecutiveFail = 0;
      captchaFail = 0;
    } catch (err) {
      console.warn("[Background] Reserve attempt error:", err);
    }

    await delayWithJitter(intervalMs, jitterMs);
  }

  return { status: "failed", msg: runtimeWid ? (lastReserveMsg || "max_attempts") : "wid_not_found" };
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
    const resolved = await resolveWidForTask(task);
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
      if (!task.wid) {
        const resolved = await resolveWidForTask(task);
        if (resolved) {
          task.wid = resolved;
          task.lastResult = "wid_resolved";
        }
      }
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

