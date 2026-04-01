const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'public', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const mockupHtml = `
          <!-- 成果展示展示區 -->
          <div id="galleryContent" class="hidden relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div class="flex items-center justify-between mb-8">
              <div>
                <h2 id="themeDisp" class="text-3xl font-black text-white italic tracking-tighter">主題：未命名專案</h2>
                <p class="text-emerald-400 font-bold text-sm tracking-widest uppercase mt-1">✨ 已自動合成全螢幕模擬畫面</p>
              </div>
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

// Replace the entire galleryContent block
const galleryContentRegex = /<div id="galleryContent"[\s\S]*?<\/div>[\s\S]*?<\/div>/;
if (galleryContentRegex.test(content)) {
    content = content.replace(galleryContentRegex, mockupHtml);
    console.log('Match found and replaced.');
} else {
    console.log('No direct match, trying fallback...');
    // Fallback: replace the section starting with id="galleryContent"
    const startIdx = content.indexOf('id="galleryContent"');
    if (startIdx !== -1) {
        // Just replace a chunk
        const containerStart = content.lastIndexOf('<div', startIdx);
        // Find matching end </div> is hard, so we just replace up to where imageGrid ends
        const gridEnd = content.indexOf('</div>', content.indexOf('imageGrid'));
        if (containerStart !== -1 && gridEnd !== -1) {
            content = content.substring(0, containerStart) + mockupHtml + `\n            <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="imageGrid">\n              <!-- JS Inject -->\n            </div>\n          </div>`;
        }
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Update applied.');
