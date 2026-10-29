/**
 * NexusOrbit - Dedicated Attendance Module View
 */
const AttendanceView = {
  async render() {
    const user = window.App.currentUser;
    const isStudentOrParent = user.role === 'student' || user.role === 'parent';
    const targetStudentId = user.role === 'student' ? user.student?.id :
      user.role === 'parent' ? user.linkedStudent?.id : 'stu_1';

    const attData = await window.API.getAttendance(targetStudentId);
    const subjects = attData.subjects || [];
    const logs = attData.recentLogs || [];

    return `
      <div class="view-attendance animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800;">Campus Attendance Registry</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted);">Institutional threshold: 75% minimum attendance required for exam eligibility.</p>
          </div>
          ${!isStudentOrParent ? `
            <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem;" onclick="window.App.navigate('faculty-dashboard')">
              📋 Take Class Attendance
            </button>
          ` : ''}
        </div>

        <!-- Subject Overview Cards -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">📊 Subject Attendance Breakdown</h3>
          </div>
          <div class="panel-body">
            ${window.ChartComponents.renderSubjectAttendanceBars(subjects)}
          </div>
        </div>

        <!-- Session-by-Session Historical Log -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">⏱️ Session-by-Session Attendance Logs</h3>
            <span class="badge badge-info">Latest 25 Sessions</span>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time Slot</th>
                    <th>Course</th>
                    <th>Topic / Module</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${logs.map(l => `
                    <tr>
                      <td>${l.session_date}</td>
                      <td>${l.slot_time}</td>
                      <td><strong>${l.course_code}</strong> - ${l.course_title}</td>
                      <td>${l.topic || 'Classroom Lecture'}</td>
                      <td>
                        <span class="badge ${l.status === 'present' ? 'badge-success' : 'badge-danger'}">
                          ${l.status.toUpperCase()}
                        </span>
                      </td>
                      <td style="color: var(--text-subtle);">${l.remarks || '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

window.AttendanceView = AttendanceView;
