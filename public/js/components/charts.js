/**
 * NexusOrbit - Accessible Data Visualization Components
 * Pure SVG, zero external dependencies, WCAG 2.2 AA compliant
 */
const ChartComponents = {
  /**
   * Render Circular / Donut Gauge for Attendance
   */
  renderDonutGauge(percentage, label = 'Overall', size = 160) {
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const validPct = Math.min(100, Math.max(0, Number(percentage) || 0));
    const offset = circumference - (validPct / 100) * circumference;

    let strokeColor = '#059669'; // Green (>80%)
    if (validPct < 75) {
      strokeColor = '#dc2626'; // Red (<75%)
    } else if (validPct < 80) {
      strokeColor = '#d97706'; // Amber (75-80%)
    }

    return `
      <div class="donut-chart-wrap" style="position: relative; width: ${size}px; height: ${size}px; margin: 0 auto;" role="img" aria-label="${label} attendance: ${validPct}%">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
          <!-- Background track -->
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="var(--border-subtle)" stroke-width="${strokeWidth}" />
          <!-- Active value arc -->
          <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" 
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" 
            style="transition: stroke-dashoffset 0.8s ease;" />
        </svg>
        <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
          <span style="font-size: 1.75rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em;">${validPct}%</span>
          <span style="font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: var(--text-subtle);">${label}</span>
        </div>
      </div>
    `;
  },

  /**
   * Render Subject-Wise Bar Chart with 75% Threshold Line
   */
  renderSubjectAttendanceBars(subjects) {
    if (!subjects || subjects.length === 0) {
      return '<div style="padding: 1rem; color: var(--text-subtle); text-align: center;">No subject records available</div>';
    }

    const rows = subjects.map(s => {
      const pct = Number(s.percentage || 0);
      const isLow = pct < 75;
      const barColor = isLow ? 'var(--color-danger)' : pct < 85 ? 'var(--brand-blue-accent)' : 'var(--color-success)';

      return `
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 0.35rem; font-size: 0.8125rem;">
            <span style="font-weight: 600; color: var(--text-main);">${s.title} (${s.code})</span>
            <span style="font-weight: 700; color: ${isLow ? 'var(--color-danger)' : 'var(--text-main)'};">
              ${pct}% ${isLow ? '<span style="font-size: 0.7rem; color: var(--color-danger); font-weight: 600;">(Below 75%)</span>' : ''}
            </span>
          </div>
          <div style="position: relative; width: 100%; height: 10px; background-color: var(--border-subtle); border-radius: var(--radius-full); overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background-color: ${barColor}; border-radius: var(--radius-full); transition: width 0.6s ease;"></div>
            <!-- 75% Threshold indicator marker -->
            <div style="position: absolute; left: 75%; top: 0; bottom: 0; width: 2px; background-color: #000; opacity: 0.4; z-index: 2;" title="Mandatory 75% threshold"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.6875rem; color: var(--text-subtle); margin-top: 0.2rem;">
            <span>${s.present_classes || 0} attended / ${s.total_classes || 0} classes</span>
            ${isLow ? `<span style="color: var(--color-danger);">Needs ${s.classesNeededFor75} more classes</span>` : '<span>Eligible</span>'}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="bars-container" role="region" aria-label="Subject Attendance Chart">
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; font-size: 0.75rem; color: var(--text-subtle);">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-danger);"></span> &lt;75% Risk
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: var(--brand-blue-accent); margin-left: 0.5rem;"></span> 75-85% Normal
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-success); margin-left: 0.5rem;"></span> &gt;85% High
        </div>
        ${rows}
      </div>
    `;
  },

  /**
   * Render Assessment Performance Summary Bars
   */
  renderAssessmentScoreCard(marksList) {
    if (!marksList || marksList.length === 0) {
      return '<div style="padding: 1rem; color: var(--text-subtle); text-align: center;">No assessment marks recorded yet.</div>';
    }

    return marksList.map(m => {
      const pct = m.max_marks > 0 ? Math.round((m.marks_obtained / m.max_marks) * 100) : 0;
      let badgeClass = 'badge-success';
      if (pct < 50) badgeClass = 'badge-danger';
      else if (pct < 70) badgeClass = 'badge-warning';

      return `
        <div style="padding: 0.875rem 1rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-main);">${m.assessment_title}</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle);">${m.course_title} (${m.course_code}) • ${m.assessment_type}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; font-size: 0.9375rem; color: var(--text-main);">${m.marks_obtained} <span style="font-size: 0.75rem; color: var(--text-subtle); font-weight: normal;">/ ${m.max_marks}</span></div>
            <span class="badge ${badgeClass}">${pct}%</span>
          </div>
        </div>
      `;
    }).join('');
  }
};

window.ChartComponents = ChartComponents;
