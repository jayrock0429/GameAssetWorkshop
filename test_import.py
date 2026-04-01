import sys
import os
sys.path.append(r'd:\AG\GameAssetWorkshop\scripts')
from slot_ai_creator import SlotAICreator

creator = SlotAICreator()
# Try importing one of the existing files
target_file = r"d:\AG\GameAssetWorkshop\美術企劃文件_SL2562_KnockoutClash.xlsx"
print(f"Testing import of: {target_file}")
manifest = creator.import_requirements(target_file)
print(f"Manifest symbols: {manifest.get('symbols', [])}")
