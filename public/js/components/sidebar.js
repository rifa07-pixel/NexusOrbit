/**
 * NexusOrbit - Collapsible Sidebar Component
 */
const SidebarComponent = {
  render() {
    const user = window.App.currentUser;
    if (!user) return '';

    const currentRoute = window.App.currentRoute;

    // Role-filtered Navigation items
    let navItems = [];

    if (user.role === 'admin') {
      navItems = [
        { route: 'dashboard', label: 'Admin Cockpit', icon: '⚡' },
        { route: 'attendance', label: 'Attendance Registry', icon: '📊' },
        { route: 'marks', label: 'Marks & Results', icon: '🏆' },
        { route: 'timetable', label: 'Class Timetables', icon: '📅' },
        { route: 'assignments', label: 'Coursework', icon: '📝' },
        { route: 'notices', label: 'Announcements', icon: '📢' },
        { route: 'fees', label: 'Fee Records', icon: '💳' },
        { route: 'analytics', label: 'Campus Analytics', icon: '📈' }
      ];
    } else if (user.role === 'faculty') {
      navItems = [
        { route: 'dashboard', label: 'Faculty Dashboard', icon: '🏛️' },
        { route: 'attendance', label: 'Attendance Sheet', icon: '📋' },
        { route: 'marks', label: 'Marks & Grading', icon: '📝' },
        { route: 'timetable', label: 'Teaching Schedule', icon: '📅' },
        { route: 'assignments', label: 'Assignments Review', icon: '📚' },
        { route: 'notices', label: 'Circulars', icon: '📢' },
        { route: 'analytics', label: 'Cohort Analytics', icon: '📈' }
      ];
    } else if (user.role === 'student') {
      navItems = [
        { route: 'dashboard', label: 'Student Dashboard', icon: '🎓' },
        { route: 'attendance', label: 'My Attendance', icon: '📊' },
        { route: 'marks', label: 'Marks & Grades', icon: '🏆' },
        { route: 'timetable', label: 'Class Timetable', icon: '📅' },
        { route: 'assignments', label: 'Coursework', icon: '📝' },
        { route: 'notices', label: 'Campus Notices', icon: '📢' },
        { route: 'fees', label: 'Fees & Receipts', icon: '💳' },
        { route: 'analytics', label: 'My Analytics', icon: '📈' }
      ];
    } else if (user.role === 'parent') {
      navItems = [
        { route: 'dashboard', label: 'Ward Overview', icon: '👨‍👧' },
        { route: 'attendance', label: 'Ward Attendance', icon: '📊' },
        { route: 'marks', label: 'Exam Results', icon: '🏆' },
        { route: 'timetable', label: 'Ward Timetable', icon: '📅' },
        { route: 'notices', label: 'Parent Circulars', icon: '📢' },
        { route: 'fees', label: 'Fee Clearance', icon: '💳' }
      ];
    }

    return `
      <aside class="app-sidebar" id="app-sidebar" role="navigation" aria-label="Main Navigation">
        <!-- Brand Logo Lockup -->
        <div class="sidebar-brand">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="logo-icon-sm" style="width: 36px; height: 36px; font-size: 1rem;">
              🪐
            </div>
            <div class="logo-text" style="font-size: 1.25rem;">
              Nexus<span>Orbit</span>
            </div>
          </div>
          <button class="btn-icon mobile-menu-close-btn" style="display: none;" onclick="window.App.toggleMobileSidebar()">✕</button>
        </div>

        <!-- Navigation Menu -->
        <nav class="sidebar-nav">
          <div class="nav-section-label">Academic Portal</div>
          ${navItems.map(item => `
            <a class="nav-item ${currentRoute === item.route ? 'active' : ''}" 
               onclick="window.App.navigate('${item.route}')"
               role="button"
               tabindex="0"
               onkeypress="if(event.key==='Enter') window.App.navigate('${item.route}')">
              <span>${item.icon}</span>
              <span>${item.label}</span>
            </a>
          `).join('')}

          <div class="nav-section-label" style="margin-top: 1rem;">Intelligence</div>
          <a class="nav-item" onclick="window.AiAssistant.toggle(true)" role="button" tabindex="0">
            <span>⚡</span>
            <span>Campus AI Assistant</span>
            <span class="badge" style="background: var(--brand-blue-accent); color: #fff; font-size: 0.65rem; margin-left: auto;">Active</span>
          </a>
        </nav>

        <!-- Sidebar User Footer -->
        <div class="sidebar-footer">
          <img src="${user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}" 
               alt="${user.full_name}" 
               class="user-avatar-sm" />
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user.full_name}</div>
            <div class="sidebar-user-role">${user.role}</div>
          </div>
        </div>
      </aside>
    `;
  }
};

window.SidebarComponent = SidebarComponent;
