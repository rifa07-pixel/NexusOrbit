/**
 * NexusOrbit - Notices & Official Announcements View
 */
const NoticesView = {
  currentCategory: '',
  currentSearch: '',

  async render() {
    const user = window.App.currentUser;
    const isStaff = user.role === 'admin' || user.role === 'faculty';
    const data = await window.API.getNotices(this.currentSearch, this.currentCategory);
    const notices = data.notices || [];

    const categories = ['All', 'Academic', 'Examination', 'Campus Life', 'Urgent'];

    return `
      <div class="view-notices animate-fade-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800;">Campus Notices & Announcements</h2>
            <p style="font-size: 0.875rem; color: var(--text-muted);">Official institutional circulars, exam notifications, and campus events.</p>
          </div>
          ${isStaff ? `
            <button class="btn-primary" style="width: auto; padding: 0.5rem 1rem;" onclick="window.App.openNewNoticeModal()">
              📢 Publish Announcement
            </button>
          ` : ''}
        </div>

        <!-- Filters & Search Toolbar -->
        <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 260px;">
            <input type="text" id="notices-search-input" class="form-input" placeholder="Search notices by keyword, title, or circular number..." value="${this.currentSearch}" onkeyup="if(event.key==='Enter') NoticesView.search(this.value)" />
          </div>
          <div style="display: flex; gap: 0.4rem; overflow-x: auto;">
            ${categories.map(c => `
              <button class="btn-icon" style="width: auto; padding: 0.4rem 0.85rem; font-size: 0.8125rem; font-weight: 600; border-radius: var(--radius-full); ${this.currentCategory === (c === 'All' ? '' : c) ? 'background: var(--brand-blue-accent); color: #fff;' : ''}" onclick="NoticesView.filterCategory('${c === 'All' ? '' : c}')">
                ${c}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Notices Cards List -->
        <div style="display: flex; flex-direction: column; gap: 1rem;">
          ${notices.length === 0 ? `
            <div class="card-panel" style="padding: 2.5rem; text-align: center; color: var(--text-subtle);">
              No announcements match your search query or selected category.
            </div>
          ` : notices.map(n => `
            <div class="card-panel" style="margin-bottom: 0; border-left: 4px solid ${n.priority === 'urgent' ? 'var(--color-danger)' : n.priority === 'high' ? 'var(--color-warning)' : 'var(--brand-blue-accent)'};">
              <div class="panel-header" style="background-color: transparent;">
                <div style="display: flex; align-items: center; gap: 0.65rem;">
                  <span class="badge ${n.priority === 'urgent' ? 'badge-danger' : n.priority === 'high' ? 'badge-warning' : 'badge-info'}">
                    ${n.priority.toUpperCase()}
                  </span>
                  <span class="badge" style="background: var(--bg-surface-subtle); color: var(--text-subtle);">
                    ${n.category}
                  </span>
                  <span style="font-size: 0.75rem; color: var(--text-subtle);">Audience: <strong>${n.target_audience.toUpperCase()}</strong></span>
                </div>
                <span style="font-size: 0.8125rem; color: var(--text-subtle);">📅 ${n.publish_date}</span>
              </div>
              <div class="panel-body" style="padding: 0 1.5rem 1.25rem;">
                <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">
                  ${n.title}
                </h3>
                <p style="font-size: 0.875rem; color: var(--text-muted); line-height: 1.6;">
                  ${n.content}
                </p>
                <div style="margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-subtle);">
                  Issued by: <strong>${n.author_name}</strong> (${n.author_role.toUpperCase()})
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  search(val) {
    this.currentSearch = val;
    window.App.navigate('notices');
  },

  filterCategory(cat) {
    this.currentCategory = cat;
    window.App.navigate('notices');
  }
};

window.NoticesView = NoticesView;
