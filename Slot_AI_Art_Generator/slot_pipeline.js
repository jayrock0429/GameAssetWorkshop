/**
 * Slot 自動化美術生成系統 - 核心模組 (API Key 版)
 * 修復版：支援 PSD 圖層精確尺寸裁切 (16:9 橫向, 9:16 直向)
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs-extra");
const path = require("path");
const fetch = require("node-fetch");
const sharp = require("sharp"); // 引入 sharp 做影像縮放裁切
const { GoogleAuth } = require("google-auth-library"); // 用於 Imagen 的身分驗證
require("dotenv").config({ path: path.join(__dirname, ".env") });

// 設定 API KEY
const apiKey = process.env.GEMINI_API_KEY || "";
const project = process.env.GOOGLE_CLOUD_PROJECT || "";
const location = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

if (!apiKey) {
  console.error("[核心報錯] 尚未設定 GEMINI_API_KEY，請在 .env 檔案中填入。");
}

const genAI = new GoogleGenerativeAI(apiKey);
const textModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// 讀取我們先前產生的 PSD 尺寸表
const psdDimsPath = path.join(__dirname, "psd_dims.json");
let psdDims = { layout_L: {}, layout_P: {} };
if (fs.existsSync(psdDimsPath)) {
  psdDims = require(psdDimsPath);
}

// 載入風格 DNA 知識庫
const styleDnaPath = path.join(__dirname, "reference_art", "style_dna.json");
let styleDNA = null;
if (fs.existsSync(styleDnaPath)) {
  styleDNA = require(styleDnaPath);
  console.log(
    `[風格DNA] 已載入知識庫 (v${styleDNA.version}, 基於 ${styleDNA.totalImagesAnalyzed} 張參考圖)`,
  );
} else {
  console.warn("[風格DNA] 尚未建立知識庫，請先執行 npm run build-dna");
}

/**
 * 第一階段：呼叫 Gemini API (企劃解析器)
 */
async function parseDesignDoc(
  docText,
  targetLayout = "Landscape",
  customStyle = "",
) {
  const isLandscape = targetLayout === "Landscape";
  const layoutType = isLandscape
    ? "layout_L (電腦橫版 16:9)"
    : "layout_P (手機直版 9:16)";

  // 風格 DNA 注入：載入 Master Quality 與 分類規則
  let dnaStyleBase =
    styleDNA?.masterQuality ||
    "AAA premium casino game asset, highly polished 3D render, luxury finish, extreme detail, masterpiece.";

  // 建立動態規則參考
  const symRules = styleDNA?.categoryRules?.symbols || {};
  const splitRules = styleDNA?.categoryRules?.symbol_splitting || {};
  const frameRules = styleDNA?.categoryRules?.reel_frame || {};

  let styleInstruction = `
  "global_style": "統一的風格英文關鍵字 (例如: 3D glossy render, vibrant colors, casino slot icon)",
  `;

  if (customStyle) {
    styleInstruction = `
  "global_style": "${customStyle}", // 使用者已指定此專案統一風格，你必須直接填入此字串，不可擅自修改。
      `;
  }

  const systemInstruction = `
你是一位頂尖的 Slot 遊戲美術總監。請解析企劃文件，並為所有美術資產產生精確的 JSON 資料。

【全域品質基準 - Style DNA & RenderWolf Logic】
1. **主體優先 (Subject-First)**: image_prompt 必須以最核心的物件/角色描述開頭（例：A mechanical cyberpunk dragon character...）。
2. **渲染視覺 (Rendering)**: High photorealism, semi-3D shading, vibrant colors, high saturation, glossy finishes.
3. **核心光影 (Lighting)**: Dramatic rim lighting, bright highlights, soft shadows enriched with amber or deep hues.
4. **視角與構圖**: Front and center, captured from the chest up for characters, filling the frame for icons.

【資產生成與分層規範 (Magic Layers)】
1. **符號 (sym_***)**: 
   - **_icon**: 純 3D 物件主體。Prompt 公式: [Subject Description] + [Detailed Pose/Action] + [Materials] + [Lighting Details] + [Solid White Background].
   - **_word/_text**: 立體文字層。Prompt 公式: [Subject: 3D Text Content] + [Stylized Font] + [Beveled Materials] + [Clean Solid Background].
   - **_glow/_fx**: 特效層。Prompt 公式: [Subject: Specific FX Type] + [Energy Aura] + [Particulates] + [Translucency details].

2. **盤框 (pillar/frame)**: 
   - **Hollow Logic**: 纖細外框 (Thin border), 裝飾性四角 (Ornate corners)。
   - **黑色中空**: 中央 80% 必須是 PURE BLACK EMPTY VOID (#000000)。

你必須輸出 JSON 格式，並在 image_prompt 中落實「主體優先」策略，且風格需與 global_style 一致。

你必須且只能輸出以下 JSON 格式：
{
  "theme": "遊戲主題 (中文)",
  ${styleInstruction}
  "targetLayout": "${targetLayout}",
  "assets": [
    {
      "asset_id": "檔案命名 (例: sym_wild_icon, sym_heart_word, bg_main, pillar_main)",
      "tier": "normal | high | epic | legend",
      "psd_layer": "bg | sym | pillar | header | base",
      "aspectRatio": "1:1 | 16:9 | 9:16",
      "image_prompt": "以核心主體為首的英文生圖指令。避免過多通用品質詞，專注描述資產本身的視覺特徵。"
    }
  ]
}
`;

  try {
    console.log(
      `--- 正在解析企劃內容 [目標版型: ${targetLayout}] (Gemini 2.0 Flash) ---`,
    );

    const result = await textModel.generateContent({
      contents: [
        { role: "user", parts: [{ text: `【企劃書內容】：\n${docText}` }] },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
      systemInstruction: systemInstruction,
    });

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    console.log(
      `[成功] 解析完成：${parsedData.theme} (資產數: ${parsedData.assets.length})`,
    );
    return parsedData;
  } catch (error) {
    console.error("[錯誤] 企劃解析失敗：", error.message);
    throw error;
  }
}

/**
 * 輔助函式：成本計算與日誌上傳
 */
async function logToSheet(data) {
  const trackingUrl = process.env.TRACKING_URL;
  if (!trackingUrl) return;

  try {
    // 預估成本 (USD)
    // Gemini 2.0 Flash: $0.1 / 1M tokens (這裡簡化，主要算圖片)
    // Imagen 3.0: 約 $0.03 / per image
    const costPerImage = 0.03;
    const finalData = {
      ...data,
      cost: data.status === "success" ? costPerImage : 0,
    };

    console.log(`  -> [日誌] 正在傳送紀錄到 Sheets (ID: ${data.asset_id})...`);
    const resp = await fetch(trackingUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalData),
    });

    if (resp.ok) {
      console.log(`  -> [成功] 日誌已寫入 Google Sheets。`);
    } else {
      console.warn(`  -> [失敗] Google Sheets 回傳錯誤代碼: ${resp.status}`);
    }
  } catch (err) {
    console.warn(
      "[日誌警告] 無法上傳紀錄到 Google Sheets (請檢查網路或 TRACKING_URL):",
      err.message,
    );
  }
}

/**
 * 輔助函式：將本地圖片轉為 Gemini 可讀的 inlineData 格式
 */
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType,
    },
  };
}

/**
 * [新增] 階段 1.5：視覺逆向工程 - 讀取參考圖並萃取 AAA 級提示詞
 */
async function extractStyleFromReferences(theme, referenceType) {
  const refDir = path.join(__dirname, "reference_art", referenceType);
  if (!fs.existsSync(refDir)) return null;

  const files = fs
    .readdirSync(refDir)
    .filter((file) => /\.(png|jpe?g)$/i.test(file));
  if (files.length === 0) return null;

  console.log(
    `[系統] 偵測到 ${referenceType} 參考圖共 ${files.length} 張，正在進行視覺逆向工程...`,
  );

  try {
    const minDpiPrompt = `
You are an elite AAA casino slot game art director.
Analyze the provided reference images for a slot game (theme: ${theme}, asset type: ${referenceType}).
Extract their visual essence, lighting, materials, and overall aesthetic quality.
Write a HIGHLY DESCRIPTIVE, COMPELLING, and STRICT string of stable diffusion / Midjourney style prompts (in English) that perfectly recreates this EXACT render quality, texture, and lighting.
DO NOT include any explanation. DO NOT include the subject matter itself (e.g. if it's a frog, don't mention frog).
Focus ONLY on the art direction: lighting (e.g., rim lighting, dramatic), material (e.g., glossy, shiny gold, refractive glass), shading, 3D render qualities (e.g., isometric 3D pop-out, bevels), and color grading (e.g., ultra vibrant, high contrast).
Return ONLY the prompt string. For example: "flawless 3D render, ultra high-end PG Soft commercial slot game quality, extremely vibrant colors, glossy metallic textures, glowing neon accents, deep structural bevels, masterpiece."
Wait, no markdown, just the string.
`;

    // 預設最多取前 3 張圖給 Gemini 看以免 token 爆掉或過於混亂
    const imageParts = files.slice(0, 3).map((file) => {
      const ext = file.toLowerCase().endsWith("png")
        ? "image/png"
        : "image/jpeg";
      return fileToGenerativePart(path.join(refDir, file), ext);
    });

    const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await visionModel.generateContent([
      minDpiPrompt,
      ...imageParts,
    ]);
    const extractedStyle = result.response
      .text()
      .trim()
      .replace(/[\n\r]+/g, " ");

    console.log(
      `[視覺萃取成功] ${referenceType} 專用增強咒語: ${extractedStyle}`,
    );
    return extractedStyle;
  } catch (err) {
    console.warn(`[視覺逆向警告] 無法萃取 ${referenceType} 風格:`, err.message);
    return null;
  }
}

/**
 * 第二階段：呼叫 Google Image API (Imagen 3.0 via REST) 並使用 Sharp 精確裁切
 */
async function generateSlotAssets(
  parsedJson,
  gridSize = "5x3",
  reqState = null,
) {
  const { global_style, assets, targetLayout, theme } = parsedJson;

  // [新增] 根據主題建立子資料夾
  const safeThemeName = theme
    ? theme.replace(/[\\/:*?"<>|]/g, "_").trim()
    : "DefaultTheme";
  const outputDir = path.join(__dirname, "output_assets", safeThemeName);
  await fs.ensureDir(outputDir);

  const isLandscape = targetLayout !== "Portrait";

  // 動態尺寸推算邏輯
  const [cols, rows] = gridSize.split("x").map(Number);
  const baseWidth = isLandscape ? 1920 : 1080;
  const baseHeight = isLandscape ? 1080 : 1920;

  const gridAreaWidth = baseWidth * 0.6;
  const gridAreaHeight = baseHeight * 0.7;

  const idealSymWidth = Math.floor(gridAreaWidth / cols);
  const idealSymHeight = Math.floor(gridAreaHeight / rows);

  console.log(
    `[尺寸推算] 單一符號理想尺寸約為: W:${idealSymWidth}px x H:${idealSymHeight}px`,
  );
  
  // [新增] 載入 Renderwolf 風格對照表
  const rwStyles = styleDNA?.renderwolfStyles || {};

  // 風格 DNA 驅動：優先使用知識庫，無知識庫時才走舊版即時萃取
  let extractedStyles = { bg: null, ui: null, symbols: null, screens: null };

  if (styleDNA) {
    console.log(
      `[風格DNA] 使用預建知識庫作為風格基底 (基於 ${styleDNA.totalImagesAnalyzed} 張參考圖)`,
    );
  } else {
    console.log(`[系統] 未偵測到風格 DNA 知識庫，改用即時視覺逆向工程...`);
    extractedStyles = {
      bg: await extractStyleFromReferences(theme || "Generic Slot", "bg"),
      ui: await extractStyleFromReferences(theme || "Generic Slot", "ui"),
      symbols: await extractStyleFromReferences(
        theme || "Generic Slot",
        "symbols",
      ),
      screens: await extractStyleFromReferences(
        theme || "Generic Slot",
        "screens",
      ),
    };
  }

  const results = [];
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  console.log(`--- 開始生成與裁切美術資產 (共 ${assets.length} 項) ---`);

  for (const asset of assets) {
    console.log(`[系統] 為了避免觸發 API 速率限制，排隊等待 6.5 秒...`);
    await delay(6500);

    if (reqState && reqState.aborted) {
      console.log(`[中止] 偵測到用戶中斷，停止生成後續圖檔。`);
      break;
    }

    let finalPrompt = "";
    let apiAspectRatio = "1:1";
    try {
      // [V8.1 根本修正] 合併 psd_layer 與 asset_id 一起檢查，避免短路 || 導致 frame 識別失效
      const layerKey = (
        (asset.psd_layer || "") +
        " " +
        (asset.asset_id || "")
      ).toLowerCase();
      const isFrame = layerKey.includes("frame") || layerKey.includes("border");
      const isPillar =
        (layerKey.includes("pillar") || layerKey.includes("grid")) && !isFrame;
      const isSymOrBase =
        (layerKey.includes("sym") ||
          layerKey.includes("base") ||
          layerKey.includes("icon")) &&
        !isFrame;
      const isBackground = layerKey.includes("bg");
      const isDragonBall =
        (theme || "").includes("龍珠") ||
        (theme || "").toLowerCase().includes("dragon ball");

      // ====== 風格 DNA 三層 Prompt 組裝 (對標 RenderWolf 專業系統) ======
      
      const userSubject = asset.image_prompt || theme;
      const tier = (asset.tier || "normal").toLowerCase();
      const styleName = (global_style || "").toLowerCase().trim();
      
      // 偵測是否為 Renderwolf 風格
      let activeRWStyle = null;
      for (const [key, prompt] of Object.entries(rwStyles)) {
        if (styleName.includes(key)) {
          activeRWStyle = prompt;
          break;
        }
      }

      // 階級進階描述 (Evolution)
      let evolutionPrompt = "";
      if (styleDNA?.categoryRules?.assetEvolution) {
        const eLib = styleDNA.categoryRules.assetEvolution;
        evolutionPrompt = eLib[tier] || "";
      }

      // 最終組裝與負面提示詞
      let negPrompt =
        "scenery, background, room, full slot machine, grid, text, words, watermark, multiple objects, cut off, out of frame, low quality, deformed, blurry";

      // 第 1 層：風格基準 (優先使用 Renderwolf Style LoRA 邏輯)
      let styleBase = "";
      if (activeRWStyle) {
        styleBase = activeRWStyle;
        console.log(`  -> [風格策略] 採用 Renderwolf 特化 LoRA 風格: ${styleName}`);
      } else {
        styleBase = styleDNA?.masterQuality || "AAA casino slot asset, 3D render, high detail.";
      }

      // 第 2 層：類別專屬規範 (Category Rules) - 升級語義分層映射 (對標 RenderWolf)
      let categoryPrompt = "";
      if (styleDNA && styleDNA.categoryRules) {
        if (isPillar) {
          categoryPrompt = styleDNA.categoryRules.pillar
            ? `Structure: ${styleDNA.categoryRules.pillar.structural_logic} Lighting: ${styleDNA.categoryRules.pillar.lighting_and_depth} Detail: ${styleDNA.categoryRules.pillar.detail_density}`
            : "";
        } else if (isSymOrBase) {
          // [RenderWolf 核心：語義分層 & Symbol 拆解 (Word Split)]
          const assetIdLower = (asset.asset_id || "").toLowerCase();
          const tier = (asset.tier || "normal").toLowerCase();
          const splitRules = styleDNA.categoryRules.symbol_splitting;

          if (assetIdLower.includes("_icon")) {
            categoryPrompt = splitRules?.icon_body || "";
            negPrompt += ", text, words, letters, typography, alphabet";
          } else if (
            assetIdLower.includes("_text") ||
            assetIdLower.includes("_word")
          ) {
            categoryPrompt = splitRules?.word_overlay || "";
            negPrompt +=
              ", scenery, background, characters, creatures, objects, animals";
          } else if (
            assetIdLower.includes("_glow") ||
            assetIdLower.includes("_fx")
          ) {
            categoryPrompt = splitRules?.magic_layers || "";
            negPrompt += ", solid objects, characters, text, detailed items";
          } else if (
            assetIdLower.includes("character") ||
            tier === "epic" ||
            tier === "legend"
          ) {
            categoryPrompt =
              styleDNA.categoryRules.symbols?.character_symbols || "";
          } else if (
            tier === "high" ||
            assetIdLower.includes("high") ||
            assetIdLower.includes("item")
          ) {
            categoryPrompt =
              styleDNA.categoryRules.symbols?.high_value_items || "";
          } else {
            categoryPrompt =
              styleDNA.categoryRules.symbols?.low_value_ranks || "";
          }
        } else if (isFrame) {
          // [RenderWolf 核心：中空邊框生成]
          const fRules = styleDNA.categoryRules.reel_frame;
          categoryPrompt = fRules
            ? `${fRules.hollow_logic} ${fRules.border_construction} ${fRules.corner_ornaments}`
            : "";
        } else if (isBackground) {
          categoryPrompt =
            "Cinematic atmospheric depth, high-end slot game environment, layered parallax ready.";
        }
      }

      if (isSymOrBase) {
        const assetIdLower = (asset.asset_id || "").toLowerCase();
        const isSplittedLayer =
          assetIdLower.includes("_word") ||
          assetIdLower.includes("_text") ||
          assetIdLower.includes("_glow") ||
          assetIdLower.includes("_fx");

        if (isSplittedLayer) {
          // 非實體物件層 (文字、特效)
          finalPrompt = `${userSubject}, ${styleBase}, ${evolutionPrompt}, [AAA specialized layer, transparent-ready].`;
        } else {
          // 實體物件層 (Icon, Standard Symbol)
          finalPrompt = `${userSubject}, ${styleBase}, ${evolutionPrompt}, [single isolated 3D object, centered composition, solid white background].`;
        }
      } else if (isPillar) {
        finalPrompt = `${userSubject}, ${styleBase}, ${evolutionPrompt}, [SINGLE SOLID VERTICAL COLUMN ONLY, symmetrical design, clean edges].`;
      } else if (isFrame) {
        finalPrompt = `${userSubject}, ${styleBase}, [ornate thin decorative border frame, sharp beveled edges, black empty center void].`;
        negPrompt = "thick massive border, pillars inside, symbols inside, characters inside, patterns in center, " + negPrompt;
      } else if (isBackground) {
        finalPrompt = `${userSubject}, ${styleBase}, cinematic atmospheric depth, layered parallax landscape, high resolution.`;
        negPrompt += ", characters, people, UI elements, foreground objects";
      } else {
        finalPrompt = `${userSubject}, ${styleBase}`;
      }

      // 龍珠專用加速器
      if (isDragonBall) {
        finalPrompt +=
          " Intense Super Saiyan energy effects, iconic anime stylization.";
      }

      // 附加負面提示詞限制
      finalPrompt += ` DO NOT INCLUDE: ${negPrompt}`;

      const fileName = `${asset.asset_id}.png`;
      const filePath = path.join(outputDir, fileName);

      // 尺寸計算與生成...
      let targetDim = null;
      const layoutKey = isLandscape ? "layout_L" : "layout_P";
      const layerDims = psdDims[layoutKey] && psdDims[layoutKey][layerKey];

      if (isSymOrBase) {
        targetDim = { width: idealSymWidth, height: idealSymHeight };
      } else if (isFrame && isLandscape && !isPillar) {
        // [強制修正] ReelFrame 橫向模式下強制套用 16:9
        targetDim = { width: baseWidth, height: baseHeight };
      } else if (layerDims) {
        targetDim = { width: layerDims.width, height: layerDims.height };
      }
      if (!targetDim) targetDim = { width: baseWidth, height: baseHeight };

      const targetRatio = targetDim.width / targetDim.height;
      let isNarrowPillar = isPillar && targetRatio < 0.3;

      if (isFrame && isLandscape) {
        apiAspectRatio = "16:9";
      } else {
        if (isNarrowPillar) {
          apiAspectRatio = "1:1";
        } else {
          if (targetRatio > 1.5) apiAspectRatio = "16:9";
          else if (targetRatio > 1.1) apiAspectRatio = "4:3";
          else if (targetRatio < 0.6) apiAspectRatio = "9:16";
          else if (targetRatio < 0.9) apiAspectRatio = "3:4";
        }
      }

      console.log(
        `[生成中] ${asset.asset_id} (Tier: ${asset.tier || "normal"}) ...`,
      );

      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: finalPrompt }],
          parameters: { sampleCount: 1, aspectRatio: apiAspectRatio },
        }),
      });

      const data = await response.json();
      if (data.error)
        throw new Error(data.error.message || JSON.stringify(data.error));

      if (!data.predictions || data.predictions.length === 0) {
        throw new Error(
          "No image generated (likely blocked by safety filters or empty response). Full Response: " +
            JSON.stringify(data),
        );
      }

      const imageBase64 = data.predictions[0].bytesBase64Encoded;
      let bufferToProcess = Buffer.from(imageBase64, "base64");

      // 去背與裁切邏輯...
      const { checkRembg, removeBackground } = require("./auto_bg_remover");
      if (!isBackground) {
        if (checkRembg()) {
          const tempInput = path.join(
            outputDir,
            `temp_in_${asset.asset_id}.png`,
          );
          const tempOutput = path.join(
            outputDir,
            `temp_out_${asset.asset_id}.png`,
          );
          await fs.writeFile(tempInput, bufferToProcess);
          if (removeBackground(tempInput, tempOutput)) {
            bufferToProcess = await fs.readFile(tempOutput);
            console.log(`  -> [成功] AI 去背完成 (${asset.asset_id})`);
          }
          await fs.remove(tempInput);
          await fs.remove(tempOutput);
        }
      }

      const fitStrategy = isBackground ? sharp.fit.cover : sharp.fit.contain;
      if (isNarrowPillar) {
        await sharp(bufferToProcess)
          .resize({
            height: targetDim.height,
            width: targetDim.width + 20,
            fit: sharp.fit.cover,
          })
          .extract({
            left: 10,
            top: 0,
            width: targetDim.width,
            height: targetDim.height,
          })
          .toFile(filePath);
      } else {
        await sharp(bufferToProcess)
          .resize({
            width: targetDim.width,
            height: targetDim.height,
            fit: fitStrategy,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toFile(filePath);
      }

      console.log(`[完成] 已存檔：${fileName}`);
      results.push({ id: asset.asset_id, path: filePath, status: "success" });
      logToSheet({
        theme,
        asset_id: asset.asset_id,
        status: "success",
        prompt: finalPrompt,
        path: fileName,
      });
    } catch (error) {
      console.error(`[失敗] 資產 ${asset.asset_id} 發生錯誤：`, error.message);
      results.push({
        id: asset.asset_id,
        status: "failed",
        error: error.message,
      });
      logToSheet({
        theme,
        asset_id: asset.asset_id,
        status: "failed",
        prompt: finalPrompt,
        error: error.message,
      });
    }
  }

  try {
    const mockupPath = await compositeSlotScreen(
      outputDir,
      results,
      gridSize,
      isLandscape,
    );
    if (mockupPath) {
      results.push({
        id: "all_mockup",
        path: mockupPath,
        status: "success",
        isMockup: true,
      });
    }
  } catch (err) {
    console.error("[合成失敗] 無法產生模擬畫面：", err.message);
  }

  return results;
}

/**
 * 第三階段：合成模擬畫面
 */
async function compositeSlotScreen(outputDir, results, gridSize, isLandscape) {
  const [cols, rows] = gridSize.split("x").map(Number);
  const baseWidth = isLandscape ? 1920 : 1080;
  const baseHeight = isLandscape ? 1080 : 1920;

  const bg = results.find(
    (r) => r.status === "success" && r.id.toLowerCase().includes("bg"),
  );
  const pillar = results.find(
    (r) =>
      r.status === "success" &&
      (r.id.toLowerCase().includes("pillar") ||
        r.id.toLowerCase().includes("grid")),
  );
  const syms = results.filter(
    (r) => r.status === "success" && r.id.toLowerCase().includes("sym"),
  );

  if (!bg || !pillar || syms.length === 0) return null;

  console.log(`--- 正在合成全螢幕模擬畫面 (${gridSize}) ---`);

  const gridW = baseWidth * 0.75;
  const gridH = baseHeight * 0.8;
  const cellW = Math.floor(gridW / cols);
  const cellH = Math.floor(gridH / rows);

  const startX = Math.floor((baseWidth - gridW) / 2);
  const startY = Math.floor((baseHeight - gridH) / 2);

  const compositeLayers = [];
  const symbolBufferCache = {};

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const symIdx = (r * cols + c) % syms.length;
      const targetSym = syms[symIdx];

      if (!symbolBufferCache[targetSym.id]) {
        symbolBufferCache[targetSym.id] = await sharp(targetSym.path)
          .resize(cellW, cellH, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer();
      }

      compositeLayers.push({
        input: symbolBufferCache[targetSym.id],
        left: startX + c * cellW,
        top: startY + r * cellH,
      });
    }
  }

  const pillarBuffer = await sharp(pillar.path)
    .resize(Math.floor(gridW * 1.05), Math.floor(gridH * 1.05), { fit: "fill" })
    .toBuffer();
  compositeLayers.push({
    input: pillarBuffer,
    left: Math.floor(startX - gridW * 0.025),
    top: Math.floor(startY - gridH * 0.025),
  });

  const mockupPath = path.join(outputDir, "final_game_mockup.png");
  await sharp(bg.path)
    .resize(baseWidth, baseHeight, { fit: "cover" })
    .composite(compositeLayers)
    .toFile(mockupPath);

  return mockupPath;
}

module.exports = { parseDesignDoc, generateSlotAssets };

// --- CLI 執行接口 (支援直接下指令進行高品質攻堅) ---
if (require.main === module) {
  const args = require("minimist")(process.argv.slice(2));
  const theme = args.theme || "龍珠Ｚ：天下第一武道會";
  const assetsStr = args.assets || "bg_main, sym_dragonball, pillar_main";
  const layout = args.layout || "Landscape";
  const grid = args.grid || "5x3";

  (async () => {
    console.log(`🚀 [CLI 啟動] 主題: ${theme}, 資產: ${assetsStr}`);

    // 構造一個極簡企劃 doc，直接餵給流程
    const docText = `主題：${theme}\n資產清單：${assetsStr}`;
    const plan = await parseDesignDoc(docText, layout);

    // 過濾出使用者指定的資產
    const targetAssets = assetsStr.split(",").map((s) => s.trim());
    plan.assets = plan.assets.filter((a) =>
      targetAssets.some((ta) =>
        a.asset_id.toLowerCase().includes(ta.toLowerCase()),
      ),
    );

    if (plan.assets.length === 0) {
      console.error("[報錯] 找不到對應的資產 id，請檢查 --assets 參數。");
      process.exit(1);
    }

    const outputAssetsDir = path.join(
      __dirname,
      "output_assets",
      theme.replace(/[:*?"<>|]/g, "_"),
    );
    await fs.ensureDir(outputAssetsDir);

    await generateSlotAssets(plan, grid, null); // 修正：第二個參數應為 gridSize
    console.log(`✨ [CLI 完成] 資產已存放在: ${outputAssetsDir}`);
  })();
}
