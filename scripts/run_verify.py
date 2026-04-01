import sys, os, traceback

log_path = r"c:\Antigracity\GameAssetWorkshop\test_results.log"

def log(msg):
    print(msg)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

# Clear log
open(log_path, "w", encoding="utf-8").close()

log("=" * 60)
log("PSD Constraint Extractor - Verification Test")
log("=" * 60)

# ── Test 1: Import ─────────────────────────────────────────────
try:
    from psd_constraint_extractor import PSDConstraintExtractor, SlotLayoutConstraints, BoundBox
    log("[TEST 1] ✅ Import OK")
except Exception as e:
    log(f"[TEST 1] ❌ Import FAILED: {e}")
    traceback.print_exc()
    sys.exit(1)

# ── Test 2: Default constraints ───────────────────────────────
try:
    ext = PSDConstraintExtractor()
    c = ext._default_constraints()
    spec = c.to_prompt_spec()
    assert "1920" in spec
    assert "Symbol Cell" in spec
    log("[TEST 2] ✅ Default constraints + to_prompt_spec OK")
    log(f"         Canvas: {c.canvas_w}x{c.canvas_h}")
    log(f"         Symbol: {c.symbol_cell.width}x{c.symbol_cell.height}")
except Exception as e:
    log(f"[TEST 2] ❌ FAILED: {e}")
    traceback.print_exc()

# ── Test 3: Excel-style layout_config ─────────────────────────
try:
    config = {"canvas_w": 1920, "canvas_h": 1080, "symbol_w": 343, "symbol_h": 203, "rows": 5, "cols": 5}
    c2 = ext.extract_from_layout_config(config)
    assert c2.symbol_cell.width == 343
    assert c2.symbol_cell.height == 203
    spec2 = c2.to_prompt_spec()
    assert "343" in spec2
    log("[TEST 3] ✅ extract_from_layout_config OK")
    log(f"         Symbol: {c2.symbol_cell.width}x{c2.symbol_cell.height}, AR: {c2.symbol_cell.aspect_ratio}")
except Exception as e:
    log(f"[TEST 3] ❌ FAILED: {e}")
    traceback.print_exc()

# ── Test 4: PSD file ──────────────────────────────────────────
psd_paths = [
    r"c:\Antigracity\GameAssetWorkshop\5x3_Slot_Template_Layout.psd",
    r"c:\Antigracity\GameAssetWorkshop\KnockoutClash_basegameL_資產出圖版本.psd",
]
psd_found = next((p for p in psd_paths if os.path.exists(p)), None)
if psd_found:
    try:
        ext2 = PSDConstraintExtractor(psd_found)
        c3 = ext2.extract()
        log(f"[TEST 4] ✅ PSD extract OK: {os.path.basename(psd_found)}")
        log(f"         Canvas: {c3.canvas_w}x{c3.canvas_h}")
        log(f"         Layers found: {len(c3.raw_layers)}")
        log("         SPEC OUTPUT:")
        for line in c3.to_prompt_spec().split("\n"):
            log(f"         {line}")
    except Exception as e:
        log(f"[TEST 4] ❌ PSD extract FAILED: {e}")
        traceback.print_exc()
else:
    log("[TEST 4] ⚠️  No PSD found, skipping")

# ── Test 5: SlotAICreator integration ─────────────────────────
try:
    from slot_ai_creator import SlotAICreator
    creator = SlotAICreator("DragonBall_Test")
    assert hasattr(creator, "layout_constraints"), "layout_constraints attr missing!"
    assert creator.layout_constraints is None, "Should be None before analyze_psd()"
    log("[TEST 5] ✅ SlotAICreator has layout_constraints = None (pre-PSD)")
except Exception as e:
    log(f"[TEST 5] ❌ FAILED: {e}")
    traceback.print_exc()

log("\n" + "=" * 60)
log("✅ ALL TESTS COMPLETED - check above for any failures")
log("=" * 60)
