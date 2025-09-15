// Task Retention System for Classic/Reverse Pomodoro Mode Switching
// This module handles preserving tasks when users switch between Classic and Reverse modes

// Constants for localStorage keys
const CLASSIC_TASKS_KEY = 'pomodoroTasks';
const REVERSE_TASKS_KEY = 'reverseTasks';
const TASK_RETENTION_MODAL_ID = 'task-retention-modal';

// Task Retention Modal HTML
const TASK_RETENTION_MODAL_HTML = `
<div class="task-retention-modal-overlay" id="${TASK_RETENTION_MODAL_ID}">
  <div class="task-retention-modal">
    <div class="task-retention-modal-header">
      <h3 class="task-retention-modal-title">Keep Your Tasks?</h3>
      <button class="task-retention-modal-close" id="task-retention-close-btn" title="Close dialog" aria-label="Close dialog">&times;</button>
    </div>
    <div class="task-retention-modal-content">
      <p>You have <span id="task-count"></span> task(s) in your current mode.</p>
      <p>Would you like to transfer them to <strong><span id="target-mode"></span></strong>?</p>
      <div class="task-preview" id="task-preview">
        <!-- Tasks will be listed here -->
      </div>
    </div>
    <div class="task-retention-modal-actions">
      <button class="btn-secondary" id="discard-tasks-btn">No, Start Fresh</button>
      <button class="btn-primary" id="keep-tasks-btn">Yes, Keep Tasks</button>
    </div>
  </div>
</div>
`;

// Task Retention Modal CSS
const TASK_RETENTION_MODAL_CSS = `
<style>
.task-retention-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease;
}

.task-retention-modal-overlay.show {
  display: flex;
}

.task-retention-modal {
  background: var(--modal-bg, white);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease;
}

.task-retention-modal-header {
  padding: 24px 24px 0;
  text-align: center;
  position: relative;
}

.task-retention-modal-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.task-retention-modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  font-weight: bold;
  color: var(--text-secondary, #666);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.task-retention-modal-close:hover {
  background: var(--bg-secondary, #f8f9fa);
  color: var(--text-primary, #333);
  transform: scale(1.1);
}

.task-retention-modal-content {
  padding: 20px 24px;
  text-align: center;
}

.task-retention-modal-content p {
  margin: 0 0 16px;
  color: var(--text-secondary, #666);
  line-height: 1.5;
}

.task-preview {
  margin: 20px 0;
  padding: 16px;
  background: var(--bg-secondary, #f8f9fa);
  border-radius: 8px;
  text-align: left;
  max-height: 200px;
  overflow-y: auto;
}

.task-preview-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light, #eee);
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.task-preview-item:last-child {
  border-bottom: none;
}

.task-preview-item-title {
  font-weight: 500;
  color: var(--text-primary, #333);
  flex: 1;
}

.task-preview-item-desc {
  font-size: 0.9rem;
  color: var(--text-secondary, #666);
  margin-top: 4px;
}

.task-preview-item-status {
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--status-bg, #e9ecef);
  color: var(--status-text, #495057);
}

.task-preview-item-status.completed {
  background: var(--success-bg, #d4edda);
  color: var(--success-text, #155724);
}

.focused-task {
  font-weight: 600;
  color: var(--primary-color, #007AFF);
}

.task-retention-modal-actions {
  padding: 0 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.task-retention-modal-actions button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.btn-primary {
  background: var(--primary-color, #007AFF);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-hover, #0056CC);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--secondary-bg, #f1f3f4);
  color: var(--text-primary, #333);
}

.btn-secondary:hover {
  background: var(--secondary-hover, #e8eaed);
  transform: translateY(-1px);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideIn {
  from { 
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to { 
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Dark theme support */
@media (prefers-color-scheme: dark) {
  .task-retention-modal {
    --modal-bg: #2c2c2e;
    --text-primary: #ffffff;
    --text-secondary: #8e8e93;
    --bg-secondary: #1c1c1e;
    --border-light: #3a3a3c;
    --status-bg: #3a3a3c;
    --status-text: #8e8e93;
    --success-bg: #1e3a2e;
    --success-text: #30d158;
    --secondary-bg: #3a3a3c;
    --secondary-hover: #48484a;
  }
  
  .task-retention-modal-close:hover {
    background: var(--bg-secondary, #1c1c1e);
    color: var(--text-primary, #ffffff);
  }
}
</style>
`;

// Task Retention Manager Class
class TaskRetentionManager {
  constructor() {
    this.modal = null;
    this.currentTasks = [];
    this.targetMode = '';
    this.resolvePromise = null;
    this.init();
  }

  init() {
    // Add CSS to head
    if (!document.getElementById('task-retention-styles')) {
      const styleElement = document.createElement('div');
      styleElement.id = 'task-retention-styles';
      styleElement.innerHTML = TASK_RETENTION_MODAL_CSS;
      document.head.appendChild(styleElement);
    }
  }

  createModal() {
    // Remove existing modal if any
    this.removeModal();
    
    // Create modal element
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = TASK_RETENTION_MODAL_HTML;
    document.body.appendChild(modalContainer.firstElementChild);
    
    this.modal = document.getElementById(TASK_RETENTION_MODAL_ID);
    
    // Add event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    const keepBtn = document.getElementById('keep-tasks-btn');
    const discardBtn = document.getElementById('discard-tasks-btn');
    const closeBtn = document.getElementById('task-retention-close-btn');
    
    keepBtn.addEventListener('click', () => this.handleKeepTasks());
    discardBtn.addEventListener('click', () => this.handleDiscardTasks());
    closeBtn.addEventListener('click', () => this.closeModal());
    
    // Close on overlay click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.handleDiscardTasks();
      }
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal?.classList.contains('show')) {
        this.handleDiscardTasks();
      }
    });
  }

  removeModal() {
    const existingModal = document.getElementById(TASK_RETENTION_MODAL_ID);
    if (existingModal) {
      existingModal.remove();
    }
    this.modal = null;
  }

  closeModal() {
    // Simply close the modal without any action
    this.removeModal();
  }

  getCurrentModeTasks() {
    // Determine current mode based on current page
    const currentPage = window.location.pathname;
    const isReversePage = currentPage.includes('reverse.html');
    
    if (isReversePage) {
      // We're on reverse page, get reverse tasks
      const reverseTasks = localStorage.getItem(REVERSE_TASKS_KEY);
      return reverseTasks ? JSON.parse(reverseTasks) : [];
    } else {
      // We're on classic page, get classic tasks
      const classicTasks = localStorage.getItem(CLASSIC_TASKS_KEY);
      return classicTasks ? JSON.parse(classicTasks) : [];
    }
  }

  getTasksFromTaskList() {
    // Get tasks from current DOM
    const taskListElement = document.getElementById('task-list');
    if (!taskListElement) return [];
    
    const taskItems = Array.from(taskListElement.children);
    return taskItems.map(taskItem => {
      const textElement = taskItem.querySelector('.task-text');
      const checkboxElement = taskItem.querySelector('.task-checkbox');
      const descElement = taskItem.querySelector('.task-description');
      const isFocused = taskItem.classList.contains('task-focused');
      
      return {
        text: textElement ? textElement.textContent : '',
        completed: checkboxElement ? checkboxElement.checked : false,
        description: descElement ? descElement.textContent : '',
        focused: isFocused
      };
    });
  }

  populateTaskPreview(tasks) {
    const taskPreview = document.getElementById('task-preview');
    const taskCount = document.getElementById('task-count');
    
    taskCount.textContent = tasks.length;
    
    if (tasks.length === 0) {
      taskPreview.innerHTML = '<p style="text-align: center; color: #666;">No tasks found</p>';
      return;
    }
    
    taskPreview.innerHTML = tasks.map(task => `
      <div class="task-preview-item">
        <div class="task-preview-item-content">
          <div class="task-preview-item-title ${task.focused ? 'focused-task' : ''}">${this.escapeHtml(task.text)} ${task.focused ? '⭐' : ''}</div>
          ${task.description ? `<div class="task-preview-item-desc">${this.escapeHtml(task.description)}</div>` : ''}
        </div>
        <div class="task-preview-item-status ${task.completed ? 'completed' : ''}">
          ${task.completed ? 'Completed' : 'Pending'}
        </div>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async showRetentionDialog(targetMode) {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      
      // Get current tasks from DOM (more reliable than localStorage for current state)
      this.currentTasks = this.getTasksFromTaskList();
      
      // If no tasks, resolve immediately with no transfer
      if (this.currentTasks.length === 0) {
        resolve(false);
        return;
      }
      
      this.targetMode = targetMode;
      
      // Create and show modal
      this.createModal();
      
      // Update modal content
      document.getElementById('target-mode').textContent = targetMode;
      this.populateTaskPreview(this.currentTasks);
      
      // Show modal
      this.modal.classList.add('show');
    });
  }

  handleKeepTasks() {
    // Transfer tasks to target mode
    this.transferTasks(this.currentTasks, this.targetMode);
    
    // Show success notification if possible
    if (typeof window.showToast === 'function') {
      window.showToast(`Tasks transferred to ${this.targetMode}! 🎯`);
    }
    
    this.hideModal();
    this.resolvePromise?.(true);
  }

  handleDiscardTasks() {
    this.hideModal();
    this.resolvePromise?.(false);
  }

  hideModal() {
    if (this.modal) {
      this.modal.classList.remove('show');
      setTimeout(() => this.removeModal(), 300);
    }
  }

  transferTasks(tasks, targetMode) {
    const targetKey = targetMode === 'Classic Pomodoro' ? CLASSIC_TASKS_KEY : REVERSE_TASKS_KEY;
    
    // Get existing tasks in target mode
    const existingTasks = localStorage.getItem(targetKey);
    let targetTasks = existingTasks ? JSON.parse(existingTasks) : [];
    
    // Filter out duplicate tasks (based on text content)
    const existingTexts = new Set(targetTasks.map(t => t.text));
    const newTasks = tasks.filter(task => !existingTexts.has(task.text));
    
    // Add only non-duplicate tasks to target mode
    targetTasks = [...targetTasks, ...newTasks];
    
    // Save to localStorage
    localStorage.setItem(targetKey, JSON.stringify(targetTasks));
    
    console.log(`Transferred ${newTasks.length} new tasks to ${targetMode} (${tasks.length - newTasks.length} duplicates skipped)`, targetTasks);
  }

  // Method to handle mode switching with task retention
  async handleModeSwitch(targetUrl, targetMode) {
    const shouldTransfer = await this.showRetentionDialog(targetMode);
    
    if (shouldTransfer) {
      console.log(`Tasks transferred to ${targetMode}`);
    } else {
      console.log('User chose not to transfer tasks');
    }
    
    // Navigate to target page
    window.location.href = targetUrl;
  }
}

// Create global instance
window.taskRetentionManager = new TaskRetentionManager();

// Function to add task saving to Classic Pomodoro (since it doesn't have it yet)
function addClassicTaskSaving() {
  // Only run on classic pomodoro page (not reverse.html)
  if (window.location.pathname.includes('reverse.html')) return;
  
  // Function to save classic tasks
  function saveClassicTasks() {
    const taskListElement = document.getElementById('task-list');
    if (!taskListElement) return;
    
    const taskItems = Array.from(taskListElement.children).map(taskItem => {
      const textElement = taskItem.querySelector('.task-text');
      const checkboxElement = taskItem.querySelector('.task-checkbox');
      const descElement = taskItem.querySelector('.task-description');
      const isFocused = taskItem.classList.contains('task-focused');
      
      return {
        text: textElement ? textElement.textContent : '',
        completed: checkboxElement ? checkboxElement.checked : false,
        description: descElement ? descElement.textContent : '',
        focused: isFocused
      };
    });
    
    localStorage.setItem(CLASSIC_TASKS_KEY, JSON.stringify(taskItems));
    console.log('Classic tasks saved to localStorage:', taskItems);
  }
  
  // Function to load classic tasks
  function loadClassicTasks() {
    const taskListElement = document.getElementById('task-list');
    if (!taskListElement) return;
    
    const savedTasks = localStorage.getItem(CLASSIC_TASKS_KEY);
    if (!savedTasks) return;
    
    try {
      const taskItems = JSON.parse(savedTasks);
      
      // Clear existing tasks
      taskListElement.innerHTML = '';
      
      // Recreate tasks
      taskItems.forEach(task => {
        if (typeof window.createTaskElement === 'function') {
          window.createTaskElement(task.text, task.completed, task.description || '');
          
          // Handle focused task
          if (task.focused && typeof window.setCurrentFocusedTask === 'function') {
            // Find the task element that was just created
            const taskElements = Array.from(taskListElement.children);
            const lastTask = taskElements[taskElements.length - 1];
            if (lastTask) {
              setTimeout(() => {
                window.setCurrentFocusedTask(lastTask, task.text);
              }, 100);
            }
          }
        }
      });
      
      console.log('Classic tasks loaded from localStorage:', taskItems);
    } catch (error) {
      console.error('Error loading classic tasks:', error);
    }
  }
  
  // Wait for DOM and functions to be ready before overriding
  function initTaskSaving() {
    // Override existing functions to include saving
    const originalCreateTaskElement = window.createTaskElement;
    if (originalCreateTaskElement) {
      window.createTaskElement = function(...args) {
        const result = originalCreateTaskElement.apply(this, args);
        setTimeout(saveClassicTasks, 100); // Save after DOM updates
        return result;
      };
    }
    
    // Also override addTask if it exists
    const originalAddTask = window.addTask;
    if (originalAddTask) {
      window.addTask = function(...args) {
        const result = originalAddTask.apply(this, args);
        setTimeout(saveClassicTasks, 100);
        return result;
      };
    }
  }
  
  // Try to initialize immediately, and also on DOMContentLoaded
  if (typeof window.createTaskElement === 'function') {
    initTaskSaving();
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initTaskSaving, 500); // Give other scripts time to load
  });
  
  // Add save on checkbox changes and task deletions
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('task-checkbox') || 
        e.target.classList.contains('task-delete')) {
      setTimeout(saveClassicTasks, 100);
    }
  });
  
  // Load tasks when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadClassicTasks);
  } else {
    loadClassicTasks();
  }
}

// Initialize classic task saving
addClassicTaskSaving();

// Export for global access
window.TaskRetentionManager = TaskRetentionManager;