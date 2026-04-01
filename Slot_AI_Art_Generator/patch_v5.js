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
            </div>

            <div id="imageGrid" class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <!-- JS Inject -->
            </div>
          </div>`;

// Replace the fallback galleryContent directly
const startMarker = '<div id="galleryContent"';
const nextDivPos = content.indexOf(startMarker);
if (nextDivPos !== -1) {
    // Find the end of this div block by finding the next major section or end of file
    const endMarker = '</section>';
    const endPos = content.indexOf(endMarker, nextDivPos);
    if (endPos !== -1) {
        const newContent = content.substring(0, nextDivPos) + mockupHtml + '\n        ' + content.substring(endPos);
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('UI Overwrite Success');
    }
}
