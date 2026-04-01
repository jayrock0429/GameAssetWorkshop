import os
import sys

print(f"Python Executable: {sys.executable}")
print(f"Current Working Directory: {os.getcwd()}")

try:
    from dotenv import load_dotenv
    print("SUCCESS: python-dotenv is installed.")
except ImportError:
    print("ERROR: python-dotenv is NOT installed.")
    sys.exit(1)

# Use current directory for .env
env_path = os.path.join(os.getcwd(), ".env")
if os.path.exists(env_path):
    print(f"SUCCESS: .env found at {env_path}")
    load_dotenv(env_path)
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        print(f"SUCCESS: GEMINI_API_KEY found (Length: {len(key)})")
        if key.strip() == "":
             print("WARNING: GEMINI_API_KEY is empty.")
        elif "AIza" not in key:
             print("WARNING: GEMINI_API_KEY format looks suspicious (usually starts with AIza).")
        else:
             print("Key format looks plausible.")
    else:
        print("ERROR: GEMINI_API_KEY is NOT set in .env")
else:
    print(f"ERROR: .env NOT found at {env_path}")

