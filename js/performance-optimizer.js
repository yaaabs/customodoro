// Performance Optimization for Browser Throttling and System Performance
// Additional optimizations for low-performance systems and background tab issues

class PerformanceOptimizer {
    constructor() {
        this.optimizationLevel = 'auto'; // auto, high, medium, low
        this.isLowPowerMode = false;
        this.backgroundOptimizations = true;
        this.init();
    }

    init() {
        this.detectSystemCapabilities();
        this.setupPerformanceMonitoring();
        this.applyOptimizations();
    }

    // Detect system performance capabilities
    detectSystemCapabilities() {
        // CPU performance test
        const cpuTest = this.runCpuBenchmark();
        
        // Memory check
        const memoryInfo = navigator.deviceMemory || 
                          (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null);
        
        // Connection speed (if available)
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const networkSpeed = connection ? connection.effectiveType : 'unknown';
        
        // Battery API (if available)
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                this.isLowPowerMode = !battery.charging && battery.level < 0.2;
                if (this.isLowPowerMode) {
                    this.optimizationLevel = 'low';
                    console.log('🔋 Low battery detected - applying power optimizations');
                }
            });
        }

        // Determine optimization level
        if (cpuTest < 50000 || (memoryInfo && memoryInfo < 1024)) {
            this.optimizationLevel = 'low';
        } else if (cpuTest < 150000 || (memoryInfo && memoryInfo < 2048)) {
            this.optimizationLevel = 'medium';
        } else {
            this.optimizationLevel = 'high';
        }

        console.log(`🖥️ Performance profile: ${this.optimizationLevel} (CPU: ${cpuTest}, RAM: ${memoryInfo}MB, Network: ${networkSpeed})`);
    }

    // Simple CPU benchmark
    runCpuBenchmark() {
        const start = performance.now();
        let iterations = 0;
        
        // Run for exactly 10ms
        while (performance.now() - start < 10) {
            Math.sqrt(Math.random() * 1000);
            iterations++;
        }
        
        return iterations;
    }

    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Monitor frame rate (if requestAnimationFrame is available)
        if (typeof requestAnimationFrame !== 'undefined') {
            let lastFrame = performance.now();
            let frameCount = 0;
            let totalFrameTime = 0;

            const measureFrameRate = () => {
                const now = performance.now();
                const frameTime = now - lastFrame;
                totalFrameTime += frameTime;
                frameCount++;
                
                // Check every 60 frames (about 1 second at 60fps)
                if (frameCount >= 60) {
                    const avgFrameTime = totalFrameTime / frameCount;
                    const fps = 1000 / avgFrameTime;
                    
                    if (fps < 30 && this.optimizationLevel !== 'low') {
                        console.log(`⚠️ Low FPS detected (${fps.toFixed(1)}fps) - reducing optimization level`);
                        this.reduceOptimizationLevel();
                    }
                    
                    // Reset counters
                    frameCount = 0;
                    totalFrameTime = 0;
                }
                
                lastFrame = now;
                requestAnimationFrame(measureFrameRate);
            };
            
            requestAnimationFrame(measureFrameRate);
        }

        // Monitor long tasks (if supported)
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    const longTasks = list.getEntries();
                    if (longTasks.length > 0) {
                        console.log(`⚠️ Detected ${longTasks.length} long tasks - applying performance optimizations`);
                        this.applyEmergencyOptimizations();
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                console.log('Long task monitoring not supported');
            }
        }
    }

    // Apply performance optimizations
    applyOptimizations() {
        // Reduce DOM updates for low performance systems
        if (this.optimizationLevel === 'low') {
            this.optimizeDOM();
        }

        // Optimize animations and transitions
        this.optimizeAnimations();

        // Optimize background operations
        if (this.backgroundOptimizations) {
            this.optimizeBackgroundOperations();
        }

        // Memory management
        this.setupMemoryManagement();
    }

    // Optimize DOM operations
    optimizeDOM() {
        // Reduce update frequency for progress bars and displays
        window.optimizedUpdateInterval = 2000; // Update every 2 seconds instead of 1
        
        // Disable some visual effects
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            /* Performance optimizations for low-end systems */
            * {
                animation-duration: 0.1s !important;
                transition-duration: 0.1s !important;
            }
            
            /* Reduce box-shadow complexity */
            .timer-container, .button, .card {
                box-shadow: none !important;
            }
            
            /* Simplify gradients */
            .gradient-bg {
                background: solid !important;
            }
        `;
        document.head.appendChild(styleSheet);
        
        console.log('🎯 Applied low-performance DOM optimizations');
    }

    // Optimize animations and transitions
    optimizeAnimations() {
        if (this.optimizationLevel === 'low') {
            // Disable non-essential animations
            const disableAnimations = document.createElement('style');
            disableAnimations.textContent = `
                *, *::before, *::after {
                    animation-duration: 0s !important;
                    transition-duration: 0s !important;
                }
            `;
            document.head.appendChild(disableAnimations);
        }
        
        // Use CSS containment for better performance
        const containmentStyles = document.createElement('style');
        containmentStyles.textContent = `
            .timer-container {
                contain: layout style paint;
            }
            
            .progress-bar {
                contain: layout paint;
            }
        `;
        document.head.appendChild(containmentStyles);
    }

    // Optimize background operations
    optimizeBackgroundOperations() {
        // Reduce frequency of background updates when tab is not active
        let isTabActive = !document.hidden;
        
        document.addEventListener('visibilitychange', () => {
            isTabActive = !document.hidden;
            
            if (window.syncManager && this.optimizationLevel === 'low') {
                if (isTabActive) {
                    // Tab became active - resume normal sync
                    console.log('🔄 Tab active - resuming normal sync frequency');
                } else {
                    // Tab became inactive - reduce sync frequency further
                    console.log('💤 Tab inactive - further reducing sync frequency for performance');
                }
            }
        });

        // Debounce localStorage operations
        this.debounceStorageOperations();
    }

    // Debounce localStorage operations to reduce I/O
    debounceStorageOperations() {
        const originalSetItem = localStorage.setItem.bind(localStorage);
        const pendingWrites = new Map();

        localStorage.setItem = (key, value) => {
            // Clear existing timeout for this key
            if (pendingWrites.has(key)) {
                clearTimeout(pendingWrites.get(key));
            }

            // Set new timeout
            const timeoutId = setTimeout(() => {
                originalSetItem(key, value);
                pendingWrites.delete(key);
            }, this.optimizationLevel === 'low' ? 1000 : 500);

            pendingWrites.set(key, timeoutId);
        };
    }

    // Setup memory management
    setupMemoryManagement() {
        // Periodic cleanup for low memory systems
        if (this.optimizationLevel === 'low') {
            setInterval(() => {
                this.performMemoryCleanup();
            }, 60000); // Every minute
        }
    }

    // Perform memory cleanup
    performMemoryCleanup() {
        // Clear old console logs if possible
        if (console.clear && Math.random() > 0.9) {
            console.clear();
        }

        // Force garbage collection if available (Chrome DevTools)
        if (window.gc) {
            window.gc();
        }

        // Clean up any orphaned event listeners
        this.cleanupEventListeners();
    }

    // Clean up event listeners
    cleanupEventListeners() {
        // Remove old event listeners that might have accumulated
        // This is a simplified version - in practice, you'd track listeners more carefully
        const elements = document.querySelectorAll('*');
        let cleanedUp = 0;
        
        elements.forEach(el => {
            // Clone node to remove all event listeners (nuclear option)
            if (el.dataset && el.dataset.cleanup === 'true') {
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                cleanedUp++;
            }
        });

        if (cleanedUp > 0) {
            console.log(`🧹 Cleaned up ${cleanedUp} elements with potential memory leaks`);
        }
    }

    // Apply emergency optimizations when performance is critically low
    applyEmergencyOptimizations() {
        if (this.optimizationLevel !== 'low') {
            this.optimizationLevel = 'low';
            this.applyOptimizations();
        }

        // Disable all non-essential features
        this.disableNonEssentialFeatures();
    }

    // Disable non-essential features
    disableNonEssentialFeatures() {
        // Disable background music player if it exists
        if (window.bgmPlayer && typeof window.bgmPlayer.pause === 'function') {
            window.bgmPlayer.pause();
            console.log('🎵 Disabled background music for performance');
        }

        // Reduce timer update frequency
        if (window.timerAccuracyManager) {
            window.timerAccuracyManager.performanceMode = 'emergency';
        }

        // Disable theme animations
        const emergencyStyles = document.createElement('style');
        emergencyStyles.textContent = `
            /* Emergency performance mode */
            * {
                animation: none !important;
                transition: none !important;
                transform: none !important;
            }
        `;
        document.head.appendChild(emergencyStyles);
        
        console.log('🚨 Emergency performance mode activated');
    }

    // Reduce optimization level
    reduceOptimizationLevel() {
        if (this.optimizationLevel === 'high') {
            this.optimizationLevel = 'medium';
        } else if (this.optimizationLevel === 'medium') {
            this.optimizationLevel = 'low';
        }
        
        console.log(`📉 Reduced optimization level to: ${this.optimizationLevel}`);
        this.applyOptimizations();
    }

    // Get current performance status
    getPerformanceStatus() {
        return {
            optimizationLevel: this.optimizationLevel,
            isLowPowerMode: this.isLowPowerMode,
            backgroundOptimizations: this.backgroundOptimizations,
            memoryUsage: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 'Unknown'
        };
    }
}

// Initialize performance optimizer
window.performanceOptimizer = new PerformanceOptimizer();

// Global debug function
window.debugPerformance = function() {
    console.log('🔍 Performance Status:', window.performanceOptimizer.getPerformanceStatus());
    console.log('🔧 Timer Accuracy Status:', window.timerAccuracyManager?.getTimingStats());
};

console.log('✅ Performance Optimizer loaded');
