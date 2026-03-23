// ------------------- API CONFIGURATION ------------------
const API_URL = "https://api.langbly.com/language/translate/v2";
  const API_KEY = "MgT3k2kAtML5gj3KUAYhAP";  // 
  
  // ---------- Full language list with Urdu and more ----------
  const languages = [
    { code: "auto", name: "Auto-detect" }, { code: "en", name: "English" }, { code: "es", name: "Spanish" }, { code: "fr", name: "French" },
    { code: "de", name: "German" }, { code: "it", name: "Italian" }, { code: "pt", name: "Portuguese" }, { code: "ru", name: "Russian" },
    { code: "ja", name: "Japanese" }, { code: "ko", name: "Korean" }, { code: "zh", name: "Chinese" }, { code: "ar", name: "Arabic" },
    { code: "hi", name: "Hindi" }, { code: "nl", name: "Dutch" }, { code: "pl", name: "Polish" }, { code: "tr", name: "Turkish" },
    { code: "sv", name: "Swedish" }, { code: "da", name: "Danish" }, { code: "fi", name: "Finnish" }, { code: "el", name: "Greek" },
    { code: "he", name: "Hebrew" }, { code: "th", name: "Thai" }, { code: "ur", name: "Urdu" }, { code: "bn", name: "Bengali" },
    { code: "fa", name: "Persian" }, { code: "sw", name: "Swahili" }, { code: "ta", name: "Tamil" }, { code: "te", name: "Telugu" },
    { code: "ms", name: "Malay" }, { code: "id", name: "Indonesian" }, { code: "uk", name: "Ukrainian" }, { code: "ro", name: "Romanian" },
    { code: "hu", name: "Hungarian" }, { code: "cs", name: "Czech" }, { code: "no", name: "Norwegian" }, { code: "vi", name: "Vietnamese" }
  ];
  
  let sourceLang = "auto";
  let targetLang = "en";
  let currentInputText = "";
  let isTranslating = false;
  let debounceTimer = null;
  let translationHistory = JSON.parse(localStorage.getItem("linguaflow_history") || "[]");
  let favoritesList = JSON.parse(localStorage.getItem("linguaflow_favs") || "[]");

  // DOM elements
  const translatorDiv = document.getElementById("translatorScreen");
  const sourceTextarea = document.getElementById("sourceText");
  const translatedOutputDiv = document.getElementById("translatedOutput");
  const sourceLangLabelSpan = document.getElementById("sourceLangLabel");
  const targetLangLabelSpan = document.getElementById("targetLangLabel");
  const swapBtn = document.getElementById("swapLangBtn");
  const copySourceBtn = document.getElementById("copySourceBtn");
  const copyOutputBtn = document.getElementById("copyOutputBtn");
  const clearInputBtn = document.getElementById("clearInputBtn");
  const clearOutputBtn = document.getElementById("clearOutputBtn");
  const speakOutputBtn = document.getElementById("speakOutputBtn");
  const favStarBtn = document.getElementById("favStarBtn");
  const infoBtn = document.getElementById("infoBtn");
  const writeBtn = document.getElementById("writeBtn");
  const recordBtn = document.getElementById("recordBtn");
  const scanBtn = document.getElementById("scanBtn");
  const sourceLangBtn = document.getElementById("sourceLangBtn");
  const targetLangBtn = document.getElementById("targetLangBtn");
  
  let currentModal = null;
  
  function showToast(msg, duration=2000) {
    const toast = document.getElementById("toastMsg");
    toast.innerText = msg;
    toast.style.opacity = "1";
    setTimeout(() => { toast.style.opacity = "0"; }, duration);
  }
  
  function updateLangUI() {
    const sourceObj = languages.find(l => l.code === sourceLang) || languages[0];
    const targetObj = languages.find(l => l.code === targetLang) || languages[1];
    sourceLangLabelSpan.innerText = sourceLang === "auto" ? "Auto-detect" : sourceObj.name;
    targetLangLabelSpan.innerText = targetObj.name;
  }
  
  // Translation API call
  async function performTranslation(text) {
    if (!text.trim()) {
      translatedOutputDiv.innerHTML = "";
      updateStarButton();
      return;
    }
    if (sourceLang === targetLang && sourceLang !== "auto") {
      translatedOutputDiv.innerHTML = text;
      updateStarButton();
      return;
    }
    isTranslating = true;
    translatedOutputDiv.innerHTML = '<span class="loader-dots">Translating</span>';
    try {
      const body = { q: text, source: sourceLang, target: targetLang };
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`API error ${response.status}`);
      const data = await response.json();
      const translated = data?.data?.translations?.[0]?.translatedText || text;
      translatedOutputDiv.innerHTML = translated;
      // save to history
      if (text.trim() && translated.trim()) {
        translationHistory.unshift({ sourceText: text, translatedText: translated, sourceLang, targetLang, timestamp: Date.now() });
        if (translationHistory.length > 50) translationHistory.pop();
        localStorage.setItem("linguaflow_history", JSON.stringify(translationHistory));
      }
      updateStarButton();
    } catch (err) {
      console.warn(err);
      let mock = `[Please Try Again] ${text}`;
      translatedOutputDiv.innerHTML = mock;
      showToast("Translation failed. Please try again.", 2000);
      updateStarButton();
    }
    isTranslating = false;
  }
  
  function triggerDebouncedTranslate() {
    const input = sourceTextarea.value;
    currentInputText = input;
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!input.trim()) {
      translatedOutputDiv.innerHTML = "";
      updateStarButton();
      return;
    }
    debounceTimer = setTimeout(() => performTranslation(input), 500);
  }
  
  sourceTextarea.addEventListener("input", (e) => { triggerDebouncedTranslate(); });
  
  async function swapLanguages() {
    if (sourceLang === "auto") {
      showToast("Cannot swap from auto-detect", 1000);
      return;
    }
    const oldSource = sourceLang;
    const oldTarget = targetLang;
    sourceLang = oldTarget;
    targetLang = oldSource;
    updateLangUI();
    if (sourceTextarea.value.trim()) {
      await performTranslation(sourceTextarea.value);
    } else {
      translatedOutputDiv.innerHTML = "";
    }
  }
  
  swapBtn.addEventListener("click", swapLanguages);
  
  function showLangSelector(isSource) {
    if (currentModal) return;
    const modalDiv = document.createElement("div");
    modalDiv.className = "modal-overlay";
    const modalContent = document.createElement("div");
    modalContent.className = "lang-modal";
    const searchInput = document.createElement("input");
    searchInput.placeholder = "Search language...";
    const listDiv = document.createElement("div");
    listDiv.className = "lang-list";
    function renderList(filter = "") {
      listDiv.innerHTML = "";
      const filtered = languages.filter(l => l.name.toLowerCase().includes(filter.toLowerCase()) && (isSource ? true : l.code !== "auto"));
      filtered.forEach(lang => {
        const opt = document.createElement("div");
        opt.className = "lang-option";
        opt.innerText = lang.name;
        opt.addEventListener("click", () => {
          if (isSource) sourceLang = lang.code;
          else targetLang = lang.code;
          updateLangUI();
          document.body.removeChild(modalDiv);
          currentModal = null;
          if (sourceTextarea.value.trim()) triggerDebouncedTranslate();
          else translatedOutputDiv.innerHTML = "";
        });
        listDiv.appendChild(opt);
      });
    }
    searchInput.addEventListener("input", (e) => renderList(e.target.value));
    renderList("");
    modalContent.appendChild(searchInput);
    modalContent.appendChild(listDiv);
    modalDiv.appendChild(modalContent);
    modalDiv.addEventListener("click", (e) => { if(e.target === modalDiv) { document.body.removeChild(modalDiv); currentModal = null; } });
    document.body.appendChild(modalDiv);
    currentModal = modalDiv;
  }
  
  sourceLangBtn.addEventListener("click", () => showLangSelector(true));
  targetLangBtn.addEventListener("click", () => showLangSelector(false));
  
  copySourceBtn.addEventListener("click", () => { navigator.clipboard.writeText(sourceTextarea.value); showToast("Source copied!"); });
  copyOutputBtn.addEventListener("click", () => { const text = translatedOutputDiv.innerText; if(text && text !== "Translation will appear here") { navigator.clipboard.writeText(text); showToast("Translation copied!"); } else showToast("Nothing to copy", 1000); });
  clearInputBtn.addEventListener("click", () => { sourceTextarea.value = ""; triggerDebouncedTranslate(); });
  clearOutputBtn.addEventListener("click", () => { translatedOutputDiv.innerHTML = ""; showToast("Output cleared"); });
  
  speakOutputBtn.addEventListener("click", () => {
    const text = translatedOutputDiv.innerText;
    if (text && text !== "Translation will appear here" && !text.includes("Translating")) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLang === "auto" ? "en" : targetLang;
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    } else showToast("No text to speak", 1000);
  });
  
  // Voice input
  recordBtn.addEventListener("click", () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { showToast("Voice not supported", 1200); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = sourceLang === "auto" ? "en-US" : sourceLang;
    recognition.interimResults = false;
    recognition.start();
    recognition.onresult = (event) => { const transcript = event.results[0][0].transcript; sourceTextarea.value = transcript; triggerDebouncedTranslate(); };
    recognition.onerror = () => showToast("Mic error", 1000);
  });
  
  // Update star button to show active state
  function updateStarButton() {
    const currentInput = sourceTextarea.value.trim();
    const currentOutput = translatedOutputDiv.innerText;
    
    const isFavorited = favoritesList.some(fav => 
      fav.source === currentInput && 
      fav.target === currentOutput &&
      fav.srcLang === sourceLang &&
      fav.tgtLang === targetLang
    );
    
    if (isFavorited) {
      favStarBtn.classList.remove('far');
      favStarBtn.classList.add('fas');
      favStarBtn.style.color = '#eab308';
    } else {
      favStarBtn.classList.remove('fas');
      favStarBtn.classList.add('far');
      favStarBtn.style.color = '#6b6f8c';
    }
  }
  
  // favStarBtn click handler
  favStarBtn.addEventListener("click", () => {
    const inputText = sourceTextarea.value.trim();
    const outputText = translatedOutputDiv.innerText;
    
    if (!inputText || !outputText || outputText.includes("Translating") || outputText === "Translation will appear here") {
      showToast("Enter text first", 1000);
      return;
    }
    
    const existingIndex = favoritesList.findIndex(fav => 
      fav.source === inputText && 
      fav.target === outputText &&
      fav.srcLang === sourceLang &&
      fav.tgtLang === targetLang
    );
    
    if (existingIndex !== -1) {
      favoritesList.splice(existingIndex, 1);
      showToast("Removed from favorites", 1200);
      updateStarButton();
    } else {
      const favItem = { 
        source: inputText, 
        target: outputText, 
        srcLang: sourceLang, 
        tgtLang: targetLang,
        timestamp: Date.now() 
      };
      favoritesList.unshift(favItem);
      if (favoritesList.length > 50) favoritesList.pop();
      showToast("Added to favorites! ⭐", 1200);
      updateStarButton();
    }
    
    localStorage.setItem("linguaflow_favs", JSON.stringify(favoritesList));
  });
  
  infoBtn.addEventListener("click", () => showToast("LinguaFlow AI • 100+ languages • Real-time", 2000));
  writeBtn.addEventListener("click", () => { sourceTextarea.focus(); });
  scanBtn.addEventListener("click", () => showToast("📸 Camera OCR coming soon", 1200));
  
  // Navigation
  const navItems = document.querySelectorAll(".nav-item");
  
  function showHistoryModal() {
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    
    const historyContainer = document.createElement('div');
    historyContainer.className = 'history-container';
    
    const header = document.createElement('div');
    header.className = 'history-header';
    header.innerHTML = `
      <h3><i class="fas fa-history" style="margin-right: 8px;"></i> Translation History</h3>
      <button class="close-history"><i class="fas fa-times"></i></button>
    `;
    
    const historyListDiv = document.createElement('div');
    historyListDiv.className = 'history-list';
    
    function renderHistoryList() {
      const history = JSON.parse(localStorage.getItem("linguaflow_history") || "[]");
      
      if (history.length === 0) {
        historyListDiv.innerHTML = `
          <div class="empty-history">
            <i class="fas fa-language"></i>
            <p>No translations yet</p>
            <p style="font-size: 0.8rem; margin-top: 8px;">Start translating to see history here</p>
          </div>
        `;
        return;
      }
      
      historyListDiv.innerHTML = '';
      history.forEach((item) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        const sourceLangName = languages.find(l => l.code === item.sourceLang)?.name || item.sourceLang;
        const targetLangName = languages.find(l => l.code === item.targetLang)?.name || item.targetLang;
        
        historyItem.innerHTML = `
          <div class="history-source-text">${escapeHtml(item.sourceText.substring(0, 80))}${item.sourceText.length > 80 ? '...' : ''}</div>
          <div class="history-target-text">→ ${escapeHtml(item.translatedText.substring(0, 80))}${item.translatedText.length > 80 ? '...' : ''}</div>
          <div class="history-langs">${sourceLangName} → ${targetLangName}</div>
        `;
        
        historyItem.addEventListener('click', () => {
          sourceLang = item.sourceLang;
          targetLang = item.targetLang;
          updateLangUI();
          sourceTextarea.value = item.sourceText;
          translatedOutputDiv.innerHTML = item.translatedText;
          modal.remove();
          showToast('Loaded from history', 1500);
          updateStarButton();
        });
        
        historyListDiv.appendChild(historyItem);
      });
      
      const clearDiv = document.createElement('div');
      clearDiv.style.padding = '16px';
      clearDiv.style.textAlign = 'center';
      const clearBtn = document.createElement('button');
      clearBtn.className = 'clear-history-btn';
      clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear All History';
      clearBtn.onclick = () => {
        if (confirm('Delete all translation history?')) {
          localStorage.setItem("linguaflow_history", "[]");
          renderHistoryList();
          showToast('History cleared', 1200);
        }
      };
      clearDiv.appendChild(clearBtn);
      historyListDiv.appendChild(clearDiv);
    }
    
    renderHistoryList();
    
    historyContainer.appendChild(header);
    historyContainer.appendChild(historyListDiv);
    modal.appendChild(historyContainer);
    document.body.appendChild(modal);
    
    const closeBtn = historyContainer.querySelector('.close-history');
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
  
  function showFavoritesModal() {
    const modal = document.createElement('div');
    modal.className = 'favorites-modal';
    
    const favoritesContainer = document.createElement('div');
    favoritesContainer.className = 'favorites-container';
    
    const header = document.createElement('div');
    header.className = 'favorites-header';
    header.innerHTML = `
      <h3><i class="fas fa-heart" style="margin-right: 8px; color: #eab308;"></i> My Favorites</h3>
      <button class="close-favorites"><i class="fas fa-times"></i></button>
    `;
    
    const favoritesListDiv = document.createElement('div');
    favoritesListDiv.className = 'favorites-list';
    
    function renderFavoritesList() {
      const favorites = JSON.parse(localStorage.getItem("linguaflow_favs") || "[]");
      
      if (favorites.length === 0) {
        favoritesListDiv.innerHTML = `
          <div class="empty-favorites">
            <i class="far fa-heart"></i>
            <p>No favorites yet</p>
            <p style="font-size: 0.8rem; margin-top: 8px;">Click the ⭐ star icon to save translations you love</p>
          </div>
        `;
        return;
      }
      
      favoritesListDiv.innerHTML = '';
      favorites.forEach((item, index) => {
        const favoriteItem = document.createElement('div');
        favoriteItem.className = 'favorite-item';
        const sourceLangName = languages.find(l => l.code === item.srcLang)?.name || item.srcLang;
        const targetLangName = languages.find(l => l.code === item.tgtLang)?.name || item.tgtLang;
        
        favoriteItem.innerHTML = `
          <div class="favorite-source-text">${escapeHtml(item.source.substring(0, 80))}${item.source.length > 80 ? '...' : ''}</div>
          <div class="favorite-target-text">→ ${escapeHtml(item.target.substring(0, 80))}${item.target.length > 80 ? '...' : ''}</div>
          <div class="favorite-langs">${sourceLangName} → ${targetLangName}</div>
          <button class="remove-favorite" data-index="${index}">
            <i class="fas fa-trash-alt"></i>
          </button>
        `;
        
        favoriteItem.addEventListener('click', (e) => {
          if (e.target.classList.contains('remove-favorite') || 
              e.target.parentElement.classList.contains('remove-favorite')) {
            return;
          }
          sourceLang = item.srcLang;
          targetLang = item.tgtLang;
          updateLangUI();
          sourceTextarea.value = item.source;
          translatedOutputDiv.innerHTML = item.target;
          modal.remove();
          showToast('Loaded favorite', 1500);
          updateStarButton();
        });
        
        const removeBtn = favoriteItem.querySelector('.remove-favorite');
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          favorites.splice(index, 1);
          localStorage.setItem("linguaflow_favs", JSON.stringify(favorites));
          renderFavoritesList();
          showToast('Removed from favorites', 1200);
          updateStarButton();
        });
        
        favoritesListDiv.appendChild(favoriteItem);
      });
      
      const clearDiv = document.createElement('div');
      clearDiv.style.padding = '16px';
      clearDiv.style.textAlign = 'center';
      const clearBtn = document.createElement('button');
      clearBtn.className = 'clear-favorites-btn';
      clearBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Clear All Favorites';
      clearBtn.onclick = () => {
        if (confirm('Delete all favorites? This cannot be undone.')) {
          localStorage.setItem("linguaflow_favs", "[]");
          favoritesList = [];
          renderFavoritesList();
          showToast('All favorites cleared', 1200);
          updateStarButton();
        }
      };
      clearDiv.appendChild(clearBtn);
      favoritesListDiv.appendChild(clearDiv);
    }
    
    renderFavoritesList();
    
    favoritesContainer.appendChild(header);
    favoritesContainer.appendChild(favoritesListDiv);
    modal.appendChild(favoritesContainer);
    document.body.appendChild(modal);
    
    const closeBtn = favoritesContainer.querySelector('.close-favorites');
    closeBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
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
  
  function handleNav(target) {
    if (target === "home") { 
      sourceTextarea.value = ""; 
      translatedOutputDiv.innerHTML = ""; 
      sourceLang="auto"; 
      targetLang="en"; 
      updateLangUI(); 
      triggerDebouncedTranslate(); 
      updateStarButton();
      showToast("Ready to translate", 1000); 
    }
    else if (target === "search") { 
      showHistoryModal();
    }
    else if (target === "favorites") {
      showFavoritesModal();
    }
    navItems.forEach(item => { 
      if(item.dataset.nav === target) item.classList.add("active"); 
      else item.classList.remove("active"); 
    });
  }
  
  navItems.forEach(item => { item.addEventListener("click", () => handleNav(item.dataset.nav)); });
  
  updateLangUI();
  updateStarButton();
  
  window.addEventListener('load', () => {
    updateStarButton();
  });