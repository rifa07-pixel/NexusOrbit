/**
 * NexusOrbit - Marks & Academic Results View
 */
const MarksView = {
  async render() {
    const user = window.App.currentUser;
    const isStudentOrParent = user.role === 'student' || user.role === 'parent';
    const targetStudentId = user.role === 'student' ? user.student?.id :
      user.role === 'parent' ? user.linkedStudent?.id : 'stu_1';

    const marksData = await window.API.getMarks(targetStudentId);
    const summaries = marksData.courseSummaries || [];
    const allMarks = marksData.marks || [];

    return `
      <div class="view-marks animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800;">Academic Performance & Results</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted);">Verified internal assessment marks, quizzes, and laboratory practicals.</p>
          </div>
          ${!isStudentOrParent ? `
            <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem;" onclick="MarksView.openNewAssessmentModal()">
              ➕ Create Assessment
            </button>
          ` : ''}
        </div>

        <!-- Course Summary Cards -->
        <div class="metrics-grid">
          ${summaries.map(c => `
            <div class="metric-card">
              <div class="metric-header">
                <span class="metric-title">${c.course_code}</span>
                <span class="badge ${c.percentage >= 75 ? 'badge-success' : 'badge-warning'}">${c.percentage}%</span>
              </div>
              <div style="font-weight: 700; font-size: 1rem; color: var(--text-main); margin-bottom: 0.5rem;">
                ${c.course_title}
              </div>
              <div class="metric-footer">
                ${c.totalObtained} / ${c.totalMax} pts (${c.credits} Credits)
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Detailed Marks Sheet -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">🏆 Continuous Assessment Breakdown</h3>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Assessment Title</th>
                    <th>Type</th>
                    <th>Course</th>
                    <th>Score Obtained</th>
                    <th>Max Marks</th>
                    <th>Percentage</th>
                    <th>Faculty Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${allMarks.map(m => {
                    const pct = m.max_marks > 0 ? Math.round((m.marks_obtained / m.max_marks) * 100) : 0;
                    return `
                      <tr>
                        <td>${m.assessment_date}</td>
                        <td style="font-weight: 600;">${m.assessment_title}</td>
                        <td><span class="badge badge-info">${m.assessment_type}</span></td>
                        <td>${m.course_title} (${m.course_code})</td>
                        <td style="font-weight: 700; color: var(--text-main);">${m.marks_obtained}</td>
                        <td>${m.max_marks}</td>
                        <td>
                          <span class="badge ${pct >= 75 ? 'badge-success' : pct >= 50 ? 'badge-warning' : 'badge-danger'}">
                            ${pct}%
                          </span>
                        </td>
                        <td style="color: var(--text-muted); font-size: 0.8125rem;">${m.remarks || '-'}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  openNewAssessmentModal() {
    window.App.openModal(`
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem; font-weight: 700;">Create Assessment</h3>
          <button class="btn-icon" onclick="window.App.closeModal()">✕</button>
        </div>
        <form onsubmit="MarksView.submitNewAssessment(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Course</label>
              <select id="asm-modal-course" class="form-input">
                <option value="crs_1">CS501 - Advanced Database Systems</option>
                <option value="crs_2">CS502 - Design and Analysis of Algorithms</option>
                <option value="crs_3">CS503 - Operating Systems</option>
                <option value="crs_5">CS505 - Artificial Intelligence & ML</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Title</label>
              <input type="text" id="asm-modal-title" class="form-input" placeholder="e.g. End Semester Practical Exam" required />
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select id="asm-modal-type" class="form-input">
                <option value="Midterm 1">Midterm 1</option>
                <option value="Midterm 2">Midterm 2</option>
                <option value="Quiz">Quiz</option>
                <option value="Lab Practical">Lab Practical</option>
                <option value="End Semester">End Semester</option>
              </select>
            </div>
            <div style="display: flex; gap: 1rem;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Max Marks</label>
                <input type="number" id="asm-modal-max" class="form-input" value="50" required />
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Date</label>
                <input type="date" id="asm-modal-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required />
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-icon" style="width: auto; padding: 0.5rem 1rem;" onclick="window.App.closeModal()">Cancel</button>
            <button type="submit" class="btn-primary" style="width: auto; padding: 0.5rem 1.25rem;">Create Assessment</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitNewAssessment(e) {
    e.preventDefault();
    const course_id = document.getElementById('asm-modal-course').value;
    const title = document.getElementById('asm-modal-title').value;
    const assessment_type = document.getElementById('asm-modal-type').value;
    const max_marks = Number(document.getElementById('asm-modal-max').value);
    const assessment_date = document.getElementById('asm-modal-date').value;

    try {
      await window.API.createAssessment({
        course_id,
        section: 'A',
        title,
        assessment_type,
        max_marks,
        weightage: 20,
        assessment_date
      });
      window.App.closeModal();
      window.App.showToast(`Assessment "${title}" created successfully!`, 'success');
      window.App.navigate('marks');
    } catch (err) {
      window.App.showToast(err.message, 'danger');
    }
  }
};

window.MarksView = MarksView;
