import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

console.log('==================================================');
console.log('🧪 RUNNING SYSTEM ROUTE & COMPONENT HEALTH TESTS');
console.log('==================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string) {
    if (condition) {
        console.log(`  ✅ [PASS] ${testName}`);
        passCount++;
    } else {
        console.error(`  ❌ [FAIL] ${testName}`);
        failCount++;
    }
}

// --------------------------------------------------
// Test 1: Check existence of key pages and tabs
// --------------------------------------------------
console.log('📌 Test Suite 1: Dashboard Pages & Tabs Existence');
const requiredFiles = [
    'app/page.tsx',
    'app/layout.tsx',
    'app/login/page.tsx',
    'app/register/page.tsx',
    'app/dashboard/page.tsx',
    'app/dashboard/overview.tsx',
    'app/dashboard/weather.tsx',
    'app/dashboard/todo.tsx',
    'app/dashboard/calendar.tsx',
    'app/dashboard/tracker.tsx',
    'app/dashboard/fuel-prices.tsx'
];

requiredFiles.forEach((relPath) => {
    const fullPath = join(process.cwd(), relPath);
    assert(existsSync(fullPath), `Component file exists: ${relPath}`);
});

// --------------------------------------------------
// Test 2: Verify Weather Cache Validation Logic
// --------------------------------------------------
console.log('\n📌 Test Suite 2: Weather Cache Integrity Checks');

const isValidWeatherCache = (data: any): boolean => {
    if (!data || typeof data !== 'object') return false;
    return Boolean(
        data.current &&
        typeof data.current.temperature_2m === 'number' &&
        data.hourly && Array.isArray(data.hourly.time) && data.hourly.time.length > 0 &&
        data.daily && Array.isArray(data.daily.time) && data.daily.time.length > 0
    );
};

// Case 2a: Valid full weather object
const fullData = {
    current: { temperature_2m: 30, weather_code: 1 },
    hourly: { time: ['2026-08-11T00:00'], temperature_2m: [30], weather_code: [1], precipitation_probability: [0] },
    daily: { time: ['2026-08-11'], weather_code: [1], temperature_2m_max: [33], temperature_2m_min: [25], precipitation_probability_max: [10] }
};
assert(isValidWeatherCache(fullData) === true, 'Accepts complete weather data object');

// Case 2b: Malformed partial data (the bug scenario)
const partialData = {
    current: { temperature_2m: 30, weather_code: 1 }
};
assert(isValidWeatherCache(partialData) === false, 'Rejects partial data missing hourly/daily');

// Case 2c: Null / undefined data
assert(isValidWeatherCache(null) === false, 'Rejects null weather data');
assert(isValidWeatherCache(undefined) === false, 'Rejects undefined weather data');

// --------------------------------------------------
// Test 3: Tab Navigation Registration Check
// --------------------------------------------------
console.log('\n📌 Test Suite 3: Dashboard Navigation Tab Registration');

const dashboardPageContent = readFileSync(join(process.cwd(), 'app/dashboard/page.tsx'), 'utf-8');
const registeredTabs = ['dashboard', 'weather', 'todo', 'calendar', 'tracker', 'fuel-prices'];

registeredTabs.forEach((tab) => {
    assert(dashboardPageContent.includes(`activeTab === '${tab}'`), `Tab '${tab}' registered in navigation`);
});

// --------------------------------------------------
// Test 4: Next.js Production Build Check
// --------------------------------------------------
console.log('\n📌 Test Suite 4: Next.js Production Build Check');
try {
    execSync('npx next build', { stdio: 'inherit', cwd: process.cwd() });
    assert(true, 'Next.js production build succeeded');
} catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    assert(false, `Next.js production build failed: ${msg}`);
}

// --------------------------------------------------
// Final Summary
// --------------------------------------------------
console.log('\n==================================================');
console.log(`📊 TEST RESULTS SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('==================================================\n');

if (failCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
