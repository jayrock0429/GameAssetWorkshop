import pandas as pd
import json

file_path = r"d:\AG\GameAssetWorkshop\temp_uploaded.xlsx"
try:
    xl = pd.ExcelFile(file_path)
    report = {"sheets": xl.sheet_names, "data": {}}
    for sheet in xl.sheet_names:
        df = xl.parse(sheet)
        report["data"][sheet] = df.head(10).astype(str).values.tolist()
        report["columns"] = {sheet: df.columns.tolist()}
    print(json.dumps(report, ensure_ascii=False, indent=2))
except Exception as e:
    print(f"Error: {e}")
