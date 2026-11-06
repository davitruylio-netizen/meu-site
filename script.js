// =============================================================================
// FIVE NIGHTS AT FREDDY'S — CORREÇÃO DO MENU & FREDDY RENDER
// =============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playSound(type) {
    initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'door') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start(); osc.stop(audioCtx.currentTime + 0.25);
    } else if (type === 'light') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08);
    } else if (type === 'jumpscare') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 1.2);
        gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.2);
        osc.start(); osc.stop(audioCtx.currentTime + 1.2);
    }
}

// ESTADOS
let inMenu = true;
let gameRunning = false;
let monitorOpen = false;
let currentCam = '1A';

let officeX = 120;
let mouseX = 500;

let leftDoor = false;
let rightDoor = false;
let leftLight = false;
let rightLight = false;

let fanAngle = 0;
let power = 100;
let hour = 0;
let nightTimer = 0;

const animatronics = {
    bonnie: { location: '1A', aiLevel: 4, timer: 0 },
    chica:  { location: '1A', aiLevel: 3, timer: 0 },
    foxy:   { location: '1C', stage: 0, aiLevel: 3, timer: 0 },
    freddy: { location: '1A', aiLevel: 2, timer: 0 }
};

const wrapper = document.getElementById('game-wrapper');
wrapper.addEventListener('mousemove', e => {
    const rect = wrapper.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
});

canvas.addEventListener('click', e => {
    if (inMenu || monitorOpen || !gameRunning) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left + (officeX * 0.8);
    const clickY = e.clientY - rect.top;

    if (clickX > 80 && clickX < 140) {
        if (clickY > 180 && clickY < 230) { leftDoor = !leftDoor; playSound('door'); }
        if (clickY > 240 && clickY < 290) { leftLight = !leftLight; playSound('light'); }
    }

    if (clickX > 1050 && clickX < 1110) {
        if (clickY > 180 && clickY < 230) { rightDoor = !rightDoor; playSound('door'); }
        if (clickY > 240 && clickY < 290) { rightLight = !rightLight; playSound('light'); }
    }
});

// VINCULAÇÃO DIRETA DOS BOTÕES DE MENU
window.addEventListener('DOMContentLoaded', () => {
    bindMenuEvents();
});

function bindMenuEvents() {
    const btnNew = document.getElementById('btn-newgame');
    const btnCont = document.getElementById('btn-continue');

    if (btnNew) btnNew.onclick = startNight;
    if (btnCont) btnCont.onclick = startNight;
}

function startNight() {
    initAudio();
    inMenu = false;
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('hud-overlay').style.display = 'flex';
    document.getElementById('night-time').style.display = 'block';
    document.getElementById('camera-flip-btn').style.display = 'flex';
    gameRunning = true;
}

function toggleMonitor() {
    if (!gameRunning) return;
    monitorOpen = !monitorOpen;
    document.getElementById('cam-map-container').style.display = monitorOpen ? 'block' : 'none';
    playSound('light');
}

function selectCam(cam) {
    currentCam = cam;
    document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-cam${cam.toLowerCase()}`).classList.add('active');
    playSound('light');
}

function updateAI() {
    animatronics.bonnie.timer++;
    if (animatronics.bonnie.timer > 220) {
        animatronics.bonnie.timer = 0;
        if (Math.random() * 20 < animatronics.bonnie.aiLevel) {
            const bRoute = ['1A', '5', '3', '2A', '2B', 'OFFICE'];
            let idx = bRoute.indexOf(animatronics.bonnie.location);
            if (idx < bRoute.length - 1) animatronics.bonnie.location = bRoute[idx + 1];

            if (animatronics.bonnie.location === 'OFFICE') {
                if (!leftDoor) triggerJumpscare('BONNIE');
                else animatronics.bonnie.location = '1B';
            }
        }
    }

    animatronics.chica.timer++;
    if (animatronics.chica.timer > 260) {
        animatronics.chica.timer = 0;
        if (Math.random() * 20 < animatronics.chica.aiLevel) {
            const cRoute = ['1A', '1B', '7', '4A', '4B', 'OFFICE'];
            let idx = cRoute.indexOf(animatronics.chica.location);
            if (idx < cRoute.length - 1) animatronics.chica.location = cRoute[idx + 1];

            if (animatronics.chica.location === 'OFFICE') {
                if (!rightDoor) triggerJumpscare('CHICA');
                else animatronics.chica.location = '1B';
            }
        }
    }

    animatronics.foxy.timer++;
    if (animatronics.foxy.timer > 320 && !monitorOpen) {
        animatronics.foxy.timer = 0;
        if (Math.random() * 20 < animatronics.foxy.aiLevel) {
            if (animatronics.foxy.stage < 3) {
                animatronics.foxy.stage++;
            } else {
                if (!leftDoor) {
                    triggerJumpscare('FOXY');
                } else {
                    animatronics.foxy.stage = 0;
                    power -= 6;
                }
            }
        }
    }
}

function triggerJumpscare(who) {
    gameRunning = false;
    document.getElementById('cam-map-container').style.display = 'none';
    document.getElementById('camera-flip-btn').style.display = 'none';
    playSound('jumpscare');

    let frame = 0;
    const interval = setInterval(() => {
        ctx.fillStyle = frame % 2 === 0 ? '#000' : '#400';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(500, 280);
        ctx.scale(1 + frame * 0.05, 1 + frame * 0.05);

        if (who === 'BONNIE') ctx.fillStyle = '#3f51b5';
        else if (who === 'CHICA') ctx.fillStyle = '#fbc02d';
        else if (who === 'FOXY') ctx.fillStyle = '#d84315';
        else ctx.fillStyle = '#6d4c41';

        ctx.beginPath();
        ctx.arc(0, 0, 160, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.fillRect(-60, -40, 40, 40); ctx.fillRect(20, -40, 40, 40);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-45, -25, 12, 12); ctx.fillRect(35, -25, 12, 12);

        ctx.fillStyle = '#000';
        ctx.fillRect(-50, 40, 100, 50);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-40, 45, 15, 15); ctx.fillRect(-15, 45, 15, 15); ctx.fillRect(10, 45, 15, 15);

        ctx.restore();

        frame++;
        if (frame > 20) {
            clearInterval(interval);
            document.getElementById('game-over-screen').style.display = 'flex';
        }
    }, 50);
}

// RENDERIZAÇÃO DO FREDDY NO MENU PRINCIPAL
function drawMenuFreddy() {
    ctx.save();
    ctx.translate(720, 280);

    const isTwitch = Math.random() < 0.08;

    // Orelhas
    ctx.fillStyle = '#4a2c11';
    ctx.beginPath(); ctx.arc(-110, -120, 35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(110, -120, 35, 0, Math.PI * 2); ctx.fill();

    // Cabeça Principal
    ctx.fillStyle = isTwitch ? '#361f0a' : '#5c3818';
    ctx.beginPath(); ctx.arc(0, 0, 140, 0, Math.PI * 2); ctx.fill();

    // Focinho
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath(); ctx.ellipse(0, 35, 75, 50, 0, 0, Math.PI * 2); ctx.fill();

    // Nariz
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(0, 5, 20, 0, Math.PI * 2); ctx.fill();

    // Olhos (Normal vs Flicker)
    if (isTwitch) {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-50, -45, 20, 20);
        ctx.fillRect(30, -45, 20, 20);
    } else {
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(-45, -35, 22, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(45, -35, 22, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-45, -35, 7, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(45, -35, 7, 0, Math.PI * 2); ctx.fill();
    }

    // Cartola
    ctx.fillStyle = '#111';
    ctx.fillRect(-70, -160, 140, 25);
    ctx.fillRect(-45, -230, 90, 70);

    // Gravata Borboleta
    ctx.fillStyle = '#111';
    ctx.fillRect(-25, 115, 50, 20);

    ctx.restore();
}

function render() {
    if (inMenu) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Desenhar Freddy
        drawMenuFreddy();

        // Estática CRT
        for (let i = 0; i < 400; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.4)';
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 4, 2);
        }
        return;
    }

    if (!monitorOpen) {
        if (mouseX < 250 && officeX > 0) officeX -= 7;
        if (mouseX > 750 && officeX < 240) officeX += 7;
    }

    ctx.save();
    ctx.translate(-officeX, 0);

    if (!monitorOpen) {
        // ESCRITÓRIO
        ctx.fillStyle = '#0f1115';
        ctx.fillRect(0, 0, 1240, 562);

        if (leftLight) {
            ctx.fillStyle = animatronics.bonnie.location === '2B' ? '#282b5c' : '#eef';
            ctx.fillRect(60, 80, 120, 360);
            if (animatronics.bonnie.location === '2B') {
                ctx.fillStyle = '#3f51b5'; ctx.fillRect(90, 180, 60, 160);
                ctx.fillStyle = '#ff0000'; ctx.fillRect(105, 200, 8, 8); ctx.fillRect(125, 200, 8, 8);
            }
        } else {
            ctx.fillStyle = '#030305'; ctx.fillRect(60, 80, 120, 360);
        }

        if (rightLight) {
            ctx.fillStyle = animatronics.chica.location === '4B' ? '#5c5428' : '#eef';
            ctx.fillRect(1060, 80, 120, 360);
            if (animatronics.chica.location === '4B') {
                ctx.fillStyle = '#fbc02d'; ctx.fillRect(1090, 180, 60, 160);
                ctx.fillStyle = '#ff0000'; ctx.fillRect(1105, 200, 8, 8); ctx.fillRect(1125, 200, 8, 8);
            }
        } else {
            ctx.fillStyle = '#030305'; ctx.fillRect(1060, 80, 120, 360);
        }

        ctx.fillStyle = leftDoor ? '#2a2a2a' : '#121212';
        ctx.fillRect(60, leftDoor ? 80 : -280, 120, 360);
        ctx.strokeStyle = '#444'; ctx.strokeRect(60, leftDoor ? 80 : -280, 120, 360);

        ctx.fillStyle = rightDoor ? '#2a2a2a' : '#121212';
        ctx.fillRect(1060, rightDoor ? 80 : -280, 120, 360);
        ctx.strokeStyle = '#444'; ctx.strokeRect(1060, rightDoor ? 80 : -280, 120, 360);

        ctx.fillStyle = leftDoor ? '#e53935' : '#444'; ctx.fillRect(100, 190, 30, 30);
        ctx.fillStyle = leftLight ? '#fbc02d' : '#444'; ctx.fillRect(100, 250, 30, 30);

        ctx.fillStyle = rightDoor ? '#e53935' : '#444'; ctx.fillRect(1110, 190, 30, 30);
        ctx.fillStyle = rightLight ? '#fbc02d' : '#444'; ctx.fillRect(1110, 250, 30, 30);

        ctx.fillStyle = '#181512'; ctx.fillRect(300, 400, 640, 162);
        
        fanAngle += 0.3;
        ctx.save();
        ctx.translate(610, 375);
        ctx.fillStyle = '#333'; ctx.fillRect(-5, -5, 10, 10);
        ctx.rotate(fanAngle);
        ctx.fillStyle = '#666';
        ctx.fillRect(-25, -4, 50, 8); ctx.fillRect(-4, -25, 8, 50);
        ctx.restore();

    } else {
        // CÂMERAS
        ctx.restore();
        ctx.save();

        ctx.fillStyle = '#05080c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 500; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.3)';
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 3, 3);
        }

        ctx.fillStyle = '#00e676';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.fillText(`● CAM ${currentCam}`, 50, 50);

        let detected = [];
        if (animatronics.bonnie.location === currentCam) detected.push("BONNIE");
        if (animatronics.chica.location === currentCam) detected.push("CHICA");
        if (animatronics.freddy.location === currentCam) detected.push("FREDDY");

        if (currentCam === '1C') {
            ctx.fillStyle = '#ff0055';
            ctx.fillText(`PIRATE COVE - STAGE: ${animatronics.foxy.stage}`, 50, 85);
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(350, 160, 250, 300);
            if (animatronics.foxy.stage > 0) {
                ctx.fillStyle = '#d84315';
                ctx.fillRect(420, 220, 50, 80);
            }
        }

        if (detected.length > 0) {
            ctx.fillStyle = '#ff1744';
            ctx.fillText(`DETECCAO: ${detected.join(', ')}`, 50, 120);

            ctx.fillStyle = '#111';
            ctx.fillRect(400, 180, 200, 280);
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(460, 220, 16, 16); ctx.fillRect(520, 220, 16, 16);
        }
    }

    ctx.restore();
}

function updateGameLogic() {
    if (!gameRunning) return;

    let usage = 1;
    if (leftDoor) usage++;
    if (rightDoor) usage++;
    if (leftLight) usage++;
    if (rightLight) usage++;
    if (monitorOpen) usage++;

    const bars = document.getElementById('usage-bars');
    bars.textContent = '█'.repeat(usage);
    bars.style.color = usage > 3 ? '#ff1744' : (usage > 2 ? '#ffb300' : '#00e676');

    power -= usage * 0.009;
    document.getElementById('power-val').textContent = Math.max(0, Math.floor(power));

    if (power <= 0) {
        leftDoor = false; rightDoor = false;
        leftLight = false; rightLight = false;
        monitorOpen = false;
        triggerJumpscare('FREDDY');
    }

    nightTimer++;
    if (nightTimer > 1100) {
        nightTimer = 0;
        hour++;
        document.getElementById('time-val').textContent = hour === 0 ? '12' : hour;

        if (hour === 6) {
            gameRunning = false;
            document.getElementById('win-screen').style.display = 'flex';
            setTimeout(() => { document.getElementById('win-6am').style.display = 'block'; }, 1000);
        }
    }

    updateAI();
}

function gameLoop() {
    render();
    if (gameRunning) {
        updateGameLogic();
    }
    requestAnimationFrame(gameLoop);
}

// Inicia
bindMenuEvents();
gameLoop();
