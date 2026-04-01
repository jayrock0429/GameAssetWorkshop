name: GameAssetWorkshop
description: 自動化生成與拆解 Slot 遊戲美術資源，並整合 3D PBR 與 LoL Splash Art 風格規範。
instructions: |
  這是一個全方位的遊戲美術製作技能，結合了 Slot 元件自動化與高品質 3D/Splash Art 生成規範。
  

  ## 快速啟動 (Quick Start):
  執行 `scripts/launch_workshop.py` 即可開啟繁體中文互動式選單，協助您完成所有步驟。
  
  ## 核心工作流：
  1. **概念生成 (Concept)**: 生成 16:9 的整體遊戲畫面（背景+盤面+符號+UI）。使用 Mode B 或 Mode H 規範進行視覺強化。
  2. **智能拆解 (Decomposition)**: 使用 `smart_slicer.py` 將概念圖自動裁剪為獨立元件。
  3. **高品質資產生成 (3D/Splash Refinement)**: 
     - 使用 **Mode A** 生成 3D PBR 質感的物件（如 3D 符號）。
     - 使用 **Mode D** 為角色資產生成高品質的動態立繪 (Splash Art)。
     - 使用 **Mode C** 製作角色或物件的三視圖供建模參考。
  4. **自動後處理 (Post-processing)**: 批量去背與優化（`batch_post_process.py`）。
  5. **場景合成 (Assembly)**: 將所有元件合成為最終的 16:9 展示圖（`assemble_scene.py`）。

  ## 視覺模式與指令參考 (詳見資源目錄中的 3d_game_asset_guide.md)：
  - **Mode A (3D Asset)**: PBR 質感、View Synthesis 旋轉。
  - **Mode B (Splash Art)**: 動態、戲劇化光影 (LoL 風格)。
  - **Mode C (Concept Sheet)**: 人設三視圖 (T-Pose)。
  - **Mode D (Action Pose)**: 動作演繹、Face Lock 技術。
  - **Mode E (Colorization)**: 線稿精確上色。

  ## 目錄結構：
  - `scripts/`: `smart_slicer.py`, `batch_post_process.py`, `assemble_scene.py`。
  - `resources/`: 
    - `3d_game_asset_guide.md`: 完整的 3D/Splash Art 指令模板。
    - `assets.json`: 資產配置定義。
