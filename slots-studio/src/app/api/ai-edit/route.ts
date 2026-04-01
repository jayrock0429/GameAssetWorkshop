import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { instruction, element, url } = body;

    // 這裡未來可以介接真正的 AI 處理邏輯 (例如：呼叫 LLM 產生新的 Tailwind Class 或 CSS)
    console.log('--- 收到 AI 狙擊指令 ---');
    console.log('指令:', instruction);
    console.log('目標元件:', element.tagName, element.id ? `#${element.id}` : '', element.className ? `.${element.className}` : '');
    console.log('來源 URL:', url);
    console.log('HTML 片段:', element.html.substring(0, 500) + (element.html.length > 500 ? '...' : ''));
    console.log('----------------------');

    // 模擬處理延遲
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({ 
      success: true, 
      message: '指令已成功接收並傳送至總部 AI 核心',
      received: { 
        instruction, 
        tagName: element.tagName,
        id: element.id 
      }
    });
  } catch (error) {
    console.error('AI Edit API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
