/**
 * NexusOrbit Database Engine
 * Relational SQLite persistence via Node.js built-in node:sqlite
 */
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_PATH = path.join(__dirname, 'nexusorbit.sqlite');

function getDatabase() {
  const db = new DatabaseSync(DB_PATH);
  // Enable foreign key constraints and WAL mode for high performance
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  return db;
}

function initSchema(db) {
  db.exec(`
    -- Users and Authentication
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student', 'parent')),
      full_name TEXT NOT NULL,
      phone TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Faculty Details
    CREATE TABLE IF NOT EXISTS faculty (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      employee_id TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      designation TEXT NOT NULL,
      cabin_number TEXT,
      office_hours TEXT
    );

    -- Students Details
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      roll_number TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      program TEXT NOT NULL,
      semester INTEGER NOT NULL,
      section TEXT NOT NULL,
      mentor_id TEXT REFERENCES faculty(id),
      parent_user_id TEXT REFERENCES users(id),
      blood_group TEXT,
      dob TEXT,
      emergency_contact TEXT
    );

    -- Courses & Subjects
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      semester INTEGER NOT NULL,
      credits INTEGER NOT NULL DEFAULT 4,
      faculty_id TEXT REFERENCES faculty(id)
    );

    -- Timetable Slots
    CREATE TABLE IF NOT EXISTS timetable (
      id TEXT PRIMARY KEY,
      day_of_week TEXT NOT NULL, -- Monday, Tuesday, Wednesday, Thursday, Friday
      start_time TEXT NOT NULL,  -- e.g. '09:00'
      end_time TEXT NOT NULL,    -- e.g. '10:00'
      course_id TEXT NOT NULL REFERENCES courses(id),
      faculty_id TEXT NOT NULL REFERENCES faculty(id),
      section TEXT NOT NULL,
      room_number TEXT NOT NULL
    );

    -- Attendance Sessions
    CREATE TABLE IF NOT EXISTS attendance_sessions (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id),
      faculty_id TEXT NOT NULL REFERENCES faculty(id),
      section TEXT NOT NULL,
      session_date TEXT NOT NULL,
      slot_time TEXT NOT NULL,
      topic TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Attendance Records
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'late', 'excused')),
      remarks TEXT,
      UNIQUE(session_id, student_id)
    );

    -- Assessments and Marks
    CREATE TABLE IF NOT EXISTS assessments (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id),
      faculty_id TEXT NOT NULL REFERENCES faculty(id),
      section TEXT NOT NULL,
      title TEXT NOT NULL,
      assessment_type TEXT NOT NULL CHECK(assessment_type IN ('Midterm 1', 'Midterm 2', 'Quiz', 'Lab Practical', 'End Semester')),
      max_marks REAL NOT NULL,
      weightage REAL NOT NULL DEFAULT 20,
      assessment_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS marks_records (
      id TEXT PRIMARY KEY,
      assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      marks_obtained REAL NOT NULL,
      remarks TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(assessment_id, student_id)
    );

    -- Assignments
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id),
      faculty_id TEXT NOT NULL REFERENCES faculty(id),
      section TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      due_date TEXT NOT NULL,
      max_marks REAL NOT NULL DEFAULT 100,
      attachment_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id TEXT PRIMARY KEY,
      assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      submission_text TEXT,
      file_name TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL CHECK(status IN ('submitted', 'graded', 'late')),
      marks_awarded REAL,
      faculty_feedback TEXT,
      UNIQUE(assignment_id, student_id)
    );

    -- Notices and Announcements
    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Academic', 'Examination', 'Campus Life', 'Urgent'
      priority TEXT NOT NULL CHECK(priority IN ('urgent', 'high', 'normal')),
      target_audience TEXT NOT NULL CHECK(target_audience IN ('all', 'students', 'faculty', 'parents')),
      published_by TEXT NOT NULL REFERENCES users(id),
      publish_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Fee Management
    CREATE TABLE IF NOT EXISTS fee_structures (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id),
      semester INTEGER NOT NULL,
      category TEXT NOT NULL, -- 'Tuition Fee', 'Lab & Library', 'Hostel & Mess', 'Examination Fee'
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('paid', 'pending', 'partial', 'overdue'))
    );

    CREATE TABLE IF NOT EXISTS fee_transactions (
      id TEXT PRIMARY KEY,
      fee_structure_id TEXT NOT NULL REFERENCES fee_structures(id),
      student_id TEXT NOT NULL REFERENCES students(id),
      receipt_number TEXT UNIQUE NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      transaction_reference TEXT NOT NULL,
      payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );

    -- Academic Early Risk Alerts
    CREATE TABLE IF NOT EXISTS academic_alerts (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL CHECK(alert_type IN ('low_attendance', 'low_marks', 'overdue_assignment', 'fee_due')),
      severity TEXT NOT NULL CHECK(severity IN ('critical', 'warning', 'info')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      is_resolved INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedData(db) {
  // Check if users table already seeded
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count > 0) {
    return; // Already seeded
  }

  console.log('[NexusOrbit DB] Seeding initial demonstration data...');

  // 1. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, role, full_name, phone, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Demo Accounts (simple demo hash 'demo123') — avatars stored locally in /assets/avatars/
  insertUser.run('usr_admin', 'admin@nexusorbit.edu', 'demo123', 'admin', 'Dr. Vikram Malhotra', '+91 98765 43210', '/assets/avatars/admin.jpg');
  insertUser.run('usr_faculty_1', 'faculty@nexusorbit.edu', 'demo123', 'faculty', 'Prof. Anita Roy', '+91 98765 43211', '/assets/avatars/faculty.jpg');
  insertUser.run('usr_faculty_2', 'faculty2@nexusorbit.edu', 'demo123', 'faculty', 'Prof. David Vance', '+91 98765 43212', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80');
  insertUser.run('usr_student_1', 'student@nexusorbit.edu', 'demo123', 'student', 'Aarav Sharma', '+91 98765 43220', '/assets/avatars/student.jpg');
  insertUser.run('usr_student_2', 'priya@nexusorbit.edu', 'demo123', 'student', 'Priya Patel', '+91 98765 43221', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80');
  insertUser.run('usr_student_3', 'rahul@nexusorbit.edu', 'demo123', 'student', 'Rahul Verma', '+91 98765 43222', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80');
  insertUser.run('usr_student_4', 'sneha@nexusorbit.edu', 'demo123', 'student', 'Sneha Gupta', '+91 98765 43223', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80');
  insertUser.run('usr_parent_1', 'parent@nexusorbit.edu', 'demo123', 'parent', 'Rajesh Sharma', '+91 98765 43230', '/assets/avatars/parent.jpg');

  // 2. Faculty Profiles
  const insertFaculty = db.prepare(`
    INSERT INTO faculty (id, user_id, employee_id, department, designation, cabin_number, office_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertFaculty.run('fac_1', 'usr_faculty_1', 'FAC-CSE-001', 'Computer Science & Engineering', 'Associate Professor & HOD', 'Cabin 304, Block A', 'Mon-Thu 2:00 PM - 4:00 PM');
  insertFaculty.run('fac_2', 'usr_faculty_2', 'FAC-CSE-002', 'Computer Science & Engineering', 'Assistant Professor', 'Cabin 212, Block A', 'Tue-Fri 3:00 PM - 5:00 PM');

  // 3. Student Profiles
  const insertStudent = db.prepare(`
    INSERT INTO students (id, user_id, roll_number, department, program, semester, section, mentor_id, parent_user_id, blood_group, dob, emergency_contact)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertStudent.run('stu_1', 'usr_student_1', '2024CSE042', 'Computer Science & Engineering', 'B.Tech CSE', 5, 'A', 'fac_1', 'usr_parent_1', 'O+ve', '2004-05-14', '+91 98765 43230');
  insertStudent.run('stu_2', 'usr_student_2', '2024CSE043', 'Computer Science & Engineering', 'B.Tech CSE', 5, 'A', 'fac_1', null, 'A+ve', '2004-08-22', '+91 98765 43299');
  insertStudent.run('stu_3', 'usr_student_3', '2024CSE044', 'Computer Science & Engineering', 'B.Tech CSE', 5, 'A', 'fac_1', null, 'B+ve', '2004-01-10', '+91 98765 43298');
  insertStudent.run('stu_4', 'usr_student_4', '2024CSE045', 'Computer Science & Engineering', 'B.Tech CSE', 5, 'A', 'fac_2', null, 'AB+ve', '2004-11-30', '+91 98765 43297');

  // 4. Courses
  const insertCourse = db.prepare(`
    INSERT INTO courses (id, code, title, department, semester, credits, faculty_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertCourse.run('crs_1', 'CS501', 'Advanced Database Systems', 'Computer Science & Engineering', 5, 4, 'fac_1');
  insertCourse.run('crs_2', 'CS502', 'Design and Analysis of Algorithms', 'Computer Science & Engineering', 5, 4, 'fac_2');
  insertCourse.run('crs_3', 'CS503', 'Operating Systems & System Programming', 'Computer Science & Engineering', 5, 4, 'fac_1');
  insertCourse.run('crs_4', 'CS504', 'Cloud Computing & Distributed Architecture', 'Computer Science & Engineering', 5, 3, 'fac_2');
  insertCourse.run('crs_5', 'CS505', 'Artificial Intelligence & Machine Learning', 'Computer Science & Engineering', 5, 4, 'fac_1');

  // 5. Timetable Slots (5 Days, regular schedule)
  const insertTT = db.prepare(`
    INSERT INTO timetable (id, day_of_week, start_time, end_time, course_id, faculty_id, section, room_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTT.run('tt_1', 'Monday', '09:00', '10:00', 'crs_1', 'fac_1', 'A', 'Hall 401');
  insertTT.run('tt_2', 'Monday', '10:15', '11:15', 'crs_2', 'fac_2', 'A', 'Lab 2');
  insertTT.run('tt_3', 'Monday', '11:30', '12:30', 'crs_3', 'fac_1', 'A', 'Hall 401');
  insertTT.run('tt_4', 'Tuesday', '09:00', '10:00', 'crs_4', 'fac_2', 'A', 'Hall 403');
  insertTT.run('tt_5', 'Tuesday', '10:15', '11:15', 'crs_5', 'fac_1', 'A', 'Hall 401');
  insertTT.run('tt_6', 'Tuesday', '11:30', '12:30', 'crs_1', 'fac_1', 'A', 'Hall 401');
  insertTT.run('tt_7', 'Wednesday', '09:00', '10:00', 'crs_2', 'fac_2', 'A', 'Lab 2');
  insertTT.run('tt_8', 'Wednesday', '10:15', '11:15', 'crs_3', 'fac_1', 'A', 'Hall 401');
  insertTT.run('tt_9', 'Wednesday', '11:30', '12:30', 'crs_5', 'fac_1', 'A', 'Hall 401');
  insertTT.run('tt_10', 'Thursday', '09:00', '10:00', 'crs_4', 'fac_2', 'A', 'Hall 403');
  insertTT.run('tt_11', 'Thursday', '10:15', '11:15', 'crs_1', 'fac_1', 'A', 'Hall 401');
  insertTT.run('tt_12', 'Thursday', '11:30', '12:30', 'crs_2', 'fac_2', 'A', 'Lab 2');
  insertTT.run('tt_13', 'Friday', '09:00', '10:00', 'crs_5', 'fac_1', 'A', 'Hall 401');
  insertTT.run('tt_14', 'Friday', '10:15', '12:30', 'crs_3', 'fac_1', 'A', 'Systems Lab 1');

  // 6. Attendance Sessions & Records
  const insertSession = db.prepare(`
    INSERT INTO attendance_sessions (id, course_id, faculty_id, section, session_date, slot_time, topic)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertAttRecord = db.prepare(`
    INSERT INTO attendance_records (id, session_id, student_id, status, remarks)
    VALUES (?, ?, ?, ?, ?)
  `);

  const coursesList = [
    { id: 'crs_1', sessions: 20 },
    { id: 'crs_2', sessions: 18 },
    { id: 'crs_3', sessions: 22 },
    { id: 'crs_4', sessions: 16 },
    { id: 'crs_5', sessions: 20 }
  ];

  let sessionCount = 0;
  coursesList.forEach(course => {
    for (let i = 1; i <= course.sessions; i++) {
      sessionCount++;
      const sId = `ses_${sessionCount}`;
      const d = new Date(2026, 9, 1 + (i % 28));
      const dateStr = d.toISOString().split('T')[0];
      insertSession.run(sId, course.id, 'fac_1', 'A', dateStr, '09:00 - 10:00', `Unit Module Lecture #${i}`);

      // Student 1 (Aarav): High attendance in crs_1, crs_3, crs_4, crs_5 (~88%), but lower in crs_2 (Algorithms ~66% to trigger alert!)
      let st1Status = 'present';
      if (course.id === 'crs_2' && i % 3 === 0) {
        st1Status = 'absent';
      } else if (i % 8 === 0) {
        st1Status = 'absent';
      }
      insertAttRecord.run(`att_${sessionCount}_stu1`, sId, 'stu_1', st1Status, st1Status === 'absent' ? 'Unexcused' : 'On time');

      // Student 2 (Priya): ~95%
      insertAttRecord.run(`att_${sessionCount}_stu2`, sId, 'stu_2', i === 7 ? 'absent' : 'present', 'Active');
      
      // Student 3 (Rahul): ~62% (At-risk student)
      insertAttRecord.run(`att_${sessionCount}_stu3`, sId, 'stu_3', i % 3 === 0 ? 'absent' : 'present', '');

      // Student 4 (Sneha): ~85%
      insertAttRecord.run(`att_${sessionCount}_stu4`, sId, 'stu_4', i % 6 === 0 ? 'absent' : 'present', '');
    }
  });

  // 7. Assessments and Marks
  const insertAssess = db.prepare(`
    INSERT INTO assessments (id, course_id, faculty_id, section, title, assessment_type, max_marks, weightage, assessment_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertMark = db.prepare(`
    INSERT INTO marks_records (id, assessment_id, student_id, marks_obtained, remarks)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertAssess.run('asm_1', 'crs_1', 'fac_1', 'A', 'Database Systems Midterm', 'Midterm 1', 50, 25, '2026-10-10');
  insertMark.run('mrk_1_1', 'asm_1', 'stu_1', 44, 'Excellent query optimization answers');
  insertMark.run('mrk_1_2', 'asm_1', 'stu_2', 48, 'Outstanding');
  insertMark.run('mrk_1_3', 'asm_1', 'stu_3', 28, 'Needs to revise normal forms');
  insertMark.run('mrk_1_4', 'asm_1', 'stu_4', 39, 'Good performance');

  insertAssess.run('asm_2', 'crs_2', 'fac_2', 'A', 'Algorithms Dynamic Programming Quiz', 'Quiz', 20, 10, '2026-10-15');
  insertMark.run('mrk_2_1', 'asm_2', 'stu_1', 14, 'Missed recurrence relation');
  insertMark.run('mrk_2_2', 'asm_2', 'stu_2', 19, 'Perfect complexity derivation');
  insertMark.run('mrk_2_3', 'asm_2', 'stu_3', 9, 'Critical: below 50%');
  insertMark.run('mrk_2_4', 'asm_2', 'stu_4', 16, 'Solid understanding');

  insertAssess.run('asm_3', 'crs_3', 'fac_1', 'A', 'Operating Systems Concurrency Lab', 'Lab Practical', 30, 15, '2026-10-20');
  insertMark.run('mrk_3_1', 'asm_3', 'stu_1', 28, 'Clean semaphore implementation');
  insertMark.run('mrk_3_2', 'asm_3', 'stu_2', 30, 'Flawless deadlock solution');
  insertMark.run('mrk_3_3', 'asm_3', 'stu_3', 18, 'Race condition not handled');
  insertMark.run('mrk_3_4', 'asm_3', 'stu_4', 25, 'Well structured');

  insertAssess.run('asm_4', 'crs_5', 'fac_1', 'A', 'AI & Machine Learning Midterm', 'Midterm 1', 50, 25, '2026-10-24');
  insertMark.run('mrk_4_1', 'asm_4', 'stu_1', 46, 'Very thorough answers on backprop');
  insertMark.run('mrk_4_2', 'asm_4', 'stu_2', 47, 'Top tier response');
  insertMark.run('mrk_4_3', 'asm_4', 'stu_3', 24, 'Struggled with loss function derivatives');
  insertMark.run('mrk_4_4', 'asm_4', 'stu_4', 41, 'Strong analytical breakdown');

  // 8. Assignments and Submissions
  const insertAssign = db.prepare(`
    INSERT INTO assignments (id, course_id, faculty_id, section, title, description, due_date, max_marks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertSub = db.prepare(`
    INSERT INTO assignment_submissions (id, assignment_id, student_id, submission_text, file_name, submitted_at, status, marks_awarded, faculty_feedback)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAssign.run('asg_1', 'crs_1', 'fac_1', 'A', 'Relational Schema Design & BCNF Normalization', 'Design a normalised 3NF/BCNF relational database schema for a multi-tenant hospital management system. Provide SQL DDL queries, foreign key constraints, and explain all transitive functional dependencies.', '2026-11-04', 100);
  insertSub.run('sub_1_1', 'asg_1', 'stu_1', 'Implemented normalized schemas for Hospital OPD, IPD, and Pharmacy modules with 3NF and BCNF validation.', 'Hospital_Schema_2024CSE042.pdf', '2026-10-25 14:30:00', 'graded', 94, 'Well reasoned Boyce-Codd normal form decomposition.');
  insertSub.run('sub_1_2', 'asg_1', 'stu_2', 'Complete project submission with documentation and ER diagrams.', 'DBMS_Project_Priya.pdf', '2026-10-24 18:00:00', 'graded', 98, 'Exceptional completeness.');
  insertSub.run('sub_1_3', 'asg_1', 'stu_3', 'Draft schema attached.', 'schema_rough.sql', '2026-10-26 23:55:00', 'submitted', null, null);

  insertAssign.run('asg_2', 'crs_5', 'fac_1', 'A', 'Convolutional Neural Network for Medical Imaging', 'Implement a PyTorch CNN model to classify chest X-ray scans. Calculate precision, recall, AUC-ROC curve, and analyze false negatives.', '2026-11-10', 100);
  // Student 1 has not submitted asg_2 yet (Pending)
  
  insertAssign.run('asg_3', 'crs_2', 'fac_2', 'A', 'Graph Algorithms & Minimum Spanning Trees', 'Implement Kruskal and Prim algorithms with Disjoint Set Union (Union-Find) and priority queues. Benchmark performance on large random graphs.', '2026-10-20', 50);
  insertSub.run('sub_3_1', 'asg_3', 'stu_1', 'Benchmark source code and performance comparison graph included.', 'MST_Benchmark_Aarav.zip', '2026-10-19 21:10:00', 'graded', 45, 'Great amortized time analysis.');

  // 9. Notices and Announcements
  const insertNotice = db.prepare(`
    INSERT INTO notices (id, title, content, category, priority, target_audience, published_by, publish_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertNotice.run('not_1', 'Mid-Term Semester Examination Schedule Announced', 'The Office of the Controller of Examinations has published the final datesheet for the 5th Semester B.Tech Mid-Term Examinations. Students must check their hall allocation and report 15 minutes before exam commencement with valid college ID cards.', 'Examination', 'urgent', 'all', 'usr_admin', '2026-10-26');
  insertNotice.run('not_2', 'Annual NexusOrbit Hackathon 2026 — Registration Open', 'Registrations are now open for the campus-wide Innovation Hackathon. Over $5,000 in grand prizes. Tracks include AI & ML, Green Tech, and Cloud Native Architectures. Form your teams before November 5.', 'Campus Life', 'high', 'students', 'usr_faculty_1', '2026-10-25');
  insertNotice.run('not_3', 'Parent-Teacher Academic Interaction Meet (PTM)', 'A formal academic consultation session is organized on Saturday, November 14, 2026 from 10:00 AM to 1:00 PM. Parents can review student progress, attendance reports, and discuss academic pathways with faculty advisors.', 'Academic', 'normal', 'parents', 'usr_admin', '2026-10-24');
  insertNotice.run('not_4', 'Library Extended Study Hours for Exam Preparation', 'The Central Digital Library will remain open 24/7 during the upcoming examination weeks. High-speed Wi-Fi and seminar discussion rooms are available upon prior booking.', 'Campus Life', 'normal', 'all', 'usr_admin', '2026-10-22');

  // 10. Fee Structures and Payments
  const insertFee = db.prepare(`
    INSERT INTO fee_structures (id, student_id, semester, category, total_amount, paid_amount, due_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertTrans = db.prepare(`
    INSERT INTO fee_transactions (id, fee_structure_id, student_id, receipt_number, amount, payment_method, transaction_reference, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFee.run('fee_1_1', 'stu_1', 5, 'Tuition Fee (Semester 5)', 65000, 65000, '2026-08-15', 'paid');
  insertTrans.run('tx_1', 'fee_1_1', 'stu_1', 'NXO-2026-REC-00842', 65000, 'UPI / NetBanking', 'HDFC9821374921', 'Semester 5 Tuition Fee Full Payment');

  insertFee.run('fee_1_2', 'stu_1', 5, 'Advanced Lab & Digital Infrastructure Fee', 15000, 15000, '2026-08-15', 'paid');
  insertTrans.run('tx_2', 'fee_1_2', 'stu_1', 'NXO-2026-REC-00843', 15000, 'NetBanking', 'HDFC9821374922', 'Specialised Computing Labs');

  insertFee.run('fee_1_3', 'stu_1', 5, 'Hostel & Mess Charges (Term 2)', 35000, 20000, '2026-11-15', 'partial');
  insertTrans.run('tx_3', 'fee_1_3', 'stu_1', 'NXO-2026-REC-01104', 20000, 'Debit Card', 'SBI4491028374', 'Term 2 Hostel Installment 1');

  insertFee.run('fee_1_4', 'stu_1', 5, 'Semester Examination & Certification Fee', 3500, 0, '2026-11-05', 'pending');

  // 11. Academic Early Alerts
  const insertAlert = db.prepare(`
    INSERT INTO academic_alerts (id, student_id, alert_type, severity, title, description, recommended_action, is_resolved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAlert.run('alt_1', 'stu_1', 'low_attendance', 'warning', 'Low Attendance Alert: CS502 Algorithms', 'Current attendance in Design and Analysis of Algorithms is 66.7%, which is below the mandatory institutional threshold of 75%.', 'Attend the next 4 consecutive classes without absence to restore eligibility before mid-term exams.', 0);
  insertAlert.run('alt_2', 'stu_1', 'overdue_assignment', 'info', 'Upcoming Assignment Due in 48 Hours', 'CS505 Convolutional Neural Network Assignment is due on Nov 10, 2026 at 11:59 PM.', 'Submit draft notebook via the assignment portal before deadline.', 0);
  insertAlert.run('alt_3', 'stu_3', 'low_attendance', 'critical', 'Critical Attendance Alert: CS501, CS502 & CS503', 'Overall attendance is at 62.1%. Risk of examination debarment if not immediately addressed.', 'Immediate meeting with Academic Mentor Prof. Anita Roy required.', 0);

  console.log('[NexusOrbit DB] Seeding completed successfully.');
}

module.exports = {
  getDatabase,
  initSchema,
  seedData,
  DB_PATH
};
