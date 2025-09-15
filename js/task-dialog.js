// Enhanced Task Management Dialog System
// This unified system handles task validation for both mode switches and page refreshes

class TaskDialog {
  constructor() {
    this.createDialogHTML();
    this.bindEvents();
  }

  createDialogHTML() {
    // Check if dialog already exists
    if (document.getElementById('task-dialog-overlay')) return;

    const dialogHTML = `
      <div class="task-dialog-overlay" id="task-dialog-overlay" style="display: none;">
        <div class="task-dialog">
          <div class="task-dialog-header">
            <h3 id="task-dialog-title">Switch Timer Mode</h3>
            <button class="task-dialog-close" id="task-dialog-close">&times;</button>
          </div>
          <div class="task-dialog-content">
            <p id="task-dialog-message">You have tasks in progress. What would you like to do?</p>
            <div class="task-dialog-preview" id="task-dialog-preview">
              <!-- Task preview will be inserted here -->
            </div>
          </div>
          <div class="task-dialog-actions">
            <button class="task-dialog-btn task-dialog-keep" id="task-dialog-keep">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
              Keep Tasks & Switch
            </button>
            <button class="task-dialog-btn task-dialog-switch" id="task-dialog-switch">
              <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M3 21v-5h5"/>
              </svg>
              Switch Without Tasks
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    this.addDialogStyles();
  }

  addDialogStyles() {
    if (document.getElementById('task-dialog-styles')) return;

    const styles = `
      <style id="task-dialog-styles">
        .task-dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
          animation: dialogFadeIn 0.3s ease-out;
        }

        .task-dialog {
          background: white;
          border-radius: 16px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.15);
          max-width: 520px;
          width: 92%;
          max-height: 85vh;
          overflow: hidden;
          animation: dialogSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .task-dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px 28px 20px;
          border-bottom: 1px solid #f0f0f0;
          background: linear-gradient(to bottom, #ffffff, #fafafa);
        }

        .task-dialog-header h3 {
          margin: 0;
          font-size: 1.25em;
          font-weight: 600;
          color: #1a1a1a;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .task-dialog-header h3::before {
          content: '🔄';
          font-size: 1.1em;
        }

        .task-dialog-close {
          background: none;
          border: none;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          cursor: pointer;
          color: #6b7280;
          border-radius: 8px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .task-dialog-close:hover {
          background: #f3f4f6;
          color: #374151;
          transform: scale(1.05);
        }

        .task-dialog-content {
          padding: 24px 28px;
        }

        .task-dialog-content p {
          margin: 0 0 20px 0;
          font-size: 15px;
          line-height: 1.5;
          color: #4b5563;
          color: #555;
          line-height: 1.5;
        }

        .task-dialog-preview {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
          max-height: 200px;
          overflow-y: auto;
        }

        .task-dialog-preview-item {
          display: flex;
          align-items: flex-start;
          padding: 8px 0;
          border-bottom: 1px solid #e9ecef;
        }

        .task-dialog-preview-item:last-child {
          border-bottom: none;
        }

        .task-dialog-preview-checkbox {
          margin-right: 8px;
          margin-top: 2px;
        }

        .task-dialog-preview-text {
          flex: 1;
        }

        .task-dialog-preview-title {
          font-weight: 500;
          color: #333;
          margin-bottom: 2px;
        }

        .task-dialog-preview-desc {
          font-size: 0.9em;
          color: #666;
          font-style: italic;
        }

        .task-dialog-actions {
          display: flex;
          gap: 16px;
          padding: 20px 28px 28px;
          justify-content: center;
          background: linear-gradient(to bottom, #fafafa, #ffffff);
          border-top: 1px solid #f0f0f0;
        }

        .task-dialog-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          border: 2px solid transparent;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 160px;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .task-dialog-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }

        .task-dialog-btn:hover::before {
          left: 100%;
        }

        .task-dialog-keep {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border-color: #059669;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
        }

        .task-dialog-keep:hover {
          background: linear-gradient(135deg, #059669, #047857);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .task-dialog-keep::after {
          content: '📋';
          font-size: 16px;
        }

        .task-dialog-delete {
          background: linear-gradient(135deg, #6b7280, #4b5563);
          color: white;
          border-color: #4b5563;
          box-shadow: 0 4px 14px rgba(107, 114, 128, 0.3);
        }

        .task-dialog-delete:hover {
          background: linear-gradient(135deg, #4b5563, #374151);
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
        }

        .task-dialog-delete::after {
          content: '🔄';
          font-size: 16px;
        }

        @keyframes dialogFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes dialogSlideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Theme Support */
        body.theme-dark .task-dialog {
          background: linear-gradient(145deg, #1f2937, #111827);
          color: #f9fafb;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6);
        }

        body.theme-dark .task-dialog-header {
          border-bottom-color: #374151;
          background: linear-gradient(to bottom, #1f2937, #1a1a1a);
        }

        body.theme-dark .task-dialog-header h3 {
          color: #f3f4f6;
        }

        body.theme-dark .task-dialog-close {
          color: #9ca3af;
        }

        body.theme-dark .task-dialog-close:hover {
          background: #374151;
          color: #f3f4f6;
        }

        body.theme-dark .task-dialog-content p {
          color: #d1d5db;
        }

        body.theme-dark .task-dialog-actions {
          background: linear-gradient(to bottom, #1a1a1a, #1f2937);
          border-top-color: #374151;
        }

        body.theme-dark .task-dialog-keep {
          background: linear-gradient(135deg, #059669, #047857);
          box-shadow: 0 4px 14px rgba(5, 150, 105, 0.4);
        }

        body.theme-dark .task-dialog-keep:hover {
          box-shadow: 0 6px 20px rgba(5, 150, 105, 0.5);
        }

        body.theme-dark .task-dialog-delete {
          background: linear-gradient(135deg, #4b5563, #374151);
          box-shadow: 0 4px 14px rgba(75, 85, 99, 0.4);
        }

        body.theme-dark .task-dialog-delete:hover {
          box-shadow: 0 6px 20px rgba(75, 85, 99, 0.5);
        }

        /* Responsive Design */
        @media (max-width: 600px) {
          .task-dialog {
            width: 95%;
            margin: 16px;
            border-radius: 12px;
          }

          .task-dialog-header {
            padding: 20px 20px 16px;
          }

          .task-dialog-content {
            padding: 20px;
          }

          .task-dialog-actions {
            flex-direction: column;
            padding: 16px 20px 24px;
            gap: 12px;
          }

          .task-dialog-btn {
            width: 100%;
            min-width: unset;
          }
        }

        @media (max-width: 400px) {
          .task-dialog {
            width: 98%;
            margin: 8px;
          }

          .task-dialog-header h3 {
            font-size: 1.1em;
          }

          .task-dialog-content p {
            font-size: 14px;
          }

          .task-dialog-btn {
            padding: 12px 20px;
            font-size: 14px;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  bindEvents() {
    // Use event delegation since the dialog might not exist yet
    document.addEventListener('click', (e) => {
      if (e.target.id === 'task-dialog-close') {
        this.hideDialog();
        if (this.onCancel) this.onCancel();
      } else if (e.target.id === 'task-dialog-keep') {
        this.hideDialog();
        if (this.onKeep) this.onKeep();
      } else if (e.target.id === 'task-dialog-delete') {
        this.hideDialog();
        if (this.onDelete) this.onDelete();
      } else if (e.target.id === 'task-dialog-overlay') {
        // Close when clicking outside the dialog
        this.hideDialog();
        if (this.onCancel) this.onCancel();
      }
    });

    // Prevent closing when clicking inside the dialog
    document.addEventListener('click', (e) => {
      if (e.target.closest('.task-dialog') && e.target.id !== 'task-dialog-close') {
        e.stopPropagation();
      }
    });

    // Handle Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isVisible()) {
        this.hideDialog();
        if (this.onCancel) this.onCancel();
      }
    });
  }

  showDialog(options = {}) {
    const {
      title = 'Switch Pomodoro Mode',
      message = 'You have tasks in progress. Choose how to handle them:',
      tasks = [],
      keepButtonText = 'Keep Tasks',
      deleteButtonText = 'Switch Without Tasks',
      onKeep = null,
      onDelete = null,
      onCancel = null
    } = options;

    // Store callbacks
    this.onKeep = onKeep;
    this.onDelete = onDelete;
    this.onCancel = onCancel;

    // Update dialog content
    document.getElementById('task-dialog-title').textContent = title;
    document.getElementById('task-dialog-message').textContent = message;
    document.getElementById('task-dialog-keep').textContent = keepButtonText;
    document.getElementById('task-dialog-delete').textContent = deleteButtonText;

    // Update task preview
    this.updateTaskPreview(tasks);

    // Show dialog
    document.getElementById('task-dialog-overlay').style.display = 'flex';
    
    // Focus the dialog for accessibility
    setTimeout(() => {
      document.getElementById('task-dialog-close').focus();
    }, 100);
  }

  updateTaskPreview(tasks) {
    const preview = document.getElementById('task-dialog-preview');
    
    if (!tasks || tasks.length === 0) {
      preview.style.display = 'none';
      return;
    }

    preview.style.display = 'block';
    preview.innerHTML = tasks.map(task => `
      <div class="task-dialog-preview-item">
        <input type="checkbox" class="task-dialog-preview-checkbox" ${task.completed ? 'checked' : ''} disabled>
        <div class="task-dialog-preview-text">
          <div class="task-dialog-preview-title">${task.title}</div>
          ${task.description ? `<div class="task-dialog-preview-desc">${task.description}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  hideDialog() {
    const overlay = document.getElementById('task-dialog-overlay');
    if (overlay) {
      overlay.style.display = 'none';
    }
    
    // Clear callbacks
    this.onKeep = null;
    this.onDelete = null;
    this.onCancel = null;
  }

  isVisible() {
    const overlay = document.getElementById('task-dialog-overlay');
    return overlay && overlay.style.display !== 'none';
  }

  // Utility method to get current tasks from the DOM
  static getCurrentTasks() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return [];

    return Array.from(taskList.querySelectorAll('.task-item')).map(taskItem => {
      const titleElement = taskItem.querySelector('.task-text');
      const descElement = taskItem.querySelector('.task-description');
      const checkbox = taskItem.querySelector('.task-checkbox');
      
      return {
        title: titleElement ? titleElement.textContent.trim() : '',
        description: descElement ? descElement.textContent.trim() : '',
        completed: checkbox ? checkbox.checked : false
      };
    });
  }

  // Utility method to get unsaved tasks from inputs
  static getUnsavedTasks() {
    const taskInput = document.getElementById('task-input');
    const taskDescInput = document.getElementById('task-description-input');
    
    const title = taskInput ? taskInput.value.trim() : '';
    const description = taskDescInput ? taskDescInput.value.trim() : '';
    
    if (!title && !description) return [];
    
    return [{
      title: title || 'Untitled Task',
      description: description,
      completed: false
    }];
  }
}

// Create global instance
window.taskDialog = new TaskDialog();

// Export utility functions
window.TaskDialog = TaskDialog;