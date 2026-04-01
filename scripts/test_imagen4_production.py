import os
import sys
import json

# Set scripts path
script_dir = os.path.join(os.getcwd(), 'scripts')
sys.path.append(script_dir)
from slot_ai_creator import SlotAICreator

def test_imagen4_production():
    print("--- [START] Imagen 4.0 Final Verification ---")
    
    # Initialize Creator
    creator = SlotAICreator()
    
    # Requirement: A professional slot game bg
    # style: 3D_Premium
    # mock: False (Important!)
    result = creator.run_fully_autonomous(
        requirement="A high-end Japanese Anime style slot background, vibrant colors, cinematic lighting",
        mock=False,
        symbol_list=["GoldCoin"],
        layout_mode="Cabinet"
    )
    
    print("\n--- [RESULT] ---")
    print(f"Status: {result.get('status')}")
    print(f"Preview Path: {result.get('image')}")
    
    if os.path.exists(result.get("image")):
        print(f"SUCCESS: Preview generated at {result.get('image')}")
    else:
        print("FAILED: Preview file not found.")

if __name__ == "__main__":
    test_imagen4_production()
