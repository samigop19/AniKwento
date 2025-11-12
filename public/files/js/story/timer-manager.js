

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

    
    setTimeout(callback, delay = 0) {
        return new Promise((resolve) => {
            if (!this.workerReady || !this.worker) {
                
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

            
            resolve(id);
        });
    }

    
    setInterval(callback, delay) {
        if (!this.workerReady || !this.worker) {
            
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

    
    clearAll() {
        if (!this.workerReady || !this.worker) {
            console.warn('Cannot clear all timers - worker not available');
            return;
        }

        this.worker.postMessage({
            action: 'clearAll'
        });
    }

    
    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.workerReady = false;
            this.callbacks.clear();
            console.log('Timer Worker terminated');
        }
    }

    
    delay(ms) {
        return new Promise((resolve) => {
            this.setTimeout(resolve, ms);
        });
    }
}


window.timerManager = new TimerManager();


if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimerManager;
}

console.log('✅ Timer Manager loaded - Enhanced timing system ready');
