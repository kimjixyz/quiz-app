// log.js

// === DOM & Global Constants (index.html에서 접근 가능한 전역 변수로 가정) ===
const logViewContainer = document.getElementById('logViewContainer');
const logContainer = document.getElementById('logContainer');
const horizontalSplitter = document.getElementById('horizontalSplitter'); 
const logViewToggleCheckbox = document.getElementById('logViewToggleCheckbox');

// index.html에서 정의된 상수 및 변수를 사용합니다.
const topToolbarHeight = 1.875 * 16; 
const SPLITTER_HEIGHT = 0.5 * 16; 
const MIN_MAIN_HEIGHT = 50; 
const LOG_DEFAULT_HEIGHT = 100;

// 로그 뷰의 이전 높이를 저장하는 전역 변수 (메모리)
window.lastLogViewHeight = LOG_DEFAULT_HEIGHT; 
const STATE_KEYS = { LOG_VIEW_VISIBLE: 'logViewVisible' };


/**
 * 콘솔 영역에 로그 메시지를 추가하고 스크롤을 맨 아래로 이동합니다. (전역 노출)
 * @param {string} message - 표시할 로그 메시지
 * @param {string} [type='status'] - 로그 유형 ('status', 'error', 'warning' 등)
 */
window.appendLog = function(message, type = 'status') {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    const logEntry = document.createElement('p');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timeString}] ${message}`;
    
    logContainer.appendChild(logEntry);
    
    // 스크롤을 항상 맨 아래로 이동
    logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * 로그 뷰의 보이기/숨기기 상태를 제어하고 localStorage에 저장합니다.
 * @param {boolean} isVisible - 로그 뷰를 보이게 할지(true), 숨기게 할지(false)
 */
window.setLogViewVisibility = function(isVisible) {
    const viewportHeight = window.innerHeight;
    const totalFlexHeight = viewportHeight - topToolbarHeight;

    if (isVisible) {
        let restoredHeight = window.lastLogViewHeight; 
        const maxLogHeight = totalFlexHeight - SPLITTER_HEIGHT - MIN_MAIN_HEIGHT;
        
        // 메인 뷰의 최소 높이(50px)를 보장하도록 최대 로그 높이 제한
        if (restoredHeight > maxLogHeight) {
            restoredHeight = maxLogHeight;
        }
        
        logViewContainer.style.height = `${restoredHeight}px`;
        // mainLayout은 index.html에서 높이가 재정의되어야 하므로 이 함수에서는 logViewContainer만 제어합니다.
        // 메인 레이아웃의 높이 조정은 index.html의 드래그 및 초기화 로직에서 처리합니다.
        horizontalSplitter.classList.remove('hidden');
        logViewToggleCheckbox.checked = true;
        localStorage.setItem(STATE_KEYS.LOG_VIEW_VISIBLE, 'true');
        window.appendLog('로그 뷰가 표시되었습니다.', 'status');
    } else {
        // 숨기기 전에 현재 높이를 저장
        window.lastLogViewHeight = logViewContainer.clientHeight > 0 ? logViewContainer.clientHeight : LOG_DEFAULT_HEIGHT;
        
        logViewContainer.style.height = '0px';
        horizontalSplitter.classList.add('hidden');
        logViewToggleCheckbox.checked = false;
        localStorage.setItem(STATE_KEYS.LOG_VIEW_VISIBLE, 'false');
        window.appendLog('로그 뷰가 숨겨졌습니다.', 'status');
    }
}

/**
 * localStorage에서 로그 뷰의 보이기/숨기기 상태를 불러옵니다.
 * @returns {boolean} 로그 뷰가 보여야 하는지 여부 (기본값: true)
 */
window.loadLogViewVisibility = function() {
    const savedState = localStorage.getItem(STATE_KEYS.LOG_VIEW_VISIBLE);
    // 상태가 저장되지 않았거나 'true'인 경우 true 반환
    return savedState === null || savedState === 'true'; 
}
