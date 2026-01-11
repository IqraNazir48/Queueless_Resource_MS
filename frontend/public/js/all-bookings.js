// frontend/public/js/all-bookings.js

let allBookings = [];
let allResources = [];
let filteredBookings = [];
let currentFilter = 'all';
let searchQuery = '';
let bookingToCancel = null;

function getToken() {
    return localStorage.getItem('token');
}

function showMessage(message, type = 'info') {
    const container = document.getElementById('messageContainer');
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function isPastBooking(date, slot) {
    const now = new Date();
    const todayStr = now.getFullYear() + '-' + 
                     String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(now.getDate()).padStart(2, '0');
    
    if (date < todayStr) {
        return true;
    }
    
    if (date > todayStr) {
        return false;
    }
    
    if (date === todayStr) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        const slotEnd = slot.split('-')[1];
        const [endHour, endMinute] = slotEnd.split(':').map(Number);
        const slotEndMinutes = endHour * 60 + endMinute;
        
        if (currentTimeMinutes >= slotEndMinutes) {
            return true;
        }
    }
    
    return false;
}

async function loadBookings() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    document.getElementById('loadingBookings').style.display = 'block';
    document.getElementById('bookingsContainer').style.display = 'none';
    document.getElementById('noBookings').style.display = 'none';
    
    try {
        const bookingsResponse = await fetch('/api/bookings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (bookingsResponse.status === 401 || bookingsResponse.status === 403) {
            window.location.href = '/login';
            return;
        }
        
        allBookings = await bookingsResponse.json();
        
        const resourcesResponse = await fetch('/api/resources', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        allResources = await resourcesResponse.json();
        
        applyFilters();
        displayBookings();
        
    } catch (error) {
        console.error('Error loading bookings:', error);
        showMessage('Error loading bookings: ' + error.message, 'danger');
    }
}

function applyFilters() {
    filteredBookings = allBookings;
    
    if (currentFilter !== 'all') {
        filteredBookings = filteredBookings.filter(b => b.status === currentFilter);
    }
    
    if (searchQuery) {
        filteredBookings = filteredBookings.filter(b => {
            let resourceName = '';
            
            if (b.resourceId) {
                if (typeof b.resourceId === 'object' && b.resourceId.name) {
                    resourceName = b.resourceId.name.toLowerCase();
                } else {
                    const resource = allResources.find(r => r._id === b.resourceId);
                    resourceName = resource ? resource.name.toLowerCase() : '';
                }
            }
            
            return resourceName.includes(searchQuery.toLowerCase());
        });
    }
}

function displayBookings() {
    const loadingDiv = document.getElementById('loadingBookings');
    const containerDiv = document.getElementById('bookingsContainer');
    const noBookingsDiv = document.getElementById('noBookings');
    const tbody = document.getElementById('bookingsTableBody');
    
    loadingDiv.style.display = 'none';
    
    document.getElementById('totalCount').textContent = allBookings.length;
    document.getElementById('showingCount').textContent = filteredBookings.length;
    
    if (filteredBookings.length === 0) {
        noBookingsDiv.style.display = 'block';
        containerDiv.style.display = 'none';
        return;
    }
    
    noBookingsDiv.style.display = 'none';
    containerDiv.style.display = 'block';
    tbody.innerHTML = '';
    
    filteredBookings.forEach(booking => {
        let resourceName = 'Unknown';
        let location = '-';
        let resourceType = 'unknown';
        
        if (booking.resourceId) {
            if (typeof booking.resourceId === 'object' && booking.resourceId._id) {
                resourceName = booking.resourceId.name || 'Unknown';
                location = booking.resourceId.location || '-';
                resourceType = booking.resourceId.type || 'unknown';
            } else {
                const resource = allResources.find(r => r._id === booking.resourceId);
                if (resource) {
                    resourceName = resource.name;
                    location = resource.location;
                    resourceType = resource.type;
                }
            }
        }
        
        const icon = getResourceIcon(resourceType);
        
        const isPast = booking.isPast || isPastBooking(booking.date, booking.slot);
        
        let statusBadge;
        if (booking.status === 'cancelled') {
            statusBadge = '<span class="badge badge-danger">Cancelled</span>';
        } else if (isPast) {
            statusBadge = '<span class="badge badge-secondary">Completed</span>';
        } else {
            statusBadge = '<span class="badge badge-success">Active</span>';
        }
        
        const canCancel = booking.status === 'active' && !isPast;
        const cancelBtn = canCancel
            ? `<button class="btn btn-sm btn-danger" onclick='showCancelModal("${booking._id}", "${resourceName}", "${booking.date}", "${booking.slot}")'>
                <i class="bi bi-x-circle"></i> Cancel
               </button>`
            : '<span class="text-muted">-</span>';
        
        const rowStyle = isPast ? 'style="opacity: 0.5;"' : '';
        
        const row = `
            <tr ${rowStyle}>
                <td>
                    <i class="bi bi-${icon}"></i>
                    <strong>${resourceName}</strong>
                </td>
                <td>${location}</td>
                <td>${formatDate(booking.date)}</td>
                <td><span class="badge badge-primary">${booking.slot}</span></td>
                <td>${statusBadge}</td>
                <td>${formatDateTime(booking.createdAt)}</td>
                <td>${cancelBtn}</td>
            </tr>
        `;
        
        tbody.innerHTML += row;
    });
}

function getResourceIcon(type) {
    switch(type) {
        case 'laundry': return 'droplet-fill';
        case 'study_room': return 'book-fill';
        case 'sports': return 'trophy-fill';
        default: return 'grid-fill';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}

function showCancelModal(bookingId, resourceName, date, slot) {
    bookingToCancel = bookingId;
    const detailsDiv = document.getElementById('cancelBookingDetails');
    detailsDiv.innerHTML = `
        <div class="alert alert-info">
            <strong>Resource:</strong> ${resourceName}<br>
            <strong>Date:</strong> ${formatDate(date)}<br>
            <strong>Time:</strong> ${slot}
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('cancelModal'));
    modal.show();
}

document.getElementById('confirmCancelBtn').addEventListener('click', async function() {
    if (!bookingToCancel) return;
    
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Cancelling...';
    
    const token = getToken();
    
    try {
        const response = await fetch(`/api/bookings/admin/cancel/${bookingToCancel}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Booking cancelled successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('cancelModal')).hide();
            loadBookings();
        } else {
            showMessage(data.message || 'Failed to cancel booking', 'danger');
        }
    } catch (error) {
        console.error('Cancel error:', error);
        showMessage('Network error. Please try again.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Yes, Cancel Booking';
    }
});

document.querySelectorAll('input[name="statusFilter"]').forEach(radio => {
    radio.addEventListener('change', function() {
        currentFilter = this.value;
        applyFilters();
        displayBookings();
    });
});

document.getElementById('searchInput').addEventListener('input', function() {
    searchQuery = this.value;
    applyFilters();
    displayBookings();
});

loadBookings();