// Notification System for StoryDashboard
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }

    init() {
        // Create notification container if it doesn't exist
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
    }

    show(message, type = 'error', duration = 5000) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Trigger animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto-hide notification
        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }

        return notification;
    }

    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getIcon(type);
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-message">${message}</div>
                <button class="notification-close" onclick="notificationSystem.hide(this.closest('.notification'))">&times;</button>
            </div>
        `;

        return notification;
    }

    getIcon(type) {
        const icons = {
            error: '<i class="fas fa-exclamation-triangle"></i>',
            success: '<i class="fas fa-check-circle"></i>',
            warning: '<i class="fas fa-exclamation-circle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    hide(notification) {
        if (notification && notification.parentNode) {
            notification.classList.add('hiding');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                // Remove from array
                const index = this.notifications.indexOf(notification);
                if (index > -1) {
                    this.notifications.splice(index, 1);
                }
            }, 300);
        }
    }

    error(message, duration = 5000) {
        return this.show(message, 'error', duration);
    }

    success(message, duration = 4000) {
        return this.show(message, 'success', duration);
    }

    warning(message, duration = 4000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    clear() {
        this.notifications.forEach(notification => this.hide(notification));
        this.notifications = [];
    }
}

// Create global instance
const notificationSystem = new NotificationSystem();

// CSS Styles for notifications
const notificationStyles = `
.notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    pointer-events: none;
}

.notification {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    margin-bottom: 12px;
    max-width: 400px;
    min-width: 300px;
    opacity: 0;
    transform: translateX(100%) scale(0.8);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: auto;
    border-left: 4px solid #dc3545;
}

.notification.notification-success {
    border-left-color: #28a745;
}

.notification.notification-warning {
    border-left-color: #ffc107;
}

.notification.notification-info {
    border-left-color: #17a2b8;
}

.notification.show {
    opacity: 1;
    transform: translateX(0) scale(1);
}

.notification.hiding {
    opacity: 0;
    transform: translateX(100%) scale(0.8);
}

.notification-content {
    display: flex;
    align-items: center;
    padding: 16px;
    gap: 12px;
}

.notification-icon {
    color: #dc3545;
    font-size: 1.2rem;
    flex-shrink: 0;
}

.notification-success .notification-icon {
    color: #28a745;
}

.notification-warning .notification-icon {
    color: #ffc107;
}

.notification-info .notification-icon {
    color: #17a2b8;
}

.notification-message {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
    color: #333;
    font-weight: 500;
}

.notification-close {
    background: none;
    border: none;
    color: #999;
    cursor: pointer;
    font-size: 18px;
    font-weight: bold;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.notification-close:hover {
    background: rgba(0, 0, 0, 0.1);
    color: #666;
}

@media (max-width: 768px) {
    .notification-container {
        right: 10px;
        left: 10px;
        top: 10px;
    }
    
    .notification {
        max-width: none;
        min-width: auto;
    }
}
`;

// Inject styles
if (!document.getElementById('notification-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'notification-styles';
    styleSheet.textContent = notificationStyles;
    document.head.appendChild(styleSheet);
}