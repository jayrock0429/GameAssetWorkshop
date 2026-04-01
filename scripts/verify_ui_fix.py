
import os
import sys
from scripts.slot_ai_creator import SlotAICreator

def verify_ui_prompts():
    creator = SlotAICreator(theme="Dragon Ball")
    creator.base_dir = os.getcwd() # Set base dir to current workspace
    
    components = ["UI_Header", "UI_Base", "UI_Pillar"]
    print("--- VERIFYING UI PROMPT GENERATION ---")
    for comp in components:
        prompt = creator.generate_component_prompts("Dragon Ball", comp)
        print(f"\n[COMPONENT: {comp}]")
        print(prompt)
        print("-" * 30)

if __name__ == "__main__":
    verify_ui_prompts()
