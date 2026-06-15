/* ======================================
   🎨 UI 渲染模块
   ====================================== */

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
                <div class="example-item">"${e.en}"</div>
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
                return `<div class="example-item">"${enText}"</div>`;
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
