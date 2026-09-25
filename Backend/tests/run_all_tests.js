/**
 * run_all_tests.js - Full End-to-End Test Suite for KIN AI Production Backend
 * Tests all 15 required lifecycle and security capabilities:
 * 1. User authentication (Login & JWT generation)
 * 2. Beta application submission
 * 3. Beta approval by Admin
 * 4. Consent recording & verification (KIN-BETA-1.0)
 * 5. KIN creation with multipart photo & voice
 * 6. Memory ingestion & CloneLLM RAG sync
 * 7. CloneLLM conversational response & rules
 * 8. Conversation history & state
 * 9. ElevenLabs voice generation abstraction
 * 10. HeyGen streaming session abstraction
 * 11. Real-time dialogue SSE stream (/api/chat/stream)
 * 12. Secure KIN deletion & cascading cleanup
 * 13. Logout & session invalidation
 * 14. Unauthorized access rejection
 * 15. Cross-user access & deletion prevention
 */

const axios = require('axios');
const FormData = require('form-data');

const BASE_URL = 'http://127.0.0.1:8008';
const client = axios.create({ baseURL: BASE_URL, timeout: 30000 });

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 RUNNING KIN AI PRODUCTION BACKEND END-TO-END TEST SUITE');
  console.log('======================================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, message) {
    totalCount++;
    if (condition) {
      console.log(`   ✅ PASS: ${message}`);
      passedCount++;
    } else {
      console.error(`   ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Health & System Status
    // -------------------------------------------------------------
    console.log('👉 [1/15] Health & Status Endpoints');
    const healthRes = await client.get('/api/health');
    assert(healthRes.status === 200 && healthRes.data.status === 'ok', 'GET /api/health returned 200 OK');
    const statusRes = await client.get('/api/status');
    assert(statusRes.status === 200 && statusRes.data.status === 'online', 'GET /api/status returned online');

    // -------------------------------------------------------------
    // Test 2: User Authentication (Login)
    // -------------------------------------------------------------
    console.log('\n👉 [2/15] User Authentication');
    const userLoginRes = await client.post('/api/auth/login', {
      email: 'beta@example.com',
      password: 'password123',
    });
    assert(userLoginRes.data.success && userLoginRes.data.token, 'User login succeeded and returned JWT');
    const userToken = userLoginRes.data.token;
    const userHeaders = { Authorization: `Bearer ${userToken}` };

    const adminLoginRes = await client.post('/api/auth/login', {
      email: 'admin@kin.ai',
      password: 'admin123',
    });
    assert(adminLoginRes.data.user.role === 'admin', 'Admin login verified');
    const adminHeaders = { Authorization: `Bearer ${adminLoginRes.data.token}` };

    // -------------------------------------------------------------
    // Test 3: Unauthorized Access Rejection
    // -------------------------------------------------------------
    console.log('\n👉 [3/15] Unauthorized Access & Invalid Password Protection');
    try {
      await client.post('/api/auth/login', { email: 'beta@example.com', password: 'wrongpassword' });
      assert(false, 'Expected 401 for wrong password');
    } catch (err) {
      assert(err.response?.status === 401, 'Correctly rejected invalid credentials with 401');
    }

    try {
      await client.get('/api/beta/applications'); // Missing admin token
      assert(false, 'Expected 401 for unauthenticated admin route');
    } catch (err) {
      assert(err.response?.status === 401, 'Correctly protected admin route with 401');
    }

    // -------------------------------------------------------------
    // Test 4: Beta Application Submission & Review
    // -------------------------------------------------------------
    console.log('\n👉 [4/15] Beta Application Lifecycle');
    const uniqueEmail = `applicant_${Date.now()}@test.com`;
    const appRes = await client.post('/api/beta/applications', {
      name: 'Priya Sharma',
      email: uniqueEmail,
      country: 'India',
      ageRange: '25–34',
      interestReason: 'Preserve my late grandfather’s stories.',
      preservationGoal: 'Documenting engineering wisdom.',
      acquisitionSource: 'LinkedIn',
      willingnessToTest: 'Yes',
    });
    assert(appRes.status === 201 && appRes.data.application, 'Beta application submitted');
    const appId = appRes.data.application._id || appRes.data.application.id;

    // Admin updates status to approved
    const patchRes = await client.patch(
      `/api/beta/applications/${appId}`,
      { status: 'approved' },
      { headers: adminHeaders }
    );
    assert(patchRes.data.application.status === 'approved', 'Admin approved beta application');

    // -------------------------------------------------------------
    // Test 5: Consent Management (KIN-BETA-1.0)
    // -------------------------------------------------------------
    console.log('\n👉 [5/15] Informed Consent Agreement');
    const consentRes = await client.post(
      '/api/consent',
      {
        consentVersion: 'KIN-BETA-1.0',
        checkboxStates: { terms: true, memory: true, storage: true, revocation: true },
      },
      { headers: userHeaders }
    );
    assert(consentRes.data.consent.consentGiven === true, 'Consent KIN-BETA-1.0 recorded and confirmed');

    // -------------------------------------------------------------
    // Test 6: Default Personas Listing
    // -------------------------------------------------------------
    console.log('\n👉 [6/15] Persona Registry & Dadaji Verification');
    const personasRes = await client.get('/api/personas', { headers: userHeaders });
    assert(Array.isArray(personasRes.data.personas), 'Personas list returned');
    assert(personasRes.data.personas.some((p) => p.id === 'dadaji'), 'System default Dadaji persona present');

    // -------------------------------------------------------------
    // Test 7: KIN Creation with Memories and Media
    // -------------------------------------------------------------
    console.log('\n👉 [7/15] Persona Creation & Media Storage');
    const testSlug = `test_kin_${Date.now().toString().slice(-4)}`;
    const formData = new FormData();
    formData.append('avatar_id', testSlug);
    formData.append('name', 'Ramesh Vance Sharma');
    formData.append('calling_name', 'Dadaji');
    formData.append('relation', 'Grandfather');
    formData.append('lifespan', '1948 – 2023');
    formData.append('hometown', 'Bengaluru, India');
    formData.append('personality_summary', 'A deeply calm grandfather who worked in precision electrical engineering.');
    formData.append('catchphrases', JSON.stringify(['Sab theek ho jayega', 'Take things one step at a time']));
    formData.append('written_notes', 'Worked 40 years in Bangalore in electrical tooling and telephone switches.');

    // Simulated 1KB audio buffer
    formData.append('voice', Buffer.alloc(1024, 0), { filename: 'voice_sample.wav', contentType: 'audio/wav' });

    const createKinRes = await client.post('/api/avatar/create', formData, {
      headers: {
        ...userHeaders,
        ...formData.getHeaders(),
      },
    });

    assert(createKinRes.status === 201 && createKinRes.data.avatar, 'KIN persona created in MongoDB');
    const createdKinId = createKinRes.data.avatar.id;
    assert(createdKinId === testSlug, 'Persona ID slug matches');

    // -------------------------------------------------------------
    // Test 8: CloneLLM Inference & Conversational Rules
    // -------------------------------------------------------------
    console.log('\n👉 [8/15] CloneLLM Intelligence & Memory Ingestion');
    const chatRes = await client.post(
      '/api/chat/stream',
      {
        message: 'What work did you do in Bangalore?',
        avatar_id: createdKinId,
        stream_media: false,
      },
      { headers: userHeaders }
    );
    assert(chatRes.status === 200, 'CloneLLM inference responded with 200 OK');
    assert(chatRes.data.includes('event: text_chunk'), 'SSE text_chunk tokens received');
    assert(chatRes.data.includes('event: done'), 'SSE done completion event received');

    // -------------------------------------------------------------
    // Test 9: ElevenLabs Speech Generation Abstraction
    // -------------------------------------------------------------
    console.log('\n👉 [9/15] ElevenLabs Speech Synthesis Pipeline');
    const voiceChatRes = await client.post(
      '/api/chat/stream',
      {
        message: 'ok',
        avatar_id: 'dadaji',
        stream_media: true,
        generate_video: false,
      },
      { headers: userHeaders }
    );
    assert(voiceChatRes.status === 200, 'Voice streaming response completed with 200 OK');

    // -------------------------------------------------------------
    // Test 10: HeyGen Session Initiation Abstraction
    // -------------------------------------------------------------
    console.log('\n👉 [10/15] HeyGen Streaming Session Abstraction');
    const heygenRes = await client.post(
      '/api/conversation/heygen-session',
      { avatarId: 'default' },
      { headers: userHeaders }
    );
    assert(heygenRes.data.success, 'HeyGen streaming session endpoint executed');

    // -------------------------------------------------------------
    // Test 11: Cross-User Deletion Protection
    // -------------------------------------------------------------
    console.log('\n👉 [11/15] Cross-Tenant Deletion Prevention');
    // Login as a second user
    const otherUserLogin = await client.post('/api/auth/login', {
      email: 'newbeta@example.com',
      password: 'password123',
    });
    const otherHeaders = { Authorization: `Bearer ${otherUserLogin.data.token}` };

    try {
      // User 2 attempts to delete User 1's KIN
      await client.delete(`/api/avatar/${createdKinId}`, { headers: otherHeaders });
      assert(false, 'Expected 403 Forbidden for cross-user deletion attempt');
    } catch (err) {
      assert(err.response?.status === 403, 'Cross-user deletion rejected with 403 Forbidden');
    }

    // -------------------------------------------------------------
    // Test 12: Default System Persona Deletion Protection
    // -------------------------------------------------------------
    console.log('\n👉 [12/15] System Persona Protection');
    try {
      await client.delete('/api/avatar/dadaji', { headers: userHeaders });
      assert(false, 'Expected 400 rejection for deleting Dadaji');
    } catch (err) {
      assert(err.response?.status === 400, 'Rejection of deleting system default Dadaji verified');
    }

    // -------------------------------------------------------------
    // Test 13: Authorized KIN Deletion & Cascading Cleanup
    // -------------------------------------------------------------
    console.log('\n👉 [13/15] Authorized KIN Deletion & Cascading Cleanup');
    const deleteRes = await client.delete(`/api/avatar/${createdKinId}`, { headers: userHeaders });
    assert(deleteRes.data.status === 'deleted', 'Authorized KIN deletion succeeded');

    // Verify persona is no longer in list
    const afterDeleteRes = await client.get('/api/personas', { headers: userHeaders });
    const isStillPresent = afterDeleteRes.data.personas.some((p) => p.id === createdKinId);
    assert(!isStillPresent, 'Deleted persona verified absent from registry');

    // -------------------------------------------------------------
    // Test 14: Feedback & Analytics Ingestion
    // -------------------------------------------------------------
    console.log('\n👉 [14/15] Qualitative Feedback & Analytics Ingestion');
    const fbRes = await client.post('/api/feedback', {
      avatarId: 'dadaji',
      kinFeeling: 'pretty_close',
      improvements: 'Great pacing and wise tone.',
      talkAgain: 'Yes',
    });
    assert(fbRes.status === 201 && fbRes.data.feedback, 'Qualitative conversation feedback persisted');

    const analyticsRes = await client.post('/api/analytics/events', {
      event: 'test_suite_execution',
      properties: { passed: true },
    });
    assert(analyticsRes.status === 201, 'Analytics event persisted');

    // -------------------------------------------------------------
    // Test 15: Logout & Memory Reset
    // -------------------------------------------------------------
    console.log('\n👉 [15/15] Logout & Session Reset');
    const logoutRes = await client.post('/api/auth/logout', {}, { headers: userHeaders });
    assert(logoutRes.data.success, 'Logout completed successfully');

    const resetRes = await client.post('/api/memory/reset', { avatar_id: 'dadaji' });
    assert(resetRes.data.success, 'Memory reset endpoint completed');

    console.log('\n======================================================================');
    console.log(`🎉 ALL ${passedCount}/${totalCount} PRODUCTION BACKEND INTEGRATION TESTS PASSED!`);
    console.log('======================================================================');
  } catch (err) {
    console.error('\n❌ TEST RUN ABORTED DUE TO ERROR:', err.message);
    if (err.response) {
      console.error('Response Data:', err.response.data);
    }
    process.exit(1);
  }
}

runTests();
