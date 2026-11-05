// =============================================================================
// ECLIPSE: O ÚLTIMO MUNDO — ENGINE PRINCIPAL (FASE 1)
// =============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Canvas Secundário para Sistema de Iluminação Dinâmica (Lightmap Overlay)
const lightCanvas = document.createElement('canvas');
lightCanvas.width = canvas.width;
lightCanvas.height = canvas.height;
const lightCtx = lightCanvas.getContext('2d');

ctx.imageSmoothingEnabled = false;

// --- CONFIGURAÇÕES DE REDE E MUNDO ---
const TILE_SIZE = 32;
const MAP_COLS = 40;
const MAP_ROWS = 30;
const WORLD_WIDTH = MAP_COLS * TILE_SIZE;   // 1280px
const WORLD_HEIGHT = MAP_ROWS * TILE_SIZE; // 960px

// --- CONTROLES DA CÂMERA (SMOOTH DAMP) ---
const camera = {
    x: 0, y: 0,
    width: canvas.width,
    height: canvas.height,
    follow(target) {
        // Interpolação suave para manter a câmera centralizada no jogador
        let targetX = target.x + target.width / 2 - this.width / 2;
        let targetY = target.y + target.height / 2 - this.height / 2;

        this.x += (targetX - this.x) * 0.08;
        this.y += (targetY - this.y) * 0.08;

        // Limites do Mundo
        this.x = Math.max(0, Math.min(this.x, WORLD_WIDTH - this.width));
        this.y = Math.max(0, Math.min(this.y, WORLD_HEIGHT - this.height));
    }
};

// --- CONTROLES DE TECLADO ---
const input = {
    keys: {},
    init() {
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);
    }
};
input.init();

// --- CLASSE PROTAGONISTA ---
class Hero {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.width = 24; this.height = 28;
        this.speed = 2.8;
        this.facing = 'down'; // 'up', 'down', 'left', 'right'
        
        // Atributos de Combate
        this.maxHp = 100; this.hp = 100;
        this.maxStamina = 100; this.stamina = 100;
        
        // Animação & Estados
        this.animFrame = 0;
        this.isDashing = false;
        this.dashTimer = 0;
        this.dashCooldown = 0;
        this.invulnerable = false;
    }

    update(obstacles) {
        // Regeneração natural de Stamina
        if (this.stamina < this.maxStamina && !this.isDashing) {
            this.stamina = Math.min(this.maxStamina, this.stamina + 0.4);
        }

        if (this.dashCooldown > 0) this.dashCooldown--;

        let dx = 0; let dy = 0;

        // Trata Esquiva (Dash)
        if (this.isDashing) {
            this.dashTimer--;
            if (this.facing === 'left') dx = -this.speed * 2.5;
            if (this.facing === 'right') dx = this.speed * 2.5;
            if (this.facing === 'up') dy = -this.speed * 2.5;
            if (this.facing === 'down') dy = this.speed * 2.5;

            if (this.dashTimer <= 0) {
                this.isDashing = false;
                this.invulnerable = false;
            }
        } else {
            // Controles de Movimentação Normais
            if (input.keys['KeyA'] || input.keys['ArrowLeft']) { dx -= 1; this.facing = 'left'; }
            if (input.keys['KeyD'] || input.keys['ArrowRight']) { dx += 1; this.facing = 'right'; }
            if (input.keys['KeyW'] || input.keys['ArrowUp']) { dy -= 1; this.facing = 'up'; }
            if (input.keys['KeyS'] || input.keys['ArrowDown']) { dy += 1; this.facing = 'down'; }

            // Normaliza vetor diagonal
            if (dx !== 0 && dy !== 0) {
                dx *= 0.7071; dy *= 0.7071;
            }

            dx *= this.speed;
            dy *= this.speed;

            // Ativação do Dash (Tecla Espaço / Shift)
            if ((input.keys['Space'] || input.keys['ShiftLeft']) && this.stamina >= 30 && this.dashCooldown === 0 && (dx !== 0 || dy !== 0)) {
                this.isDashing = true;
                this.dashTimer = 12;
                this.dashCooldown = 30;
                this.stamina -= 30;
                this.invulnerable = true;
            }
        }

        // Colisão com Obstáculos Eixo X
        this.x += dx;
        for (let obj of obstacles) {
            if (checkAABB(this, obj)) {
                if (dx > 0) this.x = obj.x - this.width;
                if (dx < 0) this.x = obj.x + obj.width;
            }
        }

        // Colisão com Obstáculos Eixo Y
        this.y += dy;
        for (let obj of obstacles) {
            if (checkAABB(this, obj)) {
                if (dy > 0) this.y = obj.y - this.height;
                if (dy < 0) this.y = obj.y + obj.height;
            }
        }

        // Limites do Mapa
        this.x = Math.max(0, Math.min(this.x, WORLD_WIDTH - this.width));
        this.y = Math.max(0, Math.min(this.y, WORLD_HEIGHT - this.height));

        if (dx !== 0 || dy !== 0) this.animFrame += 0.15;
        this.updateHUD();
    }

    updateHUD() {
        document.getElementById('hp-bar').style.width = `${(this.hp / this.maxHp) * 100}%`;
        document.getElementById('stamina-bar').style.width = `${(this.stamina / this.maxStamina) * 100}%`;
        document.getElementById('hp-val').textContent = `${Math.ceil(this.hp)}/${this.maxHp}`;
        document.getElementById('stamina-val').textContent = `${Math.ceil(this.stamina)}/${this.maxStamina}`;
    }

    draw() {
        const renderX = this.x - camera.x;
        const renderY = this.y - camera.y;

        ctx.save();

        // Rastro de Ilusão durante o Dash
        if (this.isDashing) {
            ctx.fillStyle = 'rgba(156, 39, 176, 0.4)';
            ctx.fillRect(renderX - 4, renderY - 4, this.width + 8, this.height + 8);
        }

        // Sombra do Personagem
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(renderX + this.width / 2, renderY + this.height - 2, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Corpo Principal (Cores Dark Fantasy)
        ctx.fillStyle = '#2a1b4e';
        ctx.fillRect(renderX, renderY + 8, this.width, this.height - 8);

        // Capa / Túnica
        ctx.fillStyle = '#7b1fa2';
        ctx.fillRect(renderX + 3, renderY + 10, this.width - 6, this.height - 12);

        // Cabeça
        ctx.fillStyle = '#e0d6f6';
        ctx.fillRect(renderX + 4, renderY, 16, 12);

        // Olhos / Viseira (Mudar orientação conforme direção)
        ctx.fillStyle = '#ff1744';
        if (this.facing === 'down') ctx.fillRect(renderX + 6, renderY + 5, 12, 3);
        if (this.facing === 'up') ctx.fillRect(renderX + 6, renderY + 2, 12, 2);
        if (this.facing === 'left') ctx.fillRect(renderX + 4, renderY + 5, 6, 3);
        if (this.facing === 'right') ctx.fillRect(renderX + 14, renderY + 5, 6, 3);

        ctx.restore();
    }
}

// --- COLISÕES DE CAIXA ENVOLVENTE (AABB) ---
function checkAABB(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
}

// --- GERAÇÃO DA REGIÃO 1: FLORESTA DOS PERDIDOS ---
const obstacles = [];
const lights = []; // Fontes de luz estáticas/dinâmicas

function generateForestLevel() {
    // Paredes externas da floresta
    obstacles.push({ x: 0, y: 0, width: WORLD_WIDTH, height: 32 });
    obstacles.push({ x: 0, y: WORLD_HEIGHT - 32, width: WORLD_WIDTH, height: 32 });
    obstacles.push({ x: 0, y: 0, width: 32, height: WORLD_HEIGHT });
    obstacles.push({ x: WORLD_WIDTH - 32, y: 0, width: 32, height: WORLD_HEIGHT });

    // Árvores antigas e ruínas
    const treePositions = [
        {x: 200, y: 150}, {x: 400, y: 180}, {x: 650, y: 120},
        {x: 180, y: 400}, {x: 500, y: 550}, {x: 850, y: 350},
        {x: 950, y: 600}, {x: 300, y: 700}
    ];

    treePositions.forEach(pos => {
        obstacles.push({ x: pos.x, y: pos.y, width: 64, height: 64, type: 'tree' });
    });

    // Tochas antigas com luz mística
    lights.push({ x: 300, y: 250, radius: 140, color: 'rgba(156, 39, 176, 0.8)' });
    lights.push({ x: 700, y: 450, radius: 160, color: 'rgba(239, 83, 80, 0.7)' });
    lights.push({ x: 1000, y: 200, radius: 180, color: 'rgba(0, 230, 118, 0.7)' });
}

generateForestLevel();

const player = new Hero(100, 100);

// --- RENDERIZAÇÃO DO AMBIENTE E SISTEMA DE LUZ ---
function renderMap() {
    // Fundo do Chão da Floresta (Tons de Azul e Roxo Escuro)
    ctx.fillStyle = '#0a0514';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid e Textura do Solo
    ctx.strokeStyle = '#140a28';
    ctx.lineWidth = 1;

    let startCol = Math.floor(camera.x / TILE_SIZE);
    let endCol = startCol + Math.ceil(camera.width / TILE_SIZE) + 1;
    let startRow = Math.floor(camera.y / TILE_SIZE);
    let endRow = startRow + Math.ceil(camera.height / TILE_SIZE) + 1;

    for (let c = startCol; c < endCol; c++) {
        for (let r = startRow; r < endRow; r++) {
            let x = c * TILE_SIZE - camera.x;
            let y = r * TILE_SIZE - camera.y;
            ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
        }
    }

    // Desenha Obstáculos e Ruínas
    obstacles.forEach(obs => {
        const rx = obs.x - camera.x;
        const ry = obs.y - camera.y;

        if (obs.type === 'tree') {
            // Tronco
            ctx.fillStyle = '#1b002c';
            ctx.fillRect(rx + 20, ry + 30, 24, 34);
            // Copa em Camadas Dark Fantasy
            ctx.fillStyle = '#311b92';
            ctx.beginPath(); ctx.arc(rx + 32, ry + 25, 30, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#4527a0';
            ctx.beginPath(); ctx.arc(rx + 32, ry + 20, 20, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.fillStyle = '#120726';
            ctx.fillRect(rx, ry, obs.width, obs.height);
            ctx.strokeStyle = '#311b92';
            ctx.strokeRect(rx, ry, obs.width, obs.height);
        }
    });
}

// --- ENGINE DE ILUMINAÇÃO DINÂMICA ---
function renderLighting() {
    // 1. Limpa o canvas secundário com a escuridão da noite/eclipse
    lightCtx.fillStyle = 'rgba(4, 2, 10, 0.92)';
    lightCtx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);

    lightCtx.globalCompositeOperation = 'destination-out';

    // 2. Luz Própria do Protagonista (A Espada Consciente)
    const playerLightX = (player.x + player.width / 2) - camera.x;
    const playerLightY = (player.y + player.height / 2) - camera.y;

    let pGrad = lightCtx.createRadialGradient(playerLightX, playerLightY, 10, playerLightX, playerLightY, 120);
    pGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    lightCtx.fillStyle = pGrad;
    lightCtx.beginPath();
    lightCtx.arc(playerLightX, playerLightY, 120, 0, Math.PI * 2);
    lightCtx.fill();

    // 3. Luzes dos Objetos da Floresta
    lights.forEach(l => {
        const lx = l.x - camera.x;
        const ly = l.y - camera.y;

        let grad = lightCtx.createRadialGradient(lx, ly, 5, lx, ly, l.radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        lightCtx.fillStyle = grad;
        lightCtx.beginPath();
        lightCtx.arc(lx, ly, l.radius, 0, Math.PI * 2);
        lightCtx.fill();
    });

    lightCtx.globalCompositeOperation = 'source-over';

    // 4. Aplica a camada de sombra por cima do canvas principal
    ctx.drawImage(lightCanvas, 0, 0);
}

// --- GAME LOOP PRINCIPAL ---
let isGameRunning = false;

function gameLoop() {
    if (isGameRunning) {
        // Atualizações
        player.update(obstacles);
        camera.follow(player);

        // Desenho
        renderMap();
        player.draw();
        renderLighting();
    }

    requestAnimationFrame(gameLoop);
}

// --- CONTROLE DAS TELAS & MENU ---
function startGame() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('hud-layer').style.display = 'flex';
    isGameRunning = true;

    // Diálogo Introdutório
    setTimeout(() => {
        showDialogue("ESPRITO DA ESPADA", "Você despertou... 700 anos se passaram desde que as cinzas cobriram este mundo. Lembre-se de quem você é.");
    }, 1000);
}

function showDialogue(speaker, text) {
    const box = document.getElementById('dialogue-box');
    document.getElementById('speaker-name').textContent = speaker;
    document.getElementById('dialogue-text').textContent = text;
    box.style.display = 'flex';

    setTimeout(() => {
        box.style.display = 'none';
    }, 6000);
}

function showCredits() {
    alert("ECLIPSE — O ÚLTIMO MUNDO\nDesenvolvido com HTML5 Canvas e JavaScript Puro.");
}

// Inicia o Loop da Engine
gameLoop();

