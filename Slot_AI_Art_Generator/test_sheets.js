const fetch = require('node-fetch');
require('dotenv').config();

async function testSheets() {
  const url = process.env.TRACKING_URL;
  if (!url) {
    console.error("找不到 TRACKING_URL");
    return;
  }
  console.log(`正在測試網址: ${url}`);
  
  const testData = {
    theme: "連線測試",
    asset_id: "test",
    status: "success",
    cost: 0,
    prompt: "test",
    path: "test.png"
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    console.log(`狀態碼: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`回應內容: ${text}`);
  } catch (err) {
    console.error("傳送失敗:", err.message);
  }
}

testSheets();
