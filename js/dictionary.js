/* ======================================
   📖 字典查询模块 (Free Dictionary API)
   ====================================== */

const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

// 词性优先级（常用词性优先）
const POS_PRIORITY = {
    'adjective': 0,
    'verb': 1,
    'adverb': 2,
    'noun': 3,
    'preposition': 4,
    'conjunction': 5,
    'interjection': 6,
    'pronoun': 7
};

/**
 * 查询单词
 * @param {string} word - 要查询的单词
 * @returns {Promise<object|null>} 单词数据或 null
 */
async function lookupWord(word) {
    if (!word || !word.trim()) return null;

    const w = word.trim().toLowerCase();
    const url = `${DICTIONARY_API}/${encodeURIComponent(w)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`API 返回 ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.length) return null;

        const entry = data[0];

        // ---- 提取音标 ----
        let phoneticUk = '';
        let phoneticUs = '';
        const allPhonetics = [];

        if (entry.phonetics) {
            for (const p of entry.phonetics) {
                if (p.text) allPhonetics.push(p.text);

                if (p.audio) {
                    const audioLow = p.audio.toLowerCase();
                    if (audioLow.includes('us') || audioLow.includes('en-us') || audioLow.includes('american')) {
                        if (p.text) phoneticUs = p.text;
                    } else if (audioLow.includes('uk') || audioLow.includes('en-gb') || audioLow.includes('british')) {
                        if (p.text) phoneticUk = p.text;
                    }
                }
            }

            // 填补缺失的音标
            if (!phoneticUs && !phoneticUk && allPhonetics.length > 0) {
                phoneticUs = allPhonetics[0];
                phoneticUk = allPhonetics.length === 1 ? allPhonetics[0] : '';
            } else if (phoneticUs && !phoneticUk) {
                phoneticUk = phoneticUs;
            } else if (phoneticUk && !phoneticUs) {
                phoneticUs = phoneticUk;
            }
        }

        // ---- 提取释义 ----
        const allDefs = [];
        if (entry.meanings) {
            for (const m of entry.meanings) {
                const pos = m.partOfSpeech || '';
                const priority = POS_PRIORITY[pos] !== undefined ? POS_PRIORITY[pos] : 99;

                if (m.definitions) {
                    for (const d of m.definitions) {
                        if (d.definition) {
                            allDefs.push({
                                partOfSpeech: pos,
                                priority,
                                definition: d.definition,
                                example: d.example || ''
                            });
                        }
                    }
                }
            }
        }

        // 按词性优先级排序
        allDefs.sort((a, b) => a.priority - b.priority);

        // 取前2个核心释义
        const topDefs = allDefs.slice(0, 2).map(d => {
            return d.partOfSpeech
                ? `[${d.partOfSpeech}] ${d.definition}`
                : d.definition;
        });

        // 提取例句（最多2个）
        const examples = [];
        for (const d of allDefs) {
            if (d.example && examples.length < 2) {
                examples.push({
                    en: d.example,
                    pos: d.partOfSpeech
                });
            }
        }

        return {
            word: w,
            phoneticUk,
            phoneticUs,
            definitions: topDefs,
            examples,
            rawDefinitions: allDefs
        };

    } catch (error) {
        console.error('字典查询失败:', error);
        // 区分错误类型
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('NETWORK_ERROR');
        }
        throw error;
    }
}

/**
 * 将释义数组格式化为中文可读字符串
 */
function formatDefinitions(definitions) {
    if (!definitions || !definitions.length) return '';

    return definitions
        .map(d => {
            let clean = d;
            if (clean.includes('] ')) {
                clean = clean.split('] ', 1)[0] + '] ' + clean.split('] ').slice(1).join('] ');
                // 取第一个 ] 后面的内容
                const idx = clean.indexOf('] ');
                if (idx > 0) {
                    const pos = clean.substring(0, idx + 1);
                    const def = clean.substring(idx + 2);
                    return `${pos} ${def.length > 60 ? def.substring(0, 60) + '...' : def}`;
                }
            }
            return clean.length > 60 ? clean.substring(0, 60) + '...' : clean;
        })
        .join('；');
}
