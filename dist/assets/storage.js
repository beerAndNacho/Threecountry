const DB_NAME = 'threecountry';
const STORE_NAME = 'saves';
const SAVE_KEY = 'vertical-slice-autosave';
const FALLBACK_KEY = 'threecountry:vertical-slice:v1';
function openDatabase() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB unavailable'));
            return;
        }
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(STORE_NAME))
                database.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    });
}
export async function saveGame(state) {
    const serialized = JSON.stringify(state);
    try {
        const database = await openDatabase();
        await new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).put(serialized, SAVE_KEY);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error ?? new Error('Save failed'));
        });
        database.close();
        try {
            localStorage.setItem(FALLBACK_KEY, serialized);
        }
        catch { }
    }
    catch {
        localStorage.setItem(FALLBACK_KEY, serialized);
    }
}
export async function loadGame() {
    try {
        const database = await openDatabase();
        const serialized = await new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const request = transaction.objectStore(STORE_NAME).get(SAVE_KEY);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error ?? new Error('Load failed'));
        });
        database.close();
        if (serialized)
            return JSON.parse(serialized);
    }
    catch { }
    try {
        const serialized = localStorage.getItem(FALLBACK_KEY);
        return serialized ? JSON.parse(serialized) : null;
    }
    catch {
        return null;
    }
}
export async function clearGame() {
    try {
        const database = await openDatabase();
        await new Promise((resolve, reject) => {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).delete(SAVE_KEY);
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error ?? new Error('Delete failed'));
        });
        database.close();
    }
    catch { }
    try {
        localStorage.removeItem(FALLBACK_KEY);
    }
    catch { }
}
//# sourceMappingURL=storage.js.map