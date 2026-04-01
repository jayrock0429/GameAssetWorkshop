import os
path = r'C:\Antigracity\GameAssetWorkshop\scripts\slot_ai_creator.py'
out_path = r'C:\Antigracity\GameAssetWorkshop\scripts\slot_ai_creator_clean.py'

with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# We only want the first 2566 lines (the clean part we saw in view_file)
clean_lines = lines[:2566]

with open(out_path, 'w', encoding='utf-8') as f:
    f.writelines(clean_lines)

print(f"Wrote clean file with {len(clean_lines)} lines")
