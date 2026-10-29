/**
 * NexusOrbit - Assignments Module View
 */
const AssignmentsView = {
  async render() {
    const user = window.App.currentUser;
    const isFacultyOrAdmin = user.role === 'faculty' || user.role === 'admin';
    const data = await window.API.getAssignments();
    const assignments = data.assignments || [];

    return `
      <div class="view-assignments animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800;">Coursework & Assignments</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted);">Manage continuous evaluation coursework, problem sets, and submission deadlines.</p>
          </div>
          ${isFacultyOrAdmin ? `
            <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem;" onclick="FacultyView.openNewAssignmentModal()">
              ➕ Publish Assignment
            </button>
          ` : ''}
        </div>

        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">📚 Coursework Directory</h3>
            <span class="badge badge-info">${assignments.length} Total Assignments</span>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title & Problem Statement</th>
                    <th>Course</th>
                    <th>Due Date</th>
                    <th>Max Points</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${assignments.map(a => `
                    <tr>
                      <td style="max-width: 380px;">
                        <div style="font-weight: 700; font-size: 0.9375rem; color: var(--text-main); margin-bottom: 0.25rem;">
                          ${a.title}
                        </div>
                        <div style="font-size: 0.8125rem; color: var(--text-muted); line-height: 1.4;">
                          ${a.description}
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-info">${a.course_code || 'CS501'}</span>
                      </td>
                      <td>
                        <span style="font-weight: 600; color: ${new Date(a.due_date) < new Date() ? 'var(--color-danger)' : 'var(--text-main)'};">
                          📅 ${a.due_date}
                        </span>
                      </td>
                      <td>${a.max_marks} pts</td>
                      <td>
                        ${isFacultyOrAdmin ? `
                          <span class="badge badge-success">${a.submissions_count || 0} Submissions</span>
                        ` : `
                          ${a.submission_status === 'graded' ? 
                            `<span class="badge badge-success">Graded (${a.marks_awarded} pts)</span>` : 
                            a.submission_status === 'submitted' ? 
                            '<span class="badge badge-info">Submitted</span>' : 
                            '<span class="badge badge-warning">Pending</span>'}
                        `}
                      </td>
                      <td>
                        ${isFacultyOrAdmin ? `
                          <button class="btn-primary" style="width: auto; padding: 0.25rem 0.65rem; font-size: 0.75rem;" onclick="FacultyView.viewSubmissions('${a.id}', '${a.title.replace(/'/g, "\\'")}')">
                            Review Submissions
                          </button>
                        ` : `
                          ${a.submission_status ? 
                            `<button class="btn-icon" style="width: auto; padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="StudentView.viewFeedback('${a.title.replace(/'/g, "\\'")}', '${a.marks_awarded || '-'}', '${(a.faculty_feedback || 'Submission under review').replace(/'/g, "\\'")}')">View Details</button>` :
                            `<button class="btn-primary" style="width: auto; padding: 0.25rem 0.75rem; font-size: 0.75rem;" onclick="StudentView.openSubmitModal('${a.id}', '${a.title.replace(/'/g, "\\'")}')">Submit Now</button>`}
                        `}
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
  }
};

window.AssignmentsView = AssignmentsView;
