import os
import sys
from psd_tools import PSDImage
import json

def analyze_psd(psd_path):
    if not os.path.exists(psd_path):
        print(f"Error: PSD not found at {psd_path}")
        return
    
    print(f"Analyzing PSD Template: {psd_path}...")
    try:
        psd = PSDImage.open(psd_path)
        layout_info = {
            "width": psd.width,
            "height": psd.height,
            "layers": []
        }
        
        def extract_bounds(layers):
            for layer in layers:
                info = {
                    "name": layer.name,
                    "kind": str(layer.kind),
                    "visible": layer.visible,
                    "left": layer.left,
                    "top": layer.top,
                    "width": layer.width,
                    "height": layer.height
                }
                layout_info["layers"].append(info)
                if layer.is_group():
                    extract_bounds(layer)

        extract_bounds(psd)
        
        # Identify Grid
        symbols = [l for l in layout_info["layers"] if "symbol" in l["name"].lower() and l["width"] > 50]
        if symbols:
            symbols.sort(key=lambda l: (l["top"], l["left"]))
            first = symbols[0]
            print(f"\n[Grid Detected]")
            print(f"First Symbol: {first['name']} at ({first['left']}, {first['top']}) size {first['width']}x{first['height']}")
        
        # Identify Buttons
        btns = [l for l in layout_info["layers"] if any(k in l["name"].lower() for k in ["spin", "btn", "button", "buy", "bonus"])]
        if btns:
            print(f"\n[Buttons Detected]")
            for b in btns:
                print(f"- {b['name']} at ({b['left']}, {b['top']})")

        return layout_info
    except Exception as e:
        print(f"Failed to analyze PSD: {e}")
        return None

if __name__ == "__main__":
    analyze_psd("5x3_Slot_Template_Layout.psd")
