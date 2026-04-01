
import sys
import os
import json
from PIL import Image

# 加入 scripts 路徑
sys.path.append(os.path.join(os.getcwd(), 'scripts'))

from slot_ai_creator import SlotAICreator

def verify_fix():
    print("--- 驗證修復後的排版引擎 ---")
    creator = SlotAICreator()
    excel_path = r'c:\Antigracity\GameAssetWorkshop\美術企劃文件_SL2445_七龍珠.xlsx'
    
    # 1. 導入規格
    manifest = creator.import_requirements(excel_path)
    print(f"提取到佈局規格: {manifest.get('layout_config')}")
    
    # 2. 測試 720x1280 佈局計算 (H5_Mobile)
    L = creator.get_grid_layout(720, 1280, layout_mode="H5_Mobile")
    print(f"H5_Mobile (720x1280) 佈局計算結果:")
    print(json.dumps(L, indent=2))
    
    # 驗證是否溢出
    if L['startX'] < 0:
        print("❌ 錯誤：startX 仍為負數，溢出畫布！")
    else:
        print("✅ 成功：startX 已修正回正數（或 0）。")

    # 3. 測試 1024x2048 比例映射 (實際生成尺寸)
    L_real = creator.get_grid_layout(1024, 2048, layout_mode="H5_Mobile")
    print(f"\n實際生成尺寸 (1024x2048) 佈局計算結果:")
    print(json.dumps(L_real, indent=2))
    
    # 4. 模擬合成測試 (建立 Mock 符號並合成)
    print("\n--- 模擬預覽圖合成測試 ---")
    bg = Image.new("RGBA", (1024, 2048), (20, 20, 30, 255))
    sym = Image.new("RGBA", (int(L_real['symbol_w']), int(L_real['symbol_h'])), (0, 255, 0, 255))
    
    # 在 (0,0) 位置合成一個符號
    sx, sy = int(L_real['startX']), int(L_real['startY'])
    bg.alpha_composite(sym, (sx, sy))
    
    test_output = "verify_hollow_fix.png"
    bg.save(test_output)
    print(f"已儲存測試合成圖: {test_output} (座標: {sx}, {sy})")

if __name__ == "__main__":
    verify_fix()
