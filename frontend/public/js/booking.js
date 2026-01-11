// frontend/public/js/booking.js

let allResources = [];
let allSettings = null;
let selectedSlot = null;

function getToken() {
    return localStorage.getItem('token');
}

async function loadSettings() {
    const token = getToken();
    try {
        const response = await fetch('/api/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            allSettings = await response.json();
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function loadResources() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    try {
        const response = await fetch('/api/resources', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        allResources = await response.json();
    } catch (error) {
        console.error('Error loading resources:', error);
        showMessage('Error loading resources', 'danger');
    }
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

document.querySelectorAll('input[name="resourceType"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const type = this.value;
        const filteredResources = allResources.filter(r => r.type === type && r.status === 'available');
        
        const resourceSelect = document.getElementById('resourceSelect');
        resourceSelect.innerHTML = '<option value="">Choose a resource...</option>';
        
        filteredResources.forEach(resource => {
            const option = document.createElement('option');
            option.value = resource._id;
            option.textContent = `${resource.name} - ${resource.location}`;
            option.dataset.resource = JSON.stringify(resource);
            resourceSelect.appendChild(option);
        });
        
        document.getElementById('resourceSelectContainer').style.display = 'block';
        document.getElementById('dateContainer').style.display = 'none';
        document.getElementById('slotsContainer').style.display = 'none';
        document.getElementById('submitContainer').style.display = 'none';
    });
});

document.getElementById('resourceSelect').addEventListener('change', function() {
    if (this.value) {
        const resource = JSON.parse(this.options[this.selectedIndex].dataset.resource);
        
        document.getElementById('resourceInfo').innerHTML = `
            <div class="alert alert-info">
                <strong><i class="bi bi-info-circle"></i> ${resource.name}</strong><br>
                <small>Location: ${resource.location} | Status: ${resource.status}</small>
            </div>
        `;
        
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('bookingDate').min = today;
        document.getElementById('bookingDate').value = today;
        
        document.getElementById('dateContainer').style.display = 'block';
        
        loadAvailableSlots();
    } else {
        document.getElementById('dateContainer').style.display = 'none';
        document.getElementById('slotsContainer').style.display = 'none';
        document.getElementById('submitContainer').style.display = 'none';
    }
});

document.getElementById('bookingDate').addEventListener('change', function() {
    loadAvailableSlots();
});

async function loadAvailableSlots() {
    const resourceId = document.getElementById('resourceSelect').value;
    const date = document.getElementById('bookingDate').value;
    
    if (!resourceId || !date) return;
    
    const slotsContainer = document.getElementById('slotsContainer');
    const loadingSlots = document.getElementById('loadingSlots');
    const slotsGrid = document.getElementById('slotsGrid');
    const noSlots = document.getElementById('noSlots');
    
    slotsContainer.style.display = 'block';
    loadingSlots.style.display = 'block';
    slotsGrid.style.display = 'none';
    noSlots.style.display = 'none';
    document.getElementById('submitContainer').style.display = 'none';
    selectedSlot = null;
    
    const token = getToken();
    
    try {
        const response = await fetch(`/api/resources/${resourceId}/available-slots?date=${date}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        loadingSlots.style.display = 'none';
        
        if (data.availableSlots && data.availableSlots.length > 0) {
            slotsGrid.style.display = 'grid';
            slotsGrid.innerHTML = '';
            
            data.availableSlots.forEach(slot => {
                const slotBtn = document.createElement('button');
                slotBtn.type = 'button';
                slotBtn.className = 'slot-btn';
                slotBtn.textContent = slot;
                slotBtn.dataset.slot = slot;
                
                slotBtn.addEventListener('click', function() {
                    document.querySelectorAll('.slot-btn').forEach(btn => {
                        btn.classList.remove('selected');
                    });
                    
                    this.classList.add('selected');
                    selectedSlot = this.dataset.slot;
                    
                    document.getElementById('submitContainer').style.display = 'block';
                });
                
                slotsGrid.appendChild(slotBtn);
            });
        } else {
            noSlots.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading slots:', error);
        loadingSlots.style.display = 'none';
        showMessage('Error loading available slots', 'danger');
    }
}

document.getElementById('bookingForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const resourceId = document.getElementById('resourceSelect').value;
    const date = document.getElementById('bookingDate').value;
    
    if (!selectedSlot) {
        showMessage('Please select a time slot', 'warning');
        return;
    }
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Booking...';
    
    const token = getToken();
    
    try {
        const response = await fetch('/api/bookings/slot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                resourceId,
                date,
                slot: selectedSlot
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Booking successful! Redirecting to your bookings...', 'success');
            setTimeout(() => {
                window.location.href = '/my-bookings';
            }, 2000);
        } else {
            showMessage(data.message || 'Booking failed. Please try again.', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Confirm Booking';
        }
    } catch (error) {
        console.error('Booking error:', error);
        showMessage('Network error. Please try again.', 'danger');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Confirm Booking';
    }
});

if (document.getElementById('bookingForm')) {
    loadSettings().then(() => loadResources());
}