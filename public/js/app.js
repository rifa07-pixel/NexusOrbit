/**
 * NexusOrbit - Master Application Controller
 * Single Page Architecture, Role Routing, Session State, Toasts & Modals
 */
const App = {
  currentUser: null,
  currentRoute: 'dashboard',
  theme: localStorage.getItem('nexusorbit_theme') || 'light',

  async init() {
    // 1. Initialize Theme
    document.documentElement.setAttribute('data-theme', this.theme);

    // 2. Initialize Splash Screen
    window.SplashController.init();

    // 3. Check Authentication Session
    const token = window.API.getToken();
    if (token) {
      try {
        const res = await window.API.getMe();
        this.currentUser = res.user;
        this.showAppShell();
        return;
      } catch (e) {
        console.warn('Session expired or invalid:', e);
        window.API.clearSession();
      }
    }

    // Otherwise show login screen
    this.showLogin();
  },

  showLogin() {
    this.currentUser = null;
    if (window.AiAssistant) {
      window.AiAssistant.reset();
      window.AiAssistant.hide();
    }
    const loginScreen = document.getElementById('login-screen');
    const appShell = document.getElementById('app-shell');
    if (loginScreen) loginScreen.style.display = 'flex';
    if (appShell) appShell.classList.remove('active');
  },

  showAppShell() {
    const loginScreen = document.getElementById('login-screen');
    const appShell = document.getElementById('app-shell');
    if (loginScreen) loginScreen.style.display = 'none';
    if (appShell) appShell.classList.add('active');

    // Reset and initialize AI Assistant for current user persona
    if (window.AiAssistant) {
      window.AiAssistant.reset(this.currentUser);
      window.AiAssistant.show();
    }

    // Navigate to default role dashboard
    this.navigate('dashboard');
  },

  async handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login-submit');

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Authenticating...';
    }

    try {
      const data = await window.API.login(email, password);
      this.currentUser = data.user;
      this.showToast(`Welcome back, ${data.user.full_name}`, 'success');
      this.showAppShell();
    } catch (err) {
      this.showToast(err.message, 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Sign In to NexusOrbit';
      }
    }
  },

  async handleDemoLogin(role) {
    try {
      this.showToast(`Authenticating demo ${role}...`, 'info');
      const data = await window.API.demoLogin(role);
      this.currentUser = data.user;
      this.showToast(`Logged in as ${data.user.full_name} (${data.user.role.toUpperCase()})`, 'success');
      this.showAppShell();
    } catch (err) {
      this.showToast(`Demo login error: ${err.message}`, 'danger');
    }
  },

  async logout() {
    await window.API.logout();
    this.currentUser = null;
    if (window.AiAssistant) {
      window.AiAssistant.reset();
      window.AiAssistant.hide();
    }
    this.showToast('You have been signed out.', 'info');
    this.showLogin();
  },

  async navigate(route) {
    this.currentRoute = route;
    const container = document.getElementById('view-container');
    const pageTitleEl = document.getElementById('navbar-page-title');
    if (!container) return;

    // Render Shell Chrome (Sidebar & Navbar)
    const sidebarContainer = document.getElementById('sidebar-mount');
    const navbarContainer = document.getElementById('navbar-mount');
    if (sidebarContainer) sidebarContainer.innerHTML = window.SidebarComponent.render();
    if (navbarContainer) navbarContainer.innerHTML = window.NavbarComponent.render();

    // Loading State
    container.innerHTML = `
      <div style="padding: 3rem; text-align: center; color: var(--text-subtle);">
        <div style="font-size: 1.5rem; margin-bottom: 0.5rem; animation: pulse 1s infinite;">🪐</div>
        <div>Loading academic records...</div>
      </div>
    `;

    try {
      let content = '';

      if (route === 'dashboard') {
        if (pageTitleEl) pageTitleEl.textContent = 'Dashboard';
        if (this.currentUser.role === 'admin') {
          content = await window.AdminView.render();
        } else if (this.currentUser.role === 'faculty') {
          content = await window.FacultyView.render();
        } else if (this.currentUser.role === 'student') {
          content = await window.StudentView.render();
        } else if (this.currentUser.role === 'parent') {
          content = await window.ParentView.render();
        }
      } else if (route === 'attendance') {
        if (pageTitleEl) pageTitleEl.textContent = 'Attendance Management';
        content = await window.AttendanceView.render();
      } else if (route === 'marks') {
        if (pageTitleEl) pageTitleEl.textContent = 'Marks & Academic Results';
        content = await window.MarksView.render();
      } else if (route === 'timetable') {
        if (pageTitleEl) pageTitleEl.textContent = 'Academic Timetable';
        content = await window.TimetableView.render();
      } else if (route === 'assignments') {
        if (pageTitleEl) pageTitleEl.textContent = 'Coursework Assignments';
        content = await window.AssignmentsView.render();
      } else if (route === 'notices') {
        if (pageTitleEl) pageTitleEl.textContent = 'Notices & Circulars';
        content = await window.NoticesView.render();
      } else if (route === 'fees') {
        if (pageTitleEl) pageTitleEl.textContent = 'Fee Ledger & Payments';
        content = await window.FeesView.render();
      } else if (route === 'analytics') {
        if (pageTitleEl) pageTitleEl.textContent = 'Campus Analytics';
        content = await window.AnalyticsView.render();
      } else {
        content = `<div>Route not found: ${route}</div>`;
      }

      container.innerHTML = content;
      window.scrollTo(0, 0);

      // Close mobile sidebar if open
      const sidebar = document.getElementById('app-sidebar');
      if (sidebar) sidebar.classList.remove('mobile-open');

    } catch (err) {
      console.error('Navigation error:', err);
      container.innerHTML = `
        <div class="card-panel" style="padding: 2rem; border-color: var(--color-danger);">
          <h3 style="color: var(--color-danger);">Error Loading View</h3>
          <p style="color: var(--text-muted);">${err.message}</p>
          <button class="btn-primary" style="width: auto; margin-top: 1rem;" onclick="App.navigate('dashboard')">Return to Dashboard</button>
        </div>
      `;
    }
  },

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', this.theme);
    localStorage.setItem('nexusorbit_theme', this.theme);
    this.showToast(`Switched to ${this.theme} mode`, 'info');
  },

  toggleMobileSidebar() {
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) sidebar.classList.toggle('mobile-open');
  },

  togglePasswordVisibility() {
    const pwdInput = document.getElementById('login-password');
    const btn = document.getElementById('pwd-toggle-icon');
    if (!pwdInput) return;
    if (pwdInput.type === 'password') {
      pwdInput.type = 'text';
      if (btn) btn.textContent = '🙈';
    } else {
      pwdInput.type = 'password';
      if (btn) btn.textContent = '👁️';
    }
  },

  // Modal Management
  openModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const container = document.getElementById('modal-mount');
    if (!overlay || !container) return;

    container.innerHTML = html;
    overlay.classList.add('open');

    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        window.removeEventListener('keydown', handleEsc);
      }
    };
    window.addEventListener('keydown', handleEsc);
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.classList.remove('open');
  },

  // Toast System
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'success' ? '✓' : type === 'danger' ? '⚠️' : 'ℹ️';
    const color = type === 'success' ? 'var(--color-success)' : type === 'danger' ? 'var(--color-danger)' : 'var(--brand-blue-accent)';

    toast.innerHTML = `
      <span style="font-weight: bold; color: ${color};">${icon}</span>
      <span style="color: var(--text-main); font-size: 0.8125rem;">${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  },

  // Notifications Popover
  async toggleNotifications() {
    try {
      const data = await window.API.getNotices();
      const notices = (data.notices || []).slice(0, 4);

      this.openModal(`
        <div class="modal-card">
          <div class="modal-header">
            <h3 style="font-size: 1.1rem; font-weight: 700;">🔔 Notifications & Circulars</h3>
            <button class="btn-icon" onclick="window.App.closeModal()">✕</button>
          </div>
          <div class="modal-body" style="padding: 0; max-height: 400px; overflow-y: auto;">
            ${notices.map(n => `
              <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-subtle);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                  <span class="badge ${n.priority === 'urgent' ? 'badge-danger' : 'badge-info'}">${n.priority.toUpperCase()}</span>
                  <span style="font-size: 0.75rem; color: var(--text-subtle);">${n.publish_date}</span>
                </div>
                <div style="font-weight: 700; font-size: 0.875rem; color: var(--text-main);">${n.title}</div>
                <div style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.2rem;">${n.content.substring(0, 110)}...</div>
              </div>
            `).join('')}
          </div>
          <div class="modal-footer">
            <button class="btn-primary" style="width: auto; padding: 0.4rem 1rem;" onclick="window.App.closeModal(); window.App.navigate('notices');">View All Notices</button>
          </div>
        </div>
      `);
    } catch (e) {
      this.showToast('Could not load notifications', 'danger');
    }
  },

  // Profile Modal
  openProfileModal() {
    const user = this.currentUser;
    if (!user) return;

    this.openModal(`
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem; font-weight: 700;">User Profile</h3>
          <button class="btn-icon" onclick="window.App.closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <div style="text-align: center; margin-bottom: 1.25rem;">
            <img src="${user.avatar_url}" style="width: 76px; height: 76px; border-radius: 50%; object-fit: cover; border: 3px solid var(--brand-blue-accent);" />
            <h3 style="font-size: 1.25rem; font-weight: 800; margin-top: 0.5rem;">${user.full_name}</h3>
            <div style="font-size: 0.8125rem; color: var(--text-subtle); text-transform: uppercase; font-weight: 600;">Role: ${user.role}</div>
          </div>
          <div style="background: var(--bg-surface-subtle); padding: 1rem; border-radius: var(--radius-md); font-size: 0.875rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <div><strong>Email:</strong> ${user.email}</div>
            <div><strong>Phone:</strong> ${user.phone || 'N/A'}</div>
            <div><strong>Authentication Mode:</strong> Hackathon Role-Based Session</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" style="width: auto; padding: 0.4rem 1rem; background: var(--color-danger);" onclick="window.App.closeModal(); window.App.logout();">Sign Out</button>
        </div>
      </div>
    `);
  },

  // New Notice Modal (Admin / Faculty)
  openNewNoticeModal() {
    this.openModal(`
      <div class="modal-card">
        <div class="modal-header">
          <h3 style="font-size: 1.1rem; font-weight: 700;">Publish Official Notice</h3>
          <button class="btn-icon" onclick="window.App.closeModal()">✕</button>
        </div>
        <form onsubmit="App.submitNotice(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Notice Title</label>
              <input type="text" id="notice-modal-title" class="form-input" placeholder="e.g. Schedule for University Cultural Fest" required />
            </div>
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="notice-modal-category" class="form-input">
                <option value="Academic">Academic</option>
                <option value="Examination">Examination</option>
                <option value="Campus Life">Campus Life</option>
                <option value="Urgent">Urgent Administration</option>
              </select>
            </div>
            <div style="display: flex; gap: 1rem;">
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Priority</label>
                <select id="notice-modal-priority" class="form-input">
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div class="form-group" style="flex: 1;">
                <label class="form-label">Target Audience</label>
                <select id="notice-modal-audience" class="form-input">
                  <option value="all">All Campus</option>
                  <option value="students">Students Only</option>
                  <option value="faculty">Faculty Only</option>
                  <option value="parents">Parents Only</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Notice Content</label>
              <textarea id="notice-modal-content" class="form-input" rows="4" placeholder="Enter the complete circular text..." required></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-icon" style="width: auto; padding: 0.5rem 1rem;" onclick="window.App.closeModal()">Cancel</button>
            <button type="submit" class="btn-primary" style="width: auto; padding: 0.5rem 1.25rem;">Broadcast Notice</button>
          </div>
        </form>
      </div>
    `);
  },

  async submitNotice(e) {
    e.preventDefault();
    const title = document.getElementById('notice-modal-title').value;
    const category = document.getElementById('notice-modal-category').value;
    const priority = document.getElementById('notice-modal-priority').value;
    const target_audience = document.getElementById('notice-modal-audience').value;
    const content = document.getElementById('notice-modal-content').value;

    try {
      await window.API.publishNotice({
        title,
        category,
        priority,
        target_audience,
        content
      });
      this.closeModal();
      this.showToast('Notice broadcast successfully to campus!', 'success');
      this.navigate('notices');
    } catch (err) {
      this.showToast(err.message, 'danger');
    }
  }
};

window.App = App;

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
