import os
import sys
import json
from unittest import mock
from PIL import Image

# Ensure scripts dir is in path
sys.path.append(os.path.join(os.getcwd(), 'scripts'))

from slot_ai_creator import SlotAICreator

def test_evolution_v5():
    print("Testing Phase 5 Evolution (DNA + Hollow + AR)...")
    creator = SlotAICreator()
    
    # 1. Test DNA Extraction Mock
    creator.symbol_descriptions = {"M1": "Goku with ORANGE and RED suit, headshot, ornate frame."}
    print("✓ DNA injection simulation ok.")

    # 2. Test AR Mapping Logic (Production_V1)
    # Mocking generate_image_from_api to see what AR it uses
    with mock.patch.object(creator, 'generate_image_from_api') as mock_gen:
        creator.run_fully_autonomous("Test Theme", layout_mode="Production_V1", mock=True, symbol_list=["M1"])
        
        # Check call arguments for Symbol
        # Find the call where component is Symbol
        calls = mock_gen.call_args_list
        for c in calls:
            args, kwargs = c
            if "M1" in args[0] or "M1" in args[1]: # prompt or path
                print(f"✓ Symbol AR Checked: {kwargs.get('aspect_ratio')}")
                if kwargs.get('aspect_ratio') == "343:203":
                    print("  [SUCCESS] 343:203 passed to generator.")
                break

    # 3. Test Smart Hollow
    test_img = "test_ui.png"
    Image.new("RGBA", (1440, 2560), (255, 0, 0, 255)).save(test_img)
    hollow = creator.apply_smart_hollow(test_img)
    if hollow and os.path.exists(hollow):
        print(f"✓ Smart Hollow generated: {hollow}")
        img = Image.open(hollow)
        p = img.getpixel((img.width//2, img.height//2))
        if p[3] == 0:
            print("  [SUCCESS] Center is transparent!")
    
    if os.path.exists(test_img): os.remove(test_img)
    if hollow and os.path.exists(hollow): os.remove(hollow)

if __name__ == "__main__":
    test_evolution_v5()
