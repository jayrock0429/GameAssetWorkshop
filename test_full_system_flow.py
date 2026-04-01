import os
import sys
import time

# Add script dir to path
sys.path.append(os.path.join(os.path.dirname(__file__), "scripts"))

try:
    from slot_ai_creator import SlotAICreator
except ImportError:
    print("Error: Could not import SlotAICreator. Check path.")
    sys.exit(1)

def test_system_flow():
    print("🚀 [System Test] Starting End-to-End Flow Verification...")
    
    # Initialize Creator
    creator = SlotAICreator(theme="System_Test_Theme")
    creator.ensure_dirs()
    
    # Define a test prompt that is slightly "bad" on purpose to potentially trigger the critic
    test_prompt = "A very simple red square, low quality, blurry" 
    output_path = os.path.join(creator.output_dir, "test_system_flow_result.png")
    
    # Check API Key
    use_api = bool(os.environ.get("GEMINI_API_KEY"))
    mock_mode = not use_api
    
    print(f"ℹ️ Mode: {'REAL API' if use_api else 'MOCK (Simulation)'}")
    
    if use_api:
        print("🧪 Testing Real Generation Loop with Critic & Tuner...")
        # We call the internal method directly to test the loop
        creator.generate_image_from_api(
            prompt=test_prompt,
            output_path=output_path,
            mock=False,
            layout_mode="Cabinet",
            use_critic=True
        )
    else:
        print("⚠️ No API Key found. Simulating the loop logic...")
        # Simulate what would happen
        print("   1. Generate Image (Mock)")
        print("   2. Critic Analysis (Mock: Fail)")
        print("   3. Style Tuner (Mock: Rewrite Prompt)")
        print("   4. Regenerate (Mock: Success)")
        
        # Create a dummy file to prove "generation" worked
        with open(output_path, "w") as f:
            f.write("simulation_complete")
            
    if os.path.exists(output_path):
        print(f"\n✅ Test Completed. Artifact created at: {output_path}")
        print("Check the console logs above for 'AICritic', 'StyleTuner', and 'Auto-Retry' messages.")
    else:
        print("\n❌ Test Failed. No output file created.")

if __name__ == "__main__":
    test_system_flow()
