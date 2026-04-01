import os
import sys

# 
sys.path.append(os.getcwd())
from scripts.slot_ai_creator import SlotAICreator

def test_egypt_calibration():
    print("[RUN] Slot Art Engine V3.1 - Benchmark Calibration: Ancient Egypt")
    print("=" * 70)
    
    creator = SlotAICreator(theme="Egypt_Calibration_V3_1")
    
    #  ( Pinterest )
    pinterest_url = "https://www.pinterest.com/search/pins/?q=ancient%20egypt%20slot%20game%20ui"
    creator.sync_from_url(pinterest_url)
    
    #  ( Header )
    test_suite = [
        {"type": "UI_Header", "tier": "High_Pay", "name": "Golden_Egypt_Wide_Frame_Header"},
        {"type": "Symbol", "tier": "High_Pay", "name": "Eye_of_Horus_Gold_Wild"},
    ]
    
    for item in test_suite:
        print(f"\n[V3.1 Process] Component: {item['type']} | Sync Active: {bool(creator.vision_sync_context)}")
        prompt = creator.generate_component_prompts(
            theme="Ancient Egypt",
            component_type=item["type"],
            tier=item["tier"],
            style_profile="3D_Premium"
        )
        
        #  Prompt 
        print(f"  [OK] Prompt Peek: {prompt[:150]}...")
        
        out_name = f"Egypt_Calibrated_{item['name']}.png"
        out_path = os.path.join(creator.output_dir, out_name)
        
        # 
        creator.generate_image_from_api(prompt, out_path)

    print("\n[OK] Egypt Calibration V3.1 Completed. Please check original output folder.")

if __name__ == "__main__":
    test_egypt_calibration()
