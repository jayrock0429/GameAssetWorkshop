import sys
import os
from psd_tools import PSDImage

def analyze_psd_structure(psd_path):
    if not os.path.exists(psd_path):
        print(f"Error: 找不到檔案 {psd_path}")
        return

    print(f"--- 解析 PSD: {os.path.basename(psd_path)} ---")
    try:
        psd = PSDImage.open(psd_path)
        
        def walk_layers(layers, depth=0):
            for layer in layers:
                indent = "  " * depth
                # layer.kind 回傳圖層類型 (group, pixel, type, shape, etc.)
                visibility = "顯示" if layer.visible else "隱藏"
                print(f"{indent}[{layer.kind}] {layer.name} ({visibility})")
                
                if layer.is_group():
                    walk_layers(layer, depth + 1)

        walk_layers(psd)
        print("--- 解析完成 ---")
        
    except Exception as e:
        print(f"解析發生錯誤: {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        analyze_psd_structure(sys.argv[1])
    else:
        print("請提供 PSD 檔案路徑")
