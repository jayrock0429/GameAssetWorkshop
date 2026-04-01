import os
import sys
import json

# 設定 scripts 路径
script_dir = os.path.join(os.getcwd(), 'scripts')
sys.path.append(script_dir)
from slot_ai_creator import SlotAICreator

def run_production_test():
    print("🧪 [驗證] 啟動 Production_V1 專業規格離線測試...")
    
    # 建立 Creator，不填寫 API Key 會自動進入 Mock 模式（或由參數指定）
    creator = SlotAICreator()
    
    theme = "Production_Test_Wide_Symbol"
    
    # 使用 Production_V1 模式
    # 這會觸發 2560x1440 解析度、5x5 矩陣以及 343x203 符號
    result = creator.run_fully_autonomous(
        requirement=theme,
        mock=True,
        symbol_list=["Wild", "Scatter", "Goku"],
        layout_mode="Production_V1"
    )
    
    print("\n✅ [完成] 測試目錄於:", creator.output_dir)
    
    # 檢查背景尺寸
    bg_path = result.get("components", {}).get("background")
    if bg_path and os.path.exists(bg_path):
        from PIL import Image
        with Image.open(bg_path) as img:
            print(f"📊 背景解析度: {img.size} (預期應為 2560x1440)")
            if img.size == (2560, 1440):
                print("   ✨ [PASS] 解析度正確")
            else:
                print("   ❌ [FAIL] 解析度不符")

    # 檢查符號尺寸
    symbol_path = list(result.get("components", {}).get("symbols", {}).values())[0]
    if symbol_path and os.path.exists(symbol_path):
        from PIL import Image
        with Image.open(symbol_path) as img:
            print(f"📊 符號尺寸: {img.size} (預期應為 343x203)")
            if img.size == (343, 203):
                print("   ✨ [PASS] 寬幅比例正確")
            else:
                print("   ❌ [FAIL] 符號尺寸不符")

if __name__ == "__main__":
    run_production_test()
