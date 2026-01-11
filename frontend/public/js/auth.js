// frontend/public/js/auth.js

// Login Form Handler
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = document.getElementById('loginBtn');
        const btnText = document.getElementById('loginBtnText');
        const spinner = document.getElementById('loginSpinner');
        const messageDiv = document.getElementById('loginMessage');
        
        // Get form data
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Disable button
        btn.disabled = true;
        btnText.classList.add('d-none');
        spinner.classList.remove('d-none');
        messageDiv.innerHTML = '';
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store token in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Also set cookies via API call
                await fetch('/api/auth/set-cookie', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ token: data.token, user: data.user })
                });
                
                // Show success message
                messageDiv.innerHTML = `
                    <div class="alert alert-success">
                        Login successful! Redirecting...
                    </div>
                `;
                
                // Redirect based on role
                setTimeout(() => {
                    if (data.user.role === 'admin') {
                        window.location.href = '/admin/dashboard';
                    } else {
                        window.location.href = '/dashboard';
                    }
                }, 1000);
                
            } else {
                messageDiv.innerHTML = `
                    <div class="alert alert-danger">
                        ${data.message || 'Login failed. Please try again.'}
                    </div>
                `;
                btn.disabled = false;
                btnText.classList.remove('d-none');
                spinner.classList.add('d-none');
            }
            
        } catch (error) {
            console.error('Login error:', error);
            messageDiv.innerHTML = `
                <div class="alert alert-danger">
                    Network error. Please check your connection and try again.
                </div>
            `;
            btn.disabled = false;
            btnText.classList.remove('d-none');
            spinner.classList.add('d-none');
        }
    });
}

// Register Form Handler
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const btn = document.getElementById('registerBtn');
        const btnText = document.getElementById('registerBtnText');
        const spinner = document.getElementById('registerSpinner');
        const messageDiv = document.getElementById('registerMessage');
        
        // Get form data
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const role = document.getElementById('role').value;
        const adminCode = document.getElementById('adminCode').value;
        
        // Disable button
        btn.disabled = true;
        btnText.classList.add('d-none');
        spinner.classList.remove('d-none');
        messageDiv.innerHTML = '';
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password, role, adminCode })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Store token in localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // Also set cookies via API call
                await fetch('/api/auth/set-cookie', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({ token: data.token, user: data.user })
                });
                
                // Show success message
                messageDiv.innerHTML = `
                    <div class="alert alert-success">
                        Registration successful! Redirecting...
                    </div>
                `;
                
                // Redirect based on role
                setTimeout(() => {
                    if (data.user.role === 'admin') {
                        window.location.href = '/admin/dashboard';
                    } else {
                        window.location.href = '/dashboard';
                    }
                }, 1000);
                
            } else {
                messageDiv.innerHTML = `
                    <div class="alert alert-danger">
                        ${data.message || 'Registration failed. Please try again.'}
                    </div>
                `;
                btn.disabled = false;
                btnText.classList.remove('d-none');
                spinner.classList.add('d-none');
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            messageDiv.innerHTML = `
                <div class="alert alert-danger">
                    Network error. Please check your connection and try again.
                </div>
            `;
            btn.disabled = false;
            btnText.classList.remove('d-none');
            spinner.classList.add('d-none');
        }
    });
}
