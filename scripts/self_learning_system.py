"""
Phase 5: 自我學習系統 (Self-Learning System)
實作決策記憶、風格偏好學習與錯誤避免機制
"""

import os
import json
import time
from pathlib import Path
from datetime import datetime
from collections import defaultdict, Counter

class SelfLearningSystem:
    """
    自我學習系統
    記錄過去的決策、學習風格偏好、避免重複錯誤
    """
    
    def __init__(self, memory_file="brain_memory.json"):
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.memory_file = os.path.join(self.base_dir, "..", "output", memory_file)
        self.memory = self.load_memory()
    
    def load_memory(self):
        """載入記憶檔案"""
        if os.path.exists(self.memory_file):
            try:
                with open(self.memory_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except:
                pass
        
        # 初始化記憶結構
        return {
            "style_preferences": {},  # 風格偏好統計
            "decision_history": [],   # 決策歷史
            "error_cases": [],        # 錯誤案例
            "performance_stats": {},  # 效能統計
            "last_updated": None
        }
    
    def save_memory(self):
        """儲存記憶到檔案"""
        self.memory["last_updated"] = datetime.now().isoformat()
        os.makedirs(os.path.dirname(self.memory_file), exist_ok=True)
        
        with open(self.memory_file, 'w', encoding='utf-8') as f:
            json.dump(self.memory, f, indent=2, ensure_ascii=False)
    
    def record_style_usage(self, theme, style, visual_dna):
        """記錄風格使用"""
        if theme not in self.memory["style_preferences"]:
            self.memory["style_preferences"][theme] = {
                "count": 0,
                "styles": [],
                "visual_dna_history": []
            }
        
        self.memory["style_preferences"][theme]["count"] += 1
        self.memory["style_preferences"][theme]["styles"].append({
            "style": style,
            "timestamp": datetime.now().isoformat()
        })
        
        if visual_dna:
            self.memory["style_preferences"][theme]["visual_dna_history"].append(visual_dna)
        
        self.save_memory()
    
    def get_preferred_style(self, theme):
        """取得最常用的風格"""
        if theme not in self.memory["style_preferences"]:
            return None
        
        styles = self.memory["style_preferences"][theme]["styles"]
        if not styles:
            return None
        
        # 統計最常用的風格
        style_counter = Counter([s["style"] for s in styles])
        most_common = style_counter.most_common(1)
        
        if most_common:
            preferred_style = most_common[0][0]
            usage_count = most_common[0][1]
            
            return {
                "style": preferred_style,
                "usage_count": usage_count,
                "confidence": usage_count / len(styles)
            }
        
        return None
    
    def record_decision(self, decision_type, context, result):
        """記錄決策"""
        decision = {
            "type": decision_type,
            "context": context,
            "result": result,
            "timestamp": datetime.now().isoformat()
        }
        
        self.memory["decision_history"].append(decision)
        
        # 只保留最近 100 個決策
        if len(self.memory["decision_history"]) > 100:
            self.memory["decision_history"] = self.memory["decision_history"][-100:]
        
        self.save_memory()
    
    def record_error(self, error_type, context, solution):
        """記錄錯誤案例"""
        error = {
            "type": error_type,
            "context": context,
            "solution": solution,
            "timestamp": datetime.now().isoformat()
        }
        
        self.memory["error_cases"].append(error)
        
        # 只保留最近 50 個錯誤
        if len(self.memory["error_cases"]) > 50:
            self.memory["error_cases"] = self.memory["error_cases"][-50:]
        
        self.save_memory()
    
    def check_similar_error(self, error_type, context):
        """檢查是否有類似的錯誤案例"""
        for error in self.memory["error_cases"]:
            if error["type"] == error_type:
                # 簡單的相似度檢查
                if self._is_similar_context(error["context"], context):
                    return {
                        "found": True,
                        "solution": error["solution"],
                        "timestamp": error["timestamp"]
                    }
        
        return {"found": False}
    
    def _is_similar_context(self, context1, context2):
        """檢查兩個上下文是否相似（簡化版）"""
        # 這裡可以實作更複雜的相似度算法
        if isinstance(context1, dict) and isinstance(context2, dict):
            common_keys = set(context1.keys()) & set(context2.keys())
            if len(common_keys) > 0:
                return True
        
        return str(context1) == str(context2)
    
    def get_learning_stats(self):
        """取得學習統計"""
        return {
            "total_themes": len(self.memory["style_preferences"]),
            "total_decisions": len(self.memory["decision_history"]),
            "total_errors_learned": len(self.memory["error_cases"]),
            "last_updated": self.memory["last_updated"]
        }


# 整合助手
def create_learning_system():
    """建立學習系統實例"""
    return SelfLearningSystem()


if __name__ == "__main__":
    # 測試學習系統
    print("=" * 80)
    print("🧠 自我學習系統測試")
    print("=" * 80)
    
    system = SelfLearningSystem()
    
    # 測試 1：記錄風格使用
    print("\n[測試 1] 記錄風格使用")
    system.record_style_usage("埃及法老", "3D_Premium", {"palette": ["#FFD700", "#8B4513"]})
    system.record_style_usage("埃及法老", "3D_Premium", {"palette": ["#FFD700", "#8B4513"]})
    system.record_style_usage("埃及法老", "PBR_Realistic", {"palette": ["#FFD700"]})
    
    preferred = system.get_preferred_style("埃及法老")
    print(f"  最常用風格: {preferred['style']}")
    print(f"  使用次數: {preferred['usage_count']}")
    print(f"  信心度: {preferred['confidence']:.1%}")
    
    # 測試 2：記錄決策
    print("\n[測試 2] 記錄決策")
    system.record_decision("quality_check", {"asset": "Symbol_M1"}, {"action": "accept", "score": 85})
    system.record_decision("quality_check", {"asset": "Symbol_M2"}, {"action": "regenerate", "score": 55})
    print(f"  已記錄 {len(system.memory['decision_history'])} 個決策")
    
    # 測試 3：記錄與檢查錯誤
    print("\n[測試 3] 錯誤學習")
    system.record_error("file_size_exceeded", {"file": "BG.png", "size": "3MB"}, {"action": "compress", "target": "2MB"})
    
    similar = system.check_similar_error("file_size_exceeded", {"file": "UI.png", "size": "3.5MB"})
    if similar["found"]:
        print(f"  ✅ 找到類似錯誤，建議解決方案: {similar['solution']['action']}")
    else:
        print(f"  ❌ 未找到類似錯誤")
    
    # 統計
    stats = system.get_learning_stats()
    print("\n[學習統計]")
    print(f"  記憶的主題數: {stats['total_themes']}")
    print(f"  記錄的決策數: {stats['total_decisions']}")
    print(f"  學習的錯誤數: {stats['total_errors_learned']}")
    
    print("\n✅ 自我學習系統測試完成！")
    print("=" * 80)
