import os
import sys

# Disarm API Keys to ensure no cost is incurred
if "GEMINI_API_KEY" in os.environ:
    del os.environ["GEMINI_API_KEY"]
if "OPENAI_API_KEY" in os.environ:
    del os.environ["OPENAI_API_KEY"]

# Load the creator
script_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scripts')
sys.path.append(script_dir)
from slot_ai_creator import SlotAICreator

def run_offline_test():
    print("🚀 Starting Offline Mock Test (0 API Cost)...")
    creator = SlotAICreator()
    
    # We will use the Dragon Ball theme as requested by the user just now
    theme = "DragonBall_Test"
    
    # Run fully autonomous in MOCK mode
    # This will use legacy fallback prompt templates (since we disabled the text API key)
    # and will generate locally drawn colored blocks instead of Imagen-4 images.
    result = creator.run_fully_autonomous(
        requirement=theme,
        mock=True,
        symbol_list=["Wild", "Scatter", "Goku", "Vegeta", "Piccolo", "A", "K", "Q", "J"],
        layout_mode="Cabinet"
    )
    
    print("\n✅ Test Completed Successfully!")
    print(f"Directory created: {creator.output_dir}")
    print(f"Generated PSD JSX Toolkit: {result.get('jsx')}")
    print(f"UI Frame Image Path: {result['components'].get('ui_frame')}")
    
    # Let's inspect the generated prompt for the UI frame from the legacy fallback
    print("\n[Generated UI Frame Prompt (Fallback)]")
    # We can fetch it by calling it directly
    ui_prompt = creator.generate_component_prompts(theme, "UI_Frame", layout_mode="Cabinet")
    print(ui_prompt)
    
    print("\n[Generated Symbol Prompt (Fallback)]")
    sym_prompt = creator.generate_component_prompts(theme, "Symbol", sub_type="Goku", layout_mode="Cabinet")
    print(sym_prompt)

if __name__ == "__main__":
    run_offline_test()
