// Get token
function getToken() {
    return localStorage.getItem('token');
}

// Load admin dashboard
async function loadDashboard() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    try {
        // Load all bookings
        const bookingsResponse = await fetch('/api/bookings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (bookingsResponse.status === 401 || bookingsResponse.status === 403) {
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
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = bookings.filter(b => b.date === today).length;
        
        document.getElementById('totalResources').textContent = resources.length;
        document.getElementById('activeBookings').textContent = activeBookings;
        document.getElementById('todayBookings').textContent = todayBookings;
        document.getElementById('cancelledBookings').textContent = cancelledBookings;
        
        // Resources by type
        const laundry = resources.filter(r => r.type === 'laundry').length;
        const study = resources.filter(r => r.type === 'study_room').length;
        const sports = resources.filter(r => r.type === 'sports').length;
        
        document.getElementById('laundryCount').textContent = laundry;
        document.getElementById('studyCount').textContent = study;
        document.getElementById('sportsCount').textContent = sports;
        
        // Display recent activity
        displayRecentActivity(bookings.slice(0, 10), resources);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Display recent activity
function displayRecentActivity(bookings, resources) {
    const loadingDiv = document.getElementById('loadingActivity');
    const activityDiv = document.getElementById('recentActivity');
    const tbody = document.getElementById('activityTableBody');
    
    loadingDiv.style.display = 'none';
    activityDiv.style.display = 'block';
    tbody.innerHTML = '';
    
    if (bookings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No recent activity</td></tr>';
        return;
    }
    
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
                    ${resourceName}
                </td>
                <td>${formatDate(booking.date)}</td>
                <td><span class="badge badge-primary">${booking.slot}</span></td>
                <td>${statusBadge}</td>
                <td>${formatDateTime(booking.createdAt)}</td>
            </tr>
        `;
        
        tbody.innerHTML += row;
    });
}

// Get resource icon
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

// Format datetime
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}

// Add resource handler
if (document.getElementById('saveResourceBtn')) {
    document.getElementById('saveResourceBtn').addEventListener('click', async function() {
        const name = document.getElementById('resourceName').value;
        const type = document.getElementById('resourceType').value;
        const location = document.getElementById('resourceLocation').value;
        
        if (!name || !type || !location) {
            alert('Please fill all fields');
            return;
        }
        
        const btn = this;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';
        
        const token = getToken();
        
        try {
            const response = await fetch('/api/resources', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, type, location })
            });
            
            if (response.ok) {
                bootstrap.Modal.getInstance(document.getElementById('addResourceModal')).hide();
                document.getElementById('addResourceForm').reset();
                loadDashboard();
                alert('Resource added successfully!');
            } else {
                const data = await response.json();
                alert(data.message || 'Failed to add resource');
            }
        } catch (error) {
            console.error('Error adding resource:', error);
            alert('Network error. Please try again.');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-check-circle"></i> Add Resource';
        }
    });
}

// Load dashboard on page load
if (document.getElementById('totalResources')) {
    loadDashboard();
}