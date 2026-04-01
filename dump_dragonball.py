import pandas as pd
import json
import os

def dump_excel_content(file_path):
    print(f"Reading {file_path}...")
    try:
        xl = pd.ExcelFile(file_path)
        data = {}
        for sheet in xl.sheet_names:
            # 讀取前 50 行，確保涵蓋主要企劃內容
            df = xl.parse(sheet, nrows=50).dropna(how='all').fillna("")
            data[sheet] = df.to_dict(orient='records')
        
        output_path = "dragonball_excel_dump.json"
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        print(f"Successfully dumped to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    target = "美術企劃文件_SL2445_七龍珠.xlsx"
    if os.path.exists(target):
        dump_excel_content(target)
    else:
        print(f"File {target} not found.")
