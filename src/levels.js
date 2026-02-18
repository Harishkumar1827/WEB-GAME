export const LEVELS = [];

// Helper to generate 50 levels
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
