const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else if (item.name.endsWith('.js') || item.name.endsWith('.css')) {
            results.push({
                file: item.name,
                fullPath: fullPath.replace(/\\/g, '/'),
                size: fs.statSync(fullPath).size,
            });
        }
    }
    return results;
}

const staticDir = path.join('.next', 'static');
const files = walk(staticDir).sort((a, b) => b.size - a.size);
const totalSize = files.reduce((acc, f) => acc + f.size, 0);

console.log('==================================================');
console.log('📦 NEXT.JS STATIC BUNDLE ANALYSIS');
console.log('==================================================');
console.log(`Total Chunks/Assets : ${files.length} files`);
console.log(`Total Bundle Size   : ${(totalSize / 1024).toFixed(2)} KB (${(totalSize / (1024 * 1024)).toFixed(2)} MB)\n`);

console.log('Top 15 Largest Chunks & Stylesheets:');
files.slice(0, 15).forEach((f, idx) => {
    const kb = (f.size / 1024).toFixed(2).padStart(8, ' ');
    console.log(`  ${String(idx + 1).padStart(2, ' ')}. ${kb} KB  -->  ${f.fullPath}`);
});

console.log('\nAsset Summary by Type:');
const jsFiles = files.filter(f => f.file.endsWith('.js'));
const cssFiles = files.filter(f => f.file.endsWith('.css'));
const jsSize = jsFiles.reduce((acc, f) => acc + f.size, 0);
const cssSize = cssFiles.reduce((acc, f) => acc + f.size, 0);

console.log(`  - JavaScript : ${jsFiles.length} files, ${(jsSize / 1024).toFixed(2)} KB`);
console.log(`  - CSS Styles : ${cssFiles.length} files, ${(cssSize / 1024).toFixed(2)} KB`);
console.log('==================================================');
