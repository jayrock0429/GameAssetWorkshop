import os
path = r'C:\Antigracity\GameAssetWorkshop\scripts\slot_ai_creator.py'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# Filter out null characters and any lines after the last expected line
clean_lines = []
for line in lines:
    clean_line = line.replace('\x00', '').strip('\x00')
    if clean_line.strip():
        clean_lines.append(clean_line + '\n')
    else:
        clean_lines.append('\n')

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(clean_lines)
print("Sanitized slot_ai_creator.py")
