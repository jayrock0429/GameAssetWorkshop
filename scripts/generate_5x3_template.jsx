// 5x3 Slot Layout Template Generator
#target photoshop

function create5x3Template() {
    var doc = app.documents.add(1280, 720, 72, "5x3_Slot_Template_Layout", NewDocumentMode.RGB, DocumentFill.TRANSPARENT);
    
    // 1. Background Group
    var bgGroup = doc.layerSets.add();
    bgGroup.name = "[Background]";
    var bgLayer = bgGroup.artLayers.add();
    bgLayer.name = "BG_Main";
    doc.selection.selectAll();
    fillColor(135, 131, 145); // Neutral Grey-Blue

    // 2. Main Grid Group
    var gridGroup = doc.layerSets.add();
    gridGroup.name = "[UI_Main]";
    
    // Draw 5x3 Blocks
    var startX = 220;
    var startY = 110;
    var itemSize = 160;
    var spacing = 10;

    for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 5; c++) {
            var x = startX + (c * (itemSize + spacing));
            var y = startY + (r * (itemSize + spacing));
            
            var symLayer = gridGroup.artLayers.add();
            symLayer.name = "Symbol_" + c + "_" + r;
            selectRect(x, y, x + itemSize, y + itemSize);
            fillColor(200, 200, 200);
        }
    }

    // 3. Jackpot
    var jpGroup = doc.layerSets.add();
    jpGroup.name = "[Jackpot]";
    var jpLayer = jpGroup.artLayers.add();
    jpLayer.name = "Grand_JP_Display";
    selectRect(510, 20, 770, 80);
    fillColor(255, 215, 0); // Gold

    // 4. Spin Button
    var btnGroup = doc.layerSets.add();
    btnGroup.name = "[UI_Buttons]";
    var spinLayer = btnGroup.artLayers.add();
    spinLayer.name = "btn_spin";
    selectRect(1100, 300, 1250, 450);
    fillColor(0, 255, 100); // Green

    doc.selection.deselect();
    alert("5x3 Slot 佈局模板已生成！\n請儲存為 PSD 並放入項目目錄。");
}

function selectRect(x1, y1, x2, y2) {
    var shapeRef = [ [x1, y1], [x2, y1], [x2, y2], [x1, y2] ];
    app.activeDocument.selection.select(shapeRef);
}

function fillColor(r, g, b) {
    var color = new SolidColor();
    color.rgb.red = r;
    color.rgb.green = g;
    color.rgb.blue = b;
    app.activeDocument.selection.fill(color);
}

create5x3Template();
