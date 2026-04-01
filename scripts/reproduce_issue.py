import subprocess
import time
import requests
import sys

def run_backend_and_capture_error():
    print("Starting backend...")
    # Start web_backend.py
    backend_process = subprocess.Popen(
        [sys.executable, "scripts/web_backend.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=".",
        text=True
    )
    
    time.sleep(5)  # Wait for backend to start

    print("Sending request...")
    try:
        response = requests.post(
            "http://127.0.0.1:5000/api/fully-autonomous",
            json={"requirement": "Test Error Capture", "psd_name": None}
        )
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

    print("Terminating backend...")
    backend_process.terminate()
    try:
        stdout, stderr = backend_process.communicate(timeout=5)
        print("\n--- Backend Stdout ---")
        print(stdout)
        print("\n--- Backend Stderr ---")
        print(stderr)
    except subprocess.TimeoutExpired:
        backend_process.kill()
        print("Backend timed out.")

if __name__ == "__main__":
    run_backend_and_capture_error()
