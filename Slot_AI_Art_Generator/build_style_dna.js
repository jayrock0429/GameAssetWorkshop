#!/usr/bin/env node
/**
 * 風格 DNA 建構工具 (Style DNA Builder)
 * 
 * 對 reference_art 內的所有參考圖進行多維度深度分析，
 * 產出 style_dna.json 知識庫供 slot_pipeline.js 使用。
 * 
 * 用法：npm run build-dna
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs-extra");
const path = require("path");
require("dotenv").config();

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.error("[錯誤] 尚未設定 GEMINI_API_KEY");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const REF_DIR = path.join(__dirname, "reference_art");
const OUTPUT_PATH = path.join(REF_DIR, "style_dna.json");

// 將圖片轉為 Gemini 可讀格式
function fileToInlineData(filePath) {
  const ext = filePath.toLowerCase();
  const mimeType = ext.endsWith(".png") ? "image/png" : "image/jpeg";
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType,
    },
  };
}

// 取得資料夾內所有圖片
function getImageFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .map((f) => path.join(dir, f));
}

// 延遲函數（避免 API 限制）
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ====== 分類別特化分析 Prompt ======

const ANALYSIS_PROMPTS = {
  symbols: `You are an elite AAA casino slot game art director conducting a comprehensive visual analysis.

Analyze ALL provided reference images of slot game SYMBOLS. Extract a complete, structured set of art direction rules.

You MUST return a valid JSON object with EXACTLY this structure:
{
  "high_value_symbols": "Detailed English prompt rules for high-value character/object symbols: rendering style, material quality, framing, lighting, detail level, color richness...",
  "low_value_letters": "Detailed English prompt rules for low-value letter/number symbols (J, Q, K, A, 10): typography style, material (gemstone-inlaid metallic, engraved stone, etc.), gold trim, bevel depth, color coding...",
  "special_symbols": "Detailed English prompt rules for Wild, Scatter, Bonus symbols: how they differ from regular symbols (glow effects, unique frames, animated feel, dragon/crystal orbs...)...",
  "background_treatment": "How symbol backgrounds are handled: transparent, solid color, rounded rectangle stone tablet, gradient...",
  "common_quality_markers": "Universal quality indicators across ALL symbols: render technique (3D, 2.5D, painted), texture fidelity, edge quality, shadow style, overall polish level..."
}

Be EXTREMELY specific and descriptive. Each field should be 80-150 words of actionable art direction in English.
Return ONLY valid JSON, no markdown.`,

  screens: `You are an elite AAA casino slot game art director conducting a comprehensive visual analysis.

Analyze ALL provided reference images of complete slot game SCREENS (full game layouts). Extract structural and compositional rules.

You MUST return a valid JSON object with EXACTLY this structure:
{
  "grid_composition": "How the reel grid is positioned relative to the full screen: percentage of screen occupied, vertical centering, margins...",
  "header_design": "Design patterns for the top area: game title placement, win display, multiplier indicators, decorative elements...",
  "base_panel": "Design patterns for the bottom UI: bet display, balance, win amount, spin button style and position, turbo/auto buttons...",
  "frame_integration": "How the reel frame integrates with the background: ornate borders, thematic decoration, corner pieces, structural depth...",
  "atmosphere_and_lighting": "Overall mood, color temperature, background treatment, depth of field, particle effects, ambient lighting direction...",
  "layout_variations": "Differences between portrait (9:16) and landscape (16:9) layouts: how elements rearrange, scaling strategies..."
}

Be EXTREMELY specific and descriptive. Each field should be 80-150 words of actionable art direction in English.
Return ONLY valid JSON, no markdown.`,

  ui: `You are an elite AAA casino slot game art director conducting a comprehensive visual analysis.

Analyze ALL provided reference images of slot game UI ELEMENTS (frames, buttons, panels, borders). Extract design language rules.

You MUST return a valid JSON object with EXACTLY this structure:
{
  "frame_construction": "Reel frame design rules: border thickness (thin/thick), material (metal, wood, stone), corner ornaments, structural rivets, symmetry...",
  "hollow_center": "How the center reel area is kept empty/transparent: edge treatment, inner shadow, grid dividers...",
  "button_design": "Spin button and control button design language: shape (circular/rounded rect), material (metallic, glossy), icon style, active/hover states...",
  "info_panels": "Balance/bet/win display panel design: shape, background material, text styling, gold trim, embedded icons...",
  "decorative_density": "Level of ornamental detail: minimal vs ornate, when to use filigree/scrollwork, gemstone accents, thematic motifs...",
  "color_and_material_strategy": "How colors and materials adapt to different themes while maintaining premium quality: gold as universal accent, theme-specific secondary colors..."
}

Be EXTREMELY specific and descriptive. Each field should be 80-150 words of actionable art direction in English.
Return ONLY valid JSON, no markdown.`,
};

// ====== 主分析引擎 ======

async function analyzeCategory(category, files) {
  const prompt = ANALYSIS_PROMPTS[category];
  if (!prompt) {
    console.warn(`[略過] 未定義 "${category}" 的分析 Prompt。`);
    return null;
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[分析] ${category} (${files.length} 張圖片)`);
  console.log(`${"=".repeat(60)}`);

  // 分批處理：每批最多 8 張（Gemini Vision 限制與品質平衡）
  const BATCH_SIZE = 8;
  const batches = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE));
  }

  const batchResults = [];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(
      `  批次 ${batchIdx + 1}/${batches.length} (${batch.length} 張)...`
    );

    const imageParts = batch.map((f) => fileToInlineData(f));

    try {
      const result = await visionModel.generateContent([
        prompt,
        ...imageParts,
      ]);
      const text = result.response.text().trim();

      // 嘗試解析 JSON（移除可能的 markdown 包裹）
      const jsonStr = text.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(jsonStr);
      batchResults.push(parsed);
      console.log(`  ✅ 批次 ${batchIdx + 1} 分析成功！`);
    } catch (err) {
      console.error(`  ❌ 批次 ${batchIdx + 1} 失敗:`, err.message);
    }

    // API 冷卻
    if (batchIdx < batches.length - 1) {
      console.log(`  ⏳ 等待 API 冷卻 (4 秒)...`);
      await delay(4000);
    }
  }

  // 如果有多批結果，合併（取最豐富的版本或融合）
  if (batchResults.length === 0) return null;
  if (batchResults.length === 1) return batchResults[0];

  // 多批合併：請 Gemini 整合
  console.log(`  🔀 正在整合 ${batchResults.length} 批分析結果...`);
  try {
    const mergePrompt = `You are merging multiple visual analysis results into ONE definitive set of art direction rules.

Here are ${batchResults.length} analysis results from different batches of reference images for "${category}":

${batchResults.map((r, i) => `--- Batch ${i + 1} ---\n${JSON.stringify(r, null, 2)}`).join("\n\n")}

Merge them into ONE comprehensive JSON object with the SAME keys. For each key, combine the most specific, actionable details from all batches into a single rich description (100-200 words per field).
Return ONLY valid JSON, no markdown.`;

    const mergeResult = await visionModel.generateContent(mergePrompt);
    const mergeText = mergeResult.response
      .text()
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/, "");
    return JSON.parse(mergeText);
  } catch (err) {
    console.warn(`  ⚠️ 合併失敗，使用第一批結果:`, err.message);
    return batchResults[0];
  }
}

// ====== 產生 Master Quality 基準 ======

async function buildMasterQuality(allResults) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[合成] 正在產生 Master Quality 通用基準...`);
  console.log(`${"=".repeat(60)}`);

  const masterPrompt = `You are an elite AAA casino slot game art director.

Based on the following category-specific analysis results extracted from 65+ professional reference images, synthesize ONE universal "Master Quality" prompt string.

This master prompt should capture the UNIVERSAL quality standard that ALL assets (regardless of theme or type) must achieve. Focus on:
- Overall render quality and technique
- Lighting mastery
- Material fidelity
- Color vibrancy standards
- Edge quality and anti-aliasing
- Professional polish level
- Commercial-grade finish expectations

Analysis results:
${JSON.stringify(allResults, null, 2)}

Return ONLY a single English prompt string (200-300 words). No JSON, no markdown, just the raw prompt text.
This will be prepended to EVERY image generation prompt in the system.`;

  try {
    const result = await visionModel.generateContent(masterPrompt);
    return result.response.text().trim().replace(/["\n\r]+/g, " ");
  } catch (err) {
    console.error("[錯誤] Master Quality 合成失敗:", err.message);
    return "AAA premium casino slot game quality, flawless 3D render, ultra-high detail, vibrant saturated colors, professional commercial finish, masterpiece.";
  }
}

// ====== 產生主題適應策略 ======

async function buildThemeAdaptation(allResults) {
  console.log(`\n[合成] 正在產生主題適應策略...`);

  const prompt = `You are an elite AAA casino slot game art director.

Based on the analysis of 65+ reference images across multiple themes (Egyptian, Pirate, Norse, Arabian, Chinese, Fantasy, Steampunk, etc.), write a comprehensive "Theme Adaptation Strategy" in English.

This strategy explains HOW to adapt the universal quality standards to ANY new theme the user might request. Cover:
- How to select appropriate materials for different themes (stone for Egyptian, wood for Pirate, metal for Sci-fi...)
- Color palette adaptation rules (warm golds for Egyptian, deep blues for Ocean, dark reds for Fantasy...)
- Lighting mood shifts per genre
- Symbol design adaptation (how letter symbols change style per theme)
- Frame/border material selection per theme

Analysis context:
${JSON.stringify(allResults, null, 2)}

Return ONLY a single English text block (200-300 words). No JSON, no markdown.`;

  try {
    const result = await visionModel.generateContent(prompt);
    return result.response.text().trim().replace(/["\n\r]+/g, " ");
  } catch (err) {
    console.error("[錯誤] 主題適應策略合成失敗:", err.message);
    return "";
  }
}

// ====== 主流程 ======

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   風格 DNA 建構工具 v1.0                  ║");
  console.log("║   掃描所有參考圖，建立美術知識庫            ║");
  console.log("╚══════════════════════════════════════════╝");

  // 收集所有圖片
  const categories = ["symbols", "screens", "ui"];
  const filesByCategory = {};

  for (const cat of categories) {
    const files = getImageFiles(path.join(REF_DIR, cat));
    filesByCategory[cat] = files;
    console.log(`[掃描] ${cat}: ${files.length} 張圖片`);
  }

  const totalFiles = Object.values(filesByCategory).reduce(
    (sum, f) => sum + f.length,
    0
  );
  console.log(`[總計] ${totalFiles} 張參考圖待分析\n`);

  if (totalFiles === 0) {
    console.error("[錯誤] reference_art 資料夾內沒有任何圖片！");
    process.exit(1);
  }

  // 逐類別分析
  const categoryRules = {};
  for (const cat of categories) {
    if (filesByCategory[cat].length > 0) {
      categoryRules[cat] = await analyzeCategory(cat, filesByCategory[cat]);
      await delay(3000); // 類別間冷卻
    }
  }

  // 合成 Master Quality
  const masterQuality = await buildMasterQuality(categoryRules);
  await delay(3000);

  // 合成主題適應策略
  const themeAdaptation = await buildThemeAdaptation(categoryRules);

  // 組裝風格 DNA
  const styleDNA = {
    version: "1.0",
    buildDate: new Date().toISOString(),
    totalImagesAnalyzed: totalFiles,
    masterQuality,
    categoryRules,
    compositionRules: {
      gridRatio: "盤面佔畫面 70-75%",
      headerMaxHeight: "≤12% 畫布高度",
      baseMaxHeight: "≤15% 畫布高度",
      spinButtonPosition: "居中底部，圓形金屬質感",
    },
    themeAdaptation,
  };

  // 寫入檔案
  await fs.writeJson(OUTPUT_PATH, styleDNA, { spaces: 2 });
  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ 風格 DNA 知識庫已建立！`);
  console.log(`   路徑: ${OUTPUT_PATH}`);
  console.log(`   分析圖片數: ${totalFiles}`);
  console.log(`   Master Quality 長度: ${masterQuality.length} 字元`);
  console.log(`${"=".repeat(60)}`);
}

main().catch((err) => {
  console.error("[致命錯誤]", err);
  process.exit(1);
});
