// File System Management using File System Access API
let directoryHandle = null;

// Check if File System Access API is supported
function isFileSystemSupported() {
    return 'showDirectoryPicker' in window;
}

// Select Directory
async function selectDirectory() {
    if (!isFileSystemSupported()) {
        alert('⚠️ مرورگر شما از File System Access API پشتیبانی نمی‌کند.\n\nلطفاً از Chrome، Edge یا مرورگرهای مدرن استفاده کنید.\n\nدر حال حاضر داده‌ها فقط در localStorage ذخیره می‌شوند.');
        return null;
    }

    try {
        directoryHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
        });
        
        // Save handle reference
        const handleId = await saveDirectoryHandle(directoryHandle);
        localStorage.setItem('directoryHandleId', handleId);
        
        return directoryHandle;
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error selecting directory:', error);
            alert('خطا در انتخاب پوشه: ' + error.message);
        }
        return null;
    }
}

// Save directory handle (for persistence)
async function saveDirectoryHandle(handle) {
    const handleId = Date.now().toString();
    
    // Store in IndexedDB for persistence
    const db = await openDatabase();
    const transaction = db.transaction(['handles'], 'readwrite');
    const store = transaction.objectStore('handles');
    
    await store.put({
        id: handleId,
        handle: handle,
        name: handle.name,
        timestamp: Date.now()
    });
    
    return handleId;
}

// Load directory handle
async function loadDirectoryHandle() {
    const handleId = localStorage.getItem('directoryHandleId');
    if (!handleId) return null;
    
    try {
        const db = await openDatabase();
        const transaction = db.transaction(['handles'], 'readonly');
        const store = transaction.objectStore('handles');
        const request = store.get(handleId);
        
        return new Promise((resolve, reject) => {
            request.onsuccess = async () => {
                const result = request.result;
                if (result && result.handle) {
                    // Verify permission
                    const permission = await result.handle.queryPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        directoryHandle = result.handle;
                        resolve(result.handle);
                    } else {
                        // Request permission again
                        const newPermission = await result.handle.requestPermission({ mode: 'readwrite' });
                        if (newPermission === 'granted') {
                            directoryHandle = result.handle;
                            resolve(result.handle);
                        } else {
                            resolve(null);
                        }
                    }
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error loading directory handle:', error);
        return null;
    }
}

// Open IndexedDB
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('JournalDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('handles')) {
                db.createObjectStore('handles', { keyPath: 'id' });
            }
        };
    });
}

// Create Profile Directory
async function createProfileDirectory(profileName) {
    if (!directoryHandle) {
        console.warn('No directory handle available');
        return false;
    }
    
    try {
        // Create profile folder
        const profileDir = await directoryHandle.getDirectoryHandle(profileName, { create: true });
        
        // Create initial files
        await createInitialFiles(profileDir, profileName);
        
        return true;
    } catch (error) {
        console.error('Error creating profile directory:', error);
        alert('خطا در ساخت پوشه پروفایل: ' + error.message);
        return false;
    }
}

// Create initial files in profile directory
async function createInitialFiles(profileDir, profileName) {
    try {
        // Create settings.json
        const settingsFile = await profileDir.getFileHandle('settings.json', { create: true });
        const settingsWritable = await settingsFile.createWritable();
        await settingsWritable.write(JSON.stringify({
            profileName: profileName,
            symbols: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY'],
            stops: ['فیک چاک', 'بریک استراکچر', 'تایم استاپ'],
            createdAt: new Date().toISOString()
        }, null, 2));
        await settingsWritable.close();
        
        // Create journals.json
        const journalsFile = await profileDir.getFileHandle('journals.json', { create: true });
        const journalsWritable = await journalsFile.createWritable();
        await journalsWritable.write(JSON.stringify([], null, 2));
        await journalsWritable.close();
        
        // Create README.txt
        const readmeFile = await profileDir.getFileHandle('README.txt', { create: true });
        const readmeWritable = await readmeFile.createWritable();
        await readmeWritable.write(`پروفایل: ${profileName}\nتاریخ ایجاد: ${new Date().toLocaleString('fa-IR')}\n\nاین پوشه شامل داده‌های ژورنال معاملاتی شماست.`);
        await readmeWritable.close();
        
        return true;
    } catch (error) {
        console.error('Error creating initial files:', error);
        return false;
    }
}

// Save journals to file
async function saveJournalsToFile(profileName, journals) {
    if (!directoryHandle) {
        console.warn('No directory handle, saving to localStorage only');
        return false;
    }
    
    try {
        const profileDir = await directoryHandle.getDirectoryHandle(profileName, { create: true });
        const journalsFile = await profileDir.getFileHandle('journals.json', { create: true });
        const writable = await journalsFile.createWritable();
        await writable.write(JSON.stringify(journals, null, 2));
        await writable.close();
        return true;
    } catch (error) {
        console.error('Error saving journals to file:', error);
        return false;
    }
}

// Load journals from file
async function loadJournalsFromFile(profileName) {
    if (!directoryHandle) {
        return null;
    }
    
    try {
        const profileDir = await directoryHandle.getDirectoryHandle(profileName);
        const journalsFile = await profileDir.getFileHandle('journals.json');
        const file = await journalsFile.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch (error) {
        console.error('Error loading journals from file:', error);
        return null;
    }
}

// Save settings to file
async function saveSettingsToFile(profileName, settings) {
    if (!directoryHandle) {
        return false;
    }
    
    try {
        const profileDir = await directoryHandle.getDirectoryHandle(profileName, { create: true });
        const settingsFile = await profileDir.getFileHandle('settings.json', { create: true });
        const writable = await settingsFile.createWritable();
        await writable.write(JSON.stringify(settings, null, 2));
        await writable.close();
        return true;
    } catch (error) {
        console.error('Error saving settings to file:', error);
        return false;
    }
}

// Load settings from file
async function loadSettingsFromFile(profileName) {
    if (!directoryHandle) {
        return null;
    }
    
    try {
        const profileDir = await directoryHandle.getDirectoryHandle(profileName);
        const settingsFile = await profileDir.getFileHandle('settings.json');
        const file = await settingsFile.getFile();
        const text = await file.text();
        return JSON.parse(text);
    } catch (error) {
        console.error('Error loading settings from file:', error);
        return null;
    }
}

// Delete profile directory
async function deleteProfileDirectory(profileName) {
    if (!directoryHandle) {
        return false;
    }
    
    try {
        await directoryHandle.removeEntry(profileName, { recursive: true });
        return true;
    } catch (error) {
        console.error('Error deleting profile directory:', error);
        return false;
    }
}

// List profiles from directory
async function listProfilesFromDirectory() {
    if (!directoryHandle) {
        return [];
    }
    
    try {
        const profiles = [];
        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'directory') {
                profiles.push(entry.name);
            }
        }
        return profiles;
    } catch (error) {
        console.error('Error listing profiles:', error);
        return [];
    }
}

// Export all data to backup file
async function exportBackupToFile() {
    if (!directoryHandle) {
        console.warn('No directory handle available');
        return false;
    }
    
    try {
        const backupData = {
            profiles: profiles,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const backupFile = await directoryHandle.getFileHandle(`backup-${Date.now()}.json`, { create: true });
        const writable = await backupFile.createWritable();
        await writable.write(JSON.stringify(backupData, null, 2));
        await writable.close();
        
        alert('بک‌آپ با موفقیت در پوشه دیتابیس ذخیره شد');
        return true;
    } catch (error) {
        console.error('Error exporting backup:', error);
        alert('خطا در ذخیره بک‌آپ: ' + error.message);
        return false;
    }
}

console.log('✅ Filesystem module loaded');
