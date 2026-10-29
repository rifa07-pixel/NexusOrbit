/**
 * NexusOrbit - Top Navigation Bar Component
 */
const NavbarComponent = {
  render() {
    const user = window.App.currentUser;
    if (!user) return '';

    return `
      <header class="app-navbar" role="banner">
        <div class="navbar-left">
          <button class="btn-icon mobile-menu-btn" style="display: none;" onclick="window.App.toggleMobileSidebar()" aria-label="Toggle Navigation Menu">
            ☰
          </button>
          <div>
            <div id="navbar-page-title" class="page-title">Dashboard</div>
            <div style="font-size: 0.75rem; color: var(--text-subtle);">NexusOrbit Campus Portal • Term Fall 2026</div>
          </div>
          <span class="role-badge ${user.role}">${user.role}</span>
        </div>

        <div class="navbar-right">
          <!-- Dark / Light Theme Toggle -->
          <button class="btn-icon" id="theme-toggle-btn" onclick="window.App.toggleTheme()" aria-label="Switch Color Theme" title="Toggle Dark/Light Mode">
            🌓
          </button>

          <!-- Notifications Bell -->
          <button class="btn-icon" id="notifications-btn" onclick="window.App.toggleNotifications()" aria-label="Notifications" title="Announcements & Alerts">
            🔔
            <span class="badge-dot"></span>
          </button>

          <!-- User Menu Dropdown Trigger -->
          <div style="display: flex; align-items: center; gap: 0.65rem; margin-left: 0.5rem; cursor: pointer;" onclick="window.App.openProfileModal()">
            <img src="${user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}" 
              alt="${user.full_name}" 
              class="user-avatar-sm" />
            <div style="display: none;" class="desktop-user-name">
              <div style="font-weight: 600; font-size: 0.8125rem; color: var(--text-main);">${user.full_name}</div>
              <div style="font-size: 0.6875rem; color: var(--text-subtle); text-transform: capitalize;">${user.role}</div>
            </div>
          </div>

          <!-- Sign Out Button -->
          <button class="btn-icon" onclick="window.App.logout()" title="Sign Out of NexusOrbit" aria-label="Sign Out">
            🚪
          </button>
        </div>
      </header>
    `;
  }
};

window.NavbarComponent = NavbarComponent;
