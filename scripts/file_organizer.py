"""
[Phase 4 - 升級 I] 批次命名智能
自動化檔案命名、版本控制與資料夾組織
"""

import os
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List

class BatchNamingIntelligence:
    """智能檔案命名與組織系統"""
    
    def __init__(self, base_output_dir: str):
        """
        Initialize naming engine
        
        Args:
            base_output_dir: Root directory for organized assets
        """
        self.base_dir = Path(base_output_dir)
        self.naming_rules = {
            "Symbol": "Symbol_{name}_{variant}.png",
            "Wild": "Symbol_Wild_{variant}.png",
            "Scatter": "Symbol_Scatter_{variant}.png",
            "UI": "UI_{component}_{position}.png",
            "VFX": "VFX_{effect_type}_{variant}.png",
            "Background": "BG_{theme}.png",
            "Mascot": "Character_{name}_{pose}.png"
        }
        
        self.folder_structure = {
            "Symbol": "Assets/Symbols",
            "Wild": "Assets/Symbols",
            "Scatter": "Assets/Symbols",
            "UI": "Assets/UI",
            "VFX": "Assets/VFX",
            "Background": "Assets/Backgrounds",
            "Mascot": "Assets/Characters"
        }
    
    def generate_filename(self, 
                         asset_type: str, 
                         name: str = None,
                         variant: str = "Idle",
                         **kwargs) -> str:
        """
        Generate standardized filename
        
        Args:
            asset_type: "Symbol", "UI", "VFX", etc.
            name: Asset name (e.g., "M1", "Frame")
            variant: "Idle", "Win", "Top", etc.
            **kwargs: Additional parameters for specific types
            
        Returns:
            Formatted filename
        """
        template = self.naming_rules.get(asset_type, "{name}_{variant}.png")
        
        # Build parameters
        params = {
            "name": name or asset_type,
            "variant": variant,
            **kwargs
        }
        
        # Format filename
        try:
            filename = template.format(**params)
        except KeyError as e:
            # Fallback to simple naming
            filename = f"{asset_type}_{name}_{variant}.png"
        
        return filename
    
    def generate_versioned_filename(self, 
                                   base_filename: str,
                                   add_timestamp: bool = True) -> str:
        """
        Add version suffix to filename
        
        Args:
            base_filename: Original filename
            add_timestamp: Include timestamp in version
            
        Returns:
            Versioned filename
        """
        stem = Path(base_filename).stem
        ext = Path(base_filename).suffix
        
        if add_timestamp:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            return f"{stem}_v{timestamp}{ext}"
        else:
            # Find next version number
            version = 1
            while True:
                versioned = f"{stem}_v{version:03d}{ext}"
                if not (self.base_dir / versioned).exists():
                    return versioned
                version += 1
    
    def organize_file(self, 
                     source_path: str,
                     asset_type: str,
                     create_backup: bool = False) -> Dict:
        """
        Move file to appropriate folder based on type
        
        Args:
            source_path: Current file location
            asset_type: Type of asset
            create_backup: Keep original file
            
        Returns:
            Dict with operation results
        """
        source = Path(source_path)
        
        # Get target folder
        folder_path = self.folder_structure.get(asset_type, "Assets/Other")
        target_dir = self.base_dir / folder_path
        target_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate target path
        target_path = target_dir / source.name
        
        # Handle existing file
        if target_path.exists():
            target_path = target_dir / self.generate_versioned_filename(source.name, add_timestamp=False)
        
        # Move or copy
        try:
            if create_backup:
                shutil.copy2(source, target_path)
                operation = "copied"
            else:
                shutil.move(str(source), str(target_path))
                operation = "moved"
            
            return {
                "success": True,
                "operation": operation,
                "source": str(source),
                "target": str(target_path)
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "source": str(source)
            }
    
    def batch_organize(self, 
                      source_dir: str,
                      type_mapping: Dict[str, str] = None) -> Dict:
        """
        Organize all files in a directory
        
        Args:
            source_dir: Directory to organize
            type_mapping: Dict mapping filename patterns to asset types
            
        Returns:
            Summary of operations
        """
        if type_mapping is None:
            # Default pattern matching
            type_mapping = {
                "Symbol_": "Symbol",
                "Wild": "Wild",
                "Scatter": "Scatter",
                "UI_": "UI",
                "VFX_": "VFX",
                "BG_": "Background",
                "Character_": "Mascot"
            }
        
        results = {
            "total_files": 0,
            "organized": 0,
            "failed": 0,
            "details": []
        }
        
        source_path = Path(source_dir)
        for file_path in source_path.glob("*.png"):
            results["total_files"] += 1
            
            # Determine asset type from filename
            asset_type = "Other"
            for pattern, type_name in type_mapping.items():
                if pattern in file_path.name:
                    asset_type = type_name
                    break
            
            # Organize file
            result = self.organize_file(str(file_path), asset_type)
            
            if result["success"]:
                results["organized"] += 1
            else:
                results["failed"] += 1
            
            results["details"].append(result)
        
        return results
    
    def create_folder_structure(self) -> List[str]:
        """Create complete folder structure"""
        created = []
        
        for folder_path in set(self.folder_structure.values()):
            full_path = self.base_dir / folder_path
            full_path.mkdir(parents=True, exist_ok=True)
            created.append(str(full_path))
        
        return created

# Testing
if __name__ == "__main__":
    naming = BatchNamingIntelligence("test_output_phase4")
    
    print("📝 Batch Naming Intelligence - Test Suite")
    print("=" * 60)
    
    # Test 1: Generate filenames
    print("\n[Test 1] Filename Generation")
    test_cases = [
        ("Symbol", "M1", "Idle"),
        ("Symbol", "M1", "Win"),
        ("UI", "Frame", "Top"),
        ("VFX", "Explosion", "Gold"),
    ]
    
    for asset_type, name, variant in test_cases:
        filename = naming.generate_filename(asset_type, name, variant)
        print(f"  {asset_type}/{name}/{variant} → {filename}")
    
    # Test 2: Versioned filenames
    print("\n[Test 2] Versioned Filenames")
    base = "Symbol_M1_Idle.png"
    versioned = naming.generate_versioned_filename(base, add_timestamp=True)
    print(f"  {base} → {versioned}")
    
    # Test 3: Create folder structure
    print("\n[Test 3] Folder Structure Creation")
    folders = naming.create_folder_structure()
    for folder in folders:
        print(f"  ✓ Created: {folder}")
    
    print("\n" + "=" * 60)
    print("✅ All tests completed!")
