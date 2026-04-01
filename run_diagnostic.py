import sys
import os
import traceback

# Add scripts to path to fix layout_optimizer ModuleNotFoundError
sys.path.append(os.path.join(os.path.dirname(__file__), 'scripts'))

try:
    from slot_ai_creator import SlotAICreator
    print("Import successful!")
    
    # Run the creator with the excel
    excel_path = os.path.join(os.path.dirname(__file__), "美術企劃文件_SL2445_七龍珠.xlsx")
    creator = SlotAICreator(excel_path)
    # mock=True to avoid unintended Gemini API cost while diagnosing syntax/logic issues
    creator.run_fully_autonomous(creator.theme, layout_mode="H5_Mobile", mock=True)
except Exception as e:
    print("Caught Exception:", e)
    traceback.print_exc()
