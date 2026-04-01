import os
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

def simulate_win_state(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Skipping Win State: {input_path} not found.")
        return
    
    print(f"Generating Win State from {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    
    # 1. Glow Effect (Blur + Brightness)
    glow = img.filter(ImageFilter.GaussianBlur(radius=20))
    enhancer = ImageEnhance.Brightness(glow)
    glow = enhancer.enhance(2.5) # Brighten significantly
    
    # 2. Composite: Glow behind original, but original also popped
    # Actually, usually Win State is the *same* object but glowing.
    # Let's paste the glow *under* the object?
    # Or just add the glow on top with screen mode?
    # Let's keep it simple: Make the object brighter and add a "Back Glow"
    
    canvas = Image.new("RGBA", img.size, (0,0,0,0))
    canvas.paste(glow, (0,0), glow) # Back glow
    
    # Enhance original
    enhancer_contrast = ImageEnhance.Contrast(img)
    img_popped = enhancer_contrast.enhance(1.2)
    
    canvas.paste(img_popped, (0,0), img_popped)
    
    # Add a "Sparkle" overlay (Simulated by random white dots? maybe too complex for quick script)
    # Just save it.
    canvas.save(output_path)
    print(f"Saved Win State visual: {output_path}")

def simulate_character_sheet(input_path, output_path):
    if not os.path.exists(input_path):
        print(f"Skipping Character Sheet: {input_path} not found.")
        return

    print(f"Generating Character Sheet from {input_path}...")
    img = Image.open(input_path).convert("RGBA")
    
    # Resize for sheet (e.g. 512px height)
    target_h = 512
    ratio = target_h / img.height
    target_w = int(img.width * ratio)
    img_small = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Sheet size: 3x width, slightly taller for text
    sheet_w = target_w * 3 + 100
    sheet_h = target_h + 150
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (255, 255, 255, 255)) # White BG standard for sheets
    
    # 1. Front View (Center)
    x_center = (sheet_w - target_w) // 2
    y_pos = 100
    sheet.paste(img_small, (x_center, y_pos), img_small)
    
    # 2. Side View (Left) - Simulate by squashing width slightly?
    # Or just resizing to look like 3/4?
    side = img_small.resize((int(target_w * 0.8), target_h))
    sheet.paste(side, (50, y_pos), side)
    
    # 3. Back View (Right) - Simulate by flipping? (Not accurate but proves layout)
    # Or grayscaling to show "Back"?
    back = ImageOps.mirror(img_small)
    # Tint it darker to simulate "Back" (often unlit)
    # back = ImageEnhance.Brightness(back).enhance(0.7)
    sheet.paste(back, (sheet_w - target_w - 50, y_pos), back)
    
    # Add Text Labels (Simulated)
    # We don't have a font easily, so just saving the image layout.
    
    sheet.save(output_path)
    print(f"Saved Character Sheet visual: {output_path}")

if __name__ == "__main__":
    base_dir = r"c:\Antigracity\GameAssetWorkshop\output"
    
    # Source candidates (High Quality ones)
    wild_src = os.path.join(base_dir, "Fortune_Dragon_PG_Wild.png")
    mascot_src = os.path.join(base_dir, "Fortune_Dragon_PG_Mascot.png")
    
    # If not found, try alternatives
    if not os.path.exists(wild_src):
        # Listing showed Fortune_Dragon_PG_Wild.png exists? 
        # Let's check other candidates.
        # DragonBall_V5_Real_Test_Symbol.png (857KB)
        pass
        
    simulate_win_state(wild_src, os.path.join(base_dir, "Visual_Proof_Win_State.png"))
    simulate_character_sheet(mascot_src, os.path.join(base_dir, "Visual_Proof_Character_Sheet.png"))
