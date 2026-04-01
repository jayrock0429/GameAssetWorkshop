import os
import argparse
from rembg import remove
from PIL import Image
import io

def process_directory(input_dir, output_dir):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    supported_extensions = {'.png', '.jpg', '.jpeg', '.webp'}
    
    print(f"Starting background removal from {input_dir}...")

    # Traverse directory
    processed_count = 0
    for root, dirs, files in os.walk(input_dir):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in supported_extensions:
                input_path = os.path.join(root, file)
                
                # Create corresponding output filename
                # Flatten structure or keep? Let's keep flat for slot assets usually
                output_filename = os.path.splitext(file)[0] + "_trans.png"
                output_path = os.path.join(output_dir, output_filename)
                
                print(f"Processing: {file}...")
                
                try:
                    with open(input_path, 'rb') as i:
                        input_data = i.read()
                        output_data = remove(input_data)
                        
                    with open(output_path, 'wb') as o:
                        o.write(output_data)
                    
                    processed_count += 1
                except Exception as e:
                    print(f"Error processing {file}: {e}")

    print(f"Done! Processed {processed_count} images. Output saved to {output_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Batch remove background from images")
    parser.add_argument("--input", required=True, help="Input directory containing raw images")
    parser.add_argument("--output", required=True, help="Output directory for transparent images")
    
    args = parser.parse_args()
    
    process_directory(args.input, args.output)
