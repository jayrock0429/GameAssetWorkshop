const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'slot_pipeline.js');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove currentDims reference completely
content = content.replace(/let targetDim = currentDims\[layerKey\];/g, 'let targetDim = null;');

// 2. Fix all_mockup push to include path
content = content.replace(
    /results\.push\(\{ id: "all_mockup", status: "success", isMockup: true \}\);/g,
    'results.push({ id: "all_mockup", path: mockupPath, status: "success", isMockup: true });'
);

// 3. Ensure no remaining mentions of currentDims
if (content.includes('currentDims')) {
    console.log('Caution: currentDims still found, doing secondary cleanup.');
    content = content.replace(/currentDims/g, '{}');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Final Slot Pipeline Fix Applied.');
