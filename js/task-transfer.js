// Task Transfer System
// Handles safe transfer of tasks between Classic and Reverse Pomodoro modes

class TaskTransfer {
  constructor() {
    this.TRANSFER_KEY = 'taskTransfer';
    this.CLASSIC_TASKS_KEY = 'tasks';
    this.REVERSE_TASKS_KEY = 'reverseTasks';
  }

  // Prepare tasks for transfer (called before switching modes)
  prepareTransfer(tasks, sourceMode) {
    const transferData = {
      tasks: tasks,
      sourceMode: sourceMode,
      targetMode: sourceMode === 'classic' ? 'reverse' : 'classic',
      timestamp: Date.now()
    };
    
    localStorage.setItem(this.TRANSFER_KEY, JSON.stringify(transferData));
    console.log('Tasks prepared for transfer:', transferData);
  }

  // Get pending transfer data
  getPendingTransfer() {
    const transferData = localStorage.getItem(this.TRANSFER_KEY);
    if (!transferData) return null;

    try {
      const parsed = JSON.parse(transferData);
      
      // Check if transfer is still valid (within 5 minutes)
      const isValid = (Date.now() - parsed.timestamp) < (5 * 60 * 1000);
      
      if (!isValid) {
        this.clearTransfer();
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Error parsing transfer data:', error);
      this.clearTransfer();
      return null;
    }
  }

  // Apply transferred tasks to the current mode
  applyTransfer(currentMode) {
    const transferData = this.getPendingTransfer();
    if (!transferData) return false;

    // Verify we're in the expected target mode
    if (transferData.targetMode !== currentMode) {
      console.warn('Transfer target mode mismatch');
      this.clearTransfer();
      return false;
    }

    try {
      // Apply tasks to the appropriate storage key
      const storageKey = currentMode === 'classic' ? this.CLASSIC_TASKS_KEY : this.REVERSE_TASKS_KEY;
      
      // Get existing tasks (if any) and merge with transferred tasks
      const existingTasks = this.getTasksFromStorage(storageKey);
      const transferredTasks = transferData.tasks || [];
      
      // Combine tasks (transferred tasks take priority)
      const combinedTasks = [...transferredTasks, ...existingTasks];
      
      // Remove duplicates based on title and description
      const uniqueTasks = this.removeDuplicateTasks(combinedTasks);
      
      localStorage.setItem(storageKey, JSON.stringify(uniqueTasks));
      
      // Apply tasks to the DOM
      this.applyTasksToDOM(uniqueTasks);
      
      // Clear the transfer
      this.clearTransfer();
      
      console.log(`Successfully applied ${uniqueTasks.length} tasks to ${currentMode} mode`);
      return true;
    } catch (error) {
      console.error('Error applying task transfer:', error);
      this.clearTransfer();
      return false;
    }
  }

  // Get tasks from localStorage
  getTasksFromStorage(key) {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading tasks from storage:', error);
      return [];
    }
  }

  // Remove duplicate tasks
  removeDuplicateTasks(tasks) {
    const seen = new Set();
    return tasks.filter(task => {
      const key = `${task.title}|${task.description || ''}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Apply tasks to the current DOM
  applyTasksToDOM(tasks) {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;

    // Clear existing tasks
    taskList.innerHTML = '';

    // Add each task to the DOM
    tasks.forEach(taskData => {
      if (typeof window.createTaskElement === 'function') {
        // Use existing createTaskElement function if available
        const taskElement = window.createTaskElement(
          taskData.title, 
          taskData.completed || false, 
          taskData.description || ''
        );
        taskList.appendChild(taskElement);
      } else {
        // Fallback: create simple task element
        const taskElement = this.createSimpleTaskElement(taskData);
        taskList.appendChild(taskElement);
      }
    });

    // Update task tracking variables
    this.updateTaskTrackingVariables();
  }

  // Simple task element creation (fallback)
  createSimpleTaskElement(taskData) {
    const taskItem = document.createElement('div');
    taskItem.className = `task-item ${taskData.completed ? 'task-completed' : ''}`;
    
    taskItem.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${taskData.completed ? 'checked' : ''}>
      <div class="task-content">
        <div class="task-text">${taskData.title}</div>
        ${taskData.description ? `<div class="task-description">${taskData.description}</div>` : ''}
      </div>
      <button class="task-delete">×</button>
    `;

    // Add event listeners
    const checkbox = taskItem.querySelector('.task-checkbox');
    const deleteBtn = taskItem.querySelector('.task-delete');

    checkbox.addEventListener('change', () => {
      taskItem.classList.toggle('task-completed', checkbox.checked);
      this.saveCurrentTasks();
      this.updateTaskTrackingVariables();
    });

    deleteBtn.addEventListener('click', () => {
      taskItem.remove();
      this.saveCurrentTasks();
      this.updateTaskTrackingVariables();
    });

    return taskItem;
  }

  // Update task tracking variables (hasUnfinishedTasks, etc.)
  updateTaskTrackingVariables() {
    const taskList = document.getElementById('task-list');
    const taskInput = document.getElementById('task-input');
    const taskDescInput = document.getElementById('task-description-input');
    
    // Update hasUnfinishedTasks
    if (typeof window.updateUnfinishedTasks === 'function') {
      window.updateUnfinishedTasks();
    } else {
      // Fallback
      const unfinishedTasks = taskList ? 
        Array.from(taskList.querySelectorAll('.task-item:not(.task-completed)')) : [];
      if (window.hasUnfinishedTasks !== undefined) {
        window.hasUnfinishedTasks = unfinishedTasks.length > 0;
      }
    }

    // Update hasUnsavedTasks
    const hasUnsavedInput = (taskInput && taskInput.value.trim().length > 0) || 
                            (taskDescInput && taskDescInput.value.trim().length > 0);
    if (window.hasUnsavedTasks !== undefined) {
      window.hasUnsavedTasks = hasUnsavedInput;
    }
  }

  // Save current tasks to appropriate localStorage key
  saveCurrentTasks() {
    const currentMode = this.getCurrentMode();
    const storageKey = currentMode === 'classic' ? this.CLASSIC_TASKS_KEY : this.REVERSE_TASKS_KEY;
    const currentTasks = TaskDialog.getCurrentTasks();
    
    localStorage.setItem(storageKey, JSON.stringify(currentTasks));
  }

  // Detect current mode based on page/body class
  getCurrentMode() {
    if (document.body.classList.contains('reverse-mode')) {
      return 'reverse';
    } else if (document.body.classList.contains('pomodoro-mode')) {
      return 'classic';
    }
    
    // Fallback: check current URL
    if (window.location.pathname.includes('reverse')) {
      return 'reverse';
    }
    
    return 'classic';
  }

  // Clear transfer data
  clearTransfer() {
    localStorage.removeItem(this.TRANSFER_KEY);
  }

  // Check if there's a pending transfer on page load
  checkForPendingTransfer() {
    const transferData = this.getPendingTransfer();
    if (!transferData) return false;

    const currentMode = this.getCurrentMode();
    
    // If we're in the target mode, show option to apply transfer
    if (transferData.targetMode === currentMode) {
      const message = `You have ${transferData.tasks.length} task(s) from ${transferData.sourceMode === 'classic' ? 'Classic' : 'Reverse'} Pomodoro. Would you like to add them here?`;
      
      window.taskDialog.showDialog({
        title: 'Tasks Available for Transfer',
        message: message,
        tasks: transferData.tasks,
        keepButtonText: 'Add Tasks',
        deleteButtonText: 'Ignore',
        cancelButtonText: 'Decide Later',
        onKeep: () => {
          this.applyTransfer(currentMode);
          window.showToast && window.showToast(`Successfully added ${transferData.tasks.length} task(s)!`);
        },
        onDelete: () => {
          this.clearTransfer();
          window.showToast && window.showToast('Transfer ignored.');
        },
        onCancel: () => {
          // Keep transfer for later
          window.showToast && window.showToast('You can transfer tasks later from the settings.');
        }
      });
      
      return true;
    }
    
    return false;
  }

  // Manual transfer method (can be called from settings or other UI)
  manualTransfer() {
    const currentMode = this.getCurrentMode();
    const currentTasks = TaskDialog.getCurrentTasks();
    const unsavedTasks = TaskDialog.getUnsavedTasks();
    const allTasks = [...currentTasks, ...unsavedTasks];

    if (allTasks.length === 0) {
      window.showToast && window.showToast('No tasks to transfer.');
      return;
    }

    const targetMode = currentMode === 'classic' ? 'reverse' : 'classic';
    const targetModeName = targetMode === 'classic' ? 'Classic Pomodoro' : 'Reverse Pomodoro';

    window.taskDialog.showDialog({
      title: 'Transfer Tasks',
      message: `Transfer ${allTasks.length} task(s) to ${targetModeName}?`,
      tasks: allTasks,
      keepButtonText: 'Transfer & Switch',
      deleteButtonText: 'Switch Without Tasks',
      cancelButtonText: 'Cancel',
      onKeep: () => {
        this.prepareTransfer(allTasks, currentMode);
        // Navigate to target mode
        const targetUrl = targetMode === 'classic' ? '/index.html' : '/reverse.html';
        window.location.href = targetUrl;
      },
      onDelete: () => {
        // Clear tasks and navigate
        const targetUrl = targetMode === 'classic' ? '/index.html' : '/reverse.html';
        window.location.href = targetUrl;
      },
      onCancel: () => {
        // Do nothing
      }
    });
  }
}

// Create global instance
window.taskTransfer = new TaskTransfer();

// Export class
window.TaskTransfer = TaskTransfer;