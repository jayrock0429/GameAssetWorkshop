import os
import sys
import json
from dotenv import load_dotenv

script_dir = r"d:\AG\GameAssetWorkshop\scripts"
sys.path.append(script_dir)
load_dotenv(os.path.join(script_dir, ".env"))

from slot_ai_creator_clean import SlotAICreator

def run_verify():
    creator = SlotAICreator()
    creator.load_styles()
    
    requirement = "Dragon Ball Z - Super Saiyan Evolution"
    style = "Anime_Stylized"
    
    excel_path = r"d:\AG\GameAssetWorkshop\美術企劃文件_SL2445_七龍珠.xlsx"
    
    print(f"--- STARTING VERIFICATION FOR: {requirement} ({style}) ---")
    
    try:
        result = creator.run_fully_autonomous(
            requirement=requirement,
            style=style,
            layout_mode="H5_Mobile", # Testing Portrait mode
            excel_path=excel_path,
            mock=False 
        )
        
        print(f"\n--- VERIFICATION COMPLETE! ---")
        print(f"Output Directory: {creator.output_dir}")
        print(f"Preview PNG: {result.get('image')}")
        
    except Exception as e:
        print(f"Verification failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_verify()
