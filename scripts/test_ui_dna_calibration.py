import os
import sys

# [V3.2] Add project root to path
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
if project_root not in sys.path:
    sys.path.append(project_root)

from scripts.slot_ai_creator import SlotAICreator

def test_ui_dna_calibration():
    print("DEBUG: [V3.2 DNA Calibration] Starting Global Slot UI Test...")
    creator = SlotAICreator(theme="Cyberpunk Treasure")
    
    # 1. 同步 Pinterest DNA
    pinterest_url = "https://www.pinterest.com/search/pins/?q=slot%20ui&rs=typed"
    creator.sync_from_url(pinterest_url)
    
    # 2. 生成寬幅 Header
    out_path = os.path.join("output", "Slot_UI_Calibrated_Wide_Header.png")
    prompt = creator.generate_component_prompts(
        theme="Cyberpunk Treasure",
        component_type="UI_Header",
        layout_mode="Cabinet",
        tier="High_Pay"
    )
    
    print(f"\n[V3.2 VALIDATION] Prompt Hook: {prompt[:100]}...")
    
    # 強制執行生成 (使用 Imagen 4.0 Fast)
    creator.generate_image_from_api(prompt, out_path)
    
    print("\n[OK] Slot UI DNA Calibration Completed.")

if __name__ == "__main__":
    test_ui_dna_calibration()
