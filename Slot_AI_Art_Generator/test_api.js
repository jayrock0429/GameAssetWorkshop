const fetch = require('node-fetch');

async function testGenerate() {
  const url = 'http://localhost:3000/api/generate';
  const data = {
    designData: {
      theme: "測試主題",
      global_style: "3D glossy",
      targetLayout: "Landscape",
      assets: [
        {
          asset_id: "test_sym",
          psd_layer: "sym",
          image_prompt: "a shiny gold coin",
          tier: "normal",
          aspectRatio: "1:1"
        }
      ]
    },
    gridSize: "5x3"
  };

  console.log("正在測試 /api/generate...");
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    console.log("狀態碼:", response.status);
    const result = await response.json();
    console.log("結果:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("請求發生錯誤:", err.message);
  }
}

testGenerate();
