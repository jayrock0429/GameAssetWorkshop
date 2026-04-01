const fetch = require('node-fetch');
require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("找不到 GEMINI_API_KEY");
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.models) {
      console.log("可用模型列表：");
      data.models.forEach(m => {
        if (m.name.includes('imagen')) {
          console.log(`- ${m.name} (支援方法: ${m.supportedGenerationMethods.join(', ')})`);
        }
      });
    } else {
      console.log("查無模型或 API 金鑰權限不足。", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("查詢失敗:", err.message);
  }
}

listModels();
