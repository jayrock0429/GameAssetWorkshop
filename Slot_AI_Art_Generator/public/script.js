/**
 * Slot AI 美術生成中心 - 前端邏輯 (Vanilla JS)
 * 支援 Excel 上傳與進階 UI 回饋
 */

const dropZone = document.getElementById('dropZone');
const excelFile = document.getElementById('excelFile');
const fileNameDisp = document.getElementById('fileNameDisp');
const btnParse = document.getElementById('btnParse');
const parseLoader = document.getElementById('parseLoader');
const selectionSection = document.getElementById('selectionSection');
const assetList = document.getElementById('assetList');
const btnGenerate = document.getElementById('btnGenerate');
const generateLoader = document.getElementById('generateLoader');
const btnSelectAll = document.getElementById('btnSelectAll');
const btnInvertSelect = document.getElementById('btnInvertSelect');

const statusBox = document.getElementById('statusBox');
const statusDetail = document.getElementById('statusDetail');
const galleryPlaceholder = document.getElementById('galleryPlaceholder');
const galleryContent = document.getElementById('galleryContent');
const imageGrid = document.getElementById('imageGrid');
const themeDisp = document.getElementById('themeDisp');

let currentDesignData = null;

// 讓點擊 DropZone 也等同於點擊 Input
dropZone.addEventListener('click', () => excelFile.click());

// 處理檔案拖曳
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        excelFile.files = e.dataTransfer.files;
        handleFileSelect();
    }
});

excelFile.addEventListener('change', handleFileSelect);

function handleFileSelect() {
    if (excelFile.files.length) {
        fileNameDisp.textContent = `已選取：${excelFile.files[0].name}`;
        fileNameDisp.classList.add('text-emerald-400');
        // 重置狀態
        selectionSection.classList.add('hidden');
        resetGallery();
    }
}

// 處理風格下拉選單邏輯
const styleSelector = document.getElementById('styleSelector');
const customStyleContainer = document.getElementById('customStyleContainer');
const customStyleInput = document.getElementById('customStyle');

styleSelector.addEventListener('change', () => {
    if (styleSelector.value === 'CUSTOM') {
        customStyleContainer.classList.remove('hidden');
        customStyleInput.focus();
    } else {
        customStyleContainer.classList.add('hidden');
        customStyleInput.value = ''; // 清除輸入
    }
});

// Step 1: 解析按鈕
btnParse.addEventListener('click', async () => {
    if (!excelFile.files.length) {
        return alert('請先選取企劃專用的 Excel 檔案！');
    }

    const file = excelFile.files[0];
    const formData = new FormData();
    formData.append('excelFile', file);

    const selectedLayout = document.querySelector('input[name="targetLayout"]:checked').value;
    const cols = document.getElementById('gridCols').value || 5;
    const rows = document.getElementById('gridRows').value || 3;
    const selectedGrid = `${cols}x${rows}`; // 組合盤面規格

    // 決定最終要傳遞的風格字串
    let finalStyle = '';
    const selectedStyleValue = styleSelector.value;

    if (selectedStyleValue === 'CUSTOM') {
        finalStyle = customStyleInput.value.trim();
    } else if (selectedStyleValue === 'AI_DIRECTOR') {
        finalStyle = ''; // 留空讓 AI 自己決定
    } else {
        finalStyle = selectedStyleValue; // 使用預設的英文 Prompt
    }

    formData.append('targetLayout', selectedLayout);
    formData.append('gridSize', selectedGrid); // 傳遞給後端
    formData.append('customStyle', finalStyle);

    setParseLoading(true);

    try {
        const response = await fetch('/api/parse', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            currentDesignData = data.designData;
            renderSelectionList(data.designData);
        } else {
            alert('解析失敗：' + data.error);
        }

    } catch (error) {
        console.error('Parse Error:', error);
        alert('無法連線至伺服器，請確保後端已啟動。');
    } finally {
        setParseLoading(false);
    }
});

function renderSelectionList(designData) {
    selectionSection.classList.remove('hidden');
    assetList.innerHTML = '';

    designData.assets.forEach(asset => {
        const item = document.createElement('label');
        item.className = "flex items-start gap-3 p-3 rounded-xl border border-white/5 hover:bg-white/5 cursor-pointer mb-2 transition-colors";
        item.innerHTML = `
            <input type="checkbox" class="asset-checkbox mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500" value="${asset.asset_id}" checked>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-200 break-all">${asset.asset_id}</p>
                <p class="text-xs text-slate-500">${asset.tier} | ${asset.psd_layer}</p>
            </div>
        `;
        assetList.appendChild(item);
    });

    selectionSection.scrollIntoView({ behavior: 'smooth' });
}

// 全選 / 反選
btnSelectAll.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.asset-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    btnSelectAll.textContent = allChecked ? '全選' : '取消全選';
});

btnInvertSelect.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.asset-checkbox');
    checkboxes.forEach(cb => cb.checked = !cb.checked);
});

// Step 2: 生成按鈕
let currentAbortController = null;

const btnAbort = document.getElementById('btnAbort');
btnAbort.addEventListener('click', () => {
    if (currentAbortController) {
        currentAbortController.abort();
    }
});

btnGenerate.addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('.asset-checkbox:checked');
    if (checkboxes.length === 0) {
        return alert('請至少選取一個資產進行生成！');
    }

    const selectedAssetIds = Array.from(checkboxes).map(cb => cb.value);

    setGenerateLoading(true);
    resetGallery();
    currentAbortController = new AbortController();

    const cols = document.getElementById('gridCols').value || 5;
    const rows = document.getElementById('gridRows').value || 3;
    const selectedGrid = `${cols}x${rows}`;

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: currentAbortController.signal,
            body: JSON.stringify({
                designData: currentDesignData,
                selectedAssetIds: selectedAssetIds,
                gridSize: selectedGrid
            })
        });

        const data = await response.json();

        if (data.success) {
            renderGallery(data);
        } else {
            alert('生成失敗：' + data.error);
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('User aborted generation.');
            alert('您已手動停止生成作業。');
        } else {
            console.error('Generate Error:', error);
            alert('無法連線至伺服器或發生錯誤。');
        }
    } finally {
        setGenerateLoading(false);
        currentAbortController = null;
    }
});

function setParseLoading(isLoading) {
    btnParse.disabled = isLoading;
    if (isLoading) {
        parseLoader.classList.remove('hidden');
        btnParse.querySelector('span').textContent = '解析中...';
    } else {
        parseLoader.classList.add('hidden');
        btnParse.querySelector('span').textContent = 'Step 1: 解析企劃書';
    }
}

function setGenerateLoading(isLoading) {
    // 鎖定所有輸入元素
    btnGenerate.disabled = isLoading;
    btnParse.disabled = isLoading;
    document.getElementById('excelFile').disabled = isLoading;
    document.getElementById('gridCols').disabled = isLoading;
    document.getElementById('gridRows').disabled = isLoading;
    document.getElementById('styleSelector').disabled = isLoading;
    document.getElementById('customStyle').disabled = isLoading;
    document.querySelectorAll('input[name="targetLayout"]').forEach(r => r.disabled = isLoading);
    document.querySelectorAll('.asset-checkbox').forEach(cb => cb.disabled = isLoading);
    document.getElementById('btnSelectAll').disabled = isLoading;
    document.getElementById('btnInvertSelect').disabled = isLoading;

    if (isLoading) {
        btnGenerate.classList.add('hidden');
        btnAbort.classList.remove('hidden');
        generateLoader.classList.remove('hidden');
        statusBox.classList.remove('hidden');
        statusDetail.textContent = '正在呼叫 Imagen 4.0 並執行智慧裁切與去背... (可隨時點擊停止)';
    } else {
        btnGenerate.classList.remove('hidden');
        btnAbort.classList.add('hidden');
        generateLoader.classList.add('hidden');
        statusBox.classList.add('hidden');
        btnGenerate.querySelector('span').textContent = 'Step 2: 開始生成選取項';
    }
}

function resetGallery() {
    galleryPlaceholder.classList.remove('hidden');
    galleryContent.classList.add('hidden');
    imageGrid.innerHTML = '';
}

function renderGallery(data) {
    galleryPlaceholder.classList.add('hidden');
    galleryContent.classList.remove('hidden');
    themeDisp.textContent = `主題：${data.theme}`;

    // 重置 Mockup 區域
    const mockupContainer = document.getElementById('mockupContainer');
    const mockupImg = document.getElementById('mockupImg');
    const mockupDownload = document.getElementById('mockupDownload');
    mockupContainer.classList.add('hidden');

    data.results.forEach(item => {
        // 特別處理全畫面模擬圖
        if (item.isMockup && item.status === 'success') {
            const timeStamp = new Date().getTime();
            const mockupUrl = `/output_assets/final_game_mockup.png?t=${timeStamp}`;
            mockupImg.src = mockupUrl;
            mockupDownload.href = mockupUrl;
            mockupContainer.classList.remove('hidden');
            return; // 不放入下方的 grid
        }

        const card = document.createElement('div');
        card.className = "group glass-panel p-4 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all duration-300";

        if (item.status === 'success') {
            const timeStamp = new Date().getTime();
            const imgUrl = `/output_assets/${item.id}.png?t=${timeStamp}`;
            card.innerHTML = `
                <div class="aspect-square bg-slate-800/50 rounded-xl mb-4 overflow-hidden shadow-inner group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-shadow">
                    <img src="${imgUrl}" class="w-full h-full object-contain p-2" alt="${item.id}">
                </div>
                <div class="flex items-start justify-between gap-2">
                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter break-all leading-tight">${item.id}</span>
                    <i class="fas fa-check-circle text-emerald-500 text-[10px] mt-0.5"></i>
                </div>
            `;
        } else {
            card.innerHTML = `
                <div class="aspect-square bg-red-900/10 rounded-xl mb-4 flex items-center justify-center p-4">
                    <span class="text-[10px] text-red-400 text-center leading-tight">生成失敗：<br>${item.error}</span>
                </div>
                <div class="flex items-start justify-between gap-2">
                    <span class="text-[10px] font-bold text-slate-400 uppercase break-all leading-tight">${item.id}</span>
                </div>
            `;
        }
        imageGrid.appendChild(card);
    });

    galleryContent.scrollIntoView({ behavior: 'smooth' });
}
