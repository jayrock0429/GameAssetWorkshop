import os
import sys

script_dir = os.path.join(os.getcwd(), 'scripts')
sys.path.append(script_dir)

from slot_ai_creator import SlotAICreator

def test_h5_ui_generation():
    creator = SlotAICreator()
    creator.base_dir = os.getcwd() # 確保能寫入 captured_prompt.txt
    
    print("Testing H5 UI generation logic...")
    
    # 清空先前的 captured_prompt.txt 以利觀察
    prompt_file = os.path.join(creator.base_dir, "captured_prompt.txt")
    if os.path.exists(prompt_file):
        os.remove(prompt_file)
        
    prompt = creator.generate_component_prompts(
        theme="Cyberpunk City",
        component_type="UI_Pillar",
        layout_mode="H5_Mobile"
    )
    
    print(f"\n--- Generated Prompt ---")
    print(prompt)
    print(f"------------------------\n")
    
    # AI translates the constraint into actual art keywords
    h5_keywords = ["frameless", "glassmorphism", "ultra-thin", "floating", "mobile"]
    found = [k for k in h5_keywords if k in prompt.lower()]
    if len(found) >= 2:
        print(f"✅ H5 Keywords successfully integrated: {found}")
    else:
        print(f"❌ H5 Keywords Missing or weak! Found: {found}")

if __name__ == "__main__":
    test_h5_ui_generation()
