import json
import os
import sys
# Make sure we can import from scripts
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from slot_ai_creator import SlotAICreator

def main():
    parts_json = r"d:\AG\GameAssetWorkshop\output\test_mock_concept_parts_ai\parts.json"
    if not os.path.exists(parts_json):
        print("Error: parts.json not found")
        return

    with open(parts_json, 'r', encoding='utf-8') as f:
        parts = json.load(f)
    
    # Update parts names for demo grouping
    parts[0]['name'] = "Bottom_UI_Panel"
    parts[1]['name'] = "Main_Slot_Frame"
    
    creator = SlotAICreator()
    output_jsx = r"d:\AG\GameAssetWorkshop\output\structured_import_demo.jsx"
    creator.generate_structured_psd_jsx(parts, 1280, 720, output_jsx)
    print(f"Generated demo structured JSX: {output_jsx}")

if __name__ == "__main__":
    main()
