import styleDnaData from './style_dna.json';
import { getEnv } from './env';

const GEMINI_API_KEY = getEnv('GEMINI_API_KEY');
console.log('[Generator] API Key Status:', GEMINI_API_KEY ? 'Present (First 4: ' + GEMINI_API_KEY.slice(0, 4) + '...)' : 'MISSING');

// Style DNA 類型定義
type StyleDnaEntry = {
    name: string;
    description: string;
    promptInjection: string;
    lighting: string;
    palette: string;
    materials: string;
};
const STYLE_DNA: Record<string, StyleDnaEntry> = styleDnaData;

/**
 * 查詢 Style DNA 預設，回傳 promptInjection 字串
 * @param key 如 'golden_royal' | 'modern_neon' | 'ancient_myth' | 'candy_delight'
 */
export function getStyleDNA(key: string): StyleDnaEntry | null {
    return STYLE_DNA[key] ?? null;
}

/**
 * 將 Style DNA key 轉換為可注入 prompt 的字串
 * 若 key 不存在則回傳空字串
 */
export function resolveStyleDNA(key?: string): string {
    if (!key) return '';
    const dna = STYLE_DNA[key];
    if (!dna) return '';
    return `[Style DNA: ${dna.promptInjection}. Lighting: ${dna.lighting}. Materials: ${dna.materials}.]`;
}

// 格式化符號類型對應的系統規範 (結合 RenderWolf AAA 標準)
const ELEMENT_TYPE_RULES: Record<string, string> = {
    character: `[CRITICAL: SINGLE isolated 3D character, CENTERED, 20% empty padding around all edges, SOLID BLACK BACKGROUND]. AAA slot character, dramatic rim lighting, sharp focus, vibrant colors. NO cropping, NO touching edges.`,
    high: `[CRITICAL: SINGLE isolated 3D object, CENTERED, 25% empty padding, SOLID BLACK BACKGROUND]. Ultra-premium slot symbol, specular highlights, photorealistic textures, metallic sheen.`,
    medium: `[CRITICAL: Single isolated 3D object, centered, pure solid white background]. AAA casino slot medium-value symbol, well-detailed 3D render, matching the theme style described below.`,
    special: `[CRITICAL: Single isolated 3D special symbol, bold design, centered, white background. If it contains text, use a simplistic gradient background for easy removal]. AAA casino slot special symbol (Wild/Scatter), high-contrast effects, energy particles matching theme style.`,
    royal: `[CRITICAL: Single isolated letter/rank symbol, centered, white background]. Stylized thematic 3D typography for casino slot Royals, styled to match the theme described below.`,
    bg: `[CRITICAL: Wide angle cinematic background, deep perspective, soft focus foreground, NO characters, NO symbols]. Atmospheric slot environment, immersive lighting.`,
    frame: `[CRITICAL: THIN Decorative border frame ONLY. Center 90% MUST BE EMPTY PURE BLACK. NO objects inside]. Casino reel frame, ornate gold and gem details, matching theme style.`,
    button: `[CRITICAL: Single circular or rounded button, centered, isolated]. Casino slot UI button, 3D design styled to match the theme described below.`,
    title: `[CRITICAL: Game title text treatment, stylized 3D typography, transparent-friendly background]. Casino slot game title logo, letterforms styled to match the theme described below.`,
};

const TIER_MODIFIERS: Record<string, string> = {
    Low: 'Standard quality, clean execution.',
    Medium: 'High quality, added rim lighting, subtle glow, metallic accents.',
    High: 'Ultra-premium quality, intense energy aura, multi-layered intricate details, dramatic speculars, sharp specular highlights.',
};

/**
 * 組裝最終 Prompt
 */
export function buildPrompt(params: {
    elementType: string;
    valueTier: string;
    elementPrompt: string;
    styleGuide: string;
    theme: string;
    styleAnalysis?: string;
    styleDnaKey?: string; // 可選：指定 style_dna.json 中的預設鍵值
}): { prompt: string; negativePrompt: string } {
    const { elementType, valueTier, elementPrompt, styleGuide, theme, styleAnalysis, styleDnaKey } = params;

    // 建立 Master DNA：優先順序 styleDnaKey > styleAnalysis > styleGuide > 預設
    let masterStyle: string;
    if (styleDnaKey) {
        // 使用 style_dna.json 預設（e.g. golden_royal、modern_neon）
        masterStyle = resolveStyleDNA(styleDnaKey);
    } else if (styleAnalysis) {
        masterStyle = `[Visual DNA: ${styleAnalysis}]`;
    } else {
        masterStyle = styleGuide || 'AAA Casino 3D Style';
    }

    // 排列順序：[類型規則] -> [主題對象] -> [風格 DNA] -> [品質描述]
    // 確保 AI 先定位尺寸，再畫內容，最後上濾鏡
    const prompt = [
        ELEMENT_TYPE_RULES[elementType] || '',
        `Subject: ${elementPrompt} (Theme: ${theme}).`,
        `Environment & Materials: ${masterStyle}.`,
        TIER_MODIFIERS[valueTier] || '',
        'ULTRA-AAA Professional Casino Polish, 8k resolution, Maximum sharpness.',
    ].filter(Boolean).join(' ');

    let negativePrompt = 'white edges, overlapping, cluttered background, multiple characters, cropped, cut-off, low-res, messy edges, shadow on floor';

    if (elementType === 'symbol' || elementType === 'character') {
        negativePrompt += ', full room background, floor, horizon line, landscape';
    }

    return { prompt, negativePrompt };
}

/**
 * 呼叫 Imagen API 生成圖片
 */
export async function generateImage(params: {
    prompt: string;
    negativePrompt?: string;
    aspectRatio?: string;
}): Promise<Buffer> {
    const { prompt, negativePrompt, aspectRatio = '1:1' } = params;

    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY 未設定');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${GEMINI_API_KEY}`;

    const finalPrompt = negativePrompt ? `${prompt} DO NOT INCLUDE: ${negativePrompt}` : prompt;

    const body = {
        instances: [{ prompt: finalPrompt }],
        parameters: { 
            sampleCount: 1, 
            aspectRatio 
        },
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || `Imagen API 錯誤: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }

    // [DEBUG] 加入記錄，幫助除錯 Imagen 4.0 API 的預期外返回
    if (!data.predictions || data.predictions.length === 0) {
        console.error('[Generate API Fatal] No predictions found. Full response data:', JSON.stringify(data, null, 2));
        throw new Error('Imagen API 未返回圖片數據 (詳細日誌請見終端機)');
    }

    const base64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!base64) {
        console.error('[Generate API Fatal] No bytesBase64Encoded found in prediction. Full response data:', JSON.stringify(data, null, 2));
        throw new Error('Imagen API 未返回圖片數據 (詳細日誌請見終端機)');
    }

    return Buffer.from(base64, 'base64');
}

/**
 * 分析範例圖片，提取 Style DNA
 * @param imagesBase64 圖片 base64 字串陣列（支援 jpeg/png/webp）
 */
export async function analyzeStyleFromImages(imagesBase64: string[]): Promise<string> {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY 未設定');
    if (imagesBase64.length === 0) throw new Error('請至少提供一張範例圖');

    const imageParts = imagesBase64.map(data => ({
        inline_data: { mime_type: 'image/png', data },
    }));

    const analysisPrompt = `You are an AAA casino slot art director. Analyze the provided reference image(s) and extract a precise Style DNA description in English (100-200 words). Include:
1. Rendering style (3D/2.5D/semi-realistic/painterly)
2. Lighting characteristics (rim lights, bloom, ambient occlusion, glow types)
3. Color palette (saturation level, dominant hues, color harmony)
4. Material qualities (metallic sheen, glossiness, texture resolution, subsurface scattering)
5. Special effects (particles, energy aura, lens flare, sparkles)
6. Overall visual fidelity and polish tier
Output ONLY the Style DNA description string in English, no extra explanation.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                role: 'user',
                parts: [{ text: analysisPrompt }, ...imageParts],
            }],
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || `Gemini Vision API 錯誤: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('無法從範例圖提取風格描述');

    return text.trim();
}

/**
 * 解析文案 Brief => 資產清單
 */
export async function parseBrief(briefText: string): Promise<{
    theme: string;
    assets: Array<{
        name: string;
        element_type: string;
        symbol_type: string;
        value_tier: string;
        prompt: string;
    }>;
}> {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY 未設定');

    const systemPrompt = `你是一位老虎機遊戲美術總監。用戶提供了一份 Slot Game Art Asset Brief。
請解析這份文案，輸出一個嚴格的 JSON 格式（不含 markdown），結構如下：
{
  "theme": "遊戲主題（英文）",
  "assets": [
    {
      "name": "資產名稱",
      "element_type": "character|high|medium|special|royal|bg|frame|button|title",
      "symbol_type": "Character|Royals|Custom|Special",
      "value_tier": "Low|Medium|High",
      "prompt": "英文描述（用於生圖的詳細 prompt）"
    }
  ]
}
每個 SECTION 都對應特定 element_type：
- GAME TITLE → title
- REEL FRAME → frame
- BACKGROUND → bg
- SPIN BUTTON / MAX BUTTON → button
- CHARACTER SET → character (value_tier: High)
- HIGH SYMBOLS → high
- MEDIUM SYMBOLS → medium
- SYMBOL SET → custom element type
- SPECIAL SYMBOLS 如 Wild/Scatter → special
- ROYALS (A,K,Q,J,10) → royal (value_tier: Low)`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: briefText }], role: 'user' }],
            generationConfig: { responseMimeType: 'application/json' },
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Gemini API 錯誤: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini 未返回 Brief 解析結果');

    return JSON.parse(text);
}

/**
 * 將試算表內容轉換為 Slot Game Art Asset Brief 格式
 */
export async function convertExcelToBrief(tableContent: string): Promise<string> {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY 未設定');

    const systemPrompt = `你是一位老虎機遊戲美術總監助理。用戶提供了從 Excel/CSV 試算表中提取的遊戲資產資料。
請分析這些資料，將其重新整理為以下標準老虎機遊戲美術企劃文案格式：

老虎機遊戲美術企劃 (SLOT GAME ART ASSET BRIEF)

Theme: [遊戲主題]

GAME TITLE (1)
標題文字：[遊戲名稱]
[描述標題的字型風格、材質、裝飾元素]

REEL FRAME (1)
[描述捲軸邊框的建築風格、材質、裝飾圖案]

BACKGROUND (1)
[描述背景場景：環境、地標、氛圍、光線、景深]

SPIN BUTTON (1)
[描述 SPIN 按鈕的形狀、材質、中心圖案、裝飾細節]

CHARACTER SET (N)
[描述各角色的外觀、服裝、姿勢、視覺特徵]

HIGH SYMBOLS (N)
[描述高分符號]

SPECIAL SYMBOLS
Wild：[描述]
Scatter：[描述]

ROYALS
[描述牌面風格]

規則：
1. 根據試算表資料填充對應內容，保留所有細節
2. 保持繁體中文/英文混合格式
3. 如果試算表有某類型資產，請包含對應段落；如果沒有，省略該段落
4. 輸出純文字格式，不含 markdown、代碼塊或額外說明`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: `請將以下試算表資料轉換為 Slot Game Art Asset Brief：\n\n${tableContent}` }], role: 'user' }],
        }),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err?.error?.message || `Gemini API 錯誤: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('無法從試算表資料生成 Brief');

    return text.trim();
}

/**
 * 寫入生圖記錄到 Google Sheets
 *
 * ⚠️ 欄位對應說明（與 Google Apps Script 端相容）：
 *   GAS 期望 `theme`    ← 我們的 project_name（專案/主題名稱）
 *   GAS 期望 `asset_id` ← 我們的 asset_name（可讀資產名稱，如 sym_pharaoh_icon）
 *   DB UUID 另存為 `asset_db_id`（備查，不影響 Sheets 欄位）
 */
export async function logToSheets(data: {
    asset_id: string;      // DB UUID（內部主鍵）
    asset_name: string;    // 可讀名稱，如 sym_pharaoh_icon（對應 GAS 的 asset_id 欄位）
    project_name: string;  // 專案/主題名稱（對應 GAS 的 theme 欄位）
    element_type: string;
    status: 'success' | 'failed';
    prompt?: string;
    source?: string;
}): Promise<void> {
    const trackingUrl = getEnv('TRACKING_URL');
    if (!trackingUrl) return; // 沒設定就靜默跳過

    const COST_PER_IMAGE = 0.03; // Imagen 每張約 $0.03 USD

    // 防呆：確保 asset_name 和 project_name 有實際值
    const resolvedAssetName = data.asset_name && data.asset_name !== data.asset_id
        ? data.asset_name
        : `asset_${data.asset_id.slice(0, 8)}`; // fallback: 用 UUID 前 8 碼

    const resolvedProjectName = data.project_name || '未命名專案';

    try {
        // 轉換為 GAS 期望的欄位格式（與舊版 slot_pipeline.js 相容）
        const payload = {
            theme: resolvedProjectName,          // GAS "主題" 欄位
            asset_id: resolvedAssetName,         // GAS "Asset ID" 欄位（可讀名稱）
            asset_db_id: data.asset_id,          // 額外：DB UUID，供日後追蹤
            element_type: data.element_type,
            status: data.status,
            source: data.source || 'Slots Studio (Next.js)',
            cost: data.status === 'success' ? COST_PER_IMAGE : 0,
            prompt: data.prompt,
            timestamp: new Date().toISOString(),
        };

        console.log(`[Sheets] 寫入記錄：theme="${payload.theme}", asset_id="${payload.asset_id}"`);

        const resp = await fetch(trackingUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            console.warn(`[Sheets] 寫入失敗，狀態碼：${resp.status}`);
        } else {
            console.log('[Sheets] ✅ 記錄寫入成功');
        }
    } catch (err: unknown) {
        // 追蹤失敗不中斷主流程
        console.warn('[Sheets] 無法上傳記錄：', err instanceof Error ? err.message : err);
    }
}
