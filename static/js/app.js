(function () {
  "use strict";

  var STORAGE_KEY = "phishsentinel_scan_history_v1";
  var navBreakpointMq = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 900px)") : null;
  var state = {
    samples: { phishing: [], legitimate: [] },
    history: [],
    latestResult: null,
    overlayTimer: null
  };

  var el = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function safeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toPercent(value) {
    var n = Number(value);
    if (!Number.isFinite(n)) return "0.00%";
    return n.toFixed(2) + "%";
  }

  function normalizePreviewText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function timestampLabel(value) {
    if (!value) return new Date().toLocaleString();
    return String(value);
  }

  function showToast(message, type) {
    var container = el.toastContainer;
    if (!container) return;

    var toast = document.createElement("div");
    toast.className = "toast " + (type === "error" ? "error" : "success");
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(function () {
      toast.classList.add("removing");
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2600);
  }

  function setSection(sectionName) {
    var navItems = document.querySelectorAll(".nav-item[data-section]");
    navItems.forEach(function (item) {
      item.classList.toggle("active", item.getAttribute("data-section") === sectionName);
    });

    var sections = document.querySelectorAll(".section");
    sections.forEach(function (section) {
      section.classList.remove("active");
    });

    var target = byId("sec-" + sectionName);
    if (target) target.classList.add("active");

    if (isCompactNavigation()) {
      setSidebarOpen(false);
      window.scrollTo(0, 0);
    }
  }

  function bindNavigation() {
    var navItems = document.querySelectorAll(".nav-item[data-section]");
    navItems.forEach(function (item) {
      item.addEventListener("click", function () {
        var section = item.getAttribute("data-section");
        setSection(section);
      });
    });
  }

  function bindStatCards() {
    var statCards = document.querySelectorAll(".stat-card-button[data-section]");
    statCards.forEach(function (card) {
      card.addEventListener("click", function (event) {
        if (typeof card.getAttribute === "function" && card.getAttribute("href") === "#") {
          event.preventDefault();
        }
        var section = card.getAttribute("data-section");
        setSection(section);
      });
    });
  }

  function isCompactNavigation() {
    return navBreakpointMq ? navBreakpointMq.matches : window.innerWidth <= 900;
  }

  function setSidebarOpen(open) {
    if (!document.body) return;

    var shouldOpen = !!open && isCompactNavigation();
    document.body.classList.toggle("sidebar-open", shouldOpen);

    if (el.mobileNavToggle) {
      el.mobileNavToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
      el.mobileNavToggle.setAttribute("aria-label", shouldOpen ? "Close navigation" : "Open navigation");
    }

    if (el.appSidebar) {
      el.appSidebar.setAttribute("aria-hidden", isCompactNavigation() ? String(!shouldOpen) : "false");
    }
  }

  function syncResponsiveNavigation() {
    if (!document.body) return;

    if (!isCompactNavigation()) {
      document.body.classList.remove("sidebar-open");
    }

    var isOpen = document.body.classList.contains("sidebar-open");

    if (el.mobileNavToggle) {
      el.mobileNavToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      el.mobileNavToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
    }

    if (el.appSidebar) {
      el.appSidebar.setAttribute("aria-hidden", isCompactNavigation() ? String(!isOpen) : "false");
    }
  }

  function bindMobileNav() {
    if (el.mobileNavToggle) {
      el.mobileNavToggle.addEventListener("click", function () {
        setSidebarOpen(!document.body.classList.contains("sidebar-open"));
      });
    }

    if (el.sidebarScrim) {
      el.sidebarScrim.addEventListener("click", function () {
        setSidebarOpen(false);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
      }
    });

    if (navBreakpointMq && typeof navBreakpointMq.addEventListener === "function") {
      navBreakpointMq.addEventListener("change", syncResponsiveNavigation);
    } else {
      window.addEventListener("resize", syncResponsiveNavigation);
    }

    syncResponsiveNavigation();
  }

  function ensureTopStatCards() {
    var statsWrap = byId("cyberStats");
    if (!statsWrap) return;

    // If any required card/value node is missing, rebuild the row.
    var hasAll =
      !!byId("totalScans") &&
      !!byId("threatsBlocked") &&
      !!byId("statAccuracy") &&
      !!statsWrap.querySelector(".stat-status-live");

    if (hasAll) return;

    statsWrap.innerHTML =
      '<a href="#" class="stat-card stat-card-button anim-up" data-section="history" role="button">' +
      '<div class="stat-card-icon stat-icon-cyan">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>' +
      "</svg></div>" +
      '<div class="stat-card-info"><div class="stat-card-value" id="totalScans">0</div><div class="stat-card-label">Total Scans</div></div></a>' +
      '<a href="#" class="stat-card stat-card-button anim-up delay-1" data-section="history" role="button">' +
      '<div class="stat-card-icon stat-icon-danger">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>' +
      "</svg></div>" +
      '<div class="stat-card-info"><div class="stat-card-value" id="threatsBlocked">0</div><div class="stat-card-label">Threats Blocked</div></div></a>' +
      '<a href="#" class="stat-card stat-card-button anim-up delay-2" data-section="models" role="button">' +
      '<div class="stat-card-icon stat-icon-purple">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>' +
      "</svg></div>" +
      '<div class="stat-card-info"><div class="stat-card-value" id="statAccuracy">-</div><div class="stat-card-label">Model Accuracy</div></div></a>' +
      '<a href="#" class="stat-card stat-card-button anim-up delay-3" data-section="about" role="button">' +
      '<div class="stat-card-icon stat-icon-safe">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>' +
      "</svg></div>" +
      '<div class="stat-card-info"><div class="stat-card-value stat-status-live"><span class="live-dot"></span> LIVE</div><div class="stat-card-label">System Status</div></div></a>';
  }

  function updateEditorMetrics() {
    if (!el.emailInput) return;

    var text = (el.emailInput.value || "").trim();
    var words = text ? text.split(/\s+/).length : 0;
    var chars = text.length;
    var links = (text.match(/https?:\/\/\S+|www\.\S+/gi) || []).length;

    if (el.metricWords) el.metricWords.textContent = String(words);
    if (el.metricChars) el.metricChars.textContent = String(chars);
    if (el.metricLinks) el.metricLinks.textContent = String(links);
  }

  function normalizeList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value == null || value === "") return [];
    return [String(value)];
  }

  function indicatorCount(analysis) {
    if (!analysis || !analysis.phishing_indicators) return 0;
    var total = 0;
    Object.keys(analysis.phishing_indicators).forEach(function (key) {
      total += normalizeList(analysis.phishing_indicators[key]).length;
    });
    return total;
  }

  function renderRiskGrid(analysis, isPhishing) {
    if (!el.riskGrid) return;

    var urls = normalizeList(analysis.urls_found).length;
    var suspiciousUrls = normalizeList(analysis.suspicious_urls).length;

    var items = [
      {
        name: "Risk Score",
        value: String(Number(analysis.risk_score || 0).toFixed(0)) + "%",
        flagged: Number(analysis.risk_score || 0) >= 30
      },
      {
        name: "Suspicious URLs",
        value: String(suspiciousUrls),
        flagged: suspiciousUrls > 0
      },
      {
        name: "URLs Found",
        value: String(urls),
        flagged: urls > 0 && isPhishing
      },
      {
        name: "Exclamation Marks",
        value: String(analysis.exclamation_count || 0),
        flagged: Number(analysis.exclamation_count || 0) >= 2
      },
      {
        name: "Caps Ratio",
        value: String(Number(analysis.caps_ratio || 0).toFixed(1)) + "%",
        flagged: Number(analysis.caps_ratio || 0) >= 20
      },
      {
        name: "Word Count",
        value: String(analysis.word_count || 0),
        flagged: false
      }
    ];

    el.riskGrid.innerHTML = items
      .map(function (item) {
        return (
          '<div class="risk-item ' + (item.flagged ? "flagged" : "clear") + '">' +
          '<span class="risk-dot"></span>' +
          '<div>' +
          '<div class="risk-item-name">' + safeText(item.name) + "</div>" +
          '<div class="risk-item-val">' + safeText(item.value) + "</div>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderIndicators(analysis) {
    if (!el.indicatorsList) return;

    var indicators = (analysis && analysis.phishing_indicators) || {};
    var keys = Object.keys(indicators);

    if (!keys.length) {
      el.indicatorsList.innerHTML = '<div class="risk-item clear"><span class="risk-dot"></span><div><div class="risk-item-name">No high-risk patterns detected</div><div class="risk-item-val">Input appears clean</div></div></div>';
      return;
    }

    el.indicatorsList.innerHTML = keys
      .map(function (category) {
        var tags = normalizeList(indicators[category]);
        var tagHtml = tags
          .map(function (tag) {
            return '<span class="indicator-tag">' + safeText(tag) + "</span>";
          })
          .join("");

        return (
          '<div class="risk-item flagged">' +
          '<span class="risk-dot"></span>' +
          '<div>' +
          '<div class="risk-item-name">' + safeText(category.toUpperCase()) + "</div>" +
          '<div class="risk-item-val">' + tagHtml + "</div>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function recommendationText(result) {
    if (result.is_phishing) {
      return "Potential phishing detected. Do not click links, do not share credentials, and verify the sender through an official channel before any action.";
    }
    return "No strong phishing signal detected. Continue with normal caution and verify unexpected requests before sharing sensitive information.";
  }

  function renderVerdict(result) {
    if (!el.verdictBox) return;

    var isPhish = !!result.is_phishing;
    el.verdictBox.classList.remove("phishing", "safe");
    el.verdictBox.classList.add(isPhish ? "phishing" : "safe");

    if (el.verdictLabel) el.verdictLabel.textContent = isPhish ? "THREAT DETECTED" : "LIKELY SAFE";
    if (el.verdictTitle) el.verdictTitle.textContent = String(result.prediction || (isPhish ? "Phishing" : "Legitimate"));
    if (el.verdictModel) el.verdictModel.textContent = "Model: " + String(result.model_used || "N/A");

    var conf = Number(result.confidence || 0);
    if (el.confValue) el.confValue.textContent = toPercent(conf);
    if (el.confFill) {
      el.confFill.style.width = Math.max(0, Math.min(100, conf)) + "%";
      el.confFill.style.background = isPhish
        ? "linear-gradient(90deg, rgba(255,59,59,0.9), rgba(255,59,59,0.45))"
        : "linear-gradient(90deg, rgba(0,255,156,0.95), rgba(0,245,255,0.5))";
    }

    if (el.recommendationText) el.recommendationText.textContent = recommendationText(result);
  }

  function renderResult(result) {
    state.latestResult = result;

    if (el.resultPlaceholder) el.resultPlaceholder.style.display = "none";
    if (el.resultContent) el.resultContent.style.display = "block";

    renderVerdict(result);
    renderRiskGrid(result.analysis || {}, !!result.is_phishing);
    renderIndicators(result.analysis || {});
  }

  function persistHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
  }

  function loadHistory() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state.history = [];
        return;
      }
      var parsed = JSON.parse(raw);
      state.history = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      state.history = [];
    }
  }

  function syncTopStats() {
    var totalScans = state.history.length;
    var blocked = state.history.filter(function (row) {
      return !!row.is_phishing;
    }).length;

    if (el.totalScans) el.totalScans.textContent = String(totalScans);
    if (el.threatsBlocked) el.threatsBlocked.textContent = String(blocked);
    if (el.historyCount) el.historyCount.textContent = String(totalScans);
  }

  function renderHistory() {
    if (!el.historyBody) return;

    if (!state.history.length) {
      el.historyBody.innerHTML = '<tr class="empty-row" id="emptyRow"><td colspan="7">No scans yet. Paste an email and run a scan!</td></tr>';
      syncTopStats();
      return;
    }

    el.historyBody.innerHTML = state.history
      .map(function (row, index) {
        var verdictClass = row.is_phishing ? "verdict-tag-phish" : "verdict-tag-safe";
        var verdictText = row.is_phishing ? "Phishing" : "Safe";
        var conf = Math.max(0, Math.min(100, Number(row.confidence || 0)));
        var fullPreview = normalizePreviewText(row.email_full || row.email_preview || "");
        var preview = fullPreview.length > 110 ? fullPreview.slice(0, 110).trim() + "..." : fullPreview;
        var confTone = row.is_phishing ? "history-conf-fill danger" : "history-conf-fill safe";

        return (
          "<tr>" +
          '<td class="cell-time" data-label="Time">' + safeText(timestampLabel(row.timestamp)) + "</td>" +
          '<td class="cell-verdict" data-label="Verdict"><span class="' + verdictClass + '">' + verdictText + "</span></td>" +
          '<td class="cell-confidence" data-label="Confidence">' +
          '<div class="history-conf-wrap">' +
          '<span class="conf-tag-small">' + safeText(toPercent(conf)) + "</span>" +
          '<div class="history-conf-track"><span class="' + confTone + '" style="width:' + conf.toFixed(2) + '%"></span></div>' +
          "</div>" +
          "</td>" +
          '<td class="cell-model" data-label="Model">' + safeText(row.model_used || "N/A") + "</td>" +
          '<td class="cell-indicators" data-label="Indicators">' + safeText(String(row.indicator_count || 0)) + "</td>" +
          '<td class="cell-action" data-label="Action"><button type="button" class="btn-mini btn-mini-danger btn-row-clear" onclick="removeHistoryItem(' + index + ')">Clear</button></td>' +
          '<td class="cell-email" data-label="Email Preview" title="' + safeText(fullPreview) + '"><div class="email-preview-ellipsis">' + safeText(preview) + "</div></td>" +
          "</tr>"
        );
      })
      .join("");

    syncTopStats();
  }

  function pushHistory(result, fullEmailText) {
    var entry = {
      timestamp: timestampLabel(result.timestamp),
      is_phishing: !!result.is_phishing,
      confidence: Number(result.confidence || 0),
      model_used: String(result.model_used || "N/A"),
      indicator_count: indicatorCount(result.analysis || {}),
      email_full: String(fullEmailText || ""),
      email_preview: String(fullEmailText || result.email_preview || "")
    };

    state.history.unshift(entry);
    if (state.history.length > 100) state.history = state.history.slice(0, 100);
    persistHistory();
    renderHistory();
  }

  function setScanButtonLoading(loading) {
    if (!el.btnScan) return;
    el.btnScan.disabled = loading;
    el.btnScan.textContent = loading ? "SCANNING..." : "SCAN FOR THREATS";
  }

  function showScanOverlay() {
    if (!el.scanOverlay) return;

    el.scanOverlay.classList.add("active");
    var phases = [
      ["Initializing scan...", "Connecting to ML engine", 15],
      ["Preprocessing content...", "Analyzing tokens and links", 40],
      ["Evaluating threat model...", "Running classification", 70],
      ["Finalizing verdict...", "Generating confidence score", 95]
    ];
    var idx = 0;

    if (state.overlayTimer) clearInterval(state.overlayTimer);

    function applyPhase() {
      var phase = phases[Math.min(idx, phases.length - 1)];
      if (el.scanPhase) el.scanPhase.textContent = phase[0];
      if (el.scanDetail) el.scanDetail.textContent = phase[1];
      if (el.scanProgressFill) el.scanProgressFill.style.width = phase[2] + "%";
      idx += 1;
    }

    applyPhase();
    state.overlayTimer = setInterval(applyPhase, 650);
  }

  function hideScanOverlay() {
    if (state.overlayTimer) {
      clearInterval(state.overlayTimer);
      state.overlayTimer = null;
    }
    if (el.scanProgressFill) el.scanProgressFill.style.width = "100%";
    setTimeout(function () {
      if (el.scanOverlay) el.scanOverlay.classList.remove("active");
      if (el.scanProgressFill) el.scanProgressFill.style.width = "0%";
    }, 250);
  }

  async function scanEmail() {
    var text = (el.emailInput && el.emailInput.value ? el.emailInput.value : "").trim();
    var model = el.modelSelect ? el.modelSelect.value : "Best Model";

    if (!text) {
      showToast("Paste email content before scanning.", "error");
      return;
    }

    setScanButtonLoading(true);
    showScanOverlay();

    try {
      var response = await fetch("/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_text: text, model: model })
      });

      var data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Scan failed.");
      }

      renderResult(data);
      pushHistory(data, text);
      showToast(data.is_phishing ? "Threat detected." : "Email looks safe.", "success");
    } catch (err) {
      showToast("Scan failed: " + err.message, "error");
    } finally {
      hideScanOverlay();
      setScanButtonLoading(false);
    }
  }

  async function fetchStats() {
    try {
      var response = await fetch("/api/stats");
      var data = await response.json();

      if (el.sidebarStatus) {
        el.sidebarStatus.textContent = data.system_status === "operational" ? "System Active" : "Training Required";
      }
      if (el.sidebarModel) {
        el.sidebarModel.textContent = data.best_model ? "Best: " + data.best_model : "Best model unavailable";
      }

      var acc = Number(data.best_accuracy || 0);
      var accLabel = toPercent(acc);
      if (el.statAccuracy) el.statAccuracy.textContent = accLabel;
      if (el.chipAccuracy) el.chipAccuracy.textContent = accLabel + " Accuracy";
    } catch (err) {
      if (el.sidebarStatus) el.sidebarStatus.textContent = "API Offline";
    }
  }

    function getModelToneClass(name) {
    var n = String(name || "").toLowerCase();
    if (n.indexOf("gradient") !== -1) return "tone-cyan";
    if (n.indexOf("svm") !== -1) return "tone-violet";
    if (n.indexOf("logistic") !== -1) return "tone-emerald";
    if (n.indexOf("naive") !== -1) return "tone-rose";
    if (n.indexOf("random") !== -1 || n.indexOf("best") !== -1) return "tone-amber";
    return "tone-sky";
  }

  function renderModelsGrid(data) {
    if (!el.modelsGrid) return;

    var models = data.models || {};
    var best = data.best_model || "";
    var names = Object.keys(models);

    if (!names.length) {
      el.modelsGrid.innerHTML = '<div class="no-models-msg" style="grid-column:1/-1">No model metadata found. Run <code>python train_model.py</code> and refresh.</div>';
      return;
    }

    el.modelsGrid.innerHTML = names
      .map(function (name) {
        var row = models[name] || {};
        var isBest = name === best;
        var tone = getModelToneClass(name);
        var statusText = String(row.status || "unknown");
        var statusClass = statusText === "loaded" ? "loaded" : "not-loaded";
        var badge = isBest ? '<span class="best-badge">BEST</span>' : "";

        return (
          '<div class="model-card model-indicated ' + tone + (isBest ? ' best-model' : '') + '">' +
          '<div class="model-card-name"><span class="model-dot"></span>' + safeText(name) + badge + "</div>" +
          '<div class="model-stat"><span class="model-stat-key">Accuracy</span><span class="model-stat-val model-acc">' + safeText(toPercent(row.accuracy || 0)) + "</span></div>" +
          '<div class="model-stat"><span class="model-stat-key">CV Score</span><span class="model-stat-val model-cv">' + safeText(toPercent(row.cv_score || 0)) + "</span></div>" +
          '<div class="model-stat"><span class="model-stat-key">Status</span><span class="model-stat-val model-status ' + statusClass + '">' + safeText(statusText) + "</span></div>" +
          "</div>"
        );
      })
      .join("");
  }
  async function fetchModels() {
    try {
      var response = await fetch("/api/models");
      var data = await response.json();
      renderModelsGrid(data || {});
    } catch (err) {
      if (el.modelsGrid) {
        el.modelsGrid.innerHTML = '<div class="no-models-msg" style="grid-column:1/-1">Unable to load model data.</div>';
      }
    }
  }

  async function loadSamples() {
    try {
      var response = await fetch("/api/sample-emails");
      var data = await response.json();
      state.samples.phishing = normalizeList(data.phishing);
      state.samples.legitimate = normalizeList(data.legitimate || data.safe);
    } catch (err) {
      state.samples.phishing = [];
      state.samples.legitimate = [];
    }
  }

  function loadSample(type, index) {
    var key = type === "safe" ? "legitimate" : type;
    var list = state.samples[key] || [];
    var idx = Number(index || 0);

    if (!list.length || !list[idx]) {
      showToast("Sample data is not loaded yet.", "error");
      return;
    }

    if (el.emailInput) {
      el.emailInput.value = list[idx];
      updateEditorMetrics();
    }
  }

  async function pasteFromClipboard() {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      showToast("Clipboard access not available in this browser.", "error");
      return;
    }

    try {
      var text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        showToast("Clipboard is empty.", "error");
        return;
      }
      if (el.emailInput) {
        el.emailInput.value = text;
        updateEditorMetrics();
      }
      showToast("Clipboard pasted.", "success");
    } catch (err) {
      showToast("Clipboard permission denied.", "error");
    }
  }

  function clearEmailInput() {
    if (el.emailInput) el.emailInput.value = "";
    updateEditorMetrics();
    showToast("Input cleared.", "success");
  }

  async function copyScanSummary() {
    if (!state.latestResult) {
      showToast("No scan result to copy.", "error");
      return;
    }

    var summary = [
      "PhishSentinel Scan Summary",
      "Timestamp: " + timestampLabel(state.latestResult.timestamp),
      "Prediction: " + String(state.latestResult.prediction || "N/A"),
      "Is Phishing: " + (state.latestResult.is_phishing ? "Yes" : "No"),
      "Confidence: " + toPercent(state.latestResult.confidence || 0),
      "Model: " + String(state.latestResult.model_used || "N/A"),
      "Preview: " + String(state.latestResult.email_preview || "")
    ].join("\n");

    try {
      await navigator.clipboard.writeText(summary);
      showToast("Summary copied.", "success");
    } catch (err) {
      showToast("Could not copy summary.", "error");
    }
  }

  function exportScanReport() {
    if (!state.latestResult) {
      showToast("No scan result to export.", "error");
      return;
    }

    var name = "scan-report-" + Date.now() + ".json";
    var blob = new Blob([JSON.stringify(state.latestResult, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Report exported.", "success");
  }

    function removeHistoryItem(index) {
    var idx = Number(index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= state.history.length) return;

    state.history.splice(idx, 1);
    persistHistory();
    renderHistory();
    showToast("Scan removed from history.", "success");
  }
  function clearHistory() {
    if (!state.history.length) {
      showToast("History is already empty.", "error");
      return;
    }

    var ok = window.confirm("Clear all saved scan history?");
    if (!ok) return;

    state.history = [];
    persistHistory();
    renderHistory();
    showToast("History cleared.", "success");
  }

  function bindInteractiveBackground() {
    var body = document.body;
    var glowOrbs = document.querySelector('.cyber-glow-orbs');
    if (!body) return;

    var stateBg = {
      currentX: 0.5,
      currentY: 0.5,
      targetX: 0.5,
      targetY: 0.5,
      rafId: 0
    };

    function setBackgroundVars(x, y) {
      body.style.setProperty('--bg-spot-1-x', (10 + x * 18).toFixed(2) + '%');
      body.style.setProperty('--bg-spot-1-y', (10 + y * 12).toFixed(2) + '%');
      body.style.setProperty('--bg-spot-2-x', (82 + x * 10).toFixed(2) + '%');
      body.style.setProperty('--bg-spot-2-y', (8 + y * 16).toFixed(2) + '%');
      body.style.setProperty('--bg-spot-3-x', (38 + x * 24).toFixed(2) + '%');
      body.style.setProperty('--bg-spot-3-y', (86 + y * 10).toFixed(2) + '%');
      body.style.setProperty('--bg-spot-4-x', (16 + x * 16).toFixed(2) + '%');
      body.style.setProperty('--bg-spot-4-y', (58 + y * 18).toFixed(2) + '%');
      body.style.setProperty('--bg-spot-5-x', (68 + x * 14).toFixed(2) + '%');
      body.style.setProperty('--bg-spot-5-y', (62 + y * 14).toFixed(2) + '%');

      if (glowOrbs) {
        glowOrbs.style.transform = 'translate(' + ((x - 0.5) * 18).toFixed(2) + 'px, ' + ((y - 0.5) * 18).toFixed(2) + 'px)';
      }
    }

    function tick() {
      stateBg.currentX += (stateBg.targetX - stateBg.currentX) * 0.08;
      stateBg.currentY += (stateBg.targetY - stateBg.currentY) * 0.08;
      setBackgroundVars(stateBg.currentX, stateBg.currentY);

      if (Math.abs(stateBg.targetX - stateBg.currentX) > 0.001 || Math.abs(stateBg.targetY - stateBg.currentY) > 0.001) {
        stateBg.rafId = window.requestAnimationFrame(tick);
      } else {
        stateBg.rafId = 0;
      }
    }

    function queueTick() {
      if (!stateBg.rafId) {
        stateBg.rafId = window.requestAnimationFrame(tick);
      }
    }

    document.addEventListener('pointermove', function (event) {
      var width = window.innerWidth || 1;
      var height = window.innerHeight || 1;
      stateBg.targetX = Math.max(0, Math.min(1, event.clientX / width));
      stateBg.targetY = Math.max(0, Math.min(1, event.clientY / height));
      queueTick();
    });

    document.addEventListener('pointerleave', function () {
      stateBg.targetX = 0.5;
      stateBg.targetY = 0.5;
      queueTick();
    });

    setBackgroundVars(stateBg.currentX, stateBg.currentY);
  }
  function init() {
    el.toastContainer = byId("toastContainer");
    el.scanOverlay = byId("scanOverlay");
    el.scanPhase = byId("scanPhase");
    el.scanDetail = byId("scanDetail");
    el.scanProgressFill = byId("scanProgressFill");

    el.emailInput = byId("emailInput");
    el.modelSelect = byId("modelSelect");
    el.btnScan = byId("btnScan");

    el.metricWords = byId("metricWords");
    el.metricChars = byId("metricChars");
    el.metricLinks = byId("metricLinks");

    el.resultPlaceholder = byId("resultPlaceholder");
    el.resultContent = byId("resultContent");
    el.verdictBox = byId("verdictBox");
    el.verdictLabel = byId("verdictLabel");
    el.verdictTitle = byId("verdictTitle");
    el.verdictModel = byId("verdictModel");
    el.confValue = byId("confValue");
    el.confFill = byId("confFill");
    el.riskGrid = byId("riskGrid");
    el.indicatorsList = byId("indicatorsList");
    el.recommendationText = byId("recommendationText");

    el.historyBody = byId("historyBody");
    el.historyCount = byId("historyCount");

    el.totalScans = byId("totalScans");
    el.threatsBlocked = byId("threatsBlocked");
    el.statAccuracy = byId("statAccuracy");
    el.chipAccuracy = byId("chipAccuracy");

    el.sidebarStatus = byId("sidebarStatus");
    el.sidebarModel = byId("sidebarModel");
    el.modelsGrid = byId("modelsGrid");
    el.appSidebar = byId("appSidebar");
    el.mobileNavToggle = byId("mobileNavToggle");
    el.sidebarScrim = byId("sidebarScrim");

    ensureTopStatCards();
    bindNavigation();
    bindStatCards();
    bindMobileNav();
    bindInteractiveBackground();
    loadHistory();
    renderHistory();
    updateEditorMetrics();

    if (el.emailInput) {
      el.emailInput.addEventListener("input", updateEditorMetrics);
    }

    fetchStats();
    fetchModels();
    loadSamples();
  }

  window.scanEmail = scanEmail;
  window.loadSample = loadSample;
  window.pasteFromClipboard = pasteFromClipboard;
  window.clearEmailInput = clearEmailInput;
  window.copyScanSummary = copyScanSummary;
  window.exportScanReport = exportScanReport;
  window.clearHistory = clearHistory;
  window.removeHistoryItem = removeHistoryItem;

  document.addEventListener("DOMContentLoaded", init);
})();















