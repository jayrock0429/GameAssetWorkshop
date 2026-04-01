"""
Phase 4.5 改進 3 - 智能去背判斷測試
驗證 should_remove_background() 方法的正確性
"""

import sys
import os

# 加入專案路徑
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from slot_ai_creator import SlotAICreator

def test_smart_background_removal():
    """測試智能去背判斷邏輯"""
    print("=" * 80)
    print("🧪 Phase 4.5 改進 3 - 智能去背判斷測試")
    print("=" * 80)
    
    creator = SlotAICreator(theme="TestTheme")
    
    test_cases = [
        # (component_type, asset_name, expected_result, description)
        ("Background", "TestTheme_BG.png", False, "背景圖不需要去背"),
        ("BG", "TestTheme_Background.png", False, "BG 類型不需要去背"),
        ("UI_Frame", "TestTheme_UI.png", False, "一般 UI 不需要去背"),
        ("UI_Frame", "TestTheme_UI_Frame.png", True, "UI Frame 需要去背"),
        ("UI", "TestTheme_UI_Button.png", True, "UI Button 需要去背"),
        ("Symbol", "TestTheme_Symbol_M1.png", True, "符號需要去背"),
        ("Wild", "TestTheme_Wild.png", True, "Wild 符號需要去背"),
        ("Scatter", "TestTheme_Scatter.png", True, "Scatter 符號需要去背"),
        ("Mascot", "TestTheme_Mascot.png", True, "吉祥物需要去背"),
        ("Character", "TestTheme_Character.png", True, "角色需要去背"),
    ]
    
    passed = 0
    failed = 0
    
    print("\n[測試結果]")
    for component_type, asset_name, expected, description in test_cases:
        result = creator.should_remove_background(component_type, asset_name)
        
        if result == expected:
            status = "✓ PASS"
            passed += 1
        else:
            status = "✗ FAIL"
            failed += 1
        
        result_text = "需要去背" if result else "不需去背"
        expected_text = "需要去背" if expected else "不需去背"
        
        print(f"  {status}: {description}")
        print(f"         類型: {component_type}, 檔名: {asset_name}")
        print(f"         結果: {result_text}, 預期: {expected_text}")
    
    print("\n" + "=" * 80)
    print(f"📊 測試總結")
    print("=" * 80)
    print(f"通過: {passed}/{len(test_cases)}")
    print(f"失敗: {failed}/{len(test_cases)}")
    
    success_rate = (passed / len(test_cases)) * 100
    print(f"成功率: {success_rate:.1f}%")
    
    if failed == 0:
        print("\n✅ 所有測試通過！智能去背判斷功能正常運作。")
    else:
        print(f"\n⚠️ 有 {failed} 個測試失敗，請檢查邏輯。")
    
    print("=" * 80)
    
    return failed == 0

if __name__ == "__main__":
    success = test_smart_background_removal()
    sys.exit(0 if success else 1)
