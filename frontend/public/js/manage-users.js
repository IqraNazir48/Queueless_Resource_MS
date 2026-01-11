// frontend/public/js/manage-users.js

let allUsers = [];
let filteredUsers = [];
let currentFilter = 'all';
let searchQuery = '';
let userToDelete = null;

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

async function loadUsers() {
    const token = getToken();
    if (!token) {
        window.location.href = '/login';
        return;
    }
    
    document.getElementById('loadingUsers').style.display = 'block';
    document.getElementById('usersContainer').style.display = 'none';
    document.getElementById('noUsers').style.display = 'none';
    
    try {
        const usersResponse = await fetch('/api/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (usersResponse.status === 401 || usersResponse.status === 403) {
            window.location.href = '/login';
            return;
        }
        
        allUsers = await usersResponse.json();
        
        const statsResponse = await fetch('/api/users/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const stats = await statsResponse.json();
        
        document.getElementById('totalUsers').textContent = stats.totalUsers;
        document.getElementById('adminCount').textContent = stats.adminCount;
        document.getElementById('residentCount').textContent = stats.residentCount;
        
        applyFilters();
        displayUsers();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Error loading users: ' + error.message, 'danger');
    }
}

function applyFilters() {
    filteredUsers = allUsers;
    
    if (currentFilter !== 'all') {
        filteredUsers = filteredUsers.filter(u => u.role === currentFilter);
    }
    
    if (searchQuery) {
        filteredUsers = filteredUsers.filter(u => {
            const name = u.name.toLowerCase();
            const email = u.email.toLowerCase();
            const query = searchQuery.toLowerCase();
            return name.includes(query) || email.includes(query);
        });
    }
}

function displayUsers() {
    const loadingDiv = document.getElementById('loadingUsers');
    const containerDiv = document.getElementById('usersContainer');
    const noUsersDiv = document.getElementById('noUsers');
    const tbody = document.getElementById('usersTableBody');
    
    loadingDiv.style.display = 'none';
    
    document.getElementById('totalCount').textContent = allUsers.length;
    document.getElementById('showingCount').textContent = filteredUsers.length;
    
    if (filteredUsers.length === 0) {
        noUsersDiv.style.display = 'block';
        containerDiv.style.display = 'none';
        return;
    }
    
    noUsersDiv.style.display = 'none';
    containerDiv.style.display = 'block';
    tbody.innerHTML = '';
    
    filteredUsers.forEach(user => {
        const roleBadge = user.role === 'admin' 
            ? '<span class="badge badge-warning"><i class="bi bi-shield-fill-check"></i> Admin</span>'
            : '<span class="badge badge-success"><i class="bi bi-person-fill"></i> Resident</span>';
        
        const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Handle profile picture - check if it's a base64 string or default
        let profilePicSrc = '/images/default-avatar.png';
        if (user.profilePicture) {
            if (user.profilePicture.startsWith('data:image')) {
                // It's a base64 image
                profilePicSrc = user.profilePicture;
            } else if (user.profilePicture !== 'default-avatar.png') {
                // It's a URL or path
                profilePicSrc = user.profilePicture;
            }
        }
        
        const row = `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${profilePicSrc}" alt="${user.name}" class="rounded-circle me-3" style="width: 45px; height: 45px; object-fit: cover; border: 2px solid var(--primary);">
                        <strong>${user.name}</strong>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>${roleBadge}</td>
                <td><small>${joinedDate}</small></td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick='viewUser(${JSON.stringify(user)})' title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick='showDeleteModal(${JSON.stringify(user)})' title="Delete User">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        tbody.innerHTML += row;
    });
}

function viewUser(user) {
    const content = document.getElementById('userDetailsContent');
    
    const joinedDate = new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const updatedDate = new Date(user.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const roleBadge = user.role === 'admin' 
        ? '<span class="badge badge-warning"><i class="bi bi-shield-fill-check"></i> Administrator</span>'
        : '<span class="badge badge-success"><i class="bi bi-person-fill"></i> Resident</span>';
    
    // Handle profile picture properly
    let profilePicSrc = '/images/default-avatar.png';
    if (user.profilePicture) {
        if (user.profilePicture.startsWith('data:image')) {
            profilePicSrc = user.profilePicture;
        } else if (user.profilePicture !== 'default-avatar.png') {
            profilePicSrc = user.profilePicture;
        }
    }
    
    content.innerHTML = `
        <div class="text-center mb-4">
            <img src="${profilePicSrc}" alt="${user.name}" class="rounded-circle" style="width: 120px; height: 120px; object-fit: cover; border: 4px solid var(--primary);">
        </div>
        
        <div class="mb-3">
            <strong>Name:</strong>
            <p class="mb-0">${user.name}</p>
        </div>
        
        <div class="mb-3">
            <strong>Email:</strong>
            <p class="mb-0">${user.email}</p>
        </div>
        
        <div class="mb-3">
            <strong>Role:</strong>
            <p class="mb-0">${roleBadge}</p>
        </div>
        
        <div class="mb-3">
            <strong>User ID:</strong>
            <p class="mb-0"><code>${user._id}</code></p>
        </div>
        
        <div class="mb-3">
            <strong>Joined:</strong>
            <p class="mb-0">${joinedDate}</p>
        </div>
        
        <div class="mb-3">
            <strong>Last Updated:</strong>
            <p class="mb-0">${updatedDate}</p>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('viewUserModal'));
    modal.show();
}

function showDeleteModal(user) {
    userToDelete = user;
    
    // Handle profile picture properly
    let deleteProfilePicSrc = '/images/default-avatar.png';
    if (user.profilePicture) {
        if (user.profilePicture.startsWith('data:image')) {
            deleteProfilePicSrc = user.profilePicture;
        } else if (user.profilePicture !== 'default-avatar.png') {
            deleteProfilePicSrc = user.profilePicture;
        }
    }
    
    document.getElementById('deleteUserDetails').innerHTML = `
        <div class="text-center mb-3">
            <img src="${deleteProfilePicSrc}" alt="${user.name}" class="rounded-circle" style="width: 80px; height: 80px; object-fit: cover; border: 3px solid var(--danger);">
        </div>
        <div class="alert alert-info">
            <strong>Name:</strong> ${user.name}<br>
            <strong>Email:</strong> ${user.email}<br>
            <strong>Role:</strong> ${user.role === 'admin' ? 'Administrator' : 'Resident'}
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteUserModal'));
    modal.show();
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async function() {
    if (!userToDelete) return;
    
    const btn = this;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
    
    const token = getToken();
    
    try {
        const response = await fetch(`/api/users/${userToDelete._id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('User deleted successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('deleteUserModal')).hide();
            loadUsers();
        } else {
            showMessage(data.message || 'Failed to delete user', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('Network error. Please try again.', 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Delete User';
    }
});

document.querySelectorAll('input[name="roleFilter"]').forEach(radio => {
    radio.addEventListener('change', function() {
        currentFilter = this.value;
        applyFilters();
        displayUsers();
    });
});

document.getElementById('searchInput').addEventListener('input', function() {
    searchQuery = this.value;
    applyFilters();
    displayUsers();
});

loadUsers();