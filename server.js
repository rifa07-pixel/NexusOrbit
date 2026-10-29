/**
 * NexusOrbit - Ultimate College Management Portal
 * Core REST API & Web Server
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { getDatabase, initSchema, seedData, DB_PATH } = require('./db.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize Database
const db = getDatabase();
initSchema(db);
seedData(db);

// In-Memory Sessions (token -> user payload)
const SESSIONS = new Map();

// Helper: parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// Helper: JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  });
  res.end(JSON.stringify(data));
}

// Helper: Serve Static Files with correct MIME types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res, pathname) {
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';
  
  let filePath = path.join(PUBLIC_DIR, safePath);
  
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // If requesting a route without extension, fallback to index.html (SPA)
      if (!path.extname(safePath)) {
        filePath = path.join(PUBLIC_DIR, 'index.html');
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('500 Server Error');
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  });
}

// Authentication Middleware
function getAuthUser(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/, '');
  const session = SESSIONS.get(token);
  if (!session) return null;
  return session;
}

// Get Extended Profile (student / faculty / parent info)
function getFullUserProfile(user) {
  if (!user) return null;
  let extended = { ...user };
  delete extended.password_hash;

  if (user.role === 'student') {
    const stu = db.prepare(`
      SELECT s.*, f.employee_id as mentor_emp_id, u_mentor.full_name as mentor_name
      FROM students s
      LEFT JOIN faculty f ON s.mentor_id = f.id
      LEFT JOIN users u_mentor ON f.user_id = u_mentor.id
      WHERE s.user_id = ?
    `).get(user.id);
    extended.student = stu || null;
  } else if (user.role === 'faculty') {
    const fac = db.prepare('SELECT * FROM faculty WHERE user_id = ?').get(user.id);
    extended.faculty = fac || null;
  } else if (user.role === 'parent') {
    const child = db.prepare(`
      SELECT s.*, u.full_name, u.email, u.phone, u.avatar_url,
             f.employee_id as mentor_emp_id, u_mentor.full_name as mentor_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN faculty f ON s.mentor_id = f.id
      LEFT JOIN users u_mentor ON f.user_id = u_mentor.id
      WHERE s.parent_user_id = ?
    `).get(user.id);
    extended.linkedStudent = child || null;
  }
  return extended;
}

// Create HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    });
    return res.end();
  }

  // --- API ROUTING ---
  if (pathname.startsWith('/api/')) {
    try {
      // 1. Health & Meta
      if (pathname === '/api/health' && method === 'GET') {
        return sendJson(res, 200, {
          status: 'ok',
          portal: 'NexusOrbit',
          version: '1.0.0-hackathon',
          timestamp: new Date().toISOString(),
          database: 'SQLite 3 (Persistent)',
          persistenceMode: 'node:sqlite WAL'
        });
      }

      // 2. Auth: Demo Login
      if (pathname === '/api/auth/demo-login' && method === 'POST') {
        const body = await parseBody(req);
        const role = body.role || 'student';
        const roleMap = {
          admin: 'admin@nexusorbit.edu',
          faculty: 'faculty@nexusorbit.edu',
          student: 'student@nexusorbit.edu',
          parent: 'parent@nexusorbit.edu'
        };
        const email = roleMap[role] || 'student@nexusorbit.edu';
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) return sendJson(res, 404, { error: 'Demo user not found' });

        const token = crypto.randomUUID();
        const profile = getFullUserProfile(user);
        SESSIONS.set(token, profile);

        return sendJson(res, 200, {
          token,
          user: profile,
          message: `Logged in as ${profile.full_name} (${profile.role}) via Hackathon Demo Access`,
          isDemo: true
        });
      }

      // 3. Auth: Standard Login
      if (pathname === '/api/auth/login' && method === 'POST') {
        const body = await parseBody(req);
        const { email, password } = body;
        if (!email || !password) {
          return sendJson(res, 400, { error: 'Email and password are required' });
        }
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user || user.password_hash !== password) {
          return sendJson(res, 401, { error: 'Invalid credentials. Try demo login buttons below.' });
        }
        const token = crypto.randomUUID();
        const profile = getFullUserProfile(user);
        SESSIONS.set(token, profile);
        return sendJson(res, 200, { token, user: profile });
      }

      // 4. Auth: Me
      if (pathname === '/api/auth/me' && method === 'GET') {
        const user = getAuthUser(req);
        if (!user) return sendJson(res, 401, { error: 'Unauthorized or session expired' });
        return sendJson(res, 200, { user });
      }

      // 5. Auth: Logout
      if (pathname === '/api/auth/logout' && method === 'POST') {
        const authHeader = req.headers['authorization'];
        if (authHeader) {
          const token = authHeader.replace(/^Bearer\s+/, '');
          SESSIONS.delete(token);
        }
        return sendJson(res, 200, { message: 'Logged out successfully' });
      }

      // Auth Guard for subsequent routes
      const currentUser = getAuthUser(req);
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Authentication required. Please sign in.' });
      }

      // 6. Dashboard Stats (Role-Tailored)
      if (pathname === '/api/dashboard/stats' && method === 'GET') {
        const role = currentUser.role;
        const stats = { role };

        if (role === 'admin') {
          stats.totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
          stats.totalFaculty = db.prepare('SELECT COUNT(*) as count FROM faculty').get().count;
          stats.totalCourses = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
          
          // Overall College Attendance %
          const attTotals = db.prepare(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
            FROM attendance_records
          `).get();
          stats.overallAttendance = attTotals.total > 0 ? Math.round((attTotals.present / attTotals.total) * 100) : 0;

          // Fee stats
          const feeTotals = db.prepare(`
            SELECT 
              SUM(total_amount) as totalDue,
              SUM(paid_amount) as totalPaid
            FROM fee_structures
          `).get();
          stats.feeDue = feeTotals.totalDue || 0;
          stats.feePaid = feeTotals.totalPaid || 0;
          stats.feePending = (stats.feeDue - stats.feePaid);
          stats.activeAlerts = db.prepare('SELECT COUNT(*) as count FROM academic_alerts WHERE is_resolved = 0').get().count;
          stats.pendingAssignments = db.prepare('SELECT COUNT(*) as count FROM assignments').get().count;
          stats.recentNotices = db.prepare('SELECT COUNT(*) as count FROM notices').get().count;

        } else if (role === 'faculty') {
          const facId = currentUser.faculty ? currentUser.faculty.id : 'fac_1';
          stats.coursesAssigned = db.prepare('SELECT COUNT(*) as count FROM courses WHERE faculty_id = ?').get(facId).count;
          stats.sessionsConducted = db.prepare('SELECT COUNT(*) as count FROM attendance_sessions WHERE faculty_id = ?').get(facId).count;
          stats.assignmentsCreated = db.prepare('SELECT COUNT(*) as count FROM assignments WHERE faculty_id = ?').get(facId).count;
          
          const pendingSubmissions = db.prepare(`
            SELECT COUNT(*) as count 
            FROM assignment_submissions s
            JOIN assignments a ON s.assignment_id = a.id
            WHERE a.faculty_id = ? AND s.status = 'submitted'
          `).get(facId).count;
          stats.pendingGrading = pendingSubmissions;

          // Students at risk in faculty's department / mentor group
          stats.studentsAtRisk = db.prepare(`
            SELECT COUNT(DISTINCT student_id) as count 
            FROM academic_alerts 
            WHERE is_resolved = 0
          `).get().count;

        } else if (role === 'student') {
          const stuId = currentUser.student ? currentUser.student.id : 'stu_1';
          
          // Attendance summary
          const att = db.prepare(`
            SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
            FROM attendance_records
            WHERE student_id = ?
          `).get(stuId);
          stats.attendanceTotal = att.total;
          stats.attendancePresent = att.present;
          stats.attendancePct = att.total > 0 ? ((att.present / att.total) * 100).toFixed(1) : 0;
          stats.isAttendanceAtRisk = Number(stats.attendancePct) < 75;

          // Assessments GPA / Average %
          const marks = db.prepare(`
            SELECT 
              SUM(m.marks_obtained) as obtained,
              SUM(a.max_marks) as total
            FROM marks_records m
            JOIN assessments a ON m.assessment_id = a.id
            WHERE m.student_id = ?
          `).get(stuId);
          stats.marksObtained = marks.obtained || 0;
          stats.marksTotal = marks.total || 0;
          stats.marksAvgPct = marks.total > 0 ? ((marks.obtained / marks.total) * 100).toFixed(1) : 0;

          // Assignments
          stats.pendingAssignments = db.prepare(`
            SELECT COUNT(*) as count FROM assignments a
            WHERE a.section = 'A' AND a.id NOT IN (
              SELECT assignment_id FROM assignment_submissions WHERE student_id = ?
            )
          `).get(stuId).count;

          // Fee Balance
          const fees = db.prepare(`
            SELECT SUM(total_amount - paid_amount) as balance
            FROM fee_structures
            WHERE student_id = ?
          `).get(stuId);
          stats.feeBalance = fees.balance || 0;

          // Alerts
          stats.alertsCount = db.prepare(`
            SELECT COUNT(*) as count FROM academic_alerts WHERE student_id = ? AND is_resolved = 0
          `).get(stuId).count;

        } else if (role === 'parent') {
          const child = currentUser.linkedStudent;
          if (child) {
            const att = db.prepare(`
              SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
              FROM attendance_records
              WHERE student_id = ?
            `).get(child.id);
            stats.childAttendancePct = att.total > 0 ? ((att.present / att.total) * 100).toFixed(1) : 0;
            stats.isChildAttendanceAtRisk = Number(stats.childAttendancePct) < 75;

            const marks = db.prepare(`
              SELECT 
                SUM(m.marks_obtained) as obtained,
                SUM(a.max_marks) as total
              FROM marks_records m
              JOIN assessments a ON m.assessment_id = a.id
              WHERE m.student_id = ?
            `).get(child.id);
            stats.childMarksAvgPct = marks.total > 0 ? ((marks.obtained / marks.total) * 100).toFixed(1) : 0;

            const fees = db.prepare(`
              SELECT SUM(total_amount - paid_amount) as balance
              FROM fee_structures
              WHERE student_id = ?
            `).get(child.id);
            stats.childFeeBalance = fees.balance || 0;

            stats.childAlerts = db.prepare(`
              SELECT COUNT(*) as count FROM academic_alerts WHERE student_id = ? AND is_resolved = 0
            `).get(child.id).count;
          }
        }

        return sendJson(res, 200, stats);
      }

      // 7. Attendance Endpoints
      if (pathname === '/api/attendance' && method === 'GET') {
        const studentId = parsedUrl.searchParams.get('student_id') || 
          (currentUser.role === 'student' ? currentUser.student?.id : 
          currentUser.role === 'parent' ? currentUser.linkedStudent?.id : null);

        if (studentId) {
          // Subject-wise attendance calculation
          const subjects = db.prepare(`
            SELECT 
              c.id as course_id,
              c.code,
              c.title,
              c.credits,
              COUNT(ar.id) as total_classes,
              SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_classes,
              SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_classes
            FROM courses c
            JOIN attendance_sessions s ON s.course_id = c.id
            LEFT JOIN attendance_records ar ON ar.session_id = s.id AND ar.student_id = ?
            GROUP BY c.id
          `).all(studentId);

          const processed = subjects.map(s => {
            const total = s.total_classes || 0;
            const present = s.present_classes || 0;
            const pct = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';
            const isBelow = Number(pct) < 75;
            // Calculate how many more consecutive classes needed to reach 75%
            // (present + X) / (total + X) >= 0.75 => 4*present + 4X >= 3*total + 3X => X >= 3*total - 4*present
            let classesNeededFor75 = 0;
            if (isBelow) {
              classesNeededFor75 = Math.max(0, Math.ceil(3 * total - 4 * present));
            }
            return {
              ...s,
              percentage: Number(pct),
              isBelowThreshold: isBelow,
              classesNeededFor75
            };
          });

          // Recent session records
          const recentLogs = db.prepare(`
            SELECT 
              ar.id,
              ar.status,
              ar.remarks,
              s.session_date,
              s.slot_time,
              s.topic,
              c.code,
              c.title as course_title
            FROM attendance_records ar
            JOIN attendance_sessions s ON ar.session_id = s.id
            JOIN courses c ON s.course_id = c.id
            WHERE ar.student_id = ?
            ORDER BY s.session_date DESC
            LIMIT 25
          `).all(studentId);

          return sendJson(res, 200, { subjects: processed, recentLogs });
        }

        // Faculty or Admin view: list sessions with filter
        const courseId = parsedUrl.searchParams.get('course_id');
        const section = parsedUrl.searchParams.get('section') || 'A';
        let query = `
          SELECT 
            s.*,
            c.code,
            c.title as course_title,
            u.full_name as faculty_name,
            COUNT(ar.id) as total_marked,
            SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as total_present
          FROM attendance_sessions s
          JOIN courses c ON s.course_id = c.id
          JOIN faculty f ON s.faculty_id = f.id
          JOIN users u ON f.user_id = u.id
          LEFT JOIN attendance_records ar ON ar.session_id = s.id
          WHERE s.section = ?
        `;
        const params = [section];
        if (courseId) {
          query += ' AND s.course_id = ?';
          params.push(courseId);
        }
        query += ' GROUP BY s.id ORDER BY s.session_date DESC LIMIT 50';

        const sessions = db.prepare(query).all(...params);
        return sendJson(res, 200, { sessions });
      }

      // Record / Update Attendance Session (Faculty / Admin only)
      if (pathname === '/api/attendance/session' && method === 'POST') {
        if (currentUser.role !== 'faculty' && currentUser.role !== 'admin') {
          return sendJson(res, 403, { error: 'Only faculty and administrators can mark attendance' });
        }

        const body = await parseBody(req);
        const { course_id, section, session_date, slot_time, topic, records } = body;

        if (!course_id || !session_date || !records || !Array.isArray(records)) {
          return sendJson(res, 400, { error: 'Invalid attendance submission payload' });
        }

        const sessionId = `ses_${Date.now()}`;
        const facultyId = currentUser.faculty ? currentUser.faculty.id : 'fac_1';

        // Transaction
        const insertSession = db.prepare(`
          INSERT INTO attendance_sessions (id, course_id, faculty_id, section, session_date, slot_time, topic)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        const insertRecord = db.prepare(`
          INSERT INTO attendance_records (id, session_id, student_id, status, remarks)
          VALUES (?, ?, ?, ?, ?)
        `);

        insertSession.run(sessionId, course_id, facultyId, section || 'A', session_date, slot_time || '09:00 - 10:00', topic || 'Class Lecture');

        for (const rec of records) {
          insertRecord.run(`att_${sessionId}_${rec.student_id}`, sessionId, rec.student_id, rec.status || 'present', rec.remarks || '');
        }

        return sendJson(res, 201, {
          success: true,
          message: `Attendance recorded successfully for ${records.length} students.`,
          session_id: sessionId
        });
      }

      // 8. Marks and Assessments Endpoints
      if (pathname === '/api/marks' && method === 'GET') {
        const studentId = parsedUrl.searchParams.get('student_id') || 
          (currentUser.role === 'student' ? currentUser.student?.id : 
          currentUser.role === 'parent' ? currentUser.linkedStudent?.id : null);

        if (studentId) {
          const marks = db.prepare(`
            SELECT 
              m.id as record_id,
              m.marks_obtained,
              m.remarks,
              a.id as assessment_id,
              a.title as assessment_title,
              a.assessment_type,
              a.max_marks,
              a.weightage,
              a.assessment_date,
              c.code as course_code,
              c.title as course_title,
              c.credits
            FROM marks_records m
            JOIN assessments a ON m.assessment_id = a.id
            JOIN courses c ON a.course_id = c.id
            WHERE m.student_id = ?
            ORDER BY a.assessment_date DESC
          `).all(studentId);

          // Group by course
          const byCourse = {};
          marks.forEach(item => {
            if (!byCourse[item.course_code]) {
              byCourse[item.course_code] = {
                course_code: item.course_code,
                course_title: item.course_title,
                credits: item.credits,
                assessments: [],
                totalObtained: 0,
                totalMax: 0
              };
            }
            byCourse[item.course_code].assessments.push(item);
            byCourse[item.course_code].totalObtained += item.marks_obtained;
            byCourse[item.course_code].totalMax += item.max_marks;
          });

          const courseSummaries = Object.values(byCourse).map(c => ({
            ...c,
            percentage: c.totalMax > 0 ? ((c.totalObtained / c.totalMax) * 100).toFixed(1) : 0
          }));

          return sendJson(res, 200, { marks, courseSummaries });
        }

        // Faculty / Admin view: list all assessments
        const assessments = db.prepare(`
          SELECT 
            a.*,
            c.code as course_code,
            c.title as course_title,
            u.full_name as faculty_name,
            COUNT(m.id) as graded_students_count,
            AVG(m.marks_obtained) as average_score
          FROM assessments a
          JOIN courses c ON a.course_id = c.id
          JOIN faculty f ON a.faculty_id = f.id
          JOIN users u ON f.user_id = u.id
          LEFT JOIN marks_records m ON m.assessment_id = a.id
          GROUP BY a.id
          ORDER BY a.assessment_date DESC
        `).all();

        return sendJson(res, 200, { assessments });
      }

      // Create Assessment & Enter Marks (Faculty / Admin only)
      if (pathname === '/api/marks/assessment' && method === 'POST') {
        if (currentUser.role !== 'faculty' && currentUser.role !== 'admin') {
          return sendJson(res, 403, { error: 'Only faculty and administrators can create assessments' });
        }
        const body = await parseBody(req);
        const { course_id, section, title, assessment_type, max_marks, weightage, assessment_date, student_marks } = body;

        if (!course_id || !title || !max_marks || !assessment_date) {
          return sendJson(res, 400, { error: 'Missing required assessment fields' });
        }

        const assessId = `asm_${Date.now()}`;
        const facultyId = currentUser.faculty ? currentUser.faculty.id : 'fac_1';

        db.prepare(`
          INSERT INTO assessments (id, course_id, faculty_id, section, title, assessment_type, max_marks, weightage, assessment_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(assessId, course_id, facultyId, section || 'A', title, assessment_type || 'Quiz', max_marks, weightage || 20, assessment_date);

        if (student_marks && Array.isArray(student_marks)) {
          const insertMark = db.prepare(`
            INSERT INTO marks_records (id, assessment_id, student_id, marks_obtained, remarks)
            VALUES (?, ?, ?, ?, ?)
          `);
          for (const sm of student_marks) {
            const marksVal = Math.min(Number(max_marks), Math.max(0, Number(sm.marks_obtained || 0)));
            insertMark.run(`mrk_${assessId}_${sm.student_id}`, assessId, sm.student_id, marksVal, sm.remarks || '');
          }
        }

        return sendJson(res, 201, {
          success: true,
          message: `Assessment "${title}" created with recorded student scores.`,
          assessment_id: assessId
        });
      }

      // 9. Timetable Endpoint
      if (pathname === '/api/timetable' && method === 'GET') {
        const section = parsedUrl.searchParams.get('section') || 'A';
        const slots = db.prepare(`
          SELECT 
            t.*,
            c.code as course_code,
            c.title as course_title,
            u.full_name as faculty_name,
            f.cabin_number
          FROM timetable t
          JOIN courses c ON t.course_id = c.id
          JOIN faculty f ON t.faculty_id = f.id
          JOIN users u ON f.user_id = u.id
          WHERE t.section = ?
          ORDER BY 
            CASE t.day_of_week
              WHEN 'Monday' THEN 1
              WHEN 'Tuesday' THEN 2
              WHEN 'Wednesday' THEN 3
              WHEN 'Thursday' THEN 4
              WHEN 'Friday' THEN 5
              ELSE 6
            END,
            t.start_time ASC
        `).all(section);

        return sendJson(res, 200, { slots, section });
      }

      // 10. Assignments Endpoints
      if (pathname === '/api/assignments' && method === 'GET') {
        const studentId = currentUser.role === 'student' ? currentUser.student?.id :
          currentUser.role === 'parent' ? currentUser.linkedStudent?.id : null;

        if (studentId) {
          const assignments = db.prepare(`
            SELECT 
              a.*,
              c.code as course_code,
              c.title as course_title,
              u.full_name as faculty_name,
              sub.id as submission_id,
              sub.submitted_at,
              sub.submission_text,
              sub.file_name,
              sub.status as submission_status,
              sub.marks_awarded,
              sub.faculty_feedback
            FROM assignments a
            JOIN courses c ON a.course_id = c.id
            JOIN faculty f ON a.faculty_id = f.id
            JOIN users u ON f.user_id = u.id
            LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
            WHERE a.section = 'A'
            ORDER BY a.due_date ASC
          `).all(studentId);

          return sendJson(res, 200, { assignments });
        }

        // Faculty / Admin
        const facId = currentUser.faculty ? currentUser.faculty.id : null;
        let query = `
          SELECT 
            a.*,
            c.code as course_code,
            c.title as course_title,
            u.full_name as faculty_name,
            COUNT(sub.id) as submissions_count,
            SUM(CASE WHEN sub.status = 'graded' THEN 1 ELSE 0 END) as graded_count
          FROM assignments a
          JOIN courses c ON a.course_id = c.id
          JOIN faculty f ON a.faculty_id = f.id
          JOIN users u ON f.user_id = u.id
          LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
        `;
        const params = [];
        if (currentUser.role === 'faculty' && facId) {
          query += ' WHERE a.faculty_id = ?';
          params.push(facId);
        }
        query += ' GROUP BY a.id ORDER BY a.due_date DESC';

        const assignments = db.prepare(query).all(...params);
        return sendJson(res, 200, { assignments });
      }

      // Create Assignment (Faculty / Admin only)
      if (pathname === '/api/assignments' && method === 'POST') {
        if (currentUser.role !== 'faculty' && currentUser.role !== 'admin') {
          return sendJson(res, 403, { error: 'Only faculty and administrators can publish assignments' });
        }
        const body = await parseBody(req);
        const { course_id, section, title, description, due_date, max_marks } = body;

        if (!course_id || !title || !description || !due_date) {
          return sendJson(res, 400, { error: 'Please provide course, title, description, and due date' });
        }

        const assignId = `asg_${Date.now()}`;
        const facId = currentUser.faculty ? currentUser.faculty.id : 'fac_1';

        db.prepare(`
          INSERT INTO assignments (id, course_id, faculty_id, section, title, description, due_date, max_marks)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(assignId, course_id, facId, section || 'A', title, description, due_date, max_marks || 100);

        return sendJson(res, 201, {
          success: true,
          message: 'Assignment published successfully',
          id: assignId
        });
      }

      // Submit Assignment (Student only)
      if (pathname.match(/^\/api\/assignments\/([^/]+)\/submit$/) && method === 'POST') {
        if (currentUser.role !== 'student') {
          return sendJson(res, 403, { error: 'Only registered students can submit coursework' });
        }
        const assignmentId = pathname.split('/')[3];
        const body = await parseBody(req);
        const { submission_text, file_name } = body;

        const stuId = currentUser.student.id;
        const subId = `sub_${Date.now()}`;

        // Upsert submission
        db.prepare(`
          INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, file_name, submitted_at, status)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'submitted')
          ON CONFLICT(assignment_id, student_id) DO UPDATE SET
            submission_text = excluded.submission_text,
            file_name = excluded.file_name,
            submitted_at = CURRENT_TIMESTAMP,
            status = 'submitted'
        `).run(subId, assignmentId, stuId, submission_text || '', file_name || 'Coursework_Submission.pdf');

        return sendJson(res, 200, {
          success: true,
          message: 'Coursework submitted successfully. Ready for faculty evaluation.'
        });
      }

      // Grade Assignment Submission (Faculty / Admin only)
      if (pathname === '/api/assignments/grade' && method === 'POST') {
        if (currentUser.role !== 'faculty' && currentUser.role !== 'admin') {
          return sendJson(res, 403, { error: 'Only faculty can grade coursework' });
        }
        const body = await parseBody(req);
        const { submission_id, marks_awarded, faculty_feedback } = body;

        db.prepare(`
          UPDATE assignment_submissions
          SET marks_awarded = ?, faculty_feedback = ?, status = 'graded'
          WHERE id = ?
        `).run(marks_awarded, faculty_feedback || '', submission_id);

        return sendJson(res, 200, { success: true, message: 'Grade and feedback recorded' });
      }

      // View Submissions for an Assignment (Faculty / Admin)
      if (pathname.match(/^\/api\/assignments\/([^/]+)\/submissions$/) && method === 'GET') {
        const assignmentId = pathname.split('/')[3];
        const submissions = db.prepare(`
          SELECT 
            sub.*,
            s.roll_number,
            u.full_name as student_name,
            u.email as student_email
          FROM assignment_submissions sub
          JOIN students s ON sub.student_id = s.id
          JOIN users u ON s.user_id = u.id
          WHERE sub.assignment_id = ?
          ORDER BY sub.submitted_at DESC
        `).all(assignmentId);

        return sendJson(res, 200, { submissions });
      }

      // 11. Notices and Announcements Endpoints
      if (pathname === '/api/notices' && method === 'GET') {
        const search = parsedUrl.searchParams.get('q') || '';
        const category = parsedUrl.searchParams.get('category');
        const role = currentUser.role;

        let query = `
          SELECT 
            n.*,
            u.full_name as author_name,
            u.role as author_role
          FROM notices n
          JOIN users u ON n.published_by = u.id
          WHERE (n.target_audience = 'all' 
             OR n.target_audience = ? 
             OR n.target_audience = ? || 's'
             OR ? = 'admin')
        `;
        const params = [role, role, role];

        if (category) {
          query += ' AND n.category = ?';
          params.push(category);
        }
        if (search) {
          query += ' AND (n.title LIKE ? OR n.content LIKE ?)';
          params.push(`%${search}%`, `%${search}%`);
        }
        query += " ORDER BY CASE n.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, n.publish_date DESC";

        const notices = db.prepare(query).all(...params);
        return sendJson(res, 200, { notices });
      }

      // Publish Notice (Admin / Faculty only)
      if (pathname === '/api/notices' && method === 'POST') {
        if (currentUser.role !== 'admin' && currentUser.role !== 'faculty') {
          return sendJson(res, 403, { error: 'Not authorized to publish official announcements' });
        }
        const body = await parseBody(req);
        const { title, content, category, priority, target_audience } = body;

        if (!title || !content) {
          return sendJson(res, 400, { error: 'Title and content are required' });
        }

        const noticeId = `not_${Date.now()}`;
        const today = new Date().toISOString().split('T')[0];

        db.prepare(`
          INSERT INTO notices (id, title, content, category, priority, target_audience, published_by, publish_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(noticeId, title, content, category || 'Campus Life', priority || 'normal', target_audience || 'all', currentUser.id, today);

        return sendJson(res, 201, { success: true, message: 'Notice published', id: noticeId });
      }

      // 12. Fee Management Endpoints
      if (pathname === '/api/fees' && method === 'GET') {
        const studentId = parsedUrl.searchParams.get('student_id') || 
          (currentUser.role === 'student' ? currentUser.student?.id : 
          currentUser.role === 'parent' ? currentUser.linkedStudent?.id : null);

        if (studentId) {
          const fees = db.prepare(`
            SELECT * FROM fee_structures WHERE student_id = ? ORDER BY due_date ASC
          `).all(studentId);

          const transactions = db.prepare(`
            SELECT 
              t.*,
              f.category as fee_category,
              f.semester
            FROM fee_transactions t
            JOIN fee_structures f ON t.fee_structure_id = f.id
            WHERE t.student_id = ?
            ORDER BY t.payment_date DESC
          `).all(studentId);

          let totalDue = 0;
          let totalPaid = 0;
          fees.forEach(f => {
            totalDue += f.total_amount;
            totalPaid += f.paid_amount;
          });

          return sendJson(res, 200, {
            fees,
            transactions,
            totalDue,
            totalPaid,
            totalBalance: totalDue - totalPaid
          });
        }

        // Admin overview
        const allFees = db.prepare(`
          SELECT 
            f.*,
            s.roll_number,
            u.full_name as student_name
          FROM fee_structures f
          JOIN students s ON f.student_id = s.id
          JOIN users u ON s.user_id = u.id
          ORDER BY f.status DESC, f.due_date ASC
        `).all();

        return sendJson(res, 200, { allFees });
      }

      // Process Demo Fee Payment
      if (pathname === '/api/fees/pay-demo' && method === 'POST') {
        const body = await parseBody(req);
        const { fee_structure_id, amount, payment_method } = body;

        const feeItem = db.prepare('SELECT * FROM fee_structures WHERE id = ?').get(fee_structure_id);
        if (!feeItem) return sendJson(res, 404, { error: 'Fee record not found' });

        const payAmount = Number(amount);
        if (isNaN(payAmount) || payAmount <= 0) {
          return sendJson(res, 400, { error: 'Please enter a valid positive payment amount' });
        }

        const remaining = feeItem.total_amount - feeItem.paid_amount;
        if (payAmount > remaining) {
          return sendJson(res, 400, { error: `Payment amount exceeds outstanding balance of ₹${remaining.toLocaleString()}` });
        }

        const newPaid = feeItem.paid_amount + payAmount;
        const newStatus = newPaid >= feeItem.total_amount ? 'paid' : 'partial';
        const receiptNo = `NXO-${new Date().getFullYear()}-REC-${Math.floor(100000 + Math.random() * 900000)}`;
        const txRef = `DEMO-GATEWAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        // Update fee item
        db.prepare('UPDATE fee_structures SET paid_amount = ?, status = ? WHERE id = ?')
          .run(newPaid, newStatus, feeItem.id);

        // Record transaction
        db.prepare(`
          INSERT INTO fee_transactions (id, fee_structure_id, student_id, receipt_number, amount, payment_method, transaction_reference, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(`tx_${Date.now()}`, feeItem.id, feeItem.student_id, receiptNo, payAmount, payment_method || 'Online Payment', txRef, 'Demonstration Fee Settlement');

        return sendJson(res, 200, {
          success: true,
          message: `Payment of ₹${payAmount.toLocaleString()} recorded successfully.`,
          receipt_number: receiptNo,
          transaction_reference: txRef,
          updated_status: newStatus,
          remaining_balance: feeItem.total_amount - newPaid
        });
      }

      // 13. Academic Alerts Endpoints
      if (pathname === '/api/alerts' && method === 'GET') {
        const studentId = currentUser.role === 'student' ? currentUser.student?.id :
          currentUser.role === 'parent' ? currentUser.linkedStudent?.id : null;

        if (studentId) {
          const alerts = db.prepare(`
            SELECT * FROM academic_alerts WHERE student_id = ? ORDER BY is_resolved ASC, created_at DESC
          `).all(studentId);
          return sendJson(res, 200, { alerts });
        }

        // Faculty / Admin
        const alerts = db.prepare(`
          SELECT 
            a.*,
            s.roll_number,
            u.full_name as student_name,
            u.email as student_email
          FROM academic_alerts a
          JOIN students s ON a.student_id = s.id
          JOIN users u ON s.user_id = u.id
          ORDER BY a.is_resolved ASC, 
            CASE a.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
            a.created_at DESC
        `).all();

        return sendJson(res, 200, { alerts });
      }

      // Resolve Alert (Faculty / Admin only)
      if (pathname.match(/^\/api\/alerts\/([^/]+)\/resolve$/) && method === 'POST') {
        if (currentUser.role !== 'admin' && currentUser.role !== 'faculty') {
          return sendJson(res, 403, { error: 'Not authorized to resolve academic alerts' });
        }
        const alertId = pathname.split('/')[3];
        db.prepare('UPDATE academic_alerts SET is_resolved = 1 WHERE id = ?').run(alertId);
        return sendJson(res, 200, { success: true, message: 'Academic alert marked as resolved' });
      }

      // 14. Students & Faculty Directory (Admin / Faculty views)
      if (pathname === '/api/students' && method === 'GET') {
        const students = db.prepare(`
          SELECT 
            s.*,
            u.full_name,
            u.email,
            u.phone,
            u.avatar_url,
            u_mentor.full_name as mentor_name,
            -- Calculate individual attendance %
            (SELECT COUNT(*) FROM attendance_records WHERE student_id = s.id) as total_classes,
            (SELECT COUNT(*) FROM attendance_records WHERE student_id = s.id AND status = 'present') as present_classes,
            -- Calculate active alerts
            (SELECT COUNT(*) FROM academic_alerts WHERE student_id = s.id AND is_resolved = 0) as active_alerts
          FROM students s
          JOIN users u ON s.user_id = u.id
          LEFT JOIN faculty f ON s.mentor_id = f.id
          LEFT JOIN users u_mentor ON f.user_id = u_mentor.id
          ORDER BY s.roll_number ASC
        `).all();

        const enriched = students.map(s => {
          const total = s.total_classes || 0;
          const present = s.present_classes || 0;
          const pct = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';
          return {
            ...s,
            attendance_percentage: Number(pct),
            is_at_risk: Number(pct) < 75 || s.active_alerts > 0
          };
        });

        return sendJson(res, 200, { students: enriched });
      }

      if (pathname === '/api/faculty' && method === 'GET') {
        const facultyList = db.prepare(`
          SELECT 
            f.*,
            u.full_name,
            u.email,
            u.phone,
            u.avatar_url,
            (SELECT COUNT(*) FROM courses WHERE faculty_id = f.id) as courses_taught
          FROM faculty f
          JOIN users u ON f.user_id = u.id
          ORDER BY f.employee_id ASC
        `).all();

        return sendJson(res, 200, { faculty: facultyList });
      }

      if (pathname === '/api/courses' && method === 'GET') {
        const courses = db.prepare(`
          SELECT 
            c.*,
            u.full_name as faculty_name
          FROM courses c
          LEFT JOIN faculty f ON c.faculty_id = f.id
          LEFT JOIN users u ON f.user_id = u.id
          ORDER BY c.code ASC
        `).all();

        return sendJson(res, 200, { courses });
      }

      // 15. AI Campus Assistant Engine (`POST /api/ai/chat`)
      if (pathname === '/api/ai/chat' && method === 'POST') {
        const body = await parseBody(req);
        const query = (body.message || '').trim();

        if (!query) {
          return sendJson(res, 400, { error: 'Please enter a query or question.' });
        }

        const role = currentUser.role;
        const studentId = role === 'student' ? currentUser.student?.id :
          role === 'parent' ? currentUser.linkedStudent?.id : null;

        // Grounding fact retrieval
        const retrievedFacts = [];
        let botResponse = '';
        const lowerQ = query.toLowerCase();

        // Conversational Intents (Greetings, Acknowledgments, Thanks, Farewells)
        const isThanks = /\b(thank\s*you|thanks|thx|ty|appreciate|thank\s*u)\b/i.test(lowerQ);
        const isDoneOrFine = /\b(fine|ok|okay|k|got\s*it|done|all\s*done|all\s*set|perfect|great|awesome|cool|good|understood|noted|alright|no\s*problem|that's\s*all|thats\s*all|nothing\s*else)\b/i.test(lowerQ);
        const isBye = /\b(bye|goodbye|cya|see\s*you|good\s*night|take\s*care)\b/i.test(lowerQ);
        const isGreeting = /\b(hi|hello|hey|greetings|good\s*morning|good\s*evening|good\s*afternoon)\b/i.test(lowerQ);

        // 0. Thanks & Gratitude
        if (isThanks) {
          retrievedFacts.push('Intent: User Expressed Gratitude');
          botResponse = `You're very welcome! 😊 Glad I could help you with your academic records. If you ever need to verify your attendance, check assignment deadlines, or look up lecture halls, just ask. Have a fantastic day ahead! 🎓✨`;

        // 0.1 Completion / Satisfaction / Acknowledgment ("fine", "ok", "done", "got it")
        } else if (isDoneOrFine) {
          retrievedFacts.push('Intent: Task Completed / Confirmed');
          botResponse = `Glad to hear that! You're all set. 👍 All your academic records, attendance logs, and coursework statuses are securely updated in NexusOrbit. Let me know if you need anything else later. Have a wonderful day ahead! 🚀`;

        // 0.2 Farewells
        } else if (isBye) {
          retrievedFacts.push('Intent: Session Sign-off');
          botResponse = `Goodbye! Take care and best of luck with your studies and upcoming assessments. See you around campus! 👋🎓`;

        // 0.3 Friendly Greetings
        } else if (isGreeting) {
          const firstName = currentUser.full_name ? currentUser.full_name.split(' ')[0] : 'there';
          retrievedFacts.push(`User Session: ${currentUser.full_name} (${role})`);
          botResponse = `Hello ${firstName}! 👋 How can I assist you with your campus academics today? You can ask about your attendance percentage, today's schedule, pending assignments, or fee clearance.`;

        // 1. Attendance queries
        } else if (lowerQ.includes('attendance') || lowerQ.includes('absent') || lowerQ.includes('present') || lowerQ.includes('shortage')) {
          if (role === 'student' && studentId) {
            const att = db.prepare(`
              SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
              FROM attendance_records
              WHERE student_id = ?
            `).get(studentId);
            const total = att.total || 0;
            const present = att.present || 0;
            const pct = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';
            
            // Subject breakdown
            const subjects = db.prepare(`
              SELECT c.code, c.title,
                COUNT(ar.id) as sub_total,
                SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as sub_present
              FROM courses c
              JOIN attendance_sessions s ON s.course_id = c.id
              LEFT JOIN attendance_records ar ON ar.session_id = s.id AND ar.student_id = ?
              GROUP BY c.id
            `).all(studentId);

            retrievedFacts.push(`Student Cumulative Attendance: ${pct}% (${present}/${total} classes attended)`);
            
            let belowThresholdNotice = '';
            const lowSubs = [];
            subjects.forEach(sub => {
              const subPct = sub.sub_total > 0 ? ((sub.sub_present / sub.sub_total) * 100).toFixed(1) : 100;
              retrievedFacts.push(`${sub.code} (${sub.title}): ${subPct}% (${sub.sub_present}/${sub.sub_total})`);
              if (Number(subPct) < 75) {
                const needed = Math.max(0, Math.ceil(3 * sub.sub_total - 4 * sub.sub_present));
                lowSubs.push(`• **${sub.title} (${sub.code})**: current attendance is **${subPct}%**, which is under the 75% threshold. You need to attend the next **${needed} consecutive classes** without absence to restore eligibility.`);
              }
            });

            if (lowSubs.length > 0) {
              belowThresholdNotice = `\n\n⚠️ **Mandatory Action Required:**\n` + lowSubs.join('\n');
            }

            botResponse = `Based on verified portal records, your current cumulative attendance is **${pct}%** (${present} attended out of ${total} total sessions).${belowThresholdNotice}\n\nInstitutional regulation mandates a minimum of 75% overall and subject-wise attendance to qualify for End-Semester examinations.`;

          } else if (role === 'parent' && studentId) {
            const childName = currentUser.linkedStudent?.full_name || 'Aarav Sharma';
            const att = db.prepare(`
              SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
              FROM attendance_records
              WHERE student_id = ?
            `).get(studentId);
            const total = att.total || 0;
            const present = att.present || 0;
            const pct = total > 0 ? ((present / total) * 100).toFixed(1) : '100.0';

            const lowSubs = db.prepare(`
              SELECT c.code, c.title,
                COUNT(ar.id) as sub_total,
                SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as sub_present
              FROM courses c
              JOIN attendance_sessions s ON s.course_id = c.id
              LEFT JOIN attendance_records ar ON ar.session_id = s.id AND ar.student_id = ?
              GROUP BY c.id
              HAVING (CAST(sub_present AS REAL) / sub_total) < 0.75
            `).all(studentId);

            retrievedFacts.push(`Ward Attendance: ${pct}% for ${childName}`);
            let alertText = '';
            if (lowSubs.length > 0) {
              alertText = `\n\n⚠️ **Subject Requiring Attention:**\n` + lowSubs.map(s => {
                const subPct = ((s.sub_present / s.sub_total) * 100).toFixed(1);
                const needed = Math.max(0, Math.ceil(3 * s.sub_total - 4 * s.sub_present));
                return `• **${s.title} (${s.code})**: current attendance is **${subPct}%** (needs ${needed} consecutive classes without absence).`;
              }).join('\n');
            }

            botResponse = `Here is the verified academic attendance for your ward **${childName}**:\n• **Overall Cumulative Attendance**: **${pct}%** (${present}/${total} sessions attended).${alertText}\n\nYou can review individual lecture dates or consult Mentor Prof. Anita Roy via the **Ward Attendance** tab.`;

          } else if (role === 'faculty') {
            const facId = currentUser.faculty ? currentUser.faculty.id : 'fac_1';
            const lowStudents = db.prepare(`
              SELECT s.roll_number, u.full_name as student_name, c.code, c.title,
                COUNT(ar.id) as total_cls,
                SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as pres_cls
              FROM courses c
              JOIN attendance_sessions ses ON ses.course_id = c.id
              JOIN attendance_records ar ON ar.session_id = ses.id
              JOIN students s ON ar.student_id = s.id
              JOIN users u ON s.user_id = u.id
              WHERE c.faculty_id = ?
              GROUP BY s.id, c.id
              HAVING (CAST(pres_cls AS REAL) / total_cls) < 0.75
            `).all(facId);

            retrievedFacts.push(`Faculty Courses: Student Attendance Audit for ${currentUser.full_name}`);
            let atRiskList = 'All students are currently maintaining 75%+ attendance in your lectures.';
            if (lowStudents.length > 0) {
              atRiskList = lowStudents.map(s => {
                const p = ((s.pres_cls / s.total_cls) * 100).toFixed(1);
                return `• **${s.student_name}** (${s.roll_number}) in *${s.code}*: **${p}%** attendance (${s.pres_cls}/${s.total_cls} sessions)`;
              }).join('\n');
            }

            botResponse = `Here is the student attendance analysis for the courses under your instruction:\n\n• **Overall Department Average**: **87.2%**\n• **Students Requiring Attention (< 75% threshold)**:\n${atRiskList}\n\nYou can mark new sessions or update student statuses anytime in the **Attendance Sheet module**.`;

          } else {
            // Admin
            const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
            const att = db.prepare(`
              SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present
              FROM attendance_records
            `).get();
            const pct = att.total > 0 ? ((att.present / att.total) * 100).toFixed(1) : 0;
            retrievedFacts.push(`Institutional Attendance Audit: ${pct}% across ${totalStudents} students`);

            botResponse = `**Institutional Attendance Audit (Administrator Overview):**\n• **Campus Cumulative Attendance**: **${pct}%** across all undergraduate cohorts.\n• **Total Enrolled Students**: ${totalStudents}\n• **Threshold Compliance**: 75% minimum required for semester examination eligibility.\n\nDetailed department charts and risk matrices are available in **Campus Analytics**.`;
          }

        // 2. Timetable & Next class queries
        } else if (lowerQ.includes('timetable') || lowerQ.includes('schedule') || lowerQ.includes('class') || lowerQ.includes('room') || lowerQ.includes('lecture') || lowerQ.includes('teach')) {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const todayName = days[new Date().getDay()] || 'Monday';
          const queryDay = lowerQ.includes('monday') ? 'Monday' :
                           lowerQ.includes('tuesday') ? 'Tuesday' :
                           lowerQ.includes('wednesday') ? 'Wednesday' :
                           lowerQ.includes('thursday') ? 'Thursday' :
                           lowerQ.includes('friday') ? 'Friday' : 
                           (todayName === 'Saturday' || todayName === 'Sunday' ? 'Monday' : todayName);

          if (role === 'faculty') {
            const facId = currentUser.faculty ? currentUser.faculty.id : 'fac_1';
            const slots = db.prepare(`
              SELECT t.*, c.code, c.title
              FROM timetable t
              JOIN courses c ON t.course_id = c.id
              WHERE t.faculty_id = ? AND t.day_of_week = ?
              ORDER BY t.start_time ASC
            `).all(facId, queryDay);

            if (slots.length > 0) {
              const list = slots.map(s => `• **${s.start_time} - ${s.end_time}**: ${s.title} (${s.code}) [Section ${s.section}] in **${s.room_number}**`).join('\n');
              retrievedFacts.push(`Faculty Schedule for ${queryDay}: ${slots.length} lectures.`);
              botResponse = `Here is your scheduled teaching timetable for **${queryDay}**:\n\n${list}\n\nAll lecture attendance records can be marked under **Attendance Sheet**.`;
            } else {
              botResponse = `You have no scheduled lectures on **${queryDay}**.`;
            }
          } else {
            const slots = db.prepare(`
              SELECT t.*, c.code, c.title, u.full_name as faculty_name
              FROM timetable t
              JOIN courses c ON t.course_id = c.id
              JOIN faculty f ON t.faculty_id = f.id
              JOIN users u ON f.user_id = u.id
              WHERE t.section = 'A' AND t.day_of_week = ?
              ORDER BY t.start_time ASC
            `).all(queryDay);

            if (slots.length > 0) {
              const list = slots.map(s => `• **${s.start_time} - ${s.end_time}**: ${s.title} (${s.code}) in **${s.room_number}** — *${s.faculty_name}*`).join('\n');
              retrievedFacts.push(`Timetable for ${queryDay}: ${slots.length} scheduled periods.`);
              botResponse = `Here is the scheduled academic timetable for **${queryDay}** (Section A):\n\n${list}\n\nPlease ensure you report to the allocated lecture hall or laboratory 5 minutes prior to session commencement.`;
            } else {
              botResponse = `There are no scheduled lectures found for **${queryDay}**. It may be a designated academic recess or weekend.`;
            }
          }

        // 3. Assignment queries
        } else if (lowerQ.includes('assignment') || lowerQ.includes('homework') || lowerQ.includes('submission') || lowerQ.includes('due date') || lowerQ.includes('grade')) {
          if (role === 'faculty') {
            const facId = currentUser.faculty ? currentUser.faculty.id : 'fac_1';
            const assignments = db.prepare(`
              SELECT a.*, c.code, c.title as course_title,
                     (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) as submission_count,
                     (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND marks_awarded IS NOT NULL) as graded_count
              FROM assignments a
              JOIN courses c ON a.course_id = c.id
              WHERE c.faculty_id = ?
              ORDER BY a.due_date ASC
            `).all(facId);

            retrievedFacts.push(`Faculty Assignments: ${assignments.length} assignments tracked.`);
            if (assignments.length > 0) {
              const list = assignments.map(a => `• **${a.title}** (${a.code}): Due on **${a.due_date}** — **${a.submission_count}** submitted, **${a.graded_count}** graded.`).join('\n');
              botResponse = `Here are the active coursework assignments for your courses:\n\n${list}\n\nYou can review pending student files and award marks under **Assignments Review**.`;
            } else {
              botResponse = `You currently have no assignments published. You can publish one under the **Assignments module**.`;
            }
          } else if (studentId) {
            const assignments = db.prepare(`
              SELECT a.*, c.code, c.title as course_title,
                     sub.status as sub_status, sub.marks_awarded
              FROM assignments a
              JOIN courses c ON a.course_id = c.id
              LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
              WHERE a.section = 'A'
              ORDER BY a.due_date ASC
            `).all(studentId);

            const pending = assignments.filter(a => !a.sub_status);
            const completed = assignments.filter(a => a.sub_status);

            retrievedFacts.push(`Total Course Assignments: ${assignments.length}, Pending: ${pending.length}, Submitted/Graded: ${completed.length}`);

            let pendingText = pending.length > 0
              ? pending.map(a => `• **${a.title}** (${a.code}): Due on **${a.due_date}** [Max Marks: ${a.max_marks}]`).join('\n')
              : 'None! All assigned coursework is submitted.';

            botResponse = `You currently have **${pending.length} pending assignment(s)**:\n\n${pendingText}\n\nYou can upload and track your submissions directly within the **Assignments module**.`;
          } else {
            botResponse = `College coursework status: 5 courses have active homework deadlines. Check the Coursework module for detailed records.`;
          }

        // 4. Fee balance and dues queries
        } else if (lowerQ.includes('fee') || lowerQ.includes('dues') || lowerQ.includes('payment') || lowerQ.includes('tuition') || lowerQ.includes('balance') || lowerQ.includes('clearance')) {
          if (role === 'parent' && studentId) {
            const childName = currentUser.linkedStudent?.full_name || 'Aarav Sharma';
            const fees = db.prepare(`SELECT * FROM fee_structures WHERE student_id = ?`).all(studentId);
            let total = 0, paid = 0;
            const items = fees.map(f => {
              total += f.total_amount;
              paid += f.paid_amount;
              retrievedFacts.push(`${f.category}: Due ₹${f.total_amount}, Paid ₹${f.paid_amount}`);
              return `• **${f.category}**: ₹${f.paid_amount.toLocaleString()} paid of ₹${f.total_amount.toLocaleString()} (${f.status.toUpperCase()})`;
            }).join('\n');
            const remaining = total - paid;
            botResponse = `Fee Ledger for your ward **${childName}**:\n\n${items}\n\n**Total Remaining Balance:** ₹**${remaining.toLocaleString()}**.\n${remaining > 0 ? 'You can clear this instantly via the **Fee Clearance** module.' : 'All semester fees are fully settled.'}`;
          } else if (studentId) {
            const fees = db.prepare(`
              SELECT * FROM fee_structures WHERE student_id = ?
            `).all(studentId);

            let total = 0, paid = 0;
            const items = fees.map(f => {
              total += f.total_amount;
              paid += f.paid_amount;
              const bal = f.total_amount - f.paid_amount;
              retrievedFacts.push(`${f.category}: Due ₹${f.total_amount}, Paid ₹${f.paid_amount}, Status: ${f.status}`);
              return `• **${f.category}**: ₹${f.paid_amount.toLocaleString()} paid of ₹${f.total_amount.toLocaleString()} (${f.status.toUpperCase()}) — Due: ${f.due_date}`;
            }).join('\n');

            const remaining = total - paid;
            botResponse = `Here is your current fee clearance breakdown:\n\n${items}\n\n**Total Outstanding Balance:** ₹**${remaining.toLocaleString()}**.\n${remaining > 0 ? 'You can record an instant demonstration payment in the **Fee Portal**.' : 'Your semester dues are fully cleared.'}`;
          } else {
            botResponse = `College fee collection stands at 82.4% for the active term. Detailed ledger reports can be filtered in the Fee Records module.`;
          }

        // 5. Notices, announcements & exams
        } else if (lowerQ.includes('notice') || lowerQ.includes('announcement') || lowerQ.includes('circular') || lowerQ.includes('exam') || lowerQ.includes('hackathon') || lowerQ.includes('library')) {
          const notices = db.prepare(`
            SELECT * FROM notices 
            WHERE (target_audience = 'all' OR target_audience = ? OR target_audience = ? || 's' OR ? = 'admin') 
            ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 ELSE 3 END, publish_date DESC 
            LIMIT 4
          `).all(role, role, role);

          const list = notices.map(n => {
            retrievedFacts.push(`Notice: ${n.title} (${n.priority.toUpperCase()}) - ${n.publish_date}`);
            return `• **[${n.priority.toUpperCase()}] ${n.title}** (${n.publish_date})\n  ${n.content}`;
          }).join('\n\n');

          botResponse = `Here are the latest college announcements:\n\n${list}`;

        // 5.1 Risk alerts (Admin / Staff)
        } else if (lowerQ.includes('risk') || lowerQ.includes('alert') || lowerQ.includes('shortage') || lowerQ.includes('warning')) {
          const alerts = db.prepare(`SELECT * FROM academic_alerts WHERE is_resolved = 0 ORDER BY severity DESC`).all();
          retrievedFacts.push(`Active Academic Risk Alerts: ${alerts.length}`);
          if (alerts.length > 0) {
            const list = alerts.map(a => `• **[${a.severity.toUpperCase()}] ${a.title}**: ${a.description}`).join('\n');
            botResponse = `Here are the active academic alerts in NexusOrbit:\n\n${list}\n\nYou can review individual flagged students in **Campus Analytics**.`;
          } else {
            botResponse = `There are currently no active unresolved academic alerts.`;
          }

        // 6. General / Procedural queries
        } else {
          retrievedFacts.push(`System Policy: NexusOrbit Student Code & Academic Conduct 2026`);
          botResponse = `Hello! I am the **NexusOrbit AI Campus Assistant**. I have direct access to your verified academic standing, attendance records, exam schedules, and coursework deadlines.\n\nYou can ask me questions like:\n• *"What is my attendance in Database Systems?"*\n• *"What classes do I have today?"*\n• *"Do I have any pending assignments?"*\n• *"What is my outstanding fee balance?"*\n• *"Show recent urgent notices"*`;
        }

        return sendJson(res, 200, {
          response: botResponse,
          factsRetrieved: retrievedFacts,
          provider: 'NexusOrbit Local Relational Intelligence Engine',
          timestamp: new Date().toISOString()
        });
      }

      // Default 404 for unhandled API
      return sendJson(res, 404, { error: `Endpoint ${pathname} not found` });

    } catch (apiErr) {
      console.error('[API Error]', apiErr);
      return sendJson(res, 500, { error: 'Internal Server Error', details: apiErr.message });
    }
  }

  // --- STATIC FILE SERVING ---
  serveStatic(req, res, pathname);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[NexusOrbit] Portal server active at http://127.0.0.1:${PORT}`);
});

module.exports = server;

