import uuid
import time
import queue
import threading
import traceback
from datetime import datetime

class TaskState:
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"

class AgentQueueManager:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AgentQueueManager, cls).__new__(cls)
            cls._instance.initialize()
        return cls._instance

    def initialize(self):
        self.task_queue = queue.Queue()
        self.task_registry = {}  # { task_id: { status, logs, result, created_at, ... } }
        self._lock = threading.Lock()
        
        # 啟動背景 Worker
        self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
        self.worker_thread.start()
        print("DEBUG: [AgentQueueManager] Background Worker initialized.")

    def submit_task(self, req_data, runner_func):
        """
        將任務推進佇列
        runner_func 必須是 (req_data, task_id, update_callback) -> result 的函數
        """
        task_id = str(uuid.uuid4())
        
        with self._lock:
            self.task_registry[task_id] = {
                "id": task_id,
                "status": TaskState.PENDING,
                "progress": "Waiting in queue...",
                "logs": [],
                "result": None,
                "error": None,
                "created_at": datetime.now().isoformat()
            }
            
        self.task_queue.put((task_id, req_data, runner_func))
        self._log(task_id, "Task submitted to queue.")
        return task_id

    def get_task_status(self, task_id):
        with self._lock:
            return self.task_registry.get(task_id)

    def _update_task(self, task_id, status=None, progress=None, result=None, error=None):
        with self._lock:
            if task_id not in self.task_registry:
                return
            
            task = self.task_registry[task_id]
            if status: task["status"] = status
            if progress: task["progress"] = progress
            if result: task["result"] = result
            if error: task["error"] = error

    def _log(self, task_id, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        
        # 同步輸出到終端機
        print(f"[{task_id[:8]}] {log_entry}")
        
        with self._lock:
            if task_id in self.task_registry:
                self.task_registry[task_id]["logs"].append(log_entry)

    def _worker_loop(self):
        """背景迴圈：不斷掏空佇列並執行任務"""
        while True:
            try:
                task_id, req_data, runner_func = self.task_queue.get()
                
                self._update_task(task_id, status=TaskState.RUNNING, progress="Task started")
                self._log(task_id, "Worker picked up task.")
                
                # Callback: 讓核心引擎在運作中能回報進度
                def task_update_callback(progress_msg, new_logs=None):
                    self._update_task(task_id, progress=progress_msg)
                    if new_logs:
                        self._log(task_id, new_logs)

                # 執行真正耗時的處理邏輯
                try:
                    result = runner_func(req_data, task_id, task_update_callback)
                    self._update_task(task_id, status=TaskState.COMPLETED, progress="Completed successfully", result=result)
                    self._log(task_id, "Task completed successfully.")
                except Exception as e:
                    import traceback
                    err_msg = str(e)
                    self._update_task(task_id, status=TaskState.FAILED, progress="Failed", error=err_msg)
                    self._log(task_id, f"ERROR: {err_msg}\n{traceback.format_exc()}")
                    
            except Exception as e:
                print(f"CRITICAL ERROR IN WORKER LOOP: {e}")
            finally:
                self.task_queue.task_done()

# Global Singleton instance
queue_manager = AgentQueueManager()
