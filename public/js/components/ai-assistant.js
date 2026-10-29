/**
 * NexusOrbit - AI Campus Assistant Component
 * Grounded Relational Intelligence Engine
 * Features: Zero-leaked history, auto-resets on every tap, role-tailored persona greetings
 */
const AiAssistant = {
  messages: [],
  isOpen: false,

  init() {
    this.reset();
    this.bindEvents();
  },

  /**
   * Reset chatbot to a completely fresh session
   * Removes previous conversation history and generates role-tailored greeting
   */
  reset(user = null) {
    const currentUser = user || window.App?.currentUser;
    const name = currentUser?.full_name ? currentUser.full_name.split(' ')[0] : 'there';
    const role = currentUser?.role || 'student';

    let welcomeText = 'Hello! I am your **NexusOrbit Campus Assistant**. How can I assist you today?';
    let facts = ['NexusOrbit Relational Intelligence Engine (Active)'];

    if (role === 'faculty') {
      welcomeText = `Hello **${currentUser?.full_name || 'Professor'}**! 👨‍🏫 I am your NexusOrbit Faculty Assistant. I have verified access to your teaching schedule, student attendance sheets, coursework submissions, and departmental circulars. How can I assist you with your classes today?`;
      facts = [`Authenticated Faculty: ${currentUser?.full_name} (${currentUser?.faculty?.department || 'CSE'})`];
    } else if (role === 'student') {
      welcomeText = `Hello **${name}**! 🎓 I am your NexusOrbit Student Assistant. I have verified access to your attendance percentages, class timetable, coursework deadlines, and fee clearance. How can I assist you today?`;
      facts = [`Authenticated Student: ${currentUser?.full_name} (${currentUser?.student?.roll_number || '2024CSE042'})`];
    } else if (role === 'admin') {
      welcomeText = `Hello **${currentUser?.full_name || 'Administrator'}**! ⚡ I am your NexusOrbit Admin Assistant. I have access to campus-wide attendance statistics, faculty registries, and unresolved academic risk alerts. How can I assist you?`;
      facts = [`Administrator Session: ${currentUser?.full_name}`];
    } else if (role === 'parent') {
      welcomeText = `Hello **${currentUser?.full_name || 'Parent'}**! 👨‍👧 I am your NexusOrbit Parent Assistant. I have authorized access to your ward **${currentUser?.linkedStudent?.full_name || 'Aarav'}**'s academic standing, attendance logs, and fee clearance. How can I assist you today?`;
      facts = [`Authorized Ward: ${currentUser?.linkedStudent?.full_name || 'Aarav Sharma'}`];
    }

    this.messages = [
      {
        sender: 'bot',
        text: welcomeText,
        facts: facts
      }
    ];

    const input = document.getElementById('ai-chat-input');
    if (input) input.value = '';

    this.render();
    this.renderSuggestions(role);
  },

  /** Show the floating trigger button (call after login) */
  show() {
    const btn = document.getElementById('btn-open-ai');
    if (btn) btn.style.display = 'flex';
  },

  /** Hide the floating trigger button and close drawer (call on logout / login screen) */
  hide() {
    const btn = document.getElementById('btn-open-ai');
    if (btn) btn.style.display = 'none';
    this.toggle(false);
  },

  toggle(forceState = null) {
    const targetState = forceState !== null ? forceState : !this.isOpen;
    
    // "every tap for the chat bot should start a new chat"
    if (targetState === true) {
      this.reset();
    }

    this.isOpen = targetState;
    const drawer = document.getElementById('ai-drawer');
    if (drawer) {
      drawer.classList.toggle('open', this.isOpen);
      if (this.isOpen) {
        setTimeout(() => {
          const input = document.getElementById('ai-chat-input');
          if (input) input.focus();
        }, 300);
      }
    }
  },

  renderSuggestions(role) {
    const container = document.getElementById('ai-suggestions-container');
    if (!container) return;

    let suggestions = [];
    if (role === 'faculty') {
      suggestions = [
        { label: '📅 My Teaching Schedule', prompt: 'What classes do I teach today?' },
        { label: '📝 Submissions to Grade', prompt: 'Show pending coursework to grade' },
        { label: '⚠️ At-Risk Attendance (<75%)', prompt: 'Are there any students with attendance below 75%?' },
        { label: '📢 Recent Notices', prompt: 'Show recent urgent notices' }
      ];
    } else if (role === 'parent') {
      suggestions = [
        { label: '📊 Ward Attendance Status', prompt: 'What is my ward attendance in Algorithms?' },
        { label: '📅 Ward Timetable', prompt: 'What classes does my ward have today?' },
        { label: '💳 Fee Clearance Dues', prompt: 'What is my ward remaining fee balance?' },
        { label: '📢 College Notices', prompt: 'Show recent urgent notices' }
      ];
    } else if (role === 'admin') {
      suggestions = [
        { label: '⚠️ Active Risk Alerts', prompt: 'Show active academic risk alerts' },
        { label: '📊 Campus Attendance %', prompt: 'What is overall campus attendance?' },
        { label: '📢 Recent Notices', prompt: 'Show recent urgent notices' }
      ];
    } else {
      // Student (Default)
      suggestions = [
        { label: '📊 Algorithms Attendance?', prompt: 'What is my attendance in Algorithms?' },
        { label: '📅 Today\'s Classes?', prompt: 'What classes do I have today?' },
        { label: '📝 Pending Coursework?', prompt: 'What assignments are due?' },
        { label: '💳 Fee Dues?', prompt: 'What is my remaining fee balance?' },
        { label: '📢 Urgent Notices?', prompt: 'Show recent urgent notices' }
      ];
    }

    container.innerHTML = suggestions.map(s => `
      <button type="button" class="suggestion-chip" onclick="window.AiAssistant.askPrompt(this.getAttribute('data-prompt'))" data-prompt="${s.prompt}">${s.label}</button>
    `).join('');
  },

  render() {
    const container = document.getElementById('ai-messages-list');
    if (!container) return;

    container.innerHTML = this.messages.map(m => {
      const isBot = m.sender === 'bot';
      const formattedText = this.formatMarkdown(m.text);
      const factsHtml = m.facts && m.facts.length > 0 ? `
        <div style="margin-top: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.35rem;">
          ${m.facts.map(f => `<span class="fact-badge">🔍 Grounded: ${f}</span>`).join('')}
        </div>
      ` : '';

      return `
        <div class="chat-bubble ${isBot ? 'bot' : 'user'}">
          <div>${formattedText}</div>
          ${factsHtml}
        </div>
      `;
    }).join('');

    container.scrollTop = container.scrollHeight;
  },

  formatMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/•\s/g, '<br>• ')
      .replace(/\n/g, '<br>');
  },

  async handleFormSubmit() {
    const input = document.getElementById('ai-chat-input');
    if (!input) return;
    const query = input.value.trim();
    if (!query) return;

    input.value = '';
    this.addMessage('user', query);
    this.setLoading(true);

    try {
      const res = await window.API.sendAiMessage(query);
      this.setLoading(false);
      this.addMessage('bot', res.response, res.factsRetrieved);
    } catch (err) {
      this.setLoading(false);
      this.addMessage('bot', `⚠️ Could not retrieve answer: ${err.message}`, ['Error logged']);
    }
  },

  askPrompt(promptText) {
    const input = document.getElementById('ai-chat-input');
    if (input) {
      input.value = promptText;
      this.handleFormSubmit();
    }
  },

  bindEvents() {
    const form = document.getElementById('ai-chat-form');
    const input = document.getElementById('ai-chat-input');
    const closeBtn = document.getElementById('btn-close-ai');
    const triggerBtn = document.getElementById('btn-open-ai');

    if (triggerBtn) {
      triggerBtn.onclick = () => this.toggle(true);
    }

    if (closeBtn) {
      closeBtn.onclick = () => this.toggle(false);
    }

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        this.handleFormSubmit();
      };
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleFormSubmit();
        }
      });
    }

    // Bind suggestion chips (delegated)
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.suggestion-chip');
      if (chip) {
        const prompt = chip.getAttribute('data-prompt');
        if (prompt) {
          this.askPrompt(prompt);
        }
      }
    });
  },

  addMessage(sender, text, facts = []) {
    this.messages.push({ sender, text, facts });
    this.render();
  },

  setLoading(isLoading) {
    const container = document.getElementById('ai-messages-list');
    if (!container) return;

    const existingLoader = document.getElementById('ai-loading-indicator');
    if (isLoading && !existingLoader) {
      const loader = document.createElement('div');
      loader.id = 'ai-loading-indicator';
      loader.className = 'chat-bubble bot';
      loader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-subtle);">
          <span style="display: inline-block; animation: pulse 1s infinite;">⚡</span>
          <span>Querying campus records and computing answer...</span>
        </div>
      `;
      container.appendChild(loader);
      container.scrollTop = container.scrollHeight;
    } else if (!isLoading && existingLoader) {
      existingLoader.remove();
    }
  }
};

window.AiAssistant = AiAssistant;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  AiAssistant.init();
});
