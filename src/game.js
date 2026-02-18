export const COLORS = {
    RED: '#FF6B6B',
    BLUE: '#4D96FF',
    GREEN: '#6BCB77',
    YELLOW: '#FFD93D'
};

export const COLOR_KEYS = Object.keys(COLORS);

export class GameEngine {
    constructor(levelConfig = { moves: 30, targetScore: 1000, colors: 4, gridSize: 6 }) {
        this.rows = levelConfig.gridSize;
        this.cols = levelConfig.gridSize;
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
        return COLOR_KEYS[Math.floor(Math.random() * COLOR_KEYS.length)];
    }

    getDot(r, c) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
        return this.grid[r][c];
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
        // A loop exists if the last dot is connected to a dot already in the path (excluding the previous one)
        // For simplicity in this implementation, we check if any coord is repeated
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
            // Clear all dots of this color
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

        // Apply clearing
        for (const { r, c } of dotsToClear) {
            this.grid[r][c] = null;
        }

        const changes = this.applyGravity();
        this.moves--;

        return {
            clearedColor: color,
            isLoop,
            clearedCount: dotsToClear.length,
            changes
        };
    }

    applyGravity() {
        const changes = []; // Track movements for animation

        for (let c = 0; c < this.cols; c++) {
            const column = [];
            for (let r = 0; r < this.rows; r++) {
                if (this.grid[r][c] !== null) {
                    column.push(this.grid[r][c]);
                }
            }

            const missing = this.rows - column.length;
            const newDots = [];
            for (let i = 0; i < missing; i++) {
                newDots.push(this.getRandomColor());
            }

            const finalColumn = [...newDots, ...column];
            for (let r = 0; r < this.rows; r++) {
                this.grid[r][c] = finalColumn[r];
            }

            changes.push({
                col: c,
                newDots,
                shiftedCount: column.length
            });
        }

        return changes;
    }
}

