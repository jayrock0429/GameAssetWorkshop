import os
import sys
from PIL import Image

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from slot_ai_creator import SlotAICreator
from image_processor import ImageProcessor

def create_color_img(w, h, color, path):
    img = Image.new("RGBA", (w, h), color)
    img.save(path)
    return path

def test():
    creator = SlotAICreator("test_layout")
    os.makedirs(creator.output_dir, exist_ok=True)
    processor = ImageProcessor(creator.output_dir)
    
    # Create dummy images
    bg = create_color_img(1280, 1280, (50, 50, 50, 255), os.path.join(creator.output_dir, "test_bg.png"))
    # Header intended to be very tall to test squashing
    header = create_color_img(1280, 500, (255, 0, 0, 255), os.path.join(creator.output_dir, "test_header.png"))
    # Base intended to be very tall
    base = create_color_img(1280, 500, (0, 0, 255, 255), os.path.join(creator.output_dir, "test_base.png"))
    pillar = create_color_img(100, 1000, (0, 255, 0, 255), os.path.join(creator.output_dir, "test_pillar.png"))
    sym = create_color_img(200, 200, (255, 255, 0, 255), os.path.join(creator.output_dir, "test_sym.png"))
    
    assets = {
        "background": bg,
        "ui_header": header,
        "ui_base": base,
        "ui_pillar": pillar,
        "symbols": {"sym1": sym}
    }
    
    # Test Cabinet
    print("Testing Cabinet Layout...")
    layout_cab = creator.get_grid_layout(1280, 720, "Cabinet")
    out_cab = processor.compose_preview_image(assets, "test_cabinet", layout_cab, "Cabinet")
    print(f"Cabinet saved to {out_cab}")
    
    # Test H5
    print("Testing H5_Mobile Layout...")
    layout_h5 = creator.get_grid_layout(720, 1280, "H5_Mobile")
    out_h5 = processor.compose_preview_image(assets, "test_h5", layout_h5, "H5_Mobile")
    print(f"H5 saved to {out_h5}")

if __name__ == "__main__":
    test()
