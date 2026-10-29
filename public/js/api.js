/**
 * NexusOrbit - API Service Layer
 * Centralized fetch handler, token storage, and REST client
 */
const API = {
  TOKEN_KEY: 'nexusorbit_auth_token',
  USER_KEY: 'nexusorbit_user_data',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setSession(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  getCurrentUser() {
    try {
      const u = localStorage.getItem(this.USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // If unauthorized, clear session and redirect to login
          this.clearSession();
          if (window.App && typeof window.App.showLogin === 'function') {
            window.App.showLogin();
          }
        }
        throw new Error(data.error || `HTTP ${response.status}: Request failed`);
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  },

  // Auth Endpoints
  async demoLogin(role) {
    const data = await this.request('/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ role })
    });
    this.setSession(data.token, data.user);
    return data;
  },

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setSession(data.token, data.user);
    return data;
  },

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    } finally {
      this.clearSession();
    }
  },

  async getMe() {
    return this.request('/auth/me');
  },

  // Dashboard Stats
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  },

  // Attendance
  async getAttendance(studentId = null, courseId = null) {
    const params = new URLSearchParams();
    if (studentId) params.append('student_id', studentId);
    if (courseId) params.append('course_id', courseId);
    return this.request(`/attendance?${params.toString()}`);
  },

  async recordAttendanceSession(payload) {
    return this.request('/attendance/session', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Marks & Assessments
  async getMarks(studentId = null) {
    const params = studentId ? `?student_id=${studentId}` : '';
    return this.request(`/marks${params}`);
  },

  async createAssessment(payload) {
    return this.request('/marks/assessment', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Timetable
  async getTimetable(section = 'A') {
    return this.request(`/timetable?section=${section}`);
  },

  // Assignments
  async getAssignments() {
    return this.request('/assignments');
  },

  async createAssignment(payload) {
    return this.request('/assignments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async submitAssignment(assignmentId, text, fileName) {
    return this.request(`/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ submission_text: text, file_name: fileName })
    });
  },

  async getSubmissions(assignmentId) {
    return this.request(`/assignments/${assignmentId}/submissions`);
  },

  async gradeSubmission(submissionId, marks, feedback) {
    return this.request('/assignments/grade', {
      method: 'POST',
      body: JSON.stringify({
        submission_id: submissionId,
        marks_awarded: marks,
        faculty_feedback: feedback
      })
    });
  },

  // Notices
  async getNotices(search = '', category = '') {
    const params = new URLSearchParams();
    if (search) params.append('q', search);
    if (category) params.append('category', category);
    return this.request(`/notices?${params.toString()}`);
  },

  async publishNotice(payload) {
    return this.request('/notices', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Fees
  async getFees(studentId = null) {
    const params = studentId ? `?student_id=${studentId}` : '';
    return this.request(`/fees${params}`);
  },

  async payDemoFee(feeStructureId, amount, paymentMethod) {
    return this.request('/fees/pay-demo', {
      method: 'POST',
      body: JSON.stringify({
        fee_structure_id: feeStructureId,
        amount,
        payment_method: paymentMethod
      })
    });
  },

  // Alerts
  async getAlerts() {
    return this.request('/alerts');
  },

  async resolveAlert(alertId) {
    return this.request(`/alerts/${alertId}/resolve`, {
      method: 'POST'
    });
  },

  // Directories
  async getStudents() {
    return this.request('/students');
  },

  async getFaculty() {
    return this.request('/faculty');
  },

  async getCourses() {
    return this.request('/courses');
  },

  // AI Assistant Chat
  async sendAiMessage(message) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }
};

window.API = API;
