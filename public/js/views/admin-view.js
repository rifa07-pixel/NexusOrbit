/**
 * NexusOrbit - Administrator Dashboard View
 */
const AdminView = {
  async render() {
    const stats = await window.API.getDashboardStats();
    const students = await window.API.getStudents();
    const faculty = await window.API.getFaculty();
    const courses = await window.API.getCourses();
    const alertsData = await window.API.getAlerts();
    const alerts = alertsData.alerts || [];

    return `
      <div class="view-admin animate-fade-in">
        <!-- Top Metrics Cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Total Enrolled</span>
              <div class="metric-icon-wrap" style="background-color: var(--brand-blue-glow); color: var(--brand-blue-accent);">🎓</div>
            </div>
            <div class="metric-value">${stats.totalStudents || 0}</div>
            <div class="metric-footer">Across all undergraduate batches</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Faculty Members</span>
              <div class="metric-icon-wrap" style="background-color: #fef3c7; color: #d97706;">🏛️</div>
            </div>
            <div class="metric-value">${stats.totalFaculty || 0}</div>
            <div class="metric-footer">Permanent & Visiting Professors</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Campus Attendance</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-success-bg); color: var(--color-success);">📊</div>
            </div>
            <div class="metric-value">${stats.overallAttendance || 0}%</div>
            <div class="metric-footer">Institutional target: 75%+</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Fee Collection</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-info-bg); color: var(--color-info);">💳</div>
            </div>
            <div class="metric-value">₹${((stats.feePaid || 0) / 1000).toFixed(0)}k</div>
            <div class="metric-footer">Pending dues: ₹${((stats.feePending || 0) / 1000).toFixed(0)}k</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Academic Alerts</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-danger-bg); color: var(--color-danger);">⚠️</div>
            </div>
            <div class="metric-value" style="color: var(--color-danger);">${stats.activeAlerts || 0}</div>
            <div class="metric-footer">Immediate intervention needed</div>
          </div>
        </div>

        <!-- Academic Early Alerts Section -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">
              <span style="color: var(--color-danger);">⚠️</span> Active Academic Risk Alerts
            </h3>
            <span class="badge badge-danger">${alerts.filter(a => !a.is_resolved).length} Unresolved</span>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Student Name</th>
                    <th>Roll Number</th>
                    <th>Issue Description</th>
                    <th>Recommended Next Step</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${alerts.map(a => `
                    <tr style="${a.is_resolved ? 'opacity: 0.5;' : ''}">
                      <td>
                        <span class="badge ${a.severity === 'critical' ? 'badge-danger' : a.severity === 'warning' ? 'badge-warning' : 'badge-info'}">
                          ${a.severity.toUpperCase()}
                        </span>
                      </td>
                      <td style="font-weight: 600;">${a.student_name || 'Student'}</td>
                      <td><code>${a.roll_number || 'N/A'}</code></td>
                      <td>${a.title}: <small style="color: var(--text-muted);">${a.description}</small></td>
                      <td style="color: var(--brand-blue-accent); font-size: 0.8125rem;">${a.recommended_action}</td>
                      <td>
                        ${a.is_resolved ? 
                          '<span class="badge badge-success">Resolved</span>' : 
                          `<button class="btn-primary" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="AdminView.resolveAlert('${a.id}')">Resolve</button>`
                        }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Two Column Layout: Students Directory & Course Allocations -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 1.5rem;">
          <!-- Student Directory -->
          <div class="card-panel">
            <div class="panel-header">
              <h3 class="panel-title">👨‍🎓 Student Directory & Standing</h3>
              <span class="badge badge-info">${students.students.length} Enrolled</span>
            </div>
            <div class="panel-body" style="padding: 0;">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Roll No</th>
                      <th>Student</th>
                      <th>Program</th>
                      <th>Attendance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${students.students.map(s => `
                      <tr>
                        <td><code>${s.roll_number}</code></td>
                        <td>
                          <div style="font-weight: 600;">${s.full_name}</div>
                          <div style="font-size: 0.75rem; color: var(--text-subtle);">${s.email}</div>
                        </td>
                        <td>${s.program} (Sem ${s.semester})</td>
                        <td>
                          <span style="font-weight: 700; color: ${s.attendance_percentage < 75 ? 'var(--color-danger)' : 'var(--color-success)'};">
                            ${s.attendance_percentage}%
                          </span>
                        </td>
                        <td>
                          ${s.is_at_risk ? 
                            '<span class="badge badge-danger">At Risk</span>' : 
                            '<span class="badge badge-success">Good Standing</span>'}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Faculty Directory -->
          <div class="card-panel">
            <div class="panel-header">
              <h3 class="panel-title">🏛️ Faculty Registry</h3>
              <span class="badge badge-info">${faculty.faculty.length} Faculty</span>
            </div>
            <div class="panel-body" style="padding: 0;">
              <div class="table-responsive">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Professor</th>
                      <th>Department</th>
                      <th>Cabin / Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${faculty.faculty.map(f => `
                      <tr>
                        <td><code>${f.employee_id}</code></td>
                        <td>
                          <div style="font-weight: 600;">${f.full_name}</div>
                          <div style="font-size: 0.75rem; color: var(--text-subtle);">${f.designation}</div>
                        </td>
                        <td>${f.department}</td>
                        <td>
                          <div style="font-size: 0.8125rem;">${f.cabin_number || 'Main Faculty Block'}</div>
                          <div style="font-size: 0.7rem; color: var(--text-muted);">${f.office_hours || 'Mon-Fri 2-4 PM'}</div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- Courses Management -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">📚 Course Catalog & Faculty Allocations</h3>
            <button class="btn-primary" style="width: auto; padding: 0.4rem 0.85rem; font-size: 0.8125rem;" onclick="window.App.openNewNoticeModal()">
              📢 Publish Campus Announcement
            </button>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Course Title</th>
                    <th>Credits</th>
                    <th>Department</th>
                    <th>Assigned Lead Professor</th>
                  </tr>
                </thead>
                <tbody>
                  ${courses.courses.map(c => `
                    <tr>
                      <td><span class="badge badge-info">${c.code}</span></td>
                      <td style="font-weight: 600;">${c.title}</td>
                      <td>${c.credits} Credits</td>
                      <td>${c.department}</td>
                      <td style="color: var(--brand-blue-accent); font-weight: 500;">${c.faculty_name || 'Unassigned'}</td>
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

  async resolveAlert(alertId) {
    try {
      await window.API.resolveAlert(alertId);
      window.App.showToast('Academic alert marked as addressed.', 'success');
      window.App.navigate('dashboard');
    } catch (e) {
      window.App.showToast(e.message, 'danger');
    }
  }
};

window.AdminView = AdminView;
