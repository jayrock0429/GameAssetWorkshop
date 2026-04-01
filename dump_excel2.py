# Utility script to dump selected sheets from an Excel file to JSON.
#
# Usage:
#   python dump_excel2.py <excel_path> [output_path]
#
# If no output_path is provided, defaults to "excel_dump.json" in the current directory.

import sys
import os
import json
import pandas as pd

def dump_excel(excel_path: str, output_path: str = "excel_dump.json"):
    """Read an Excel file and write selected sheet data to a JSON file.

    The function validates the file existence, loads the workbook with pandas, and
    extracts any sheet whose name contains keywords that usually hold asset
    specifications (e.g. "Symbol", "總覽", "畫面簡介", "概述", "描述").
    The resulting JSON contains a list of sheet names and a dictionary mapping
    each processed sheet to its column headers and row values (all converted to
    strings). Errors for individual sheets are captured so the script never
    crashes mid‑run.
    """
    if not os.path.isfile(excel_path):
        raise FileNotFoundError(f"Excel file not found: {excel_path}")

    try:
        xl = pd.ExcelFile(excel_path)
    except Exception as e:
        raise RuntimeError(f"Failed to open Excel file: {e}")

    result = {"sheets": xl.sheet_names, "data": {}}
    for sheet_name in xl.sheet_names:
        if any(keyword in sheet_name for keyword in ("Symbol", "總覽", "畫面簡介", "概述", "描述")):
            try:
                df = xl.parse(sheet_name)
                result["data"][sheet_name] = {
                    "columns": list(df.columns.astype(str)),
                    "rows": df.fillna("").astype(str).values.tolist(),
                }
            except Exception as e:
                result["data"][sheet_name] = {"error": str(e)}

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"Dumped Excel data to {output_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python dump_excel2.py <excel_path> [output_path]")
        sys.exit(1)
    excel_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "excel_dump.json"
    try:
        dump_excel(excel_path, output_path)
    except Exception as exc:
        print(f"Error: {exc}")
        sys.exit(1)
