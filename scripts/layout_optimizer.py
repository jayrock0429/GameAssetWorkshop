"""
[Phase 4 - 升級 G] 智能佈局引擎
自動尺寸調整、網格定位與安全區檢測，專為老虎機遊戲資產設計
"""

import json
from typing import Tuple, Dict, List

class SmartLayoutEngine:
    """老虎機遊戲資產生產的智能佈局計算器"""
    
    def __init__(self, excel_specs: Dict = None):
        """
        使用 Excel 規格初始化，或使用預設值
        
        參數:
            excel_specs: 包含 grid_size, resolution, safe_zone 的字典（來自 Excel）
        """
        self.specs = excel_specs or {}
        self.default_resolutions = {
            "Cabinet": (1920, 1080),  # 16:9 Desktop
            "H5_Mobile": (1080, 1920),  # 9:16 Mobile
            "Square": (1024, 1024)  # 1:1 Square
        }
        
    def calculate_grid_layout(self, 
                              grid_size: str, 
                              layout_mode: str = "Cabinet",
                              safe_zone: float = 0.15) -> Dict:
        """
        計算網格佈局的最佳格子尺寸與位置
        
        參數:
            grid_size: "5x3", "3x5" 等
            layout_mode: "Cabinet", "H5_Mobile", "Square"
            safe_zone: 邊距百分比 (0.0-1.0)
            
        返回:
            包含 cell_size, positions 和元數據的字典
        """
        # 解析網格尺寸
        cols, rows = map(int, grid_size.split("x"))
        
        # 取得畫布解析度
        canvas_w, canvas_h = self.default_resolutions.get(layout_mode, (1920, 1080))
        
        # 計算可用區域（扣除安全區）
        usable_w = int(canvas_w * (1 - safe_zone * 2))
        usable_h = int(canvas_h * (1 - safe_zone * 2))
        
        # 計算格子尺寸
        cell_w = usable_w // cols
        cell_h = usable_h // rows
        
        # 使用正方形格子（取最小維度）
        cell_size = min(cell_w, cell_h)
        
        # 四捨五入到 2 的冪次方（引擎相容性）
        cell_size = self._nearest_power_of_2(cell_size)
        
        # 計算起始偏移量（將網格置中）
        total_grid_w = cell_size * cols
        total_grid_h = cell_size * rows
        offset_x = (canvas_w - total_grid_w) // 2
        offset_y = (canvas_h - total_grid_h) // 2
        
        # 生成所有格子位置
        positions = []
        for row in range(rows):
            for col in range(cols):
                x = offset_x + col * cell_size + cell_size // 2  # 中心點
                y = offset_y + row * cell_size + cell_size // 2
                positions.append({
                    "grid": [row, col],
                    "center": (x, y),
                    "bounds": (
                        offset_x + col * cell_size,
                        offset_y + row * cell_size,
                        offset_x + (col + 1) * cell_size,
                        offset_y + (row + 1) * cell_size
                    )
                })
        
        return {
            "canvas_size": (canvas_w, canvas_h),
            "grid_size": (cols, rows),
            "cell_size": cell_size,
            "safe_zone": safe_zone,
            "offset": (offset_x, offset_y),
            "positions": positions,
            "total_cells": len(positions)
        }
    
    def get_symbol_size(self, symbol_type: str, layout_mode: str = "Cabinet") -> Tuple[int, int]:
        """
        Get recommended symbol size based on type and layout
        
        Args:
            symbol_type: "Symbol", "Wild", "Scatter", "M1", "M2", "M3"
            layout_mode: "Cabinet", "H5_Mobile"
            
        Returns:
            (width, height) in pixels
        """
        # High-value symbols get larger sizes
        high_value = symbol_type in ["Wild", "Scatter", "M1", "M2", "M3"]
        
        if layout_mode == "H5_Mobile":
            base_size = 512 if high_value else 256
        else:  # Cabinet
            base_size = 1024 if high_value else 512
        
        return (base_size, base_size)
    
    def check_safe_zone_compliance(self, 
                                   position: Tuple[int, int], 
                                   size: Tuple[int, int],
                                   canvas_size: Tuple[int, int],
                                   safe_zone: float = 0.1) -> bool:
        """
        Check if an asset at given position is within safe zone
        
        Args:
            position: (x, y) top-left corner
            size: (width, height)
            canvas_size: (canvas_width, canvas_height)
            safe_zone: Minimum distance from edge as percentage
            
        Returns:
            True if compliant, False otherwise
        """
        x, y = position
        w, h = size
        canvas_w, canvas_h = canvas_size
        
        # Calculate safe zone boundaries
        min_x = canvas_w * safe_zone
        max_x = canvas_w * (1 - safe_zone)
        min_y = canvas_h * safe_zone
        max_y = canvas_h * (1 - safe_zone)
        
        # Check all corners
        return (x >= min_x and x + w <= max_x and 
                y >= min_y and y + h <= max_y)
    
    def _nearest_power_of_2(self, n: int) -> int:
        """Round to nearest power of 2 (for engine compatibility)"""
        import math
        power = round(math.log2(n))
        return 2 ** power
    
    def export_layout_config(self, grid_size: str, layout_mode: str, output_path: str):
        """Export layout configuration as JSON for other tools"""
        layout = self.calculate_grid_layout(grid_size, layout_mode)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(layout, f, indent=2, ensure_ascii=False)
        
        return layout

# 使用範例與測試
if __name__ == "__main__":
    engine = SmartLayoutEngine()
    
    print("🎯 智能佈局引擎 - 測試套件")
    print("=" * 60)
    
    # 測試 1: 5x3 桌機佈局
    print("\n[測試 1] 5x3 桌機佈局")
    layout = engine.calculate_grid_layout("5x3", "Cabinet", safe_zone=0.1)
    print(f"  Canvas: {layout['canvas_size']}")
    print(f"  Cell Size: {layout['cell_size']}px")
    print(f"  Total Cells: {layout['total_cells']}")
    print(f"  First Cell Center: {layout['positions'][0]['center']}")
    
    # Test 2: 3x5 Mobile layout
    print("\n[Test 2] 3x5 H5_Mobile Layout")
    layout = engine.calculate_grid_layout("3x5", "H5_Mobile", safe_zone=0.15)
    print(f"  Canvas: {layout['canvas_size']}")
    print(f"  Cell Size: {layout['cell_size']}px")
    print(f"  Total Cells: {layout['total_cells']}")
    
    # Test 3: Symbol sizing
    print("\n[Test 3] Symbol Size Recommendations")
    for sym_type in ["Symbol", "Wild", "M1"]:
        size = engine.get_symbol_size(sym_type, "Cabinet")
        print(f"  {sym_type}: {size[0]}x{size[1]}px")
    
    # Test 4: Safe zone compliance
    print("\n[Test 4] Safe Zone Compliance Check")
    canvas = (1920, 1080)
    test_cases = [
        ((100, 100), (512, 512), "Edge position"),
        ((960, 540), (512, 512), "Center position"),
    ]
    for pos, size, desc in test_cases:
        compliant = engine.check_safe_zone_compliance(pos, size, canvas, 0.1)
        status = "✓ PASS" if compliant else "✗ FAIL"
        print(f"  {status}: {desc} at {pos}")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
