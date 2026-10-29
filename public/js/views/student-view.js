/**
 * NexusOrbit - Student Portal Dashboard View
 */
const StudentView = {
  async render() {
    const user = window.App.currentUser;
    const stats = await window.API.getDashboardStats();
    const attData = await window.API.getAttendance(user.student?.id);
    const marksData = await window.API.getMarks(user.student?.id);
    const timetableData = await window.API.getTimetable('A');
    const assignmentsData = await window.API.getAssignments();
    const feeData = await window.API.getFees(user.student?.id);
    const alertsData = await window.API.getAlerts();

    const subjects = attData.subjects || [];
    const marksList = marksData.marks || [];
    const timetable = timetableData.slots || [];
    const assignments = assignmentsData.assignments || [];
    const alerts = alertsData.alerts || [];

    // Filter low attendance subjects
    const lowAttSubjects = subjects.filter(s => s.percentage < 75);

    return `
      <div class="view-student animate-fade-in">
        <!-- Student Identity Banner -->
        <div class="card-panel" style="background: linear-gradient(135deg, var(--brand-navy-deep) 0%, var(--brand-navy-mid) 100%); color: #ffffff; margin-bottom: 1.5rem;">
          <div style="padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
            <div style="display: flex; align-items: center; gap: 1.25rem;">
              <img src="${user.avatar_url || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80'}" 
                alt="${user.full_name}" 
                style="width: 64px; height: 64px; border-radius: 50%; border: 3px solid rgba(255, 255, 255, 0.2); object-fit: cover;" />
              <div>
                <h2 style="font-size: 1.45rem; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 0.2rem;">
                  Welcome back, ${user.full_name}
                </h2>
                <div style="font-size: 0.8125rem; color: #94a3b8; display: flex; gap: 0.75rem; flex-wrap: wrap;">
                  <span>Roll No: <strong style="color: #fff;">${user.student?.roll_number || '2024CSE042'}</strong></span>
                  <span>•</span>
                  <span>${user.student?.program || 'B.Tech CSE'} (Sem ${user.student?.semester || 5}, Sec ${user.student?.section || 'A'})</span>
                  <span>•</span>
                  <span>Mentor: <strong style="color: #fff;">${user.student?.mentor_name || 'Prof. Anita Roy'}</strong></span>
                </div>
              </div>
            </div>
            <div>
              <span class="badge" style="background-color: rgba(6, 182, 212, 0.15); color: var(--brand-cyan); border: 1px solid rgba(6, 182, 212, 0.3); font-size: 0.8125rem; padding: 0.4rem 0.85rem;">
                Academic Term: Fall 2026
              </span>
            </div>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Cumulative Attendance</span>
              <div class="metric-icon-wrap" style="background-color: ${Number(stats.attendancePct) < 75 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)'}; color: ${Number(stats.attendancePct) < 75 ? 'var(--color-danger)' : 'var(--color-success)'};">📊</div>
            </div>
            <div class="metric-value" style="color: ${Number(stats.attendancePct) < 75 ? 'var(--color-danger)' : 'var(--text-main)'};">
              ${stats.attendancePct}%
            </div>
            <div class="metric-footer">
              ${Number(stats.attendancePct) < 75 ? '<span style="color: var(--color-danger); font-weight: 700;">⚠️ Threshold deficit</span>' : '<span style="color: var(--color-success);">✓ Meets 75% rule</span>'}
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Academic Score Avg</span>
              <div class="metric-icon-wrap" style="background-color: var(--brand-blue-glow); color: var(--brand-blue-accent);">🎯</div>
            </div>
            <div class="metric-value">${stats.marksAvgPct}%</div>
            <div class="metric-footer">${stats.marksObtained} of ${stats.marksTotal} maximum marks</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Pending Coursework</span>
              <div class="metric-icon-wrap" style="background-color: #fef3c7; color: #d97706;">📝</div>
            </div>
            <div class="metric-value">${stats.pendingAssignments}</div>
            <div class="metric-footer">Assignments requiring submission</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Fee Balance</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-info-bg); color: var(--color-info);">💳</div>
            </div>
            <div class="metric-value">₹${(stats.feeBalance || 0).toLocaleString()}</div>
            <div class="metric-footer">
              ${stats.feeBalance > 0 ? '<span style="color: var(--color-warning);">Installment pending</span>' : '<span style="color: var(--color-success);">Fully settled</span>'}
            </div>
          </div>
        </div>

        <!-- Academic Early Warning Alert -->
        ${lowAttSubjects.length > 0 ? `
          <div class="risk-alert-card critical">
            <span style="font-size: 1.35rem;">⚠️</span>
            <div class="alert-content">
              <h4>Attendance Shortage Notice: ${lowAttSubjects.map(s => `${s.title} (${s.percentage}%)`).join(', ')}</h4>
              <p>Institutional regulation mandates at least 75% attendance to receive exam hall tickets. In <strong>${lowAttSubjects[0].title}</strong>, you need to attend the next <strong>${lowAttSubjects[0].classesNeededFor75} consecutive classes</strong> without absence to restore eligibility.</p>
              <div class="alert-action-tag">Please consult your mentor Prof. Anita Roy during office hours (Mon-Thu 2-4 PM).</div>
            </div>
          </div>
        ` : ''}

        <!-- Two Column Main Body: Attendance & Coursework -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
          <!-- Subject-wise Attendance Breakdown -->
          <div class="card-panel">
            <div class="panel-header">
              <h3 class="panel-title">📊 Subject-Wise Attendance</h3>
              <span class="badge ${Number(stats.attendancePct) < 75 ? 'badge-danger' : 'badge-success'}">Overall: ${stats.attendancePct}%</span>
            </div>
            <div class="panel-body">
              ${window.ChartComponents.renderSubjectAttendanceBars(subjects)}
            </div>
          </div>

          <!-- Assessments & Internal Marks -->
          <div class="card-panel">
            <div class="panel-header">
              <h3 class="panel-title">🏆 Recent Assessment Scores</h3>
              <span class="badge badge-info">Average: ${stats.marksAvgPct}%</span>
            </div>
            <div class="panel-body" style="padding: 0;">
              ${window.ChartComponents.renderAssessmentScoreCard(marksList)}
            </div>
          </div>
        </div>

        <!-- Weekly Timetable Today & Upcoming -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">📅 Academic Schedule (Section A)</h3>
            <span class="badge badge-info">5 Working Days</span>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Day</th>
                    <th>Time Slot</th>
                    <th>Course</th>
                    <th>Lecture Hall</th>
                    <th>Faculty Lead</th>
                  </tr>
                </thead>
                <tbody>
                  ${timetable.slice(0, 8).map((t, idx) => `
                    <tr style="${idx === 0 ? 'background-color: var(--brand-blue-glow); font-weight: 600;' : ''}">
                      <td><span class="badge badge-info">${t.day_of_week}</span></td>
                      <td>${t.start_time} - ${t.end_time}</td>
                      <td>
                        <div style="font-weight: 600;">${t.course_title}</div>
                        <div style="font-size: 0.75rem; color: var(--text-subtle);">${t.course_code}</div>
                      </td>
                      <td><code>${t.room_number}</code></td>
                      <td>${t.faculty_name}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Assignments & Submission Workflow -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">📝 Coursework Assignments</h3>
            <span class="badge badge-warning">${assignments.filter(a => !a.submission_status).length} Pending</span>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Assignment Title</th>
                    <th>Course</th>
                    <th>Deadline</th>
                    <th>Max Points</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${assignments.map(a => `
                    <tr>
                      <td>
                        <div style="font-weight: 600;">${a.title}</div>
                        <small style="color: var(--text-muted);">${a.description ? a.description.substring(0, 75) + '...' : ''}</small>
                      </td>
                      <td><span class="badge badge-info">${a.course_code || 'CS501'}</span></td>
                      <td>${a.due_date}</td>
                      <td>${a.max_marks} pts</td>
                      <td>
                        ${a.submission_status === 'graded' ? 
                          `<span class="badge badge-success">Graded (${a.marks_awarded} pts)</span>` : 
                          a.submission_status === 'submitted' ? 
                          '<span class="badge badge-info">Submitted</span>' : 
                          '<span class="badge badge-warning">Pending</span>'}
                      </td>
                      <td>
                        ${a.submission_status ? 
                          `<button class="btn-icon" style="width: auto; padding: 0.25rem 0.6rem; font-size: 0.75rem;" onclick="StudentView.viewFeedback('${a.title.replace(/'/g, "\\'")}', '${a.marks_awarded || '-'}', '${(a.faculty_feedback || 'Submission under evaluation').replace(/'/g, "\\'")}')">View Details</button>` :
                          `<button class="btn-primary" style="width: auto; padding: 0.25rem 0.75rem; font-size: 0.75rem;" onclick="StudentView.openSubmitModal('${a.id}', '${a.title.replace(/'/g, "\\'")}')">Submit Now</button>`}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Fee Settlement & Printable Receipt -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">💳 Tuition & Infrastructure Fees</h3>
            ${feeData.totalBalance > 0 ? 
              `<button class="btn-primary" style="width: auto; padding: 0.4rem 0.85rem; font-size: 0.8125rem;" onclick="StudentView.openPaymentModal('${feeData.fees[2]?.id || feeData.fees[3]?.id}', ${feeData.totalBalance})">
                💳 Pay Outstanding (Demo Gateway)
              </button>` : 
              '<span class="badge badge-success">All Dues Settled</span>'}
          </div>
          <div class="panel-body">
            <div style="display: flex; gap: 2rem; margin-bottom: 1rem; flex-wrap: wrap;">
              <div>
                <div style="font-size: 0.75rem; color: var(--text-subtle);">TOTAL SEMESTER FEE</div>
                <div style="font-size: 1.35rem; font-weight: 700;">₹${feeData.totalDue.toLocaleString()}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-subtle);">AMOUNT PAID</div>
                <div style="font-size: 1.35rem; font-weight: 700; color: var(--color-success);">₹${feeData.totalPaid.toLocaleString()}</div>
              </div>
              <div>
                <div style="font-size: 0.75rem; color: var(--text-subtle);">OUTSTANDING BALANCE</div>
                <div style="font-size: 1.35rem; font-weight: 700; color: ${feeData.totalBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">₹${feeData.totalBalance.toLocaleString()}</div>
              </div>
            </div>

            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Fee Category</th>
                    <th>Total Due</th>
                    <th>Paid Amount</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${feeData.fees.map(f => `
                    <tr>
                      <td style="font-weight: 600;">${f.category}</td>
                      <td>₹${f.total_amount.toLocaleString()}</td>
                      <td style="color: var(--color-success);">₹${f.paid_amount.toLocaleString()}</td>
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

            <!-- Recent Payment Receipts -->
            ${feeData.transactions.length > 0 ? `
              <div style="margin-top: 1.5rem;">
                <h4 style="font-size: 0.9375rem; font-weight: 700; margin-bottom: 0.75rem;">Verified Payment Transactions & Receipts</h4>
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                  ${feeData.transactions.map(t => `
                    <div style="border: 1px dashed var(--border-strong); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.8125rem; background: var(--bg-surface-subtle); display: flex; align-items: center; gap: 1rem;">
                      <div>
                        <div><strong>${t.receipt_number}</strong> (₹${t.amount.toLocaleString()})</div>
                        <div style="color: var(--text-subtle); font-size: 0.7rem;">${t.fee_category} • ${t.payment_method}</div>
                      </div>
                      <button class="btn-icon" style="width: auto; padding: 0.25rem 0.5rem; font-size: 0.7rem;" onclick="StudentView.printReceipt('${t.receipt_number}', '${t.fee_category}', ${t.amount}, '${t.payment_date}', '${t.transaction_reference}')">
                        🖨️ Receipt
                      </button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  },

  openSubmitModal(assignmentId, title) {
    window.App.openModal(`
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem; font-weight: 700;">Submit: ${title}</h3>
          <button class="btn-icon" onclick="window.App.closeModal()">✕</button>
        </div>
        <form onsubmit="StudentView.submitAssignment(event, '${assignmentId}')">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Solution Narrative / Written Response</label>
              <textarea id="sub-modal-text" class="form-input" rows="4" placeholder="Type or paste your coursework analysis, code repository URL, or summary..." required></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Upload Supplementary Solution Document (.pdf / .zip)</label>
              <input type="file" id="sub-modal-file" class="form-input" style="padding: 0.5rem;" />
              <small style="color: var(--text-subtle); font-size: 0.75rem;">Simulated file upload for hackathon demonstration (max 25MB).</small>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-icon" style="width: auto; padding: 0.5rem 1rem;" onclick="window.App.closeModal()">Cancel</button>
            <button type="submit" class="btn-primary" style="width: auto; padding: 0.5rem 1.25rem;">Submit Coursework</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitAssignment(e, assignmentId) {
    e.preventDefault();
    const text = document.getElementById('sub-modal-text').value;
    const fileInput = document.getElementById('sub-modal-file');
    const fileName = fileInput.files[0]?.name || 'Coursework_Solution_2024CSE042.pdf';

    try {
      await window.API.submitAssignment(assignmentId, text, fileName);
      window.App.closeModal();
      window.App.showToast('Coursework successfully submitted for evaluation!', 'success');
      window.App.navigate('student-dashboard');
    } catch (err) {
      window.App.showToast(err.message, 'danger');
    }
  },

  viewFeedback(title, marks, feedback) {
    window.App.openModal(`
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem; font-weight: 700;">Evaluation: ${title}</h3>
          <button class="btn-icon" onclick="window.App.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size: 1.5rem; font-weight: 800; color: var(--color-success); margin-bottom: 0.5rem;">
            ${marks} pts
          </div>
          <div style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 1rem;">
            <strong>Faculty Feedback:</strong>
            <p style="margin-top: 0.35rem; padding: 0.75rem; background: var(--bg-surface-subtle); border-radius: var(--radius-md);">${feedback}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" style="width: auto; padding: 0.4rem 1rem;" onclick="window.App.closeModal()">Close</button>
        </div>
      </div>
    `);
  },

  openPaymentModal(feeId, totalBalance) {
    window.App.openModal(`
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem; font-weight: 700;">Demonstration Fee Settlement</h3>
          <button class="btn-icon" onclick="window.App.closeModal()">✕</button>
        </div>
        <form onsubmit="StudentView.processPayment(event, '${feeId}')">
          <div class="modal-body">
            <div class="alert-box alert-info">
              <span>ℹ️</span>
              <span>This is a simulated hackathon gateway. No real payment credentials will be billed.</span>
            </div>
            <div class="form-group">
              <label class="form-label">Payment Amount (₹)</label>
              <input type="number" id="pay-modal-amount" class="form-input" value="15000" min="500" max="${totalBalance}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Payment Instrument</label>
              <select id="pay-modal-method" class="form-input">
                <option value="UPI / Instant Settlement">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="Campus NetBanking">Net Banking (HDFC / SBI / ICICI)</option>
                <option value="Debit Card">Debit / ATM Card</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-icon" style="width: auto; padding: 0.5rem 1rem;" onclick="window.App.closeModal()">Cancel</button>
            <button type="submit" class="btn-primary" style="width: auto; padding: 0.5rem 1.25rem;">Complete Demo Payment</button>
          </div>
        </form>
      </div>
    `);
  },

  async processPayment(e, feeId) {
    e.preventDefault();
    const amount = Number(document.getElementById('pay-modal-amount').value);
    const method = document.getElementById('pay-modal-method').value;

    try {
      const res = await window.API.payDemoFee(feeId, amount, method);
      window.App.closeModal();
      window.App.showToast(`Payment of ₹${amount.toLocaleString()} confirmed! Receipt: ${res.receipt_number}`, 'success');
      window.App.navigate('student-dashboard');
    } catch (err) {
      window.App.showToast(err.message, 'danger');
    }
  },

  printReceipt(receiptNo, category, amount, date, ref) {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>NexusOrbit - Fee Receipt ${receiptNo}</title>
        <style>
          body { font-family: sans-serif; padding: 2rem; color: #1e293b; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; }
          .receipt-title { font-size: 1.5rem; font-weight: bold; color: #0b132b; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
          th, td { border: 1px solid #cbd5e1; padding: 0.75rem; text-align: left; }
          th { background: #f1f5f9; }
          .stamp { margin-top: 2rem; border: 2px solid #059669; color: #059669; display: inline-block; padding: 0.5rem 1rem; font-weight: bold; transform: rotate(-5deg); }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="receipt-title">NEXUSORBIT UNIVERSITY</div>
            <div>Office of Academic Finance & Accounts</div>
          </div>
          <div style="text-align: right;">
            <div><strong>RECEIPT NO:</strong> ${receiptNo}</div>
            <div><strong>DATE:</strong> ${new Date(date).toLocaleDateString()}</div>
          </div>
        </div>
        <p>Received with thanks from <strong>Aarav Sharma</strong> (Roll No: <strong>2024CSE042</strong>, B.Tech CSE, 5th Semester):</p>
        <table>
          <tr>
            <th>Description</th>
            <th>Payment Mode</th>
            <th>Reference ID</th>
            <th>Amount Paid</th>
          </tr>
          <tr>
            <td>${category}</td>
            <td>Online</td>
            <td><code>${ref}</code></td>
            <td><strong>₹${amount.toLocaleString()}</strong></td>
          </tr>
        </table>
        <div class="stamp">✓ ELECTRONICALLY VERIFIED</div>
        <p style="margin-top: 3rem; font-size: 0.8rem; color: #64748b;">This is a computer-generated fee acknowledgement generated by NexusOrbit Management Portal.</p>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};

window.StudentView = StudentView;
