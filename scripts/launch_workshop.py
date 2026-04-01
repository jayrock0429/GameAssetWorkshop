import os
import sys
import subprocess
import time

def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def print_header():
    print("==================================================")
    print("       Game Asset Workshop - 遊戲資產工作坊")
    print("==================================================")
    print("")

def check_dependencies():
    missing = []
    try:
        import cv2
    except ImportError:
        missing.append("opencv-python")
    try:
        import rembg
    except ImportError:
        missing.append("rembg")
    try:
        from psd_tools import PSDImage
    except ImportError:
        missing.append("psd-tools")
        
    if missing:
        print("警告: 偵測到缺少以下依賴套件:")
        for pkg in missing:
            print(f" - {pkg}")
        print("\n有些功能可能無法正常運作。")
        print("建議執行: pip install opencv-python rembg Pillow")
        input("\n按 Enter 鍵繼續...")

def main_menu():
    while True:
        clear_screen()
        print_header()
        print("請選擇功能:")
        print("0. Slot AI Creator (自主生成模式)")
        print("   - 根據需求自動生成 Slot 概念、拆解並合成資產")
        print("1. 智能切片工具 (Smart Slicer)")
        print("   - 自動移除背景並拆解圖片元件")
        print("2. 批量後處理 (Batch Post Process)")
        print("   - 批量優化與去背處理")
        print("3. 場景合成 (Scene Assembler)")
        print("   - 將元件組合成 16:9 展示圖")
        print("4. 查看資源目錄 (Open Resources)")
        print("   - 開啟檔案總管查看輸出結果")
        print("5. 退出 (Exit)")
        print("")
        
        choice = input("請輸入選項 (1-5): ").strip()
        
        if choice == '0':
            run_slot_ai_creator()
        elif choice == '1':
            run_smart_slicer()
        elif choice == '2':
            run_batch_process()
        elif choice == '3':
            run_scene_assembler()
        elif choice == '4':
            open_resources()
        elif choice == '5':
            print("\n感謝使用，再見！")
            break
        else:
            print("\n無效的選項，請重新輸入。")
            time.sleep(1)

def run_smart_slicer():
    clear_screen()
    print_header()
    print("--- 智能切片工具 ---")
    image_path = input("請輸入原始圖片路徑 (或是拖曳檔案到此視窗): ").strip()
    
    # Remove quotes if user dragged file
    image_path = image_path.replace('"', '')
    
    if not image_path:
        return
        
    if not os.path.exists(image_path):
        print(f"\n錯誤: 找不到檔案 '{image_path}'")
        input("按 Enter 鍵返回主選單...")
        return

    script_path = os.path.join(os.path.dirname(__file__), 'smart_slicer.py')
    print(f"\n正在啟動處理程序...\n")
    
    try:
        subprocess.run([sys.executable, script_path, image_path], check=True)
        print("\n處理完成！")
    except subprocess.CalledProcessError as e:
        print(f"\n發生錯誤: {e}")
    except Exception as e:
        print(f"\n發生未預期的錯誤: {e}")
        
    input("\n按 Enter 鍵返回主選單...")

def run_batch_process():
    clear_screen()
    print_header()
    print("--- 批量後處理 ---")
    print("此功能將處理資料夾中的所有圖片。")
    target_dir = input("請輸入目標資料夾路徑 (留空則使用預設): ").strip()
    target_dir = target_dir.replace('"', '')
    
    script_path = os.path.join(os.path.dirname(__file__), 'batch_post_process.py')
    
    cmd = [sys.executable, script_path]
    if target_dir:
        cmd.append(target_dir)
        
    try:
        subprocess.run(cmd, check=True)
        print("\n批量處理完成！")
    except Exception as e:
        print(f"\n發生錯誤: {e}")
        
    input("\n按 Enter 鍵返回主選單...")

def run_scene_assembler():
    clear_screen()
    print_header()
    print("--- 場景合成 ---")
    print("正在合成最終場景...")
    
    script_path = os.path.join(os.path.dirname(__file__), 'assemble_scene.py')
    
    try:
        subprocess.run([sys.executable, script_path], check=True)
        print("\n合成完成！")
    except Exception as e:
        print(f"\n發生錯誤: {e}")
        
    input("\n按 Enter 鍵返回主選單...")

def open_resources():
    # Try to find the output directory properly
    base_dir = os.path.dirname(os.path.dirname(__file__)) # Go up one level from scripts
    # Check for common output folders
    possible_paths = [
        r"d:\image", 
        os.path.join(base_dir, "output"),
        base_dir
    ]
    
    found = False
    for p in possible_paths:
        if os.path.exists(p):
            os.startfile(p)
            print(f"\n已開啟: {p}")
            found = True
            # Don't break immediately if we want to show specific ones, but for now just opening the most likely root is fine
            # Actually d:\image seems to be hardcoded in the other scripts, so prioritized that.
            break
            
    if not found:
        print("\n找不到預設的輸出目錄。")
    
    input("\n按 Enter 鍵返回主選單...")

def run_slot_ai_creator():
    clear_screen()
    print_header()
    print("--- Slot AI Creator (自主生成模式) ---")
    print("這將引導您從需求描述出發，自動生成 Slot 遊戲資產。")
    
    theme = input("\n請輸入 Slot 遊戲主題 (例如: 古埃及、賽博龐克): ").strip()
    if not theme:
        return
        
    script_path = os.path.join(os.path.dirname(__file__), 'slot_ai_creator.py')
    print(f"\n正在分析需求並生成工作流...\n")
    
    try:
        # 執行 AI Creator 並傳入主題
        subprocess.run([sys.executable, script_path, theme], check=True)
        print("\nAI 工作流已啟動！請在下方查看進展。")
    except Exception as e:
        print(f"\n發生錯誤: {e}")
        
    input("\n按 Enter 鍵返回主選單...")

if __name__ == "__main__":
    check_dependencies()
    main_menu()
