const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Desativa a suavização para manter o aspecto Pixel Art real
ctx.imageSmoothingEnabled = false;

// --- CONFIGURAÇÕES E ESTADO DO JOGO ---
const GRAVITY = 0.5;
const keys = {};

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// --- CLASSE DO JOGADOR (PIXEL ART DESENHADO VIA CÓDIGO) ---
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 32;
        this.vx = 0;
        this.vy = 0;
        this.speed = 4;
        this.jumpForce = -10.5;
        this.grounded = false;
        this.facing = 'right';
        this.animFrame = 0;
    }

    update(platforms) {
        // Controlos de Movimento
        if (keys['KeyA'] || keys['ArrowLeft']) {
            this.vx = -this.speed;
            this.facing = 'left';
        } else if (keys['KeyD'] || keys['ArrowRight']) {
            this.vx = this.speed;
            this.facing = 'right';
        } else {
            this.vx *= 0.8; // Fricção
        }

        // Pulo
        if ((keys['KeyW'] || keys['Space'] || keys['ArrowUp']) && this.grounded) {
            this.vy = this.jumpForce;
            this.grounded = false;
        }

        // Aplicação da Gravidade
        this.vy += GRAVITY;

        // Movimento Horizontal e Colisão
        this.x += this.vx;
        platforms.forEach(plat => {
            if (this.checkCollision(this, plat)) {
                if (this.vx > 0) this.x = plat.x - this.width;
                if (this.vx < 0) this.x = plat.x + plat.width;
            }
        });

        // Movimento Vertical e Colisão
        this.y += this.vy;
        this.grounded = false;
        platforms.forEach(plat => {
            if (this.checkCollision(this, plat)) {
                if (this.vy > 0) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                } else if (this.vy < 0) {
                    this.y = plat.y + plat.height;
                    this.vy = 0;
                }
            }
        });

        // Limites da Tela
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y > canvas.height) { // Respawn se cair
            this.x = 50;
            this.y = 200;
            this.vy = 0;
        }

        this.animFrame += 0.15;
    }

    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    draw() {
        ctx.save();
        
        // Desenho do Jogador em Pixel Art (Sprite procedural)
        const isMoving = Math.abs(this.vx) > 0.5;
        const bobbing = isMoving ? Math.sin(this.animFrame) * 2 : 0;

        // Corpo / Roupa
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(this.x, this.y + 10 + bobbing, this.width, this.height - 10);

        // Cabeça
        ctx.fillStyle = '#ffccaa';
        ctx.fillRect(this.x + 2, this.y + bobbing, 20, 12);

        // Cabelo Pixel Art
        ctx.fillStyle = '#2b1e1e';
        ctx.fillRect(this.x, this.y - 2 + bobbing, 24, 6);

        // Olhos conforme a direção
        ctx.fillStyle = '#000';
        if (this.facing === 'right') {
            ctx.fillRect(this.x + 14, this.y + 4 + bobbing, 4, 4);
        } else {
            ctx.fillRect(this.x + 6, this.y + 4 + bobbing, 4, 4);
        }

        // Mochila / Detalhe
        ctx.fillStyle = '#333';
        if (this.facing === 'right') {
            ctx.fillRect(this.x - 3, this.y + 12 + bobbing, 5, 12);
        } else {
            ctx.fillRect(this.x + this.width - 2, this.y + 12 + bobbing, 5, 12);
        }

        ctx.restore();
    }
}

// --- PLATAFORMAS E CENÁRIO ---
const platforms = [
    { x: 0, y: 400, width: 800, height: 50, color: '#2d3142', topColor: '#00e676' }, // Chão principal
    { x: 150, y: 300, width: 140, height: 20, color: '#3f455a', topColor: '#00b0ff' },
    { x: 360, y: 220, width: 140, height: 20, color: '#3f455a', topColor: '#00b0ff' },
    { x: 570, y: 150, width: 160, height: 20, color: '#3f455a', topColor: '#ff0055' }
];

const player = new Player(50, 200);

// --- COLETÁVEIS (MOEDAS EM PIXEL ART) ---
const coins = [
    { x: 200, y: 260, collected: false },
    { x: 420, y: 180, collected: false },
    { x: 640, y: 110, collected: false }
];

let score = 0;

// --- LOOP PRINCIPAL DO JOGO (60 FPS) ---
function gameLoop() {
    // 1. Limpeza da Tela com fundo estrelado/retro
    ctx.fillStyle = '#14151c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Atualização dos Objetos
    player.update(platforms);

    // Verificar coleta de moedas
    coins.forEach(coin => {
        if (!coin.collected && player.checkCollision(player, { x: coin.x, y: coin.y, width: 16, height: 16 })) {
            coin.collected = true;
            score += 100;
        }
    });

    // 3. Desenhar Plataformas em Pixel Art
    platforms.forEach(plat => {
        // Blocos de baixo
        ctx.fillStyle = plat.color;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        // Grama/Topo brilhante
        ctx.fillStyle = plat.topColor;
        ctx.fillRect(plat.x, plat.y, plat.width, 4);
    });

    // 4. Desenhar Moedas Coletáveis
    coins.forEach(coin => {
        if (!coin.collected) {
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(coin.x + 2, coin.y, 12, 16);
            ctx.fillStyle = '#fff7a0';
            ctx.fillRect(coin.x + 4, coin.y + 2, 4, 12);
        }
    });

    // 5. Desenhar Jogador e Pontuação
    player.draw();

    ctx.fillStyle = '#fff';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(`PONTOS: ${score}`, 20, 30);

    requestAnimationFrame(gameLoop);
}

// Inicia o Jogo
gameLoop();
