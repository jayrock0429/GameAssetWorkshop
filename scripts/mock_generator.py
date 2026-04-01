from PIL import Image, ImageDraw
import os

def generate_chinese_festive_mock(output_path):
    width, height = 1280, 720
    img = Image.new('RGBA', (width, height), (139, 0, 0, 255))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, 1280, 200], fill=(100, 0, 0, 255))
    for i in range(4):
        x = 100 + i * 300
        draw.rectangle([x, 20, x + 250, 80], outline=(255, 215, 0, 255), width=4)
    draw.rectangle([200, 120, 1080, 600], outline=(255, 215, 0, 255), width=8)
    for row in range(3):
        for col in range(5):
            x = 250 + col * 170
            y = 150 + row * 150
            draw.ellipse([x, y, x + 100, y + 100], fill=(255, 215, 0, 255), outline=(184, 134, 11, 255))
            draw.ellipse([x + 35, y + 35, x + 65, y + 65], fill=(139, 0, 0, 255))
    draw.rectangle([50, 620, 1230, 700], fill=(80, 0, 0, 255), outline=(255, 215, 0, 255), width=2)
    draw.ellipse([1100, 520, 1250, 670], fill=(255, 0, 0, 255), outline=(255, 215, 0, 255), width=5)
    img.save(output_path)
    print(f"Chinese Festive Slot mock image saved to {output_path}")

def generate_boxing_mock(output_path):
    width, height = 1280, 720
    img = Image.new('RGBA', (width, height), (20, 20, 30, 255))
    draw = ImageDraw.Draw(img)
    for y in range(height):
        r = 30 + int(40 * y / height)
        draw.line([0, y, width, y], fill=(r, 20, 50, 255))
    draw.rectangle([100, 20, 300, 60], outline=(255, 215, 0, 255), width=3)
    draw.rectangle([350, 20, 550, 60], outline=(200, 200, 200, 255), width=3)
    draw.rectangle([600, 20, 800, 60], outline=(205, 127, 50, 255), width=3)
    draw.rectangle([250, 100, 1030, 600], outline=(255, 0, 0, 255), width=10)
    for i in range(5):
        for j in range(3):
            x = 350 + i * 130
            y = 150 + j * 150
            draw.ellipse([x, y, x+80, y+80], fill=(200, 0, 0, 255))
            draw.rectangle([x+10, y+30, x+70, y+50], fill=(255, 215, 0, 255))
    draw.ellipse([1100, 500, 1250, 650], fill=(0, 200, 255, 255))
    draw.rectangle([50, 500, 200, 550], fill=(200, 0, 255, 255))
    img.save(output_path)
    print(f"Boxing Hero mock image saved to {output_path}")

if __name__ == "__main__":
    out = r"d:\AG\GameAssetWorkshop\output\test_mock.png"
    generate_chinese_festive_mock(out)
