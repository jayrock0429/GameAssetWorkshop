import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'scripts'))

print("=== Test 1: PSDConstraintExtractor import ===")
from psd_constraint_extractor import PSDConstraintExtractor, SlotLayoutConstraints
print("✅ Import OK")

print("\n=== Test 2: Default constraints ===")
ext = PSDConstraintExtractor()
c = ext._default_constraints()
print(c.to_prompt_spec())

print("\n=== Test 3: Extract from layout_config (Excel-style) ===")
layout_config = {"canvas_w": 1920, "canvas_h": 1080, "symbol_w": 343, "symbol_h": 203, "rows": 5, "cols": 5}
c2 = ext.extract_from_layout_config(layout_config)
print(c2.to_prompt_spec())

print("\n=== Test 4: PSD file extraction ===")
psd_path = r"c:\Antigracity\GameAssetWorkshop\5x3_Slot_Template_Layout.psd"
if os.path.exists(psd_path):
    ext2 = PSDConstraintExtractor(psd_path)
    c3 = ext2.extract()
    print(c3.to_prompt_spec())
    import json
    out = os.path.join(os.path.dirname(psd_path), "psd_constraints.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(c3.to_dict(), f, indent=2, ensure_ascii=False)
    print(f"JSON saved: {out}")
else:
    print(f"PSD not found: {psd_path} - skipping")

print("\n=== Test 5: SlotAICreator has layout_constraints ===")
from slot_ai_creator import SlotAICreator
creator = SlotAICreator("DragonBall")
print(f"has layout_constraints attr: {hasattr(creator, 'layout_constraints')}")
print(f"layout_constraints default: {creator.layout_constraints}")

print("\n✅ All tests passed!")
