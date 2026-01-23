let els = {};

const RECOMMENDED = {
  retryIntervalMs: 500,
  retryMaxAttempts: 120,
  requestTimeoutMs: 3000,
  captchaTimeoutMs: 5000,
  requestRetry: 1,
  requestRetryBackoffMs: 150,
  retryJitterMs: 120
};

function setStatus(text, isError = false) {
  if (els.settingsStatus) {
    els.settingsStatus.textContent = text || "";
    els.settingsStatus.style.color = isError ? "var(--ink-accent)" : "var(--tag-green-text)";
  }
}

async function sendMessage(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => resolve(resp));
  });
}

async function loadSettings() {
  const resp = await sendMessage({ type: "getSettings" });
  if (!resp || !resp.ok) return;
  const s = resp.settings;

  if (els.captchaUser) els.captchaUser.value = s.captchaUser || "";
  if (els.captchaPass) els.captchaPass.value = s.captchaPass || "";
  if (els.captchaSoftid) els.captchaSoftid.value = s.captchaSoftid || "";
  if (els.captchaCodetype) els.captchaCodetype.value = s.captchaCodetype || 1902;
  if (els.retryIntervalMs) els.retryIntervalMs.value = s.retryIntervalMs || 500;
  if (els.retryMaxAttempts) els.retryMaxAttempts.value = s.retryMaxAttempts || 120;
}

async function saveSettings() {
  const payload = {
    captchaUser: els.captchaUser ? els.captchaUser.value.trim() : "",
    captchaPass: els.captchaPass ? els.captchaPass.value.trim() : "",
    captchaSoftid: els.captchaSoftid ? els.captchaSoftid.value.trim() : "",
    captchaCodetype: els.captchaCodetype ? Number(els.captchaCodetype.value || 1902) : 1902,
    retryIntervalMs: els.retryIntervalMs ? Number(els.retryIntervalMs.value || 500) : 500,
    retryMaxAttempts: els.retryMaxAttempts ? Number(els.retryMaxAttempts.value || 120) : 120
  };

  const resp = await sendMessage({ type: "saveSettings", settings: payload });
  setStatus(resp && resp.ok ? "● 已保存记录" : "× 保存失败", !(resp && resp.ok));
}

async function resetRecommended() {
  if (els.retryIntervalMs) els.retryIntervalMs.value = RECOMMENDED.retryIntervalMs;
  if (els.retryMaxAttempts) els.retryMaxAttempts.value = RECOMMENDED.retryMaxAttempts;

  const payload = {
    captchaUser: els.captchaUser ? els.captchaUser.value.trim() : "",
    captchaPass: els.captchaPass ? els.captchaPass.value.trim() : "",
    captchaSoftid: els.captchaSoftid ? els.captchaSoftid.value.trim() : "",
    captchaCodetype: els.captchaCodetype ? Number(els.captchaCodetype.value || 1902) : 1902,
    retryIntervalMs: RECOMMENDED.retryIntervalMs,
    retryMaxAttempts: RECOMMENDED.retryMaxAttempts,
    requestTimeoutMs: RECOMMENDED.requestTimeoutMs,
    captchaTimeoutMs: RECOMMENDED.captchaTimeoutMs,
    requestRetry: RECOMMENDED.requestRetry,
    requestRetryBackoffMs: RECOMMENDED.requestRetryBackoffMs,
    retryJitterMs: RECOMMENDED.retryJitterMs
  };

  const resp = await sendMessage({ type: "saveSettings", settings: payload });
  setStatus(resp && resp.ok ? "● 已重置推荐值" : "× 重置失败", !(resp && resp.ok));
  await loadSettings();
}

document.addEventListener('DOMContentLoaded', () => {
  els = {
    captchaUser: document.getElementById("captchaUser"),
    captchaPass: document.getElementById("captchaPass"),
    captchaSoftid: document.getElementById("captchaSoftid"),
    captchaCodetype: document.getElementById("captchaCodetype"),
    retryIntervalMs: document.getElementById("retryIntervalMs"),
    retryMaxAttempts: document.getElementById("retryMaxAttempts"),
    saveSettings: document.getElementById("saveSettings"),
    resetRecommended: document.getElementById("resetRecommended"),
    settingsStatus: document.getElementById("settingsStatus")
  };

  if (els.saveSettings) els.saveSettings.addEventListener("click", saveSettings);
  if (els.resetRecommended) els.resetRecommended.addEventListener("click", resetRecommended);

  loadSettings();
});
