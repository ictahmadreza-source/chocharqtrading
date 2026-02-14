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
        stops: ['فیک چاک', 'بریک استراکچر']
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
    
    // Migration: Remove "تایم استاپ" from old data
    if (profileSettings.stops && profileSettings.stops.includes('تایم استاپ')) {
        profileSettings.stops = profileSettings.stops.filter(s => s !== 'تایم استاپ');
        saveProfileSettings();
    }
    
    // Ensure stops array exists
    if (!profileSettings.stops || profileSettings.stops.length === 0) {
        profileSettings.stops = ['فیک چاک', 'بریک استراکچر'];
        saveProfileSettings();
    }
    
    const journalsData = localStorage.getItem(`journals_${dbPath}_${currentProfile}`);
    journals = journalsData ? JSON.parse(journalsData) : [];
    
    // Load custom order if exists
    loadCustomOrder();
    
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
        // Always update the journal list when switching to this section
        const tbody = document.querySelector('.journal-table tbody');
        if (!tbody) {
            // Table doesn't exist, create it
            updateJournalList();
        }
        // Note: If filters are active, they will be preserved and user can see them in the dropdowns
    } else if (section === 'dashboard') {
        document.getElementById('dashboardSection')?.classList.remove('hidden');
        // Update dashboard stats
        if (typeof showDashboard === 'function') {
            showDashboard();
        }
    } else if (section === 'settings') {
        document.getElementById('settingsSection')?.classList.remove('hidden');
        // Update settings
        const currentDbPath = document.getElementById('currentDbPath');
        const currentProfileNameSetting = document.getElementById('currentProfileName');
        if (currentDbPath) currentDbPath.value = dbPath || '';
        if (currentProfileNameSetting) currentProfileNameSetting.value = currentProfile || '';
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
        showNotification('لطفاً نماد را انتخاب کنید', 'error');
        return;
    }
    if (!riskValue) {
        showNotification('لطفاً ریسک را وارد کنید', 'error');
        return;
    }
    if (!rrValue) {
        showNotification('لطفاً نسبت ریسک به ریوارد را وارد کنید', 'error');
        return;
    }
    if (!sessionValue) {
        showNotification('لطفاً سشن معاملاتی را انتخاب کنید', 'error');
        return;
    }
    if (!tradeTypeValue) {
        showNotification('لطفاً نوع معامله را انتخاب کنید', 'error');
        return;
    }
    if (!timeframeValue) {
        showNotification('لطفاً تایم فریم را انتخاب کنید', 'error');
        return;
    }
    if (!resultValue) {
        showNotification('لطفاً نتیجه را انتخاب کنید', 'error');
        return;
    }
    if (!qualityValue) {
        showNotification('لطفاً کیفیت اجرا را انتخاب کنید', 'error');
        return;
    }
    if (!emotionValue) {
        showNotification('لطفاً احساسات غالب را انتخاب کنید', 'error');
        return;
    }
    if (!wouldRetakeValue) {
        showNotification('لطفاً گزینه "دوباره می‌گرفتم" را انتخاب کنید', 'error');
        return;
    }
    if (!followedPlanValue) {
        showNotification('لطفاً گزینه "طبق پلن بود" را انتخاب کنید', 'error');
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
    
    // Show success notification
    showNotification(editingId ? 'ژورنال با موفقیت بروزرسانی شد!' : 'ژورنال با موفقیت ثبت شد!', 'success');
    
    // Reset form
    resetForm();
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
}

// Update Journal List
function updateJournalList() {
    console.log('📝 updateJournalList called');
    
    const container = document.getElementById('journalListContainer');
    if (!container) {
        console.log('❌ Container not found');
        return;
    }
    
    // Save current filter values before rebuilding
    const currentFilters = {
        result: document.getElementById('filterResult')?.value || '',
        type: document.getElementById('filterType')?.value || '',
        stop: document.getElementById('filterStop')?.value || '',
        plan: document.getElementById('filterPlan')?.value || '',
        search: document.getElementById('searchJournal')?.value || ''
    };
    
    console.log('💾 Saved filters:', currentFilters);
    
    if (journals.length === 0) {
        container.innerHTML = '<div class="glass-card text-center"><p class="text-gray-500">هنوز ژورنالی ثبت نشده است</p></div>';
        return;
    }
    
    // Create table view
    container.innerHTML = `
        <div class="glass-card">
            <div class="mb-6">
                <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div class="text-lg font-bold text-gray-900">
                        <i class="fas fa-list-ol ml-2 text-blue-500"></i>
                        لیست ژورنال‌های معاملاتی
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        <div class="text-sm">
                            تعداد: <span class="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-500 text-white font-bold" id="journalCount">${journals.length}</span>
                        </div>
                        <button id="sortIndicator" onclick="window.resetSort()" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #e2e8f0; color: #64748b; border: none; border-radius: 0.5rem; font-size: 1.125rem; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" title="مرتب‌سازی غیرفعال - کلیک برای رفرش">
                            <i class="fas fa-sort-amount-down"></i>
                        </button>
                        <button id="dragToggleBtn" onclick="window.toggleDragMode()" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #e2e8f0; color: #64748b; border: none; border-radius: 0.5rem; font-size: 1.125rem; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.1);" title="فعال کردن حالت جابجایی دستی">
                            <i class="fas fa-grip-vertical"></i>
                        </button>
                        <input type="text" id="searchJournal" onkeyup="window.searchJournals()" placeholder="جستجو..." style="padding: 0.5rem 1rem; border: 2px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; width: 200px;">
                    </div>
                </div>
                
                <!-- Filters and Actions -->
                <div class="flex flex-wrap gap-3 mb-4 items-center">
                    <select id="filterResult" onchange="window.filterJournals()" style="padding: 0.5rem 1rem; border: 2px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600;">
                        <option value="">نتیجه: همه</option>
                        <option value="TP">TP</option>
                        <option value="SL">SL</option>
                        <option value="BE">BE</option>
                    </select>
                    
                    <select id="filterType" onchange="window.filterJournals()" style="padding: 0.5rem 1rem; border: 2px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600;">
                        <option value="">نوع: همه</option>
                        <option value="خرید">خرید</option>
                        <option value="فروش">فروش</option>
                    </select>
                    
                    <select id="filterStop" onchange="window.filterJournals()" style="padding: 0.5rem 1rem; border: 2px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600;">
                        <option value="">ستاپ: همه</option>
                        ${[...new Set(journals.map(j => j.stopType).filter(s => s))].map(stop => `<option value="${stop}">${stop}</option>`).join('')}
                    </select>
                    
                    <select id="filterPlan" onchange="window.filterJournals()" style="padding: 0.5rem 1rem; border: 2px solid #e2e8f0; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600;">
                        <option value="">طبق پلن: همه</option>
                        <option value="بله">بله</option>
                        <option value="خیر">خیر</option>
                    </select>
                    
                    <button onclick="window.resetFilters()" id="resetFiltersBtn" style="padding: 0.5rem 1rem; background: linear-gradient(135deg, #64748b, #475569); color: white; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; display: none;" title="پاک کردن فیلترها">
                        <i class="fas fa-redo ml-2"></i>
                        پاک کردن فیلترها
                    </button>
                    
                    <button onclick="deleteSelectedJournals()" id="deleteSelectedBtn" style="padding: 0.5rem 1rem; background: linear-gradient(135deg, #ef4444, #dc2626); color: white; border: none; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 700; cursor: pointer; display: none;" title="حذف انتخاب شده‌ها">
                        <i class="fas fa-trash ml-2"></i>
                        حذف انتخاب شده‌ها
                    </button>
                </div>
            </div>
            
            <div class="table-container" id="journalTableContainer" style="border: 3px solid #e2e8f0; border-radius: 20px; overflow-x: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
                <table class="journal-table" style="border-collapse: separate; border-spacing: 0; width: 100%; min-width: 1000px;">
                    <thead style="background: linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #fce7f3 100%); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                        <tr>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center;">
                                <input type="checkbox" id="selectAll" onchange="toggleSelectAll(this)" style="cursor: pointer; width: 1rem; height: 1rem;">
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('index')">
                                <i class="fas fa-hashtag" style="color: #3b82f6; font-size: 0.625rem;"></i>
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('symbol')">
                                <i class="fas fa-coins" style="color: #f59e0b; margin-left: 0.25rem;"></i>
                                نماد
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('type')">
                                <i class="fas fa-exchange-alt" style="color: #8b5cf6; margin-left: 0.25rem;"></i>
                                نوع
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('result')">
                                <i class="fas fa-flag-checkered" style="color: #10b981; margin-left: 0.25rem;"></i>
                                نتیجه
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('risk')">
                                <i class="fas fa-percentage" style="color: #ef4444; margin-left: 0.25rem;"></i>
                                ریسک
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center;">
                                <i class="fas fa-balance-scale" style="color: #06b6d4; margin-left: 0.25rem;"></i>
                                R:R
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('timeframe')">
                                <i class="fas fa-clock" style="color: #8b5cf6; margin-left: 0.25rem;"></i>
                                تایم
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('session')">
                                <i class="fas fa-globe" style="color: #3b82f6; margin-left: 0.25rem;"></i>
                                سشن
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('stop')">
                                <i class="fas fa-crosshairs" style="color: #f59e0b; margin-left: 0.25rem;"></i>
                                ستاپ
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('quality')">
                                <i class="fas fa-star" style="color: #fbbf24; margin-left: 0.25rem;"></i>
                                کیفیت
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('emotion')">
                                <i class="fas fa-smile" style="color: #ec4899; margin-left: 0.25rem;"></i>
                                احساس
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center;">
                                <i class="fas fa-chart-line" style="color: #3b82f6;"></i>
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center;">
                                <i class="fas fa-image" style="color: #8b5cf6;"></i>
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center; cursor: pointer;" onclick="sortJournals('date')">
                                <i class="fas fa-calendar" style="color: #10b981; margin-left: 0.25rem;"></i>
                                تاریخ
                            </th>
                            <th style="padding: 0.75rem 0.5rem; border-right: 2px solid #e2e8f0; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center;">
                                <i class="fas fa-clock" style="color: #06b6d4; margin-left: 0.25rem;"></i>
                                ساعت
                            </th>
                            <th style="padding: 0.75rem 0.5rem; color: #475569; font-weight: 800; font-size: 0.75rem; text-align: center;">
                                <i class="fas fa-cog" style="color: #64748b;"></i>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        ${generateTableRows(sortColumn && sortedJournals.length > 0 ? sortedJournals : [...journals].reverse())}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    console.log('✅ Table HTML created');
    
    // Update sort indicator if sorting is active
    updateSortIndicator();
    
    // Re-enable drag mode if it was active
    if (dragModeEnabled) {
        setTimeout(enableDragAndDrop, 100);
    }
}

// View Journal Details (Modal)
function viewJournalDetails(id) {
    const journal = journals.find(j => j.id === id);
    if (!journal) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'journalDetailModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-2xl font-bold text-gray-900">
                    <i class="fas fa-file-alt ml-2 text-blue-500"></i>
                    جزئیات ژورنال
                </h3>
                <button onclick="closeJournalDetail()" class="text-gray-500 hover:text-gray-700">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <!-- Basic Info -->
                <div class="detail-section">
                    <h4 class="detail-section-title">اطلاعات پایه</h4>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div class="detail-item">
                            <span class="detail-label">نماد:</span>
                            <span class="detail-value">${journal.symbol}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">نوع:</span>
                            <span class="tag ${journal.tradeType === 'خرید' ? 'tag-buy' : 'tag-sell'}">${journal.tradeType}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">نتیجه:</span>
                            <span class="tag tag-${journal.result.toLowerCase()}">${journal.result}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">ریسک:</span>
                            <span class="detail-value">${journal.risk}%</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">R:R:</span>
                            <span class="detail-value">${journal.riskReward}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">تایم فریم:</span>
                            <span class="detail-value">${journal.timeframe}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">سشن:</span>
                            <span class="detail-value">${journal.session}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">ستاپ:</span>
                            <span class="detail-value">${journal.stopType || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">کیفیت:</span>
                            <span class="quality-badge">${journal.quality}/5</span>
                        </div>
                    </div>
                </div>
                
                <!-- Psychology -->
                <div class="detail-section">
                    <h4 class="detail-section-title">تحلیل روانشناسی</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="detail-item">
                            <span class="detail-label">احساسات:</span>
                            <span class="detail-value">${journal.emotion}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">دوباره می‌گرفتم:</span>
                            <span class="detail-value">${journal.wouldRetake}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">طبق پلن:</span>
                            <span class="detail-value">${journal.followedPlan}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Mistake -->
                ${journal.mistake ? `
                <div class="detail-section">
                    <h4 class="detail-section-title text-red-600">
                        <i class="fas fa-exclamation-triangle ml-2"></i>
                        مهمترین اشتباه
                    </h4>
                    <p class="text-gray-700">${journal.mistake}</p>
                </div>
                ` : ''}
                
                <!-- Comment -->
                ${journal.comment ? `
                <div class="detail-section">
                    <h4 class="detail-section-title">کامنت و توضیحات</h4>
                    <p class="text-gray-700">${journal.comment}</p>
                </div>
                ` : ''}
                
                <!-- Chart Link -->
                ${journal.chartLink ? `
                <div class="detail-section">
                    <a href="${journal.chartLink}" target="_blank" class="btn-secondary inline-flex items-center">
                        <i class="fas fa-chart-line ml-2"></i>
                        مشاهده چارت
                    </a>
                </div>
                ` : ''}
                
                <!-- Trade Image -->
                ${journal.tradeImage ? `
                <div class="detail-section">
                    <h4 class="detail-section-title">تصویر معامله</h4>
                    <button onclick="viewFullImage('${journal.tradeImage}')" class="btn-secondary">
                        <i class="fas fa-image ml-2"></i>
                        مشاهده تصویر
                    </button>
                </div>
                ` : ''}
                
                <!-- Date & Time -->
                <div class="detail-section">
                    <div class="grid grid-cols-2 gap-4">
                        <div class="detail-item">
                            <span class="detail-label">تاریخ:</span>
                            <span class="detail-value">${journal.tradeDate || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">ساعت:</span>
                            <span class="detail-value">${journal.tradeTime || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="flex gap-4 mt-6">
                <button onclick="editJournal(${journal.id}); closeJournalDetail();" class="btn-primary flex-1">
                    <i class="fas fa-edit ml-2"></i>
                    ویرایش
                </button>
                <button onclick="closeJournalDetail()" class="btn-secondary flex-1">
                    بستن
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeJournalDetail() {
    const modal = document.getElementById('journalDetailModal');
    if (modal) {
        modal.remove();
    }
}

// View Full Image
function viewFullImage(imageSrc) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'imageViewModal';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    modal.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; padding: 2rem;">
            <button onclick="closeImageView()" style="position: absolute; top: 1rem; right: 1rem; background: white; color: black; border: none; border-radius: 50%; width: 40px; height: 40px; cursor: pointer; font-size: 20px; z-index: 10;">
                <i class="fas fa-times"></i>
            </button>
            <img src="${imageSrc}" style="max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.5);" alt="Trade Image">
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on click outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeImageView();
        }
    });
}

function closeImageView() {
    const modal = document.getElementById('imageViewModal');
    if (modal) {
        modal.remove();
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

// Drag & Drop Functions
window.toggleDragMode = function toggleDragMode() {
    dragModeEnabled = !dragModeEnabled;
    const btn = document.getElementById('dragToggleBtn');
    
    if (dragModeEnabled) {
        // Enable drag mode
        btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        btn.style.color = 'white';
        btn.style.boxShadow = '0 4px 6px rgba(16, 185, 129, 0.4)';
        btn.title = 'غیرفعال کردن حالت جابجایی دستی';
        enableDragAndDrop();
    } else {
        // Disable drag mode
        btn.style.background = '#e2e8f0';
        btn.style.color = '#64748b';
        btn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        btn.title = 'فعال کردن حالت جابجایی دستی';
        disableDragAndDrop();
    }
}

function enableDragAndDrop() {
    const tbody = document.querySelector('.journal-table tbody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        row.draggable = true;
        row.style.cursor = 'move';
        
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('drop', handleDrop);
        row.addEventListener('dragend', handleDragEnd);
    });
}

function disableDragAndDrop() {
    const tbody = document.querySelector('.journal-table tbody');
    if (!tbody) return;
    
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        row.draggable = false;
        row.style.cursor = 'pointer';
        
        row.removeEventListener('dragstart', handleDragStart);
        row.removeEventListener('dragover', handleDragOver);
        row.removeEventListener('drop', handleDrop);
        row.removeEventListener('dragend', handleDragEnd);
    });
}

function handleDragStart(e) {
    draggedElement = this;
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    
    // Visual feedback
    if (this !== draggedElement) {
        this.style.borderTop = '3px solid #3b82f6';
    }
    
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        // Get the tbody
        const tbody = this.parentNode;
        
        // Insert dragged element before this element
        tbody.insertBefore(draggedElement, this);
        
        // Show custom confirmation modal
        setTimeout(() => {
            showConfirmModal(
                'ذخیره ترتیب جدید',
                'آیا می‌خواهید این ترتیب جدید را ذخیره کنید؟',
                'این تغییر دائمی خواهد بود و با رفرش صفحه نیز حفظ می‌شود.',
                () => {
                    // Confirmed
                    saveCustomOrder();
                    showSuccessModal('ترتیب جدید با موفقیت ذخیره شد!');
                },
                () => {
                    // Cancelled
                    updateJournalList();
                    if (dragModeEnabled) {
                        setTimeout(enableDragAndDrop, 100);
                    }
                }
            );
        }, 100);
    }
    
    return false;
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    
    // Remove all border highlights
    const rows = document.querySelectorAll('.journal-table tbody tr');
    rows.forEach(row => {
        row.style.borderTop = '';
    });
}

function saveCustomOrder() {
    const tbody = document.querySelector('.journal-table tbody');
    if (!tbody) {
        console.error('❌ tbody not found');
        return;
    }
    
    const rows = tbody.querySelectorAll('tr');
    console.log('📋 Total rows:', rows.length);
    console.log('📋 Current journals array length:', journals.length);
    
    // Get IDs from rows and convert to numbers
    customOrder = Array.from(rows).map(row => {
        const id = row.getAttribute('data-journal-id');
        // Convert string ID to number to match journal.id format
        return id ? (isNaN(id) ? id : Number(id)) : null;
    }).filter(id => id !== null);
    
    console.log('📋 Custom order IDs:', customOrder);
    console.log('📋 Filtered custom order length:', customOrder.length);
    
    if (customOrder.length === 0) {
        console.error('❌ No journal IDs found in rows!');
        showErrorModal('خطا: شناسه ژورنال‌ها یافت نشد. لطفاً صفحه را رفرش کنید.');
        return;
    }
    
    if (customOrder.length !== journals.length) {
        console.warn('⚠️ Mismatch: rows=' + customOrder.length + ', journals=' + journals.length);
    }
    
    // Debug: Check journal IDs
    console.log('📋 Sample journal IDs from array:', journals.slice(0, 3).map(j => ({id: j.id, type: typeof j.id})));
    console.log('📋 Sample custom order IDs:', customOrder.slice(0, 3).map(id => ({id: id, type: typeof id})));
    
    // Update journals array to match new order
    const orderedJournals = [];
    const notFoundIds = [];
    
    customOrder.forEach(id => {
        const journal = journals.find(j => j.id === id);
        if (journal) {
            orderedJournals.push(journal);
        } else {
            notFoundIds.push(id);
            console.error('❌ Journal not found for ID:', id, 'Type:', typeof id);
        }
    });
    
    console.log('📊 Original journals count:', journals.length);
    console.log('📊 Ordered journals count:', orderedJournals.length);
    console.log('📊 Not found IDs:', notFoundIds);
    
    if (orderedJournals.length === 0) {
        console.error('❌ No journals matched! Aborting save.');
        showErrorModal('خطا: هیچ ژورنالی یافت نشد. تغییرات ذخیره نمی‌شود.');
        return;
    }
    
    if (orderedJournals.length < journals.length) {
        console.error('❌ Some journals were lost! Aborting save.');
        showErrorModal(`خطا: ${journals.length - orderedJournals.length} ژورنال گم شده است. تغییرات ذخیره نمی‌شود.`);
        return;
    }
    
    // Save to localStorage FIRST (backup)
    const currentProfile = localStorage.getItem('currentProfile') || 'default';
    const backupKey = `journals_${dbPath}_${currentProfile}_backup`;
    localStorage.setItem(backupKey, JSON.stringify(journals));
    console.log('✅ Backup created');
    
    // Replace journals array
    journals.length = 0;
    journals.push(...orderedJournals);
    
    console.log('✅ Journals array updated, new count:', journals.length);
    
    // Save custom order
    localStorage.setItem(`customOrder_${currentProfile}`, JSON.stringify(customOrder));
    
    // Save journals to localStorage with new order
    localStorage.setItem(`journals_${dbPath}_${currentProfile}`, JSON.stringify(journals));
    
    console.log('✅ Saved to localStorage');
    
    // Save to file system if supported
    if (typeof saveJournalsToFile === 'function') {
        saveJournalsToFile(currentProfile, journals).then(success => {
            if (success) {
                console.log('✅ Custom order saved to file system');
            }
        });
    }
}

function showErrorModal(message) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
            border-radius: 24px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            border: 3px solid #ef4444;
            text-align: center;
        ">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
                box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
            ">
                <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: white;"></i>
            </div>
            <h3 style="
                font-size: 1.5rem;
                font-weight: 800;
                color: #1e293b;
                margin-bottom: 0.5rem;
            ">خطا!</h3>
            <p style="
                font-size: 1.125rem;
                color: #dc2626;
                font-weight: 600;
                margin-bottom: 1.5rem;
            ">${message}</p>
            <button onclick="this.closest('div').parentElement.remove()" style="
                padding: 0.875rem 2rem;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 700;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
            ">
                متوجه شدم
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function loadCustomOrder() {
    const currentProfile = localStorage.getItem('currentProfile') || 'default';
    const savedOrder = localStorage.getItem(`customOrder_${currentProfile}`);
    
    if (savedOrder) {
        try {
            customOrder = JSON.parse(savedOrder);
            console.log('✅ Custom order loaded:', customOrder.length, 'items');
        } catch (e) {
            console.error('Error loading custom order:', e);
            customOrder = [];
        }
    }
}

// Restore from backup if needed
window.restoreFromBackup = function() {
    const currentProfile = localStorage.getItem('currentProfile') || 'default';
    const backupKey = `journals_${dbPath}_${currentProfile}_backup`;
    const backup = localStorage.getItem(backupKey);
    
    if (backup) {
        if (confirm('آیا می‌خواهید از نسخه پشتیبان بازیابی کنید؟')) {
            localStorage.setItem(`journals_${dbPath}_${currentProfile}`, backup);
            location.reload();
        }
    } else {
        alert('نسخه پشتیبانی یافت نشد.');
    }
}

// Custom Modal Functions
function showConfirmModal(title, message, description, onConfirm, onCancel) {
    // Remove existing modal if any
    const existingModal = document.getElementById('customConfirmModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'customConfirmModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            border-radius: 24px;
            padding: 2rem;
            max-width: 480px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
            border: 3px solid #e2e8f0;
        ">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #fbbf24, #f59e0b);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                    box-shadow: 0 8px 20px rgba(251, 191, 36, 0.4);
                ">
                    <i class="fas fa-question" style="font-size: 2.5rem; color: white;"></i>
                </div>
                <h3 style="
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin-bottom: 0.5rem;
                ">${title}</h3>
                <p style="
                    font-size: 1.125rem;
                    color: #475569;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                ">${message}</p>
                <p style="
                    font-size: 0.875rem;
                    color: #64748b;
                    line-height: 1.6;
                ">${description}</p>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="confirmBtn" style="
                    flex: 1;
                    padding: 0.875rem 1.5rem;
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                ">
                    <i class="fas fa-check ml-2"></i>
                    بله، ذخیره شود
                </button>
                <button id="cancelBtn" style="
                    flex: 1;
                    padding: 0.875rem 1.5rem;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                ">
                    <i class="fas fa-times ml-2"></i>
                    خیر، لغو شود
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add hover effects
    const confirmBtn = modal.querySelector('#confirmBtn');
    const cancelBtn = modal.querySelector('#cancelBtn');
    
    confirmBtn.addEventListener('mouseover', () => {
        confirmBtn.style.transform = 'translateY(-2px)';
        confirmBtn.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
    });
    confirmBtn.addEventListener('mouseout', () => {
        confirmBtn.style.transform = 'translateY(0)';
        confirmBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
    });
    
    cancelBtn.addEventListener('mouseover', () => {
        cancelBtn.style.transform = 'translateY(-2px)';
        cancelBtn.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.4)';
    });
    cancelBtn.addEventListener('mouseout', () => {
        cancelBtn.style.transform = 'translateY(0)';
        cancelBtn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
    });
    
    confirmBtn.addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.remove();
        if (onCancel) onCancel();
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    });
}

function showSuccessModal(message) {
    // Remove existing modal if any
    const existingModal = document.getElementById('customSuccessModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'customSuccessModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
            border-radius: 24px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
            border: 3px solid #10b981;
            text-align: center;
        ">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #10b981, #059669);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1.5rem;
                box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
                animation: scaleIn 0.5s ease;
            ">
                <i class="fas fa-check" style="font-size: 2.5rem; color: white;"></i>
            </div>
            <h3 style="
                font-size: 1.5rem;
                font-weight: 800;
                color: #1e293b;
                margin-bottom: 0.5rem;
            ">موفقیت آمیز!</h3>
            <p style="
                font-size: 1.125rem;
                color: #059669;
                font-weight: 600;
                margin-bottom: 1.5rem;
            ">${message}</p>
            <button onclick="this.closest('#customSuccessModal').remove()" style="
                padding: 0.875rem 2rem;
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                border: none;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            ">
                <i class="fas fa-thumbs-up ml-2"></i>
                عالی!
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Auto close after 3 seconds
    setTimeout(() => {
        if (modal.parentNode) {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        }
    }, 3000);
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Add animations to document
if (!document.getElementById('customModalStyles')) {
    const style = document.createElement('style');
    style.id = 'customModalStyles';
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
        @keyframes slideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes scaleIn {
            0% { transform: scale(0); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(style);
}


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


// Filter and Sort Functions
let filteredJournals = [];
let sortedJournals = []; // Array to hold sorted data
let sortColumn = null;
let sortDirection = 'asc';
let dragModeEnabled = false;
let draggedElement = null;
let customOrder = []; // Store custom order of journal IDs

// Make sure filterJournals is in global scope
window.filterJournals = function filterJournals() {
    console.log('🔍 filterJournals called!');
    const resultFilter = document.getElementById('filterResult')?.value || '';
    const typeFilter = document.getElementById('filterType')?.value || '';
    const stopFilter = document.getElementById('filterStop')?.value || '';
    const planFilter = document.getElementById('filterPlan')?.value || '';
    const searchText = document.getElementById('searchJournal')?.value.toLowerCase() || '';
    
    console.log('🔍 Filter called with:', { resultFilter, typeFilter, stopFilter, planFilter, searchText });
    console.log('📊 Total journals:', journals.length);
    
    filteredJournals = journals.filter(j => {
        if (resultFilter && j.result !== resultFilter) return false;
        if (typeFilter && j.tradeType !== typeFilter) return false;
        if (stopFilter && j.stopType !== stopFilter) return false;
        if (planFilter && j.followedPlan !== planFilter) return false;
        if (searchText && !j.symbol.toLowerCase().includes(searchText) && 
            !(j.comment || '').toLowerCase().includes(searchText) &&
            !(j.mistake || '').toLowerCase().includes(searchText)) return false;
        return true;
    });
    
    console.log('✅ Filtered journals:', filteredJournals.length);
    
    // Show/hide reset button
    const hasActiveFilters = resultFilter || typeFilter || stopFilter || planFilter || searchText;
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
        resetBtn.style.display = hasActiveFilters ? 'block' : 'none';
    }
    
    console.log('🎨 Calling renderFilteredJournals...');
    renderFilteredJournals();
}

window.searchJournals = function searchJournals() {
    filterJournals();
}

window.resetFilters = function resetFilters() {
    // Clear all filter dropdowns
    const resultFilter = document.getElementById('filterResult');
    const typeFilter = document.getElementById('filterType');
    const stopFilter = document.getElementById('filterStop');
    const planFilter = document.getElementById('filterPlan');
    const searchBox = document.getElementById('searchJournal');
    
    if (resultFilter) resultFilter.value = '';
    if (typeFilter) typeFilter.value = '';
    if (stopFilter) stopFilter.value = '';
    if (planFilter) planFilter.value = '';
    if (searchBox) searchBox.value = '';
    
    // Clear filtered journals
    filteredJournals = [];
    
    // Hide reset button
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
        resetBtn.style.display = 'none';
    }
    
    // Re-render full list
    updateJournalList();
}

// Update sort indicator button color based on sort state
function updateSortIndicator() {
    const sortIndicator = document.getElementById('sortIndicator');
    if (!sortIndicator) return;
    
    if (sortColumn) {
        // Sort is active - change to yellow/orange
        sortIndicator.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
        sortIndicator.style.color = 'white';
        sortIndicator.style.boxShadow = '0 4px 6px rgba(251, 191, 36, 0.4)';
        
        const columnNames = {
            'index': 'شماره',
            'symbol': 'نماد',
            'type': 'نوع',
            'result': 'نتیجه',
            'risk': 'ریسک',
            'timeframe': 'تایم',
            'session': 'سشن',
            'stop': 'ستاپ',
            'quality': 'کیفیت',
            'emotion': 'احساس',
            'date': 'تاریخ'
        };
        sortIndicator.title = `مرتب شده بر اساس ${columnNames[sortColumn]} (${sortDirection === 'asc' ? 'صعودی' : 'نزولی'}) - کلیک برای بازگشت`;
    } else {
        // Sort is not active - default gray
        sortIndicator.style.background = '#e2e8f0';
        sortIndicator.style.color = '#64748b';
        sortIndicator.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        sortIndicator.title = 'مرتب‌سازی غیرفعال - کلیک برای رفرش';
    }
}

function sortJournals(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    // Create a copy of the data to sort (don't modify original arrays)
    const dataToSort = filteredJournals.length > 0 ? [...filteredJournals] : [...journals];
    
    sortedJournals = dataToSort.sort((a, b) => {
        let aVal, bVal;
        
        switch(column) {
            case 'index':
                aVal = journals.indexOf(a);
                bVal = journals.indexOf(b);
                break;
            case 'symbol':
                aVal = a.symbol;
                bVal = b.symbol;
                break;
            case 'type':
                aVal = a.tradeType;
                bVal = b.tradeType;
                break;
            case 'result':
                aVal = a.result;
                bVal = b.result;
                break;
            case 'risk':
                aVal = parseFloat(a.risk);
                bVal = parseFloat(b.risk);
                break;
            case 'timeframe':
                aVal = a.timeframe;
                bVal = b.timeframe;
                break;
            case 'session':
                aVal = a.session;
                bVal = b.session;
                break;
            case 'stop':
                aVal = a.stopType || '';
                bVal = b.stopType || '';
                break;
            case 'quality':
                aVal = parseInt(a.quality);
                bVal = parseInt(b.quality);
                break;
            case 'emotion':
                aVal = a.emotion;
                bVal = b.emotion;
                break;
            case 'date':
                aVal = a.tradeDate || '';
                bVal = b.tradeDate || '';
                break;
            default:
                return 0;
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    // Render with sorted data
    renderSortedJournals();
}

window.resetSort = function resetSort() {
    sortColumn = null;
    sortDirection = 'asc';
    sortedJournals = []; // Clear sorted data
    
    // Re-render with original order
    if (filteredJournals.length > 0) {
        renderFilteredJournals();
    } else {
        updateJournalList();
    }
}

// Render sorted journals
function renderSortedJournals() {
    const tbody = document.querySelector('.journal-table tbody');
    const journalCount = document.getElementById('journalCount');
    
    if (!tbody) {
        updateJournalList();
        return;
    }
    
    // Update count
    if (journalCount) {
        journalCount.textContent = sortedJournals.length;
    }
    
    // Render sorted data (no reverse needed, already sorted)
    tbody.innerHTML = generateTableRows(sortedJournals);
    
    // Update sort indicator
    updateSortIndicator();
    
    // Re-enable drag mode if it was active
    if (dragModeEnabled) {
        setTimeout(enableDragAndDrop, 100);
    }
}

function renderFilteredJournals() {
    console.log('🎨 renderFilteredJournals called, filteredJournals.length:', filteredJournals.length);
    
    const tbody = document.querySelector('.journal-table tbody');
    const journalCount = document.getElementById('journalCount');
    
    console.log('📋 tbody exists:', !!tbody);
    
    // Update count
    if (journalCount) {
        journalCount.textContent = filteredJournals.length;
        console.log('✅ Updated count to:', filteredJournals.length);
    }
    
    // If table doesn't exist, create it first
    if (!tbody) {
        console.log('⚠️ Table does not exist, creating it...');
        // Create the table structure (without filters)
        updateJournalList();
        // Now update with filtered data
        const newTbody = document.querySelector('.journal-table tbody');
        const newJournalCount = document.getElementById('journalCount');
        if (newTbody) {
            console.log('✅ Updating new tbody with filtered data');
            newTbody.innerHTML = generateTableRows(sortColumn && sortedJournals.length > 0 ? sortedJournals : [...filteredJournals].reverse());
        }
        if (newJournalCount) {
            newJournalCount.textContent = filteredJournals.length;
        }
        return;
    }
    
    // Render only table rows (reverse to show newest first if not sorted)
    console.log('✅ Updating existing tbody');
    tbody.innerHTML = generateTableRows(sortColumn && sortedJournals.length > 0 ? sortedJournals : [...filteredJournals].reverse());
    console.log('✅ Done rendering filtered journals');
    
    // Update sort indicator
    updateSortIndicator();
    
    // Re-enable drag mode if it was active
    if (dragModeEnabled) {
        setTimeout(enableDragAndDrop, 100);
    }
}

function generateTableRows(journalList) {
    return journalList.map((j, index) => {
        // Calculate the actual journal number (newest = highest number)
        const journalNumber = journals.length - journals.indexOf(j);
        
        return `
        <tr data-journal-id="${j.id}" style="background: ${index % 2 === 0 ? 'white' : '#fafbff'}; transition: all 0.3s; cursor: pointer;" onmouseover="this.style.background='#f0f9ff'; this.style.transform='translateX(4px)'; this.style.boxShadow='0 2px 8px rgba(59,130,246,0.1)';" onmouseout="this.style.background='${index % 2 === 0 ? 'white' : '#fafbff'}'; this.style.transform='translateX(0)'; this.style.boxShadow='none';">
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; text-align: center;">
                <input type="checkbox" class="journal-checkbox" data-id="${j.id}" onchange="updateDeleteButton()" style="cursor: pointer; width: 1rem; height: 1rem;">
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-weight: 700; font-size: 0.875rem; color: #3b82f6; text-align: center;">
                ${journalNumber}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-weight: 800; font-size: 0.9375rem; color: #1e293b; text-align: center;">
                ${j.symbol}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; text-align: center;">
                <span style="padding: 0.375rem 0.625rem; border-radius: 0.5rem; font-weight: 700; font-size: 0.75rem; display: inline-flex; align-items: center; ${j.tradeType === 'خرید' ? 'background: linear-gradient(135deg, #10b981, #059669); color: white;' : 'background: linear-gradient(135deg, #ef4444, #dc2626); color: white;'}">
                    <i class="fas fa-arrow-${j.tradeType === 'خرید' ? 'up' : 'down'}" style="font-size: 0.625rem;"></i>
                </span>
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; text-align: center;">
                <span style="padding: 0.375rem 0.625rem; border-radius: 0.5rem; font-weight: 700; font-size: 0.75rem; display: inline-flex; ${j.result === 'TP' ? 'background: linear-gradient(135deg, #10b981, #059669); color: white;' : j.result === 'SL' ? 'background: linear-gradient(135deg, #ef4444, #dc2626); color: white;' : 'background: linear-gradient(135deg, #f59e0b, #d97706); color: white;'}">
                    ${j.result}
                </span>
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; text-align: center; font-size: 0.8125rem;">
                ${j.risk}%
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; text-align: center; font-size: 0.8125rem;">
                ${j.riskReward}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; text-align: center; font-size: 0.8125rem;">
                ${j.timeframe}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; text-align: center; font-size: 0.8125rem;">
                ${j.session}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; text-align: center; font-size: 0.75rem;">
                ${j.stopType || '-'}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; text-align: center;">
                <span style="padding: 0.375rem 0.625rem; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; border-radius: 0.5rem; font-weight: 700; font-size: 0.75rem; display: inline-flex;">
                    ${j.quality}/5
                </span>
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #64748b; text-align: center; font-size: 0.75rem;">
                ${j.emotion}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; text-align: center;">
                ${j.chartLink ? `
                    <a href="${j.chartLink}" target="_blank" style="padding: 0.5rem; background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px solid #93c5fd; border-radius: 0.5rem; color: #3b82f6; display: inline-flex; text-decoration: none; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 12px rgba(59,130,246,0.3)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';" title="مشاهده چارت">
                        <i class="fas fa-chart-line" style="font-size: 0.875rem;"></i>
                    </a>
                ` : '<span style="color: #cbd5e1; font-size: 0.75rem;">-</span>'}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; text-align: center;">
                ${j.tradeImage ? `
                    <button onclick="viewFullImage('${j.tradeImage}')" style="padding: 0.5rem; background: linear-gradient(135deg, #f3e8ff, #e9d5ff); border: 2px solid #c084fc; border-radius: 0.5rem; color: #8b5cf6; cursor: pointer; display: inline-flex; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 12px rgba(139,92,246,0.3)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none';" title="مشاهده عکس">
                        <i class="fas fa-image" style="font-size: 0.875rem;"></i>
                    </button>
                ` : '<span style="color: #cbd5e1; font-size: 0.75rem;">-</span>'}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; text-align: center; font-size: 0.75rem;">
                ${j.tradeDate || '-'}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-right: 2px solid #f1f5f9; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; text-align: center; font-size: 0.75rem;">
                ${j.tradeTime || '-'}
            </td>
            <td style="padding: 0.5rem 0.375rem; border-bottom: 1px solid #f1f5f9; text-align: center;">
                <div style="display: flex; gap: 0.25rem; justify-content: center; flex-wrap: nowrap;">
                    <button onclick="viewJournalDetails(${j.id})" style="padding: 0.5rem; background: white; border: 2px solid #e2e8f0; border-radius: 0.5rem; color: #3b82f6; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.1)'; this.style.borderColor='#3b82f6'; this.style.boxShadow='0 2px 8px rgba(59,130,246,0.2)';" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';" title="مشاهده">
                        <i class="fas fa-eye" style="font-size: 0.875rem;"></i>
                    </button>
                    <button onclick="editJournal(${j.id})" style="padding: 0.5rem; background: white; border: 2px solid #e2e8f0; border-radius: 0.5rem; color: #16a34a; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.1)'; this.style.borderColor='#16a34a'; this.style.boxShadow='0 2px 8px rgba(22,163,74,0.2)';" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';" title="ویرایش">
                        <i class="fas fa-edit" style="font-size: 0.875rem;"></i>
                    </button>
                    <button onclick="deleteJournal(${j.id})" style="padding: 0.5rem; background: white; border: 2px solid #e2e8f0; border-radius: 0.5rem; color: #dc2626; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.transform='scale(1.1)'; this.style.borderColor='#dc2626'; this.style.boxShadow='0 2px 8px rgba(220,38,38,0.2)';" onmouseout="this.style.transform='scale(1)'; this.style.borderColor='#e2e8f0'; this.style.boxShadow='none';" title="حذف">
                        <i class="fas fa-trash" style="font-size: 0.875rem;"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.journal-checkbox');
    checkboxes.forEach(cb => cb.checked = checkbox.checked);
    updateDeleteButton();
}

function updateDeleteButton() {
    const checkboxes = document.querySelectorAll('.journal-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    if (deleteBtn) {
        deleteBtn.style.display = checkboxes.length > 0 ? 'block' : 'none';
        deleteBtn.textContent = `حذف ${checkboxes.length} مورد انتخابی`;
    }
}

function deleteSelectedJournals() {
    const checkboxes = document.querySelectorAll('.journal-checkbox:checked');
    const ids = Array.from(checkboxes).map(cb => parseInt(cb.dataset.id));
    
    if (ids.length === 0) return;
    
    // Show custom delete confirmation modal
    showDeleteConfirmModal(
        ids.length,
        () => {
            // Confirmed - delete journals
            journals = journals.filter(j => !ids.includes(j.id));
            localStorage.setItem(`journals_${dbPath}_${currentProfile}`, JSON.stringify(journals));
            
            // Save to file system if supported
            if (typeof saveJournalsToFile === 'function') {
                saveJournalsToFile(currentProfile, journals);
            }
            
            showSuccessModal(`${ids.length} ژورنال با موفقیت حذف شد!`);
            updateJournalList();
        }
    );
}

// Custom Delete Confirmation Modal
function showDeleteConfirmModal(count, onConfirm) {
    // Remove existing modal if any
    const existingModal = document.getElementById('customDeleteModal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'customDeleteModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #ffffff 0%, #fef2f2 100%);
            border-radius: 24px;
            padding: 2rem;
            max-width: 480px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
            border: 3px solid #ef4444;
        ">
            <div style="text-align: center; margin-bottom: 1.5rem;">
                <div style="
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                    box-shadow: 0 8px 20px rgba(239, 68, 68, 0.4);
                    animation: shake 0.5s ease;
                ">
                    <i class="fas fa-trash-alt" style="font-size: 2.5rem; color: white;"></i>
                </div>
                <h3 style="
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #1e293b;
                    margin-bottom: 0.5rem;
                ">حذف ژورنال‌ها</h3>
                <p style="
                    font-size: 1.25rem;
                    color: #dc2626;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                ">آیا مطمئن هستید؟</p>
                <p style="
                    font-size: 1rem;
                    color: #475569;
                    line-height: 1.6;
                    background: rgba(239, 68, 68, 0.1);
                    padding: 0.75rem;
                    border-radius: 12px;
                    margin-top: 1rem;
                ">
                    <i class="fas fa-exclamation-circle" style="color: #ef4444; margin-left: 0.5rem;"></i>
                    <strong>${count} ژورنال</strong> به طور دائمی حذف خواهند شد و قابل بازگشت نیستند!
                </p>
            </div>
            
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="deleteConfirmBtn" style="
                    flex: 1;
                    padding: 0.875rem 1.5rem;
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                ">
                    <i class="fas fa-trash ml-2"></i>
                    بله، حذف شود
                </button>
                <button id="deleteCancelBtn" style="
                    flex: 1;
                    padding: 0.875rem 1.5rem;
                    background: linear-gradient(135deg, #64748b, #475569);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3);
                ">
                    <i class="fas fa-times ml-2"></i>
                    خیر، لغو شود
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add hover effects
    const confirmBtn = modal.querySelector('#deleteConfirmBtn');
    const cancelBtn = modal.querySelector('#deleteCancelBtn');
    
    confirmBtn.addEventListener('mouseover', () => {
        confirmBtn.style.transform = 'translateY(-2px) scale(1.02)';
        confirmBtn.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.5)';
    });
    confirmBtn.addEventListener('mouseout', () => {
        confirmBtn.style.transform = 'translateY(0) scale(1)';
        confirmBtn.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.3)';
    });
    
    cancelBtn.addEventListener('mouseover', () => {
        cancelBtn.style.transform = 'translateY(-2px)';
        cancelBtn.style.boxShadow = '0 6px 16px rgba(100, 116, 139, 0.4)';
    });
    cancelBtn.addEventListener('mouseout', () => {
        cancelBtn.style.transform = 'translateY(0)';
        cancelBtn.style.boxShadow = '0 4px 12px rgba(100, 116, 139, 0.3)';
    });
    
    confirmBtn.addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}


// Edit Journal Function
function editJournal(id) {
    const journal = journals.find(j => j.id === id);
    if (!journal) return;
    
    // Switch to new journal section
    showSection('new-journal');
    
    // Fill form with journal data
    document.getElementById('symbol').value = journal.symbol;
    document.getElementById('risk').value = journal.risk;
    document.getElementById('riskReward').value = journal.riskReward;
    document.getElementById('session').value = journal.session;
    document.getElementById('tradeType').value = journal.tradeType;
    document.getElementById('timeframe').value = journal.timeframe;
    document.getElementById('result').value = journal.result;
    document.getElementById('stopType').value = journal.stopType || '';
    document.getElementById('quality').value = journal.quality;
    document.getElementById('emotion').value = journal.emotion;
    document.getElementById('wouldRetake').value = journal.wouldRetake;
    document.getElementById('followedPlan').value = journal.followedPlan;
    document.getElementById('mistake').value = journal.mistake || '';
    document.getElementById('comment').value = journal.comment || '';
    document.getElementById('chartLink').value = journal.chartLink || '';
    document.getElementById('tradeDate').value = journal.tradeDate || '';
    document.getElementById('tradeTime').value = journal.tradeTime || '';
    
    // Set active buttons for all quick-select buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        const field = btn.dataset.field;
        const value = btn.dataset.value;
        if (field && document.getElementById(field)?.value === value) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Set symbol buttons
    document.querySelectorAll('#symbolButtons .quick-btn').forEach(btn => {
        if (btn.textContent === journal.symbol) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Set risk buttons
    document.querySelectorAll('#riskButtons .quick-btn').forEach(btn => {
        if (btn.textContent === journal.risk + '%') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Set RR buttons
    document.querySelectorAll('#rrButtons .quick-btn').forEach(btn => {
        if (btn.textContent === journal.riskReward) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Set timeframe buttons
    document.querySelectorAll('#timeframeButtons .quick-btn').forEach(btn => {
        if (btn.textContent === journal.timeframe) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Set stop buttons
    document.querySelectorAll('#stopButtons .quick-btn').forEach(btn => {
        if (btn.textContent === journal.stopType) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Set quality buttons
    document.querySelectorAll('.quality-btn').forEach(btn => {
        if (btn.dataset.value === journal.quality.toString()) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Mark form as editing
    const form = document.getElementById('journalForm');
    if (form) {
        form.dataset.editingId = id;
    }
    
    // Update submit button
    const submitBtn = document.querySelector('#journalForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save ml-2"></i>بروزرسانی ژورنال';
    }
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
