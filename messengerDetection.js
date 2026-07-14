/**
 * Detects if the app is running inside Facebook Messenger and displays warning
 */

function isOpenedInMessenger() {
    const ua = navigator.userAgent || '';
    
    // Check for Messenger-specific user agent indicators
    const messengerPatterns = [
        /FB/i,                        // General Facebook indicator
        /Facebook/i,
        /FBAV/i,                      // Facebook App for Android/iOS
        /MessengerForiOS/i,
        /Messenger/i,
        /\[FBAN/i,                    // FBAN = Facebook App Native
        /facebookexternalhit/i,
    ];
    
    return messengerPatterns.some(pattern => pattern.test(ua));
}

function showMessengerWarning() {
    // Get clean URL without query parameters
    const currentUrl = window.location.origin + window.location.pathname;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'messenger-warning-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    `;
    
    // Create warning box
    const warningBox = document.createElement('div');
    warningBox.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
    `;
    
    // Create content
    const title = document.createElement('h2');
    title.textContent = '⚠️ Open in Browser';
    title.style.cssText = `
        margin: 0 0 15px 0;
        color: #e74c3c;
        font-size: 24px;
    `;
    
    const message = document.createElement('p');
    message.textContent = 'This app works best when opened in your phone\'s browser, not Messenger. Messenger\'s browser breaks the app\'s functionality.';
    message.style.cssText = `
        margin: 0 0 20px 0;
        color: #333;
        font-size: 16px;
        line-height: 1.5;
    `;
    
    // Create URL box
    const urlBox = document.createElement('div');
    urlBox.style.cssText = `
        background: #f0f0f0;
        border: 2px solid #3498db;
        border-radius: 8px;
        padding: 15px;
        margin: 20px 0;
        text-align: left;
    `;
    
    const urlLabel = document.createElement('label');
    urlLabel.textContent = 'Copy this URL:';
    urlLabel.style.cssText = `
        display: block;
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
        font-weight: 600;
    `;
    
    const urlDisplay = document.createElement('div');
    urlDisplay.style.cssText = `
        display: flex;
        gap: 10px;
        align-items: center;
    `;
    
    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.value = currentUrl;
    urlInput.readOnly = true;
    urlInput.style.cssText = `
        flex: 1;
        padding: 10px;
        border: 1px solid #bbb;
        border-radius: 4px;
        font-size: 14px;
        font-family: monospace;
        background: white;
    `;
    
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.style.cssText = `
        padding: 10px 20px;
        background: #3498db;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.2s;
    `;
    
    copyBtn.onmouseover = () => copyBtn.style.background = '#2980b9';
    copyBtn.onmouseout = () => copyBtn.style.background = '#3498db';
    
    copyBtn.onclick = () => {
        urlInput.select();
        document.execCommand('copy');
        
        // Show confirmation
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        copyBtn.style.background = '#27ae60';
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.style.background = '#3498db';
        }, 2000);
    };
    
    urlDisplay.appendChild(urlInput);
    urlDisplay.appendChild(copyBtn);
    urlBox.appendChild(urlLabel);
    urlBox.appendChild(urlDisplay);
    
    const instructions = document.createElement('ol');
    instructions.style.cssText = `
        text-align: left;
        margin: 15px 0;
        padding-left: 20px;
        color: #333;
        font-size: 14px;
        line-height: 1.8;
    `;
    
    const step1 = document.createElement('li');
    step1.textContent = 'Copy the URL above';
    
    const step2 = document.createElement('li');
    step2.textContent = 'Open your phone\'s browser (Safari, Chrome, etc.)';
    
    const step3 = document.createElement('li');
    step3.textContent = 'Paste the URL into the address bar and open it';
    
    instructions.appendChild(step1);
    instructions.appendChild(step2);
    instructions.appendChild(step3);
    
    warningBox.appendChild(title);
    warningBox.appendChild(message);
    warningBox.appendChild(urlBox);
    warningBox.appendChild(instructions);
    
    overlay.appendChild(warningBox);
    document.body.insertBefore(overlay, document.body.firstChild);
    
    // Dim the rest of the page
    document.body.style.overflow = 'hidden';
    document.body.style.opacity = '0.5';
}

// Run detection on page load
document.addEventListener('DOMContentLoaded', () => {
    if (isOpenedInMessenger()) {
        showMessengerWarning();
    }
});

// Also check immediately if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (isOpenedInMessenger()) {
            showMessengerWarning();
        }
    });
} else {
    if (isOpenedInMessenger()) {
        showMessengerWarning();
    }
}
