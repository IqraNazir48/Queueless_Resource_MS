// frontend/public/js/settings.js

let settings = null;

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

async function loadSettings() {
    const token = getToken();
    
    try {
        const response = await fetch('/api/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        settings = await response.json();
        displayResourceTypes();
        displayTimeSlots();
        displayBookingLimits();
    } catch (error) {
        showMessage('Error loading settings', 'danger');
    }
}

function displayResourceTypes() {
    const container = document.getElementById('resourceTypesList');
    container.innerHTML = '';
    
    settings.resourceTypes.forEach(rt => {
        const item = `
            <div class="d-flex justify-content-between align-items-center mb-2 p-3 border rounded">
                <div>
                    <i class="bi bi-${rt.icon}"></i>
                    <strong>${rt.label}</strong>
                    <span class="badge badge-secondary ms-2">${rt.value}</span>
                </div>
                <button class="btn btn-sm btn-danger" onclick="removeResourceType('${rt.value}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        container.innerHTML += item;
    });
}

function displayTimeSlots() {
    const container = document.getElementById('timeSlotsList');
    container.innerHTML = '';
    
    settings.timeSlots.forEach(slot => {
        const item = `
            <div class="d-flex justify-content-between align-items-center mb-2 p-3 border rounded">
                <div>
                    <i class="bi bi-clock"></i>
                    <strong>${slot}</strong>
                </div>
                <button class="btn btn-sm btn-danger" onclick="removeTimeSlot('${slot}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        container.innerHTML += item;
    });
}

function displayBookingLimits() {
    document.getElementById('dailyLimit').value = settings.bookingLimits.dailyLimit;
    document.getElementById('weeklyLimit').value = settings.bookingLimits.weeklyLimit;
    document.getElementById('advanceBookingLimit').value = settings.bookingLimits.advanceBookingLimit;
}

document.getElementById('saveResourceTypeBtn').addEventListener('click', async function() {
    const label = document.getElementById('rtLabel').value;
    const value = document.getElementById('rtValue').value;
    const icon = document.getElementById('rtIcon').value;
    
    const token = getToken();
    
    try {
        const response = await fetch('/api/settings/resource-types', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ label, value, icon })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Resource type added!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addResourceTypeModal')).hide();
            document.getElementById('addResourceTypeForm').reset();
            loadSettings();
        } else {
            showMessage(data.message, 'danger');
        }
    } catch (error) {
        showMessage('Error adding resource type', 'danger');
    }
});

async function removeResourceType(value) {
    if (!confirm('Remove this resource type?')) return;
    
    const token = getToken();
    
    try {
        const response = await fetch('/api/settings/resource-types', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ value })
        });
        
        if (response.ok) {
            showMessage('Resource type removed!', 'success');
            loadSettings();
        }
    } catch (error) {
        showMessage('Error removing resource type', 'danger');
    }
}

document.getElementById('saveTimeSlotBtn').addEventListener('click', async function() {
    const start = document.getElementById('slotStart').value;
    const end = document.getElementById('slotEnd').value;
    const slot = `${start}-${end}`;
    
    const token = getToken();
    
    try {
        const response = await fetch('/api/settings/time-slots', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ slot })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Time slot added!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('addTimeSlotModal')).hide();
            document.getElementById('addTimeSlotForm').reset();
            loadSettings();
        } else {
            showMessage(data.message, 'danger');
        }
    } catch (error) {
        showMessage('Error adding time slot', 'danger');
    }
});

async function removeTimeSlot(slot) {
    if (!confirm('Remove this time slot?')) return;
    
    const token = getToken();
    
    try {
        const response = await fetch('/api/settings/time-slots', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ slot })
        });
        
        if (response.ok) {
            showMessage('Time slot removed!', 'success');
            loadSettings();
        }
    } catch (error) {
        showMessage('Error removing time slot', 'danger');
    }
}

document.getElementById('bookingLimitsForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const dailyLimit = parseInt(document.getElementById('dailyLimit').value);
    const weeklyLimit = parseInt(document.getElementById('weeklyLimit').value);
    const advanceBookingLimit = parseInt(document.getElementById('advanceBookingLimit').value);
    
    const token = getToken();
    
    try {
        const response = await fetch('/api/settings/booking-limits', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ dailyLimit, weeklyLimit, advanceBookingLimit })
        });
        
        if (response.ok) {
            showMessage('Booking limits updated!', 'success');
            loadSettings();
        }
    } catch (error) {
        showMessage('Error updating limits', 'danger');
    }
});

loadSettings();