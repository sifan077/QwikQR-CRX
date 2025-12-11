document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('text-input');
    const generateBtn = document.getElementById('generate-btn');
    const qrcodeDiv = document.getElementById('qrcode');
    let qrcode = null;

    // 初始化显示占位符
    showPlaceholder();

    generateBtn.addEventListener('click', generateQRCode);
    textInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateQRCode();
        }
    });

    function generateQRCode() {
        const text = textInput.value.trim();
        
        if (!text) {
            showPlaceholder();
            return;
        }

        // 清除之前的二维码或占位符
        qrcodeDiv.innerHTML = '';
        
        // 生成新的二维码
        qrcode = new QRCode(qrcodeDiv, {
            text: text,
            width: 180,
            height: 180,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    function showPlaceholder() {
        qrcodeDiv.innerHTML = `
            <div class="placeholder-container">
                <div class="placeholder-icon">📱</div>
                <p class="placeholder-text">输入内容生成二维码</p>
            </div>
        `;
    }

    // 页面加载时自动聚焦输入框
    textInput.focus();
});