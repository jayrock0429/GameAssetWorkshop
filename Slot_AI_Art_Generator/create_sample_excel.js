const XLSX = require('xlsx');
const path = require('path');

const data = [
    ["ID", "名稱", "層級", "PSD屬性", "描述"],
    ["bg_main", "主遊戲背景", "Background", "bg", "一個壯觀的金字塔背景，夕陽餘暉，充滿神祕感"],
    ["sym_wild", "古埃及聖甲蟲", "Wild", "sym", "一隻鑲滿寶石的綠色聖甲蟲，背部閃爍著金光"],
    ["sym_high_pay_character_anubis", "死神阿努比斯高標符號", "H-pay", "sym", "手持權杖的胡狼神阿努比斯，穿著法老服飾，眼神犀利"],
    ["pillar_left", "左側石柱", "Pillar", "pillar", "刻滿象形文字的古老石柱，帶有藍色微光"]
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Assets");

const filePath = path.join(__dirname, 'sample_assets.xlsx');
XLSX.writeFile(wb, filePath);
console.log('Sample Excel created at:', filePath);
