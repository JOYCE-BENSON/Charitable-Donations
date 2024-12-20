// Authentication handling
class Auth {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user'));
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/users?email=${email}`);
            const users = await response.json();
            
            if (users.length === 0) {
                throw new Error('User not found');
            }

            const user = users[0];
            if (user.password !== password) {
                throw new Error('Invalid password');
            }

            const token = btoa(`${user.email}:${Date.now()}`);
            
            this.setSession(token, user);
            return user;
        } catch (error) {
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    async register(userData) {
        try {
            // Check if user already exists
            const existingUser = await fetch(`${this.baseURL}/users?email=${userData.email}`);
            const existingUserData = await existingUser.json();

            if (existingUserData.length > 0) {
                throw new Error('User already exists');
            }

            // Create new user
            const response = await fetch(`${this.baseURL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...userData,
                    createdAt: new Date().toISOString(),
                    profile: {
                        fullName: userData.fullName,
                        phone: userData.phone || '',
                        address: userData.address || '',
                        bio: userData.bio || ''
                    }
                })
            });

            const newUser = await response.json();
            const token = btoa(`${newUser.email}:${Date.now()}`);
            
            this.setSession(token, newUser);
            return newUser;
        } catch (error) {
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    setSession(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        this.token = token;
        this.user = user;

        // Redirect based on user type
        if (user.userType === 'donor') {
            window.location.href = '/donor-dashboard.html';
        } else {
            window.location.href = '/user-dashboard.html';
        }
    }

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        window.location.href = '/index.html';
    }

    isAuthenticated() {
        return !!this.token;
    }

    getCurrentUser() {
        return this.user;
    }
}

// Initialize auth instance
const auth = new Auth();

// Event Listeners for Login Form
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                
                await auth.login(email, password);
            } catch (error) {
                showError(error.message);
            }
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const userData = {
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value,
                    fullName: document.getElementById('fullName').value,
                    userType: document.querySelector('input[name="userType"]:checked').value,
                    phone: document.getElementById('phone').value,
                    address: document.getElementById('address').value
                };
                
                await auth.register(userData);
            } catch (error) {
                showError(error.message);
            }
        });
    }
});

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3';
    errorDiv.textContent = message;
    
    const form = document.querySelector('form');
    form.insertAdjacentElement('beforebegin', errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}