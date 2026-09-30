import { THAILAND_SVG_PROVINCES } from '../app/data/thailand-map-svg';
import { REGIONS, getAllProvinces } from '../app/data/thailand-locations';

console.log('Testing Thailand SVG Map data integrity...');

// 1. Check total count
if (THAILAND_SVG_PROVINCES.length < 77) {
    console.error(`❌ Expected at least 77 provinces, got ${THAILAND_SVG_PROVINCES.length}`);
    process.exit(1);
}
console.log(`✅ [PASS] Found ${THAILAND_SVG_PROVINCES.length} SVG provinces.`);

// 2. Check each province from thailand-locations exists in SVG list
const allLocProvinces = getAllProvinces();
for (const p of allLocProvinces) {
    const matched = THAILAND_SVG_PROVINCES.find(
        (svg) => svg.name === p.name || svg.nameEn.toLowerCase() === p.nameEn.toLowerCase()
    );
    if (!matched) {
        console.error(`❌ Province ${p.name} (${p.nameEn}) missing from SVG map data!`);
        process.exit(1);
    }
}
console.log(`✅ [PASS] All ${allLocProvinces.length} provinces from thailand-locations.ts exist in SVG map.`);

// 3. Check SVG path data and coords
for (const svg of THAILAND_SVG_PROVINCES) {
    if (!svg.d || svg.d.length < 10) {
        console.error(`❌ Province ${svg.name} has invalid SVG path d attribute!`);
        process.exit(1);
    }
    if (isNaN(svg.lat) || isNaN(svg.lon) || svg.lat < 5 || svg.lat > 21 || svg.lon < 97 || svg.lon > 106) {
        console.error(`❌ Province ${svg.name} has invalid latitude/longitude: ${svg.lat}, ${svg.lon}`);
        process.exit(1);
    }
}
console.log('✅ [PASS] All SVG paths and geographic coordinates are valid.');

console.log('🎉 All Thailand Map integrity checks passed successfully!');
