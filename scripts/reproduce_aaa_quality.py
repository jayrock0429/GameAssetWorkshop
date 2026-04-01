import os
import sys

# 修正匯入路徑問題
sys.path.append(os.getcwd())
from scripts.slot_ai_creator import SlotAICreator

def reproduce_aaa_test():
    creator = SlotAICreator(theme="DragonBall_AAA_Verification")
    
    # 測試項目 1: UI Header (驗證寬橫幅結構與 3D 質感)
    print("\n--- Generating UI_Header (Wide Banner Test) ---")
    header_prompt = creator.generate_component_prompts(
        theme="Dragon Ball Z", 
        component_type="UI_Header",
        layout_mode="Cabinet",
        style_profile="Anime_Stylized"
    )
    header_path = os.path.join(creator.output_dir, "AAA_Header_Verification.png")
    creator.generate_image_from_api(header_prompt, header_path, layout_mode="Cabinet")
    
    # 測試項目 2: Mascot (驗證贏家能量、側邊定位與去背品質)
    print("\n--- Generating Mascot (Character Depth Test) ---")
    mascot_prompt = creator.generate_component_prompts(
        theme="Dragon Ball Z Super Saiyan Goku", 
        component_type="Mascot",
        layout_mode="Cabinet",
        style_profile="Anime_Stylized"
    )
    mascot_path = os.path.join(creator.output_dir, "AAA_Mascot_Verification.png")
    # For mascot, we want a taller or square-ish aspect ratio depending on convention, 
    # but the API handles the aspect ratio based on layout_mode usually.
    creator.generate_image_from_api(mascot_prompt, mascot_path, layout_mode="Cabinet")

    print("\n✅ AAA Quality Reproduction Task Completed.")
    print(f"Header: {header_path}")
    print(f"Mascot: {mascot_path}")

if __name__ == "__main__":
    reproduce_aaa_test()
