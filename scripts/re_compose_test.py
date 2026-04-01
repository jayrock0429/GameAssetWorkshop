import os
import sys
import json
from PIL import Image

# Set scripts path
script_dir = os.path.join(os.getcwd(), 'scripts')
sys.path.append(script_dir)
from slot_ai_creator import SlotAICreator

def re_compose():
    creator = SlotAICreator()
    # The folder from the previous run
    target_dir = r"d:\AG\GameAssetWorkshop\output\A high-end Japanese Anime style slot background, vibrant colors, cinematic lighting_1771901699"
    theme = "A high-end Japanese Anime style slot background, vibrant colors, cinematic lighting"
    
    results = {
        "background": os.path.join(target_dir, "A_high-end_Japanese_Anime_style_slot_background_vibrant_colors_cinematic_lighting_BG.png"),
        "ui_header": os.path.join(target_dir, "A_high-end_Japanese_Anime_style_slot_background_vibrant_colors_cinematic_lighting_UI_Header_transparent.png"),
        "ui_base": os.path.join(target_dir, "A_high-end_Japanese_Anime_style_slot_background_vibrant_colors_cinematic_lighting_UI_Base_transparent.png"),
        "ui_pillar": os.path.join(target_dir, "A_high-end_Japanese_Anime_style_slot_background_vibrant_colors_cinematic_lighting_UI_Pillar_transparent.png"),
        "symbols": {
            "GoldCoin": os.path.join(target_dir, "A_high-end_Japanese_Anime_style_slot_background_vibrant_colors_cinematic_lighting_GoldCoin_transparent.png")
        }
    }
    
    # Update creator output_dir to save in the same folder
    creator.output_dir = target_dir
    
    print("Re-composing preview with Auto-Crop...")
    preview_path = creator.compose_preview_image(results, theme, layout_mode="Cabinet")
    print(f"DONE: New preview at {preview_path}")

if __name__ == "__main__":
    re_compose()
