// =============================================================================
// URBAN FLOW — MOTOR DE PARKOUR & ANIMAÇÃO PROCEDURAL
// =============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- TECLAS E INPUTS ---
const keys = {};
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

// --- CÂMERA DE ACOMPANHAMENTO FLUIDO ---
const camera = {
    x: 0, y: 0,
    width: canvas.width,
    height: canvas.height,
    follow(target) {
        let targetX = target.x - 200;
        let targetY = target.y - 300;
        this.x += (targetX - this.x) * 0.1;
        this.y += (targetY - this.y) * 0.1;
    }
};

// --- PROTAGONISTA & MÁQUINA DE ESTADOS DE ANIMAÇÃO ---
class ParkourRunner {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.width = 24; this.height = 48;
        this.vx = 0; this.vy = 0;
        this.speed = 6;
        this.jumpForce = -12;
        this.grounded = false;
        this.isClimbing = false;

        // Máquina de Estados
        this.state = 'RUN'; // 'IDLE', 'RUN', 'JUMP', 'FALL', 'SLIDE', 'ROLL', 'CLIMB'
        this.animTimer = 0;
        this.rollTimer = 0;
        this.slideTimer = 0;

        // Esqueleto Procedural para Animações Ultra-Fluidas
        this.pose = {
            head: { x: 0, y: -20 },
            body: { x: 0, y: 0 },
            leftArm: { x: -8, y: -5 },
            rightArm: { x: 8, y: -5 },
            leftLeg: { x: -6, y: 20 },
            rightLeg: { x: 6, y: 20 }
        };
    }

    update(platforms) {
        this.animTimer += 0.2;

        // Lógica de Movimento e Entrada de Teclas
        const isRight = keys['KeyD'] || keys['ArrowRight'];
        const isLeft = keys['KeyA'] || keys['ArrowLeft'];
        const isJump = keys['KeyW'] || keys['Space'] || keys['ArrowUp'];
        const isCrouch = keys['KeyS'] || keys['ArrowDown'];

        if (this.isClimbing) {
            this.vy = -3;
            this.vx = 0;
            this.state = 'CLIMB';
            if (this.animTimer > 3) {
                this.isClimbing = false;
                this.y -= 25;
                this.vy = 0;
            }
            return;
        }

        // Movimentação Horizontal
        if (isRight) {
            this.vx = this.speed;
        } else if (isLeft) {
            this.vx = -this.speed * 0.6;
        } else {
            this.vx *= 0.85;
        }

        // Rolamento / Deslizamento
        if (isCrouch && this.grounded && this.slideTimer === 0) {
            this.slideTimer = 25;
            this.state = 'SLIDE';
        }

        if (this.slideTimer > 0) {
            this.slideTimer--;
            this.vx = 8;
        }

        // Pulo
        if (isJump && this.grounded && this.slideTimer === 0) {
            this.vy = this.jumpForce;
            this.grounded = false;
            this.state = 'JUMP';
        }

        // Aplicar Gravidade
        this.vy += 0.55;

        // Atualização de Posição & Colisão X
        this.x += this.vx;
        platforms.forEach(p => {
            if (this.checkCollision(p)) {
                // Detecção de Escalada em Bordas de Prédios (Ledge Grab)
                if (this.vy > 0 && this.x + this.width >= p.x && this.x < p.x + 10 && this.y + 20 > p.y && this.y < p.y + 20) {
                    this.isClimbing = true;
                    this.animTimer = 0;
                    this.x = p.x - this.width;
                    this.y = p.y;
                } else {
                    if (this.vx > 0) this.x = p.x - this.width;
                    if (this.vx < 0) this.x = p.x + p.width;
                }
            }
        });

        // Atualização de Posição & Colisão Y
        this.y += this.vy;
        let wasInAir = !this.grounded;
        this.grounded = false;

        platforms.forEach(p => {
            if (this.checkCollision(p)) {
                if (this.vy > 0) {
                    this.y = p.y - this.height;
                    this.vy = 0;
                    this.grounded = true;

                    // Aciona Animação de Rolamento ao Cair de Alturas
                    if (wasInAir && this.state === 'FALL') {
                        this.rollTimer = 20;
                    }
                } else if (this.vy < 0) {
                    this.y = p.y + p.height;
                    this.vy = 0;
                }
            }
        });

        // Determinar Estado da Animação
        if (!this.isClimbing) {
            if (this.rollTimer > 0) {
                this.rollTimer--;
                this.state = 'ROLL';
            } else if (this.slideTimer > 0) {
                this.state = 'SLIDE';
            } else if (!this.grounded) {
                this.state = this.vy < 0 ? 'JUMP' : 'FALL';
            } else if (Math.abs(this.vx) > 0.5) {
                this.state = 'RUN';
            } else {
                this.state = 'IDLE';
            }
        }

        // Atualiza a Interface HUD
        document.getElementById('anim-state').textContent = this.state;
        document.getElementById('speed-val').textContent = `${Math.round(Math.abs(this.vx) * 3.6)} km/h`;
    }

    checkCollision(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }

    // --- RENDERIZAÇÃO DAS ANIMAÇÕES PROCEDURAIS (ESQUELETO ARTICULADO) ---
    draw() {
        const rx = this.x - camera.x + this.width / 2;
        const ry = this.y - camera.y + this.height / 2;
        const t = this.animTimer;

        ctx.save();
        ctx.translate(rx, ry);

        // Sombra Dinâmica
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 22, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        let bodyTilt = 0;
        let armL = { x: -10, y: 10 }, armR = { x: 10, y: 10 };
        let legL = { x: -10, y: 22 }, legR = { x: 10, y: 22 };

        // Cálculo dos ângulos dos membros conforme a Animação Atual
        if (this.state === 'RUN') {
            bodyTilt = 0.15;
            armL = { x: Math.sin(t) * 16, y: Math.cos(t) * 8 + 5 };
            armR = { x: -Math.sin(t) * 16, y: -Math.cos(t) * 8 + 5 };
            legL = { x: -Math.sin(t) * 14, y: 20 + Math.max(0, Math.cos(t) * 6) };
            legR = { x: Math.sin(t) * 14, y: 20 + Math.max(0, -Math.cos(t) * 6) };
        } else if (this.state === 'JUMP') {
            bodyTilt = -0.1;
            armL = { x: -14, y: -16 }; armR = { x: 14, y: -16 };
            legL = { x: -8, y: 14 }; legR = { x: 8, y: 22 };
        } else if (this.state === 'FALL') {
            bodyTilt = 0.1;
            armL = { x: -18, y: -8 }; armR = { x: 18, y: -8 };
            legL = { x: -12, y: 18 }; legR = { x: 4, y: 22 };
        } else if (this.state === 'SLIDE') {
            bodyTilt = -0.8;
            armL = { x: -16, y: 10 }; armR = { x: 12, y: 10 };
            legL = { x: 18, y: 8 }; legR = { x: 22, y: 12 };
        } else if (this.state === 'ROLL') {
            ctx.rotate(t * 3);
            armL = { x: -8, y: 4 }; armR = { x: 8, y: 4 };
            legL = { x: -6, y: 10 }; legR = { x: 6, y: 10 };
        } else if (this.state === 'CLIMB') {
            armL = { x: 6, y: -20 }; armR = { x: 10, y: -18 };
            legL = { x: -4, y: 15 }; legR = { x: 2, y: 22 };
        }

        ctx.rotate(bodyTilt);

        // Tronco
        ctx.beginPath();
        ctx.moveTo(0, -12); ctx.lineTo(0, 8);
        ctx.stroke();

        // Cabeça com Capacete/Viseira Neon
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(0, -18, 7, 0, Math.PI * 2);
        ctx.fill();

        // Braços
        ctx.beginPath();
        ctx.moveTo(0, -8); ctx.lineTo(armL.x, armL.y);
        ctx.moveTo(0, -8); ctx.lineTo(armR.x, armR.y);
        ctx.stroke();

        // Pernas
        ctx.beginPath();
        ctx.moveTo(0, 8); ctx.lineTo(legL.x, legL.y);
        ctx.moveTo(0, 8); ctx.lineTo(legR.x, legR.y);
        ctx.stroke();

        ctx.restore();
    }
}

// --- GERAÇÃO DO MAPA DE PRÉDIOS E TELHADOS (PARKOUR MAP) ---
const platforms = [
    { x: 0, y: 450, width: 600, height: 100 },
    { x: 700, y: 380, width: 450, height: 170 },
    { x: 1250, y: 300, width: 400, height: 250 },
    { x: 1750, y: 240, width: 500, height: 300 },
    { x: 2350, y: 380, width: 600, height: 170 }
];

const runner = new ParkourRunner(100, 350);

// --- LOOP DE RENDERIZAÇÃO DA CIDADE ---
function gameLoop() {
    // Fundo Cyberpunk/Urbano
    ctx.fillStyle = '#0b0d14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Atualização
    runner.update(platforms);
    camera.follow(runner);

    // Desenhar Telhados e Prédios
    platforms.forEach(p => {
        const rx = p.x - camera.x;
        const ry = p.y - camera.y;

        // Corpo do Prédio
        ctx.fillStyle = '#161a29';
        ctx.fillRect(rx, ry, p.width, p.height);

        // Topo com Neon (Borda de Impacto para Parkour)
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(rx, ry, p.width, 4);

        // Linhas de Janelas/Grade de Prédio
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        for (let jx = rx + 20; jx < rx + p.width - 20; jx += 40) {
            for (let jy = ry + 20; jy < ry + p.height - 20; jy += 40) {
                ctx.fillRect(jx, jy, 20, 20);
            }
        }
    });

    // Desenhar Protagonista
    runner.draw();

    requestAnimationFrame(gameLoop);
}

gameLoop();

