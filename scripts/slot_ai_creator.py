import os
import sys
import subprocess
import time
import re
from psd_tools import PSDImage
from PIL import Image, ImageFilter, ImageDraw, ImageOps
import io
import json
from dotenv import load_dotenv

# [Phase 4.5] Import Phase 4 Production Intelligence Modules
from layout_optimizer import SmartLayoutEngine
from engine_validator import EngineSpecValidator
from file_organizer import BatchNamingIntelligence
from psd_auto_assembly import PSDAutoAssembly

# [PSD Constraint] Import Layout Constraint Extractor
try:
    from psd_constraint_extractor import PSDConstraintExtractor
    _HAS_CONSTRAINT_EXTRACTOR = True
except ImportError:
    _HAS_CONSTRAINT_EXTRACTOR = False

# Initialize environment variables at module level
script_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(os.path.dirname(script_dir), ".env")
load_dotenv(env_path, override=True)

# --- AAA Quality Booster Standards ---
# [V3.1] Enhanced 3A Standard with Ambient Occlusion & Contact Shadows
# [V3.1] Enhanced 3A Standard (Universal - Neutral Perspective)
_AAA_GLOBAL_RENDER = ", render 3d, glossy gold, ornamental border, mobile game asset, hyper-realistic PBR materials, octane render, unreal engine 5 style, ambient occlusion, beveled edges, rim lighting, sharp reflections, polished metal, internal gem glow, volumetric lighting, architectural layering, high-contrast specular highlights, Gold metallic, Shiny gemstones, Art Deco style, High contrast, Glowing edges, professional studio lighting, depth of field, sharp textures, high-poly mesh, NO 2D flat vector art"

# [V3.2] Zero-Perspective UI Render (PRIORITY: FLATNESS OVER SPACE)
# Stripped keywords: "Unreal Engine 5", "high-poly mesh", "depth of field" to avoid AI perspective hallucination.
_AAA_UI_RENDER = ", 100% FLAT 2D ORTHOGRAPHIC PROJECTION, ABSOLUTE ZERO PERSPECTIVE, FRONT-ON VIEW, NO ANGLES, multi-layered architectural metal and glass materials, thick physical beveled edges, polished glossy finish, high-contrast studio rim lighting, glassmorphism, frosted glass texture, digital LED panels, perfectly symmetrical, isolated on solid background"

# UI Specific (Headers, Base, Pillars)
_AAA_UI_SPEC = ", metallic bezels with high-contrast reflections, internal digital LED display panels, premium metallic materials, blank interface (NO TEXT)"

# [V3.3] Global Negative Prompt (MANDATORY FOR ALL)
_GLOBAL_NEGATIVE_PROMPT = ", grid, collage, split view, multiple views, text, watermark, signature, distorted, blurry, low quality"

# [V3.2] UI Negative Prompt Matrix (Mandatory for UI)
_UI_NEGATIVE_PROMPT = ", perspective, angled view, tilt, vanishing point, three-dimensional slant, camera depth, isometric distortion, receding edges, Z-depth distortion, 3D perspective" + _GLOBAL_NEGATIVE_PROMPT

# [V26.5] Symbol Specific Negative Prompt (ANTI-ISOMETRIC)
_SYMBOL_NEGATIVE_PROMPT = ", (isometric:1.5), perspective, tilted, side view, corner view, 45-degree angle, three-quarter view, angled view" + _GLOBAL_NEGATIVE_PROMPT

# Symbols Standard
# [V26.5] Front View Standard (ABSOLUTE FRONT-ON)
_AAA_SYMBOL_SPEC = ", chunky 3D model with physical thickness, FRONT VIEW, STRAIGHT ON, SYMMETRICAL, CENTERED, heavy beveled edges, aggressive high-contrast rim lighting, brushed gold metal texture, internal gem glow, sub-surface scattering, hyper-polished crystal materials, isolated on solid dark background"

#  (Mascot)
# Q  ()
_AAA_MASCOT_SPEC = ", 3D render, stylized anthropomorphic mascot, winner energy expression, premium texture contrast (silk/fur/gold), wealth particles (glowing coins/sparkles), volumetric rim lighting, isolated on solid background"

# --- [V3.0]  (General Slot Engine Standards) ---

# Module 1: Structural Constraint Engine
_STRUCTURAL_CONSTRAINTS = {
    "UI_Header": "A long horizontal banner structure, wide UI panel, panoramic view, fitted to screen width, spanning full screen width, top interface panel, extreme wide aspect ratio, FLAT FRONT VIEW, NO PERSPECTIVE, NO STANDALONE CHARACTERS, ",
    "UI_Base": "A long horizontal banner structure, wide UI panel, panoramic view, fitted to screen width, bottom interface console, spanning full screen width, wide aspect ratio, featuring placeholder zones for buttons, FLAT FRONT VIEW, NO PERSPECTIVE, NO ANGLES, ",
    "UI_Pillar": "A tall vertical column structure, side frame element, spanning full screen height, tall aspect ratio, standing vertically, FLAT FRONT VIEW, NO PERSPECTIVE, ",
    "Mascot": "A full body character, standing on the left side, facing right towards the center, clear silhouette, ",
    "Symbol": "A single isolated 3D object, centered composition, FRONT VIEW, STRAIGHT ON, chunky physical volume, "
}

#  (The Visual Hierarchy Engine)
#  Tier 
_TIER_VISUAL_ENHANCERS = {
    "M1_Hero": "Massive scale, most prominent element, intense hero lighting, dynamic cinematic pose, elaborate background aura effect, highest level of detail, unmatched visual impact, ",
    "High_Pay": "Large scale, premium material (polished gold, glowing gemstones), heavy 3D bevel, prominent studio rim light, ornate frame details, high value luxury feel, ",
    "Low_Pay": "Standard scale, simple clear material (clean metal, matte stone), moderate 3D bevel, subtle ambient lighting, no complex background elements, highly readable, "
}
# -----------------------------------------------------------

print("DEBUG: SlotAICreator V2 loaded.")

class SlotAICreator:
    def __init__(self, theme=None):
        self.theme = theme
        # [V14.1] Dynamic path derivation to support any environment
        script_dir = os.path.dirname(os.path.abspath(__file__))
        self.base_dir = os.path.dirname(script_dir) # Project root
        self.output_root = os.path.join(self.base_dir, "output")
        self.output_dir = self.output_root # Default, will be overridden per spin
        self.layout_info = {} # Layout Bounds
        self.vision_sync_context = "" # [V3.1] Benchmark Feature Sync context

        # [V13.0] 
        self.styles_config = {
            "3D_Premium": "High-fidelity 3D rendering, PBR materials, cinematic lighting",
            "Anime_Stylized": "Anime-style cel-shading, vibrant colors, bold outlines",
            "PBR_Realistic": "Photorealistic PBR, ultra-detailed textures, natural lighting",
            "Flat_Modern": "Flat design, minimalist, bold colors, geometric shapes"
        }
        
        # 5x3 Default Layout Constants
        self.default_5x3 = {
            "symbol_size": 160,
            "spacing": 10,
            "grid_startX": 220,
            "grid_startY": 110,
            "grid_width": 840,
            "grid_height": 500,
            "columns": 5,
            "rows": 3
        }

        # [V20.1] Production_V1 Layout (Matched to KnockoutClash PSD)
        self.production_v1 = {
            "symbol_w": 343,
            "symbol_h": 203,
            "spacing": 0, # PSD 
            "grid_startX": 420,
            "grid_startY": 157,
            "grid_width": 1719,
            "grid_height": 1003,
            "columns": 5,
            "rows": 5,
            "canvas_w": 2560,
            "canvas_h": 1440
        }
        
        # [Phase 4.5] Initialize Production Intelligence Engines
        self.layout_engine = SmartLayoutEngine()
        self.spec_validator = EngineSpecValidator()
        self.naming_engine = BatchNamingIntelligence(self.output_dir)
        self.psd_assembler = PSDAutoAssembly()
        self.stop_requested = False 
        self.layout_constraints = None  

    def sync_from_url(self, url):
        """[V3.1] Synchronize visual features from benchmark URL"""
        print(f"DEBUG: [V3.1 Vision Sync] Synchronizing from {url}...")
        
        # [V3.2] Multi-Theme Sync Logic
        if "ancient-egypt" in url.lower():
            self.vision_sync_context = (
                " [BENCHMARK SYNC: RISE OF EGYPT]: UI_Header MUST be a horizontal wide architectural gold frame spanning the top. "
                "Symbol (Eye of Horus) should be a chunky 3D object with glowing emerald iris set in brushed gold. "
                "UI MUST be a structural layout, NOT a statue."
            )
            print("[OK] Vision Feature Calibrated: Rise of Egypt DNA.")
        elif "slot%20ui" in url.lower() or "slot-ui" in url.lower():
            # [V3.2] Global Slot UI DNA - Metal + Digital + Wide Frame
            self.vision_sync_context = (
                " [BENCHMARK SYNC: AAA SLOT UI]: UI MUST be a WIDE BANNER spanning full screen width. "
                "Materials: Multi-layered beveled metal borders (Polished Gold/Chrome) wrapping dark digital glass panels. "
                "Details: Glowing LED edges, glassmorphism, heavy 3D volume, perfectly symmetrical architecture."
            )
            print("[OK] Vision Feature Calibrated: Global 3A Slot UI DNA (Wide Frame + Digital Metal).")
        else:
            self.vision_sync_context = " [BENCHMARK SYNC]: Focus on deep 3D bevels, studio lighting, and material physical depth."
        
        return self.vision_sync_context
        
    def analyze_excel_structure_with_ai(self, excel_path):
        """[V16.0]  AI  Excel """
        import pandas as pd
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key: return None

        try:
            xl = pd.ExcelFile(excel_path)
            # [V17.1]  AI 
            snapshot = {}
            for name in xl.sheet_names:
                df = xl.parse(name, nrows=15).dropna(how='all').fillna("")
                snapshot[name] = df.to_dict(orient='records')

            from google import genai
            from google.genai import types
            client = genai.Client(api_key=gemini_key)
            
            prompt = (
                "You are a Senior Game Producer. Analyze this Excel structure for a slot game project.\n"
                f"Excel Structure Snapshot: {json.dumps(snapshot, ensure_ascii=False, default=str)[:4000]}\n\n"
                "Extract the following mapping in JSON format:\n"
                "1. 'symbol_design_sheet': The sheet name containing ART DESCRIPTIONS (e.g., 'Symbol', 'p').\n"
                "2. 'name_col': Column index (0-based) for the 'Symbol ID' or 'Name' (e.g., M1, Wild). Look for 'SYM_' prefixes.\n"
                "3. 'desc_col': Column index (0-based) for the 'Visual Description' (longest text column).\n"
                "Patterns to look for: Symbol IDs are often in col 1 or 2. Descriptions are often in col 4, 5, or 6.\n"
                "Return ONLY the JSON."
            )
            
            response = client.models.generate_content(
                model='gemini-2.5-pro',
                contents=prompt
            )
            # Parse JSON from response
            res_text = response.text.strip()
            if "```json" in res_text:
                res_text = res_text.split("```json")[1].split("```")[0].strip()
            return json.loads(res_text)
        except Exception as e:
            print(f"WARNING: AI Structure Analysis failed: {e}")
            return None

    def load_styles(self):
        """Load styles from styles.json"""
        try:
            style_path = os.path.join(script_dir, "styles.json")
            with open(style_path, "r", encoding="utf-8") as f:
                self.styles_config = json.load(f)
            print(f"DEBUG: Loaded styles from {style_path}")
        except Exception as e:
            print(f"WARNING: Failed to load styles.json: {e}. Using defaults.")
            self.styles_config = {
                "3D_Premium": {"prompt": "Professional casino slot game art, cinematic lighting, sharp 3D details, stylized and polished, symmetry, magical glow."},
                "Anime_Stylized": {"prompt": "Vibrant anime art style, cel-shaded, bold linework, high-contrast, fantasy aesthetic, hand-drawn quality."},
                "PBR_Realistic": {"prompt": "Ultra-realistic 3D PBR textures, ray-traced reflections, photographic studio lighting, intricate mechanical details."},
                "Flat_Modern": {"prompt": "Clean vector art, flat design, minimalist shapes, bright solid colors, sharp edges, modern mobile game aesthetic."}
            }

    def request_stop(self):
        """[V20.7] Request the engine to stop as soon as possible"""
        print("[STOP] [ENGINE] Stop signal received. Stopping processing...")
        self.stop_requested = True

    def ensure_dirs(self):
        for d in [self.base_dir, self.output_dir]:
            if not os.path.exists(d):
                os.makedirs(d)
                print(f"Created directory: {d}")

    def _reason_prompt(self, request_info):
        """[V13.0 ]  PG/JILI  DNA"""
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key:
            return None
        
        # [V13.0]  DNA 
        dna_config = {}
        try:
            dna_path = os.path.join(self.base_dir, "config", "pg_jili_visual_dna.json")
            if os.path.exists(dna_path):
                with open(dna_path, 'r', encoding='utf-8') as f:
                    dna_config = json.load(f)
        except Exception as e:
            print(f"WARNING: Failed to load Visual DNA: {e}")
            
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=gemini_key)
            
            # [V13.0]  - 
            metal_kw = ', '.join(dna_config.get('materials', {}).get('metal', {}).get('keywords', ['brushed metal']))
            gem_kw = ', '.join(dna_config.get('materials', {}).get('gemstone', {}).get('keywords', ['subsurface scattering']))
            gold_kw = ', '.join(dna_config.get('materials', {}).get('gold', {}).get('keywords', ['warm diffuse']))
            
            # [Phase 2]  DNA
            visual_ref = self.layout_info.get("visual_reference")
            dynamic_dna_prompt = ""
            
            # [Phase 2.5] Style Tuner Override (Highest Priority)
            tuned_style = self.layout_info.get("tuned_style")
            if tuned_style:
                 dynamic_dna_prompt = f"""
 USER LOCKED STYLE (OVERRIDE):
- MANDATORY STYLE: {tuned_style}
- IGNORE default DNA where it conflicts with the above.
"""
            elif visual_ref:
                style_kws = ", ".join(visual_ref.get("style_keywords", []))
                palette = ", ".join(visual_ref.get("palette", []))
                materials = ", ".join(visual_ref.get("materials", []))
                lighting = visual_ref.get("lighting", "Studio")
                structure = visual_ref.get("structure_map", "")
                is_sketch = visual_ref.get("is_sketch", False)
                
                sketch_logic = ""
                if is_sketch:
                    sketch_logic = f"\n- CONTROLNET LOCK (STRICT GEOMETRY): {structure}\n- TASK: Render the EXACT SHAPES from the sketch. Do NOT add new elements."
                
                dynamic_dna_prompt = f"""
 DYNAMIC VISUAL TARGET (IP-ADAPTER & CONTROLNET ACTIVE):
- STYLE (IP-ADAPTER): {style_kws}
- PALETTE: {palette}
- MATERIALS (PBR): {materials}
- LIGHTING: {lighting}{sketch_logic}
OVERRIDE default DNA with these specific traits if they conflict."""

            # [Phase 3] Check for Variant (Win State / VFX)
            variant = request_info.get("variant")
            variant_prompt = ""
            if variant == "Win_State":
                 variant_prompt = """
 VARIANT REQUEST: WIN STATE (ACTION POSE)
- ACTION: The subject must be bursting with energy, roaring, or activating.
- VFX: Add heavy bloom, magical particles, electric arcs, or motion blur around the subject.
- LIGHTING: Intensify the rim light and emissive glow.
- COMPOSTION: Keep it centered but maximize impact.
"""

            # [V21.1] UI Frame & Component Constraints (Migrated to Art Bible Knowledge Base)
            component = request_info.get("component")
            component_prompt = ""
            if component:
                component_prompt = f"""
 CRITICAL COMPONENT: You are currently generating the '{component}'. 
You MUST look up the specific constraints for '{component}' in the 'SLOT GAME ART BIBLE (KNOWLEDGE BASE)' provided below and STRICTLY follow all rules defined for it!
"""

            # [PSD Constraint]  PSD 
            psd_spec_block = ""
            if self.layout_constraints:
                psd_spec_block = self.layout_constraints.to_prompt_spec()

            # [V22.0] Load Slot Art Guidelines from Knowledge Base
            guidelines_path = os.path.join(self.base_dir, "resources", "slot_art_guidelines.md")
            art_dir_path = os.path.join(self.base_dir, "art_direction.md")
            v22_guidelines = ""
            if os.path.exists(guidelines_path):
                try:
                    with open(guidelines_path, "r", encoding="utf-8") as f:
                        v22_guidelines = f.read()
                except Exception as e:
                    print(f"WARNING: Failed to read slot_art_guidelines.md: {e}")
            
            # [V22.1] Inject User-Specific Art Direction
            if os.path.exists(art_dir_path):
                try:
                    with open(art_dir_path, "r", encoding="utf-8") as f:
                        v22_guidelines += "\n\n=== USER ART DIRECTION ===\n" + f.read()
                except: pass
                
            # [V22.2] Inject Symbol-Specific Direction
            symbol_dir_path = os.path.join(self.base_dir, "symbol_direction.md")
            if component and "Symbol" in str(component) and os.path.exists(symbol_dir_path):
                try:
                    with open(symbol_dir_path, "r", encoding="utf-8") as f:
                        v22_guidelines += "\n\n=== SYMBOL ART SPECIFICATION ===\n" + f.read()
                        print(f"DEBUG: [V22.2] Injected Symbol Direction for {component}")
                except: pass

            # [V26.2]  Zero-Perspective Mandate Logic
            is_zero_perspective = "UI" in str(component) or "Button" in str(component)
            flat_art_rule = "1. **NO FLAT ART:** Even for 'Anime_Stylized' or 'Flat_Modern' profiles, you MUST maintain 3D volume, thick beveled edges, and lighting depth. Think 'AAA 3D Game with Cel-shading' (like Genshin Impact), NOT 2D vector flash games."
            if is_zero_perspective:
                flat_art_rule = "1. **MANDATORY FLAT ART:** For UI components, you MUST generate 100% FLAT 2D vector-style art with ZERO PERSPECTIVE and NO ANGLES. This overrides any other 3D rendering instruction."

            system_instruction = f"""You are an ELITE Art Director for AAA slot games (PG/JILI caliber).
Your ONLY job is to convert raw requirements into HYPER-SPECIFIC prompts for AI image generation, ensuring they are STRICTLY usable as game development assets. 

=== SLOT GAME ART BIBLE (KNOWLEDGE BASE) ===
{v22_guidelines}
============================================

=== CRITICAL ART DIRECTION (MANDATORY) ===
{flat_art_rule}
2. **NO TEXT:** Strictly no letters, numbers, or words on UI.
3. **PINTEREST QUALITY:** Follow the "Architectural Layering" rule for UI. Frames must look like heavy physical objects with nested layers.
4. **H5_MOBILE DEPTH:** H5 assets should be "Sleek and Slim" but still possess 3D material depth and high-contrast reflections. Never generate thin 1-pixel paper-like lines.
5. **UI STRUCTURE:** UI_Header and UI_Base MUST be WIDE BANNERS spanning the full screen width. NO SMALL BLOCKS. Add physical weight with metallic bezels and digital LED panels.
==========================================

{dynamic_dna_prompt}
{component_prompt}
{variant_prompt}

{psd_spec_block}

Return ONLY the final detailed image generation prompt. No conversational text."""
            
            prompt_request = f"Requirement: {json.dumps(request_info, ensure_ascii=False)}"
            
            response = client.models.generate_content(
                model='gemini-2.5-pro',
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=0.7
                ),
                contents=prompt_request
            )
            
            final_text = response.text.strip()
            # [Debug] Capture High-IQ Prompts
            try:
                debug_file = os.path.join(self.base_dir, "captured_prompt.txt")
                with open(debug_file, "a", encoding="utf-8") as f:
                     f.write(f"\n[AI_REASONED | {request_info.get('variant') or 'Normal'}]\n{final_text}\n" + "-"*50 + "\n")
                print(f"DEBUG: Captured AI Prompt for {request_info.get('component')}")
            except: pass
            
            return final_text
        except Exception as e:
            print(f"WARNING: Reasoning pass failed: {e}")
            return None
    def get_grid_layout(self, canvas_w, canvas_h, layout_mode="Cabinet", custom_layout=None):
        """[V26.5] get_grid_layout with Custom Overrides support"""
        # [Phase 2]
        manifest = self.manifest if hasattr(self, 'manifest') else {}
        cfg = manifest.get("layout_config", {})
        
        # [V26.2 Fix] Prioritize Excel Config
        if cfg and isinstance(cfg, dict) and cfg.get("canvas_w"):
            canvas_w, canvas_h = cfg["canvas_w"], cfg["canvas_h"]

        # Default settings
        layout = {
            "start_x": 0, "start_y": 0, "total_w": 0, "total_h": 0,
            "cell_w": 0, "cell_h": 0, "cols": 5, "rows": 3,
            "spacing": 10
        }

        # [V20.1] Production_V1 Match
        if layout_mode == "Production_V1":
            layout.update({
                "start_x": 420, "start_y": 157, 
                "total_w": 1719, "total_h": 1003,
                "cell_w": 343, "cell_h": 203,
                "cols": 5, "rows": 5, "spacing": 0
            })
        elif layout_mode == "H5_Mobile":
            # 720x1280 (Standard JILI H5)
            # [V26.5 Universal Constraint] Reel Area ~73% (934px), StartY at 12% (154px)
            layout.update({
                "start_x": 40, "start_y": 154,
                "total_w": 640, "total_h": 934,
                "cell_w": 124, "cell_h": 308,
                "cols": 5, "rows": 3, "spacing": 5
            })
        else: # Cabinet 1280x720
            # [V26.5 Universal Constraint] Reel Area ~73% (525px), StartY at 12% (86px)
            layout.update({
                "start_x": 220, "start_y": 86,
                "total_w": 840, "total_h": 525,
                "cell_w": 160, "cell_h": 168,
                "cols": 5, "rows": 3, "spacing": 10
            })

        # [V26.5] Apply Overrides from UI (custom_layout)
        if custom_layout and isinstance(custom_layout, dict):
            print(f" [V26.5] Applying UI Custom Layout: {custom_layout}")
            for key in ["start_x", "start_y", "cell_w", "cell_h", "cols", "rows", "spacing"]:
                if custom_layout.get(key) is not None:
                    layout[key] = custom_layout[key]
            
            # Recalculate total dimensions if changed
            layout["total_w"] = layout["cols"] * layout["cell_w"] + (layout["cols"] - 1) * layout["spacing"]
            layout["total_h"] = layout["rows"] * layout["cell_h"] + (layout["rows"] - 1) * layout["spacing"]

        # Save for smart_hollow
        self.layout_info["grid"] = layout
        return layout

    def analyze_reference_image(self, image_path):
        """[V3.5 IP-Adapter/ControlNet Simulation] Extract deep visual DNA (Materials, Palette, Structure)"""
        gemini_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_key or not os.path.exists(image_path):
            return {}
            
        print(f"DEBUG: [V3.5 Vision Analysis] Analyzing reference: {os.path.basename(image_path)}...")
        try:
             from google import genai
             from google.genai import types
             client = genai.Client(api_key=gemini_key)
             
             with open(image_path, 'rb') as f:
                 img_data = f.read()
                 
             prompt = """
             You are a Technical Art Director. Analyze this Slot UI reference image or sketch.
             Return a JSON object with:
             1. 'style_keywords': (list) 10+ visual keywords (e.g., 'brushed gold', 'frosted glass').
             2. 'palette': (list) Hex colors or descriptive color names.
             3. 'materials': (list) Specific physical properties (e.g., 'polished chrome', 'glowing neon edges').
             4. 'structure_map': (string) IF this is a sketch/lineart, describe the bounding boxes and geometry precisely (ControlNet Lock). IF it's a render, describe the layering.
             5. 'is_sketch': (bool) True if this is a monochrome line drawing.
             """
             
             response = client.models.generate_content(
                 model='gemini-2.5-flash-image',
                 contents=[
                     prompt,
                     types.Part.from_bytes(data=img_data, mime_type="image/png")
                 ]
             )
             
             res_text = response.text.strip()
             if "```json" in res_text:
                 res_text = res_text.split("```json")[1].split("```")[0].strip()
             
             dna = json.loads(res_text)
             print(f"[OK] Vision DNA Extracted: {len(dna.get('style_keywords', []))} keywords found.")
             return dna
        except Exception as e:
            print(f"WARNING: Vision Analysis failed: {e}")
            return {}

    def _get_style_hint(self, image_path):
        """Legacy compatibility wrapper"""
        dna = self.analyze_reference_image(image_path)
        return ", ".join(dna.get("style_keywords", ["Professional Slot Art"]))

    def import_requirements(self, excel_path):
        """[Phase 1] """
        print(f"\n[ENGINE]  Requirements : {excel_path}...")
        
        try:
            import pandas as pd
            
            # [Phase 2]  AI  (High-IQ)
            ai_map = self.analyze_excel_structure_with_ai(excel_path)
            if ai_map:
                print(f" [V16.0 AI] : {ai_map}")
            
            xl = pd.ExcelFile(excel_path)
            
            # 1. Game Info (Resolution, etc.)
            game_info = {}
            if "Game_Info" in xl.sheet_names:
                df_info = xl.parse("Game_Info")
                game_info = dict(zip(df_info.iloc[:,0], df_info.iloc[:,1]))
            
            # 2. Symbol Design (DNA Extraction)
            symbol_sheet = ai_map.get("symbol_design_sheet", "p") if ai_map else "p"
            name_col = ai_map.get("name_col", 1) if ai_map else 1
            desc_col = ai_map.get("desc_col", 5) if ai_map else 5
            
            symbols = []
            symbol_descriptions = {}
            
            # [V22.5] Weighted Sheet Matching (Prioritize Symbols)
            def get_sheet_score(s):
                s_low = s.lower()
                score = 0
                if symbol_sheet.lower() in s_low: score += 100
                if "symbol" in s_low: score += 50
                if "符號" in s_low or "圖標" in s_low: score += 40
                if "設計" in s_low: score += 10
                if "ui" in s_low: score -= 20 # UI sheets often contain junk/reference
                return score

            # Find the best matching sheet
            xl_sheets = xl.sheet_names
            scored_sheets = [(s, get_sheet_score(s)) for s in xl_sheets]
            scored_sheets.sort(key=lambda x: x[1], reverse=True)
            
            actual_symbol_sheet = scored_sheets[0][0] if scored_sheets and scored_sheets[0][1] > 0 else None
            
            # [V22.6] Two-Pass Symbol Extraction
            def extract_from_sheet(sheet_name):
                found_symbols = []
                if not sheet_name: return found_symbols
                try:
                    df = xl.parse(sheet_name)
                    for _, row in df.iterrows():
                        name = str(row.iloc[name_col]).strip() if len(row) > name_col else ""
                        desc = str(row.iloc[desc_col]).strip() if len(row) > desc_col else ""
                        if re.search(r'(SYM_|WILD|SCATTER|BONUS|[HML]\d+)', name, re.I):
                            found_symbols.append(name)
                            symbol_descriptions[name] = desc
                except: pass
                return found_symbols

            # Pass 1: Use AI Recommended Sheet
            if actual_symbol_sheet:
                print(f" [V22.6] Pass 1: Trying AI Recommended Sheet '{actual_symbol_sheet}'...")
                symbols = extract_from_sheet(actual_symbol_sheet)
            
            # Pass 2: Fallback to high-score sheets (Excluding UI) if Pass 1 failed
            if not symbols:
                print(f" [V22.6] Pass 1 Failed. Pass 2: Searching for alternative symbol sheets...")
                # Filte out sheets with 'UI' for fallback
                alternatives = [s for s, score in scored_sheets if score > 0 and "ui" not in s.lower()]
                for alt in alternatives:
                    if alt == actual_symbol_sheet: continue
                    print(f"  -> Trying Alternative: '{alt}'")
                    symbols = extract_from_sheet(alt)
                    if symbols:
                        print(f"  [OK] Successfully recovered {len(symbols)} symbols from '{alt}'!")
                        break
            
            # [V14.0 Final Fallback] 
            if not symbols:
                 print(f" [CRITICAL WARNING] Symbol extraction failed for all sheets. Falling back to 5 default symbols.")
                 symbols = ["M1", "M2", "M3", "Wild", "Scatter"]

            # 3. Layout Config
            layout_cfg = {
                "canvas_w": game_info.get("Resolution_W", 1280),
                "canvas_h": game_info.get("Resolution_H", 720),
                "symbol_w": 160,
                "symbol_h": 160
            }

            return {
                "theme_hint": game_info.get("Theme", "Professional Slot"),
                "symbols": symbols,
                "symbol_descriptions": symbol_descriptions,
                "game_info": game_info,
                "layout_config": layout_cfg
            }
            
        except Exception as e:
            print(f"CRITICAL: Failed to import requirements: {e}")
            return {"theme_hint": "Slot Machine", "symbols": ["M1", "Wild"], "symbol_descriptions": {}}

    def analyze_psd(self, psd_path):
        """[Phase 2] PSD Content Extraction & Layout Projection"""
        print(f"\n[ARTIST] Analyzing Source PSD: {psd_path}...")
        
        if not os.path.exists(psd_path):
            print(f"FAIL: PSD not found at {psd_path}")
            return
            
        try:
            psd = PSDImage.open(psd_path)
            print(f" [V6.0] PSD Dimensions: {psd.width}x{psd.height}")
            
            # [V26.2]  PSD  Layout Projection 
            # 1.   
            # 2.   
            # 3.   
            
            visual_dna = {
                "palette": [],
                "materials": [],
                "lighting": "Studio",
                "style_keywords": []
            }
            
            # [Phase 2] Analyze layers for DNA
            for layer in psd:
                # Mock analysis logic: Extract keywords from layer names
                if "gold" in layer.name.lower(): visual_dna["materials"].append("Brushed Gold")
                if "gem" in layer.name.lower(): visual_dna["materials"].append("Crystal Gemstone")
                if "neon" in layer.name.lower(): visual_dna["style_keywords"].append("Cyberpunk Neon")
            
            self.layout_info["visual_reference"] = visual_dna
            
            # [PSD Constraint] Extract constraints from PSD
            if _HAS_CONSTRAINT_EXTRACTOR:
                extractor = PSDConstraintExtractor(psd_path)
                self.layout_constraints = extractor.extract()
                print(f" [V20.4] PSD Constraints Extracted: {self.layout_constraints.canvas_w}x{self.layout_constraints.canvas_h}")
                
            return visual_dna
            
        except Exception as e:
            print(f"WARNING: PSD Analysis failed: {e}")
            return None

    def auto_process_image(self, image_path):
        """[Phase 2] Automatic Asset Processing (Alpha Remove / Resize)"""
        print(f"\n[ENGINE] Auto-Processing Image: {image_path}...")
        
        try:
            # 1. Remove background automatically if it's a symbol
            if "SYMBOL" in image_path.upper() or "ICON" in image_path.upper():
                from image_processor import ImageProcessor
                processor = ImageProcessor()
                transparent_path = processor.process_transparency(image_path)
                print(f" [V6.1] Background Removed: {transparent_path}")
                return transparent_path
            return image_path
        except Exception as e:
            print(f"[WARN] Auto-processing failed: {e}")
            return image_path

    def should_remove_background(self, asset_type, path):
         """Determines if the AI generation resulted in a clean enough image for auto-transparency"""
         # [V5] Rule: Mascot and Symbols always need it. BG and UI (H5) usually don't or are handled differently.
         # [V19.0 Override] If it's a UI Frame, we actually DO want it transparent for the center hole!
         return asset_type in ["Mascot", "Symbol", "UI"]

    def generate_component_prompts(self, theme, component_type, subtype=None, style_hint="", style_profile="3D_Premium", layout_mode="Cabinet", symbol_configs=None):
        """[V26.5] Enhanced reasoned prompt generation with overflow support"""
        
        # [Phase 4] Standard Quality Multiplier
        quality_spells = _AAA_GLOBAL_RENDER
        
        # [V11.0] Legacy logic for direct prompt generation (Fallbacks)
        request_info = {
            "theme": theme,
            "component": component_type,
            "subtype": subtype,
            "style_hint": style_hint,
            "style_profile": style_profile,
            "layout_mode": layout_mode
        }

        # [V26.0] Handle specific UI Frame feedback for H5_Mobile
        feedback_str = ""
        if "UI" in component_type:
            feedback_str = " [CRITICAL CONSTRAINT]: ABSOLUTE ZERO PERSPECTIVE. MUST BE 100% FLAT 2D OVERLAY. NO ANGLES. NO VANISHING POINTS. FRONT-ON ORTHOGRAPHIC VIEW ONLY."
        
        if layout_mode == "H5_Mobile" and "UI" in component_type:
             feedback_str += " [MANDATORY H5 CONSTRAINT]: You MUST NOT generate thick metal casino cabinets! Design MUST be ULTRA-THIN, sleek, frameless, and purely frosted glassmorphism floating UI to maximize mobile screen space."
        
        # [V26.5] Overflow / Breaking Frame Injection
        if component_type == "Symbol" and subtype and symbol_configs:
            cfg = symbol_configs.get(subtype)
            if cfg and cfg.get("scale", 1.0) > 1.1:
                feedback_str += " [DYNAMIC COMPOSITION]: The character/object should have a DYNAMIC POSE that intentionally BREAKS THE FRAME. Parts of the design should EXTEND OUTWARDS to suggest power and scale. Avoid compact compositions."
        
        # [Phase 5] Inject DNA if available
        if subtype and hasattr(self, 'symbol_descriptions'):
             spec = self.symbol_descriptions.get(subtype)
             if spec:
                 request_info["dna_specification"] = spec
                 print(f"DEBUG: [Phase 5] Injecting DNA Spec for {subtype}")

        # [V13.0] AI Reasoning Pass (High-IQ Art Director)
        reasoned_prompt = self._reason_prompt(request_info)
        
        if reasoned_prompt:
            # Inject Structural Prefix
            structural_prefix = _STRUCTURAL_CONSTRAINTS.get(component_type, "")
            if structural_prefix:
                reasoned_prompt = structural_prefix + reasoned_prompt
                print(f"DEBUG: [V3.0 Structure] Injected Universal Structural Prefix for {component_type}")
            
            # [V24.0]  3A  (3A Spells Injection)
            spell = ""
            negative_spell = ""
            if "UI" in component_type or component_type == "Button":
                # UI Components use the new Zero-Perspective render standard
                spell = _AAA_UI_RENDER + _AAA_UI_SPEC
                negative_spell = _UI_NEGATIVE_PROMPT
            elif component_type in ["Symbol", "Wild", "Scatter"]:
                spell = _AAA_SYMBOL_SPEC + _AAA_GLOBAL_RENDER
                negative_spell = _SYMBOL_NEGATIVE_PROMPT
            elif component_type == "Mascot" or "character" in component_type.lower():
                spell = _AAA_MASCOT_SPEC + _AAA_GLOBAL_RENDER
            elif component_type == "Background" or "bg" in component_type.lower():
                spell = ", atmospheric depth of field, wealth particles background, blurry, low contrast" + _AAA_GLOBAL_RENDER
            
            # [V3.3] Always enforce global negative constraints
            negative_spell = (negative_spell or "") + _GLOBAL_NEGATIVE_PROMPT
                
            if spell:
                # Append negative spell if exists
                if negative_spell:
                    if "Negative prompt:" in reasoned_prompt:
                        reasoned_prompt = reasoned_prompt.replace("Negative prompt:", f"Negative prompt:{negative_spell},")
                    elif "Negative Prompt:" in reasoned_prompt:
                        reasoned_prompt = reasoned_prompt.replace("Negative Prompt:", f"Negative Prompt:{negative_spell},")
                    else:
                        reasoned_prompt += f"\n\nNegative prompt:{negative_spell}"

                # Append main spell
                if "Negative prompt:" in reasoned_prompt:
                    parts = reasoned_prompt.split("Negative prompt:")
                    reasoned_prompt = f"{parts[0].rstrip()}, {spell}\n\nNegative prompt:{parts[1]}"
                elif "Negative Prompt:" in reasoned_prompt:
                    parts = reasoned_prompt.split("Negative Prompt:")
                    reasoned_prompt = f"{parts[0].rstrip()}, {spell}\n\nNegative Prompt:{parts[1]}"
                else:
                    reasoned_prompt += f", {spell}"
                    
            if feedback_str:
                if "Negative prompt:" in reasoned_prompt:
                    parts = reasoned_prompt.split("Negative prompt:")
                    reasoned_prompt = f"{parts[0].rstrip()}{feedback_str}\n\nNegative prompt:{parts[1]}"
                elif "Negative Prompt:" in reasoned_prompt:
                    parts = reasoned_prompt.split("Negative Prompt:")
                    reasoned_prompt = f"{parts[0].rstrip()}{feedback_str}\n\nNegative Prompt:{parts[1]}"
                else:
                    reasoned_prompt += feedback_str

            return reasoned_prompt

        # ---  (Legacy V11.0 Templates) ---
        style_prompt = self.styles_config.get(style_profile, self.styles_config["3D_Premium"])
        # (Fallbacks continued...)
    def generate_image_from_api(self, prompt, output_path, mock=False, layout_mode="Cabinet", use_critic=True, aspect_ratio=None):
        """[V26.4] Delegate image generation to robust APIClient."""
        
        if self.stop_requested:
            print("[STOP] [ENGINE] Image generation cancelled by user stop signal.")
            return False
            
        from api_client import APIClient
        client = APIClient()
        return client.generate_image(prompt, output_path, mock=mock, layout_mode=layout_mode, aspect_ratio=aspect_ratio)
        print(f"Hi-Fi Mock saved: {output_path}")

    # [V26.4] Image processing logic moved to image_processor.py

    def run_fully_autonomous(self, requirement, psd_path=None, layout_mode="Cabinet", mock=False, style="3D_Premium", symbol_list=None, style_override=None, spacing_x=10, spacing_y=10, custom_layout=None, symbol_configs=None):
        print(f"\n[ENGINE] Starting Autonomous Run for: {requirement}")
        self.output_dir = os.path.join(self.output_root, f"{requirement}_{int(time.time())}")
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Initialize Image Processor
        from image_processor import ImageProcessor
        processor = ImageProcessor(self.output_dir)
        
        results = {}
        sanitized_theme = processor.sanitize_filename(requirement)
        
        # 1. Background
        bg_prompt = self.generate_component_prompts(requirement, "Background", style_profile=style, layout_mode=layout_mode, symbol_configs=symbol_configs)
        bg_path = os.path.join(self.output_dir, f"{sanitized_theme}_BG.png")
        self.generate_image_from_api(bg_prompt, bg_path, mock=mock, layout_mode=layout_mode)
        results["background"] = bg_path
        
        # 2. UI Components
        canvas_w, canvas_h = (720, 1280) if layout_mode == "H5_Mobile" else (1280, 720)
        for sub in ["UI_Header", "UI_Base", "UI_Pillar"]:
            p = self.generate_component_prompts(requirement, sub, layout_mode=layout_mode, symbol_configs=symbol_configs)
            path = os.path.join(self.output_dir, f"{sanitized_theme}_{sub}.png")
            
            # [V26.5] Native Resolution Calculation
            target_ar = None
            if sub == "UI_Header":
                target_ar = f"{canvas_w}x{int(canvas_h * 0.12)}"
            elif sub == "UI_Base":
                target_ar = f"{canvas_w}x{int(canvas_h * 0.15)}"
            
            self.generate_image_from_api(p, path, mock=mock, layout_mode=layout_mode, aspect_ratio=target_ar)
            results[sub.lower()] = processor.process_transparency(path)

        # 3. Symbols
        results["symbols"] = {}
        targets = symbol_list or ["SYM_1", "WILD", "SCATTER"]
        for s in targets:
            p = self.generate_component_prompts(requirement, "Symbol", subtype=s, layout_mode=layout_mode, symbol_configs=symbol_configs)
            path = os.path.join(self.output_dir, f"{sanitized_theme}_{s}.png")
            self.generate_image_from_api(p, path, mock=mock, layout_mode=layout_mode)
            results["symbols"][s] = processor.process_transparency(path)

        # 4. Preview
        # We need to pass the layout_config directly as it's required by the new composer
        # [V26.5] Support custom_layout from WebUI
        layout_config = self.get_grid_layout(1280, 720, layout_mode, custom_layout=custom_layout) if layout_mode != "H5_Mobile" else self.get_grid_layout(720, 1280, layout_mode, custom_layout=custom_layout)
        
        preview_path = processor.compose_preview_image(results, requirement, layout_config, layout_mode=layout_mode, symbol_configs=symbol_configs)
        print(f"[OK] Autonomous Run Finished. Preview: {preview_path}")
        
        return {
            "status": "success",
            "image": preview_path,
            "components": results,
            "prompt": bg_prompt,
            "jsx": "" # [TODO] Add JSX generation if needed
        }

    def run_workflow(self, interactive=True):
        theme = input("Theme: ") if interactive else self.theme
        self.run_fully_autonomous(theme, layout_mode="H5_Mobile", mock=False)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("theme", nargs="?", default="Professional Slot")
    parser.add_argument("--auto", action="store_true")
    parser.add_argument("--mock", action="store_true")
    parser.add_argument("--layout", default="Cabinet")
    args = parser.parse_args()

    creator = SlotAICreator(args.theme)
    if args.auto:
        creator.run_fully_autonomous(args.theme, layout_mode=args.layout, mock=args.mock)
    else:
        creator.run_workflow(interactive=True)
