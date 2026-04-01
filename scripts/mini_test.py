import sys, os, traceback

log_path = r"c:\Antigracity\GameAssetWorkshop\test_results.log"

def log(msg):
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

open(log_path, "w", encoding="utf-8").close()
log("START")

try:
    from psd_constraint_extractor import PSDConstraintExtractor
    log("IMPORT OK")
    ext = PSDConstraintExtractor()
    c = ext._default_constraints()
    spec = c.to_prompt_spec()
    log("SPEC OK:")
    log(spec)
except Exception as e:
    log(f"ERROR: {e}")
    log(traceback.format_exc())

log("DONE")
