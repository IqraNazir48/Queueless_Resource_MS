// frontend/public/js/notifications.js
let notificationCheckInterval = null;
let currentNotifications = [];

function getToken() {
    return localStorage.getItem('token');
}

// Initialize notification system
function initNotificationSystem() {
    loadNotifications();
    updateNotificationBadge();
    
    // Check for new notifications every 30 seconds
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
    notificationCheckInterval = setInterval(() => {
        updateNotificationBadge();
    }, 30000);
}

// Load notifications
async function loadNotifications() {
    const token = getToken();
    if (!token) return;
    
    try {
        const response = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            currentNotifications = await response.json();
            displayNotifications();
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
    }
}

// Display notifications in dropdown
function displayNotifications() {
    const container = document.getElementById('notificationsList');
    if (!container) return;
    
    if (currentNotifications.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-bell-slash" style="font-size: 3rem; color: var(--text-muted);"></i>
                <p class="text-muted mt-2 mb-0">No notifications</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = currentNotifications.slice(0, 10).map(notif => {
        const isUnread = !notif.isReadByUser;
        const typeIcon = getNotificationIcon(notif.type);
        const typeColor = getNotificationColor(notif.type);
        const timeAgo = getTimeAgo(notif.createdAt);
        
        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" onclick="markNotificationAsRead('${notif._id}')">
                <div class="d-flex align-items-start">
                    <div class="notification-icon ${typeColor} me-3">
                        <i class="bi bi-${typeIcon}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${notif.title}</h6>
                        <p class="mb-1 text-muted" style="font-size: 0.9rem;">${notif.message}</p>
                        <small class="text-muted">${timeAgo}</small>
                    </div>
                    ${isUnread ? '<div class="unread-dot"></div>' : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Update notification badge
async function updateNotificationBadge() {
    const token = getToken();
    if (!token) return;
    
    try {
        const response = await fetch('/api/notifications/unread-count', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            const badge = document.getElementById('notificationBadge');
            
            if (badge) {
                if (data.unreadCount > 0) {
                    badge.textContent = data.unreadCount > 99 ? '99+' : data.unreadCount;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error('Error updating badge:', error);
    }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
    const token = getToken();
    if (!token) return;
    
    try {
        await fetch(`/api/notifications/${notificationId}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        loadNotifications();
    } catch (error) {
        console.error('Error marking notification:', error);
    }
}

// Mark all as read
async function markAllAsRead() {
    const token = getToken();
    if (!token) return;
    
    try {
        await fetch('/api/notifications/mark-all-read', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        loadNotifications();
    } catch (error) {
        console.error('Error marking all:', error);
    }
}

// Get notification icon
function getNotificationIcon(type) {
    switch(type) {
        case 'success': return 'check-circle-fill';
        case 'warning': return 'exclamation-triangle-fill';
        case 'danger': return 'x-circle-fill';
        default: return 'info-circle-fill';
    }
}

// Get notification color
function getNotificationColor(type) {
    switch(type) {
        case 'success': return 'text-success';
        case 'warning': return 'text-warning';
        case 'danger': return 'text-danger';
        default: return 'text-primary';
    }
}

// Get time ago
function getTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNotificationSystem);
} else {
    initNotificationSystem();
}

// Clean up interval on page unload
window.addEventListener('beforeunload', () => {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
});