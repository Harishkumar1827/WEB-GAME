from dot_engine import DotGame

def test_engine():
    game = DotGame(rows=3, cols=3, colors=['red']) # All same color for easy testing
    game.display()
    
    # Test valid path
    path = [(0,0), (0,1), (1,1)]
    print(f"Testing path: {path}")
    success = game.process_move(path)
    print(f"Move success: {success}")
    game.display()
    
    # Test loop (entire board since all are same color)
    print("\nTesting loop by connecting 0,0 0,1 1,1 1,0 0,0")
    loop_path = [(0,0), (0,1), (1,1), (1,0), (0,0)]
    game.process_move(loop_path)
    game.display()

if __name__ == "__main__":
    test_engine()
