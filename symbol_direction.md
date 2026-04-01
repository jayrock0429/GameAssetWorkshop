# 美術規範：Slot Game Symbols (圖示設計指南)

## 1. 風格定義 (Style Definition)

參考來源：Pinterest Slot Symbols
目標風格：**Stylized Realism (風格化寫實)** 與 **2.5D Game Art**。
圖示必須看起來「像糖果一樣誘人」且「像寶石一樣貴重」。

## 2. 視覺關鍵字 (Prompt Keywords)

在生成 Prompt 時，請強制包含以下描述詞，以符合 Pinterest 參考圖的品質：

- **核心風格**: `mobile game asset`, `casino slot icon`, `digital painting`, `highly detailed`, `3d render style` (即使是 2D 繪圖也要有 3D 質感)。
- **光影與氛圍**: `volumetric lighting` (體積光), `rim light` (邊緣光 - 強調輪廓), `glowing` (微發光), `shiny`, `glossy reflection` (表面反光)。
- **構圖**: `centered`, `isolated on black background`, `full shot` (完整視角), `no cropping` (無裁切)。

## 3. 材質規範 (Material Guidelines)

根據參考圖，不同等級的圖示需對應特定材質：

- **Low Pay (字母/數字)**:
  - 必須有厚度 (Extruded)。
  - 材質：`Gold trim` (金邊) + `Colored Enamel` (彩色琺瑯) 或 `Gemstone surface` (寶石切面)。
- **High Pay (道具/角色)**:
  - 強調體積感。
  - 材質：`Realistic texture` (真實紋理，如木紋、金屬刮痕), `Subsurface scattering` (次表面散射 - 用於皮膚或玉石)。

## 4. 負面限制 (Negative Prompts)

禁止出現以下特徵（這是 AI 容易犯的錯）：

- `flat`, `vector`, `simple icon`, `minimalist` (太扁平)
- `sketch`, `drawing`, `outline` (草稿感)
- `blurry`, `low resolution`, `pixelated`
- `text`, `watermark`, `frame` (不要額外的邊框，除非是圖示設計的一部分)

## 5. 控制網設定 (ControlNet Instructions)

若使用 ControlNet 參考形狀：

- 請使用 **Depth** 或 **NormalMap** 來維持圖示的立體起伏，而不僅僅是邊緣 (Canny)。
