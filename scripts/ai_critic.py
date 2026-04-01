import os
import io
import json
from PIL import Image, ImageFilter, ImageStat
import math

class AICritic:
    """
    [Phase 4] AI Critic (Quality Assurance)
    Real implementation of technical and aesthetic image analysis.
    """
    def __init__(self, api_key=None):
        self.api_key = api_key
        self.criteria = {
            "min_sharpness": 100.0, # Threshold for laplacian variance
            "min_contrast": 30.0,   # Standard deviation of pixel intensity
            "max_empty_space": 0.8  # Max tools allowance of transparent pixels
        }

    def analyze_technical(self, image_path):
        """
        Performs technical analysis using PIL (No API cost).
        Returns dict with scores and pass/fail status.
        """
        results = {
            "sharpness_score": 0,
            "contrast_score": 0,
            "transparency_ratio": 0,
            "passed": False,
            "issues": []
        }

        try:
            img = Image.open(image_path).convert("RGBA")
            
            # 1. Transparency Analysis
            alpha = img.split()[3]
            # Calculate non-zero alpha pixels
            non_zero = 0
            # A faster way than getdata() loop for large images is desirable, 
            # but for simplicity using getextrema check or histogram
            hist = alpha.histogram()
            # method to count non-transparent pixels: sum of bins > 0
            # strictly transparent is 0.
            transparent_pixels = hist[0]
            total_pixels = img.width * img.height
            ratio = transparent_pixels / total_pixels
            results["transparency_ratio"] = round(ratio, 2)
            
            if ratio > self.criteria["max_empty_space"]:
                results["issues"].append(f"Content is {ratio*100:.1f}% empty (Too high)")

            # 2. Convert to Grayscale for Edge/Contrast
            gray = img.convert("L")
            
            # 3. Sharpness (Laplacian Edge Detection approximation)
            # Find edges
            edges = gray.filter(ImageFilter.FIND_EDGES)
            # Calculate variance of edges (more variance = sharper)
            edge_stat = ImageStat.Stat(edges)
            sharpness = edge_stat.var[0] if edge_stat.var else 0
            # Normalize reasonably (this is empirical)
            # 0-50: blurry, 100+: sharp
            results["sharpness_score"] = round(sharpness, 1)
            
            if results["sharpness_score"] < self.criteria["min_sharpness"]:
                results["issues"].append(f"Blurry image (Score: {sharpness:.1f} < {self.criteria['min_sharpness']})")

            # 4. Contrast
            stat = ImageStat.Stat(gray)
            contrast = stat.stddev[0] # Standard deviation of brightness
            results["contrast_score"] = round(contrast, 1)
            
            if results["contrast_score"] < self.criteria["min_contrast"]:
               results["issues"].append(f"Low contrast (Score: {contrast:.1f} < {self.criteria['min_contrast']})")

            # Verdict
            results["passed"] = len(results["issues"]) == 0
            
        except Exception as e:
            results["issues"].append(f"Analysis failed: {str(e)}")
            
        return results

    def analyze_aesthetic(self, image_path, prompt_context=""):
        """
        Uses Gemini Vision to evaluate aesthetic quality and adherence to prompt.
        Returns score (1-10) and critique.
        """
        if not self.api_key:
            return {"score": 0, "reason": "No API Key provided", "passed": False}
            
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=self.api_key)
            
            # Load image
            with open(image_path, "rb") as f:
                image_bytes = f.read()
                
            prompt = f"""
            Act as a COLD-BLOODED Art Director for a top-tier casino game studio (PG Soft/JILI caliber).
            Your goal is to AUDIT this asset against the STRICT SPECIFICATION below.
            
            [STRICT SPECIFICATION / PROJECT DNA]:
            {prompt_context}
            
            AUDIT CRITERIA (Zero Tolerance):
            1. COLOR FIDELITY: Does the asset use the CORRECT representative colors mentioned in the spec? (e.g. If it says "Orange/Red" and the image is "Green", it FAILS).
            2. SUBJECT ACCURACY: Does it accurately represent the character/symbol? (e.g. Goku must look like Goku).
            3. COMPOSITION: Is it centered? Is there NO perspective distortion? 
            4. QUALITY: Is it professional grade, or does it look like cheap AI garbage?
            
            Return ONLY a JSON object:
            {{
                "score": (integer 1-10),
                "verdict": ("PASS" or "FAIL"),
                "reason": "Explicit feedback on why it failed or why it's perfect. Mention color or character detail misses." 
            }}
            """
            
            response = client.models.generate_content(
                model='gemini-2.5-pro',
                contents=[prompt, types.Part.from_bytes(data=image_bytes, mime_type="image/png")]
            )
            
            text = response.text.strip()
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
                
            data = json.loads(text)
            # Standardize keys if AI uses pass instead of verdict
            if "verdict" not in data and "pass" in data:
                data["verdict"] = "PASS" if data["pass"] else "FAIL"
            if "reason" not in data and "critique" in data:
                data["reason"] = data["critique"]
            return data
            
        except Exception as e:
            return {"score": 0, "reason": f"AI Critque Failed: {e}", "passed": False}

    def judge(self, image_path, context=""):
        """
        Comprehensive Judgment (Hybrid).
        Fails if technical checks fail OR aesthetic score is low.
        """
        tech = self.analyze_technical(image_path)
        if not tech["passed"]:
            return {
                "verdict": "FAIL",
                "reason": f"Technical issues: {', '.join(tech['issues'])}",
                "details": tech
            }
            
        # Only check aesthetic if technical passes (to save tokens)
        aesthetic = self.analyze_aesthetic(image_path, context)
        
        if aesthetic.get("score", 0) < 7 and self.api_key:
             return {
                "verdict": "FAIL",
                "reason": f"Aesthetic Fail ({aesthetic.get('score')}/10): {aesthetic.get('critique', 'Unknown')}",
                "details": {**tech, "aesthetic": aesthetic}
            }
            
        return {
            "verdict": "PASS",
            "reason": "Passed all checks",
            "details": {**tech, "aesthetic": aesthetic}
        }

if __name__ == "__main__":
    # Test Block
    print("Testing AI Critic...")
    critic = AICritic(os.environ.get("GEMINI_API_KEY"))
    
    # Try to find a png to test
    valid_files = [f for f in os.listdir(".") if f.endswith(".png")]
    if valid_files:
        test_file = valid_files[0]
        print(f"Analyzing {test_file}...")
        result = critic.analyze_technical(test_file)
        print("Technical:", json.dumps(result, indent=2))
        
        if os.environ.get("GEMINI_API_KEY"):
            print("Analyzing Aesthetic...")
            result_ae = critic.analyze_aesthetic(test_file, "Test Asset")
            print("Aesthetic:", json.dumps(result_ae, indent=2))
