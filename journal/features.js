// Additional Features for Journal App

// Dashboard and Statistics
function showDashboard() {
    calculateStats();
}

function calculateStats() {
    const total = journals.length;
    const wins = journals.filter(j => j.result === 'TP').length;
    const losses = journals.filter(j => j.result === 'SL').length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;
    
    if (document.getElementById('totalTrades')) {
        document.getElementById('totalTrades').textContent = total;
        document.getElementById('winTrades').textContent = wins;
        document.getElementById('lossTrades').textContent = losses;
        document.getElementById('winRate').textContent = winRate + '%';
    }
    
    // Symbol Stats
    const symbolStats = {};
    journals.forEach(j => {
        if (!symbolStats[j.symbol]) {
            symbolStats[j.symbol] = { total: 0, wins: 0, losses: 0 };
        }
        symbolStats[j.symbol].total++;
        if (j.result === 'TP') symbolStats[j.symbol].wins++;
        if (j.result === 'SL') symbolStats[j.symbol].losses++;
    });
    
    const symbolHtml = Object.keys(symbolStats).map(symbol => {
        const stats = symbolStats[symbol];
        const rate = ((stats.wins / stats.total) * 100).toFixed(0);
        return `
            <div class="flex justify-between items-center p-3 border-b border-gray-200">
                <span class="font-semibold">${symbol}</span>
                <div class="flex gap-4 text-sm">
                    <span class="text-gray-600">کل: ${stats.total}</span>
                    <span class="text-green-600">برد: ${stats.wins}</span>
                    <span class="text-red-600">باخت: ${stats.losses}</span>
                    <span class="text-blue-600">${rate}%</span>
                </div>
            </div>
        `;
    }).join('');
    
    if (document.getElementById('symbolStats')) {
        document.getElementById('symbolStats').innerHTML = symbolHtml || '<p class="text-gray-500 text-center p-4">داده‌ای موجود نیست</p>';
    }
    
    // Session Stats
    const sessionStats = {};
    journals.forEach(j => {
        if (!sessionStats[j.session]) {
            sessionStats[j.session] = { total: 0, wins: 0 };
        }
        sessionStats[j.session].total++;
        if (j.result === 'TP') sessionStats[j.session].wins++;
    });
    
    const sessionHtml = Object.keys(sessionStats).map(session => {
        const stats = sessionStats[session];
        const rate = ((stats.wins / stats.total) * 100).toFixed(0);
        return `
            <div class="flex justify-between items-center p-3 border-b border-gray-200">
                <span class="font-semibold">${session}</span>
                <div class="flex gap-4 text-sm">
                    <span class="text-gray-600">کل: ${stats.total}</span>
                    <span class="text-green-600">برد: ${stats.wins}</span>
                    <span class="text-blue-600">${rate}%</span>
                </div>
            </div>
        `;
    }).join('');
    
    if (document.getElementById('sessionStats')) {
        document.getElementById('sessionStats').innerHTML = sessionHtml || '<p class="text-gray-500 text-center p-4">داده‌ای موجود نیست</p>';
    }
    
    // Timeframe Stats
    const timeframeStats = {};
    journals.forEach(j => {
        if (!timeframeStats[j.timeframe]) {
            timeframeStats[j.timeframe] = { total: 0, wins: 0 };
        }
        timeframeStats[j.timeframe].total++;
        if (j.result === 'TP') timeframeStats[j.timeframe].wins++;
    });
    
    const timeframeHtml = Object.keys(timeframeStats).map(tf => {
        const stats = timeframeStats[tf];
        const rate = ((stats.wins / stats.total) * 100).toFixed(0);
        return `
            <div class="flex justify-between items-center p-3 border-b border-gray-200">
                <span class="font-semibold">${tf}</span>
                <div class="flex gap-4 text-sm">
                    <span class="text-gray-600">کل: ${stats.total}</span>
                    <span class="text-green-600">برد: ${stats.wins}</span>
                    <span class="text-blue-600">${rate}%</span>
                </div>
            </div>
        `;
    }).join('');
    
    if (document.getElementById('timeframeStats')) {
        document.getElementById('timeframeStats').innerHTML = timeframeHtml || '<p class="text-gray-500 text-center p-4">داده‌ای موجود نیست</p>';
    }
}

// Filter and Search
function setupFilters() {
    const searchInput = document.getElementById('searchJournal');
    const filterSelect = document.getElementById('filterResult');
    
    if (searchInput) {
        searchInput.addEventListener('input', filterJournals);
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', filterJournals);
    }
}

function filterJournals() {
    const searchTerm = document.getElementById('searchJournal')?.value.toLowerCase() || '';
    const resultFilter = document.getElementById('filterResult')?.value || '';
    
    const filtered = journals.filter(j => {
        const matchesSearch = j.symbol.toLowerCase().includes(searchTerm) || 
                            (j.comment && j.comment.toLowerCase().includes(searchTerm));
        const matchesResult = !resultFilter || j.result === resultFilter;
        
        return matchesSearch && matchesResult;
    });
    
    displayFilteredJournals(filtered);
}

function displayFilteredJournals(filteredJournals) {
    const container = document.getElementById('journalListContainer');
    
    if (filteredJournals.length === 0) {
        container.innerHTML = '<div class="glass-card text-center"><p class="text-gray-500">نتیجه‌ای یافت نشد</p></div>';
        return;
    }
    
    container.innerHTML = filteredJournals.map(j => createJournalCard(j)).join('');
}

function createJournalCard(j) {
    return `
        <div class="journal-card">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-900">${j.symbol}</h3>
                    <p class="text-sm text-gray-500">${j.tradeDate} - ${j.tradeTime}</p>
                </div>
                <div class="flex gap-2 items-center">
                    <span class="tag tag-${j.tradeType === 'خرید' ? 'buy' : 'sell'}">${j.tradeType}</span>
                    <span class="tag tag-${j.result.toLowerCase()}">${j.result}</span>
                    <button onclick="editJournal(${j.id})" class="text-blue-500 hover:text-blue-700 p-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteJournal(${j.id})" class="text-red-500 hover:text-red-700 p-2">
                        <i class="fas fa-trash"></i>
                    </button>
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
            ${j.mistake ? `<div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4"><p class="text-sm text-red-800"><strong>اشتباه:</strong> ${j.mistake}</p></div>` : ''}
            
            <div class="flex gap-2 flex-wrap mb-3">
                <span class="text-sm text-gray-600"><i class="fas fa-brain ml-1"></i>${j.emotion}</span>
                <span class="text-sm text-gray-600"><i class="fas fa-clipboard-check ml-1"></i>طبق پلن: ${j.followedPlan}</span>
                <span class="text-sm text-gray-600"><i class="fas fa-redo ml-1"></i>دوباره می‌گرفتم: ${j.wouldRetake}</span>
            </div>
            
            ${j.chartLink ? `<a href="${j.chartLink}" target="_blank" class="text-blue-500 text-sm inline-block mb-2"><i class="fas fa-chart-line ml-1"></i>مشاهده چارت</a><br>` : ''}
            ${j.tradeImage ? `<img src="${j.tradeImage}" class="mt-2 rounded-lg max-w-full cursor-pointer hover:opacity-90 transition-opacity" alt="Trade Screenshot" onclick="viewImage('${j.tradeImage}')">` : ''}
        </div>
    `;
}

// Edit Journal
function editJournal(id) {
    const journal = journals.find(j => j.id === id);
    if (!journal) return;
    
    // Fill form
    document.getElementById('symbol').value = journal.symbol;
    document.getElementById('risk').value = journal.risk;
    document.getElementById('riskReward').value = journal.riskReward;
    document.getElementById('session').value = journal.session;
    document.getElementById('tradeType').value = journal.tradeType;
    document.getElementById('timeframe').value = journal.timeframe;
    document.getElementById('result').value = journal.result;
    document.getElementById('stopType').value = journal.stopType || '';
    document.getElementById('mistake').value = journal.mistake || '';
    document.getElementById('quality').value = journal.quality;
    document.getElementById('emotion').value = journal.emotion;
    
    const wouldRetakeRadio = document.querySelector(`input[name="wouldRetake"][value="${journal.wouldRetake}"]`);
    if (wouldRetakeRadio) wouldRetakeRadio.checked = true;
    
    const followedPlanRadio = document.querySelector(`input[name="followedPlan"][value="${journal.followedPlan}"]`);
    if (followedPlanRadio) followedPlanRadio.checked = true;
    
    document.getElementById('comment').value = journal.comment || '';
    document.getElementById('chartLink').value = journal.chartLink || '';
    document.getElementById('tradeDate').value = journal.tradeDate;
    document.getElementById('tradeTime').value = journal.tradeTime;
    
    // Highlight quality button
    document.querySelectorAll('.quality-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.value === journal.quality) {
            btn.classList.add('active');
        }
    });
    
    // Store editing ID
    document.getElementById('journalForm').dataset.editingId = id;
    
    // Change button text
    const submitBtn = document.querySelector('#journalForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save ml-2"></i>بروزرسانی ژورنال';
    }
    
    showSection('new-journal');
    window.scrollTo(0, 0);
}

// Delete Journal
function deleteJournal(id) {
    if (!confirm('آیا از حذف این ژورنال اطمینان دارید؟')) return;
    
    journals = journals.filter(j => j.id !== id);
    localStorage.setItem(`journals_${dbPath}_${currentProfile}`, JSON.stringify(journals));
    updateJournalList();
    alert('ژورنال با موفقیت حذف شد');
}

// Export Data
function exportData() {
    const data = {
        profile: currentProfile,
        dbPath: dbPath,
        journals: journals,
        settings: profileSettings,
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-backup-${currentProfile}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    alert('بک‌آپ با موفقیت دانلود شد');
}

// Import Data
function importData() {
    const file = document.getElementById('importFile').files[0];
    if (!file) {
        alert('لطفاً یک فایل انتخاب کنید');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm(`آیا می‌خواهید داده‌های پروفایل "${data.profile}" را بازیابی کنید؟\n\nتوجه: داده‌های فعلی جایگزین خواهند شد.`)) {
                journals = data.journals || [];
                profileSettings = data.settings || profileSettings;
                
                localStorage.setItem(`journals_${dbPath}_${currentProfile}`, JSON.stringify(journals));
                localStorage.setItem(`profile_${dbPath}_${currentProfile}`, JSON.stringify(profileSettings));
                
                alert('داده‌ها با موفقیت بازیابی شدند');
                loadProfileData();
                showSection('journal-list');
            }
        } catch (error) {
            alert('خطا در خواندن فایل. لطفاً یک فایل JSON معتبر انتخاب کنید');
            console.error(error);
        }
    };
    reader.readAsText(file);
}

// Clear All Data
function clearAllData() {
    if (!confirm('⚠️ هشدار: آیا از پاک کردن تمام داده‌ها اطمینان دارید؟\n\nاین عمل قابل بازگشت نیست!')) return;
    
    if (!confirm('آیا واقعاً مطمئن هستید؟ تمام پروفایل‌ها و ژورنال‌ها حذف خواهند شد!')) return;
    
    localStorage.clear();
    alert('تمام داده‌ها پاک شدند. صفحه بارگذاری مجدد می‌شود...');
    setTimeout(() => location.reload(), 1000);
}

// View Image in Modal
function viewImage(src) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.cursor = 'pointer';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 90%; max-height: 90vh; padding: 1rem;">
            <img src="${src}" style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
            <button onclick="this.closest('.modal').remove()" class="btn-secondary mt-4 w-full">
                <i class="fas fa-times ml-2"></i>
                بستن
            </button>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Show Settings
function showSettings() {
    if (document.getElementById('currentDbPath')) {
        document.getElementById('currentDbPath').value = dbPath || 'تنظیم نشده';
    }
}

console.log('✅ Features module loaded');
