// 默认设置
const defaultSettings = {
    qrSize: 180,
    qrColorDark: '#000000',
    qrColorLight: '#ffffff',
    qrCorrectLevel: 'H',
    defaultAction: 'none',
    autoDetectUrl: true
};

// 当前设置
let currentSettings = { ...defaultSettings };

// DOM 元素
const elements = {
    qrSize: document.getElementById('qr-size'),
    qrSizeValue: document.getElementById('qr-size-value'),
    qrColorDark: document.getElementById('qr-color-dark'),
    qrColorDarkValue: document.getElementById('qr-color-dark-value'),
    qrColorLight: document.getElementById('qr-color-light'),
    qrColorLightValue: document.getElementById('qr-color-light-value'),
    qrCorrectLevel: document.getElementById('qr-correct-level'),
    defaultAction: document.getElementById('default-action'),
    autoDetectUrl: document.getElementById('auto-detect-url'),
    saveBtn: document.getElementById('save-btn'),
    resetBtn: document.getElementById('reset-btn'),
    toast: document.getElementById('toast')
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
});

// 加载设置
function loadSettings() {
    chrome.storage.local.get(['qrSettings'], function(result) {
        if (result.qrSettings) {
            currentSettings = { ...defaultSettings, ...result.qrSettings };
        }
        updateUI();
    });
}

// 更新 UI 显示
function updateUI() {
    elements.qrSize.value = currentSettings.qrSize;
    elements.qrSizeValue.textContent = currentSettings.qrSize;
    
    elements.qrColorDark.value = currentSettings.qrColorDark;
    elements.qrColorDarkValue.textContent = currentSettings.qrColorDark;
    
    elements.qrColorLight.value = currentSettings.qrColorLight;
    elements.qrColorLightValue.textContent = currentSettings.qrColorLight;
    
    elements.qrCorrectLevel.value = currentSettings.qrCorrectLevel;
    
    elements.defaultAction.value = currentSettings.defaultAction;
    
    elements.autoDetectUrl.checked = currentSettings.autoDetectUrl;
}

// 设置事件监听器
function setupEventListeners() {
    // 二维码大小滑块
    elements.qrSize.addEventListener('input', function() {
        elements.qrSizeValue.textContent = this.value;
    });

    // 前景色选择器
    elements.qrColorDark.addEventListener('input', function() {
        elements.qrColorDarkValue.textContent = this.value;
    });

    // 背景色选择器
    elements.qrColorLight.addEventListener('input', function() {
        elements.qrColorLightValue.textContent = this.value;
    });

    // 保存按钮
    elements.saveBtn.addEventListener('click', saveSettings);

    // 恢复默认按钮
    elements.resetBtn.addEventListener('click', resetSettings);
}

// 保存设置
function saveSettings() {
    currentSettings = {
        qrSize: parseInt(elements.qrSize.value),
        qrColorDark: elements.qrColorDark.value,
        qrColorLight: elements.qrColorLight.value,
        qrCorrectLevel: elements.qrCorrectLevel.value,
        defaultAction: elements.defaultAction.value,
        autoDetectUrl: elements.autoDetectUrl.checked
    };

    chrome.storage.local.set({ qrSettings: currentSettings }, function() {
        showToast('设置已保存');
    });
}

// 恢复默认设置
function resetSettings() {
    if (confirm('确定要恢复默认设置吗？')) {
        currentSettings = { ...defaultSettings };
        updateUI();
        
        chrome.storage.local.set({ qrSettings: currentSettings }, function() {
            showToast('已恢复默认设置');
        });
    }
}

// 显示提示消息
function showToast(message) {
    elements.toast.querySelector('.toast-message').textContent = message;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 2000);
}