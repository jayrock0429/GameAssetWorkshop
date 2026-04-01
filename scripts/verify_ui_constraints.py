import os
import sys

# Add the current directory to sys.path to allow importing from scripts
sys.path.append(os.getcwd())
from scripts.slot_ai_creator import SlotAICreator

def test_ui_constraints():
    creator = SlotAICreator(theme="Egypt_Test")
    print("Testing Header Prompt...")
    header_prompt = creator.generate_component_prompts(theme="Egypt", component_type="UI_Header")
    print(f"Header Prompt Result: {header_prompt[:150]}...")
    
    print("\nTesting Base Prompt...")
    base_prompt = creator.generate_component_prompts(theme="Egypt", component_type="UI_Base")
    print(f"Base Prompt Result: {base_prompt[:150]}...")
    
    print("\nTesting Pillar Prompt...")
    pillar_prompt = creator.generate_component_prompts(theme="Egypt", component_type="UI_Pillar")
    print(f"Pillar Prompt Result: {pillar_prompt[:150]}...")
    
    # Check for keywords
    header_pass = "wide horizontal banner" in header_prompt
    base_pass = "wide horizontal control panel" in base_prompt
    pillar_pass = "tall vertical column" in pillar_prompt
    
    print(f"\nVerification Results:")
    print(f"Header Structural Consistency: {'✅' if header_pass else '❌'}")
    print(f"Base Structural Consistency: {'✅' if base_pass else '❌'}")
    print(f"Pillar Structural Consistency: {'✅' if pillar_pass else '❌'}")

if __name__ == "__main__":
    test_ui_constraints()
