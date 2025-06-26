/**
 * Translation Module - Handles English to Chinese translation
 */

// Translation cache to avoid redundant API calls
const translationCache = new Map();

/**
 * Translate text from English to Chinese using Google Translate API (free tier)
 * @param {string} text - Text to translate
 * @returns {Promise<string>} - Translated text
 */
export async function translateToChineseMicrosoft(text) {
    if (!text || text.trim() === '') return text;
    
    // Check cache first
    if (translationCache.has(text)) {
        return translationCache.get(text);
    }

    try {
        // Using Microsoft Translator (free tier, no API key required for small amounts)
        const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh`);
        const data = await response.json();
        
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            const translatedText = data.responseData.translatedText;
            translationCache.set(text, translatedText);
            return translatedText;
        } else {
            console.warn('Translation failed for:', text);
            return text; // Return original text if translation fails
        }
    } catch (error) {
        console.error('Translation error:', error);
        return text; // Return original text if translation fails
    }
}

/**
 * Alternative translation using a simple dictionary for common technical terms
 * This serves as a fallback and for better accuracy on technical terms
 */
const technicalTermsDictionary = {
    // Common technical terms
    'cable': '电缆',
    'wire': '电线',
    'connector': '连接器',
    'adapter': '适配器',
    'charger': '充电器',
    'battery': '电池',
    'screen': '屏幕',
    'display': '显示器',
    'keyboard': '键盘',
    'mouse': '鼠标',
    'speaker': '扬声器',
    'microphone': '麦克风',
    'camera': '摄像头',
    'sensor': '传感器',
    'processor': '处理器',
    'memory': '内存',
    'storage': '存储',
    'hard drive': '硬盘',
    'solid state drive': '固态硬盘',
    'motherboard': '主板',
    'graphics card': '显卡',
    'power supply': '电源',
    'cooling fan': '散热风扇',
    'heat sink': '散热器',
    'case': '机箱',
    'monitor': '显示器',
    'printer': '打印机',
    'scanner': '扫描仪',
    'router': '路由器',
    'switch': '交换机',
    'modem': '调制解调器',
    'ethernet': '以太网',
    'wifi': '无线网络',
    'bluetooth': '蓝牙',
    'usb': 'USB',
    'hdmi': 'HDMI',
    'audio': '音频',
    'video': '视频',
    'software': '软件',
    'hardware': '硬件',
    'driver': '驱动程序',
    'firmware': '固件',
    'operating system': '操作系统',
    'application': '应用程序',
    'database': '数据库',
    'server': '服务器',
    'network': '网络',
    'internet': '互联网',
    'website': '网站',
    'email': '电子邮件',
    'file': '文件',
    'folder': '文件夹',
    'document': '文档',
    'image': '图像',
    'photo': '照片',
    'picture': '图片',
    'video': '视频',
    'audio': '音频',
    'music': '音乐',
    'sound': '声音'
};

/**
 * Enhanced translation that combines dictionary lookup with API translation
 * @param {string} text - Text to translate
 * @returns {Promise<string>} - Translated text
 */
export async function translateToChineseEnhanced(text) {
    if (!text || text.trim() === '') return text;

    // First, try dictionary lookup for exact matches
    const lowerText = text.toLowerCase();
    if (technicalTermsDictionary[lowerText]) {
        return technicalTermsDictionary[lowerText];
    }

    // Check for partial matches in the dictionary
    let enhancedText = text;
    for (const [english, chinese] of Object.entries(technicalTermsDictionary)) {
        const regex = new RegExp(`\\b${english}\\b`, 'gi');
        enhancedText = enhancedText.replace(regex, chinese);
    }

    // If the text was completely translated by dictionary, return it
    if (enhancedText !== text && !/[a-zA-Z]/.test(enhancedText)) {
        return enhancedText;
    }

    // Otherwise, use API translation for the remaining text
    return await translateToChineseMicrosoft(text);
}

/**
 * Batch translate multiple texts with rate limiting
 * @param {Array<string>} texts - Array of texts to translate
 * @param {Function} progressCallback - Callback to report progress
 * @returns {Promise<Array<string>>} - Array of translated texts
 */
export async function batchTranslate(texts, progressCallback = null) {
    const translatedTexts = [];
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        
        if (progressCallback) {
            progressCallback(i, texts.length, `Translating item ${i + 1} of ${texts.length}...`);
        }
        
        const translated = await translateToChineseEnhanced(text);
        translatedTexts.push(translated);
        
        // Add delay to respect rate limits (500ms between requests)
        if (i < texts.length - 1) {
            await delay(500);
        }
    }
    
    return translatedTexts;
}

/**
 * Clear translation cache
 */
export function clearTranslationCache() {
    translationCache.clear();
}
