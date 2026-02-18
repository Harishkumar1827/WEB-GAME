import { GameEngine, COLORS } from './game.js';
import { LEVELS } from './levels.js';

class GameUI {
    constructor() {
        this.currentLevelIndex = 0;
        this.boardElement = document.getElementById('game-board');
        this.connectionLayer = document.getElementById('connection-layer');
        this.selectionPath = [];
        this.isDragging = false;

        this.loadLevel(this.currentLevelIndex);
        this.init();
    }

    loadLevel(index) {
        this.game = new GameEngine(LEVELS[index]);
        if (this.boardElement) {
            this.boardElement.style.gridTemplateColumns = `repeat(${this.game.cols}, 1fr)`;
            this.boardElement.style.gridTemplateRows = `repeat(${this.game.rows}, 1fr)`;
            this.renderBoard();
            this.updateHUD();
        }
    }

    init() {
        this.renderBoard();
        this.setupListeners();
        this.updateHUD();
    }

    renderBoard() {
        this.boardElement.innerHTML = '';
        this.boardElement.appendChild(this.connectionLayer);

        for (let r = 0; r < this.game.rows; r++) {
            for (let c = 0; c < this.game.cols; c++) {
                const colorKey = this.game.grid[r][c];
                const dot = document.createElement('div');
                dot.className = 'dot';
                dot.dataset.r = r;
                dot.dataset.c = c;

                const inner = document.createElement('div');
                inner.className = 'dot-inner';
                inner.style.backgroundColor = COLORS[colorKey];
                inner.style.color = COLORS[colorKey]; // for box-shadow currentColor

                dot.appendChild(inner);
                this.boardElement.appendChild(dot);
            }
        }
    }

    setupListeners() {
        this.boardElement.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        window.addEventListener('pointerup', () => this.handlePointerUp());

        // Prevent scrolling while playing
        this.boardElement.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    }

    handlePointerDown(e) {
        const dot = e.target.closest('.dot');
        if (!dot) return;

        this.isDragging = true;
        this.selectionPath = [];
        this.addToPath(dot);
    }

    handlePointerMove(e) {
        if (!this.isDragging) return;

        const dot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.dot');
        if (!dot) return;

        const r = parseInt(dot.dataset.r);
        const c = parseInt(dot.dataset.c);
        const last = this.selectionPath[this.selectionPath.length - 1];

        if (last.r === r && last.c === c) return;

        // Same color check
        if (this.game.grid[r][c] !== this.game.grid[last.r][last.c]) return;

        // Adjacency check
        if (!this.game.isAdjacent(last, { r, c })) return;

        // Backtrack check
        if (this.selectionPath.length > 1) {
            const secondLast = this.selectionPath[this.selectionPath.length - 2];
            if (secondLast.r === r && secondLast.c === c) {
                this.removeFromPath();
                return;
            }
        }

        // Loop check (already in path)
        const exists = this.selectionPath.find(p => p.r === r && p.c === c);
        if (exists) {
            // It's a loop!
            this.addToPath(dot, true);
        } else {
            this.addToPath(dot);
        }
    }

    handlePointerUp() {
        if (!this.isDragging) return;
        this.isDragging = false;

        if (this.selectionPath.length >= 2) {
            const result = this.game.processMove(this.selectionPath);
            if (result) {
                this.handleMoveResult(result);
            }
        }

        this.clearSelection();
    }

    addToPath(dotElement, isLoop = false) {
        const r = parseInt(dotElement.dataset.r);
        const c = parseInt(dotElement.dataset.c);

        this.selectionPath.push({ r, c, el: dotElement });
        dotElement.classList.add('selected');

        if (isLoop) {
            this.selectionPath.forEach(p => p.el.classList.add('pulsing'));
            // Visual feedback: pulse all same color dots
            document.querySelectorAll('.dot').forEach(d => {
                const dr = parseInt(d.dataset.r);
                const dc = parseInt(d.dataset.c);
                if (this.game.grid[dr][dc] === this.game.grid[r][c]) {
                    d.classList.add('pulsing');
                }
            });
        }

        this.drawLines();

        // Haptic/Sound placeholder
        if (window.navigator.vibrate) window.navigator.vibrate(10);
    }

    removeFromPath() {
        const removed = this.selectionPath.pop();
        removed.el.classList.remove('selected', 'pulsing');

        // Only stop pulsing everything if we broke the loop
        const stillLoop = this.game.detectLoop(this.selectionPath);
        if (!stillLoop) {
            document.querySelectorAll('.dot.pulsing').forEach(el => el.classList.remove('pulsing'));
        }

        this.drawLines();
    }

    drawLines() {
        this.connectionLayer.innerHTML = '';
        if (this.selectionPath.length < 1) return;

        const color = COLORS[this.game.grid[this.selectionPath[0].r][this.selectionPath[0].c]];

        for (let i = 0; i < this.selectionPath.length - 1; i++) {
            const p1 = this.selectionPath[i];
            const p2 = this.selectionPath[i + 1];

            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            const rect1 = p1.el.getBoundingClientRect();
            const rect2 = p2.el.getBoundingClientRect();
            const boardRect = this.boardElement.getBoundingClientRect();

            line.setAttribute('x1', rect1.left - boardRect.left + rect1.width / 2);
            line.setAttribute('y1', rect1.top - boardRect.top + rect1.height / 2);
            line.setAttribute('x2', rect2.left - boardRect.left + rect2.width / 2);
            line.setAttribute('y2', rect2.top - boardRect.top + rect2.height / 2);
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', '6');
            line.setAttribute('stroke-linecap', 'round');

            this.connectionLayer.appendChild(line);
        }
    }

    handleMoveResult(result) {
        if (result.isLoop) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 },
                colors: [COLORS[result.clearedColor]]
            });
        }

        this.updateHUD();
        this.renderBoard();

        if (this.game.score >= this.game.targetScore) {
            this.showWin();
        } else if (this.game.moves <= 0) {
            this.showGameOver();
        }
    }

    clearSelection() {
        document.querySelectorAll('.dot').forEach(el => el.classList.remove('selected', 'pulsing'));
        this.selectionPath = [];
        this.connectionLayer.innerHTML = '';
    }

    updateHUD() {
        document.getElementById('moves-count').textContent = this.game.moves;
        document.getElementById('current-score').textContent = this.game.score;
        document.getElementById('target-score').textContent = this.game.targetScore;
        document.getElementById('level-number').textContent = this.game.level;

        const progress = Math.min((this.game.score / this.game.targetScore) * 100, 100);
        document.getElementById('score-fill').style.width = `${progress}%`;
    }

    showWin() {
        const overlay = document.getElementById('overlay');
        const title = document.getElementById('modal-title');
        const content = document.getElementById('modal-content');
        const btn = document.getElementById('modal-btn-primary');

        title.textContent = 'Level Complete!';
        content.innerHTML = `<p>Amazing! You reached the target with ${this.game.moves} moves left.</p>`;
        btn.textContent = 'Next Level';
        btn.onclick = () => {
            overlay.classList.add('hidden');
            this.currentLevelIndex++;
            this.loadLevel(this.currentLevelIndex);
        };
        overlay.classList.remove('hidden');

        confetti({
            particleCount: 150,
            spread: 180,
            origin: { y: 0.3 }
        });
    }

    showGameOver() {
        const overlay = document.getElementById('overlay');
        const title = document.getElementById('modal-title');
        const content = document.getElementById('modal-content');
        const btn = document.getElementById('modal-btn-primary');

        title.textContent = 'Out of Moves!';
        content.innerHTML = `<p>Final Score: ${this.game.score}</p>`;
        btn.textContent = 'Retry';
        btn.onclick = () => location.reload();
        overlay.classList.remove('hidden');
    }
}

new GameUI();
