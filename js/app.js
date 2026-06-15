/* ======================================
   🚀 主应用逻辑
   ====================================== */

const app = {
    // ---- 当前搜索数据（用于添加） ----
    _lastSearchData: null,

    // ---- 初始化 ----
    async init() {
        this.bindEvents();
        setTodayDate();
        await this.refreshUI();

        // 预加载 TTS 语音
        preloadVoices();

        // 显示今日日期
        const input = document.getElementById('searchInput');
        if (input) input.focus();
    },

    // ---- 绑定事件 ----
    bindEvents() {
        // 页面导航
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchPage(btn.dataset.page));
        });

        // 搜索按钮
        document.getElementById('btnSearch').addEventListener('click', () => this.handleSearch());

        // 搜索框回车
        document.getElementById('searchInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });

        // 词库搜索
        document.getElementById('wordbookSearch').addEventListener('input', (e) => {
            this.filterWordbook(e.target.value);
        });

        // 查看全部
        document.getElementById('viewAllLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchPage('wordbook');
            document.querySelector('[data-page="wordbook"]').click();
        });

        // 导出 JSON
        document.getElementById('btnExportJson').addEventListener('click', () => this.exportJSON());

        // 导出 Markdown
        document.getElementById('btnExportMd').addEventListener('click', () => this.exportMD());

        // 导入
        document.getElementById('btnImportJson').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });
        document.getElementById('importFileInput').addEventListener('change', (e) => {
            this.importJSON(e);
        });

        // 弹窗关闭
        document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
        document.getElementById('wordDetailModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });

        // 主题切换
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // 初始化 TTS 语音（部分浏览器需要用户交互后加载）
        document.addEventListener('click', () => {
            if (window.speechSynthesis) window.speechSynthesis.getVoices();
        }, { once: true });
    },

    // ---- 页面切换 ----
    switchPage(page) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        if (page === 'wordbook') {
            this.refreshWordbook();
        }
    },

    // ---- 搜索 ----
    async handleSearch() {
        const input = document.getElementById('searchInput');
        const result = document.getElementById('searchResult');
        const word = input.value.trim();

        if (!word) return;

        renderSearchLoading(result);

        try {
            const data = await lookupWord(word);

            if (!data) {
                renderSearchResult(null, result);
                this._lastSearchData = null;
                return;
            }

            this._lastSearchData = data;
            renderSearchResult(data, result);
        } catch (err) {
            if (err.message === 'NETWORK_ERROR') {
                renderSearchError(result, '⚠️ 网络请求被阻塞<br><small>直接用浏览器打开 HTML 文件会受到 CORS 限制。请双击 <code style="background:rgba(0,0,0,0.1);padding:2px 6px;border-radius:3px">start-server.bat</code> 启动本地服务器后再试。</small>');
            } else {
                renderSearchError(result, '查询出错，请稍后重试');
            }
            this._lastSearchData = null;
        }
    },

    // ---- 从搜索结果添加单词 ----
    async addWordFromSearch() {
        const data = this._lastSearchData;
        if (!data) {
            showToast('请先查询一个单词', 'error');
            return;
        }

        const exists = await wordExists(data.word);
        if (exists) {
            showToast(`"${data.word}" 已存在词库中`, 'info');
            return;
        }

        const examples = data.examples.map(e => ({ en: e.en || e, cn: '' }));

        try {
            await addWord({
                word: data.word,
                phoneticUk: data.phoneticUk,
                phoneticUs: data.phoneticUs,
                definitions: data.definitions,
                examples,
                source: 'dictionary-api'
            });

            const btn = document.getElementById('btnAddFromSearch');
            if (btn) {
                btn.textContent = '✅ 已添加';
                btn.disabled = true;
                btn.classList.add('btn-added-word');
            }

            showToast(`✅ "${data.word}" 已添加到词库`, 'success');
            await this.refreshUI();

            // 播放发音
            playWordAudio(data.word);
        } catch (err) {
            showToast('添加失败: ' + err.message, 'error');
        }
    },

    // ---- 显示单词详情弹窗 ----
    async showWordDetail(id) {
        const all = await getAllWords();
        const word = all.find(w => w.id === id);
        if (!word) {
            showToast('单词不存在', 'error');
            return;
        }
        renderWordDetailModal(word);
    },

    // ---- 删除单词 ----
    async deleteWord(id) {
        if (!confirm('确定要删除这个单词吗？')) return;

        try {
            await deleteWord(id);
            showToast('🗑 已删除', 'success');
            this.closeModal();
            await this.refreshUI();
        } catch (err) {
            showToast('删除失败', 'error');
        }
    },

    // ---- 关闭弹窗 ----
    closeModal() {
        document.getElementById('wordDetailModal').classList.remove('show');
    },

    // ---- 刷新首页 UI ----
    async refreshUI() {
        try {
            const todayWords = await getTodayWords();
            renderWordChips(todayWords, document.getElementById('todayChips'));

            const allWords = await getAllWords();
            renderRecentList(allWords, document.getElementById('recentList'));

            await updateWordCountBadge();
        } catch (err) {
            console.error('刷新UI失败:', err);
        }
    },

    // ---- 刷新词库 ----
    async refreshWordbook(keyword = '') {
        const container = document.getElementById('wordbookTable');
        try {
            const words = keyword
                ? await searchWords(keyword)
                : await getAllWords();
            renderWordbookTable(words, container);
        } catch (err) {
            container.innerHTML = `<div class="empty-state">加载失败，请刷新页面</div>`;
        }
    },

    // ---- 词库搜索过滤 ----
    async filterWordbook(keyword) {
        const container = document.getElementById('wordbookTable');
        try {
            const words = keyword
                ? await searchWords(keyword)
                : await getAllWords();
            renderWordbookTable(words, container);
        } catch (err) {
            console.error('搜索失败:', err);
        }
    },

    // ---- 英美双发音 ----
    async playBothAccents(word, phoneticUk, phoneticUs) {
        if (phoneticUk) {
            showToast(`🇬🇧 英式发音`, 'info');
            await playWordAudio(word, { rate: 0.85 });
        }
        if (phoneticUs) {
            showToast(`🇺🇸 美式发音`, 'info');
            await playWordAudio(word, { rate: 0.9 });
        }
    },

    // ---- 导出 JSON ----
    async exportJSON() {
        try {
            const json = await exportToJSON();
            this.downloadFile(json, `english-words-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
            showToast('⬇ JSON 导出成功', 'success');
        } catch (err) {
            showToast('导出失败: ' + err.message, 'error');
        }
    },

    // ---- 导出 Markdown ----
    async exportMD() {
        try {
            const md = await exportToMarkdown();
            this.downloadFile(md, `english-words-${new Date().toISOString().split('T')[0]}.md`, 'text/markdown');
            showToast('📝 Markdown 导出成功', 'success');
        } catch (err) {
            showToast('导出失败: ' + err.message, 'error');
        }
    },

    // ---- 导入 JSON ----
    async importJSON(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const result = await importFromJSON(text);
            showToast(`📂 导入完成: 新增 ${result.imported} 个，跳过 ${result.skipped} 个`, 'success');
            await this.refreshUI();
            if (document.getElementById('page-wordbook').classList.contains('active')) {
                this.refreshWordbook();
            }
        } catch (err) {
            showToast(err.message, 'error');
        }

        // 重置 input 以便重复导入同一个文件
        event.target.value = '';
    },

    // ---- 下载文件 ----
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // ---- 主题切换 ----
    toggleTheme() {
        const html = document.documentElement;
        const btn = document.getElementById('themeToggle');
        if (html.getAttribute('data-theme') === 'dark') {
            html.removeAttribute('data-theme');
            btn.textContent = '🌙';
            localStorage.setItem('ewm-theme', 'light');
        } else {
            html.setAttribute('data-theme', 'dark');
            btn.textContent = '☀️';
            localStorage.setItem('ewm-theme', 'dark');
        }
    },

    // ---- 恢复主题 ----
    restoreTheme() {
        const saved = localStorage.getItem('ewm-theme');
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.getElementById('themeToggle').textContent = '☀️';
        }
    }
};

// ---- DOM 加载完成后启动 ----
document.addEventListener('DOMContentLoaded', () => {
    app.restoreTheme();
    app.init();
});
