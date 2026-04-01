import os
import sys

# 修正匯入路徑問題
sys.path.append(os.getcwd())
from scripts.slot_ai_creator import SlotAICreator

def test_v3_engine_greek():
    print("🚀 Slot Art Engine V3.0 - Cross-Theme Verification: Greek Mythology")
    print("=" * 70)
    
    creator = SlotAICreator(theme="GreekMythology_V3_Test")
    
    # 測試組件清單 (涵蓋不同 Tier 與 結構)
    test_suite = [
        {"type": "UI_Header", "tier": "High_Pay", "name": "Zeus_Temple_Header"},
        {"type": "UI_Base", "tier": "High_Pay", "name": "Olympus_Console_Base"},
        {"type": "Mascot", "tier": "M1_Hero", "name": "King_Zeus_Mascot"},
        {"type": "Symbol", "tier": "High_Pay", "name": "Golden_Thunderbolt_Wild"},
        {"type": "Symbol", "tier": "Low_Pay", "name": "Ancient_Vase_A"},
    ]
    
    generated_assets = []
    
    for item in test_suite:
        print(f"\n[V3.0 Process] Component: {item['type']} | Tier: {item['tier']}")
        prompt = creator.generate_component_prompts(
            theme="Greek Mythology",
            component_type=item["type"],
            tier=item["tier"],
            style_profile="3D_Premium"
        )
        
        # 檢查 Prompt 中是否包含結構前綴
        print(f"  ✓ Prompt Peek: {prompt[:120]}...")
        
        # 模擬生成 (Mock 為 True 以節省資源驗證邏輯，或 False 真實生圖)
        out_name = f"Greek_{item['name']}.png"
        out_path = os.path.join(creator.output_dir, out_name)
        
        # 這裡我們跑真實生成來感受 3A 品質
        success = creator.generate_image_from_api(prompt, out_path)
        if success:
            generated_assets.append({
                "name": item["name"],
                "type": item["type"],
                "path": out_path,
                "tier": item["tier"]
            })

    # 執行 PSD 自動組裝驗證 (柵格系統)
    if generated_assets:
        print("\n--- Verifying Standard Grid System (PSD Assembly) ---")
        structure = creator.psd_assembler.generate_psd_structure(generated_assets)
        
        # 檢查座標是否對應標準柵格
        print(f"  Canvas Size: {structure['canvas_size']}")
        for layer in structure["layers"]:
            print(f"  📍 Layer: {layer['name']} -> Position: {layer['position']}")
            
        # 生成 JSX 腳本
        jsx_path = os.path.join(creator.output_dir, "Greek_V3_Assembly.jsx")
        jsx_content = creator.psd_assembler.generate_jsx_script(structure, os.path.join(creator.output_dir, "Greek_Final.psd"))
        with open(jsx_path, "w", encoding="utf-8") as f:
            f.write(jsx_content)
        print(f"  ✓ JSX Script generated: {jsx_path}")

    print("\n✅ Greek Mythology V3.0 Verification Completed.")

if __name__ == "__main__":
    test_v3_engine_greek()
