const http = require('http');

http.get('http://localhost:3000', (res) => {
    console.log('==================================================');
    console.log('🛡️ SECURITY HEADERS & CSP AUDIT');
    console.log('==================================================');
    console.log('HTTP Status Code:', res.statusCode);
    console.log('\nResponse Headers:');
    console.log('- Content-Security-Policy:');
    console.log('  ', res.headers['content-security-policy'] || 'MISSING');
    console.log('- X-Content-Type-Options:', res.headers['x-content-type-options'] || 'MISSING');
    console.log('- Referrer-Policy:', res.headers['referrer-policy'] || 'MISSING');
    console.log('- Permissions-Policy:', res.headers['permissions-policy'] || 'MISSING');
    console.log('- Cross-Origin-Opener-Policy:', res.headers['cross-origin-opener-policy'] || 'MISSING');

    const csp = res.headers['content-security-policy'] || '';
    console.log('\n--- Image & Connection Directives Verification ---');
    console.log('✅ img-src self               :', csp.includes("img-src 'self'") ? 'PASS (Local images allowed)' : 'FAIL');
    console.log('✅ img-src data:              :', csp.includes('data:') ? 'PASS (Data URIs allowed)' : 'FAIL');
    console.log('✅ img-src qr-official.line.me:', csp.includes('https://qr-official.line.me') ? 'PASS (LINE QR image allowed)' : 'FAIL');
    console.log('✅ img-src *.line.me          :', csp.includes('https://*.line.me') ? 'PASS (LINE CDN allowed)' : 'FAIL');
    console.log('✅ connect-src *.supabase.co  :', csp.includes('https://*.supabase.co') ? 'PASS (Supabase API allowed)' : 'FAIL');
    console.log('✅ connect-src open-meteo.com :', csp.includes('https://api.open-meteo.com') ? 'PASS (Weather API allowed)' : 'FAIL');
    console.log('==================================================');
}).on('error', (err) => {
    console.error('HTTP Request Error:', err.message);
});
