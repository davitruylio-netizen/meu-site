const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// --- TECLAS E ESTADO DOS CONTROLES ---
const keys = {};
window.addEventListener('keydown', e => {
    if (!keys[e.code]) {
        if (e.code === 'KeyW' || e.code === 'Space') player.jump();
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.dash();
        if (e.code === 'KeyE') interact();
    }
    keys[e.code] = true;
});
window.addEventListener('keyup', e => keys[e.code] = false);

// --- SISTEMA DE PARTÍCULAS ---
let particles = [];
function createParticles(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 3 + 1,
            color: color,
            life: 20
        });
    }
}

// --- CLASSE DO JOGADOR ---
class Player {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.width = 24; this.height = 32;
        this.vx = 0; this.vy = 0;
        this.speed = 4.5;
        this.jumpForce = -9.5;
        this.jumpCount = 0;
        this.maxJumps = 2;
        this.grounded = false;
        this.facing = 'right';
        this.animFrame = 0;
        
        // Habilidades Especiais
        this.isDashing = false;
        this.dashCooldown = 0;
        this.hasKey = false;
    }

    jump() {
        if (dialogueSystem.active) return;
        if (this.jumpCount < this.maxJumps) {
            this.vy = this.jumpForce;
            this.jumpCount++;
            this.grounded = false;
            createParticles(this.x + 12, this.y + 30, '#00f0ff', 8);
        }
    }

    dash() {
        if (this.dashCooldown === 0 && !dialogueSystem.active) {
            this.isDashing = true;
            this.vx = (this.facing === 'right' ? 1 : -1) * 12;
            this.dashCooldown = 40;
            createParticles(this.x + 12, this.y + 16, '#ff0055', 10);
        }
    }

    update(platforms) {
        if (dialogueSystem.active) return;

        // Diminui Cooldowns
        if (this.dashCooldown > 0) this.dashCooldown--;

        // Movimento Horizontal
        if (!this.isDashing) {
            if (keys['KeyA'] || keys['ArrowLeft']) {
                this.vx = -this.speed; this.facing = 'left';
            } else if (keys['KeyD'] || keys['ArrowRight']) {
                this.vx = this.speed; this.facing = 'right';
            } else {
                this.vx *= 0.75;
            }
        } else {
            if (Math.abs(this.vx) < 5) this.isDashing = false;
        }

        // Gravidade
        this.vy += 0.45;

        // Colisão X
        this.x += this.vx;
        platforms.forEach(p => {
            if (checkCollision(this, p)) {
                if (this.vx > 0) this.x = p.x - this.width;
                if (this.vx < 0) this.x = p.x + p.width;
            }
        });

        // Colisão Y
        this.y += this.vy;
        this.grounded = false;
        platforms.forEach(p => {
            if (checkCollision(this, p)) {
                if (this.vy > 0) {
                    this.y = p.y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                    this.jumpCount = 0;
                } else if (this.vy < 0) {
                    this.y = p.y + p.height;
                    this.vy = 0;
                }
            }
        });

        // Limites do Mapa
        if (this.x < 0) this.x = 0;
        if (this.y > canvas.height) { this.x = 40; this.y = 300; this.vy = 0; }

        this.animFrame += 0.15;
    }

    draw() {
        ctx.save();
        const isMoving = Math.abs(this.vx) > 0.5;
        const bob = isMoving ? Math.sin(this.animFrame) * 2 : 0;

        // Efeito Visual do Dash (Rastro)
        if (this.isDashing) {
            ctx.fillStyle = 'rgba(255, 0, 85, 0.4)';
            ctx.fillRect(this.x - (this.facing==='right'?8:-8), this.y, this.width, this.height);
        }

        // Traje Neon
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(this.x, this.y + 10 + bob, this.width, this.height - 10);
        
        // Detalhes Neon Brilhantes
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(this.x + 4, this.y + 16 + bob, 16, 3);

        // Cabeça & Capacete
        ctx.fillStyle = '#1a1c29';
        ctx.fillRect(this.x + 2, this.y + bob, 20, 12);
        
        // Viseira Futurista
        ctx.fillStyle = '#00f0ff';
        if (this.facing === 'right') {
            ctx.fillRect(this.x + 12, this.y + 4 + bob, 8, 4);
        } else {
            ctx.fillRect(this.x + 4, this.y + 4 + bob, 8, 4);
        }

        ctx.restore();
    }
}

// --- CLASSE DOS INIMIGOS PATRULHEIROS ---
class Enemy {
    constructor(x, y, range) {
        this.x = x; this.y = y;
        this.width = 24; this.height = 24;
        this.startX = x;
        this.range = range;
        this.speed = 1.8;
        this.dir = 1;
    }

    update() {
        this.x += this.speed * this.dir;
        if (Math.abs(this.x - this.startX) > this.range) {
            this.dir *= -1;
        }

        // Colisão com Jogador
        if (checkCollision(player, this)) {
            player.x = 40; player.y = 300; // Reseta ao tomar dano
            createParticles(player.x, player.y, '#ff0055', 12);
        }
    }

    draw() {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x + (this.dir===1?14:4), this.y + 6, 6, 6);
    }
}

// --- SISTEMA DE DIÁLOGOS ---
const dialogueSystem = {
    active: false,
    speaker: '',
    text: '',
    charIndex: 0,
    fullText: '',
    
    start(speaker, text) {
        this.active = true;
        this.speaker = speaker;
        this.fullText = text;
        this.text = '';
        this.charIndex = 0;
    },
    
    update() {
        if (this.active && this.charIndex < this.fullText.length) {
            this.text += this.fullText[this.charIndex];
            this.charIndex++;
        }
    },

    draw() {
        if (!this.active) return;
        
        // Caixa do Diálogo
        ctx.fillStyle = 'rgba(13, 14, 23, 0.95)';
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.fillRect(50, 340, 750, 110);
        ctx.strokeRect(50, 340, 750, 110);

        // Retrato em Pixel Art do Locutor
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(70, 355, 60, 60);
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(80, 370, 40, 15);

        // Nome & Texto
        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.fillText(this.speaker, 150, 370);

        ctx.fillStyle = '#fff';
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText(this.text, 150, 400);

        ctx.fillStyle = '#888';
        ctx.font = '11px monospace';
        ctx.fillText('[Pressione E para continuar]', 620, 435);
    }
};

// --- ELEMENTOS DO MAPA E OBJETOS ---
const platforms = [
    { x: 0, y: 430, width: 850, height: 50, color: '#161925', top: '#00f0ff' },
    { x: 120, y: 340, width: 140, height: 16, color: '#212638', top: '#ff0055' },
    { x: 330, y: 270, width: 140, height: 16, color: '#212638', top: '#00f0ff' },
    { x: 550, y: 200, width: 160, height: 16, color: '#212638', top: '#ff0055' },
    { x: 740, y: 130, width: 110, height: 16, color: '#212638', top: '#00f0ff' }
];

const items = [
    { type: 'key', x: 620, y: 160, width: 16, height: 16, collected: false },
    { type: 'coin', x: 180, y: 300, collected: false },
    { type: 'coin', x: 390, y: 230, collected: false }
];

const npc = { x: 70, y: 398, width: 24, height: 32 };
const door = { x: 790, y: 55, width: 30, height: 75, locked: true };

const player = new Player(40, 300);
const enemies = [new Enemy(340, 246, 80)];
let score = 0;

// Interações pelo Cenário
function interact() {
    if (dialogueSystem.active) {
        if (dialogueSystem.charIndex >= dialogueSystem.fullText.length) {
            dialogueSystem.active = false;
        } else {
            dialogueSystem.text = dialogueSystem.fullText;
            dialogueSystem.charIndex = dialogueSystem.fullText.length;
        }
        return;
    }

    // NPC Fala
    if (Math.abs(player.x - npc.x) < 40 && Math.abs(player.y - npc.y) < 40) {
        dialogueSystem.start("GUARDIÃO CYBER", "Cuidado, viajante! Pegue o Cartão de Acesso no topo do complexo para abrir o Portal de Saída!");
    }

    // Tentar Abrir Porta
    if (Math.abs(player.x - door.x) < 40 && Math.abs(player.y - door.y) < 80) {
        if (player.hasKey) {
            dialogueSystem.start("SISTEMA NEON", "Acesso Autorizado! Você concluiu a Fase 1!");
            door.locked = false;
        } else {
            dialogueSystem.start("SISTEMA NEON", "Acesso Negado! Encontre o Cartão de Acesso azul primeiro.");
        }
    }
}

function checkCollision(r1, r2) {
    return r1.x < r2.x + r2.width && r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height && r1.y + r1.height > r2.y;
}

// --- GAME LOOP ---
function gameLoop() {
    // 1. Fundo Gradiente Cyberpunk
    ctx.fillStyle = '#0a0b12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Atualizações
    player.update(platforms);
    enemies.forEach(e => e.update());
    dialogueSystem.update();

    // Partículas
    particles.forEach((p, index) => {
        p.x += p.vx; p.y += p.vy; p.life--;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        if (p.life <= 0) particles.splice(index, 1);
    });

    // Coleta de Itens
    items.forEach(item => {
        if (!item.collected && checkCollision(player, { x: item.x, y: item.y, width: 16, height: 16 })) {
            item.collected = true;
            if (item.type === 'key') {
                player.hasKey = true;
                createParticles(item.x, item.y, '#00f0ff', 15);
            } else {
                score += 250;
                createParticles(item.x, item.y, '#ffff00', 8);
            }
        }
    });

    // 3. Desenho de Elementos
    // Plataformas
    platforms.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = p.top;
        ctx.fillRect(p.x, p.y, p.width, 3);
    });

    // NPC
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(npc.x, npc.y, npc.width, npc.height);
    ctx.fillStyle = '#fff';
    ctx.fillText("NPC [E]", npc.x - 6, npc.y - 8);

    // Porta de Saída
    ctx.fillStyle = door.locked ? '#ff0055' : '#00f0ff';
    ctx.fillRect(door.x, door.y, door.width, door.height);
    ctx.fillStyle = '#fff';
    ctx.fillText(door.locked ? "TRANCADO" : "SAÍDA", door.x - 10, door.y - 10);

    // Itens
    items.forEach(item => {
        if (!item.collected) {
            if (item.type === 'key') {
                ctx.fillStyle = '#00f0ff';
                ctx.fillRect(item.x, item.y, 14, 14);
            } else {
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(item.x + 2, item.y, 10, 14);
            }
        }
    });

    // Inimigos e Jogador
    enemies.forEach(e => e.draw());
    player.draw();

    // 4. Interface HUD (Pontuação & Inventário)
    ctx.fillStyle = '#fff';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText(`PONTOS: ${score}`, 20, 30);
    ctx.fillText(`CARTÃO DE ACESSO: ${player.hasKey ? "POSSUI" : "NÃO POSSUI"}`, 20, 50);

    // 5. Renderizar Diálogo Por Cima
    dialogueSystem.draw();

    requestAnimationFrame(gameLoop);
}

gameLoop();
