# 學習日誌 (Lessons)

- 在此記錄每次的錯誤修正與優化經驗，以持續提升系統穩定度與效率。
- Antigravity 對工作區的父層 Git context 很敏感。若專案掛在大型 monorepo 之下，可能因掃描父層 `.git` / worktree / artifactReview 狀態導致 agent 無回應；實務上應優先將專案拆成獨立 workspace / repo。
- 初始 commit 前要先做 `.gitignore` 衛生檢查。資料庫、WAL/SHM、壓測產物、預覽圖與臨時壓縮包若先被 commit，再補 ignore 只會增加後續清理成本。
