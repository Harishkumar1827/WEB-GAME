// --- LEVELS ---
const LEVELS = [];
for (let i = 1; i <= 50; i++) {
    const moves = Math.max(35 - i, 15);
    const targetScore = 500 + (i * 200);
    const colors = i < 5 ? 3 : (i < 15 ? 4 : (i < 30 ? 5 : 6));
    LEVELS.push({
        id: i,
        moves,
        targetScore,
        colors,
        gridSize: i < 20 ? 6 : 7
    });
}

// --- ENGINE ---
const COLORS = {
    RED: '#FF6B6B',
    BLUE: '#4D96FF',
    GREEN: '#6BCB77',
    YELLOW: '#FFD93D'
};
const COLOR_KEYS = Object.keys(COLORS);

class GameEngine {
    constructor(levelConfig = { moves: 30, targetScore: 1000, colors: 4, gridSize: 6 }) {
        this.rows = levelConfig.gridSize || 6;
        this.cols = levelConfig.gridSize || 6;
        this.grid = [];
        this.score = 0;
        this.moves = levelConfig.moves;
        this.targetScore = levelConfig.targetScore;
        this.colorCount = levelConfig.colors;
        this.level = levelConfig.id || 1;
        this.initGrid();
    }

    initGrid() {
        this.grid = [];
        for (let r = 0; r < this.rows; r++) {
            const row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push(this.getRandomColor());
            }
            this.grid.push(row);
        }
    }

    getRandomColor() {
        return COLOR_KEYS[Math.floor(Math.random() * this.colorCount)];
    }

    isAdjacent(p1, p2) {
        return (Math.abs(p1.r - p2.r) === 1 && p1.c === p2.c) ||
            (Math.abs(p1.c - p2.c) === 1 && p1.r === p2.r);
    }

    validatePath(path) {
        if (path.length < 2) return false;
        const color = this.grid[path[0].r][path[0].c];
        for (let i = 1; i < path.length; i++) {
            const current = path[i];
            const prev = path[i - 1];
            if (!this.isAdjacent(current, prev)) return false;
            if (this.grid[current.r][current.c] !== color) return false;
        }
        return true;
    }

    detectLoop(path) {
        const seen = new Set();
        for (const p of path) {
            const key = `${p.r},${p.c}`;
            if (seen.has(key)) return true;
            seen.add(key);
        }
        return false;
    }

    processMove(path) {
        if (this.moves <= 0) return null;
        if (!this.validatePath(path)) return null;

        const color = this.grid[path[0].r][path[0].c];
        const isLoop = this.detectLoop(path);
        let dotsToClear = [];

        if (isLoop) {
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.grid[r][c] === color) {
                        dotsToClear.push({ r, c });
                    }
                }
            }
            this.score += dotsToClear.length * 20;
        } else {
            dotsToClear = path;
            this.score += dotsToClear.length * 10;
        }

        for (const { r, c } of dotsToClear) {
            this.grid[r][c] = null;
        }

        this.applyGravity();
        this.moves--;

        return { clearedColor: color, isLoop, clearedCount: dotsToClear.length };
    }

    applyGravity() {
        for (let c = 0; c < this.cols; c++) {
            const column = [];
            for (let r = 0; r < this.rows; r++) {
                if (this.grid[r][c] !== null) column.push(this.grid[r][c]);
            }
            const missing = this.rows - column.length;
            const finalColumn = [];
            for (let i = 0; i < missing; i++) finalColumn.push(this.getRandomColor());
            finalColumn.push(...column);
            for (let r = 0; r < this.rows; r++) this.grid[r][c] = finalColumn[r];
        }
    }
}

// --- UI ---
class GameUI {
    constructor() {
        this.currentLevelIndex = 0;
        this.boardElement = document.getElementById('game-board');
        this.connectionLayer = document.getElementById('connection-layer');
        this.selectionPath = [];
        this.isDragging = false;

        this.loadLevel(this.currentLevelIndex);
        this.setupListeners();
    }

    loadLevel(index) {
        this.game = new GameEngine(LEVELS[index]);
        this.boardElement.style.gridTemplateColumns = `repeat(${this.game.cols}, 1fr)`;
        this.boardElement.style.gridTemplateRows = `repeat(${this.game.rows}, 1fr)`;
        this.renderBoard();
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
                inner.style.color = COLORS[colorKey];

                dot.appendChild(inner);
                this.boardElement.appendChild(dot);
            }
        }
    }

    setupListeners() {
        this.boardElement.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        window.addEventListener('pointerup', () => this.handlePointerUp());
        this.boardElement.addEventListener('contextmenu', (e) => e.preventDefault());
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
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const dot = target?.closest('.dot');
        if (!dot) return;

        const r = parseInt(dot.dataset.r);
        const c = parseInt(dot.dataset.c);
        if (isNaN(r) || isNaN(c)) return;

        const last = this.selectionPath[this.selectionPath.length - 1];
        if (!last || (last.r === r && last.c === c)) return;

        // Start dot color
        const startDot = this.selectionPath[0];
        if (this.game.grid[r][c] !== this.game.grid[startDot.r][startDot.c]) return;
        if (!this.game.isAdjacent(last, { r, c })) return;

        // Backtrack detection
        if (this.selectionPath.length > 1) {
            const secondLast = this.selectionPath[this.selectionPath.length - 2];
            if (secondLast.r === r && secondLast.c === c) {
                this.removeFromPath();
                return;
            }
        }

        // Add to path + loop detection
        const existingIndex = this.selectionPath.findIndex(p => p.r === r && p.c === c);
        if (existingIndex !== -1) {
            this.addToPath(dot, true);
        } else {
            const isPathAlreadyLoop = this.selectionPath.some((p, i) =>
                this.selectionPath.findIndex(p2 => p2.r === p.r && p2.c === p.c) !== i
            );
            if (!isPathAlreadyLoop) {
                this.addToPath(dot);
            }
        }
    }

    handlePointerUp() {
        if (!this.isDragging) return;
        this.isDragging = false;
        if (this.selectionPath.length >= 2) {
            const result = this.game.processMove(this.selectionPath);
            if (result) this.handleMoveResult(result);
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
            document.querySelectorAll('.dot').forEach(d => {
                const dr = parseInt(d.dataset.r);
                const dc = parseInt(d.dataset.c);
                if (this.game.grid[dr][dc] === this.game.grid[r][c]) d.classList.add('pulsing');
            });
        }
        this.drawLines();
    }

    removeFromPath() {
        const removed = this.selectionPath.pop();
        removed.el.classList.remove('selected', 'pulsing');
        const stillLoop = this.selectionPath.some((p, i) =>
            this.selectionPath.findIndex(p2 => p2.r === p.r && p2.c === p.c) !== i
        );
        if (!stillLoop) document.querySelectorAll('.dot.pulsing').forEach(el => el.classList.remove('pulsing'));
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
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: [COLORS[result.clearedColor]] });
        }
        this.updateHUD();
        this.renderBoard();
        if (this.game.score >= this.game.targetScore) this.showWin();
        else if (this.game.moves <= 0) this.showGameOver();
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
        confetti({ particleCount: 150, spread: 180, origin: { y: 0.3 } });
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

// Start the game
window.addEventListener('DOMContentLoaded', () => {
    new GameUI();
    if (window.lucide) window.lucide.createIcons();
});
