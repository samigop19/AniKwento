/**
 * Timer Manager - Drop-in replacement for setTimeout/setInterval that uses Web Worker
 * Prevents browser tab throttling by using a dedicated Web Worker for timing
 */

class TimerManager {
    constructor() {
        this.worker = null;
        this.callbacks = new Map();
        this.nextCallbackId = 1;
        this.workerReady = false;
        this.pendingTimers = [];
        this.initWorker();
    }

    initWorker() {
        try {
            // Create worker from the timer-worker.js file
            const workerPath = '/AniKwento/public/files/js/story/timer-worker.js';
            this.worker = new Worker(workerPath);

            this.worker.onmessage = (e) => {
                const { type, id } = e.data;

                switch (type) {
                    case 'timeout':
                    case 'interval':
                        if (this.callbacks.has(id)) {
                            const callback = this.callbacks.get(id);
                            if (type === 'timeout') {
                                this.callbacks.delete(id);
                            }
                            callback();
                        }
                        break;

                    case 'timerCreated':
                    case 'intervalCreated':
                        // Timer successfully created in worker
                        break;

                    case 'allCleared':
                        this.callbacks.clear();
                        break;
                }
            };

            this.worker.onerror = (error) => {
                console.error('Timer Worker error:', error);
                this.fallbackToNativeTimers();
            };

            this.workerReady = true;
            console.log('✅ Timer Manager initialized with Web Worker (tab throttling prevention active)');

            // Process any pending timers that were queued before worker was ready
            this.processPendingTimers();

        } catch (error) {
            console.warn('Failed to initialize Timer Worker, falling back to native timers:', error);
            this.fallbackToNativeTimers();
        }
    }

    processPendingTimers() {
        while (this.pendingTimers.length > 0) {
            const { callback, delay, resolve } = this.pendingTimers.shift();
            this.setTimeout(callback, delay).then(resolve);
        }
    }

    fallbackToNativeTimers() {
        this.workerReady = false;
        this.worker = null;
        console.warn('⚠️ Using native setTimeout/setInterval (may be throttled in background tabs)');
    }

    /**
     * Worker-based setTimeout - Returns a Promise that resolves after delay
     * @param {Function} callback - Function to execute after delay
     * @param {number} delay - Delay in milliseconds
     * @returns {Promise<number>} - Promise that resolves with timer ID
     */
    setTimeout(callback, delay = 0) {
        return new Promise((resolve) => {
            if (!this.workerReady || !this.worker) {
                // Fallback to native setTimeout
                const nativeId = window.setTimeout(() => {
                    callback();
                    resolve(nativeId);
                }, delay);
                return;
            }

            const id = this.nextCallbackId++;
            this.callbacks.set(id, callback);

            this.worker.postMessage({
                action: 'setTimeout',
                id: id,
                delay: delay
            });

            // Resolve with the ID so it can be used for clearing if needed
            resolve(id);
        });
    }

    /**
     * Worker-based setInterval
     * @param {Function} callback - Function to execute at each interval
     * @param {number} delay - Interval delay in milliseconds
     * @returns {number} - Interval ID
     */
    setInterval(callback, delay) {
        if (!this.workerReady || !this.worker) {
            // Fallback to native setInterval
            return window.setInterval(callback, delay);
        }

        const id = this.nextCallbackId++;
        this.callbacks.set(id, callback);

        this.worker.postMessage({
            action: 'setInterval',
            id: id,
            delay: delay
        });

        return id;
    }

    /**
     * Clear a worker-based timeout
     * @param {number} id - Timer ID to clear
     */
    clearTimeout(id) {
        if (!this.workerReady || !this.worker) {
            window.clearTimeout(id);
            return;
        }

        this.callbacks.delete(id);
        this.worker.postMessage({
            action: 'clearTimeout',
            id: id
        });
    }

    /**
     * Clear a worker-based interval
     * @param {number} id - Interval ID to clear
     */
    clearInterval(id) {
        if (!this.workerReady || !this.worker) {
            window.clearInterval(id);
            return;
        }

        this.callbacks.delete(id);
        this.worker.postMessage({
            action: 'clearInterval',
            id: id
        });
    }

    /**
     * Clear all timers
     */
    clearAll() {
        if (!this.workerReady || !this.worker) {
            console.warn('Cannot clear all timers - worker not available');
            return;
        }

        this.worker.postMessage({
            action: 'clearAll'
        });
    }

    /**
     * Terminate the worker (cleanup)
     */
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.workerReady = false;
            this.callbacks.clear();
            console.log('Timer Worker terminated');
        }
    }

    /**
     * Utility method to create a Promise-based delay
     * @param {number} ms - Delay in milliseconds
     * @returns {Promise} - Promise that resolves after delay
     */
    delay(ms) {
        return new Promise((resolve) => {
            this.setTimeout(resolve, ms);
        });
    }
}

// Create global instance
window.timerManager = new TimerManager();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimerManager;
}

console.log('✅ Timer Manager loaded - Enhanced timing system ready');
