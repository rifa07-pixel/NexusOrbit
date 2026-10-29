/**
 * NexusOrbit - Academic Analytics View
 */
const AnalyticsView = {
  async render() {
    const stats = await window.API.getDashboardStats();
    const studentsData = await window.API.getStudents();
    const students = studentsData.students || [];

    const highAttendance = students.filter(s => s.attendance_percentage >= 85).length;
    const midAttendance = students.filter(s => s.attendance_percentage >= 75 && s.attendance_percentage < 85).length;
    const lowAttendance = students.filter(s => s.attendance_percentage < 75).length;

    return `
      <div class="view-analytics animate-fade-in">
        <div style="margin-bottom: 1.5rem;">
          <h2 style="font-size: 1.5rem; font-weight: 800;">Campus Academic Analytics</h2>
          <p style="font-size: 0.875rem; color: var(--text-muted);">Real-time metrics, attendance trends, risk patterns, and cohort evaluations.</p>
        </div>

        <!-- Key Aggregate Metrics -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Average Attendance</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-success-bg); color: var(--color-success);">📈</div>
            </div>
            <div class="metric-value">${stats.overallAttendance || 85}%</div>
            <div class="metric-footer">College-wide student average</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Good Standing Ratio</span>
              <div class="metric-icon-wrap" style="background-color: var(--brand-blue-glow); color: var(--brand-blue-accent);">🎓</div>
            </div>
            <div class="metric-value">${Math.round(((highAttendance + midAttendance) / (students.length || 1)) * 100)}%</div>
            <div class="metric-footer">Meets all institutional criteria</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">At-Risk Rate</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-danger-bg); color: var(--color-danger);">⚠️</div>
            </div>
            <div class="metric-value" style="color: var(--color-danger);">
              ${Math.round((lowAttendance / (students.length || 1)) * 100)}%
            </div>
            <div class="metric-footer">Requires mentor intervention</div>
          </div>
        </div>

        <!-- Attendance Distribution Breakdown -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
          <div class="card-panel">
            <div class="panel-header">
              <h3 class="panel-title">📊 Cohort Attendance Distribution</h3>
            </div>
            <div class="panel-body">
              <div style="display: flex; flex-direction: column; gap: 1.25rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.35rem;">
                    <span style="color: var(--color-success);">Above 85% (Excellent Standing)</span>
                    <span>${highAttendance} Students (${Math.round((highAttendance / (students.length || 1)) * 100)}%)</span>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width: ${(highAttendance / (students.length || 1)) * 100}%; background-color: var(--color-success);"></div>
                  </div>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.35rem;">
                    <span style="color: var(--brand-blue-accent);">75% - 85% (Satisfactory Eligibility)</span>
                    <span>${midAttendance} Students (${Math.round((midAttendance / (students.length || 1)) * 100)}%)</span>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width: ${(midAttendance / (students.length || 1)) * 100}%; background-color: var(--brand-blue-accent);"></div>
                  </div>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.35rem;">
                    <span style="color: var(--color-danger);">Below 75% (Critical Shortage Risk)</span>
                    <span>${lowAttendance} Students (${Math.round((lowAttendance / (students.length || 1)) * 100)}%)</span>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width: ${(lowAttendance / (students.length || 1)) * 100}%; background-color: var(--color-danger);"></div>
                  </div>
                </div>
              </div>

              <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-surface-subtle); border-radius: var(--radius-md); font-size: 0.8125rem; color: var(--text-muted);">
                <strong>Statistical Summary:</strong> The overall median attendance across Section A is 84.8%. 1 student (Rahul Verma) and 1 subject (Algorithms for Aarav Sharma) are flagged under the automated early warning system.
              </div>
            </div>
          </div>

          <!-- Subject Performance Benchmarks -->
          <div class="card-panel">
            <div class="panel-header">
              <h3 class="panel-title">🏆 Department Subject Averages</h3>
            </div>
            <div class="panel-body">
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.3rem;">
                    <span>CS501 - Advanced Database Systems</span>
                    <span style="font-weight: 700;">88.2% Class Avg</span>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width: 88.2%; background-color: var(--brand-blue-accent);"></div>
                  </div>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.3rem;">
                    <span>CS505 - Artificial Intelligence & ML</span>
                    <span style="font-weight: 700;">86.5% Class Avg</span>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width: 86.5%; background-color: var(--brand-blue-accent);"></div>
                  </div>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.3rem;">
                    <span>CS503 - Operating Systems</span>
                    <span style="font-weight: 700;">84.0% Class Avg</span>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width: 84.0%; background-color: var(--brand-blue-accent);"></div>
                  </div>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.8125rem; font-weight: 600; margin-bottom: 0.3rem;">
                    <span>CS502 - Design and Analysis of Algorithms</span>
                    <span style="font-weight: 700; color: var(--color-warning);">71.4% Class Avg</span>
                  </div>
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" style="width: 71.4%; background-color: var(--color-warning);"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
};

window.AnalyticsView = AnalyticsView;
