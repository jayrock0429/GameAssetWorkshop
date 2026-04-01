
import sys
import os

# Add scripts to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)

from slot_ai_creator import SlotAICreator

def test_native_resolution_logic():
    print("=== Testing Native Resolution Generation Logic ===")
    creator = SlotAICreator()
    
    # Mock generate_image_from_api to capture the aspect_ratio passed to it
    captured_ars = {}
    original_gen = creator.generate_image_from_api
    
    def mock_gen(prompt, path, **kwargs):
        comp_name = os.path.basename(path).split("_")[-1].replace(".png", "")
        captured_ars[comp_name] = kwargs.get("aspect_ratio")
        print(f" [CAPTURE] Component: {comp_name}, AR: {kwargs.get('aspect_ratio')}")
        return True
        
    creator.generate_image_from_api = mock_gen
    
    # Run fully autonomous (with mock=True to keep it fast)
    creator.run_fully_autonomous("ResolutionTest", mock=True, layout_mode="Cabinet")
    
    # Verification for Cabinet (1280x720)
    # Header: 720 * 0.12 = 86.4 -> 86
    # Base: 720 * 0.15 = 108
    expected_header_ar = "1280x86"
    expected_base_ar = "1280x108"
    
    print("\nVerifying Cabinet Resolutions...")
    if captured_ars.get("Header") == expected_header_ar:
        print(f" [OK] Header AR: {captured_ars.get('Header')}")
    else:
        print(f" [FAIL] Header AR: {captured_ars.get('Header')}, Expected: {expected_header_ar}")
        
    if captured_ars.get("Base") == expected_base_ar:
        print(f" [OK] Base AR: {captured_ars.get('Base')}")
    else:
        print(f" [FAIL] Base AR: {captured_ars.get('Base')}, Expected: {expected_base_ar}")

if __name__ == "__main__":
    test_native_resolution_logic()
