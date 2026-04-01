import os
import sys
import json
from dotenv import load_dotenv

# Add scripts directory to path
script_dir = r"d:\AG\GameAssetWorkshop\scripts"
sys.path.append(script_dir)

# Load environment variables
load_dotenv(os.path.join(script_dir, ".env"))

from slot_ai_creator_clean import SlotAICreator

def run_test():
    # Initialize creator
    creator = SlotAICreator()
    creator.load_styles() # Fixed earlier to use correct path
    
    requirement = "Viking Mythology - Battle for Valhalla"
    style = "3D_Premium" # Using Premium to trigger high-end guidelines
    
    print(f"--- STARTING GENERATION FOR: {requirement} ---")
    
    try:
        # Run fully autonomous (This will generate BG, UI_Header, UI_Base, UI_Pillar, SYM_1, WILD, SCATTER, Preview, and JSX)
        result = creator.run_fully_autonomous(
            requirement=requirement,
            style=style,
            layout_mode="Cabinet",
            mock=False # ACTUALLY GENERATE
        )
        
        print(f"\n--- GENERATION COMPLETE! ---")
        print(f"Output Directory: {creator.output_dir}")
        print(f"Preview PNG: {result.get('image')}")
        print(f"Assembly JSX: {result.get('jsx')}")
        
    except Exception as e:
        print(f"Generation failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_test()
