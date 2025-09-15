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
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  visibility: hidden;
  opacity: 0;
  transition: visibility 0s linear 0.25s, opacity 0.3s ease;
  backdrop-filter: blur(3px);
}

.task-retention-modal-overlay.show {
  display: flex;
  visibility: visible;
  opacity: 1;
  transition-delay: 0s;
}

.task-retention-modal {
  background: linear-gradient(145deg, rgb(45, 45, 55), rgb(25, 25, 35));
  border-radius: 16px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25), 
              0 1px 8px rgba(0, 0, 0, 0.1),
              0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  overflow: hidden;
  transform: translateY(20px) scale(0.95);
  transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.task-retention-modal-overlay.show .task-retention-modal {
  transform: translateY(0) scale(1);
}

.task-retention-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  position: relative;
}

.task-retention-modal-header:after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 4%;
  right: 4%;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2) 20%, rgba(255, 255, 255, 0.2) 80%, transparent);
}

.task-retention-modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: white;
  letter-spacing: -0.01em;
}

.task-retention-modal-close {
  background: none;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.2s ease;
}

.task-retention-modal-close:hover {
  background-color: rgba(255, 255, 255, 0.15);
  color: white;
}

.task-retention-modal-content {
  padding: 24px;
  color: white;
  line-height: 1.6;
  text-align: center;
}

.task-retention-modal-content p {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
}

.task-retention-modal-content strong {
  font-weight: 600;
  color: white;
}

.task-preview {
  margin: 20px 0;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  text-align: left;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.task-preview-item {
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.task-preview-item:last-child {
  border-bottom: none;
}

.task-preview-item-title {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.95);
  flex: 1;
}

.task-preview-item-desc {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
}

.task-preview-item-status {
  font-size: 0.8rem;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.task-preview-item-status.completed {
  background: rgba(48, 209, 88, 0.2);
  color: rgba(48, 209, 88, 0.9);
}

.focused-task {
  font-weight: 600;
  color: rgba(74, 123, 255, 0.9);
}

.task-retention-modal-actions {
  padding: 16px 24px 20px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.task-retention-modal-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 40px;
  cursor: pointer;
  font-weight: 500;
  font-size: 15px;
  letter-spacing: 0.02em;
  transition: all 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  min-width: 120px;
}

.btn-primary {
  background: linear-gradient(to bottom right, #4a7bff, #2e5cd8);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.btn-primary:active {
  transform: translateY(1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.btn-secondary:active {
  transform: translateY(1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Add responsive design for mobile */
@media (max-width: 480px) {
  .task-retention-modal {
    max-width: 98vw;
    width: 98vw;
    border-radius: 12px;
  }
  
  .task-retention-modal-header,
  .task-retention-modal-content,
  .task-retention-modal-actions {
    padding-left: 14px;
    padding-right: 14px;
  }
  
  .task-retention-modal-title {
    font-size: 18px;
  }
  
  .task-retention-modal-actions button {
    font-size: 14px;
    padding: 8px 16px;
    min-width: 100px;
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
        ${task.completed ? '<div class="task-preview-item-status completed">Completed</div>' : ''}
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
    // Clear any existing tasks in the target mode to ensure a fresh start
    const targetKey = this.targetMode === 'Classic Pomodoro' ? CLASSIC_TASKS_KEY : REVERSE_TASKS_KEY;
    // Instead of merging tasks, we'll make sure the target mode starts fresh
    localStorage.setItem(targetKey, JSON.stringify([]));
    console.log(`Tasks cleared in ${this.targetMode} (Start Fresh selected)`);
    
    // Show notification if possible
    if (typeof window.showToast === 'function') {
      window.showToast(`Starting fresh in ${this.targetMode}! 🔄`);
    }
    
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
    
    // Create deep copies of tasks to ensure no shared references
    const tasksCopy = JSON.parse(JSON.stringify(tasks));
    
    // Create a more robust deduplication system using both text and description
    const isDuplicate = (newTask, existingTask) => {
      return (
        newTask.text === existingTask.text && 
        newTask.description === existingTask.description
      );
    };
    
    // Filter out duplicate tasks using the more robust comparison
    const newTasks = tasksCopy.filter(newTask => 
      !targetTasks.some(existingTask => isDuplicate(newTask, existingTask))
    );
    
    // Use completely fresh data for the target mode
    targetTasks = [...targetTasks, ...newTasks];
    
    // Save to localStorage
    localStorage.setItem(targetKey, JSON.stringify(targetTasks));
    
    console.log(`Transferred ${newTasks.length} new tasks to ${targetMode} (${tasks.length - newTasks.length} duplicates skipped)`, targetTasks);
  }

  // Method to handle mode switching with task retention
  async handleModeSwitch(targetUrl, targetMode) {
    // Get latest tasks from DOM before showing dialog
    this.currentTasks = this.getTasksFromTaskList();
    
    // Only show the dialog if there are actually tasks to transfer
    if (this.currentTasks.length > 0) {
      const shouldTransfer = await this.showRetentionDialog(targetMode);
      
      if (shouldTransfer) {
        console.log(`${this.currentTasks.length} tasks transferred to ${targetMode}`);
      } else {
        console.log('User chose to start fresh in the target mode');
      }
    } else {
      console.log('No tasks to transfer, proceeding directly');
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

// Helper function to ensure tasks are only deleted in the current mode
function setupIsolatedTaskDeletion() {
  // Watch for task deletion events
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('task-delete')) {
      // Get the task item being deleted
      const taskItem = e.target.closest('.task-item');
      if (!taskItem) return;
      
      // Get the task text
      const taskText = taskItem.querySelector('.task-text')?.textContent;
      if (!taskText) return;
      
      // Determine current mode based on current page
      const currentPage = window.location.pathname;
      const isReversePage = currentPage.includes('reverse.html');
      const currentKey = isReversePage ? REVERSE_TASKS_KEY : CLASSIC_TASKS_KEY;
      
      // Get current tasks from localStorage
      const savedTasks = localStorage.getItem(currentKey);
      if (!savedTasks) return;
      
      try {
        // Parse tasks
        const tasks = JSON.parse(savedTasks);
        
        // Filter out the deleted task
        const updatedTasks = tasks.filter(task => task.text !== taskText);
        
        // Save back to localStorage for current mode only
        localStorage.setItem(currentKey, JSON.stringify(updatedTasks));
        
        console.log(`Task "${taskText}" deleted from ${isReversePage ? 'Reverse' : 'Classic'} mode only.`);
      } catch (error) {
        console.error('Error processing task deletion:', error);
      }
    }
  });
}

// Initialize isolated task deletion on DOMContentLoaded
document.addEventListener('DOMContentLoaded', setupIsolatedTaskDeletion);

// Export for global access
window.TaskRetentionManager = TaskRetentionManager;