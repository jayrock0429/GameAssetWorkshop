const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType
    },
  };
}

async function analyzeDisaster() {
  const outputDir = path.join(__dirname, "output_assets");
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
  
  if (files.length === 0) return console.log("No images found.");
  
  // Pick up to 3 random files to analyze
  const samples = files.slice(0, 3);
  console.log("Analyzing samples:", samples);

  const imageParts = samples.map(f => fileToGenerativePart(path.join(outputDir, f), "image/png"));

  const prompt = `這些是 AI 產生的 Slot 老虎機美術圖。使用者說「剛剛生成的都是災難」。
請你以頂尖遊戲美術總監的眼光，嚴厲批判這些圖片。
請專注於：
1. 它是否不是單一物件（例如：自作主張畫了一整台機器、或是帶有UI按鈕的截圖畫面）？
2. 背景是不是沒去背，畫了多餘的裝飾？
3. 圖案是不是變形了、拉伸了、或是有嚴重的畸形邊緣？
請用繁體中文給出簡短但關鍵的致命缺點診斷。`;

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    console.log("=== AI 視覺診斷報告 ===");
    console.log(response.text());
  } catch (error) {
    console.error("Evaluation failed:", error);
  }
}

analyzeDisaster();
