/* ======================================
   🔊 TTS 播放模块
   ====================================== */

// TTS 缓存（内存中）
const audioCache = new Map();

/**
 * 使用 Web Speech API 生成并播放语音
 * Windows 10/11 + Edge/Chrome 下使用 Microsoft Jenny 引擎
 * 与 Python edge-tts 同源，音质一致
 */
function speakWord(word, rate = 0.9) {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            reject(new Error('浏览器不支持 TTS'));
            return;
        }

        // 优先选择美式英语女声
        const voices = window.speechSynthesis.getVoices();

        let voice = voices.find(v =>
            v.name.toLowerCase().includes('jenny') &&
            v.lang.startsWith('en')
        );

        if (!voice) {
            voice = voices.find(v =>
                v.name.toLowerCase().includes('microsoft') &&
                v.lang === 'en-US' &&
                v.name.toLowerCase().includes('female')
            );
        }

        if (!voice) {
            voice = voices.find(v =>
                v.lang === 'en-US' &&
                v.name.toLowerCase().includes('female')
            );
        }

        if (!voice) {
            voice = voices.find(v => v.lang === 'en-US');
        }

        if (!voice) {
            voice = voices.find(v => v.lang.startsWith('en'));
        }

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.voice = voice;
        utterance.lang = 'en-US';
        utterance.rate = rate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => resolve();
        utterance.onerror = (e) => reject(e);

        // 取消之前的语音
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
}

/**
 * 预加载语音列表（某些浏览器需要用户交互后加载）
 */
function preloadVoices() {
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
    }
}

/**
 * 使用 MediaRecorder 录制 TTS 音频并返回 Blob
 * 用于缓存和离线回放
 */
function recordTTS(word) {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            reject(new Error('浏览器不支持 TTS'));
            return;
        }

        const voices = window.speechSynthesis.getVoices();
        let voice = voices.find(v =>
            v.name.toLowerCase().includes('jenny') && v.lang.startsWith('en')
        );
        if (!voice) voice = voices.find(v => v.lang === 'en-US');

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.voice = voice;
        utterance.lang = 'en-US';
        utterance.rate = 0.9;

        // 使用 AudioContext 录制
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const dest = audioCtx.createMediaStreamDestination();
            const mediaRecorder = new MediaRecorder(dest.stream);
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                resolve(blob);
            };

            mediaRecorder.start();

            // SpeechSynthesis 不支持直接路由到 MediaStream
            // 所以此方法实际不可行，改用简单的缓存方案
            mediaRecorder.stop();
            reject(new Error('录制不可用，使用简单播放'));
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * 播放单词发音（主入口）
 * @param {string} word - 要播放的单词
 * @param {object} options
 * @param {number} options.rate - 语速 (0.5-2.0)
 */
async function playWordAudio(word, options = {}) {
    const { rate = 0.9 } = options;

    try {
        await speakWord(word, rate);
        return true;
    } catch (error) {
        console.error('TTS 播放失败:', error);
        return false;
    }
}
