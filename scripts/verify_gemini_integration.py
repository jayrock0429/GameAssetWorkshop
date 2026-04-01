import requests
import sys
import time
import subprocess
import os

def verify_integration():
    sys.stdout.reconfigure(line_buffering=True) # Force flush
    print("Starting backend for verification...", flush=True)
    backend = subprocess.Popen([sys.executable, "scripts/web_backend.py"], 
                               stdout=subprocess.PIPE, 
                               stderr=subprocess.PIPE,
                               cwd=".",
                               text=True)
    time.sleep(5)
    
    try:
        # 1. Check Status API
        print("Checking /api/status...", flush=True)
        try:
            res = requests.get("http://localhost:5050/api/status", timeout=5)
        except requests.exceptions.ConnectionError:
            print("Connection refused! Backend might not be running.", flush=True)
            raise

        print(f"Status Code: {res.status_code}", flush=True)
        print(f"Response Text: {res.text[:200]}...", flush=True)
        
        if res.status_code != 200:
            print("Server returned error!", flush=True)
            
        try:
            data = res.json()
            print(f"AI Mode reported: {data.get('ai_mode')}", flush=True)
        except:
            print("Failed to decode JSON", flush=True)
        
        # 2. Check if Gemini logic is triggered
        print("Triggering autonomous flow (detailed check)...", flush=True)
        res = requests.post("http://localhost:5050/api/fully-autonomous", json={
            "requirement": "Test Gemini Integration",
            "psd_name": None
        }, timeout=30)
        
        print(f"Autonomous Response: {res.status_code}", flush=True)
        if res.status_code == 200:
            print("Autonomous flow success!", flush=True)
            print(res.json(), flush=True)
        else:
            print(f"Autonomous flow failed: {res.text}", flush=True)

    except Exception as e:
        print(f"Verification Failed: {e}", flush=True)
        
    finally:
        print("Createing cleanup...", flush=True)
        backend.terminate()
        try:
            outs, errs = backend.communicate(timeout=5)
            if errs:
                print("--- Backend Stderr ---", flush=True)
                print(errs, flush=True)
            if outs:
                print("--- Backend Stdout ---", flush=True)
                print(outs, flush=True)
        except:
            backend.kill()

if __name__ == "__main__":
    verify_integration()
