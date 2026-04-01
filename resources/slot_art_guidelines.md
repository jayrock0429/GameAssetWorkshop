# 老虎機美術設計指南 (Slot Game Art Bible)

本文件是生成 AAA 級別（如 PG Soft / JILI 基準）老虎機美術資產的權威指南。AI 在生成任何相關資產時，必須嚴格遵守以下所有規範，以確保產出物可以直接作為遊戲開發資產使用。

## 1. 老虎機解剖學 (Slot Anatomy)

一個完整的老虎機畫面通常由以下層次和組件構成：

- **Layer 0 (Background / 環境背景):** 遊戲的主題場景，通常是充滿氛圍且不干擾前景的背景圖任務。
- **Layer 1 (UI Frame / 盤框):** 容納符號的框架，包含頂部的招牌 (Header) 與兩側的柱子 (Pillar)。
- **Layer 2 (Symbols / 符號):** 遊戲盤面上的滾輪圖標，通常是高辨識度的 3D 物件。
- **Layer 5 (UI Base / 底座):** 介面底部的資訊條或橫梁，不再是笨重的實體機台。
- **Layer 6 (Buttons / 按鈕):** 供玩家互動的自力按鈕，如 Spin、Auto 等。

### Mascot (吉祥物/主視覺)

- **角色定位 (Character Identity):** 必須展現「贏家能量」(Winner Energy) — 極度自信、喜悅、充滿生命力。
- **風格 (Stylization):** 高品質 3D 渲染擬人化角色，大頭 Q 版 (Chibi) 或標準比例。
- **質感 (Texture Mapping):** 多種材質對比 (Silk, Fur, Gold)。
- **打光:** 全身受光，背後必須有強力的輪廓光 (Rim Light)。

### Symbol (視覺階級與質感)

- **階級制度 (Visual Hierarchy):** WILD/SCATTER 具備重度 3D 幾何結構與動態光效。
- **3D 立體感 (Shape & Volume):** 極致的 **3D 倒角 (Beveled edges)**，實體玩具質感。
- **透視角度:** **等角透視 (Isometric)** 或 3/4 側角。
- **材質對比:** 核心原則是「異材質連鎖」(如金屬包寶石)。

## 2. 3A 級工業標準黃金準則 (AAA Golden Rules)

- **Rule 1: ABSOLUTE NO TEXT.** All UI elements must remain completely blank.
- **Rule 2: Z-Depth & Volume (NO FLAT ART).** 即使是 Anime 風格，也必須有厚重感與斜角刻痕 (3D Bevels)。
- **Rule 3: Architectural Layering.** 介面框架必須有三個層級：1. Outer Shell (24K Gold/Steel), 2. Inner Inlay (Gemstone/Leather), 3. Edge Micro-Glow (LED line)。
- **Rule 4: NO MACHINE CABIINET.** **絕對嚴禁生成任何「實體賭場機台」或「帶有透視深度的底座」**。UI 應該是懸浮在螢幕上的「現代化介面條」。

## 3. 風格設定檔 (Style Profiles)

- **3D_Premium:** 電影級打光，銳利的 3D 細節。
- **Anime_Stylized:** 3A 遊戲級 3D 賽璐璐風格 (AAA Anime Game Style)。粗輪廓、手繪質感、高動態顏色。
- **PBR_Realistic:** 超級寫實 PBR 物理渲染。
- **Flat_Modern:** 乾淨的向量藝術，扁平化但有細微漸層。

## 4. 各組件生成規範 (Component Style Alignment)

**核心原則：** UI 組件必須極致**「纖細與現代化」**。嚴禁生成厚重、笨重、佔空間的實體結構。

#### 4.1 UI_Pillar (側邊柱子)

- **物理要求:** **必須是極細的垂直邊界線 (Ultra-Slim Line)**。寬度不得超過畫布總寬的 **3%**。
- **視角要求:** **正投影平面視角 (Orthogonal Front View)**。
- **設計語彙:** 本質上是「裝飾線條」，而不是「建築柱子」。

#### 4.2 UI_Header (頂部招牌)

- **物理要求:** **極致纖細的橫梁 (Ultra-Slim Horizontal Bar)**。**高度必須縮小在總高度的 8% - 10% 之間**。
- **設計規範:** **絕對禁止厚重的機台招牌感**。應像是一個精緻的「數位顯示條」或「懸浮的銘牌」。
- **視角要求:** **正面視角 (Frontal)**，不可有仰視或側視的厚度感。

#### 4.3 UI_Base (控制台/底部資訊條)

- **物理要求:** **水平的底部 HUD 介面 (Horizontal HUD Bar)**。**高度必須縮小在總高度的 12% - 15% 之間**。
- **反機台準則 (Anti-Cabinet Rule):** **禁止生成帶有深度的、斜向上的「機台桌面」或「控制台面板」**。它必須是一個與螢幕平行的、扁平但有 3D 厚角質感的「資訊條」。
- **視角要求:** **正投影平面視角 (Orthogonal Front View)**。嚴禁看向底座頂部的視角。

#### 4.4 Button (按鈕)

- **視覺重心:** 像是一顆「可以按下的寶石」。
- **材質:** 與主題統一，但必須與 UI_Base 產生材質區分，使其顯眼。

## 5. 🧠 專業老虎機美術理論

- **視覺焦點:** 確保 80% 的畫面空間留給「滾輪區 (Reels)」。UI 只是邊緣的襯托。
- **色彩策略:** UI 使用深色、低飽和 (後退色)，確保中間的符號 (前進色) 被凸顯。

## 6. 🛸 Antigravity 專用技能：PGslot 旗艦級美術生成指令

- **視覺質感:** 3D 玻璃擬態 (Glassmorphism)、邊緣背光、懸浮感。
- **UI Design:** 頂部 Header 設計要像「飄浮的珠寶」；底部 Base 設計要像「透明的控制板」。
