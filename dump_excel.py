import pandas as pd
import json

file_path = "美術企劃文件_SL2445_七龍珠.xlsx"
output_data = {}

try:
    xl = pd.ExcelFile(file_path)
    output_data["sheets"] = xl.sheet_names
    
    for s in xl.sheet_names:
        if "Symbol" in s or "總覽" in s or "畫面簡介" in s:
            df = xl.parse(s, nrows=10)
            sheet_data = {
                "columns": list(str(c) for c in df.columns),
                "rows": []
            }
            for index, row in df.iterrows():
                sheet_data["rows"].append([str(val)[:200] for val in row.values])
            output_data[s] = sheet_data
            
    with open("excel_dump.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
except Exception as e:
    with open("excel_dump.json", "w", encoding="utf-8") as f:
        json.dump({"error": str(e)}, f)
