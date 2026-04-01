import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 讓 better-sqlite3 以原生 Node.js 模組執行，不被 webpack 打包
  serverExternalPackages: ['better-sqlite3', '@huggingface/transformers', 'onnxruntime-node'],

  // 允許從本機 output 目錄讀取圖片
  images: {
    unoptimized: true,
  },

  // 關閉開發模式底部工具列（"N 1 Issue" 那個 badge）
  devIndicators: false,

  // 允許 localhost:3000 透過 iframe 嵌入此應用
  async headers() {
    return [
      {
        source: '/(.*)', // 套用至所有路由
        headers: [
          // 移除 SAMEORIGIN 限制，改用 CSP frame-ancestors 精確控制
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          // 只允許 localhost:3000（總部監視螢幕）嵌入
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self' http://localhost:3000" },
        ],
      },
    ];
  },
};

export default nextConfig;
