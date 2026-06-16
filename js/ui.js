/* ======================================
   🎨 UI 渲染模块
   ====================================== */

// ---- 例句播放按钮事件 ----
function playExampleSentence(event, text, lang = 'en-US') {
    event.stopPropagation();
    const btn = event.currentTarget;
    btn.textContent = '⏳';
    btn.disabled = true;
    speakSentence(text, lang).finally(() => {
        btn.textContent = '🔊';
        btn.disabled = false;
    });
}

// ---- 渲染搜索结果 ----
function renderSearchResult(data, container) {
    if (!data) {
        container.innerHTML = `
            <div class="word-detail-card">
                <p class="error-text">❌ 未找到该单词，请检查拼写</p>
            </div>
        `;
        container.classList.add('show');
        return;
    }

    const defHtml = data.definitions.map(d => `
        <div class="def-item">
            ${d}
        </div>
    `).join('');

    const exHtml = data.examples && data.examples.length ? `
        <div class="example-section">
            <strong>💬 例句</strong>
            ${data.examples.map(e => `
                <div class="example-item">
                    "${e.en}"
                    <button class="btn-play-example" onclick="playExampleSentence(event, '${e.en.replace(/'/g, "\\'")}')" title="朗读例句">🔊</button>
                </div>
            `).join('')}
        </div>
    ` : '';

    const phoneticHtml = `
        <div class="word-phonetics">
            ${data.phoneticUk ? `<span>🇬🇧 ${data.phoneticUk}</span>` : ''}
            ${data.phoneticUs ? `<span>🇺🇸 ${data.phoneticUs}</span>` : ''}
        </div>
    `;

    container.innerHTML = `
        <div class="word-detail-card">
            <div class="word-header">
                <div>
                    <div class="word-title">${data.word}</div>
                    ${phoneticHtml}
                </div>
                <div class="word-actions">
                    <button class="btn-icon" onclick="playWordAudio('${data.word}')" title="播放发音">▶️</button>
                    <button class="btn-icon" onclick="app.playBothAccents('${data.word}', '${data.phoneticUk}', '${data.phoneticUs}')" title="播放英美发音">🔊</button>
                </div>
            </div>
            <div class="def-section">
                ${defHtml}
            </div>
            ${exHtml}
            <div style="margin-top:16px">
                <button class="btn-add-word" id="btnAddFromSearch" onclick="app.addWordFromSearch()">
                    ✅ 添加到词库
                </button>
            </div>
        </div>
    `;

    // 标记是否已存在
    wordExists(data.word).then(exists => {
        const btn = document.getElementById('btnAddFromSearch');
        if (btn && exists) {
            btn.textContent = '✅ 已添加';
            btn.disabled = true;
            btn.classList.add('btn-added-word');
        }
    });

    container.classList.add('show');
}

// ---- 渲染搜索结果加载中 ----
// ---- 渲染中英翻译结果 ----
function renderTranslationResult(transResult, container) {
    const { dictionary: data, originalCnText, translation } = transResult;
    const defHtml = data.definitions.map(d => `
        <div class="def-item">${d}</div>
    `).join('');

    const exHtml = data.examples && data.examples.length ? `
        <div class="example-section">
            <strong>💬 例句</strong>
            ${data.examples.map(e => `
                <div class="example-item">
                    "${e.en}"
                    <button class="btn-play-example" onclick="playExampleSentence(event, '${e.en.replace(/'/g, "\\'")}')" title="朗读例句">🔊</button>
                </div>
            `).join('')}
        </div>
    ` : '';

    const phoneticHtml = `
        <div class="word-phonetics">
            ${data.phoneticUk ? `<span>🇬🇧 ${data.phoneticUk}</span>` : ''}
            ${data.phoneticUs ? `<span>🇺🇸 ${data.phoneticUs}</span>` : ''}
        </div>
        <div class="translation-source">翻译自：${originalCnText} → ${translation}</div>
    `;

    container.innerHTML = `
        <div class="word-detail-card">
            <div class="word-header">
                <div>
                    <div class="word-title">${data.word}</div>
                    ${phoneticHtml}
                </div>
                <div class="word-actions">
                    <button class="btn-icon" onclick="playWordAudio('${data.word}')" title="播放发音">▶️</button>
                </div>
            </div>
            <div class="def-section">${defHtml}</div>
            ${exHtml}
            <div style="margin-top:16px">
                <button class="btn-add-word" id="btnAddFromSearch" onclick="app.addWordFromSearch()">
                    ✅ 添加到词库
                </button>
            </div>
        </div>
    `;

    wordExists(data.word).then(exists => {
        const btn = document.getElementById('btnAddFromSearch');
        if (btn && exists) {
            btn.textContent = '✅ 已添加';
            btn.disabled = true;
            btn.classList.add('btn-added-word');
        }
    });

    container.classList.add('show');
}

function renderSearchLoading(container) {
    container.innerHTML = `<div class="search-result-status">🔍 查询中...</div>`;
    container.classList.add('show');
}

// ---- 渲染搜索结果错误 ----
function renderSearchError(container, msg) {
    container.innerHTML = `
        <div class="word-detail-card">
            <p class="error-text">❌ ${msg}</p>
        </div>
    `;
    container.classList.add('show');
}

// ---- 隐藏搜索结果 ----
function hideSearchResult(container) {
    container.classList.remove('show');
    container.innerHTML = '';
}

// ---- 渲染今日单词芯片 ----
function renderWordChips(words, container) {
    if (!words || !words.length) {
        container.innerHTML = `<div class="empty-state">今天还没有添加单词哦，试试在上方查询吧 ✨</div>`;
        return;
    }

    container.innerHTML = words.map(w => `
        <span class="word-chip" onclick="app.showWordDetail(${w.id})" title="点击查看详情">
            ${w.word}
        </span>
    `).join('');
}

// ---- 渲染最近单词列表 ----
function renderRecentList(words, container) {
    if (!words || !words.length) {
        container.innerHTML = `<div class="empty-state">还没有单词记录，开始你的第一个单词吧 🚀</div>`;
        return;
    }

    const display = words.slice(0, 10);
    container.innerHTML = display.map(w => {
        const dateStr = new Date(w.addedAt).toLocaleDateString('zh-CN');
        return `
            <div class="list-item" onclick="app.showWordDetail(${w.id})">
                <span class="list-item-word">${w.word}</span>
                <span class="list-item-phonetic">${w.phoneticUs || w.phoneticUk || ''}</span>
                <span class="list-item-date">${dateStr}</span>
                <button class="btn-play-sm" onclick="event.stopPropagation(); playWordAudio('${w.word}')" title="播放发音">▶</button>
                <span class="more-btn" onclick="event.stopPropagation(); app.showWordDetail(${w.id})">⋯</span>
            </div>
        `;
    }).join('');
}

// ---- 渲染词库表格 ----
function renderWordbookTable(words, container) {
    if (!words || !words.length) {
        container.innerHTML = `<div class="empty-state">词库空空如也，先去添加一些单词吧 📝</div>`;
        return;
    }

    let html = `<table>
        <thead>
            <tr>
                <th>#</th>
                <th>单词</th>
                <th>音标</th>
                <th>释义</th>
                <th>日期</th>
                <th>发音</th>
            </tr>
        </thead>
        <tbody>
    `;

    words.forEach((w, i) => {
        const dateStr = new Date(w.addedAt).toLocaleDateString('zh-CN');
        const defPreview = w.definitions && w.definitions.length
            ? w.definitions[0].substring(0, 40) + (w.definitions[0].length > 40 ? '…' : '')
            : '';
        html += `
            <tr onclick="app.showWordDetail(${w.id})">
                <td>${i + 1}</td>
                <td class="table-word">${w.word}</td>
                <td class="table-phonetic">${w.phoneticUs || w.phoneticUk || '-'}</td>
                <td class="table-def">${defPreview}</td>
                <td class="table-date">${dateStr}</td>
                <td><button class="table-play-btn" onclick="event.stopPropagation(); playWordAudio('${w.word}')" title="播放发音">▶</button></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

// ---- 渲染单词详情弹窗 ----
function renderWordDetailModal(wordData) {
    const body = document.getElementById('modalBody');
    const modal = document.getElementById('wordDetailModal');

    const defHtml = (wordData.definitions || []).map(d => `
        <div class="def-item">${d}</div>
    `).join('');

    const exHtml = (wordData.examples || []).length ? `
        <div class="example-section">
            <strong>💬 例句</strong>
            ${(wordData.examples || []).map(e => {
                const enText = typeof e === 'string' ? e : e.en;
                return `<div class="example-item">
                    "${enText}"
                    <button class="btn-play-example" onclick="playExampleSentence(event, '${enText.replace(/'/g, "\\'")}')" title="朗读例句">🔊</button>
                </div>`;
            }).join('')}
        </div>
    ` : '';

    const phoneticHtml = `
        <div class="word-phonetics">
            ${wordData.phoneticUk ? `<span>🇬🇧 ${wordData.phoneticUk}</span>` : ''}
            ${wordData.phoneticUs ? `<span>🇺🇸 ${wordData.phoneticUs}</span>` : ''}
        </div>
    `;

    const dateStr = new Date(wordData.addedAt).toLocaleString('zh-CN');

    body.innerHTML = `
        <div class="word-detail-card">
            <div class="word-header">
                <div>
                    <div class="word-title">${wordData.word}</div>
                    ${phoneticHtml}
                </div>
                <div class="word-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); playWordAudio('${wordData.word}')" title="播放发音">▶️</button>
                </div>
            </div>
            <div class="def-section">${defHtml}</div>
            ${exHtml}
            <div style="margin-top:12px; font-size:0.8rem; color:var(--text-muted)">
                添加于 ${dateStr}
            </div>
            <div class="detail-actions">
                <button class="btn-delete-word" onclick="app.deleteWord(${wordData.id})">🗑 删除</button>
            </div>
        </div>
    `;

    modal.classList.add('show');
}

// ---- 周报弹窗 ----
async function renderWeeklyReport() {
    const modal = document.getElementById('wordDetailModal');
    const body = document.getElementById('modalBody');

    // 计算本周范围
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const words = await getWordsByDateRange(monday.toISOString(), sunday.toISOString());

    const weekNum = getISOWeekNum(now);
    const startStr = monday.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    const endStr = sunday.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    const total = words.length;
    const avg = total > 0 ? (total / Math.min(7, Math.max(1, (now.getTime() - monday.getTime()) / 86400000 + 1))).toFixed(1) : '0';

    let tableHtml = '';
    if (words.length > 0) {
        tableHtml = `<table class="weekly-table">
            <thead><tr><th>#</th><th>单词</th><th>音标</th><th>释义</th><th>日期</th></tr></thead>
            <tbody>${words.map((w, i) => {
                const d = new Date(w.addedAt).toLocaleDateString('zh-CN');
                const def = w.definitions?.[0]?.substring(0, 30) || '';
                return `<tr onclick="app.showWordDetail(${w.id}); document.getElementById('wordDetailModal').classList.remove('show')">
                    <td>${i + 1}</td><td class="table-word">${w.word}</td>
                    <td class="table-phonetic">${w.phoneticUs || '—'}</td>
                    <td>${def}</td><td class="table-date">${d}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
    } else {
        tableHtml = '<div class="empty-state">本周还没有添加单词哦，开始你的第一个单词吧 🚀</div>';
    }

    body.innerHTML = `
        <div class="weekly-report">
            <h2>📚 第 ${weekNum} 周英语单词周报</h2>
            <p class="weekly-date-range">${startStr} — ${endStr}</p>
            <div class="weekly-stats">
                <div class="weekly-stat"><strong>${total}</strong> 本周单词</div>
                <div class="weekly-stat"><strong>${avg}</strong> 日均</div>
            </div>
            ${tableHtml}
            ${words.length > 0 ? `
            <div class="weekly-actions">
                <button class="btn-outline" onclick="app.copyWeeklyMarkdown()">📋 复制 MD</button>
                <button class="btn-outline" onclick="app.downloadWeeklyJSON()">📥 导出 JSON</button>
            </div>
            ` : ''}
        </div>
    `;

    // 存储本周数据供导出使用
    app._weeklyWords = words;
    app._weeklyInfo = { weekNum, startStr, endStr, total, avg };

    modal.classList.add('show');
}

// ---- 周次计算 ----
function getISOWeekNum(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

// ---- 更新周报 Banner 数量 ----
async function updateWeeklyBanner() {
    const banner = document.getElementById('weeklyBanner');
    const countEl = document.getElementById('weeklyWordCount');
    if (!banner || !countEl) return;

    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const words = await getWordsByDateRange(monday.toISOString(), sunday.toISOString());
    countEl.textContent = words.length;
}

// ---- 显示 Toast 通知 ----
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 3000);
}

// ---- 更新单词数量徽章 ----
async function updateWordCountBadge() {
    const count = await getWordCount();
    const badge = document.getElementById('wordCountBadge');
    const countLabel = document.getElementById('wordbookCount');
    if (badge) badge.textContent = `${count} 词`;
    if (countLabel) countLabel.textContent = `共 ${count} 词`;
}

// ---- 格式化今天的日期 ----
function setTodayDate() {
    const el = document.getElementById('todayDate');
    if (el) {
        const d = new Date();
        el.textContent = d.toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
    }
}
