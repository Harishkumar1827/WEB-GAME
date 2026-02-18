import random

class DotGame:
    def __init__(self, rows=6, cols=6, colors=['red', 'blue', 'green', 'yellow']):
        self.rows = rows
        self.cols = cols
        self.colors = colors
        self.grid = [[random.choice(self.colors) for _ in range(cols)] for _ in range(rows)]
        self.score = 0
        self.moves_left = 30

    def display(self):
        """Simple ASCII display of the grid."""
        print(f"\nScore: {self.score} | Moves: {self.moves_left}")
        print("   " + " ".join(f"{i:2}" for i in range(self.cols)))
        for r in range(self.rows):
            row_str = " ".join(f"{self.grid[r][c][:3]:3}" for c in range(self.cols))
            print(f"{r:2}: {row_str}")

    def is_adjacent(self, p1, p2):
        """Check if two points are horizontal or vertical neighbors."""
        r1, c1 = p1
        r2, c2 = p2
        return (abs(r1 - r2) == 1 and c1 == c2) or (abs(c1 - c2) == 1 and r1 == r2)

    def validate_path(self, path):
        """Check if a path of coordinates is valid (same color, adjacent)."""
        if len(path) < 2:
            return False
        
        color = self.grid[path[0][0]][path[0][1]]
        for i in range(len(path) - 1):
            p1, p2 = path[i], path[i+1]
            if not self.is_adjacent(p1, p2):
                return False
            if self.grid[p2[0]][p2[1]] != color:
                return False
            
        return True

    def detect_loop(self, path):
        """Detect if the path forms a loop.
        A loop exists if the same coordinate appears twice in the path.
        """
        return len(path) != len(set(path))

    def process_move(self, path):
        """Execute a move if the path is valid."""
        if self.moves_left <= 0:
            print("No moves left!")
            return False

        if not self.validate_path(path):
            print("Invalid path!")
            return False

        color = self.grid[path[0][0]][path[0][1]]
        dots_to_clear = set(path)

        # If it's a loop, clear all dots of that color
        if self.detect_loop(path):
            print(f"LOOP DETECTED! Clearing all {color} dots.")
            for r in range(self.rows):
                for c in range(self.cols):
                    if self.grid[r][c] == color:
                        dots_to_clear.add((r, c))
            self.score += len(dots_to_clear) * 2 # Double points for loop
        else:
            self.score += len(dots_to_clear)

        # Mark for clearing
        for r, c in dots_to_clear:
            self.grid[r][c] = None

        self.apply_gravity()
        self.moves_left -= 1
        return True

    def apply_gravity(self):
        """Shift dots down and fill with new ones."""
        for c in range(self.cols):
            # 1. Collect all non-empty dots in this column
            column_dots = [self.grid[r][c] for r in range(self.rows) if self.grid[r][c] is not None]
            
            # 2. Fill the column from bottom to top
            for r in range(self.rows - 1, -1, -1):
                if column_dots:
                    self.grid[r][c] = column_dots.pop()
                else:
                    self.grid[r][c] = random.choice(self.colors)

if __name__ == "__main__":
    game = DotGame()
    print("Welcome to DotLink Engine (CLI Demo)")
    game.display()
    
    # Simple interactive loop for testing
    while game.moves_left > 0:
        try:
            line = input("\nEnter path as r,c r,c ... (or 'q' to quit): ")
            if line.lower() == 'q':
                break
            
            coords = []
            for part in line.split():
                r, c = map(int, part.split(','))
                coords.append((r, c))
            
            if game.process_move(coords):
                game.display()
        except Exception as e:
            print(f"Error: {e}. Use format '0,0 0,1 1,1'")

    print(f"Game Over! Final Score: {game.score}")
