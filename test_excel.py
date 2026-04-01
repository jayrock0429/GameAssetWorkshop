import os
import sys

# 將腳本目錄加入路徑
script_dir = os.path.join(os.getcwd(), 'scripts')
sys.path.append(script_dir)

from slot_ai_creator import SlotAICreator

def test_import():
    creator = SlotAICreator()
    # 找尋任意一個 excel 檔案
    excels = [f for f in os.listdir(".") if f.endswith('.xlsx')]
    if not excels:
        print("目前目錄沒有 excel")
        return
    
    excel_path = excels[0]
    print(f"Testing import with: {excel_path}")
    manifest = creator.import_requirements(excel_path)
    print("Symbols found:", len(manifest.get("symbols", [])))
    
if __name__ == "__main__":
    test_import()
