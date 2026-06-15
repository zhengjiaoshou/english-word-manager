/* ======================================
   📦 IndexedDB 数据层
   ====================================== */

const DB_NAME = 'EnglishWordManagerDB';
const DB_VERSION = 1;
const STORE_NAME = 'words';

// ---- 打开/初始化数据库 ----
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true
                });
                store.createIndex('word', 'word', { unique: false });
                store.createIndex('addedAt', 'addedAt', { unique: false });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

// ---- 添加单词 ----
async function addWord(wordData) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.add({
            word: wordData.word.toLowerCase().trim(),
            phoneticUk: wordData.phoneticUk || '',
            phoneticUs: wordData.phoneticUs || '',
            definitions: wordData.definitions || [],
            examples: wordData.examples || [],
            audioData: wordData.audioData || '',
            audioFormat: wordData.audioFormat || '',
            addedAt: new Date().toISOString(),
            source: wordData.source || 'dictionary-api'
        });

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
    });
}

// ---- 检查单词是否已存在 ----
async function wordExists(word) {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('word');
        const request = index.getAll(word.toLowerCase().trim());

        request.onsuccess = () => {
            resolve(request.result.length > 0);
        };
        request.onerror = () => resolve(false);
        tx.oncomplete = () => db.close();
    });
}

// ---- 获取所有单词 ----
async function getAllWords() {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const words = request.result || [];
            words.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
            resolve(words);
        };
        request.onerror = () => resolve([]);
        tx.oncomplete = () => db.close();
    });
}

// ---- 按关键词搜索单词 ----
async function searchWords(keyword) {
    const all = await getAllWords();
    const kw = keyword.toLowerCase().trim();
    if (!kw) return all;
    return all.filter(w =>
        w.word.includes(kw) ||
        w.definitions.some(d => d.toLowerCase().includes(kw)) ||
        w.phoneticUs.includes(kw) ||
        w.phoneticUk.includes(kw)
    );
}

// ---- 按日期范围查询 ----
async function getWordsByDateRange(startDate, endDate) {
    const all = await getAllWords();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + 86400000; // 包含结束日当天
    return all.filter(w => {
        const t = new Date(w.addedAt).getTime();
        return t >= start && t < end;
    });
}

// ---- 获取今日单词 ----
async function getTodayWords() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(start.getTime() + 86400000);
    return getWordsByDateRange(start.toISOString(), end.toISOString());
}

// ---- 删除单词 ----
async function deleteWord(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
    });
}

// ---- 获取单词总数 ----
async function getWordCount() {
    const words = await getAllWords();
    return words.length;
}

// ---- 导出为 JSON ----
async function exportToJSON() {
    const words = await getAllWords();
    const data = {
        metadata: {
            exportedAt: new Date().toISOString(),
            totalWords: words.length,
            version: '1.0'
        },
        words: words.map(w => ({
            id: w.id,
            word: w.word,
            phoneticUk: w.phoneticUk,
            phoneticUs: w.phoneticUs,
            definitions: w.definitions,
            examples: w.examples,
            addedAt: w.addedAt.split('T')[0],
            source: w.source
        }))
    };
    return JSON.stringify(data, null, 2);
}

// ---- 导出为 Markdown ----
async function exportToMarkdown() {
    const words = await getAllWords();
    const lines = ['# 📚 英语单词词库导出', '', `> 导出时间: ${new Date().toLocaleString('zh-CN')}`, `> 单词总数: ${words.length}`, '', '---', ''];

    words.forEach((w, i) => {
        lines.push(`## ${i + 1}. ${w.word}`);
        lines.push('');
        if (w.phoneticUk) lines.push(`- **英式音标**: ${w.phoneticUk}`);
        if (w.phoneticUs) lines.push(`- **美式音标**: ${w.phoneticUs}`);
        lines.push('');
        if (w.definitions && w.definitions.length) {
            lines.push('**释义**');
            w.definitions.forEach(d => lines.push(`- ${d}`));
            lines.push('');
        }
        if (w.examples && w.examples.length) {
            lines.push('**例句**');
            w.examples.forEach(e => {
                const enText = typeof e === 'string' ? e : e.en;
                const cnText = typeof e === 'string' ? '' : (e.cn || '');
                if (enText) lines.push(`> ${enText}`);
                if (cnText) lines.push(`> ${cnText}`);
            });
            lines.push('');
        }
        lines.push(`*记录于 ${w.addedAt.split('T')[0]}*`);
        lines.push('');
        lines.push('---');
        lines.push('');
    });

    return lines.join('\n');
}

// ---- 从 JSON 导入 ----
async function importFromJSON(jsonStr) {
    try {
        const data = JSON.parse(jsonStr);
        if (!data.words || !Array.isArray(data.words)) {
            throw new Error('无效的导入格式');
        }

        let imported = 0;
        let skipped = 0;

        for (const w of data.words) {
            const exists = await wordExists(w.word);
            if (!exists) {
                await addWord({
                    word: w.word,
                    phoneticUk: w.phoneticUk || '',
                    phoneticUs: w.phoneticUs || '',
                    definitions: w.definitions || [],
                    examples: w.examples || [],
                    source: w.source || 'import'
                });
                imported++;
            } else {
                skipped++;
            }
        }

        return { imported, skipped };
    } catch (e) {
        throw new Error('导入失败: ' + e.message);
    }
}
