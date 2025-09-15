/**
 * Task Transfer System
 * Simplified task transfer between Classic and Reverse Pomodoro modes
 */
class TaskTransfer {
  constructor() {
    this.TRANSFER_KEY = 'taskTransfer';
    this.CLASSIC_TASKS_KEY = 'tasks';
    this.REVERSE_TASKS_KEY = 'reverseTasks';
    this.TRANSFER_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Prepare tasks for transfer between modes
   * @param {Array} tasks - Tasks to transfer
   * @param {string} sourceMode - Source mode ('classic' or 'reverse')
   */
  prepareTransfer(tasks, sourceMode) {
    if (!tasks || !Array.isArray(tasks)) {
      console.warn('Invalid tasks provided for transfer');
      return;
    }

    const transferData = {
      tasks: tasks.filter(task => task && task.title), // Only valid tasks
      sourceMode: sourceMode,
      targetMode: sourceMode === 'classic' ? 'reverse' : 'classic',
      timestamp: Date.now()
    };
    
    try {
      localStorage.setItem(this.TRANSFER_KEY, JSON.stringify(transferData));
      console.log(`Prepared ${transferData.tasks.length} tasks for transfer from ${sourceMode} to ${transferData.targetMode}`);
    } catch (error) {
      console.error('Failed to prepare task transfer:', error);
    }
  }

  /**
   * Get pending transfer data if valid
   * @returns {Object|null} Transfer data or null if invalid/expired
   */
  getPendingTransfer() {
    try {
      const transferData = localStorage.getItem(this.TRANSFER_KEY);
      if (!transferData) return null;

      const parsed = JSON.parse(transferData);
      
      // Validate transfer data
      if (!parsed.tasks || !parsed.sourceMode || !parsed.timestamp) {
        this.clearTransfer();
        return null;
      }
      
      // Check if transfer is still valid
      if ((Date.now() - parsed.timestamp) > this.TRANSFER_TIMEOUT) {
        this.clearTransfer();
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Error retrieving transfer data:', error);
      this.clearTransfer();
      return null;
    }
  }

  /**
   * Apply transferred tasks to the current mode
   * @param {string} currentMode - Current mode ('classic' or 'reverse')
   * @returns {boolean} Success status
   */
  applyTransfer(currentMode) {
    const transferData = this.getPendingTransfer();
    if (!transferData) return false;

    // Verify mode compatibility
    if (transferData.targetMode !== currentMode) {
      console.warn(`Transfer mode mismatch: expected ${currentMode}, got ${transferData.targetMode}`);
      this.clearTransfer();
      return false;
    }

    try {
      const storageKey = currentMode === 'classic' ? this.CLASSIC_TASKS_KEY : this.REVERSE_TASKS_KEY;
      const transferredTasks = transferData.tasks || [];
      
      // Save tasks to storage
      localStorage.setItem(storageKey, JSON.stringify(transferredTasks));
      
      // Apply tasks to DOM
      this.applyTasksToDOM(transferredTasks);
      
      // Clear the transfer
      this.clearTransfer();
      
      console.log(`Successfully applied ${transferredTasks.length} tasks to ${currentMode} mode`);
      return true;
    } catch (error) {
      console.error('Error applying task transfer:', error);
      this.clearTransfer();
      return false;
    }
  }

  /**
   * Get tasks from localStorage safely
   * @param {string} key - Storage key
   * @returns {Array} Tasks array or empty array
   */
  getTasksFromStorage(key) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error(`Error loading tasks from ${key}:`, error);
      return [];
    }
  }

  /**
   * Apply tasks to the DOM
   * @param {Array} tasks - Tasks to apply
   */
  applyTasksToDOM(tasks) {
    const taskList = document.getElementById('task-list');
    if (!taskList) {
      console.warn('Task list element not found');
      return;
    }

    // Clear existing tasks
    taskList.innerHTML = '';

    if (!tasks || tasks.length === 0) {
      console.log('No tasks to apply to DOM');
      return;
    }

    // Add each task to the DOM
    tasks.forEach((taskData, index) => {
      try {
        if (typeof window.createTaskElement === 'function') {
          // Use existing createTaskElement function
          const taskElement = window.createTaskElement(
            taskData.title, 
            taskData.completed || false, 
            taskData.description || ''
          );
          if (taskElement) {
            taskList.appendChild(taskElement);
          }
        } else {
          // Fallback: create simple task element
          const taskElement = this.createSimpleTaskElement(taskData);
          if (taskElement) {
            taskList.appendChild(taskElement);
          }
        }
      } catch (error) {
        console.error(`Error creating task element for task ${index}:`, error);
      }
    });

    // Update task tracking variables
    this.updateTaskTrackingVariables();
  }

  /**
   * Create a simple task element as fallback
   * @param {Object} taskData - Task data
   * @returns {HTMLElement} Task element
   */
  createSimpleTaskElement(taskData) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${taskData.completed ? 'task-completed' : ''}`;
    
    taskItem.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${taskData.completed ? 'checked' : ''}>
      <div class="task-content">
        <div class="task-text">${this.escapeHtml(taskData.title)}</div>
        ${taskData.description ? `<div class="task-description">${this.escapeHtml(taskData.description)}</div>` : ''}
      </div>
      <button class="task-delete" title="Delete task">×</button>
    `;

    // Add event listeners
    const checkbox = taskItem.querySelector('.task-checkbox');
    const deleteBtn = taskItem.querySelector('.task-delete');

    if (checkbox) {
      checkbox.addEventListener('change', () => {
        taskItem.classList.toggle('task-completed', checkbox.checked);
        this.updateTaskState();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        taskItem.remove();
        this.updateTaskState();
      });
    }

    return taskItem;
  }

  /**
   * Update task state after changes
   */
  updateTaskState() {
    // Trigger existing update functions if available
    if (typeof window.updateUnfinishedTasks === 'function') {
      window.updateUnfinishedTasks();
    }
    if (typeof window.saveTasks === 'function') {
      window.saveTasks();
    }
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Detect current mode based on URL
   * @returns {string} Current mode ('classic' or 'reverse')
   */
  getCurrentMode() {
    return window.location.pathname.includes('reverse') ? 'reverse' : 'classic';
  }

  /**
   * Clear transfer data from localStorage
   */
  clearTransfer() {
    try {
      localStorage.removeItem(this.TRANSFER_KEY);
      console.log('Transfer data cleared');
    } catch (error) {
      console.error('Error clearing transfer data:', error);
    }
  }

  /**
   * Check if there's a pending transfer on page load
   * @returns {boolean} Whether a transfer was found
   */
  checkForPendingTransfer() {
    const transferData = this.getPendingTransfer();
    if (!transferData) return false;

    const currentMode = this.getCurrentMode();
    
    // Auto-apply if we're in the target mode
    if (transferData.targetMode === currentMode) {
      console.log(`Found pending transfer: ${transferData.tasks.length} tasks from ${transferData.sourceMode} to ${currentMode}`);
      return this.applyTransfer(currentMode);
    }
    
    return false;
  }
}

// Create global instance
window.taskTransfer = new TaskTransfer();

// Export class
window.TaskTransfer = TaskTransfer;