/* ======================================
   🔊 TTS 播放模块（双引擎：Web Speech + Edge TTS）
   ====================================== */

// 音频缓存（内存）
const audioCache = new Map();

/**
 * 检测是否为移动设备
 */
function isMobile() {
    return /Android|iPhone|iPad|iPod|webOS/i.test(navigator.userAgent);
}

/**
 * 引擎一：Web Speech API
 * 桌面端主力（Windows/Mac Edge & Chrome），零延迟
 */
function speakWithWebSpeech(word, rate = 0.9) {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            reject(new Error('speechSynthesis unavailable'));
            return;
        }

        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) {
            reject(new Error('no voices loaded'));
            return;
        }

        // 优先美式女声
        let voice = voices.find(v =>
            v.name.toLowerCase().includes('jenny') && v.lang.startsWith('en')
        );
        if (!voice) {
            voice = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('female'));
        }
        if (!voice) {
            voice = voices.find(v => v.lang === 'en-US');
        }
        if (!voice) {
            voice = voices.find(v => v.lang.startsWith('en'));
        }

        if (!voice) {
            reject(new Error('no English voice found'));
            return;
        }

        const utterance = new SpeechSynthesisUtterance(word);
        utterance.voice = voice;
        utterance.lang = 'en-US';
        utterance.rate = rate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        let finished = false;
        utterance.onend = () => { finished = true; resolve(); };
        utterance.onerror = (e) => {
            if (!finished) reject(e);
        };

        // 超时保护（部分移动端 onend 永不触发）
        setTimeout(() => {
            if (!finished) {
                window.speechSynthesis.cancel();
                reject(new Error('TTS timeout'));
            }
        }, 5000);

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
}

/**
 * 引擎二：Edge TTS 在线 API
 * 移动端主力 + 桌面端备用，通过微软云端生成真实 MP3
 * 语音：en-US-JennyNeural（美式女声）
 */
async function speakWithEdgeTTS(word) {
    const SSML = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts"
       xml:lang="en-US">
  <voice name="en-US-JennyNeural">
    <prosody rate="medium" pitch="+0Hz">
      ${word}
    </prosody>
  </voice>
</speak>`.trim();

    try {
        const response = await fetch(
            'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: SSML
            }
        );

        if (!response.ok) {
            throw new Error(`Edge TTS HTTP ${response.status}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                resolve();
            };
            audio.onerror = (e) => {
                URL.revokeObjectURL(audioUrl);
                reject(e);
            };
            audio.src = audioUrl;
            audio.play().catch(reject);
        });
    } catch (err) {
        throw new Error(`Edge TTS failed: ${err.message}`);
    }
}

/**
 * 停止所有正在进行的语音播放
 */
function cancelCurrentSpeech() {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

/**
 * 引擎一扩展：Web Speech API — 播放句子
 * 桌面端主力，语速偏慢适合跟读
 */
function speakSentenceWithWebSpeech(text, lang = 'en-US') {
    return new Promise((resolve, reject) => {
        if (!window.speechSynthesis) {
            reject(new Error('speechSynthesis unavailable'));
            return;
        }

        const voices = window.speechSynthesis.getVoices();
        if (!voices.length) {
            reject(new Error('no voices loaded'));
            return;
        }

        let voice = voices.find(v =>
            v.name.toLowerCase().includes('jenny') && v.lang.startsWith('en')
        );
        if (!voice) {
            voice = voices.find(v => v.lang === lang && v.name.toLowerCase().includes('female'));
        }
        if (!voice) {
            voice = voices.find(v => v.lang === lang);
        }
        if (!voice) {
            voice = voices.find(v => v.lang.startsWith('en'));
        }
        if (!voice) {
            reject(new Error('no voice found'));
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = lang;
        utterance.rate = 0.75;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        let finished = false;
        utterance.onend = () => { finished = true; resolve(); };
        utterance.onerror = (e) => { if (!finished) reject(e); };

        setTimeout(() => {
            if (!finished) {
                window.speechSynthesis.cancel();
                reject(new Error('sentence TTS timeout'));
            }
        }, 10000);

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
}

/**
 * 引擎二扩展：Edge TTS — 播放句子
 * 移动端主力
 */
async function speakSentenceWithEdgeTTS(text, lang = 'en-US') {
    const voice = lang === 'en-GB' ? 'en-GB-SoniaNeural' : 'en-US-JennyNeural';
    const SSML = `
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis"
       xmlns:mstts="http://www.w3.org/2001/mstts"
       xml:lang="${lang}">
  <voice name="${voice}">
    <prosody rate="slow" pitch="+0Hz">
      ${text}
    </prosody>
  </voice>
</speak>`.trim();

    try {
        const response = await fetch(
            'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/ssml+xml',
                    'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: SSML
            }
        );

        if (!response.ok) throw new Error(`Edge TTS HTTP ${response.status}`);

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);

        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.onended = () => { URL.revokeObjectURL(audioUrl); resolve(); };
            audio.onerror = (e) => { URL.revokeObjectURL(audioUrl); reject(e); };
            audio.src = audioUrl;
            audio.play().catch(reject);
        });
    } catch (err) {
        throw new Error(`Edge TTS sentence failed: ${err.message}`);
    }
}

/**
 * 播放整句（主入口）
 * @param {string} text - 要朗读的句子
 * @param {string} lang - 语言 'en-US' | 'en-GB'
 */
async function speakSentence(text, lang = 'en-US') {
    cancelCurrentSpeech();

    if (isMobile()) {
        try {
            await speakSentenceWithEdgeTTS(text, lang);
            return true;
        } catch (edgeErr) {
            console.warn('Edge TTS sentence failed, trying Web Speech:', edgeErr);
            try {
                await speakSentenceWithWebSpeech(text, lang);
                return true;
            } catch (wsErr) {
                console.warn('Both sentence TTS engines failed:', wsErr);
                return false;
            }
        }
    } else {
        try {
            await speakSentenceWithWebSpeech(text, lang);
            return true;
        } catch (wsErr) {
            console.warn('Web Speech sentence failed, trying Edge TTS:', wsErr);
            try {
                await speakSentenceWithEdgeTTS(text, lang);
                return true;
            } catch (edgeErr) {
                console.warn('Both sentence TTS engines failed:', edgeErr);
                return false;
            }
        }
    }
}

/**
 * 预加载语音列表
 */
function preloadVoices() {
    if (window.speechSynthesis) {
        window.speechSynthesis.getVoices();
        // 移动端需要多次触发才加载
        setTimeout(() => window.speechSynthesis?.getVoices(), 100);
        setTimeout(() => window.speechSynthesis?.getVoices(), 500);
    }
}

/**
 * 播放单词发音（主入口，自动选择引擎）
 */
async function playWordAudio(word, options = {}) {
    const { rate = 0.9 } = options;

    // 策略：桌面端优先 Web Speech，移动端优先 Edge TTS
    if (isMobile()) {
        // 移动端：直接用 Edge TTS（Web Speech 在手机上太不稳定）
        try {
            await speakWithEdgeTTS(word);
            return true;
        } catch (edgeErr) {
            // Edge TTS 也失败了，最后挣扎一下 Web Speech
            console.warn('Edge TTS failed, trying Web Speech:', edgeErr);
            try {
                await speakWithWebSpeech(word, rate);
                return true;
            } catch (wsErr) {
                console.error('Both TTS engines failed:', wsErr);
                return false;
            }
        }
    } else {
        // 桌面端：先试 Web Speech（零延迟）
        try {
            await speakWithWebSpeech(word, rate);
            return true;
        } catch (wsErr) {
            // Web Speech 失败，切 Edge TTS
            console.warn('Web Speech failed, trying Edge TTS:', wsErr);
            try {
                await speakWithEdgeTTS(word);
                return true;
            } catch (edgeErr) {
                console.error('Both TTS engines failed:', edgeErr);
                return false;
            }
        }
    }
}
