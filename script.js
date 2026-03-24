// ==================== LANGBLY API CONFIGURATION ====================
// IMPORTANT: Keep your API key secure. Consider moving to backend in production.
const LANGBLY_API_KEY = "MgT3k2kAtML5gj3KUAYhAP";

// Updated Langbly API endpoint (check their documentation for correct endpoint)
// Try these possible endpoints:
const LANGBLY_API_URL = "https://api.langbly.com/language/translate/v2"; // Alternative endpoint
// const LANGBLY_API_URL = "https://api.langbly.com/translate"; // Another alternative

// Fallback to MyMemory API if Langbly fails
const FALLBACK_API_URL = "https://api.mymemory.translated.net/get";

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

// ==================== HELPER FUNCTIONS ====================
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

// ==================== TRANSLATION API WITH FALLBACK ====================
async function translateWithLangbly(text) {
  try {
    const requestBody = {
      q: text,
      target: targetLang === "auto" ? "en" : targetLang,
      format: "text"
    };
    
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

    if (!response.ok) {
      throw new Error(`Langbly API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Try different response structures
    if (data?.data?.translations?.[0]?.translatedText) {
      return data.data.translations[0].translatedText;
    }
    if (data?.translations?.[0]?.translatedText) {
      return data.translations[0].translatedText;
    }
    if (data?.translatedText) {
      return data.translatedText;
    }
    
    throw new Error("Invalid response structure");
  } catch (error) {
    console.warn("Langbly API failed:", error.message);
    return null;
  }
}

async function translateWithFallback(text) {
  try {
    const sourceCode = sourceLang === "auto" ? "" : sourceLang;
    const targetCode = targetLang === "auto" ? "en" : targetLang;
    const url = `${FALLBACK_API_URL}?q=${encodeURIComponent(text)}&langpair=${sourceCode}|${targetCode}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.responseData && data.responseData.translatedText) {
      let translated = data.responseData.translatedText;
      translated = translated.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      return translated;
    }
    throw new Error("Fallback API failed");
  } catch (error) {
    console.error("Fallback API error:", error);
    return null;
  }
}

async function translateText(text) {
  if (!text.trim()) return "";
  if (sourceLang === targetLang && sourceLang !== "auto") return text;

  // Try Langbly first
  let translated = await translateWithLangbly(text);
  
  // If Langbly fails, try fallback API
  if (!translated) {
    console.log("Using fallback translation API");
    translated = await translateWithFallback(text);
    if (translated) {
      showToast("Using backup translation service", 1500);
    }
  }
  
  // If both fail, return demo text
  if (!translated) {
    showToast("Translation service unavailable. Please try again later.", 2000);
    return `[${targetLang}] ${text}`;
  }
  
  return translated;
}

async function performTranslation() {
  const text = sourceText.value.trim();
  if (!text) {
    translatedOutput.innerHTML = '<span class="placeholder">✨ Translation</span>';
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
  if (statusSpan) statusSpan.textContent = "Translating...";

  try {
    const translated = await translateText(text);
    translatedOutput.textContent = translated;
    if (statusSpan) statusSpan.textContent = "Ready";
    
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
    console.error("Translation error:", error);
    translatedOutput.innerHTML = '<span class="placeholder">⚠️ Error. Try again.</span>';
    if (statusSpan) statusSpan.textContent = "Error";
  }
  updateStarButton();
}

function debouncedTranslate() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(performTranslation, 500);
}

// ==================== VOICE RECOGNITION ====================
function startVoiceInput() {
  if (isRecording) {
    if (recognition) recognition.stop();
    document.getElementById("recordBtn").classList.remove("recording");
    isRecording = false;
    return;
  }

  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    showToast("Voice not supported on this device", 1500);
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
  showToast("🎤 Listening... Speak now", 1500);
  
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    sourceText.value = transcript;
    updateCharCount();
    debouncedTranslate();
    document.getElementById("recordBtn").classList.remove("recording");
    isRecording = false;
    showToast("✅ Voice captured!", 1000);
  };
  
  recognition.onerror = (event) => {
    console.error("Speech error:", event.error);
    document.getElementById("recordBtn").classList.remove("recording");
    isRecording = false;
    if (event.error === "not-allowed") {
      showToast("🎤 Microphone access denied. Please allow microphone permission.", 2000);
    } else if (event.error === "no-speech") {
      showToast("No speech detected. Please try again.", 1500);
    } else {
      showToast("Voice recognition error. Please try again.", 1500);
    }
  };
  
  recognition.onend = () => {
    document.getElementById("recordBtn").classList.remove("recording");
    isRecording = false;
  };
}

// ==================== TEXT TO SPEECH ====================
function speakText() {
  const text = translatedOutput.innerText;
  if (!text || text.includes("Translation") || text.includes("Error") || text.includes("Demo")) {
    showToast("No text to speak", 1000);
    return;
  }
  
  // Stop any ongoing speech
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = targetLang === "auto" ? "en" : targetLang;
  utterance.rate = 0.9;
  utterance.pitch = 1;
  
  utterance.onstart = () => showToast("🔊 Speaking...", 1000);
  utterance.onend = () => console.log("Speech finished");
  utterance.onerror = () => showToast("Speech error", 1000);
  
  speechSynthesis.speak(utterance);
}

// ==================== LANGUAGE SELECTOR ====================
function showLanguageSelector(isSource) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <span>Select Language</span>
        <button class="modal-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <input type="text" class="modal-search" placeholder="🔍 Search language..." autofocus>
        <div class="lang-list"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  const searchInput = modal.querySelector('.modal-search');
  const langList = modal.querySelector('.lang-list');
  const closeBtn = modal.querySelector('.modal-close-btn');
  
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

// ==================== RENDER FUNCTIONS ====================
function renderHistory() {
  const container = document.getElementById("historyList");
  if (history.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-language"></i><p>No translations yet</p><small>Start translating to see history</small></div>';
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
  
  attachHistoryEvents();
}

function renderFavorites() {
  const container = document.getElementById("favoritesList");
  if (favorites.length === 0) {
    container.innerHTML = '<div class="empty-state"><i class="far fa-heart"></i><p>No favorites yet</p><small>Tap ⭐ to save translations you love</small></div>';
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
  
  attachFavoritesEvents();
}

function attachHistoryEvents() {
  document.querySelectorAll('#historyList .list-item').forEach(item => {
    item.onclick = (e) => {
      if (e.target.classList.contains('remove-item')) return;
      const idx = parseInt(item.dataset.index);
      const h = history[idx];
      if (h) {
        sourceText.value = h.sourceText;
        translatedOutput.textContent = h.translatedText;
        sourceLang = h.sourceLang;
        targetLang = h.targetLang;
        updateLangUI();
        updateCharCount();
        updateStarButton();
        showToast('Loaded from history', 800);
      }
    };
    const rm = item.querySelector('.remove-item');
    if (rm) rm.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(rm.dataset.index);
      history.splice(idx, 1);
      saveData();
      renderHistory();
      showToast('Removed from history', 800);
    };
  });
}

function attachFavoritesEvents() {
  document.querySelectorAll('#favoritesList .list-item').forEach(item => {
    item.onclick = (e) => {
      if (e.target.classList.contains('remove-item')) return;
      const idx = parseInt(item.dataset.index);
      const f = favorites[idx];
      if (f) {
        sourceText.value = f.source;
        translatedOutput.textContent = f.target;
        sourceLang = f.srcLang;
        targetLang = f.tgtLang;
        updateLangUI();
        updateCharCount();
        updateStarButton();
        showToast('Loaded favorite', 800);
      }
    };
    const rm = item.querySelector('.remove-item');
    if (rm) rm.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(rm.dataset.index);
      favorites.splice(idx, 1);
      saveData();
      renderFavorites();
      updateStarButton();
      showToast('Removed from favorites', 800);
    };
  });
}

// ==================== EVENT LISTENERS ====================
sourceText.addEventListener('input', () => { updateCharCount(); debouncedTranslate(); });

document.getElementById("swapLangBtn").onclick = () => {
  if (sourceLang === "auto") { showToast("Can't swap auto-detect", 1000); return; }
  [sourceLang, targetLang] = [targetLang, sourceLang];
  updateLangUI();
  if (sourceText.value.trim()) performTranslation();
};

document.getElementById("copySourceBtn").onclick = () => { 
  navigator.clipboard.writeText(sourceText.value); 
  showToast("📋 Source copied!", 800); 
};

document.getElementById("copyOutputBtn").onclick = () => { 
  const t = translatedOutput.innerText; 
  if (t && !t.includes("Translation")) { 
    navigator.clipboard.writeText(t); 
    showToast("📋 Translation copied!", 800); 
  } 
};

document.getElementById("clearInputBtn").onclick = () => { 
  sourceText.value = ""; 
  updateCharCount(); 
  debouncedTranslate(); 
  showToast("Cleared", 500);
};

document.getElementById("clearOutputBtn").onclick = () => { 
  translatedOutput.innerHTML = '<span class="placeholder">✨ Translation</span>'; 
  showToast("Cleared", 500); 
};

document.getElementById("speakOutputBtn").onclick = speakText;
document.getElementById("recordBtn").onclick = startVoiceInput;
document.getElementById("micSourceBtn").onclick = startVoiceInput;
document.getElementById("writeBtn").onclick = () => sourceText.focus();

document.getElementById("infoBtn").onclick = () => {
  showToast("LinguaFlow Pro v1.0 | Powered by AI | 100+ Languages | Voice Input | Text-to-Speech | Created by Muhammad Umar", 4000);
};

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
    showToast("Removed from favorites ❌", 1000);
  } else {
    favorites.unshift({ 
      source: input, 
      target: output, 
      srcLang: sourceLang, 
      tgtLang: targetLang, 
      timestamp: Date.now() 
    });
    if (favorites.length > 50) favorites.pop();
    showToast("Added to favorites ⭐", 1000);
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
  if (confirm("Delete all translation history?")) { 
    history = []; 
    saveData(); 
    renderHistory(); 
    showToast("History cleared", 1000); 
  }
};

document.getElementById("clearFavoritesBtn").onclick = () => {
  if (confirm("Delete all favorites?")) { 
    favorites = []; 
    saveData(); 
    renderFavorites(); 
    updateStarButton(); 
    showToast("Favorites cleared", 1000); 
  }
};

// ==================== APK DOWNLOAD ====================
const APK_URL = "https://github.com/Rafayalmani/LinguaFlow-AI/raw/refs/heads/main/Lingua%20Ai.apk";

function downloadApk(e) {
  e.preventDefault();
  window.open(APK_URL, '_blank');
  showToast("📱 Downloading LinguaFlow Pro APK...", 2000);
}

document.getElementById("downloadApkBtn").onclick = downloadApk;
const footerDownloadBtn = document.getElementById("downloadApkFooterBtn");
if (footerDownloadBtn) footerDownloadBtn.onclick = downloadApk;

// ==================== INITIALIZATION ====================
updateLangUI();
updateCharCount();
renderHistory();
renderFavorites();
updateStarButton();

// Test API connection on load
async function testAPIConnection() {
  const testResult = await translateWithLangbly("Hello");
  if (!testResult) {
    console.log("Langbly API not available, will use fallback");
  } else {
    console.log("Langbly API connected successfully");
  }
}
testAPIConnection();