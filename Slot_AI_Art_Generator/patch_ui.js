const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Target the gallerySection and its contents
const galleryPlaceholderHeader = '<h3 class="text-xl font-bold text-slate-400 mb-2">等待生成美術資產</h3>';
const themeDispHeader = '<h2 id="themeDisp" class="text-3xl font-black text-white italic tracking-tighter">主題：未命名專案</h2>';

const mockUpSection = `
            <div>
              <h2 id="themeDisp" class="text-3xl font-black text-white italic tracking-tighter">主題：未命名專案</h2>
              <p class="text-emerald-400 font-bold text-sm tracking-widest uppercase mt-1">✨ 已自動合成全螢幕模擬畫面</p>
            </div>

            <!-- 全螢幕模擬大圖 -->
            <div id="mockupContainer" class="mb-12 hidden">
               <div class="p-1 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-slate-700/50 to-blue-500/20 border border-white/10 shadow-2xl overflow-hidden">
                  <div class="relative group cursor-zoom-in">
                    <img id="mockupImg" src="" class="w-full h-auto rounded-[1.4rem]" alt="Game Mockup">
                    <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div class="flex items-center justify-between">
                        <span class="text-white font-bold"><i class="fas fa-expand-arrows-alt mr-2 text-emerald-400"></i>全螢幕模擬畫面 (1920x1080 Mockup)</span>
                        <a id="mockupDownload" href="" download="slot_mockup.png" class="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-colors">
                          <i class="fas fa-download mr-1"></i> 下載全圖
                        </a>
                      </div>
                    </div>
                  </div>
               </div>
            </div>`;

// 1. Update Placeholder Text
content = content.replace('生成的精美圖案將會顯示在此處。', '最終遊戲畫面與各項資產將會顯示在此處。');

// 2. Insert Mockup Container inside galleryContent
// We'll replace the themeDisp wrapper
const themeDispWrapperStart = '<div class="flex items-center justify-between mb-8">';
const themeDispWrapperEnd = '</div>';
const themeDispPos = content.indexOf(themeDispHeader);
if (themeDispPos !== -1) {
    const wrapperStartIdx = content.lastIndexOf(themeDispWrapperStart, themeDispPos);
    const wrapperEndIdx = content.indexOf(themeDispWrapperEnd, themeDispPos) + themeDispWrapperEnd.length;

    if (wrapperStartIdx !== -1 && wrapperEndIdx !== -1) {
        content = content.substring(0, wrapperStartIdx + themeDispWrapperStart.length) + mockUpSection + content.substring(wrapperEndIdx);
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched index.html with mockup UI');
