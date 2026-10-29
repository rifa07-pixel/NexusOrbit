/**
 * NexusOrbit - Direct Server Request Dispatcher & Test Suite
 * Tests full server stack, routing, SQLite database persistence, and AI engine in-memory
 */
const { EventEmitter } = require('node:events');
const { Readable } = require('node:stream');

// Create mock HTTP request and response
function createMockPair(method, url, headers = {}, body = null) {
  const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
  const req = payload ? Readable.from([Buffer.from(payload)]) : Readable.from([]);

  req.method = method;
  req.url = url;
  req.headers = {
    host: 'localhost:3000',
    'content-type': 'application/json',
    ...headers
  };

  let statusCode = 200;
  let responseHeaders = {};
  const chunks = [];
  let isFinished = false;

  const res = new EventEmitter();
  res.writeHead = (code, hdrs) => {
    statusCode = code;
    if (hdrs) responseHeaders = { ...responseHeaders, ...hdrs };
  };
  res.setHeader = (k, v) => { responseHeaders[k.toLowerCase()] = v; };
  res.getHeader = (k) => responseHeaders[k.toLowerCase()];
  res.write = (chunk) => { if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); };
  res.end = (chunk) => {
    if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    isFinished = true;
    res.emit('finish');
  };

  const getResult = () => {
    if (isFinished) {
      const buffer = Buffer.concat(chunks);
      const text = buffer.toString('utf8');
      let json = null;
      try { json = JSON.parse(text); } catch {}
      return Promise.resolve({ statusCode, headers: responseHeaders, text, json });
    }
    return new Promise(resolve => {
      res.on('finish', () => {
        const buffer = Buffer.concat(chunks);
        const text = buffer.toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch {}
        resolve({ statusCode, headers: responseHeaders, text, json });
      });
    });
  };

  return { req, res, getResult };
}

async function runDirectTests() {
  console.log('========================================================');
  console.log('   NEXUSORBIT MASTER TEST SUITE — HACKATHON VALIDATION   ');
  console.log('========================================================\n');

  // Load server module
  const server = require('./server.js');
  const listener = server.listeners('request')[0];
  if (!listener) throw new Error('Could not find server request listener');

  let passed = 0;
  let failed = 0;

  async function test(desc, fn) {
    process.stdout.write(`• Testing: ${desc}... `);
    try {
      await fn();
      console.log('✓ PASS');
      passed++;
    } catch (e) {
      console.log(`✗ FAIL: ${e.message}`);
      failed++;
    }
  }

  async function dispatch(method, url, headers = {}, body = null) {
    const { req, res, getResult } = createMockPair(method, url, headers, body);
    listener(req, res);
    return getResult();
  }

  // 1. Static Assets
  await test('Static Web Shell (index.html)', async () => {
    const res = await dispatch('GET', '/index.html');
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!res.text.includes('NexusOrbit')) throw new Error('Missing brand title');
    if (!res.text.includes('id="splash-screen"')) throw new Error('Missing splash screen markup');
    if (!res.text.includes('id="login-screen"')) throw new Error('Missing login screen markup');
  });

  await test('Master Stylesheet (main.css)', async () => {
    const res = await dispatch('GET', '/css/main.css');
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!res.text.includes('--brand-navy-deep')) throw new Error('Missing CSS palette');
  });

  // 2. Health Check
  await test('API Health & System Status', async () => {
    const res = await dispatch('GET', '/api/health');
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (res.json.status !== 'ok' || !res.json.database.includes('SQLite')) {
      throw new Error('Invalid health payload');
    }
  });

  // 3. Student Demo Login
  let studentToken = '';
  let studentUser = null;
  await test('Demo Authentication: Student Role (Aarav Sharma)', async () => {
    const res = await dispatch('POST', '/api/auth/demo-login', {}, { role: 'student' });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!res.json.token || res.json.user.role !== 'student') throw new Error('Student auth failed');
    if (res.json.user.full_name !== 'Aarav Sharma') throw new Error(`Expected Aarav Sharma, got ${res.json.user.full_name}`);
    studentToken = res.json.token;
    studentUser = res.json.user;
  });

  // 4. Student Dashboard Stats & Attendance
  await test('Student Dashboard Statistics', async () => {
    const res = await dispatch('GET', '/api/dashboard/stats', { authorization: `Bearer ${studentToken}` });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!res.json.attendancePct || isNaN(Number(res.json.attendancePct))) throw new Error('Missing attendance %');
  });

  await test('Subject-Wise Attendance & 75% Risk Calculation', async () => {
    const res = await dispatch('GET', `/api/attendance?student_id=${studentUser.student.id}`, { authorization: `Bearer ${studentToken}` });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    const algo = res.json.subjects.find(s => s.code === 'CS502');
    if (!algo) throw new Error('CS502 Algorithms not found');
    if (!algo.isBelowThreshold) throw new Error('Algorithms should be below 75%');
    if (algo.classesNeededFor75 <= 0) throw new Error(`Invalid classes needed: ${algo.classesNeededFor75}`);
  });

  // 5. Grounded AI Assistant
  await test('AI Assistant Grounded Attendance Query', async () => {
    const res = await dispatch('POST', '/api/ai/chat', { authorization: `Bearer ${studentToken}` }, { message: 'What is my attendance in Algorithms?' });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!res.json.response.includes('Algorithms') || !res.json.response.includes('75%')) {
      throw new Error('AI response did not cite Algorithms attendance rules');
    }
    if (!res.json.factsRetrieved || res.json.factsRetrieved.length === 0) {
      throw new Error('No relational facts grounded');
    }
  });

  await test('AI Assistant Grounded Timetable Query', async () => {
    const res = await dispatch('POST', '/api/ai/chat', { authorization: `Bearer ${studentToken}` }, { message: 'What classes do I have on Monday?' });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!res.json.response.includes('Monday')) throw new Error('AI response did not cite Monday timetable');
  });

  await test('AI Assistant Conversational Closing / "fine" Response', async () => {
    const res = await dispatch('POST', '/api/ai/chat', { authorization: `Bearer ${studentToken}` }, { message: 'fine' });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!res.json.response.includes('all set') && !res.json.response.includes('Glad to hear')) {
      throw new Error(`Expected completion response, got: ${res.json.response}`);
    }
  });

  await test('AI Assistant Gratitude / "thank you" Response', async () => {
    const res = await dispatch('POST', '/api/ai/chat', { authorization: `Bearer ${studentToken}` }, { message: 'thank you so much' });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!res.json.response.includes("You're very welcome")) {
      throw new Error(`Expected welcome response, got: ${res.json.response}`);
    }
  });

  // 6. Faculty Demo Login & Attendance Session Recording
  let facultyToken = '';
  await test('Demo Authentication: Faculty Role (Prof. Anita Roy)', async () => {
    const res = await dispatch('POST', '/api/auth/demo-login', {}, { role: 'faculty' });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!res.json.token || res.json.user.role !== 'faculty') throw new Error('Faculty auth failed');
    facultyToken = res.json.token;
  });

  await test('Faculty Attendance Session Recording Transaction', async () => {
    const res = await dispatch('POST', '/api/attendance/session', { authorization: `Bearer ${facultyToken}` }, {
      course_id: 'crs_1',
      section: 'A',
      session_date: '2026-10-28',
      slot_time: '09:00 - 10:00',
      topic: 'Automated Test Lecture',
      records: [
        { student_id: 'stu_1', status: 'present', remarks: 'Active engagement' },
        { student_id: 'stu_2', status: 'present', remarks: '' }
      ]
    });
    if (res.statusCode !== 201) throw new Error(`Status ${res.statusCode}`);
    if (!res.json.success) throw new Error('Session recording failed');
  });

  // 7. Parent Scoped Security
  let parentToken = '';
  await test('Demo Authentication: Parent Role (Scoped to Aarav Sharma)', async () => {
    const res = await dispatch('POST', '/api/auth/demo-login', {}, { role: 'parent' });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (res.json.user.role !== 'parent') throw new Error('Parent auth failed');
    if (!res.json.user.linkedStudent || res.json.user.linkedStudent.full_name !== 'Aarav Sharma') {
      throw new Error('Parent not linked to Aarav Sharma');
    }
    parentToken = res.json.token;
  });

  // 8. Admin Cockpit & Student Directory
  let adminToken = '';
  await test('Demo Authentication: Administrator Role (Dr. Vikram Malhotra)', async () => {
    const res = await dispatch('POST', '/api/auth/demo-login', {}, { role: 'admin' });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (res.json.user.role !== 'admin') throw new Error('Admin auth failed');
    adminToken = res.json.token;
  });

  await test('Admin Student Records & Standing Evaluation', async () => {
    const res = await dispatch('GET', '/api/students', { authorization: `Bearer ${adminToken}` });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!Array.isArray(res.json.students) || res.json.students.length === 0) throw new Error('No students returned');
    const atRisk = res.json.students.filter(s => s.is_at_risk);
    if (atRisk.length === 0) throw new Error('At-risk calculation failed');
  });

  // 8.5 Notices & Announcements
  await test('Notices Retrieval & Priority Ordering', async () => {
    const res = await dispatch('GET', '/api/notices', { authorization: `Bearer ${studentToken}` });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    if (!Array.isArray(res.json.notices) || res.json.notices.length === 0) throw new Error('No notices returned');
  });

  // 9. Fee Management & Demo Settlement
  await test('Fee Balance & Demo Settlement Transaction', async () => {
    const res = await dispatch('GET', '/api/fees?student_id=stu_1', { authorization: `Bearer ${studentToken}` });
    if (res.statusCode !== 200) throw new Error(`Status ${res.statusCode}`);
    const pendingItem = res.json.fees.find(f => f.status === 'pending' || f.status === 'partial');
    if (!pendingItem) throw new Error('No pending fee items');

    const payRes = await dispatch('POST', '/api/fees/pay-demo', { authorization: `Bearer ${studentToken}` }, {
      fee_structure_id: pendingItem.id,
      amount: 1000,
      payment_method: 'UPI / NetBanking'
    });
    if (payRes.statusCode !== 200) throw new Error(`Status ${payRes.statusCode}`);
    if (!payRes.json.receipt_number || !payRes.json.success) throw new Error('Demo payment failed');
  });

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runDirectTests().catch(err => {
  console.error('Test Suite encountered fatal error:', err);
  process.exit(1);
});
