from psd_tools import PSDImage
import json
import os

psd_path = r"d:\AG\GameAssetWorkshop\KnockoutClash_basegameL_資產出圖版本.psd"
output_info = {
    "file_name": os.path.basename(psd_path),
    "size": f"{os.path.getsize(psd_path) / (1024*1024):.2f} MB",
    "canvas": {},
    "layers": []
}

def analyze_layer(layer, depth=0):
    info = {
        "name": layer.name,
        "type": "Group" if layer.is_group() else "Layer",
        "visible": layer.visible,
        "bbox": [layer.left, layer.top, layer.right, layer.bottom],
        "width": layer.width,
        "height": layer.height,
        "opacity": layer.opacity,
        "blend_mode": str(layer.blend_mode)
    }
    
    if layer.is_group():
        info["children"] = []
        # Only go deep for relevant groups or small depth to avoid massive JSON
        for child in layer:
            info["children"].append(analyze_layer(child, depth + 1))
            
    return info

try:
    if not os.path.exists(psd_path):
        print(f"[SKIP] PSD not found: {psd_path}")
        # Create a dummy or empty analysis if needed, or just exit
        exit(0)

    print(f"Loading PSD: {psd_path} ... (this may take a minute for 300MB)")
    psd = PSDImage.open(psd_path)
    output_info["canvas"] = {"width": psd.width, "height": psd.height}
    
    print("Mapping layers...")
    target_names = ["遊戲訊息", "輪框", "共用操作UI"]
    ui_groups = []
    
    for layer in psd:
        info = analyze_layer(layer)
        output_info["layers"].append(info)
        
        # Check if this layer/group is one of our targets
        if any(target in layer.name for target in target_names):
            ui_groups.append(info)

    # Merge logic: if we found any of the target UI groups, create a unified "Main_UI_Frame"
    if ui_groups:
        print(f"Found {len(ui_groups)} UI frame components. Merging into Main_UI_Frame...")
        
        # Calculate Union BBox
        min_left = min(g["bbox"][0] for g in ui_groups)
        min_top = min(g["bbox"][1] for g in ui_groups)
        max_right = max(g["bbox"][2] for g in ui_groups)
        max_bottom = max(g["bbox"][3] for g in ui_groups)
        
        # Force a 16:9 check or just use the combined extent
        # For this specific requirement, we want a single generation task
        main_ui_frame = {
            "name": "Main_UI_Frame",
            "type": "MergedGroup",
            "visible": True,
            "bbox": [min_left, min_top, max_right, max_bottom],
            "width": max_right - min_left,
            "height": max_bottom - min_top,
            "merged_components": [g["name"] for g in ui_groups]
        }
        
        # Insert at the beginning or end of layers
        output_info["layers"].insert(0, main_ui_frame)
        
        # Optional: Hide original components from independent generation if needed
        # For now, we keep them but they are marked by being in the merged list
        print(f"Created Main_UI_Frame: {main_ui_frame['bbox']}")

    with open("psd_deep_analysis.json", "w", encoding="utf-8") as f:
        json.dump(output_info, f, ensure_ascii=False, indent=2)
    print("Deep analysis saved to psd_deep_analysis.json")

except Exception as e:
    print(f"Error during PSD analysis: {e}")
