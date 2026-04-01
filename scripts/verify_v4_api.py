import requests
import json
import time
import os
import sys

# 強制輸出為 UTF-8
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def test_v4_api():
    base_url = "http://localhost:5080/api"
    print("--- V4 API Verification (Manual Encoding) ---")
    
    # 1. 測試狀態介面
    print("\n[Step 1] Checking Status...")
    res = requests.get(f"{base_url}/status")
    print(json.dumps(res.json(), indent=2, ensure_ascii=True))
    
    # 2. 測試全自主連鎖反應 (V4)
    print("\n[Step 2] Testing V4 Fully Autonomous Flow (Mock Mode)...")
    payload = {
        "requirement": "Verify V4 SAMURAI",
        "style": "Anime_Stylized"
    }
    
    start = time.time()
    try:
        res = requests.post(f"{base_url}/fully-autonomous", json=payload, timeout=120)
        data = res.json()
        elapsed = time.time() - start
        
        if data.get("status") == "success":
            print(f"SUCCESS! (Time: {elapsed:.2f}s)")
            print(f"FULL RESPONSE: {json.dumps(data, indent=2, ensure_ascii=True)}")
            
            # 檢查各組件是否存在
            comps = data.get('components', {})
            print(f"Components Detected: {list(comps.keys())}")
            for name, url in comps.items():
                if name == "buttons":
                   print(f"  - Buttons: {list(url.keys())}")
                else:
                   print(f"  - {name}: {url}")
        else:
            print(f"FAILED: {data.get('message')}")
            
    except Exception as e:
        print(f"TIMEOUT/ERROR: {e}")

if __name__ == "__main__":
    test_v4_api()
