

 
  const LANGBLY_API_KEY = "MgT3k2kAtML5gj3KUAYhAP"; 
  const LANGBLY_API_URL = "https://api.langbly.com/language/translate/v2";

  // ==================== LANGUAGES (100+ supported) ====================
  const LANGUAGES = [
    { code: "auto", name: "Auto-detect" }, { code: "en", name: "English" }, 
    { code: "es", name: "Spanish" }, { code: "fr", name: "French" },
    { code: "de", name: "German" }, { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" }, { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" }, { code: "ko", name: "Korean" },
    { code: "zh", name: "Chinese" }, { code: "ar", name: "Arabic" },
    { code: "hi", name: "Hindi" }, { code: "ur", name: "Urdu" },
    { code: "bn", name: "Bengali" }, { code: "fa", name: "Persian" },
    { code: "tr", name: "Turkish" }, { code: "th", name: "Thai" },
    { code: "vi", name: "Vietnamese" }, { code: "nl", name: "Dutch" },
    { code: "sv", name: "Swedish" }, { code: "pl", name: "Polish" },
    { code: "uk", name: "Ukrainian" }, { code: "el", name: "Greek" },
    { code: "he", name: "Hebrew" }, { code: "ro", name: "Romanian" },
    { code: "hu", name: "Hungarian" }, { code: "cs", name: "Czech" },
    { code: "no", name: "Norwegian" }, { code: "da", name: "Danish" },
    { code: "fi", name: "Finnish" }, { code: "id", name: "Indonesian" },
    { code: "ms", name: "Malay" }, { code: "sw", name: "Swahili" }
  ];

  // ==================== STATE ====================
  let sourceLang = "auto";
  let targetLang = "en";
  let debounceTimer = null;
  let isRecording = false;
  let recognition = null;
  let history = JSON.parse(localStorage.getItem("linguaflow_history") || "[]");
  let favorites = JSON.parse(localStorage.getItem("linguaflow_favs") || "[]");

  // DOM Elements
  const sourceText = document.getElementById("sourceText");
  const translatedOutput = document.getElementById("translatedOutput");
  const sourceLangLabel = document.getElementById("sourceLangLabel");
  const targetLangLabel = document.getElementById("targetLangLabel");
  const charCountSpan = document.getElementById("charCount");
  const toast = document.getElementById("toast");

  // Helper Functions
  function showToast(msg, duration = 2000) {
    toast.textContent = msg;
    toast.style.opacity = "1";
    setTimeout(() => { toast.style.opacity = "0"; }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }

  function saveData() {
    localStorage.setItem("linguaflow_history", JSON.stringify(history));
    localStorage.setItem("linguaflow_favs", JSON.stringify(favorites));
  }

  function updateCharCount() {
    charCountSpan.textContent = sourceText.value.length;
  }

  function updateStarButton() {
    const input = sourceText.value.trim();
    const output = translatedOutput.innerText;
    const isFav = favorites.some(f => f.source === input && f.target === output);
    const starBtn = document.getElementById("favStarBtn");
    if (isFav) {
      starBtn.innerHTML = '<i class="fas fa-star" style="color: #eab308;"></i>';
    } else {
      starBtn.innerHTML = '<i class="far fa-star"></i>';
    }
  }

  function updateLangUI() {
    const source = LANGUAGES.find(l => l.code === sourceLang) || LANGUAGES[0];
    const target = LANGUAGES.find(l => l.code === targetLang) || LANGUAGES[1];
    sourceLangLabel.textContent = sourceLang === "auto" ? "Auto" : source.name;
    targetLangLabel.textContent = target.name;
  }

  // ==================== LANGBLY TRANSLATION API ====================
  async function translateText(text) {
    if (!text.trim()) return "";
    if (sourceLang === targetLang && sourceLang !== "auto") return text;

    try {
      // Check if API key is configured
      if (LANGBLY_API_KEY === "YOUR_LANGBLY_API_KEY_HERE") {
        console.warn("server error Please try again later");
        showToast("⚠️ Server error. Please try again later.", 3000);
        return ` ${text}`;
      }

      // Prepare request body according to Langbly API spec
      const requestBody = {
        q: text,
        target: targetLang === "auto" ? "en" : targetLang,
        format: "text"
      };
      
      // Only add source if not auto-detect (Langbly auto-detects when source omitted)
      if (sourceLang !== "auto") {
        requestBody.source = sourceLang;
      }

      const response = await fetch(LANGBLY_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LANGBLY_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      // Handle API errors gracefully
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        
        if (response.status === 401) {
          showToast("❌ Something went wrong. Please try again.", 3000);
        } else if (response.status === 429) {
          showToast("⚠️ Too many requests. Please try again later.", 2000);
        } else {
          showToast(`error ${response.status}`, 2000);
        }
        throw new Error(`Too many requests ${response.status}`);
      }

      const data = await response.json();
      
      // Langbly response structure: data.translations[0].translatedText
      if (data?.data?.translations?.[0]?.translatedText) {
        return data.data.translations[0].translatedText;
      }
      
      throw new Error("Too many requests. Please try again later.");
      
    } catch (error) {
      console.error("Too many requests. Please try again later.", error);
      // Fallback for demo when API fails
      return `[${targetLang}] ${text}`;
    }
  }

  async function performTranslation() {
    const text = sourceText.value.trim();
    if (!text) {
      translatedOutput.innerHTML = '<span class="placeholder"> Translation</span>';
      updateStarButton();
      return;
    }

    if (sourceLang === targetLang && sourceLang !== "auto") {
      translatedOutput.textContent = text;
      updateStarButton();
      return;
    }

    translatedOutput.innerHTML = '<span class="loader">Translating</span>';
    const statusSpan = document.querySelector("#translationStatus span");
    statusSpan.textContent = "Translating...";

    try {
      const translated = await translateText(text);
      translatedOutput.textContent = translated;
      statusSpan.textContent = "Ready";
      
      // Save to history
      if (text && translated && !translated.includes("[Demo]")) {
        history.unshift({
          sourceText: text,
          translatedText: translated,
          sourceLang: sourceLang,
          targetLang: targetLang,
          timestamp: Date.now()
        });
        if (history.length > 50) history.pop();
        saveData();
        renderHistory();
      }
    } catch (error) {
      translatedOutput.innerHTML = '<span class="placeholder">⚠️ Error. Try again.</span>';
      statusSpan.textContent = "Error";
    }
    updateStarButton();
  }

  function debouncedTranslate() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(performTranslation, 500);
  }

  // Voice Recognition (unchanged)
  function startVoiceInput() {
    if (isRecording) {
      if (recognition) recognition.stop();
      document.getElementById("recordBtn").classList.remove("recording");
      isRecording = false;
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast("Voice not supported", 1500);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    
    recognition.start();
    document.getElementById("recordBtn").classList.add("recording");
    isRecording = true;
    showToast("🎤 Listening...", 1500);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      sourceText.value = transcript;
      updateCharCount();
      debouncedTranslate();
      document.getElementById("recordBtn").classList.remove("recording");
      isRecording = false;
      showToast("✅ Captured!", 1000);
    };
    
    recognition.onerror = () => {
      document.getElementById("recordBtn").classList.remove("recording");
      isRecording = false;
      showToast("Mic error", 1000);
    };
    
    recognition.onend = () => {
      document.getElementById("recordBtn").classList.remove("recording");
      isRecording = false;
    };
  }

  // Text to Speech
  function speakText() {
    const text = translatedOutput.innerText;
    if (!text || text.includes("Translation") || text.includes("Error") || text.includes("Demo")) {
      showToast("No text to speak", 1000);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang === "auto" ? "en" : targetLang;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
    showToast("🔊 Speaking", 1000);
  }

  // Language Selector Modal (same as before)
  function showLanguageSelector(isSource) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <span>Select Language</span>
          <button style="background:none;border:none;color:white;font-size:1.2rem;cursor:pointer;">✕</button>
        </div>
        <div class="modal-body">
          <input type="text" class="modal-search" placeholder="Search..." autofocus>
          <div class="lang-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    const searchInput = modal.querySelector('.modal-search');
    const langList = modal.querySelector('.lang-list');
    const closeBtn = modal.querySelector('.modal-header button');
    
    function render(filter = "") {
      const filtered = LANGUAGES.filter(l => 
        l.name.toLowerCase().includes(filter.toLowerCase()) && 
        (isSource ? true : l.code !== "auto")
      );
      langList.innerHTML = filtered.map(lang => `
        <div class="lang-option" data-code="${lang.code}">${lang.name}</div>
      `).join('');
      
      langList.querySelectorAll('.lang-option').forEach(opt => {
        opt.onclick = () => {
          if (isSource) sourceLang = opt.dataset.code;
          else targetLang = opt.dataset.code;
          updateLangUI();
          modal.remove();
          if (sourceText.value.trim()) debouncedTranslate();
        };
      });
    }
    
    render();
    searchInput.oninput = (e) => render(e.target.value);
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  }

  // Render History & Favorites (same as before)
  function renderHistory() {
    const container = document.getElementById("historyList");
    if (history.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="fas fa-language"></i><p>No translations yet</p></div>';
      return;
    }
    container.innerHTML = history.slice(0, 30).map((item, idx) => {
      const sourceName = LANGUAGES.find(l => l.code === item.sourceLang)?.name || item.sourceLang;
      const targetName = LANGUAGES.find(l => l.code === item.targetLang)?.name || item.targetLang;
      return `
        <div class="list-item" data-index="${idx}">
          <div class="item-source">${escapeHtml(item.sourceText.substring(0, 60))}${item.sourceText.length > 60 ? '...' : ''}</div>
          <div class="item-target">→ ${escapeHtml(item.translatedText.substring(0, 60))}${item.translatedText.length > 60 ? '...' : ''}</div>
          <div class="item-lang">${sourceName} → ${targetName}</div>
          <button class="remove-item" data-index="${idx}">🗑️</button>
        </div>
      `;
    }).join('');
    
    attachListEvents(container, history, renderHistory, "history");
  }

  function renderFavorites() {
    const container = document.getElementById("favoritesList");
    if (favorites.length === 0) {
      container.innerHTML = '<div class="empty-state"><i class="far fa-heart"></i><p>No favorites yet</p><small>Tap ⭐ to save</small></div>';
      return;
    }
    container.innerHTML = favorites.map((item, idx) => {
      const sourceName = LANGUAGES.find(l => l.code === item.srcLang)?.name || item.srcLang;
      const targetName = LANGUAGES.find(l => l.code === item.tgtLang)?.name || item.tgtLang;
      return `
        <div class="list-item" data-index="${idx}">
          <div class="item-source">${escapeHtml(item.source.substring(0, 60))}${item.source.length > 60 ? '...' : ''}</div>
          <div class="item-target">→ ${escapeHtml(item.target.substring(0, 60))}${item.target.length > 60 ? '...' : ''}</div>
          <div class="item-lang">${sourceName} → ${targetName}</div>
          <button class="remove-item" data-index="${idx}">🗑️</button>
        </div>
      `;
    }).join('');
    
    attachFavEvents(container, favorites, renderFavorites);
  }

  function attachListEvents(container, list, renderFn, type) {
    container.querySelectorAll('.list-item').forEach(item => {
      item.onclick = (e) => {
        if (e.target.classList.contains('remove-item')) return;
        const idx = parseInt(item.dataset.index);
        const h = list[idx];
        if (h) {
          sourceText.value = type === "history" ? h.sourceText : h.source;
          translatedOutput.textContent = type === "history" ? h.translatedText : h.target;
          sourceLang = type === "history" ? h.sourceLang : h.srcLang;
          targetLang = type === "history" ? h.targetLang : h.tgtLang;
          updateLangUI();
          updateCharCount();
          updateStarButton();
          showToast('Loaded', 800);
        }
      };
      const rm = item.querySelector('.remove-item');
      if (rm) rm.onclick = (e) => {
        e.stopPropagation();
        list.splice(parseInt(rm.dataset.index), 1);
        saveData();
        renderFn();
        if (type === "favorites") updateStarButton();
        showToast('Removed', 800);
      };
    });
  }

  function attachFavEvents(container, list, renderFn) {
    container.querySelectorAll('.list-item').forEach(item => {
      item.onclick = (e) => {
        if (e.target.classList.contains('remove-item')) return;
        const idx = parseInt(item.dataset.index);
        const f = list[idx];
        if (f) {
          sourceText.value = f.source;
          translatedOutput.textContent = f.target;
          sourceLang = f.srcLang;
          targetLang = f.tgtLang;
          updateLangUI();
          updateCharCount();
          updateStarButton();
          showToast('Loaded', 800);
        }
      };
      const rm = item.querySelector('.remove-item');
      if (rm) rm.onclick = (e) => {
        e.stopPropagation();
        list.splice(parseInt(rm.dataset.index), 1);
        saveData();
        renderFn();
        updateStarButton();
        showToast('Removed', 800);
      };
    });
  }

  // Event Listeners
  sourceText.addEventListener('input', () => { updateCharCount(); debouncedTranslate(); });
  document.getElementById("swapLangBtn").onclick = () => {
    if (sourceLang === "auto") { showToast("Can't swap auto", 1000); return; }
    [sourceLang, targetLang] = [targetLang, sourceLang];
    updateLangUI();
    if (sourceText.value.trim()) performTranslation();
  };
  document.getElementById("copySourceBtn").onclick = () => { navigator.clipboard.writeText(sourceText.value); showToast("Copied!"); };
  document.getElementById("copyOutputBtn").onclick = () => { const t = translatedOutput.innerText; if (t && !t.includes("Translation")) { navigator.clipboard.writeText(t); showToast("Copied!"); } };
  document.getElementById("clearInputBtn").onclick = () => { sourceText.value = ""; updateCharCount(); debouncedTranslate(); };
  document.getElementById("clearOutputBtn").onclick = () => { translatedOutput.innerHTML = '<span class="placeholder">✨ Translation</span>'; showToast("Cleared"); };
  document.getElementById("speakOutputBtn").onclick = speakText;
  document.getElementById("recordBtn").onclick = startVoiceInput;
  document.getElementById("micSourceBtn").onclick = startVoiceInput;
  document.getElementById("writeBtn").onclick = () => sourceText.focus();
  document.getElementById("infoBtn").onclick = () => showToast("LinguaFlow Pro v1.0 | Powered by Langbly API | 100+ Languages", 3000);
  document.getElementById("sourceLangBtn").onclick = () => showLanguageSelector(true);
  document.getElementById("targetLangBtn").onclick = () => showLanguageSelector(false);
  
  document.getElementById("favStarBtn").onclick = () => {
    const input = sourceText.value.trim();
    const output = translatedOutput.innerText;
    if (!input || !output || output.includes("Translation") || output.includes("Error")) {
      showToast("Enter text first", 1000);
      return;
    }
    const existing = favorites.findIndex(f => f.source === input && f.target === output);
    if (existing !== -1) {
      favorites.splice(existing, 1);
      showToast("Removed ❌", 1000);
    } else {
      favorites.unshift({ source: input, target: output, srcLang: sourceLang, tgtLang: targetLang, timestamp: Date.now() });
      if (favorites.length > 50) favorites.pop();
      showToast("Saved ⭐", 1000);
    }
    saveData();
    updateStarButton();
    renderFavorites();
  };
  
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
      const tabName = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      tab.classList.add('active');
      document.getElementById(`${tabName}Tab`).style.display = 'block';
      if (tabName === 'history') renderHistory();
      if (tabName === 'favorites') renderFavorites();
    };
  });
  
  document.getElementById("clearHistoryBtn").onclick = () => {
    if (confirm("Clear all history?")) { history = []; saveData(); renderHistory(); showToast("History cleared", 1000); }
  };
  document.getElementById("clearFavoritesBtn").onclick = () => {
    if (confirm("Clear all favorites?")) { favorites = []; saveData(); renderFavorites(); updateStarButton(); showToast("Favorites cleared", 1000); }
  };
  
  // APK Download - Replace with your APK URL
  const APK_URL = "https://your-apk-link.com/linguaflow.apk";
  function downloadApk(e) {
    e.preventDefault();
    showToast("📱 APK ready! Add your download link", 2000);
    // window.location.href = APK_URL;
  }
  document.getElementById("downloadApkBtn").onclick = downloadApk;
  
  // Initialize
  updateLangUI();
  updateCharCount();
  renderHistory();
  renderFavorites();
  updateStarButton();
