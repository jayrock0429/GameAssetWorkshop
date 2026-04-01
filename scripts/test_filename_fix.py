import os
import sys
from slot_ai_creator import SlotAICreator

def test_sanitization():
    creator = SlotAICreator()
    creator.ensure_dirs()
    
    # 測試包含非法字元的名稱
    bad_theme = "中國春節風格的slot\n!@#$%^&*() "
    sanitized = creator._sanitize_filename(bad_theme)
    print(f"Original: {repr(bad_theme)}")
    print(f"Sanitized: {repr(sanitized)}")
    
    # 模擬全自主流程的一部分，確保路徑生成正常
    bg_path = os.path.join(creator.output_dir, f"{sanitized}_BG.png")
    print(f"Generated Path: {bg_path}")
    
    # 測試實際建立檔案 (空檔案)
    try:
        with open(bg_path, "w") as f:
            f.write("test")
        print("Successfully created file with sanitized name.")
        os.remove(bg_path)
    except Exception as e:
        print(f"Failed to create file: {e}")

if __name__ == "__main__":
    test_sanitization()
