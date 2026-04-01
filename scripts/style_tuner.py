import os
import json

class StyleTuner:
    """
    [Phase 4] Style Tuner (Dynamic Adaptation)
    Rewrites prompts based on feedback using LLM, instead of simple string appending.
    """
    def __init__(self, api_key):
        self.api_key = api_key

    def tune(self, current_prompt, feedback):
        """
        Dynamically adjusts the prompt based on feedback.
        Returns the new prompt.
        """
        if not self.api_key:
            return current_prompt + f" (Fix: {feedback})"

        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=self.api_key)
            
            system_instruction = """You are an expert AI Prompt Engineer for Image Generation.
            Your task is to REWRITE the input prompt to address specific feedback/issues.
            
            Rules:
            1. Keep the core subject and style of the original prompt.
            2. Only modify parts relevant to the feedback.
            3. Enhance descriptive keywords if the feedback suggests low quality.
            4. Remove conflicting keywords if the feedback suggests style mismatch.
            5. Return ONLY the new prompt text. No explanations.
            """
            
            user_content = f"""
            ORIGINAL PROMPT:
            {current_prompt}
            
            FEEDBACK / ISSUES TO FIX:
            {feedback}
            
            Please rewrite the prompt to fix these issues while maintaining the original intent.
            """
            
            response = client.models.generate_content(
                model='gemini-2.5-pro',
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7
                ),
                contents=user_content
            )
            
            new_prompt = response.text.strip()
            return new_prompt
            
        except Exception as e:
            print(f"Style Tuner Failed: {e}")
            return current_prompt + f" {feedback}"

if __name__ == "__main__":
    # Test
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        print("Testing Style Tuner...")
        tuner = StyleTuner(key)
        orig = "A cute cat sitting on a sofa, cartoon style"
        feedback = "The cat looks too realistic, make it more 2D vector art style. The sofa color should be red."
        print(f"Original: {orig}")
        print(f"Feedback: {feedback}")
        new_val = tuner.tune(orig, feedback)
        print(f"Tuned: {new_val}")
    else:
        print("No API Key for test.")
