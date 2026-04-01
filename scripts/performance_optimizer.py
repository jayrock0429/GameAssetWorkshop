"""
Phase 5: 效能優化系統 (Performance Optimization System)
實作智能快取、動態品質調整與效能監控
"""

import os
import json
import time
import hashlib
from pathlib import Path
from datetime import datetime, timedelta

class PerformanceOptimizer:
    """
    效能優化系統
    智能快取、動態品質調整、效能監控
    """
    
    def __init__(self, cache_dir="cache"):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.cache_dir = os.path.join(self.base_dir, "..", "output", cache_dir)
        os.makedirs(self.cache_dir, exist_ok=True)
        
        self.cache_index = self.load_cache_index()
        self.performance_log = []
    
    def load_cache_index(self):
        """載入快取索引"""
        index_file = os.path.join(self.cache_dir, "cache_index.json")
        if os.path.exists(index_file):
            try:
                with open(index_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        
        return {
            "entries": {},
            "stats": {
                "total_hits": 0,
                "total_misses": 0,
                "total_size_bytes": 0
            }
        }
    
    def save_cache_index(self):
        """儲存快取索引"""
        index_file = os.path.join(self.cache_dir, "cache_index.json")
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(self.cache_index, f, indent=2, ensure_ascii=False)
    
    def generate_cache_key(self, operation, params):
        """生成快取鍵值"""
        # 將操作和參數序列化為字串
        key_string = f"{operation}:{json.dumps(params, sort_keys=True)}"
        # 使用 MD5 生成短鍵值
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get_from_cache(self, operation, params):
        """從快取中取得結果"""
        cache_key = self.generate_cache_key(operation, params)
        
        if cache_key in self.cache_index["entries"]:
            entry = self.cache_index["entries"][cache_key]
            
            # 檢查是否過期（預設 24 小時）
            created_time = datetime.fromisoformat(entry["created"])
            if datetime.now() - created_time < timedelta(hours=24):
                # 快取命中
                self.cache_index["stats"]["total_hits"] += 1
                self.save_cache_index()
                
                # 載入快取資料
                cache_file = os.path.join(self.cache_dir, entry["file"])
                if os.path.exists(cache_file):
                    with open(cache_file, 'r', encoding='utf-8') as f:
                        return {"hit": True, "data": json.load(f)}
        
        # 快取未命中
        self.cache_index["stats"]["total_misses"] += 1
        self.save_cache_index()
        
        return {"hit": False}
    
    def save_to_cache(self, operation, params, result):
        """儲存結果到快取"""
        cache_key = self.generate_cache_key(operation, params)
        cache_file = f"{cache_key}.json"
        cache_path = os.path.join(self.cache_dir, cache_file)
        
        # 儲存資料
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        # 更新索引
        file_size = os.path.getsize(cache_path)
        self.cache_index["entries"][cache_key] = {
            "operation": operation,
            "params": params,
            "file": cache_file,
            "size": file_size,
            "created": datetime.now().isoformat()
        }
        
        self.cache_index["stats"]["total_size_bytes"] += file_size
        self.save_cache_index()
    
    def clear_expired_cache(self, max_age_hours=24):
        """清除過期的快取"""
        cleared_count = 0
        cleared_size = 0
        
        for cache_key, entry in list(self.cache_index["entries"].items()):
            created_time = datetime.fromisoformat(entry["created"])
            if datetime.now() - created_time > timedelta(hours=max_age_hours):
                # 刪除檔案
                cache_file = os.path.join(self.cache_dir, entry["file"])
                if os.path.exists(cache_file):
                    os.remove(cache_file)
                
                cleared_size += entry["size"]
                del self.cache_index["entries"][cache_key]
                cleared_count += 1
        
        self.cache_index["stats"]["total_size_bytes"] -= cleared_size
        self.save_cache_index()
        
        return {"cleared_count": cleared_count, "cleared_size": cleared_size}
    
    def adjust_quality_for_speed(self, target_time_seconds, current_quality="high"):
        """根據目標時間動態調整品質"""
        quality_levels = {
            "ultra": {"time_factor": 2.0, "description": "Ultra quality (slowest)"},
            "high": {"time_factor": 1.0, "description": "High quality (balanced)"},
            "medium": {"time_factor": 0.5, "description": "Medium quality (faster)"},
            "fast": {"time_factor": 0.25, "description": "Fast quality (fastest)"}
        }
        
        # 根據目標時間選擇品質等級
        if target_time_seconds < 30:
            recommended = "fast"
        elif target_time_seconds < 60:
            recommended = "medium"
        elif target_time_seconds < 120:
            recommended = "high"
        else:
            recommended = "ultra"
        
        return {
            "current": current_quality,
            "recommended": recommended,
            "time_factor": quality_levels[recommended]["time_factor"],
            "description": quality_levels[recommended]["description"]
        }
    
    def log_performance(self, operation, duration, success):
        """記錄效能日誌"""
        log_entry = {
            "operation": operation,
            "duration": duration,
            "success": success,
            "timestamp": datetime.now().isoformat()
        }
        
        self.performance_log.append(log_entry)
        
        # 只保留最近 100 個記錄
        if len(self.performance_log) > 100:
            self.performance_log = self.performance_log[-100:]
    
    def get_performance_stats(self):
        """取得效能統計"""
        if not self.performance_log:
            return None
        
        durations = [log["duration"] for log in self.performance_log if log["success"]]
        
        if not durations:
            return None
        
        return {
            "total_operations": len(self.performance_log),
            "success_rate": sum(1 for log in self.performance_log if log["success"]) / len(self.performance_log),
            "avg_duration": sum(durations) / len(durations),
            "min_duration": min(durations),
            "max_duration": max(durations),
            "cache_hit_rate": self.cache_index["stats"]["total_hits"] / 
                             (self.cache_index["stats"]["total_hits"] + self.cache_index["stats"]["total_misses"])
                             if (self.cache_index["stats"]["total_hits"] + self.cache_index["stats"]["total_misses"]) > 0 else 0
        }


# 整合助手
def create_performance_optimizer():
    """建立效能優化器實例"""
    return PerformanceOptimizer()


if __name__ == "__main__":
    # 測試效能優化系統
    print("=" * 80)
    print("⚡ 效能優化系統測試")
    print("=" * 80)
    
    optimizer = PerformanceOptimizer()
    
    # 測試 1：快取功能
    print("\n[測試 1] 智能快取")
    
    # 第一次調用（快取未命中）
    result1 = optimizer.get_from_cache("style_analysis", {"theme": "埃及法老", "style": "3D_Premium"})
    print(f"  第一次查詢: {'命中' if result1['hit'] else '未命中'}")
    
    if not result1["hit"]:
        # 模擬計算結果並儲存到快取
        computed_result = {"palette": ["#FFD700", "#8B4513"], "materials": ["Gold", "Stone"]}
        optimizer.save_to_cache("style_analysis", {"theme": "埃及法老", "style": "3D_Premium"}, computed_result)
        print(f"  已儲存到快取")
    
    # 第二次調用（快取命中）
    result2 = optimizer.get_from_cache("style_analysis", {"theme": "埃及法老", "style": "3D_Premium"})
    print(f"  第二次查詢: {'✅ 命中' if result2['hit'] else '❌ 未命中'}")
    
    # 測試 2：動態品質調整
    print("\n[測試 2] 動態品質調整")
    
    scenarios = [
        ("快速預覽", 20),
        ("標準生成", 60),
        ("高品質輸出", 150)
    ]
    
    for scenario, target_time in scenarios:
        adjustment = optimizer.adjust_quality_for_speed(target_time)
        print(f"  {scenario} (目標 {target_time}秒): {adjustment['recommended']} - {adjustment['description']}")
    
    # 測試 3：效能監控
    print("\n[測試 3] 效能監控")
    
    # 模擬一些操作
    optimizer.log_performance("generate_symbol", 45.2, True)
    optimizer.log_performance("generate_symbol", 52.1, True)
    optimizer.log_performance("generate_symbol", 38.7, True)
    optimizer.log_performance("generate_background", 120.5, True)
    
    stats = optimizer.get_performance_stats()
    if stats:
        print(f"  總操作數: {stats['total_operations']}")
        print(f"  成功率: {stats['success_rate']:.1%}")
        print(f"  平均耗時: {stats['avg_duration']:.1f} 秒")
        print(f"  快取命中率: {stats['cache_hit_rate']:.1%}")
    
    print("\n✅ 效能優化系統測試完成！")
    print("=" * 80)
