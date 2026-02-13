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
});

// Load Settings
function loadSettings() {
    dbPath = localStorage.getItem('journalDbPath');
    currentProfile = localStorage.getItem('currentProfile');
    
    if (dbPath) {
        document.getElementById('setupScreen').classList.add('hidden');
        document.getElementById('selected
        
        if (currentProfile) {
            loadProfileData();
            showSection('new-journal');
        } else {
            showProfileManager();
        }
    }
}

// Setup Database
function setupDatabase() {
    const path = document.getElementById('dbPath').value.trim();
    
    if (!path) {
        alert('لطفاً مسیر پوشه را وارد کنید');
        return;
    }
    
    dbPath = path;
    localStorage.setItem('journalDbPath', dbPath);
    
    document.getElementById('setupScreen').classList.add('hidden');
    showProfileManager();
}

// Profile Management
function loadProfiles() {
    const savedProfiles = localStorage.getItem(`profiles_${dbPath}`);
    profiles = savedProfiles ? JSON.parse(savedProfiles) : [];
    updateProfileList();
}

function showProfileManager() {
    document.getElementById('profileManager').classList.remove('hidden');
    document.getElementById('newJournalSection').classList.add('hidden');
    document.getElementById('journalListSection').classList.add('hidden');
    updateProfileList();
}

function updateProfileList() {
    const container = document.getElementById('profileList');
    
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
    document.getElementById('newProfileModal').classList.add('active');
}

function createProfile() {
    const name = document.getElementById('newProfileName').value.trim();
    
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
        symbols: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY']
    };
    localStorage.setItem(`profile_${dbPath}_${name}`, JSON.stringify(settings));
    
    document.getElementById('newProfileName').value = '';
    closeModal('newProfileModal');
    updateProfileList();
}

function selectProfile(profile) {
    currentProfile = profile;
    localStorage.setItem('currentProfile', profile);
    document.getElementById('currentProfile').textContent = `پروفایل: ${profile}`;
    
    loadProfileData();
    document.getElementById('profileManager').classList.add('hidden');
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
        document.getElementById('currentProfile').textContent = '';
    }
    
    updateProfileList();
}

// Load Profile Data
function loadProfileData() {
    const settings = localStorage.getItem(`profile_${dbPath}_${currentProfile}`);
    profileSettings = settings ? JSON.parse(settings) : { symbols: ['XAUUSD', 'EURUSD'] };
    
    const journalsData = localStorage.getItem(`journals_${dbPath}_${currentProfile}`);
    journals = journalsData ? JSON.parse(journalsData) : [];
    
    updateSymbolSelect();
    updateJournalList();
}

// Symbol Management
function updateSymbolSelect() {
    const select = document.getElementById('symbol');
    select.innerHTML = '<option value="">انتخاب کنید</option>' +
        profileSettings.symbols.map(s => `<option value="${s}">${s}</option>`).join('');
}

function manageSymbols() {
    const modal = document.getElementById('symbolModal');
    const list = document.getElementById('symbolList');
    
    list.innerHTML = profileSettings.symbols.map(symbol => `
        <div class="symbol-item">
            <span>${symbol}</span>
            <button onclick="removeSymbol('${symbol}')" class="btn-danger text-sm">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    modal.classList.add('active');
}

function addSymbol() {
    const input = document.getElementById('newSymbol');
    const symbol = input.value.trim().toUpperCase();
    
    if (!symbol) return;
    
    if (profileSettings.symbols.includes(symbol)) {
        alert('این نماد قبلاً اضافه شده است');
        return;
    }
    
    profileSettings.symbols.push(symbol);
    saveProfileSettings();
    input.value = '';
    manageSymbols();
    updateSymbolSelect();
}

function removeSymbol(symbol) {
    profileSettings.symbols = profileSettings.symbols.filter(s => s !== symbol);
    saveProfileSettings();
    manageSymbols();
    updateSymbolSelect();
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
    
    document.getElementById('profileManager').classList.add('hidden');
    document.getElementById('newJournalSection').classList.add('hidden');
    document.getElementById('journalListSection').classList.add('hidden');
    
    if (section === 'new-journal') {
        document.getElementById('newJournalSection').classList.remove('hidden');
    } else if (section === 'journal-list') {
        document.getElementById('journalListSection').classList.remove('hidden');
        updateJournalList();
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
            document.getElementById('quality').value = btn.dataset.value;
        });
    });
    
    // Form submission
    document.getElementById('journalForm').addEventListener('submit', saveJournal);
}

// Set Current Date
function setCurrentDate() {
    const now = new Date();
    const persianDate = new Intl.DateTimeFormat('fa-IR').format(now);
    const time = now.toTimeString().slice(0, 5);
    
    document.getElementById('tradeDate').value = persianDate;
    document.getElementById('tradeTime').value = time;
}

// Save Journal
function saveJournal(event) {
    event.preventDefault();
    
    if (!currentProfile) {
        alert('لطفاً ابتدا یک پروفایل انتخاب کنید');
        return;
    }
    
    const journal = {
        id: Date.now(),
        symbol: document.getElementById('symbol').value,
        risk: document.getElementById('risk').value,
        riskReward: document.getElementById('riskReward').value,
        session: document.getElementById('session').value,
        tradeType: document.getElementById('tradeType').value,
        timeframe: document.getElementById('timeframe').value,
        result: document.getElementById('result').value,
        stopType: document.getElementById('stopType').value,
        mistake: document.getElementById('mistake').value,
        quality: document.getElementById('quality').value,
        emotion: document.getElementById('emotion').value,
        wouldRetake: document.querySelector('input[name="wouldRetake"]:checked').value,
        followedPlan: document.querySelector('input[name="followedPlan"]:checked').value,
        comment: document.getElementById('comment').value,
        chartLink: document.getElementById('chartLink').value,
        tradeDate: document.getElementById('tradeDate').value,
        tradeTime: document.getElementById('tradeTime').value,
        createdAt: new Date().toISOString()
    };
    
    // Handle image upload
    const imageFile = document.getElementById('tradeImage').files[0];
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            journal.tradeImage = e.target.result;
            saveJournalToStorage(journal);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveJournalToStorage(journal);
    }
}

function saveJournalToStorage(journal) {
    journals.unshift(journal);
    localStorage.setItem(`journals_${dbPath}_${currentProfile}`, JSON.stringify(journals));
    
    alert('ژورنال با موفقیت ذخیره شد!');
    resetForm();
    showSection('journal-list');
}

// Reset Form
function resetForm() {
    document.getElementById('journalForm').reset();
    document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
    setCurrentDate();
}

// Update Journal List
function updateJournalList() {
    const container = document.getElementById('journalListContainer');
    
    if (journals.length === 0) {
        container.innerHTML = '<div class="glass-card text-center"><p class="text-gray-500">هنوز ژورنالی ثبت نشده است</p></div>';
        return;
    }
    
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

// Modal Functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Theme Toggle
function toggleTheme() {
    const html = document.documentElement;
    const icon = document.getElementById('theme-icon');
    const currentTheme = html.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        html.removeAttribute('data-theme');
        icon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        icon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const icon = document.getElementById('theme-icon');
    
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        icon.className = 'fas fa-sun';
    }
});


// Dashboard and Statistics
function showDashboard() {
    calculateStats();
}

function calculateStats() {
    const total = journals.length;
    const wins = journals.filter(j => j.result === 'TP').length;
    const losses = journals.filter(j => j.result === 'SL').length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    
    document.getElementById('totalTrades').textContent = total;
    document.getElementById('winTrades').textContent = wins;
    document.getElementById('lossTrades').textContent = lo