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
            <h3 id="task-dialog-title">You have tasks in progress</h3>
            <button class="task-dialog-close" id="task-dialog-close">&times;</button>
          </div>
          <div class="task-dialog-content">
            <p id="task-dialog-message">What would you like to do with your current tasks?</p>
            <div class="task-dialog-preview" id="task-dialog-preview">
              <!-- Task preview will be inserted here -->
            </div>
          </div>
          <div class="task-dialog-actions">
            <button class="task-dialog-btn task-dialog-keep" id="task-dialog-keep">
              <span class="btn-icon">📋</span>
              Keep Tasks
            </button>
            <button class="task-dialog-btn task-dialog-delete" id="task-dialog-delete">
              <span class="btn-icon">🗑️</span>
              Delete Tasks
            </button>
            <button class="task-dialog-btn task-dialog-cancel" id="task-dialog-cancel">
              <span class="btn-icon">❌</span>
              Cancel
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
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 480px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          animation: dialogSlideIn 0.3s ease-out;
        }

        .task-dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #e0e0e0;
        }

        .task-dialog-header h3 {
          margin: 0;
          font-size: 1.2em;
          font-weight: 600;
          color: #333;
        }

        .task-dialog-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .task-dialog-close:hover {
          background: #f0f0f0;
          color: #333;
        }

        .task-dialog-content {
          padding: 20px 24px;
        }

        .task-dialog-content p {
          margin: 0 0 16px 0;
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
          gap: 12px;
          padding: 16px 24px 24px;
          justify-content: flex-end;
        }

        .task-dialog-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid transparent;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 110px;
          justify-content: center;
        }

        .task-dialog-keep {
          background: #28a745;
          color: white;
          border-color: #28a745;
        }

        .task-dialog-keep:hover {
          background: #218838;
          border-color: #1e7e34;
        }

        .task-dialog-delete {
          background: #dc3545;
          color: white;
          border-color: #dc3545;
        }

        .task-dialog-delete:hover {
          background: #c82333;
          border-color: #bd2130;
        }

        .task-dialog-cancel {
          background: #6c757d;
          color: white;
          border-color: #6c757d;
        }

        .task-dialog-cancel:hover {
          background: #5a6268;
          border-color: #545b62;
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
          background: #2c2c2c;
          color: #e0e0e0;
        }

        body.theme-dark .task-dialog-header {
          border-bottom-color: #444;
        }

        body.theme-dark .task-dialog-header h3 {
          color: #e0e0e0;
        }

        body.theme-dark .task-dialog-close {
          color: #ccc;
        }

        body.theme-dark .task-dialog-close:hover {
          background: #444;
          color: #fff;
        }

        body.theme-dark .task-dialog-content p {
          color: #ccc;
        }

        body.theme-dark .task-dialog-preview {
          background: #3a3a3a;
          border-color: #555;
        }

        body.theme-dark .task-dialog-preview-item {
          border-bottom-color: #555;
        }

        body.theme-dark .task-dialog-preview-title {
          color: #e0e0e0;
        }

        body.theme-dark .task-dialog-preview-desc {
          color: #aaa;
        }

        /* Responsive Design */
        @media (max-width: 480px) {
          .task-dialog {
            width: 95%;
            margin: 20px;
          }

          .task-dialog-actions {
            flex-direction: column;
          }

          .task-dialog-btn {
            width: 100%;
          }
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
  }

  bindEvents() {
    // Use event delegation since the dialog might not exist yet
    document.addEventListener('click', (e) => {
      if (e.target.id === 'task-dialog-close' || e.target.id === 'task-dialog-cancel') {
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
      title = 'You have tasks in progress',
      message = 'What would you like to do with your current tasks?',
      tasks = [],
      keepButtonText = 'Keep Tasks',
      deleteButtonText = 'Delete Tasks',
      cancelButtonText = 'Cancel',
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
    document.getElementById('task-dialog-keep').innerHTML = `<span class="btn-icon">📋</span>${keepButtonText}`;
    document.getElementById('task-dialog-delete').innerHTML = `<span class="btn-icon">🗑️</span>${deleteButtonText}`;
    document.getElementById('task-dialog-cancel').innerHTML = `<span class="btn-icon">❌</span>${cancelButtonText}`;

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