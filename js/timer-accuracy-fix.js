// Timer Accuracy Fix for Browser Throttling Issues
// Addresses background tab throttling and system performance problems

class TimerAccuracyManager {
    constructor() {
        this.isTabActive = true;
        this.lastTickTime = Date.now();
        this.expectedTickTime = Date.now();
        this.missedTicks = 0;
        this.performanceMode = 'high'; // high, medium, low
        this.throttleDetected = false;
        this.compensationBuffer = [];
        
        this.setupVisibilityHandlers();
        this.detectPerformanceCapabilities();
    }

    // Detect if browser is throttling timers
    setupVisibilityHandlers() {
        // Page Visibility API
        document.addEventListener('visibilitychange', () => {
            this.isTabActive = !document.hidden;
            if (this.isTabActive) {
                this.handleTabReactivation();
            }
            console.log(`Tab ${this.isTabActive ? 'active' : 'inactive'} - throttle compensation ${this.isTabActive ? 'enabled' : 'prepared'}`);
        });

        // Fallback for older browsers
        window.addEventListener('focus', () => {
            this.isTabActive = true;
            this.handleTabReactivation();
        });
        
        window.addEventListener('blur', () => {
            this.isTabActive = false;
        });
    }

    // Handle tab reactivation and compensate for missed time
    handleTabReactivation() {
        if (window.isRunning && typeof window.currentSeconds !== 'undefined') {
            const now = Date.now();
            const timeDiff = now - this.lastTickTime;
            
            // If more than 2 seconds have passed, we likely missed ticks due to throttling
            if (timeDiff > 2000) {
                const missedSeconds = Math.floor(timeDiff / 1000);
                this.throttleDetected = true;
                
                console.log(`🔧 Throttle detected: ${missedSeconds}s missed during background`);
                
                // Compensate by adjusting current time
                if (window.currentSeconds > missedSeconds) {
                    window.currentSeconds -= (missedSeconds - 1); // -1 because next tick will subtract 1
                    if (typeof window.updateTimerDisplay === 'function') {
                        window.updateTimerDisplay();
                    }
                    console.log(`✅ Compensated for ${missedSeconds}s of missed time`);
                }
            }
        }
    }

    // Detect system performance capabilities
    detectPerformanceCapabilities() {
        // Simple performance test
        const testStart = performance.now();
        let iterations = 0;
        
        // Run a quick computation test
        while (performance.now() - testStart < 10) {
            Math.random() * Math.random();
            iterations++;
        }
        
        // Classify performance
        if (iterations > 100000) {
            this.performanceMode = 'high';
        } else if (iterations > 50000) {
            this.performanceMode = 'medium';
        } else {
            this.performanceMode = 'low';
        }
        
        console.log(`🖥️ Detected ${this.performanceMode} performance system (${iterations} iterations)`);
    }

    // Enhanced timer with throttle compensation
    createRobustTimer(callback, interval = 1000) {
        this.expectedTickTime = Date.now() + interval;
        this.lastTickTime = Date.now();
        let animationFrameId = null;
        
        const timerLoop = () => {
            const now = Date.now();
            const drift = now - this.expectedTickTime;
            
            // Track timing accuracy
            this.compensationBuffer.push(drift);
            if (this.compensationBuffer.length > 10) {
                this.compensationBuffer.shift();
            }
            
            // Execute callback
            callback();
            
            // Update timing
            this.lastTickTime = now;
            this.expectedTickTime += interval;
            
            // Adaptive delay compensation based on performance and drift
            let nextDelay = interval - drift;
            
            // Performance-based adjustments
            if (this.performanceMode === 'low') {
                nextDelay += 50; // Extra buffer for slow systems
            } else if (!this.isTabActive) {
                nextDelay = Math.min(nextDelay, 100); // Clamp delay when backgrounded
            }
            
            // Ensure positive delay
            nextDelay = Math.max(nextDelay, 0);
            
            // Use requestAnimationFrame for smoother timing when tab is active
            const scheduleNextTick = () => {
                if (this.isTabActive && this.performanceMode === 'high') {
                    // Use requestAnimationFrame for better timing when active
                    animationFrameId = requestAnimationFrame(() => {
                        setTimeout(timerLoop, Math.max(0, nextDelay - 16)); // Account for ~16ms RAF delay
                    });
                } else {
                    // Use regular setTimeout for background or low-performance modes
                    return setTimeout(timerLoop, nextDelay);
                }
            };
            
            return scheduleNextTick();
        };
        
        // Store references for cleanup
        const timerObj = setTimeout(timerLoop, interval);
        timerObj.animationFrameId = animationFrameId;
        return timerObj;
    }

    // Web Workers fallback for extreme throttling (if supported)
    createWorkerTimer(callback, interval = 1000) {
        if (typeof Worker === 'undefined') {
            console.log('⚠️ Web Workers not supported, using standard timer');
            return this.createRobustTimer(callback, interval);
        }

        try {
            // Create inline worker for timer
            const workerCode = `
                let intervalId;
                
                self.addEventListener('message', function(e) {
                    if (e.data.action === 'start') {
                        intervalId = setInterval(() => {
                            self.postMessage({ type: 'tick', timestamp: Date.now() });
                        }, e.data.interval);
                    } else if (e.data.action === 'stop') {
                        clearInterval(intervalId);
                    }
                });
            `;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));
            
            worker.addEventListener('message', (e) => {
                if (e.data.type === 'tick') {
                    callback();
                }
            });
            
            worker.postMessage({ action: 'start', interval: interval });
            
            console.log('🔧 Using Web Worker timer for maximum accuracy');
            
            return {
                worker: worker,
                stop: () => {
                    worker.postMessage({ action: 'stop' });
                    worker.terminate();
                }
            };
            
        } catch (error) {
            console.log('⚠️ Web Worker timer failed, falling back to robust timer:', error);
            return this.createRobustTimer(callback, interval);
        }
    }

    // Request high-performance timer (when possible)
    requestHighPerformance() {
        // Request animation frame for smoother timing
        if (this.performanceMode === 'high' && this.isTabActive) {
            return requestAnimationFrame.bind(window);
        }
        return null;
    }

    // Get current timing stats
    getTimingStats() {
        const avgDrift = this.compensationBuffer.length > 0 
            ? this.compensationBuffer.reduce((a, b) => a + b, 0) / this.compensationBuffer.length 
            : 0;
        
        return {
            performanceMode: this.performanceMode,
            isTabActive: this.isTabActive,
            throttleDetected: this.throttleDetected,
            averageDrift: Math.round(avgDrift),
            missedTicks: this.missedTicks
        };
    }
}

// Initialize global timer accuracy manager
window.timerAccuracyManager = new TimerAccuracyManager();

// Enhanced timer creation function for main app
window.createAccurateTimer = function(callback, interval = 1000) {
    const accuracyManager = window.timerAccuracyManager;
    
    // Choose timer type based on performance and browser capabilities
    if (accuracyManager.performanceMode === 'low' || accuracyManager.throttleDetected) {
        console.log('🔧 Using Web Worker timer due to performance/throttling issues');
        return accuracyManager.createWorkerTimer(callback, interval);
    } else {
        console.log('🔧 Using robust timer with drift compensation');
        return accuracyManager.createRobustTimer(callback, interval);
    }
};

// Debug function for testing
window.debugTimerAccuracy = function() {
    console.log('🔍 Timer Accuracy Debug Info:');
    console.log(window.timerAccuracyManager.getTimingStats());
    
    // Test timer accuracy
    let testTicks = 0;
    const testStart = Date.now();
    
    const testTimer = window.createAccurateTimer(() => {
        testTicks++;
        if (testTicks >= 5) {
            clearInterval(testTimer);
            const actualDuration = Date.now() - testStart;
            const expectedDuration = 5000;
            const accuracy = ((expectedDuration / actualDuration) * 100).toFixed(1);
            
            console.log(`⏱️ Timer accuracy test: ${accuracy}% (${actualDuration}ms for 5 ticks)`);
        }
    }, 1000);
};

console.log('✅ Timer Accuracy Manager loaded');
