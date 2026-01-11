// frontend/public/js/dashboard.js

// Get token from localStorage
function getToken() {
    return localStorage.getItem('token');
}

// Load dashboard data
async function loadDashboard() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    try {
        // Load bookings
        const bookingsResponse = await fetch('/api/bookings/my', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (bookingsResponse.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
        }
        
        const bookings = await bookingsResponse.json();
        
        // Load resources
        const resourcesResponse = await fetch('/api/resources', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const resources = await resourcesResponse.json();
        
        // Update stats
        const activeBookings = bookings.filter(b => b.status === 'active').length;
        document.getElementById('activeBookings').textContent = activeBookings;
        document.getElementById('totalBookings').textContent = bookings.length;
        document.getElementById('availableResources').textContent = resources.length;
        
        // Display recent bookings
        displayRecentBookings(bookings.slice(0, 5), resources);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Display recent bookings
function displayRecentBookings(bookings, resources) {
    const loadingDiv = document.getElementById('loadingBookings');
    const bookingsDiv = document.getElementById('recentBookings');
    const noBookingsDiv = document.getElementById('noBookings');
    const tbody = document.getElementById('bookingsTableBody');
    
    loadingDiv.classList.add('d-none');
    
    if (bookings.length === 0) {
        noBookingsDiv.classList.remove('d-none');
        return;
    }
    
    bookingsDiv.classList.remove('d-none');
    tbody.innerHTML = '';
    
    bookings.forEach(booking => {
        // Handle both populated and non-populated resourceId
        let resourceName = 'Unknown';
        let resourceType = 'unknown';
        
        if (booking.resourceId) {
            if (typeof booking.resourceId === 'object' && booking.resourceId._id) {
                // resourceId is populated
                resourceName = booking.resourceId.name || 'Unknown';
                resourceType = booking.resourceId.type || 'unknown';
            } else {
                // resourceId is just an ID string, find in resources array
                const resource = resources.find(r => r._id === booking.resourceId);
                if (resource) {
                    resourceName = resource.name;
                    resourceType = resource.type;
                }
            }
        }
        
        const statusBadge = booking.status === 'active' 
            ? '<span class="badge badge-success">Active</span>'
            : '<span class="badge badge-danger">Cancelled</span>';
        
        const row = `
            <tr>
                <td>
                    <i class="bi bi-${getResourceIcon(resourceType)}"></i>
                    <strong>${resourceName}</strong>
                </td>
                <td>${formatDate(booking.date)}</td>
                <td><span class="badge badge-primary">${booking.slot}</span></td>
                <td>${statusBadge}</td>
            </tr>
        `;
        
        tbody.innerHTML += row;
    });
}

// Get resource icon based on type
function getResourceIcon(type) {
    switch(type) {
        case 'laundry': return 'droplet-fill';
        case 'study_room': return 'book-fill';
        case 'sports': return 'trophy-fill';
        default: return 'grid-fill';
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Load dashboard on page load
if (document.getElementById('statsRow')) {
    loadDashboard();
}