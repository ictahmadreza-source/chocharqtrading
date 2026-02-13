// Global State
let currentProfile = null;
let dbPath = null;
let profiles = [];
let journals = [];
let profileSettings = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    setupEventListeners();
    autoFillDateTime();
    updateDbPathButton();
    
    // Try to load directory handle on startup
    if (typeof loadDirectoryHandle === 'function') {
        loadDirectoryHandle().then(handle => {
            if (handle) {
                console.log('✅ Directory handle loaded:', handle.name);
            }
        });
    }
});

// Select Folder (for setup screen)
async function selectFolder() {
    if (!isFileSystemSupported()) {
        alert('⚠️ مرورگر شما از File System Access API پشتیبانی نمی‌کند.\n\nلطفاً از Chrome، Edge یا مرورگرهای مدرن استفاده کنید.\n\nدر حال حاضر داده‌ها فقط در localStorage ذخیره می‌شوند.');
        
        // Fallback: ask for path
        const path = prompt('لطفاً مسیر پوشه را وارد کنید (فقط برای مرجع):', 'C:\\TradingJournal');
        if (path) {
            dbPath = path;
            localStorage.setItem('journalDbPath', dbPath);
            document.getElementById('selectedPath').textContent = dbPath;
            document.getElementById('setupScreen')?.classList.add('hidden');
            updateDbPathButton();
            showProfileManager();
        }
        return;
    }
    
    const handle = await selectDirectory();
    if (handle) {
        dbPath = handle.name;
        localStorage.setItem('journalDbPath', dbPath);
        document.getElementById('selectedPath').textContent = handle.name;
        
        setTimeout(() => {
            document.getElementById('setupScreen')?.classList.add('hidden');
            updateDbPathButton();
            showProfileManager();
        }, 500);
    }
}

// Load Settings
function loadSettings() {
    dbPath = localStorage.getItem('journalDbPath');
    currentProfile = localStorage.getItem('currentProfile');
    
    if (dbPath) {
        document.getElementById('setupScreen')?.classList.add('hidden');
        loadProfiles();
        
        if (currentProfile) {
            loadProfileData();
            showSection('new-journal');
        } else {
            showProfileManager();
        }
    }
}

// Setup Database
async function setupDatabase() {
    const path = document.getElementById('dbPath')?.value.trim();
    
    if (!path) {
        alert('لطفاً مسیر پوشه را وارد کنید');
        return;
    }
    
    // Try to select directory using File System API
    if (isFileSystemSupported()) {
        const handle = await selectDirectory();
        if (handle) {
            dbPath = handle.name;
            localStorage.setItem('journalDbPath', dbPath);
            document.getElementById('setupScreen')?.classList.add('hidden');
            updateDbPathButton();
            showProfileManager();
        }
    } else {
        // Fallback to localStorage only
        dbPath = path;
        localStorage.setItem('journalDbPath', dbPath);
        document.getElementById('setupScreen')?.classList.add('hidden');
        updateDbPathButton();
        showProfileManager();
        
        alert('⚠️ مرورگر شما از ذخیره‌سازی فایل پشتیبانی نمی‌کند.\n\nداده‌ها فقط در localStorage ذخیره می‌شوند.\n\nبرای ذخیره‌سازی روی دیسک، از Chrome یا Edge استفاده کنید.');
    }
}

// Profile Management
function loadProfiles() {
    const savedProfiles = localStorage.getItem(`profiles_${dbPath}`);
    profiles = savedProfiles ? JSON.parse(savedProfiles) : [];
    updateProfileList();
    updateProfileSwitcher();
}

function showProfileManager() {
    document.getElementById('profileManager')?.classList.remove('hidden');
    document.getElementById('newJournalSection')?.classList.add('hidden');
    document.getElementById('journalListSection')?.classList.add('hidden');
    document.getElementById('dashboardSection')?.classList.add('hidden');
    document.getElementById('settingsSection')?.classList.add('hidden');
    loadProfiles();
}

function updateProfileList() {
    const container = document.getElementById('profileList');
    if (!container) return;
    
    if (profiles.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center">هنوز پروفایلی ایجاد نشده است</p>';
        return;
    }
    
    container.innerHTML = profiles.map(profile => `
        <div class="profile-card ${profile === currentProfile ? 'active' : ''}" onclick="selectProfile('${profile}')">
            <div>
                <i class="fas fa-user-circle text-2xl text-blue-500 ml-2"></i>
                <span class="font-semibold">${profile}</span>
            </div>
            <button onclick="deleteProfile(event, '${profile}')" class="btn-danger text-sm">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function showNewProfileForm() {
    document.getElementById('newProfileModal')?.classList.add('active');
}

function createProfile() {
    const name = document.getElementById('newProfileName')?.value.trim();
    
    if (!name) {
        alert('لطفاً نام پروفایل را وارد کنید');
        return;
    }
    
    if (profiles.includes(name)) {
        alert('این نام قبلاً استفاده شده است');
        return;
    }
    
    profiles.push(name);
    localStorage.setItem(`profiles_${dbPath}`, JSON.stringify(profiles));
    
    // Initialize profile settings
    const settings = {
        symbols: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'],
        stops: ['فیک چاک', 'بریک استراکچر', 'تایم استاپ']
    };
    localStorage.setItem(`profile_${dbPath}_${name}`, JSON.stringify(settings));
    
    // Create physical directory if supported
    if (typeof createProfileDirectory === 'function') {
        createProfileDirectory(name).then(success => {
            if (success) {
                console.log(`✅ Profile directory created: ${name}`);
            }
        });
    }
    
    const input = document.getElementById('newProfileName');
    if (input) input.value = '';
    closeModal('newProfileModal');
    updateProfileList();
    updateProfileSwitcher();
    
    alert(`پروفایل "${name}" با موفقیت ایجاد شد!`);
}

function selectProfile(profile) {
    currentProfile = profile;
    localStorage.setItem('currentProfile', profile);
    
    loadProfileData();
    updateProfileSwitcher();
    document.getElementById('profileManager')?.classList.add('hidden');
    showSection('new-journal');
}

function deleteProfile(event, profile) {
    event.stopPropagation();
    
    if (!confirm(`آیا از حذف پروفایل "${profile}" اطمینان دارید؟`)) {
        return;
    }
    
    profiles = profiles.filter(p => p !== profile);
    localStorage.setItem(`profiles_${dbPath}`, JSON.stringify(profiles));
    localStorage.removeItem(`profile_${dbPath}_${profile}`);
    localStorage.removeItem(`journals_${dbPath}_${profile}`);
    
    if (currentProfile === profile) {
        currentProfile = null;
        localStorage.removeItem('currentProfile');
    }
    
    updateProfileList();
    updateProfileSwitcher();
}

// Load Profile Data
function loadProfileData() {
    const settings = localStorage.getItem(`profile_${dbPath}_${currentProfile}`);
    profileSettings = settings ? JSON.parse(settings) : { 
        symbols: ['XAUUSD', 'EURUSD'],
        stops: ['فیک چاک', 'بریک استراکچر']
    };
    
    const journalsData = localStorage.getItem(`journals_${dbPath}_${currentProfile}`);
    journals = journalsData ? JSON.parse(journalsData) : [];
    
    updateSymbolSelect();
    updateStopButtons();
    updateJournalList();
    updateProfileSwitcher();
    
    // Initialize quick buttons
    initializeQuickButtons();
}

// Symbol Management
function updateSymbolSelect() {
    const select = document.getElementById('symbol');
    if (!select) return;
    
    select.innerHTML = '<option value="">انتخاب کنید</option>' +
        profileSettings.symbols.map(s => `<option value="${s}">${s}</option>`).join('');
}

function manageSymbols() {
    const modal = document.getElementById('symbolModal');
    const list = document.getElementById('symbolList');
    
    if (list) {
        list.innerHTML = profileSettings.symbols.map(symbol => `
            <div class="symbol-item">
                <span>${symbol}</span>
                <button onclick="removeSymbol('${symbol}')" class="btn-danger text-sm">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    modal?.classList.add('active');
}

function addSymbol() {
    const input = document.getElementById('newSymbol');
    const symbol = input?.value.trim().toUpperCase();
    
    if (!symbol) return;
    
    if (profileSettings.symbols.includes(symbol)) {
        alert('این نماد قبلاً اضافه شده است');
        return;
    }
    
    profileSettings.symbols.push(symbol);
    saveProfileSettings();
    if (input) input.value = '';
    manageSymbols();
    updateSymbolButtons();
}

function removeSymbol(symbol) {
    profileSettings.symbols = profileSettings.symbols.filter(s => s !== symbol);
    saveProfileSettings();
    manageSymbols();
    updateSymbolButtons();
}

// Stop Management
function updateStopButtons() {
    const container = document.getElementById('stopButtons');
    if (!container) return;
    
    if (!profileSettings.stops) {
        profileSettings.stops = ['فیک چاک', 'بریک استراکچر'];
    }
    
    container.innerHTML = profileSettings.stops.map(stop => `
        <button type="button" class="quick-btn" onclick="selectStop('${stop}')">${stop}</button>
    `).join('');
}

function selectStop(stop) {
    document.getElementById('stopType').value = stop;
    document.querySelectorAll('#stopButtons .quick-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === stop) {
            btn.classList.add('active');
        }
    });
}

function manageStops() {
    const modal = document.getElementById('stopModal');
    const list = document.getElementById('stopList');
    
    if (list) {
        list.innerHTML = profileSettings.stops.map(stop => `
            <div class="symbol-item">
                <span>${stop}</span>
                <button onclick="removeStop('${stop}')" class="btn-danger text-sm">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    modal?.classList.add('active');
}

function addStop() {
    const input = document.getElementById('newStop');
    const stop = input?.value.trim();
    
    if (!stop) return;
    
    if (profileSettings.stops.includes(stop)) {
        alert('این استاپ قبلاً اضافه شده است');
        return;
    }
    
    profileSettings.stops.push(stop);
    saveProfileSettings();
    if (input) input.value = '';
    manageStops();
    updateStopButtons();
}

function removeStop(stop) {
    profileSettings.stops = profileSettings.stops.filter(s => s !== stop);
    saveProfileSettings();
    manageStops();
    updateStopButtons();
}

// Timeframe Management
function manageTimeframes() {
    const modal = document.getElementById('timeframeModal');
    const list = document.getElementById('timeframeList');
    
    if (!profileSettings.timeframePresets) {
        profileSettings.timeframePresets = ['15s', '1m', '5m'];
    }
    
    if (list) {
        list.innerHTML = profileSettings.timeframePresets.map(tf => `
            <div class="symbol-item">
                <span>${tf}</span>
                <button onclick="removeTimeframe('${tf}')" class="btn-danger text-sm">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    modal?.classList.add('active');
}

function addTimeframe() {
    const input = document.getElementById('newTimeframe');
    const tf = input?.value.trim();
    
    if (!tf) return;
    
    if (!profileSettings.timeframePresets) {
        profileSettings.timeframePresets = ['15s', '1m', '5m'];
    }
    
    if (profileSettings.timeframePresets.includes(tf)) {
        alert('این تایم‌فریم قبلاً اضافه شده است');
        return;
    }
    
    profileSettings.timeframePresets.push(tf);
    saveProfileSettings();
    if (input) input.value = '';
    manageTimeframes();
    updateTimeframeButtons();
}

function removeTimeframe(tf) {
    profileSettings.timeframePresets = profileSettings.timeframePresets.filter(t => t !== tf);
    saveProfileSettings();
    manageTimeframes();
    updateTimeframeButtons();
}

// Risk Management
function manageRisks() {
    const modal = document.getElementById('riskModal');
    const list = document.getElementById('riskList');
    
    if (!profileSettings.riskPresets) {
        profileSettings.riskPresets = ['1', '2'];
    }
    
    if (list) {
        list.innerHTML = profileSettings.riskPresets.map(risk => `
            <div class="symbol-item">
                <span>${risk}%</span>
                <button onclick="removeRisk('${risk}')" class="btn-danger text-sm">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    modal?.classList.add('active');
}

function addRisk() {
    const input = document.getElementById('newRisk');
    const risk = input?.value.trim();
    
    if (!risk) return;
    
    if (!profileSettings.riskPresets) {
        profileSettings.riskPresets = ['1', '2'];
    }
    
    if (profileSettings.riskPresets.includes(risk)) {
        alert('این ریسک قبلاً اضافه شده است');
        return;
    }
    
    profileSettings.riskPresets.push(risk);
    saveProfileSettings();
    if (input) input.value = '';
    manageRisks();
    updateRiskButtons();
}

function removeRisk(risk) {
    profileSettings.riskPresets = profileSettings.riskPresets.filter(r => r !== risk);
    saveProfileSettings();
    manageRisks();
    updateRiskButtons();
}

// R:R Management
function manageRRs() {
    const modal = document.getElementById('rrModal');
    const list = document.getElementById('rrList');
    
    if (!profileSettings.rrPresets) {
        profileSettings.rrPresets = ['1:2', '1:3'];
    }
    
    if (list) {
        list.innerHTML = profileSettings.rrPresets.map(rr => `
            <div class="symbol-item">
                <span>${rr}</span>
                <button onclick="removeRR('${rr}')" class="btn-danger text-sm">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    modal?.classList.add('active');
}

function addRR() {
    const input = document.getElementById('newRR');
    const rr = input?.value.trim();
    
    if (!rr) return;
    
    if (!profileSettings.rrPresets) {
        profileSettings.rrPresets = ['1:2', '1:3'];
    }
    
    if (profileSettings.rrPresets.includes(rr)) {
        alert('این نسبت قبلاً اضافه شده است');
        return;
    }
    
    profileSettings.rrPresets.push(rr);
    saveProfileSettings();
    if (input) input.value = '';
    manageRRs();
    updateRRButtons();
}

function removeRR(rr) {
    profileSettings.rrPresets = profileSettings.rrPresets.filter(r => r !== rr);
    saveProfileSettings();
    manageRRs();
    updateRRButtons();
}

// Mistake/Note Presets Management
function manageMistakes() {
    const modal = document.getElementById('mistakeModal');
    const list = document.getElementById('mistakeList');
    
    if (!profileSettings.mistakePresets) {
        profileSettings.mistakePresets = [];
    }
    
    if (list) {
        list.innerHTML = profileSettings.mistakePresets.map(mistake => `
            <div class="symbol-item">
                <span>${mistake}</span>
                <button onclick="removeMistakePreset('${mistake.replace(/'/g, "\\\'")}')" class="btn-danger text-sm">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    modal?.classList.add('active');
}

function addMistakePreset() {
    const input = document.getElementById('newMistake');
    const mistake = input?.value.trim();
    
    if (!mistake) return;
    
    if (!profileSettings.mistakePresets) {
        profileSettings.mistakePresets = [];
    }
    
    if (profileSettings.mistakePresets.includes(mistake)) {
        alert('این جمله قبلاً اضافه شده است');
        return;
    }
    
    profileSettings.mistakePresets.push(mistake);
    saveProfileSettings();
    if (input) input.value = '';
    manageMistakes();
    updateMistakeButtons();
}

function removeMistakePreset(mistake) {
    profileSettings.mistakePresets = profileSettings.mistakePresets.filter(m => m !== mistake);
    saveProfileSettings();
    manageMistakes();
    updateMistakeButtons();
}

function updateMistakeButtons() {
    const container = document.getElementById('mistakeButtons');
    if (!container) return;
    
    if (!profileSettings.mistakePresets || profileSettings.mistakePresets.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = profileSettings.mistakePresets.map(mistake => `
        <button type="button" class="quick-btn" onclick="selectMistake('${mistake.replace(/'/g, "\\'")}')">${mistake}</button>
    `).join('');
}

function selectMistake(mistake) {
    document.getElementById('mistake').value = mistake;
    document.querySelectorAll('#mistakeButtons .quick-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === mistake) {
            btn.classList.add('active');
        }
    });
}

function saveProfileSettings() {
    localStorage.setItem(`profile_${dbPath}_${currentProfile}`, JSON.stringify(profileSettings));
}

// Section Navigation
function showSection(section) {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
        }
    });
    
    document.getElementById('profileManager')?.classList.add('hidden');
    document.getElementById('newJournalSection')?.classList.add('hidden');
    document.getElementById('journalListSection')?.classList.add('hidden');
    document.getElementById('dashboardSection')?.classList.add('hidden');
    document.getElementById('settingsSection')?.classList.add('hidden');
    
    if (section === 'new-journal') {
        document.getElementById('newJournalSection')?.classList.remove('hidden');
    } else if (section === 'journal-list') {
        document.getElementById('journalListSection')?.classList.remove('hidden');
        updateJournalList();
    } else if (section === 'dashboard') {
        document.getElementById('dashboardSection')?.classList.remove('hidden');
    } else if (section === 'settings') {
        document.getElementById('settingsSection')?.classList.remove('hidden');
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            if (section) showSection(section);
        });
    });
    
    // Quality buttons
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const qualityInput = document.getElementById('quality');
            if (qualityInput) qualityInput.value = btn.dataset.value;
        });
    });
    
    // Form submission
    const form = document.getElementById('journalForm');
    if (form) {
        form.addEventListener('submit', saveJournal);
    }
}

// Auto Fill Date Time
function autoFillDateTime() {
    const now = new Date();
    const persianDate = new Intl.DateTimeFormat('fa-IR').format(now);
    const time = now.toTimeString().slice(0, 5);
    
    const dateInput = document.getElementById('tradeDate');
    const timeInput = document.getElementById('tradeTime');
    
    if (dateInput) dateInput.value = persianDate;
    if (timeInput) timeInput.value = time;
}

// Save Journal
function saveJournal(event) {
    event.preventDefault();
    
    if (!currentProfile) {
        alert('لطفاً ابتدا یک پروفایل انتخاب کنید');
        return;
    }
    
    // Check if editing
    const form = document.getElementById('journalForm');
    const editingId = form?.dataset.editingId;
    
    // Get values from hidden inputs (set by quick buttons)
    const symbolValue = document.getElementById('symbol')?.value;
    const riskValue = document.getElementById('risk')?.value;
    const rrValue = document.getElementById('riskReward')?.value;
    const sessionValue = document.getElementById('session')?.value;
    const tradeTypeValue = document.getElementById('tradeType')?.value;
    const timeframeValue = document.getElementById('timeframe')?.value;
    const resultValue = document.getElementById('result')?.value;
    const qualityValue = document.getElementById('quality')?.value;
    const emotionValue = document.getElementById('emotion')?.value;
    const wouldRetakeValue = document.getElementById('wouldRetake')?.value;
    const followedPlanValue = document.getElementById('followedPlan')?.value;
    
    // Validate required fields
    if (!symbolValue) {
        alert('لطفاً نماد را انتخاب کنید');
        return;
    }
    if (!riskValue) {
        alert('لطفاً ریسک را وارد کنید');
        return;
    }
    if (!rrValue) {
        alert('لطفاً نسبت ریسک به ریوارد را وارد کنید');
        return;
    }
    if (!sessionValue) {
        alert('لطفاً سشن معاملاتی را انتخاب کنید');
        return;
    }
    if (!tradeTypeValue) {
        alert('لطفاً نوع معامله را انتخاب کنید');
        return;
    }
    if (!timeframeValue) {
        alert('لطفاً تایم فریم را انتخاب کنید');
        return;
    }
    if (!resultValue) {
        alert('لطفاً نتیجه را انتخاب کنید');
        return;
    }
    if (!qualityValue) {
        alert('لطفاً کیفیت اجرا را انتخاب کنید');
        return;
    }
    if (!emotionValue) {
        alert('لطفاً احساسات غالب را انتخاب کنید');
        return;
    }
    if (!wouldRetakeValue) {
        alert('لطفاً گزینه "دوباره می‌گرفتم" را انتخاب کنید');
        return;
    }
    if (!followedPlanValue) {
        alert('لطفاً گزینه "طبق پلن بود" را انتخاب کنید');
        return;
    }
    
    const journal = {
        id: editingId ? parseInt(editingId) : Date.now(),
        symbol: symbolValue,
        risk: riskValue,
        riskReward: rrValue,
        session: sessionValue,
        tradeType: tradeTypeValue,
        timeframe: timeframeValue,
        result: resultValue,
        stopType: document.getElementById('stopType')?.value || '',
        mistake: document.getElementById('mistake')?.value || '',
        quality: qualityValue,
        emotion: emotionValue,
        wouldRetake: wouldRetakeValue,
        followedPlan: followedPlanValue,
        comment: document.getElementById('comment')?.value || '',
        chartLink: document.getElementById('chartLink')?.value || '',
        tradeDate: document.getElementById('tradeDate')?.value || '',
        tradeTime: document.getElementById('tradeTime')?.value || '',
        createdAt: new Date().toISOString()
    };
    
    // Handle image upload
    const imageFile = document.getElementById('tradeImage')?.files[0];
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            journal.tradeImage = e.target.result;
            saveJournalToStorage(journal, editingId);
        };
        reader.readAsDataURL(imageFile);
    } else {
        // Keep existing image if editing
        if (editingId) {
            const existing = journals.find(j => j.id === parseInt(editingId));
            if (existing?.tradeImage) {
                journal.tradeImage = existing.tradeImage;
            }
        }
        saveJournalToStorage(journal, editingId);
    }
}

function saveJournalToStorage(journal, editingId) {
    if (editingId) {
        // Update existing
        const index = journals.findIndex(j => j.id === parseInt(editingId));
        if (index !== -1) {
            journals[index] = journal;
        }
    } else {
        // Add new
        journals.unshift(journal);
    }
    
    // Save to localStorage
    localStorage.setItem(`journals_${dbPath}_${currentProfile}`, JSON.stringify(journals));
    
    // Save to file system if supported
    if (typeof saveJournalsToFile === 'function') {
        saveJournalsToFile(currentProfile, journals).then(success => {
            if (success) {
                console.log('✅ Journals saved to file system');
            }
        });
    }
    
    alert(editingId ? 'ژورنال با موفقیت بروزرسانی شد!' : 'ژورنال با موفقیت ذخیره شد!');
    resetForm();
    showSection('journal-list');
}

// Reset Form
function resetForm() {
    const form = document.getElementById('journalForm');
    if (form) {
        form.reset();
        delete form.dataset.editingId;
    }
    
    // Clear all hidden inputs
    document.getElementById('symbol').value = '';
    document.getElementById('risk').value = '';
    document.getElementById('riskReward').value = '';
    document.getElementById('session').value = '';
    document.getElementById('tradeType').value = '';
    document.getElementById('timeframe').value = '';
    document.getElementById('result').value = '';
    document.getElementById('stopType').value = '';
    document.getElementById('quality').value = '';
    document.getElementById('emotion').value = '';
    document.getElementById('wouldRetake').value = '';
    document.getElementById('followedPlan').value = '';
    
    // Remove active class from all buttons
    document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    
    // Reset submit button
    const submitBtn = document.querySelector('#journalForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save ml-2"></i>ذخیره ژورنال';
    }
    
    // Reset mistake label
    const label = document.getElementById('mistakeLabel');
    if (label) {
        label.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 ml-2"></i>مهمترین اشتباه';
        label.classList.remove('text-yellow-600');
        label.classList.add('text-red-600');
    }
    
    autoFillDateTime();
    
    alert('فرم پاک شد');
}

// Update Journal List
function updateJournalList() {
    const container = document.getElementById('journalListContainer');
    if (!container) return;
    
    if (journals.length === 0) {
        container.innerHTML = '<div class="glass-card text-center"><p class="text-gray-500">هنوز ژورنالی ثبت نشده است</p></div>';
        return;
    }
    
    // Use createJournalCard from features.js if available
    if (typeof createJournalCard === 'function') {
        container.innerHTML = journals.map(j => createJournalCard(j)).join('');
    } else {
        // Fallback simple display
        container.innerHTML = journals.map(j => `
            <div class="journal-card">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-900">${j.symbol}</h3>
                        <p class="text-sm text-gray-500">${j.tradeDate} - ${j.tradeTime}</p>
                    </div>
                    <div class="flex gap-2">
                        <span class="tag tag-${j.tradeType === 'خرید' ? 'buy' : 'sell'}">${j.tradeType}</span>
                        <span class="tag tag-${j.result.toLowerCase()}">${j.result}</span>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-500">ریسک</p>
                        <p class="font-semibold">${j.risk}%</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">R:R</p>
                        <p class="font-semibold">${j.riskReward}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">تایم فریم</p>
                        <p class="font-semibold">${j.timeframe}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">کیفیت</p>
                        <p class="font-semibold">${j.quality}/5</p>
                    </div>
                </div>
                
                ${j.comment ? `<p class="text-gray-700 mb-4">${j.comment}</p>` : ''}
                
                <div class="flex gap-2 flex-wrap">
                    <span class="text-sm text-gray-600"><i class="fas fa-brain ml-1"></i>${j.emotion}</span>
                    <span class="text-sm text-gray-600"><i class="fas fa-clipboard-check ml-1"></i>طبق پلن: ${j.followedPlan}</span>
                    <span class="text-sm text-gray-600"><i class="fas fa-redo ml-1"></i>دوباره می‌گرفتم: ${j.wouldRetake}</span>
                </div>
                
                ${j.chartLink ? `<a href="${j.chartLink}" target="_blank" class="text-blue-500 text-sm mt-2 inline-block"><i class="fas fa-chart-line ml-1"></i>مشاهده چارت</a>` : ''}
                ${j.tradeImage ? `<img src="${j.tradeImage}" class="mt-4 rounded-lg max-w-full" alt="Trade Screenshot">` : ''}
            </div>
        `).join('');
    }
}

// Modal Functions
function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
}

// Theme Toggle
function toggleTheme() {
    const html = document.documentElement;
    const icon = document.getElementById('theme-icon');
    const currentTheme = html.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        html.removeAttribute('data-theme');
        if (icon) icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        if (icon) icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const icon = document.getElementById('theme-icon');
    
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (icon) icon.className = 'fas fa-sun';
    }
});

console.log('✅ App.js loaded successfully');


// Initialize Quick Select Buttons
function initializeQuickButtons() {
    // Symbol buttons
    updateSymbolButtons();
    
    // Risk buttons
    updateRiskButtons();
    
    // Risk:Reward buttons
    updateRRButtons();
    
    // Timeframe buttons
    updateTimeframeButtons();
    
    // Mistake buttons
    updateMistakeButtons();
    
    // Generic quick buttons (session, tradeType, result, emotion, etc.)
    document.querySelectorAll('.quick-btn[data-field]').forEach(btn => {
        btn.addEventListener('click', function() {
            const field = this.dataset.field;
            const value = this.dataset.value;
            
            // Remove active from siblings
            this.parentElement.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
            
            // Add active to this button
            this.classList.add('active');
            
            // Set hidden input value
            const input = document.getElementById(field);
            if (input) {
                input.value = value;
            }
            
            // Update mistake label based on result
            if (field === 'result') {
                updateMistakeLabel(value);
            }
        });
    });
}

// Update Mistake Label based on result
function updateMistakeLabel(result) {
    const label = document.getElementById('mistakeLabel');
    const textarea = document.getElementById('mistake');
    
    if (!label || !textarea) return;
    
    if (result === 'TP') {
        label.innerHTML = '<i class="fas fa-lightbulb text-yellow-500 ml-2"></i>مهمترین نکته';
        textarea.placeholder = 'چه نکته‌ای باعث موفقیت این معامله شد؟';
        label.classList.remove('text-red-600');
        label.classList.add('text-yellow-600');
    } else {
        label.innerHTML = '<i class="fas fa-exclamation-triangle text-red-500 ml-2"></i>مهمترین اشتباه';
        textarea.placeholder = 'چه اشتباهی در این معامله رخ داد؟';
        label.classList.remove('text-yellow-600');
        label.classList.add('text-red-600');
    }
}

// Update Symbol Buttons
function updateSymbolButtons() {
    const container = document.getElementById('symbolButtons');
    if (!container || !profileSettings.symbols) return;
    
    container.innerHTML = profileSettings.symbols.map(symbol => `
        <button type="button" class="quick-btn" onclick="selectSymbol('${symbol}')">${symbol}</button>
    `).join('');
}

function selectSymbol(symbol) {
    document.getElementById('symbol').value = symbol;
    document.querySelectorAll('#symbolButtons .quick-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === symbol) {
            btn.classList.add('active');
        }
    });
}

// Update Risk Buttons
function updateRiskButtons() {
    const container = document.getElementById('riskButtons');
    if (!container) return;
    
    const risks = profileSettings.riskPresets || ['1', '2'];
    container.innerHTML = risks.map(risk => `
        <button type="button" class="quick-btn" onclick="selectRisk('${risk}')">${risk}%</button>
    `).join('');
}

function selectRisk(risk) {
    document.getElementById('risk').value = risk;
    document.querySelectorAll('#riskButtons .quick-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === risk + '%') {
            btn.classList.add('active');
        }
    });
}

// Update Risk:Reward Buttons
function updateRRButtons() {
    const container = document.getElementById('rrButtons');
    if (!container) return;
    
    const rrs = profileSettings.rrPresets || ['1:2', '1:3'];
    container.innerHTML = rrs.map(rr => `
        <button type="button" class="quick-btn" onclick="selectRR('${rr}')">${rr}</button>
    `).join('');
}

function selectRR(rr) {
    document.getElementById('riskReward').value = rr;
    document.querySelectorAll('#rrButtons .quick-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === rr) {
            btn.classList.add('active');
        }
    });
}

// Update Timeframe Buttons
function updateTimeframeButtons() {
    const container = document.getElementById('timeframeButtons');
    if (!container) return;
    
    const timeframes = profileSettings.timeframePresets || ['15s', '1m', '5m'];
    container.innerHTML = timeframes.map(tf => `
        <button type="button" class="quick-btn" onclick="selectTimeframe('${tf}')">${tf}</button>
    `).join('');
}

function selectTimeframe(tf) {
    document.getElementById('timeframe').value = tf;
    document.querySelectorAll('#timeframeButtons .quick-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === tf) {
            btn.classList.add('active');
        }
    });
}

// Remove old saveTimeframePreset function as it's no longer needed

// Update Stop Buttons (already exists but let's make sure it's called)
function selectStop(stop) {
    document.getElementById('stopType').value = stop;
    document.querySelectorAll('#stopButtons .quick-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent === stop) {
            btn.classList.add('active');
        }
    });
}

console.log('✅ Quick select buttons initialized');


// Profile Switcher
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        const isActive = dropdown.classList.contains('active');
        dropdown.classList.toggle('active');
        
        // Force styles with JavaScript
        if (!isActive) {
            // Opening - apply all styles
            dropdown.style.cssText = `
                position: absolute !important;
                top: calc(100% + 0.5rem) !important;
                right: 0 !important;
                min-width: 220px !important;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98)) !important;
                backdrop-filter: blur(20px) !important;
                border: 2px solid rgba(59, 130, 246, 0.2) !important;
                border-radius: 16px !important;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(59, 130, 246, 0.1) !important;
                opacity: 1 !important;
                visibility: visible !important;
                transform: translateY(0) scale(1) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                z-index: 10000 !important;
                max-height: 400px !important;
                overflow-y: auto !important;
                padding: 0.75rem !important;
                pointer-events: auto !important;
            `;
        } else {
            // Closing
            dropdown.style.cssText = `
                position: absolute !important;
                top: calc(100% + 0.5rem) !important;
                right: 0 !important;
                min-width: 220px !important;
                background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98)) !important;
                backdrop-filter: blur(20px) !important;
                border: 2px solid rgba(59, 130, 246, 0.2) !important;
                border-radius: 16px !important;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(59, 130, 246, 0.1) !important;
                opacity: 0 !important;
                visibility: hidden !important;
                transform: translateY(-10px) scale(0.95) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                z-index: 10000 !important;
                max-height: 400px !important;
                overflow-y: auto !important;
                padding: 0.75rem !important;
                pointer-events: none !important;
            `;
        }
        
        console.log('🔄 Dropdown toggled:', !isActive ? 'OPENED' : 'CLOSED');
        console.log('   - Position:', dropdown.style.position, dropdown.style.top);
    } else {
        console.error('❌ Dropdown element not found!');
    }
}

function updateProfileSwitcher() {
    console.log('updateProfileSwitcher called:', { currentProfile, profiles });
    
    // Update profile name
    const profileName = document.getElementById('currentProfileName');
    if (profileName) {
        if (currentProfile) {
            profileName.textContent = currentProfile;
        } else {
            profileName.textContent = 'انتخاب پروفایل';
        }
    }
    
    // Update dropdown list
    const dropdownList = document.getElementById('profileDropdownList');
    if (dropdownList) {
        if (profiles.length > 0) {
            dropdownList.innerHTML = profiles.map(profile => `
                <div class="profile-dropdown-item ${profile === currentProfile ? 'active' : ''}" onclick="switchProfile('${profile}')">
                    <span>${profile}</span>
                    ${profile === currentProfile ? '<i class="fas fa-check"></i>' : ''}
                </div>
            `).join('');
        } else {
            dropdownList.innerHTML = `
                <div class="profile-dropdown-item" style="cursor: default; opacity: 0.6; pointer-events: none;">
                    <span>پروفایلی وجود ندارد</span>
                </div>
                <div class="profile-dropdown-item" onclick="showProfileManager(); toggleProfileDropdown();" style="color: #3b82f6; font-weight: 600;">
                    <i class="fas fa-plus-circle" style="margin-left: 0.5rem;"></i>
                    <span>ایجاد پروفایل جدید</span>
                </div>
            `;
        }
    }
}

function switchProfile(profileName) {
    if (profileName === currentProfile) {
        toggleProfileDropdown();
        return;
    }
    
    currentProfile = profileName;
    localStorage.setItem('currentProfile', currentProfile);
    
    loadProfileData();
    updateProfileSwitcher();
    toggleProfileDropdown();
    
    // Show success message
    showNotification(`پروفایل به "${profileName}" تغییر یافت`, 'success');
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'} ml-2"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #3b82f6, #2563eb)'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Sidebar Toggle for Mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar?.classList.toggle('active');
    overlay?.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('profileDropdown');
    const switcher = document.querySelector('.profile-switcher');
    
    if (dropdown && switcher && !switcher.contains(e.target)) {
        dropdown.classList.remove('active');
    }
});

// Close sidebar when clicking on sidebar items (mobile)
document.addEventListener('DOMContentLoaded', () => {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                toggleSidebar();
            }
        });
    });
});

console.log('✅ Profile switcher and responsive sidebar initialized');
