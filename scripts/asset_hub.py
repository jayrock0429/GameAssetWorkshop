import os
import time
import json
import shutil
import logging
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# 設定日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AssetHub")

class AssetHubHandler(FileSystemEventHandler):
    def __init__(self, config):
        self.update_config(config)
        # 建立執行緒池，預設 10 個平行作業
        self.executor = ThreadPoolExecutor(max_workers=10)
        # 用於防手震的處理中集合
        self.processing_files = set()
        self._lock = threading.Lock()
        
    def update_config(self, config):
        self.config = config
        self.target_dir = Path(config['target_dir'])
        self.watch_dirs = [Path(d) for d in config.get('watch_dirs', [])]
        self.strategy = config.get('conflict_strategy', 'smart_rename')
        self.extensions = [ext.lower() for ext in config.get('supported_extensions', ['.png', '.jpg', '.jpeg', '.webp'])]
        
        # 確保目標目錄存在
        self.target_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"--- 設定已更新 ---")
        logger.info(f"目標目錄: {self.target_dir}")
        logger.info(f"策略: {self.strategy}")
        logger.info(f"支援副檔名: {self.extensions}")

    def on_created(self, event):
        if not event.is_directory:
            self.process(event.src_path)

    def on_modified(self, event):
        if not event.is_directory:
            self.process(event.src_path)

    def process(self, src_path_str):
        src_path = Path(src_path_str)
        
        # 1. 關鍵防護：如果變更發生在「目標輸出目錄」內，絕對不要處理 (防止遞迴死循環)
        try:
            if src_path.resolve().is_relative_to(self.target_dir.resolve()):
                return
        except Exception:
            pass

        # 2. 快速過濾
        path_parts = [p.lower() for p in src_path.parts]
        if not any("-assets" in p for p in path_parts):
            return

        if src_path.suffix.lower() not in self.extensions:
            return

        # 2. 防手震 (避免同一個檔案重複觸發造成的效能損耗)
        with self._lock:
            if src_path_str in self.processing_files:
                return
            self.processing_files.add(src_path_str)

        # 3. 丟給執行緒池非同步處理，不阻塞監聽執行緒
        self.executor.submit(self.async_collect, src_path, src_path_str)

    def async_collect(self, src_path, src_path_str):
        try:
            # 智慧等待：不再固定等 1 秒，而是嘗試確認檔案是否寫入完成
            if self.wait_for_ready(src_path):
                self.collect_asset(src_path)
        except Exception as e:
            logger.error(f"非同步處理失敗 {src_path.name}: {e}")
        finally:
            with self._lock:
                # 0.5 秒後才允許再次處理同一個路徑（簡單防震）
                threading.Timer(0.5, lambda: self._clear_processing(src_path_str)).start()

    def _clear_processing(self, path_str):
        with self._lock:
            if path_str in self.processing_files:
                self.processing_files.remove(path_str)

    def wait_for_ready(self, path, timeout=3.0):
        """嘗試開啟檔案以確認 Photoshop 已經釋放鎖定"""
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                if not path.exists(): return False
                # 嘗試以追加模式打開，這通常能檢查檔案是否被其他程序鎖定
                with open(path, 'ab'):
                    return True
            except IOError:
                time.sleep(0.1) # 快速重試
        return False

    def collect_asset(self, src_path):
        if not src_path.exists():
            return

        # 1. 尋找路徑中的 -assets 節點，以此定義 PSD 名稱與內部相對路徑
        parts = src_path.parts
        assets_index = -1
        for i, part in enumerate(parts):
            if "-assets" in part.lower():
                assets_index = i
                break
        
        if assets_index == -1:
            return

        assets_dir_name = parts[assets_index]
        psd_name = assets_dir_name.rsplit("-assets", 1)[0]
        
        # 2. 獲取 -assets 內部的相對路徑 (例如 LangEN/Msg/icon.png)
        # 這裡我們取 assets_index 之後的零件，但不包括最後一個(檔名)
        internal_relative_parts = parts[assets_index+1 : -1]
        internal_sub_dir = Path(*internal_relative_parts) if internal_relative_parts else Path(".")
        
        # 3. 找出該 PSD 所在的專案路徑 (PSD Folder) 相對於監控目錄的相對路徑
        psd_folder = Path(*parts[:assets_index])
        project_relative_dir = Path(".")
        for watch_path in self.watch_dirs:
            try:
                if psd_folder.is_relative_to(watch_path):
                    project_relative_dir = psd_folder.relative_to(watch_path)
                    break
            except Exception:
                continue

        file_name = src_path.name
        if self.strategy == "smart_rename":
            new_name = f"{psd_name}_{file_name}"
        else:
            new_name = file_name

        # 4. 組合最終目標路徑：目標根目錄 + 專案空間 + 內部資料夾 + 檔名
        final_target_parent = self.target_dir / project_relative_dir / internal_sub_dir
        final_target_parent.mkdir(parents=True, exist_ok=True)
        dest_path = final_target_parent / new_name

        # 執行複製 (徹底破碎時間繼承)
        try:
            # 5. 安全檢查：確保不是要把檔案複製給自己 (雖然前面過濾了，但這是雙重保險)
            if src_path.resolve() == dest_path.resolve():
                logger.warning(f"跳過自我複製: {src_path}")
                return

            if dest_path.exists():
                dest_path.unlink()
            
            shutil.copy(src_path, dest_path)
            
            # 強制將修改時間更新為「現在」
            now = time.time()
            os.utime(dest_path, (now, now))
            
            mtime = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(dest_path.stat().st_mtime))
            
            # 6. 計算檔案 Hash 並更新 Manifest
            file_hash = self.calculate_hash(dest_path)
            # 使用 target_dir 底下的相對路徑作為 key
            relative_dest = str(dest_path.relative_to(self.target_dir)).replace("\\", "/")
            status = self.update_manifest(relative_dest, file_hash, dest_path.stat().st_mtime)
            
            status_tag = f"[{status.upper()}]"
            logger.info(f"採集成功 {status_tag}: {file_name} -> {project_relative_dir}/{internal_sub_dir}/{new_name} (時間: {mtime})")
        except Exception as e:
            logger.error(f"寫入失敗: {e}")

    def calculate_hash(self, path):
        import hashlib
        hasher = hashlib.md5()
        with open(path, 'rb') as f:
            buf = f.read(65536)
            while len(buf) > 0:
                hasher.update(buf)
                buf = f.read(65536)
        return hasher.hexdigest()

    def update_manifest(self, relative_path, file_hash, mtime):
        manifest_path = self.target_dir / "asset_manifest.json"
        
        with self._lock:
            # 讀取現有清單
            manifest = {}
            if manifest_path.exists():
                try:
                    with open(manifest_path, 'r', encoding='utf-8') as f:
                        manifest = json.load(f)
                except Exception:
                    pass
            
            # 判斷狀態
            status = "new"
            if relative_path in manifest:
                old_hash = manifest[relative_path].get("hash")
                if old_hash == file_hash:
                    status = "unchanged"
                else:
                    status = "updated"
            
            # 更新記錄
            manifest[relative_path] = {
                "hash": file_hash,
                "mtime": mtime,
                "status": status,
                "last_checked": time.time()
            }
            
            # 寫回檔案
            try:
                with open(manifest_path, 'w', encoding='utf-8') as f:
                    json.dump(manifest, f, indent=2, ensure_ascii=False)
            except Exception as e:
                logger.error(f"寫入 asset_manifest.json 失敗: {e}")
                
            return status

def load_config(path):
    try:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.error(f"讀取設定檔失敗: {e}")
    return None

def main():
    config_path = Path("d:/AG/GameAssetWorkshop/asset_hub_config.json")
    config = load_config(config_path)
    if not config:
        logger.error("無法啟動：找不到或無法讀取 asset_hub_config.json")
        return

    handler = AssetHubHandler(config)
    
    def start_observer(conf):
        obs = Observer()
        for watch_path in conf['watch_dirs']:
            p = Path(watch_path)
            if p.exists():
                obs.schedule(handler, str(p), recursive=True)
                logger.info(f"正在監控目錄: {p}")
            else:
                logger.warning(f"路徑不存在，跳過監控: {p}")
        obs.start()
        return obs

    observer = start_observer(config)
    last_mtime = config_path.stat().st_mtime

    logger.info("Asset Hub 已啟動，按 Ctrl+C 停止。")
    
    try:
        while True:
            time.sleep(2)
            # 設定檔 Hot-Reload
            try:
                current_mtime = config_path.stat().st_mtime
                if current_mtime > last_mtime:
                    logger.info("偵測到設定檔變更，正在重新載入...")
                    new_config = load_config(config_path)
                    if new_config:
                        handler.update_config(new_config)
                        # 如果監控路徑變了，重啟 observer
                        if new_config.get('watch_dirs') != config.get('watch_dirs'):
                            logger.info("監控目錄已變更，正在重啟監控服務...")
                            observer.stop()
                            observer.join()
                            observer = start_observer(new_config)
                        config = new_config
                        last_mtime = current_mtime
            except Exception as e:
                logger.error(f"Hot-Reload 過程中發生錯誤: {e}")
                    
    except KeyboardInterrupt:
        logger.info("正在停止 Asset Hub...")
        observer.stop()
    
    observer.join()

if __name__ == "__main__":
    main()
