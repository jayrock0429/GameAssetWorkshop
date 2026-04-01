"""
Slot UI Art Skill - Professional Prompt Engineering Database
Contains specialized visual patterns and keywords for high-end Slot Game UI/UX.
Refined from professional designs (Pinterest Research).
"""

# Visual Styles Library
STYLE_PROFILES = {
    "Luxury_Gold": {
        "keywords": "luxury casino aesthetic, beveled gold frames, polished brass textures, royal burgundy fabric, high-gloss finish, ornate detailing",
        "lighting": "rim lighting, volumetric heavy shadows, high-end studio lighting",
        "colors": ["Gold", "Silver", "Deep Purple", "Royal Blue", "Burgundy"]
    },
    "Cyber_Neon": {
        "keywords": "cyberpunk 2077 style, neon-drenched, electric cyan and magenta, translucent glass panels, circuit board patterns, high-tech interface",
        "lighting": "emissive glow, neon flares, bloom effects, laser lines",
        "colors": ["Neon Blue", "Magenta", "Electric Green", "Pitch Black"]
    },
    "Oriental_Myth": {
        "keywords": "ancient chinese temple style, carved jade accents, red silk textures, traditional golden clouds, zen atmosphere, intricate wood carving",
        "lighting": "warm sunset lighting, lanterns glow, soft fog",
        "colors": ["Red", "Gold", "Jade Green", "Ink Black"]
    },
    "Fantasy_Crystal": {
        "keywords": "magical crystal world, floating elements, ethereal glow, translucent amethyst, mystical runic carvings, enchanted forest vibe",
        "lighting": "bioluminescent glow, soft starlight, magical particles",
        "colors": ["Teal", "Violet", "White Gold", "Emerald"]
    }
}

# Component Specific Modifiers
COMPONENT_MODIFIERS = {
    "Background": "high-detail environmental background, cinematic wide shot, depth of field, blurred background to emphasize UI",
    "UI_Header": "ornate top banner, metallic nameplate, centered jackpot display, high-reflectivity bevels",
    "UI_Base": "heavy control panel base, tactile buttons, glossy surface, industrial or luxury trim",
    "UI_Pillar": "vertical decorative columns, framing the reels, integrated multiplier meters, matching theme architecture",
    "Symbol": "3d rendered icon, pop-out effect, thick rim lighting, hyper-detailed texture, floating off the background",
    "Button": "high-contrast call to action button, glowing circular shape, convex glass surface, metallic rim"
}

# Quality Booster
QUALITY_HINTS = "game ui design, slot machine interface, 8k resolution, high fidelity, unreal engine 5 render style, professional mobile game assets, masterpiece"

def get_enhanced_prompt(requirement, component_type, style_profile="Luxury_Gold"):
    """
    Constructs a professional art prompt based on theme, component and style.
    """
    profile = STYLE_PROFILES.get(style_profile, STYLE_PROFILES["Luxury_Gold"])
    modifier = COMPONENT_MODIFIERS.get(component_type, "")
    
    parts = [
        f"A professional {component_type} for a slot game themed '{requirement}'",
        modifier,
        profile["keywords"],
        profile["lighting"],
        QUALITY_HINTS
    ]
    
    return ", ".join([p for p in parts if p])
