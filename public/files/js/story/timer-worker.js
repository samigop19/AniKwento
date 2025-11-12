

let timers = new Map();
let nextTimerId = 1;

self.onmessage = function(e) {
    const { action, id, delay } = e.data;

    switch (action) {
        case 'setTimeout':
            const timerId = id || nextTimerId++;
            const timeoutId = setTimeout(() => {
                self.postMessage({ type: 'timeout', id: timerId });
                timers.delete(timerId);
            }, delay);
            timers.set(timerId, { type: 'timeout', timeoutId });
            self.postMessage({ type: 'timerCreated', id: timerId });
            break;

        case 'clearTimeout':
            if (timers.has(id)) {
                const timer = timers.get(id);
                clearTimeout(timer.timeoutId);
                timers.delete(id);
            }
            break;

        case 'setInterval':
            const intervalId = id || nextTimerId++;
            const intervalTimeoutId = setInterval(() => {
                self.postMessage({ type: 'interval', id: intervalId });
            }, delay);
            timers.set(intervalId, { type: 'interval', timeoutId: intervalTimeoutId });
            self.postMessage({ type: 'intervalCreated', id: intervalId });
            break;

        case 'clearInterval':
            if (timers.has(id)) {
                const timer = timers.get(id);
                clearInterval(timer.timeoutId);
                timers.delete(id);
            }
            break;

        case 'clearAll':
            timers.forEach((timer) => {
                if (timer.type === 'timeout') {
                    clearTimeout(timer.timeoutId);
                } else {
                    clearInterval(timer.timeoutId);
                }
            });
            timers.clear();
            self.postMessage({ type: 'allCleared' });
            break;

        default:
            console.error('Unknown action:', action);
    }
};

console.log('Timer Worker initialized and ready');
