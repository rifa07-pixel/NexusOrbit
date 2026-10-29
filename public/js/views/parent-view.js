/**
 * NexusOrbit - Parent Portal View
 * Strictly scoped to authorized linked student
 */
const ParentView = {
  async render() {
    const user = window.App.currentUser;
    const child = user.linkedStudent;

    if (!child) {
      return `
        <div class="card-panel" style="padding: 2rem; text-align: center;">
          <h3>No Student Linked</h3>
          <p style="color: var(--text-muted);">No student record is associated with this parent demonstration account.</p>
        </div>
      `;
    }

    const stats = await window.API.getDashboardStats();
    const attData = await window.API.getAttendance(child.id);
    const marksData = await window.API.getMarks(child.id);
    const feeData = await window.API.getFees(child.id);
    const timetableData = await window.API.getTimetable(child.section || 'A');
    const noticesData = await window.API.getNotices('', '');

    const subjects = attData.subjects || [];
    const marksList = marksData.marks || [];
    const fees = feeData.fees || [];
    const timetable = timetableData.slots || [];
    const notices = noticesData.notices || [];

    const lowSubjects = subjects.filter(s => s.percentage < 75);

    return `
      <div class="view-parent animate-fade-in">
        <!-- Linked Ward Identity Card -->
        <div class="card-panel" style="background: linear-gradient(135deg, #0b132b 0%, #1c2541 100%); color: #ffffff; margin-bottom: 1.5rem;">
          <div style="padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 1.25rem;">
              <img src="${child.avatar_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80'}" 
                alt="${child.full_name}" 
                style="width: 68px; height: 68px; border-radius: 50%; border: 3px solid rgba(255, 255, 255, 0.2); object-fit: cover;" />
              <div>
                <span class="badge" style="background: rgba(37, 99, 235, 0.3); color: #93c5fd; border: 1px solid rgba(147, 197, 253, 0.3); margin-bottom: 0.35rem;">
                  Authorized Ward Record
                </span>
                <h2 style="font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em;">
                  ${child.full_name}
                </h2>
                <div style="font-size: 0.8125rem; color: #94a3b8; display: flex; gap: 0.75rem; flex-wrap: wrap;">
                  <span>Roll No: <strong style="color: #fff;">${child.roll_number}</strong></span>
                  <span>•</span>
                  <span>${child.program} (5th Semester, Sec ${child.section})</span>
                  <span>•</span>
                  <span>Batch: 2024 - 2028</span>
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.75rem; color: #94a3b8;">Faculty Mentor</div>
              <div style="font-weight: 700; color: #fff;">${child.mentor_name || 'Prof. Anita Roy'}</div>
              <div style="font-size: 0.75rem; color: var(--brand-cyan);">Cabin 304, Block A</div>
            </div>
          </div>
        </div>

        <!-- Child Academic Metrics -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Ward Attendance</span>
              <div class="metric-icon-wrap" style="background-color: ${Number(stats.childAttendancePct) < 75 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)'}; color: ${Number(stats.childAttendancePct) < 75 ? 'var(--color-danger)' : 'var(--color-success)'};">📊</div>
            </div>
            <div class="metric-value" style="color: ${Number(stats.childAttendancePct) < 75 ? 'var(--color-danger)' : 'var(--text-main)'};">
              ${stats.childAttendancePct}%
            </div>
            <div class="metric-footer">
              ${Number(stats.childAttendancePct) < 75 ? '<span style="color: var(--color-danger); font-weight: 700;">⚠️ Attendance shortage</span>' : '<span style="color: var(--color-success);">✓ Meets 75% rule</span>'}
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Exam Performance</span>
              <div class="metric-icon-wrap" style="background-color: var(--brand-blue-glow); color: var(--brand-blue-accent);">🎯</div>
            </div>
            <div class="metric-value">${stats.childMarksAvgPct}%</div>
            <div class="metric-footer">Across all mid-term assessments</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Fee Dues Balance</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-info-bg); color: var(--color-info);">💳</div>
            </div>
            <div class="metric-value">₹${(stats.childFeeBalance || 0).toLocaleString()}</div>
            <div class="metric-footer">Outstanding for Term 2</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Active Alerts</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-danger-bg); color: var(--color-danger);">🔔</div>
            </div>
            <div class="metric-value" style="color: var(--color-danger);">${stats.childAlerts || 0}</div>
            <div class="metric-footer">Notifications requiring parental review</div>
          </div>
        </div>

        <!-- Parent Action Alert -->
        ${lowSubjects.length > 0 ? `
          <div class="risk-alert-card critical">
            <span style="font-size: 1.35rem;">⚠️</span>
            <div class="alert-content">
              <h4>Academic Notice for Parents: Subject Attendance Shortage</h4>
              <p>Your ward ${child.full_name} has recorded <strong>${lowSubjects[0].percentage}%</strong> attendance in <strong>${lowSubjects[0].title}</strong>. Institutional regulations require at least 75% attendance. They need to attend the next <strong>${lowSubjects[0].classesNeededFor75} classes</strong> without absence to become eligible for the final examination.</p>
              <div class="alert-action-tag">Please encourage your ward or contact Faculty Mentor Prof. Anita Roy for guidance.</div>
            </div>
          </div>
        ` : ''}

        <!-- Attendance & Marks Breakdown -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
          <!-- Subject-wise Attendance -->
          <div class="card-panel">
            <div class="panel-header">
              <h3 class="panel-title">📊 Subject Attendance Sheet</h3>
              <span class="badge ${Number(stats.childAttendancePct) < 75 ? 'badge-danger' : 'badge-success'}">Cumulative: ${stats.childAttendancePct}%</span>
            </div>
            <div class="panel-body">
              ${window.ChartComponents.renderSubjectAttendanceBars(subjects)}
            </div>
          </div>

          <!-- Academic Assessment Progress -->
          <div class="card-panel">
            <div class="panel-header">
              <h3 class="panel-title">🏆 Term Assessment Scores</h3>
              <span class="badge badge-info">Avg: ${stats.childMarksAvgPct}%</span>
            </div>
            <div class="panel-body" style="padding: 0;">
              ${window.ChartComponents.renderAssessmentScoreCard(marksList)}
            </div>
          </div>
        </div>

        <!-- Weekly Timetable of Ward -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">📅 Ward's Weekly Class Schedule</h3>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time</th>
                    <th>Course</th>
                    <th>Room</th>
                    <th>Faculty</th>
                  </tr>
                </thead>
                <tbody>
                  ${timetable.slice(0, 7).map(t => `
                    <tr>
                      <td><span class="badge badge-info">${t.day_of_week}</span></td>
                      <td>${t.start_time} - ${t.end_time}</td>
                      <td><strong>${t.course_title}</strong> (${t.course_code})</td>
                      <td><code>${t.room_number}</code></td>
                      <td>${t.faculty_name}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Fee Ledger for Parent -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">💳 Semester Fee Ledger</h3>
            <span class="badge ${stats.childFeeBalance > 0 ? 'badge-warning' : 'badge-success'}">
              Balance: ₹${(stats.childFeeBalance || 0).toLocaleString()}
            </span>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Fee Type</th>
                    <th>Total Amount</th>
                    <th>Amount Paid</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${fees.map(f => `
                    <tr>
                      <td style="font-weight: 600;">${f.category}</td>
                      <td>₹${f.total_amount.toLocaleString()}</td>
                      <td style="color: var(--color-success); font-weight: 600;">₹${f.paid_amount.toLocaleString()}</td>
                      <td>${f.due_date}</td>
                      <td>
                        <span class="badge ${f.status === 'paid' ? 'badge-success' : f.status === 'partial' ? 'badge-warning' : 'badge-danger'}">
                          ${f.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Important Institutional Notices for Parents -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">📢 Official Circulars for Parents</h3>
          </div>
          <div class="panel-body" style="padding: 0;">
            ${notices.filter(n => n.target_audience === 'all' || n.target_audience === 'parents').map(n => `
              <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-subtle);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                  <span class="badge ${n.priority === 'urgent' ? 'badge-danger' : 'badge-info'}">${n.priority.toUpperCase()}</span>
                  <span style="font-size: 0.75rem; color: var(--text-subtle);">${n.publish_date}</span>
                </div>
                <h4 style="font-size: 0.9375rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">${n.title}</h4>
                <p style="font-size: 0.8125rem; color: var(--text-muted); line-height: 1.4;">${n.content}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
};

window.ParentView = ParentView;
