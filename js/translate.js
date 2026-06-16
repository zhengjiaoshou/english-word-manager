/* ======================================
   🌐 中英翻译模块（有道智云 API）
   ====================================== */

// ---- 配置（去 https://ai.youdao.com 注册获取） ----
const YOUDAO_CONFIG = {
    appKey: 'YOUR_APP_KEY',        // ← 替换为你的 APP_KEY
    appSecret: 'YOUR_APP_SECRET',  // ← 替换为你的 APP_SECRET
    apiUrl: 'https://openapi.youdao.com/api'
};

let _isConfigured = null;

function isYoudaoConfigured() {
    if (_isConfigured !== null) return _isConfigured;
    _isConfigured = YOUDAO_CONFIG.appKey !== 'YOUR_APP_KEY'
        && YOUDAO_CONFIG.appSecret !== 'YOUR_APP_SECRET';
    return _isConfigured;
}

/**
 * 简单 MD5（用于有道 API 签名）
 */
function md5(str) {
    function rotateLeft(n, s) { return (n << s) | (n >>> (32 - s)); }
    function addUnsigned(x, y) {
        const lsw = (x & 0xFFFF) + (y & 0xFFFF);
        const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }
    function md5cmn(q, a, b, x, s, t) {
        return addUnsigned(rotateLeft(addUnsigned(addUnsigned(a, q), addUnsigned(x, t)), s), b);
    }
    function md5ff(a, b, c, d, x, s, t) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
    function md5gg(a, b, c, d, x, s, t) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
    function md5hh(a, b, c, d, x, s, t) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
    function md5ii(a, b, c, d, x, s, t) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }

    function toUtf8(s) {
        let out = '', c;
        for (let i = 0; i < s.length; i++) {
            c = s.charCodeAt(i);
            if (c < 128) out += String.fromCharCode(c);
            else if (c < 2048) out += String.fromCharCode((c >> 6) | 192) + String.fromCharCode((c & 63) | 128);
            else out += String.fromCharCode((c >> 12) | 224) + String.fromCharCode(((c >> 6) & 63) | 128) + String.fromCharCode((c & 63) | 128);
        }
        return out;
    }

    function binl2hex(bin) {
        const hexTab = '0123456789abcdef';
        let str = '';
        for (let i = 0; i < bin.length * 4; i++) {
            str += hexTab.charAt((bin[i >> 2] >> ((i % 4) * 8 + 4)) & 0xF) + hexTab.charAt((bin[i >> 2] >> ((i % 4) * 8)) & 0xF);
        }
        return str;
    }

    str = toUtf8(str);
    const len = str.length;
    const bin = Array(((len + 8) >> 6) + 15);
    for (let i = 0; i < bin.length; i++) bin[i] = 0;
    for (let i = 0; i < len; i++) bin[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
    bin[len >> 2] |= 0x80 << ((len % 4) * 8);
    bin[bin.length - 2] = len << 3;
    bin[bin.length - 1] = len >>> 29;

    const S11 = 7, S12 = 12, S13 = 17, S14 = 22,
          S21 = 5, S22 = 9, S23 = 14, S24 = 20,
          S31 = 4, S32 = 11, S33 = 16, S34 = 23,
          S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;

    for (let k = 0; k < bin.length; k += 16) {
        const aa = a, bb = b, cc = c, dd = d;
        a = md5ff(a, b, c, d, bin[k + 0], S11, 0xD76AA478);
        d = md5ff(d, a, b, c, bin[k + 1], S12, 0xE8C7B756);
        c = md5ff(c, d, a, b, bin[k + 2], S13, 0x242070DB);
        b = md5ff(b, c, d, a, bin[k + 3], S14, 0xC1BDCEEE);
        a = md5ff(a, b, c, d, bin[k + 4], S11, 0xF57C0FAF);
        d = md5ff(d, a, b, c, bin[k + 5], S12, 0x4787C62A);
        c = md5ff(c, d, a, b, bin[k + 6], S13, 0xA8304613);
        b = md5ff(b, c, d, a, bin[k + 7], S14, 0xFD469501);
        a = md5ff(a, b, c, d, bin[k + 8], S11, 0x698098D8);
        d = md5ff(d, a, b, c, bin[k + 9], S12, 0x8B44F7AF);
        c = md5ff(c, d, a, b, bin[k + 10], S13, 0xFFFF5BB1);
        b = md5ff(b, c, d, a, bin[k + 11], S14, 0x895CD7BE);
        a = md5ff(a, b, c, d, bin[k + 12], S11, 0x6B901122);
        d = md5ff(d, a, b, c, bin[k + 13], S12, 0xFD987193);
        c = md5ff(c, d, a, b, bin[k + 14], S13, 0xA679438E);
        b = md5ff(b, c, d, a, bin[k + 15], S14, 0x49B40821);
        a = md5gg(a, b, c, d, bin[k + 1], S21, 0xF61E2562);
        d = md5gg(d, a, b, c, bin[k + 6], S22, 0xC040B340);
        c = md5gg(c, d, a, b, bin[k + 11], S23, 0x265E5A51);
        b = md5gg(b, c, d, a, bin[k + 0], S24, 0xE9B6C7AA);
        a = md5gg(a, b, c, d, bin[k + 5], S21, 0xD62F105D);
        d = md5gg(d, a, b, c, bin[k + 10], S22, 0x2441453);
        c = md5gg(c, d, a, b, bin[k + 15], S23, 0xD8A1E681);
        b = md5gg(b, c, d, a, bin[k + 4], S24, 0xE7D3FBC8);
        a = md5gg(a, b, c, d, bin[k + 9], S21, 0x21E1CDE6);
        d = md5gg(d, a, b, c, bin[k + 14], S22, 0xC33707D6);
        c = md5gg(c, d, a, b, bin[k + 3], S23, 0xF4D50D87);
        b = md5gg(b, c, d, a, bin[k + 8], S24, 0x455A14ED);
        a = md5gg(a, b, c, d, bin[k + 13], S21, 0xA9E3E905);
        d = md5gg(d, a, b, c, bin[k + 2], S22, 0xFCEFA3F8);
        c = md5gg(c, d, a, b, bin[k + 7], S23, 0x676F02D9);
        b = md5gg(b, c, d, a, bin[k + 12], S24, 0x8D2A4C8A);
        a = md5hh(a, b, c, d, bin[k + 5], S31, 0xFFFA3942);
        d = md5hh(d, a, b, c, bin[k + 8], S32, 0x8771F681);
        c = md5hh(c, d, a, b, bin[k + 11], S33, 0x6D9D6122);
        b = md5hh(b, c, d, a, bin[k + 14], S34, 0xFDE5380C);
        a = md5hh(a, b, c, d, bin[k + 1], S31, 0xA4BEEA44);
        d = md5hh(d, a, b, c, bin[k + 4], S32, 0x4BDECFA9);
        c = md5hh(c, d, a, b, bin[k + 7], S33, 0xF6BB4B60);
        b = md5hh(b, c, d, a, bin[k + 10], S34, 0xBEBFBC70);
        a = md5hh(a, b, c, d, bin[k + 13], S31, 0x289B7EC6);
        d = md5hh(d, a, b, c, bin[k + 0], S32, 0xEAA127FA);
        c = md5hh(c, d, a, b, bin[k + 3], S33, 0xD4EF3085);
        b = md5hh(b, c, d, a, bin[k + 6], S34, 0x4881D05);
        a = md5hh(a, b, c, d, bin[k + 9], S31, 0xD9D4D039);
        d = md5hh(d, a, b, c, bin[k + 12], S32, 0xE6DB99E5);
        c = md5hh(c, d, a, b, bin[k + 15], S33, 0x1FA27CF8);
        b = md5hh(b, c, d, a, bin[k + 2], S34, 0xC4AC5665);
        a = md5ii(a, b, c, d, bin[k + 0], S41, 0xF4292244);
        d = md5ii(d, a, b, c, bin[k + 7], S42, 0x432AFF97);
        c = md5ii(c, d, a, b, bin[k + 14], S43, 0xAB9423A7);
        b = md5ii(b, c, d, a, bin[k + 5], S44, 0xFC93A039);
        a = md5ii(a, b, c, d, bin[k + 12], S41, 0x655B59C3);
        d = md5ii(d, a, b, c, bin[k + 3], S42, 0x8F0CCC92);
        c = md5ii(c, d, a, b, bin[k + 10], S43, 0xFFEFF47D);
        b = md5ii(b, c, d, a, bin[k + 1], S44, 0x85845DD1);
        a = md5ii(a, b, c, d, bin[k + 8], S41, 0x6FA87E4F);
        d = md5ii(d, a, b, c, bin[k + 15], S42, 0xFE2CE6E0);
        c = md5ii(c, d, a, b, bin[k + 6], S43, 0xA3014314);
        b = md5ii(b, c, d, a, bin[k + 13], S44, 0x4E0811A1);
        a = md5ii(a, b, c, d, bin[k + 4], S41, 0xF7537E82);
        d = md5ii(d, a, b, c, bin[k + 11], S42, 0xBD3AF235);
        c = md5ii(c, d, a, b, bin[k + 2], S43, 0x2AD7D2BB);
        b = md5ii(b, c, d, a, bin[k + 9], S44, 0xEB86D391);
        a = addUnsigned(a, aa);
        b = addUnsigned(b, bb);
        c = addUnsigned(c, cc);
        d = addUnsigned(d, dd);
    }
    return binl2hex([a, b, c, d]);
}

/**
 * 调用有道翻译 API（中→英）
 */
async function translateCNtoEN(text) {
    if (!isYoudaoConfigured()) {
        throw new Error('TRANSLATE_NOT_CONFIGURED');
    }

    const salt = String(Date.now());
    const signStr = YOUDAO_CONFIG.appKey + text + salt + YOUDAO_CONFIG.appSecret;
    const sign = md5(signStr);

    const formData = new URLSearchParams();
    formData.append('q', text);
    formData.append('from', 'zh-CHS');
    formData.append('to', 'en');
    formData.append('appKey', YOUDAO_CONFIG.appKey);
    formData.append('salt', salt);
    formData.append('sign', sign);

    try {
        const response = await fetch(YOUDAO_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        });

        if (!response.ok) {
            throw new Error(`翻译 API 返回 ${response.status}`);
        }

        const data = await response.json();
        if (data.errorCode && data.errorCode !== '0') {
            throw new Error(`翻译失败: ${data.errorMsg || data.errorCode}`);
        }

        return {
            translation: data.translation?.[0] || '',
            explains: data.basic?.explains || [],
            word: data.translation?.[0]?.toLowerCase() || ''
        };
    } catch (err) {
        console.error('翻译API错误:', err);
        throw err;
    }
}

/**
 * 中文→英文翻译 + 词典查询流水线
 */
async function searchChineseToEnglish(cnText) {
    // 先判断是否已配置
    if (!isYoudaoConfigured()) {
        throw new Error('TRANSLATE_NOT_CONFIGURED');
    }

    // 1. 翻译
    const trans = await translateCNtoEN(cnText);
    if (!trans.word) {
        throw new Error('翻译结果为空');
    }

    // 2. 词典查询
    let dictResult = null;
    try {
        dictResult = await lookupWord(trans.word);
    } catch (e) {
        console.warn('词典查询失败，使用翻译结果:', e);
    }

    return {
        source: 'translation',
        originalCnText: cnText,
        translatedWord: trans.word,
        translation: trans.translation,
        explains: trans.explains,
        dictionary: dictResult
    };
}
