import os
import sys

# Add scripts directory to path
script_dir = os.path.join(os.getcwd(), 'scripts')
sys.path.append(script_dir)

from slot_ai_creator import SlotAICreator

def test_refactored_generation():
    print("=== Testing Refactored System (APIClient & ImageProcessor) ===")
    creator = SlotAICreator()
    
    # Run a simplified autonomous generation to test the pipeline
    test_req = "A magical potion bottle icon, vibrant colors"
    print(f"Executing for requirement: {test_req}")
    
    try:
        # We only generate one symbol to save quota and time
        result = creator.run_fully_autonomous(
            requirement=test_req, 
            layout_mode="Cabinet", 
            symbol_list=["SYM_1"]
        )
        
        if result and result.get("status") == "success":
            print("\n[TEST PASSED] Pipeline execution successful.")
            print(f"Preview Output: {result.get('image')}")
            
            # Verify paths
            assert os.path.exists(result.get('image')), "Preview image not generated"
            assert "background" in result["components"]
            assert "symbols" in result["components"]
            print("[TEST PASSED] File generation verified.")
        else:
            print(f"\n[TEST FAILED] Pipeline returned unsuccessful result: {result}")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n[TEST FAILED] Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_refactored_generation()
