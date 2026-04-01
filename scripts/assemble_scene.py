import os
import random
import glob
from PIL import Image

# Configuration
OUTPUT_WIDTH = 1280
OUTPUT_HEIGHT = 720
ASSET_DIR = r"d:\AG\GameAssetWorkshop\output"
OUTPUT_PATH = r"d:\AG\GameAssetWorkshop\slot_game_mockup.png"

def find_file(pattern):
    """Finds the first file matching the pattern in ASSET_DIR."""
    search_pattern = os.path.join(ASSET_DIR, pattern)
    files = glob.glob(search_pattern)
    if files:
        return files[0]
    return None

def resize_contain(image, max_w, max_h):
    """Resize image to fit within max_w and max_h, maintaining aspect ratio."""
    ratio = min(max_w / image.width, max_h / image.height)
    new_w = int(image.width * ratio)
    new_h = int(image.height * ratio)
    return image.resize((new_w, new_h), Image.Resampling.LANCZOS)

def resize_cover(image, target_w, target_h):
    """Resize image to cover target_w and target_h, cropping if necessary."""
    img_ratio = image.width / image.height
    target_ratio = target_w / target_h
    
    if img_ratio > target_ratio:
        # Image is wider than target
        new_h = target_h
        new_w = int(new_h * img_ratio)
    else:
        # Image is taller than target
        new_w = target_w
        new_h = int(new_w / img_ratio)
        
    resized = image.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Center crop
    left = (new_w - target_w) // 2
    top = (new_h - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))

def main():
    # 1. Create Canvas
    canvas = Image.new('RGBA', (OUTPUT_WIDTH, OUTPUT_HEIGHT), (0, 0, 0, 255))
    
    # 2. Find and Load Assets
    try:
        # Background - Use the specific 16:9 clean background
        # Note: Since we know the exact name now, we can try direct access or flexible search
        bg_path = os.path.join(r"d:\AG\GameAssetWorkshop", "final_background_16_9.png")
        if not os.path.exists(bg_path):
             # Fallback to output folder
            bg_path = find_file("final_background_16_9.png")
        
        bg_img = Image.open(bg_path).convert("RGBA")
        
        # Frame - New Concept Base
        frame_path = find_file("concept_frame_raw*trans.png")
        if not frame_path:
             frame_path = find_file("slot_frame*trans.png") # Fallback
        frame_img = Image.open(frame_path).convert("RGBA")
        
        # UI - New Concept Base
        panel_path = find_file("concept_ui_panel_raw*trans.png")
        if not panel_path:
             panel_path = find_file("slot_ui_bottom_panel*trans.png") # Fallback
        panel_img = Image.open(panel_path).convert("RGBA")
        
        spin_path = find_file("slot_ui_spin_button*trans.png")
        spin_img = Image.open(spin_path).convert("RGBA")
        
        # Load Symbols
        # Prioritize the new "Concept Tiger"
        tiger_path = os.path.join(ASSET_DIR, "concept_symbol_tiger.png")
        if os.path.exists(tiger_path):
            tiger_img = Image.open(tiger_path).convert("RGBA")
            # Make the tiger appear more often
            symbols = [tiger_img] * 6 
        else:
            symbols = []

        # Add other existing symbols for variety
        other_files = [f for f in os.listdir(ASSET_DIR) if f.endswith("trans.png") and 
                        ("high_pay" in f or "low_pay" in f) and "concept_symbol_tiger" not in f]
        
        for f in other_files:
             symbols.append(Image.open(os.path.join(ASSET_DIR, f)).convert("RGBA"))
        
        if not symbols:
            raise Exception("No symbol images found!")
            
    except Exception as e:
        print(f"Error loading assets: {e}")
        return

    # 3. Layer 1: Background
    bg_resized = resize_cover(bg_img, OUTPUT_WIDTH, OUTPUT_HEIGHT)
    canvas.paste(bg_resized, (0, 0))
    
    # 4. Layer 2: Symbol Grid
    # Define Grid Layout (Adjust based on visual preference)
    GRID_ROWS = 3
    GRID_COLS = 5
    SYMBOL_SIZE = 130 # Target size for symbols based on 1280x720
    
    # Calculate Grid total size
    grid_w = GRID_COLS * SYMBOL_SIZE
    grid_h = GRID_ROWS * SYMBOL_SIZE
    
    GRID_START_X = (OUTPUT_WIDTH - grid_w) // 2
    GRID_START_Y = (OUTPUT_HEIGHT - grid_h) // 2 - 20 # Roughly centered
    
    # Create a temporary transparent layer for symbols
    symbol_layer = Image.new('RGBA', (OUTPUT_WIDTH, OUTPUT_HEIGHT), (0,0,0,0))
    
    for row in range(GRID_ROWS):
        for col in range(GRID_COLS):
            sym_img = random.choice(symbols)
            # Resize symbol uniformly
            sym_resized = resize_contain(sym_img, SYMBOL_SIZE - 10, SYMBOL_SIZE - 10)
            
            # Center calculation
            x = GRID_START_X + col * SYMBOL_SIZE + (SYMBOL_SIZE - sym_resized.width) // 2
            y = GRID_START_Y + row * SYMBOL_SIZE + (SYMBOL_SIZE - sym_resized.height) // 2
            
            symbol_layer.alpha_composite(sym_resized, (x, y))
            
    canvas.alpha_composite(symbol_layer)

    # 5. Layer 3: Frame
    # Scale frame to wrap around the grid
    # Assuming the specific frame generated might have wide pillars, 
    # let's try to fit it to the screen height with some padding
    FRAME_HEIGHT = int(OUTPUT_HEIGHT * 0.9)
    # Calculate width proportionally
    ratio = FRAME_HEIGHT / frame_img.height
    FRAME_WIDTH = int(frame_img.width * ratio)
    
    frame_resized = frame_img.resize((FRAME_WIDTH, FRAME_HEIGHT), Image.Resampling.LANCZOS)
    
    # Center Frame
    fx = (OUTPUT_WIDTH - frame_resized.width) // 2
    fy = (OUTPUT_HEIGHT - frame_resized.height) // 2 - 30 
    
    canvas.alpha_composite(frame_resized, (fx, fy))
    
    # 6. Layer 4: UI
    # Bottom Panel
    PANEL_WIDTH = int(OUTPUT_WIDTH * 0.8)
    panel_resized = resize_contain(panel_img, PANEL_WIDTH, 140)
    px = (OUTPUT_WIDTH - panel_resized.width) // 2
    py = OUTPUT_HEIGHT - panel_resized.height - 10
    canvas.alpha_composite(panel_resized, (px, py))
    
    # Spin Button
    SPIN_SIZE = 140
    spin_resized = resize_contain(spin_img, SPIN_SIZE, SPIN_SIZE)
    # Position to the right, slightly overlapping panel or next to it
    sx = OUTPUT_WIDTH - spin_resized.width - 40
    sy = OUTPUT_HEIGHT - spin_resized.height - 40
    canvas.alpha_composite(spin_resized, (sx, sy))

    # Save
    canvas.save(OUTPUT_PATH)
    print(f"Mockup saved to: {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
