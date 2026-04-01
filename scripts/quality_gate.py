import os
import json
import base64
from PIL import Image
import io

class QualityCritic:
    """
    [Phase 2] AI Quality Critic
    Acts as an automated Art Director to evaluate generated assets.
    """
    def __init__(self, api_key):
        self.api_key = api_key

    def evaluate_image(self, image_path, context="Slot Game Asset"):
        """
        Evaluates an image using Gemini Vision.
        Returns: {
            "score": int (0-100),
            "pass": bool,
            "feedback": str,
            "issues": ["Blurry", "Bad Cutout", "Wrong Perspective", ...]
        }
        """
        if not os.path.exists(image_path):
            return {"score": 0, "pass": False, "feedback": "File not found", "issues": ["Missing File"]}

        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=self.api_key)

            with Image.open(image_path) as img:
                # Resize if too large
                if img.width > 1024 or img.height > 1024:
                    img.thumbnail((1024, 1024))
                
                buf = io.BytesIO()
                img.save(buf, format=img.format if img.format else 'PNG')
                image_bytes = buf.getvalue()

            prompt = f"""
            You are a strict Industrial Art Director for AAA Slot Games.
            Critique this generated asset based on:
            1. **Sharpness**: Is it crisp or blurry? (Crucial for 4K)
            2. **Visual Integrity**: Are there artifacts, glitches, or unfinished parts?
            3. **Context Fit**: Is it a valid '{context}'?
            4. **Composition**: Is it centered?
            
            Rate it from 0 to 100. Pass threshold is 80.
            
            Return ONLY JSON:
            {{
                "score": 85,
                "pass": true,
                "feedback": "Good gold texture, slightly soft edges.",
                "issues": ["Soft Edges"]
            }}
            """
            
            response = client.models.generate_content(
                model='gemini-2.5-pro',
                contents=[prompt, types.Part.from_bytes(data=image_bytes, mime_type="image/png")]
            )
            
            text = response.text.strip()
            # Clean JSON
            if text.startswith("```json"):
                text = text[7:-3]
            elif text.startswith("```"):
                text = text[3:-3]
                
            result = json.loads(text)
            
            # Simple validation logic override if needed
            if result["score"] >= 80:
                result["pass"] = True
            else:
                result["pass"] = False
                
            return result

        except Exception as e:
            print(f"Critic Error: {e}")
            return {"score": 0, "pass": False, "feedback": f"Error: {e}", "issues": ["System Error"]}

if __name__ == "__main__":
    # Test run
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))
    except: pass
    
    key = os.environ.get("GEMINI_API_KEY")
    if key:
        critic = QualityCritic(key)
        # Find a png file to test
        base = os.path.dirname(os.path.dirname(__file__))
        output_dir = os.path.join(base, "output")
        if os.path.exists(output_dir):
            files = [f for f in os.listdir(output_dir) if f.endswith(".png")]
            if files:
                target = os.path.join(output_dir, files[0])
                print(f"Critiquing: {target}")
                print(json.dumps(critic.evaluate_image(target), indent=2))
            else:
                print("No png files found in output to test.")
        else:
            print("Output dir not found.")
    else:
        print("No API Key.")
