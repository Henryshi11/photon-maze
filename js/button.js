
const icons = {
    mouse: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>`,
    alert: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    zap: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    eyePulse: `<svg class="animate-pulse" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eye: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.09"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`
};

const state = {
    level: 0,
    clickCount: 0,
    won: false,
    mouseSpeed: 0,
    lastMousePos: { x: 0, y: 0 },
    lastTime: Date.now(),
    dodgeTimer: null,
    position: { x: 50, y: 50 }
};

const btn = document.getElementById('game-button');
const btnIcon = document.getElementById('btn-icon');
const btnText = document.getElementById('btn-text');
const levelInfo = document.getElementById('level-info');
const l4Hint = document.getElementById('l4-hint');
const speedBar = document.getElementById('speed-bar');
const failMsg = document.getElementById('fail-msg');
const victoryScreen = document.getElementById('victory-screen');
const restartBtn = document.getElementById('restart-btn');

function init() {
    updatePosition();

    window.addEventListener('mousemove', (e) => {
        const now = Date.now();
        const dt = now - state.lastTime;

        if (dt > 20) {
            const dx = e.clientX - state.lastMousePos.x;
            const dy = e.clientY - state.lastMousePos.y;
            state.mouseSpeed = Math.sqrt(dx * dx + dy * dy) / dt;

            state.lastMousePos = { x: e.clientX, y: e.clientY };
            state.lastTime = now;

            if (state.level === 4) {
                updateSpeedBar();
                const isFast = state.mouseSpeed > 0.1;
                const hasPurple = btn.classList.contains('bg-purple-600');
                if ((isFast && !hasPurple) || (!isFast && hasPurple)) {
                    updateUI();
                }
            }
        }
    });

    btn.addEventListener('mouseenter', () => tryDodge('enter'));
    btn.addEventListener('mousemove', () => tryDodge('move'));
    btn.addEventListener('mousedown', handleClick);

    restartBtn.addEventListener('click', resetGame);
}


function updatePosition() {
    btn.style.left = state.position.x + '%';
    btn.style.top = state.position.y + '%';
}

function moveButton() {
    clearTimeout(state.dodgeTimer);
    const padding = 10;
    state.position.x = Math.random() * (100 - padding * 2) + padding;
    state.position.y = Math.random() * (100 - padding * 2) + padding;
    updatePosition();
}

function tryDodge(type) {
    if (state.won || state.level === 0) return;

    if (type === 'enter') clearTimeout(state.dodgeTimer);

    if (state.level === 4) {
        if (state.mouseSpeed > 0.15) {
            moveButton();
        }
        return;
    }

    // Level 1
    if (state.level === 1) {
        if (type === 'move') return;
        state.dodgeTimer = setTimeout(moveButton, 250);
        return;
    }

    // Level 2
    if (state.level === 2) {
        if (type === 'enter' || Math.random() > 0.3) {
            moveButton();
        }
        return;
    }

    // Level 3
    if (state.level === 3) {
        moveButton();
        return;
    }
}

function handleClick() {
    if (state.won) return;

    // Level 4
    if (state.level === 4) {
        if (state.mouseSpeed > 0.1) {
            moveButton();
            showFailMessage();
            return;
        }
    }

    clearTimeout(state.dodgeTimer);
    state.clickCount++;

    const oldLevel = state.level;

    if (state.level === 0) state.level = 1;
    else if (state.level === 1 && state.clickCount > 3) state.level = 2;
    else if (state.level === 2 && state.clickCount > 6) state.level = 3;
    else if (state.level === 3 && state.clickCount > 8) state.level = 4;
    else if (state.level === 4) {
        state.won = true;
        showVictory();
        return;
    } else {
        moveButton();
    }

    updateUI();
}

function showFailMessage() {
    failMsg.classList.remove('hidden');
    if (state.failTimer) clearTimeout(state.failTimer);
    state.failTimer = setTimeout(() => {
        failMsg.classList.add('hidden');
    }, 1000);
}

function showVictory() {
    victoryScreen.classList.remove('hidden');
    victoryScreen.classList.add('animate-fade-in');
    btn.classList.add('hidden');
}

function resetGame() {
    state.level = 0;
    state.clickCount = 0;
    state.won = false;
    state.position = { x: 50, y: 50 };
    state.mouseSpeed = 0;

    victoryScreen.classList.add('hidden');
    victoryScreen.classList.remove('animate-fade-in');
    btn.classList.remove('hidden');

    updatePosition();
    updateUI();
}

function updateSpeedBar() {
    const width = Math.min(state.mouseSpeed * 100, 100);
    speedBar.style.width = width + '%';

    if (state.mouseSpeed > 0.3) {
        speedBar.classList.remove('bg-green-500');
        speedBar.classList.add('bg-red-500');
    } else {
        speedBar.classList.remove('bg-red-500');
        speedBar.classList.add('bg-green-500');
    }
}

function updateUI() {
    levelInfo.textContent = `Level ${state.level} / 4 (Clicks: ${state.clickCount})`;

    if (state.level === 4) l4Hint.classList.remove('hidden');
    else l4Hint.classList.add('hidden');

    const baseClass = "shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-3 font-bold text-white whitespace-nowrap border-b-4 border-black/20 active:border-b-0 active:translate-y-1 absolute transition-all";

    switch (state.level) {
        case 0:
            btn.className = `${baseClass} bg-blue-600 hover:bg-blue-700 scale-100 duration-300 ease-out`;
            btnText.textContent = "Dont Hit Me!";
            btnIcon.innerHTML = icons.mouse;
            break;
        case 1:
            btn.className = `${baseClass} bg-yellow-500 hover:bg-yellow-600 scale-100 duration-300 ease-out`;
            btnText.textContent = "Hey! Stop!";
            btnIcon.innerHTML = icons.alert;
            break;
        case 2:
            btn.className = `${baseClass} bg-orange-500 hover:bg-orange-600 scale-75 duration-150 ease-linear`;
            btnText.textContent = "I am serious!";
            btnIcon.innerHTML = icons.zap;
            break;
        case 3:
            btn.className = `${baseClass} bg-red-600 hover:bg-red-700 scale-125 duration-75 ease-linear animate-bounce-crazy`;
            btnText.textContent = "Get AWAY FROM ME！！！";
            btnIcon.innerHTML = icons.eyePulse;
            break;
        case 4:
            const isFast = state.mouseSpeed > 0.3;
            if (isFast) {
                btn.className = `${baseClass} bg-purple-600 opacity-50 scale-90 duration-0`;
                btnText.textContent = "Too Slow...";
                btnIcon.innerHTML = icons.eye;
            } else {
                btn.className = `${baseClass} bg-green-600 scale-90 duration-0`;
                btnText.textContent = "You need to be faster!";
                btnIcon.innerHTML = icons.eyeOff;
            }
            break;
    }
}

init();


