
import sys
import os
import json

# Add scripts to path
script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)

from slot_ai_creator import SlotAICreator

def test_custom_layout_logic():
    print("=== Testing Custom Layout Logic ===")
    creator = SlotAICreator()
    
    # 1. Test Default Cabinet
    layout_default = creator.get_grid_layout(1280, 720, "Cabinet")
    print(f"Default Cabinet: {layout_default['start_x']}, {layout_default['cols']} cols")
    
    # 2. Test Custom Override
    custom = {
        "start_x": 500,
        "cols": 3,
        "spacing": 50
    }
    layout_custom = creator.get_grid_layout(1280, 720, "Cabinet", custom_layout=custom)
    print(f"Custom Override: {layout_custom['start_x']}, {layout_custom['cols']} cols, spacing: {layout_custom['spacing']}")
    
    assert layout_custom['start_x'] == 500
    assert layout_custom['cols'] == 3
    assert layout_custom['spacing'] == 50
    # Total width should be recalculated: 3 * 160 + 2 * 50 = 480 + 100 = 580
    print(f"Recalculated Total W: {layout_custom['total_w']}")
    assert layout_custom['total_w'] == 580

    # 3. Test Universal Constraint (Cabinet 720h)
    layout_univ = creator.get_grid_layout(1280, 720, "Cabinet")
    ratio = layout_univ['total_h'] / 720
    print(f"Universal Constraint Ratio (Cabinet): {ratio:.2%}")
    assert 0.70 <= ratio <= 0.76
    
    # 4. Test Universal Constraint (H5_Mobile 1280h)
    layout_h5 = creator.get_grid_layout(720, 1280, "H5_Mobile")
    ratio_h5 = layout_h5['total_h'] / 1280
    print(f"Universal Constraint Ratio (H5_Mobile): {ratio_h5:.2%}")
    assert 0.70 <= ratio_h5 <= 0.76
    
    print("\n[SUCCESS] Universal Layout Constraints Logic Verified!")

if __name__ == "__main__":
    test_custom_layout_logic()
