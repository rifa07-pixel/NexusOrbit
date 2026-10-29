/**
 * NexusOrbit - Faculty Workspace View
 */
const FacultyView = {
  activeAttendanceCourse: 'crs_1',
  activeAttendanceSection: 'A',
  attendanceStudents: [],

  async render() {
    const stats = await window.API.getDashboardStats();
    const studentsData = await window.API.getStudents();
    const coursesData = await window.API.getCourses();
    const assignmentsData = await window.API.getAssignments();
    const alertsData = await window.API.getAlerts();

    const students = studentsData.students || [];
    const courses = coursesData.courses || [];
    const assignments = assignmentsData.assignments || [];
    const alerts = alertsData.alerts || [];

    // Cache students for attendance sheet
    this.attendanceStudents = students;

    const atRiskStudents = students.filter(s => s.is_at_risk || s.attendance_percentage < 75);

    return `
      <div class="view-faculty animate-fade-in">
        <!-- Faculty KPI Metrics -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Teaching Courses</span>
              <div class="metric-icon-wrap" style="background-color: var(--brand-blue-glow); color: var(--brand-blue-accent);">📖</div>
            </div>
            <div class="metric-value">${stats.coursesAssigned || 3}</div>
            <div class="metric-footer">Active 5th Semester Sections</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Lectures Taken</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-success-bg); color: var(--color-success);">⏱️</div>
            </div>
            <div class="metric-value">${stats.sessionsConducted || 42}</div>
            <div class="metric-footer">Sessions logged in system</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Coursework to Grade</span>
              <div class="metric-icon-wrap" style="background-color: #fef3c7; color: #d97706;">📝</div>
            </div>
            <div class="metric-value">${stats.pendingGrading || 1}</div>
            <div class="metric-footer">Pending student submissions</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Students Requiring Attention</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-danger-bg); color: var(--color-danger);">⚠️</div>
            </div>
            <div class="metric-value" style="color: var(--color-danger);">${atRiskStudents.length}</div>
            <div class="metric-footer">&lt;75% attendance or failing scores</div>
          </div>
        </div>

        <!-- At-Risk Early Alerts Notice -->
        ${atRiskStudents.length > 0 ? `
          <div class="risk-alert-card critical">
            <span style="font-size: 1.25rem;">⚠️</span>
            <div class="alert-content">
              <h4>${atRiskStudents.length} Students Flagged for Attendance or Academic Deficit</h4>
              <p>Rahul Verma (Roll: 2024CSE044, 62.1% Attendance) and Aarav Sharma (CS502 Algorithms 66.7%) require intervention before semester exam hall tickets are generated.</p>
              <div class="alert-action-tag">Click student profile below to review advisory notes.</div>
            </div>
          </div>
        ` : ''}

        <!-- Interactive Attendance Recording Module -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">📋 Mark Daily Session Attendance</h3>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
              <select id="fac-att-course" class="form-input" style="width: auto; padding: 0.35rem 0.75rem;" onchange="FacultyView.onCourseChange(this.value)">
                ${courses.map(c => `<option value="${c.id}" ${c.id === 'crs_1' ? 'selected' : ''}>${c.code} - ${c.title}</option>`).join('')}
              </select>
              <button class="btn-primary" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.8125rem; background: var(--color-success);" onclick="FacultyView.markAll('present')">
                ✓ Mark All Present
              </button>
            </div>
          </div>
          <div class="panel-body">
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 200px;">
                <label class="form-label">Session Topic</label>
                <input type="text" id="fac-session-topic" class="form-input" placeholder="e.g. BCNF Functional Dependencies & Normalization" value="Query Execution Plans & B-Trees" />
              </div>
              <div style="width: 180px;">
                <label class="form-label">Date</label>
                <input type="date" id="fac-session-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" />
              </div>
              <div style="width: 160px;">
                <label class="form-label">Slot</label>
                <input type="text" id="fac-session-slot" class="form-input" value="09:00 - 10:00 AM" />
              </div>
            </div>

            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Student Name</th>
                    <th>Current Attendance</th>
                    <th>Session Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody id="fac-attendance-tbody">
                  ${students.map(s => `
                    <tr data-student-id="${s.id}">
                      <td><code>${s.roll_number}</code></td>
                      <td style="font-weight: 600;">${s.full_name}</td>
                      <td>
                        <span style="font-weight: 700; color: ${s.attendance_percentage < 75 ? 'var(--color-danger)' : 'var(--color-success)'};">
                          ${s.attendance_percentage}%
                        </span>
                      </td>
                      <td>
                        <div style="display: flex; gap: 0.35rem;">
                          <label style="cursor: pointer; display: flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem;">
                            <input type="radio" name="att_status_${s.id}" value="present" checked /> Present
                          </label>
                          <label style="cursor: pointer; display: flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem; margin-left: 0.5rem;">
                            <input type="radio" name="att_status_${s.id}" value="absent" /> <span style="color: var(--color-danger);">Absent</span>
                          </label>
                        </div>
                      </td>
                      <td>
                        <input type="text" class="form-input att-remark-input" style="padding: 0.25rem 0.5rem; font-size: 0.8125rem;" placeholder="Optional remark" />
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div style="margin-top: 1.25rem; display: flex; justify-content: flex-end;">
              <button class="btn-primary" style="width: auto; padding: 0.65rem 1.5rem;" onclick="FacultyView.submitAttendanceSession()">
                💾 Save Attendance Session
              </button>
            </div>
          </div>
        </div>

        <!-- Assignments & Grading Module -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">📚 Coursework Assignments & Submissions</h3>
            <button class="btn-primary" style="width: auto; padding: 0.4rem 0.85rem; font-size: 0.8125rem;" onclick="FacultyView.openNewAssignmentModal()">
              ➕ Publish Assignment
            </button>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Course</th>
                    <th>Due Date</th>
                    <th>Max Marks</th>
                    <th>Submissions</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${assignments.map(a => `
                    <tr>
                      <td style="font-weight: 600;">${a.title}</td>
                      <td><span class="badge badge-info">${a.code || a.course_code || 'CS501'}</span></td>
                      <td>${a.due_date}</td>
                      <td>${a.max_marks} pts</td>
                      <td>
                        <span class="badge badge-success">${a.submissions_count || 3} Submitted</span>
                      </td>
                      <td>
                        <button class="btn-primary" style="width: auto; padding: 0.25rem 0.65rem; font-size: 0.75rem;" onclick="FacultyView.viewSubmissions('${a.id}', '${a.title.replace(/'/g, "\\'")}')">
                          Review & Grade
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  markAll(status) {
    document.querySelectorAll('#fac-attendance-tbody input[type="radio"]').forEach(radio => {
      if (radio.value === status) radio.checked = true;
    });
    window.App.showToast(`Marked all students as ${status}`, 'info');
  },

  async submitAttendanceSession() {
    const courseId = document.getElementById('fac-att-course').value;
    const topic = document.getElementById('fac-session-topic').value;
    const sessionDate = document.getElementById('fac-session-date').value;
    const slot = document.getElementById('fac-session-slot').value;

    const rows = document.querySelectorAll('#fac-attendance-tbody tr');
    const records = [];

    rows.forEach(row => {
      const studentId = row.getAttribute('data-student-id');
      const selectedRadio = row.querySelector(`input[name="att_status_${studentId}"]:checked`);
      const remarkInput = row.querySelector('.att-remark-input');

      records.push({
        student_id: studentId,
        status: selectedRadio ? selectedRadio.value : 'present',
        remarks: remarkInput ? remarkInput.value : ''
      });
    });

    try {
      const res = await window.API.recordAttendanceSession({
        course_id: courseId,
        section: 'A',
        session_date: sessionDate,
        slot_time: slot,
        topic,
        records
      });

      window.App.showToast(`Session recorded! ${records.length} student records updated.`, 'success');
      window.App.navigate('faculty-dashboard');
    } catch (e) {
      window.App.showToast(`Error saving attendance: ${e.message}`, 'danger');
    }
  },

  openNewAssignmentModal() {
    window.App.openModal(`
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem; font-weight: 700;">Publish New Assignment</h3>
          <button class="btn-icon" onclick="window.App.closeModal()">✕</button>
        </div>
        <form onsubmit="FacultyView.submitNewAssignment(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Course</label>
              <select id="asg-modal-course" class="form-input" required>
                <option value="crs_1">CS501 - Advanced Database Systems</option>
                <option value="crs_3">CS503 - Operating Systems & System Programming</option>
                <option value="crs_5">CS505 - Artificial Intelligence & Machine Learning</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Assignment Title</label>
              <input type="text" id="asg-modal-title" class="form-input" placeholder="e.g. Deadlock Detection in Distributed OS" required />
            </div>
            <div class="form-group">
              <label class="form-label">Description & Instructions</label>
              <textarea id="asg-modal-desc" class="form-input" rows="3" placeholder="Provide problem statement, formatting guidelines, and evaluation rubric..." required></textarea>
            </div>
            <div style="display: flex; gap: 1rem;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Due Date</label>
                <input type="date" id="asg-modal-due" class="form-input" value="${new Date(Date.now() + 7*86400000).toISOString().split('T')[0]}" required />
              </div>
              <div class="form-group" style="width: 140px;">
                <label class="form-label">Max Marks</label>
                <input type="number" id="asg-modal-max" class="form-input" value="100" min="10" max="100" required />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-icon" style="width: auto; padding: 0.5rem 1rem;" onclick="window.App.closeModal()">Cancel</button>
            <button type="submit" class="btn-primary" style="width: auto; padding: 0.5rem 1.25rem;">Publish to Students</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitNewAssignment(e) {
    e.preventDefault();
    const course_id = document.getElementById('asg-modal-course').value;
    const title = document.getElementById('asg-modal-title').value;
    const description = document.getElementById('asg-modal-desc').value;
    const due_date = document.getElementById('asg-modal-due').value;
    const max_marks = Number(document.getElementById('asg-modal-max').value);

    try {
      await window.API.createAssignment({
        course_id,
        section: 'A',
        title,
        description,
        due_date,
        max_marks
      });
      window.App.closeModal();
      window.App.showToast(`Assignment "${title}" published successfully!`, 'success');
      window.App.navigate('faculty-dashboard');
    } catch (err) {
      window.App.showToast(err.message, 'danger');
    }
  },

  async viewSubmissions(assignmentId, title) {
    try {
      const res = await window.API.getSubmissions(assignmentId);
      const subs = res.submissions || [];

      window.App.openModal(`
        <div class="modal-card" style="max-width: 680px;">
          <div class="modal-header">
            <div>
              <h3 style="font-size: 1.1rem; font-weight: 700;">Submissions: ${title}</h3>
              <div style="font-size: 0.75rem; color: var(--text-subtle);">${subs.length} total student submissions received</div>
            </div>
            <button class="btn-icon" onclick="window.App.closeModal()">✕</button>
          </div>
          <div class="modal-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Submitted File</th>
                    <th>Submission Text</th>
                    <th>Score / Grade</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${subs.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: 1.5rem;">No submissions yet.</td></tr>' : 
                    subs.map(s => `
                      <tr>
                        <td>
                          <div style="font-weight: 600;">${s.student_name}</div>
                          <div style="font-size: 0.75rem; color: var(--text-subtle);">${s.roll_number}</div>
                        </td>
                        <td>
                          <span style="font-size: 0.8125rem; color: var(--brand-blue-accent);">📎 ${s.file_name || 'Document.pdf'}</span>
                        </td>
                        <td style="font-size: 0.8125rem; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                          ${s.submission_text || 'Submitted coursework solution'}
                        </td>
                        <td>
                          ${s.marks_awarded !== null ? 
                            `<span class="badge badge-success">${s.marks_awarded} pts</span>` : 
                            '<span class="badge badge-warning">Ungraded</span>'}
                        </td>
                        <td>
                          <button class="btn-primary" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="FacultyView.gradeSingleSubmission('${s.id}', '${s.student_name}')">
                            Grade
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-primary" style="width: auto; padding: 0.4rem 1rem;" onclick="window.App.closeModal()">Done</button>
          </div>
        </div>
      `);
    } catch (err) {
      window.App.showToast(err.message, 'danger');
    }
  },

  gradeSingleSubmission(subId, studentName) {
    const marks = prompt(`Enter marks awarded for ${studentName} (out of 100):`, '92');
    if (marks === null) return;
    const feedback = prompt(`Enter feedback for ${studentName}:`, 'Clear analysis and well-structured diagrams.');
    
    window.API.gradeSubmission(subId, Number(marks), feedback || '')
      .then(() => {
        window.App.showToast(`Grade recorded for ${studentName}!`, 'success');
        window.App.closeModal();
      })
      .catch(err => window.App.showToast(err.message, 'danger'));
  }
};

window.FacultyView = FacultyView;
