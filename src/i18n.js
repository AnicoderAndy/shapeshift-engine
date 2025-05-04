import en from './lang/en.json';
import zh from './lang/zh.json';

const messages = { en, zh };
let currentLang = 'zh';
setLang(currentLang);

export function switchLang() {
    currentLang = currentLang === 'en' ? 'zh' : 'en';
    renderTexts();
}

export function setLang(lang) {
    if (messages[lang]) currentLang = lang;
    renderTexts();
}

export function getMsg(key) {
    const parts = key.split('.');
    let obj = messages[currentLang];

    for (const part of parts) {
        if (obj && part in obj) {
            obj = obj[part];
        } else {
            return key;
        }
    }

    return obj;
}

function renderTexts() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        el.innerText = getMsg(key);
    });
    document.documentElement.setAttribute('lang', currentLang);
}
