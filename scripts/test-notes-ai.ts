import { buildNongBaseChatPrompt } from '../app/data/prompts/nong-base-prompt';
import { analyzeLineIntent } from '../utils/line/ai-intent';

console.log('====================================================');
console.log('🧪 RUNNING SMART NOTES & AI SECOND BRAIN E2E TESTS');
console.log('====================================================\n');

async function runTests() {
    let passed = 0;
    let failed = 0;

    const assert = (condition: boolean, name: string) => {
        if (condition) {
            console.log(`  ✅ [PASS] ${name}`);
            passed++;
        } else {
            console.error(`  ❌ [FAIL] ${name}`);
            failed++;
        }
    };

    // -------------------------------------------------------------------------
    // TEST 1: LINE Intent Recognition for Saving Notes (จดสเปกคอม)
    // -------------------------------------------------------------------------
    console.log('📌 Test 1: LINE Intent Parsing for Saving Notes');
    const saveMessage = 'จดสเปกคอมให้หน่อย CPU Ryzen 5, GPU RTX 9060XT, RAM 32GB';
    console.log(`   Input message: "${saveMessage}"`);

    const saveResult = await analyzeLineIntent(saveMessage);
    const saveAction = Array.isArray(saveResult) ? saveResult[0]?.action : saveResult?.action;
    console.log(`   Detected Action: ${saveAction}`);
    assert(saveAction === 'save_note', 'Successfully recognizes "save_note" intent');

    // -------------------------------------------------------------------------
    // TEST 2: LINE Intent Recognition for Querying Notes (ถามสเปกคอม)
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 2: LINE Intent Parsing for Querying Notes');
    const queryMessage = 'สเปกคอมผมอะไรนะ';
    console.log(`   Input message: "${queryMessage}"`);

    const queryResult = await analyzeLineIntent(queryMessage);
    const queryAction = Array.isArray(queryResult) ? queryResult[0]?.action : queryResult?.action;
    console.log(`   Detected Action: ${queryAction}`);
    assert(queryAction === 'query_note', 'Successfully recognizes "query_note" intent');

    // -------------------------------------------------------------------------
    // TEST 3: System Prompt Injection with Knowledge / Notes Context
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 3: Nong Base Knowledge & Memory Context Injection');
    const mockBriefingData = {
        userName: 'คุณเน็ค',
        weather: { temp: '31°C', desc: 'ท้องฟ้าโปร่ง' },
        todos: { total: 2, completed: 1, percent: 50, list: ['อ่านหนังสือ'] },
        events: [],
        expenses: { balance: '฿5,000', income: '฿0', expense: '฿0' },
        notes: [
            {
                title: 'สเปกคอมพิวเตอร์สำหรับทำงานและเล่นเกม',
                content: 'ประกอบคอมใหม่เมื่อต้นปี 2026 ทำงานลื่นไหลมาก',
                tags: ['คอมพิวเตอร์', 'สเปก', 'gaming'],
                key_facts: {
                    CPU: 'AMD Ryzen 5 7600X',
                    GPU: 'Radeon RX 9060XT 16GB',
                    RAM: '32GB DDR5 6000MHz',
                    SSD: '1TB M.2 NVMe',
                },
            },
        ],
    };

    const chatPrompt = buildNongBaseChatPrompt(
        'สเปกคอมผมคืออะไร มี cpu กับ gpu อะไรบ้าง',
        [],
        mockBriefingData
    );

    assert(chatPrompt.includes('สเปกคอมพิวเตอร์สำหรับทำงานและเล่นเกม'), 'Prompt contains note title');
    assert(chatPrompt.includes('AMD Ryzen 5 7600X'), 'Prompt contains extracted CPU fact');
    assert(chatPrompt.includes('Radeon RX 9060XT 16GB'), 'Prompt contains extracted GPU fact');

    // -------------------------------------------------------------------------
    // TEST 4: Live AI Response from Nong Base using the Note Context
    // -------------------------------------------------------------------------
    console.log('\n📌 Test 4: Live AI Answer Generation using User Notes Context');
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
        try {
            console.log('   Sending query to Gemini 3.1 Flash Lite with injected note context...');
            const response = await fetch(
                'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey,
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: chatPrompt }] }],
                    }),
                }
            );

            if (response.ok) {
                const resData = await response.json();
                const aiReply = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                console.log(`   🤖 [Nong Base Reply]:\n"${aiReply.trim()}"\n`);

                const hasCpu = /Ryzen\s*5/i.test(aiReply);
                const hasGpu = /9060/i.test(aiReply);
                assert(hasCpu && hasGpu, 'Nong Base accurately answers with user CPU (Ryzen 5) and GPU (9060XT)');
            } else {
                console.log(`   (Gemini returned status ${response.status})`);
            }
        } catch (err) {
            console.warn('   (Live AI fetch test skipped or network unavailable)', err);
        }
    } else {
        console.log('   (GEMINI_API_KEY not configured in env, tested fallback prompt)');
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log('\n====================================================');
    console.log(`📊 TEST FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
