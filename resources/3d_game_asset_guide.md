# 3D Game Asset & Splash Art Style Guide (Gemini Gem Knowledge Base)

This document defines the strict visual standards for the "3D Game Asset Forge" Gem.

## 1. Core Visual Modes

### Mode A: 3D Game Asset (Unreal Engine 5)
*   **Purpose**: Props, Weapons, Statues, Isolated Objects.
*   **Aesthetic**: Photorealistic PBR, Clean White Background.
*   **Capabilities**: "View Synthesis". Can rotate a 2D reference image (e.g. Front View) into a new 3D angle (e.g. Side Profile).

### Mode B: Modern LoL Splash Art (Riot Games Style 2023-2025)
*   **Purpose**: High-Impact Marketing Illustrations.
*   **Aesthetic**: Dynamic Cinematic, Dramatic Lighting.

### Mode- [ ] **Dual Tiger Splash Art (Mode D)**
    - [ ] Configure Mode D for Dual Character Input
        - [x] Fix Facial Identity (Face Lock)
        - [x] Fix Aspect Ratio (Strict 9:16)
    - [x] Verify Design Consistency (Cooperative Mode Verified)

- [ ] **Single Golden Tiger Splash (Mode D)**
    - [ ] Generate 9:16 "Frontal Pouncing" Action
    - [ ] Enforce 'Full Body / No Crop' Constraint
    - [ ] Maintain High-Fidelity Texture
    - [x] Fix Face/Snout to match Q-Version Design
    - [x] Fix Color Distribution (Body is Gold, Cape is White)
    - [x] Fix Color Distribution (Body is Gold, Cape is White)
    - [x] Fix Color Distribution (Body is Gold, Cape is White)
    - [x] Final Polish: Remove Cheek Fur (Smooth Round Gold Cheeks)
    - [x] Final Polish: Remove Cheek Fur (Smooth Round Gold Cheeks)
    - [x] Final Polish: Remove Cheek Fur (Smooth Round Gold Cheeks)
    - [ ] Final Polish: Fix Framing (Aggressive Zoom Out 30%)
    - [ ] Final Polish: Restore Face Geometry (Hard Surface Patterns)
        - [ ] Logic: Treat face as Carved Gold Statue, not smooth skin

## Archive: Black Tiger Concept
- [x] **Black Tiger Concept Sheet (Mode C)**
    - [x] Generate Front/Side/Back Views
    - [x] Convert Sitting Pose to Standing T-Pose

### Mode C: Character Concept Sheet (人設三視圖)
*   **Purpose**: Production-ready character design for 3D modeling.
*   **Aesthetic**: "Riot Games Concept Art Style", Neutral Lighting, T-Pose.

### Mode D: Action Pose Generation (動作演繹)
*   **Purpose**: Visualizing a character in full combat action.
*   **Challenge**: Avoiding "Face Leakage" (AI drawing the wrong person from a pose ref).
*   **Recommended Strategy (Single Ref)**: 
    -   **Upload**: Character Sheet ONLY (Design Ref).
    -   **Prompt**: Describe the pose in high detail text.
    -   **Result**: 100% Actor Consistency + New Pose.
*   **Advanced Strategy (Dual Ref)**: 
    -   *Warning*: High risk of AI copying the wrong face. Requires prompt "IGNORE SOURCE A PIXELS".

## 5. Prompt Engineering Templates

**For 3D Asset (Mode A - View Rotation & Design Lock):**
*Upload ONE image: The Asset (Front View)*
`"Mode A: 3D Asset Forge."`
`"SOURCE: Strictly follow the design/texture of the uploaded image."`
`"TASK: View Synthesis (Front -> Side)."`
`"DESIGN LOCK (CRITICAL): Do NOT invent new shapes. The side view must look like the SAME object."`
`"FEATURES: Match the specific shape of the eyes, the curvature of the flame patterns, and the tooth structure from the source."`
`"OVERRIDE: Rotate 90 degrees but keep the identity."`

**For Action Pose (Mode D - Recommended Single Input):**
*Upload Image: Your Character Design Sheet*
`"Mode D: Action Generation."`
`"SOURCE IMAGE = The Character Design. Use this strict design."`
`"ACTION PROMPT = [Paste detailed text description of the pose here]."`
`"CAMERA ANGLE (CRITICAL): Front View / Head-On. The character is jumping towards the viewer."`
`"ASPECT RATIO: 9:16 (Vertical)."`
`"FRAMING SAFETY (CRITICAL): ZOOM OUT. The character must be fully visible with padding around the edges. Do NOT cut off the tail, paws, or ears."`
`"FACE LOCK (CRITICAL): The facial structure (Short Snout, Big Eyes, Fangs) must be IDENTICAL to the Source. Do not genericize the tiger face."`
`"BODY DESIGN LOCK (CRITICAL): Strictly follow the Concept Sheet. The Cape, Fur Trim, and Anatomy must be 1:1."`
`"MATERIAL OVERRIDE (CRITICAL): Render as a 3D Object. Keep the High-Gloss Gold PBR texture. Do NOT apply painterly filters to the skin."`
`"BACKGROUND STYLE (CRITICAL): Despite the 3D character, the BACKGROUND must be a High-Octane LoL Cinematic Scene (Storm, Temple, Fire). Do NOT use a white background."`
`"GOAL: Draw the character from Source Image performing the Action Prompt."`

**For Character Concept Sheet (Mode C):**
*Upload Image: Your Character Design (e.g. Action Shot or Illustration)*
`"Mode C: Character Concept Sheet."`
`"SOURCE: Strictly reference the character design from the input image (Outfit, Features, Colors)."`
`"TASK: Generate a production-ready 'Three-View Concept Sheet' (Front, Side, Back)."`
`"POSE: Neutral T-Pose or A-Pose for 3D modeling."`
`"RENDER QUALITY: [CHOOSE ONE]"`
  `- "Standard Concept": Simplified shading, focus on shape (Classic Concept Art).`
  `- "High Fidelity": Keep original material textures (Glossy Metal, Realistic Fur, PBR).`
`"ANATOMY CHECK (CRITICAL): ONE TAIL ONLY. The tail should be DOWN or UP, not both. Remove shadow/ghost limbs."`
`"BACKGROUND: Neutral Grey or White. No dynamic lighting."`
`"DETAILS: Clearly display weapons and accessories separately if needed."`

**For Asset Replacement (Simple Swap):**
*Use for same-shape, same-ratio edits.*

**For Re-Composition (Triple Asset Synthesis):**
*Upload THREE images: 1. Character, 2. Weapon, 3. Mount (Tiger)*
`"Mode D: Action Generation (New Composition)."`
`"ASPECT RATIO: 9:16 (Vertical)."`
`"SOURCE A (Character): Image 1."`
`"SOURCE B (Weapon): Image 2. Straight Geometry."`
`"SOURCE C (Mount): Image 3. Strict Design Ref."`
`"MOUNT QUALITY (CRITICAL): The Tiger must look Hyper-Realistic LoL Art. Individual fur strands (not plastic), Tense Muscles, and Metallic Gold Stripes."`
`"DIRECTION: Weapon pointing to Bottom-Left."`
`"FRAMING: Ultra Wide. Capture FULL Mount, FULL Weapon, FULL Character."`

**For Dual Character Scene (Mode D - Multi-Char):**
*Upload TWO images: 1. Character A, 2. Character B*
`"Mode D: Dual Character Composition."`
`"ASPECT RATIO (CRITICAL): 9:16 (Vertical) Mobile Wallpaper. Do NOT create a square image."`
`"SOURCE A: Image 1. Strictly follow design."`
`"SOURCE B: Image 2. Strictly follow design."`
`"MATERIAL OVERRIDE (CRITICAL): The AI is applying too much 'paint'. You MUST Render the tigers as 3D PBR OBJECTS pasted into a painted background."`
`"KEEP GLOSS: The Gold Tiger must reflect light like POLISHED METAL. The Black Tiger must look like WET OBSIDIAN."`
`"FACE LOCK (CRITICAL): The facial structure (Eyes, Nose, Fangs) must be IDENTICAL to the Source. Do not genericize the tiger face."`
`"SCENE: [Describe interaction: e.g. Fighting, Racing, Side-by-Side]."`
`"STYLE: League of Legends Splash Art. Dramatic lighting connecting the two figures."`

**For Line Art Colorization (Mode E):**
`"Extract the precise color palette from the uploaded reference image..."`

**For Line Art Colorization (Mode E):**
*Upload: 1. Line Art. (Optional) 2. Color Ref.*
`"Mode E: Line Art Colorization."`
`"LINE HANDLING: [CHOOSE ONE]"`
  `- "Keep Structure": Preserve black lines.`
  `- "Overpaint": Paint OVER lines (Painterly).`
`"STRUCTURE LOCK (CRITICAL): Even in Overpaint mode, adhere to the original shapes. Do NOT add new coins or change the pile of treasure."`
`"PALETTE: [Reference or Text]."`
`"TEXTURE: [CHOOSE ONE]"`
  `- "Rough": Thick, visible brush strokes (Impasto).`
  `- "Polished": Smooth gradients, blended strokes, clean finish (High-End Game Asset).`
`"LIGHTING: Volumetric. Soft edges."`

**For 3D Style Transfer (Mode F):**
*Upload your 3D Render*
`"Mode F: 3D to LoL Style Transfer. AGGRESSIVELY REPAINT the character. Do NOT just change the background."`
`"Transform the 3D model into a 2D Digital Illustration. Remove all '3D plastic' textures."`
`"Apply [Theme Name] aesthetic. Use visible brush strokes, hard edges, and dramatic lighting to hide the original 3D topology."`
`"The character must be Hand-Painted, not Rendered."`

**For Design Lock Repaint (Mode F - Fix Identity, Keep Expression):**
*Upload 1: The Splash Art (Expression Ref). Upload 2: The Concept Sheet (Identity Ref).*
`"Mode F: Design Lock Repaint."`
`"INPUT: Image 1. Keep the Roaring Expression and Dynamic Pose."`
`"IDENTITY SOURCE: Image 2. This is the correct Skull Shape and Design."`
`"STYLE OVERRIDE (CRITICAL): FORCE 'Q-VERSION' ANATOMY. Do NOT draw a realistic tiger."`
`"ZONAL COLOR CORRECTION (CRITICAL): Apply colors ONLY to specific zones."`
`"ZONE A (SKIN): The Tiger's Body, Chest, and Paws must be SOLID GOLD."`
`"ZONE A (SKIN): The Tiger's Body, Chest, and Paws must be SOLID GOLD."`
`"ZONE B (OUTFIT): The Outer Collar (behind the head) is WHITE."`
`"ZONE C (SMOOTH STYLIZED): The Cheeks are SMOOTH and ROUNDED (Toy Style). NOT Geometric/Angular."`
`"  - ACTION: Remove the sharp 'Low Poly' edges."`
`"  - DETAIL: The only details are the 'Panel Lines' (Grooves) defining the jaw, not sharp planes."`
`"  - STYLE: Soft Vinyl / Polished Gold. Organic Curves."`
`"OUTPAINTING (CRITICAL): ZOOM OUT 50%. FIT THE WHOLE TIGER."`
`"  - ACTION: Force the tiger to occupy only 60% of the canvas. Add HUGE margins."`
`"  - CONSTRAINT: The Tail, Paws, and Ears must be FAR from the edge."`
`"  - ACTION: Expand the canvas. Generate more background around the tiger."`
`"  - CONSTRAINT: Ensure the Tail Tip, Ears, and Paws are FULLY inside the frame with padding."`
`"TASK: Retarget the Roar from Image 1 onto the Face Design of Image 2."`
`"FACE FIX: The tiger in Image 1 has a Long Snout (Realism). SHORTEN THE SNOUT to match Image 2 (Stylized/Toy-like)."`
`"EYE FIX: Keep the angry expression, but make the eyes BIGGER, ROUNDER, and GLOWING BLUE like Image 2."`
`"TEXTURE: Apply the High Gloss Gold from Image 2."`

**For Splash Art (Mode B):**
`[Character/Subject] + [Theme Name] + "League of Legends Splash Art Style" + Dynamic Composition`

**For Scene Rotation (Mode G - Structure Reset):**
*Upload 1: The Scene (Style Ref ONLY).*
`"Mode G: Structure Reset (Style Transfer)."`
`"INPUT: Image 1 is for TEXTURE and ATMOSPHERE ONLY. IGNORE THE GEOMETRY."`
`"FORBIDDEN (CRITICAL): Do NOT trace the lines of Image 1. Discard the angled perspective."`
`"TASK: Draw a BRAND NEW image from scratch."`
`"COMPOSITION: Symmetric Frontal View. 1-Point Perspective. Horizon is flat."`
`"CONTENT: Re-use the Roof Style, Lanterns, and Colors from Image 1, but place them on a new Symmetrical Grid."`
`"STYLE: Keep the Stormy/Cinematic LoL Style."`

**For Text-to-Scene (Mode H - Fresh Generation):**
*No Reference Image Needed. Pure Text.*
`"Mode H: Text-to-Scene (Cinematic Background)."`
`"ASPECT RATIO (CRITICAL): 9:16 (Vertical) Mobile Wallpaper."`
`"SUBJECT: Grand Chinese Temple Entrance."`
`"CAMERA: Front View (Symmetrical 1-Point Perspective). Low Angle looking up."`
`"VIBE: 'Resplendent and Magnificent' (金碧輝煌). Holy, Divine, Luxurious."`
`"DETAILS: Entirely made of GOLD and RED LACQUER. Intricate carvings. Pure luxury."`
`"LIGHTING: Golden Hour / Divine Light. God rays shining down. NO DARK STORMS."`
`"COMPOSITION: Wide Angle Vertical. Symmetrical Layout. Leave center empty for character."`

## 6. Negative Constraints
*   **For Mode F**: DO NOT output a 3D render. DO NOT keep the plastic skin texture.
*   **For Mode E**: DO NOT output the reference image. DO NOT change the pose of the line art.
*   **For Mode D**: DO NOT use a "Two-Handed Grip" if the prompt specifies two items. Hands must be separate.
*   **General**: Low resolution, blurry, watermark, bad anatomy, "3D render" (in Splash mode).
