"""
[Phase 4 - 升級 H] 引擎規格驗證器
確保資產符合 Unity/Cocos 技術要求，具備自動修復功能
"""

import os
from PIL import Image
from pathlib import Path
from typing import Dict, List, Tuple
import math

class EngineSpecValidator:
    """驗證並自動修復遊戲引擎相容性問題的資產"""
    
    def __init__(self):
        self.max_file_size_mb = 2.0  # Mobile optimization
        self.valid_color_modes = ["RGB", "RGBA"]
        self.power_of_2_sizes = [128, 256, 512, 1024, 2048, 4096]
        
    def validate_asset(self, image_path: str) -> Dict:
        """
        Comprehensive validation of a single asset
        
        Returns:
            Dict with validation results and suggested fixes
        """
        results = {
            "path": image_path,
            "valid": True,
            "issues": [],
            "fixes_applied": [],
            "metadata": {}
        }
        
        try:
            img = Image.open(image_path)
            file_size_mb = os.path.getsize(image_path) / (1024 * 1024)
            
            # Store metadata
            results["metadata"] = {
                "size": img.size,
                "mode": img.mode,
                "format": img.format,
                "file_size_mb": round(file_size_mb, 2)
            }
            
            # Check 1: File size
            if file_size_mb > self.max_file_size_mb:
                results["issues"].append(f"File size {file_size_mb:.2f}MB exceeds {self.max_file_size_mb}MB limit")
                results["valid"] = False
            
            # Check 2: Color mode
            if img.mode not in self.valid_color_modes:
                results["issues"].append(f"Invalid color mode '{img.mode}', should be RGB or RGBA")
                results["valid"] = False
            
            # Check 3: Power of 2 resolution (Disabled for Modern UI/2D Sprites)
            w, h = img.size
            # if not self._is_power_of_2(w) or not self._is_power_of_2(h):
            #     results["issues"].append(f"Non-power-of-2 resolution: {w}x{h} (Ignored for UI)")
            #     results["valid"] = False
            
            # Check 4: Transparency (if RGBA)
            if img.mode == "RGBA":
                alpha = img.split()[3]
                if alpha.getextrema()[0] == 255:  # No transparency
                    results["issues"].append("RGBA mode but no transparency detected (consider converting to RGB)")
            
        except Exception as e:
            results["valid"] = False
            results["issues"].append(f"Failed to open image: {str(e)}")
        
        return results
    
    def auto_fix_asset(self, image_path: str, output_path: str = None) -> Dict:
        """
        Automatically fix common issues
        
        Args:
            image_path: Path to problematic asset
            output_path: Where to save fixed version (None = overwrite)
            
        Returns:
            Dict with fix results
        """
        if output_path is None:
            output_path = image_path
        
        results = {
            "original_path": image_path,
            "output_path": output_path,
            "fixes_applied": [],
            "success": False
        }
        
        try:
            img = Image.open(image_path)
            original_size = os.path.getsize(image_path) / (1024 * 1024)
            modified = False
            
            # Fix 1: Convert to RGBA if needed
            if img.mode not in self.valid_color_modes:
                img = img.convert("RGBA")
                results["fixes_applied"].append(f"Converted {img.mode} to RGBA")
                modified = True
            
            # Fix 2: Resize to power of 2 (Disabled to maintain exact dimensions like 2560x1440 or 343x203)
            w, h = img.size
            # if not self._is_power_of_2(w) or not self._is_power_of_2(h):
            #     new_w = self._nearest_power_of_2(w)
            #     new_h = self._nearest_power_of_2(h)
            #     img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            #     results["fixes_applied"].append(f"Resized from {w}x{h} to {new_w}x{new_h}")
            #     modified = True
            
            # Save with optimization
            save_kwargs = {
                "optimize": True,
                "quality": 95
            }
            
            # Fix 3: Compress if oversized
            if original_size > self.max_file_size_mb:
                save_kwargs["quality"] = 85  # More aggressive compression
                results["fixes_applied"].append(f"Applied compression (quality 85)")
                modified = True
            
            # Save fixed image
            if modified:
                img.save(output_path, **save_kwargs)
                new_size = os.path.getsize(output_path) / (1024 * 1024)
                results["fixes_applied"].append(f"File size: {original_size:.2f}MB → {new_size:.2f}MB")
            
            results["success"] = True
            
        except Exception as e:
            results["success"] = False
            results["fixes_applied"].append(f"Error: {str(e)}")
        
        return results
    
    def batch_validate(self, directory: str, extensions: List[str] = None) -> Dict:
        """
        Validate all assets in a directory
        
        Args:
            directory: Path to scan
            extensions: List of file extensions to check (default: ['.png', '.jpg'])
            
        Returns:
            Summary of validation results
        """
        if extensions is None:
            extensions = ['.png', '.jpg', '.jpeg']
        
        dir_path = Path(directory)
        results = {
            "total_files": 0,
            "valid_files": 0,
            "invalid_files": 0,
            "details": []
        }
        
        for ext in extensions:
            for file_path in dir_path.rglob(f"*{ext}"):
                results["total_files"] += 1
                validation = self.validate_asset(str(file_path))
                
                if validation["valid"]:
                    results["valid_files"] += 1
                else:
                    results["invalid_files"] += 1
                    results["details"].append(validation)
        
        return results
    
    def batch_auto_fix(self, directory: str, extensions: List[str] = None, backup: bool = True) -> Dict:
        """
        Auto-fix all invalid assets in a directory
        
        Args:
            directory: Path to scan
            extensions: File extensions to process
            backup: Create .bak files before fixing
            
        Returns:
            Summary of fixes applied
        """
        if extensions is None:
            extensions = ['.png', '.jpg']
        
        # First, validate to find issues
        validation_results = self.batch_validate(directory, extensions)
        
        fix_results = {
            "total_processed": 0,
            "successful_fixes": 0,
            "failed_fixes": 0,
            "details": []
        }
        
        for detail in validation_results["details"]:
            if not detail["valid"]:
                file_path = detail["path"]
                
                # Create backup if requested
                if backup:
                    backup_path = file_path + ".bak"
                    Path(file_path).rename(backup_path)
                    source_path = backup_path
                else:
                    source_path = file_path
                
                # Apply fixes
                fix_result = self.auto_fix_asset(source_path, file_path)
                fix_results["total_processed"] += 1
                
                if fix_result["success"]:
                    fix_results["successful_fixes"] += 1
                else:
                    fix_results["failed_fixes"] += 1
                
                fix_results["details"].append(fix_result)
        
        return fix_results
    
    def _is_power_of_2(self, n: int) -> bool:
        """Check if number is a power of 2"""
        return n > 0 and (n & (n - 1)) == 0
    
    def _nearest_power_of_2(self, n: int) -> int:
        """Find nearest power of 2"""
        power = round(math.log2(n))
        return 2 ** power

# Testing
if __name__ == "__main__":
    validator = EngineSpecValidator()
    
    print("🔍 Engine Spec Validator - Test Suite")
    print("=" * 60)
    
    # Create test directory
    test_dir = Path("test_output_phase4")
    test_dir.mkdir(exist_ok=True)
    
    # Test 1: Create invalid test images
    print("\n[Test 1] Creating test assets with various issues...")
    
    test_cases = [
        ("valid_1024.png", (1024, 1024), "RGBA"),
        ("invalid_odd_size.png", (1000, 1000), "RGBA"),
        ("invalid_mode.png", (512, 512), "L"),  # Grayscale
    ]
    
    for filename, size, mode in test_cases:
        img = Image.new(mode, size, (255, 0, 0) if mode != "L" else 128)
        img.save(test_dir / filename)
        print(f"  Created: {filename} ({size[0]}x{size[1]}, {mode})")
    
    # Test 2: Validate each asset
    print("\n[Test 2] Validating assets...")
    for filename, _, _ in test_cases:
        result = validator.validate_asset(str(test_dir / filename))
        status = "✓ VALID" if result["valid"] else "✗ INVALID"
        print(f"  {status}: {filename}")
        if result["issues"]:
            for issue in result["issues"]:
                print(f"    - {issue}")
    
    # Test 3: Auto-fix invalid assets
    print("\n[Test 3] Auto-fixing invalid assets...")
    for filename, _, _ in test_cases:
        file_path = str(test_dir / filename)
        validation = validator.validate_asset(file_path)
        
        if not validation["valid"]:
            fixed_path = str(test_dir / f"fixed_{filename}")
            fix_result = validator.auto_fix_asset(file_path, fixed_path)
            
            if fix_result["success"]:
                print(f"  ✓ Fixed: {filename}")
                for fix in fix_result["fixes_applied"]:
                    print(f"    - {fix}")
            else:
                print(f"  ✗ Failed: {filename}")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
