/**
 * NexusOrbit - Timetable & Schedule View
 */
const TimetableView = {
  async render() {
    const data = await window.API.getTimetable('A');
    const slots = data.slots || [];

    // Group by Day of Week
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const byDay = {};
    days.forEach(d => { byDay[d] = []; });

    slots.forEach(s => {
      if (byDay[s.day_of_week]) {
        byDay[s.day_of_week].push(s);
      }
    });

    return `
      <div class="view-timetable animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800;">Academic Timetable</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted);">Bachelor of Technology (Computer Science & Engineering) • Section A</p>
          </div>
          <span class="badge badge-info" style="font-size: 0.8125rem; padding: 0.35rem 0.75rem;">
            Semester 5 • Hall 401 & Systems Lab 2
          </span>
        </div>

        <!-- Weekly Days Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
          ${days.map(day => `
            <div class="card-panel" style="margin-bottom: 0;">
              <div class="panel-header" style="background-color: var(--bg-surface-subtle); padding: 0.75rem 1.25rem;">
                <h4 style="font-size: 0.9375rem; font-weight: 700; color: var(--brand-blue-accent);">${day}</h4>
                <span class="badge" style="background: var(--bg-surface);">${byDay[day].length} Periods</span>
              </div>
              <div class="panel-body" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                ${byDay[day].length === 0 ? '<div style="color: var(--text-subtle); font-size: 0.8125rem; text-align: center;">No scheduled lectures</div>' : 
                  byDay[day].map(slot => `
                    <div style="border-left: 3px solid var(--brand-blue-accent); padding: 0.625rem 0.75rem; background-color: var(--bg-surface-subtle); border-radius: 0 var(--radius-md) var(--radius-md) 0;">
                      <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-subtle); margin-bottom: 0.2rem;">
                        ⏱️ ${slot.start_time} - ${slot.end_time}
                      </div>
                      <div style="font-weight: 700; font-size: 0.875rem; color: var(--text-main);">
                        ${slot.course_title}
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; display: flex; justify-content: space-between;">
                        <span>📍 ${slot.room_number}</span>
                        <span>👨‍🏫 ${slot.faculty_name}</span>
                      </div>
                    </div>
                  `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
};

window.TimetableView = TimetableView;
