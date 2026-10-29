/**
 * NexusOrbit - Fee Management & Payment Ledger View
 */
const FeesView = {
  async render() {
    const user = window.App.currentUser;
    const isStudentOrParent = user.role === 'student' || user.role === 'parent';
    const targetStudentId = user.role === 'student' ? user.student?.id :
      user.role === 'parent' ? user.linkedStudent?.id : 'stu_1';

    const data = await window.API.getFees(targetStudentId);
    const fees = data.fees || [];
    const transactions = data.transactions || [];

    return `
      <div class="view-fees animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800;">Academic Fee Ledger & Payments</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted);">Institutional fee schedules, verified digital transactions, and downloadable receipts.</p>
          </div>
          ${data.totalBalance > 0 ? `
            <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem;" onclick="StudentView.openPaymentModal('${fees[2]?.id || fees[3]?.id}', ${data.totalBalance})">
              💳 Pay Dues (Demo Gateway)
            </button>
          ` : '<span class="badge badge-success" style="font-size: 0.8125rem; padding: 0.4rem 0.85rem;">✓ Full Clearance</span>'}
        </div>

        <!-- Ledger Summary Cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Total Assessed Fees</span>
              <div class="metric-icon-wrap" style="background-color: var(--brand-blue-glow); color: var(--brand-blue-accent);">🧾</div>
            </div>
            <div class="metric-value">₹${data.totalDue.toLocaleString()}</div>
            <div class="metric-footer">B.Tech CSE Term 5 Academic Fees</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Amount Paid</span>
              <div class="metric-icon-wrap" style="background-color: var(--color-success-bg); color: var(--color-success);">✓</div>
            </div>
            <div class="metric-value" style="color: var(--color-success);">₹${data.totalPaid.toLocaleString()}</div>
            <div class="metric-footer">Settled via NetBanking & UPI</div>
          </div>

          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-title">Outstanding Balance</span>
              <div class="metric-icon-wrap" style="background-color: ${data.totalBalance > 0 ? 'var(--color-danger-bg)' : 'var(--color-success-bg)'}; color: ${data.totalBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">⏳</div>
            </div>
            <div class="metric-value" style="color: ${data.totalBalance > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
              ₹${data.totalBalance.toLocaleString()}
            </div>
            <div class="metric-footer">${data.totalBalance > 0 ? 'Installment remaining' : 'No pending dues'}</div>
          </div>
        </div>

        <!-- Itemized Fee Structure -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">📋 Itemized Fee Categories</h3>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Category Description</th>
                    <th>Total Amount</th>
                    <th>Paid to Date</th>
                    <th>Remaining</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${fees.map(f => {
                    const rem = f.total_amount - f.paid_amount;
                    return `
                      <tr>
                        <td style="font-weight: 600;">${f.category}</td>
                        <td>₹${f.total_amount.toLocaleString()}</td>
                        <td style="color: var(--color-success); font-weight: 600;">₹${f.paid_amount.toLocaleString()}</td>
                        <td style="color: ${rem > 0 ? 'var(--color-danger)' : 'var(--text-subtle)'}; font-weight: 600;">₹${rem.toLocaleString()}</td>
                        <td>${f.due_date}</td>
                        <td>
                          <span class="badge ${f.status === 'paid' ? 'badge-success' : f.status === 'partial' ? 'badge-warning' : 'badge-danger'}">
                            ${f.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Verified Transaction History & Receipt Generator -->
        <div class="card-panel">
          <div class="panel-header">
            <h3 class="panel-title">🧾 Transaction History & Official Receipts</h3>
          </div>
          <div class="panel-body" style="padding: 0;">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Receipt Number</th>
                    <th>Payment Date</th>
                    <th>Fee Category</th>
                    <th>Payment Instrument</th>
                    <th>Reference ID</th>
                    <th>Amount Paid</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.map(t => `
                    <tr>
                      <td><code>${t.receipt_number}</code></td>
                      <td>${new Date(t.payment_date).toLocaleDateString()}</td>
                      <td>${t.fee_category}</td>
                      <td>${t.payment_method}</td>
                      <td><code>${t.transaction_reference}</code></td>
                      <td style="font-weight: 700; color: var(--color-success);">₹${t.amount.toLocaleString()}</td>
                      <td>
                        <button class="btn-icon" style="width: auto; padding: 0.25rem 0.65rem; font-size: 0.75rem;" onclick="StudentView.printReceipt('${t.receipt_number}', '${t.fee_category}', ${t.amount}, '${t.payment_date}', '${t.transaction_reference}')">
                          🖨️ View Receipt
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
  }
};

window.FeesView = FeesView;
