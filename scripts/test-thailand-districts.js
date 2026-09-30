// Test script for thailand-districts data and search functionality
const fs = require('fs');
const path = require('path');

// Read compiled or parse ts directly
const tsContent = fs.readFileSync(path.join(__dirname, '../app/data/thailand-districts.ts'), 'utf8');

// Quick check of districts count in source code
const districtMatches = tsContent.match(/"id":\s*"[^"]+"/g);
console.log(`[TEST 1] Total districts in thailand-districts.ts: ${districtMatches ? districtMatches.length : 0}`);

if (!districtMatches || districtMatches.length < 920) {
    console.error('FAIL: Expected at least 920 districts');
    process.exit(1);
}

// Regex test for province prefix cleaner
const cleanQuery = (q) => {
    return q.replace(/^(จังหวัด|อำเภอ|เขต|อ\s*\.|จ\s*\.)/g, '').trim().toLowerCase();
};

console.log('[TEST 2] Prefix cleaner tests:');
const testCases = [
    { in: 'จันทบุรี', expected: 'จันทบุรี' },
    { in: 'จ.จันทบุรี', expected: 'จันทบุรี' },
    { in: 'จังหวัดจันทบุรี', expected: 'จันทบุรี' },
    { in: 'อำเภอสอยดาว', expected: 'สอยดาว' },
    { in: 'อ.สอยดาว', expected: 'สอยดาว' },
    { in: 'เขตบางรัก', expected: 'บางรัก' },
];

for (const tc of testCases) {
    const res = cleanQuery(tc.in);
    if (res !== tc.expected) {
        console.error(`FAIL: cleanQuery("${tc.in}") = "${res}", expected "${tc.expected}"`);
        process.exit(1);
    }
}
console.log('PASS: All prefix cleaner tests passed!');

console.log('[TEST 3] Check key districts exist in file:');
const keyDistricts = [
    'สอยดาว',
    'หัวหิน',
    'หาดใหญ่',
    'แม่ริม',
    'บางรัก',
    'เกาะสมุย',
    'ปากช่อง',
    'เบตง',
    'ปาย',
    'เชียงของ'
];

for (const kd of keyDistricts) {
    if (!tsContent.includes(`"name": "${kd}"`)) {
        console.error(`FAIL: District ${kd} not found in thailand-districts.ts`);
        process.exit(1);
    }
}
console.log('PASS: All key districts verified!');
console.log('ALL UNIT CHECKS PASSED SUCCESSFULLY!');
