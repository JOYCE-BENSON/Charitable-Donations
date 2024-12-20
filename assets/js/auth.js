// Authentication Class for CharityConnect
class Auth {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user'));
    }

    // Login method with improved error handling
    async login(email, password, rememberMe = false) {
        try {
            // Validate input
            if (!email || !password) {
                throw new Error('Please enter both email and password');
            }

            // Fetch user by email
            const response = await fetch(`${this.baseURL}/users?email=${encodeURIComponent(email)}`);
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const users = await response.json();

            if (users.length === 0) {
                throw new Error('User not found. Please check your email.');
            }

            const user = users[0];

            // Basic password comparison (replace with proper hashing in production)
            if (user.password !== password) {
                throw new Error('Invalid password. Please try again.');
            }

            // Generate a simple token (replace with proper JWT in production)
            const token = btoa(`${user.email}:${Date.now()}`);

            // Set session with optional remember me
            this.setSession(token, user, rememberMe);

            // Return login result with redirect URL
            return {
                success: true,
                user: user,
                redirectUrl: this.getRedirectUrl(user.userType),
                token: token
            };
        } catch (error) {
            console.error('Login error:', error);
            
            // Standardize error message
            throw new Error(error.message || 'Login failed. Please try again.');
        }
    }

    // Determine redirect URL based on user type
    getRedirectUrl(userType) {
        switch(userType) {
            case 'donor':
                return '/donor-dashboard.html';
            case 'charity':
                return '/charity-dashboard.html';
            case 'admin':
                return '/admin-dashboard.html';
            default:
                return '/user-dashboard.html';
        }
    }

    // Registration method
    async register(userData) {
        try {
            // Validate required fields
            const requiredFields = ['email', 'password', 'fullName', 'userType'];
            for (let field of requiredFields) {
                if (!userData[field]) {
                    throw new Error(`${field} is required`);
                }
            }

            // Check for existing user
            const existingUserResponse = await fetch(`${this.baseURL}/users?email=${encodeURIComponent(userData.email)}`);
            const existingUsers = await existingUserResponse.json();

            if (existingUsers.length > 0) {
                throw new Error('A user with this email already exists');
            }

            // Prepare user data for registration
            const newUserData = {
                email: userData.email,
                password: userData.password, // In production, hash this!
                fullName: userData.fullName,
                userType: userData.userType,
                phone: userData.phone || '',
                address: userData.address || '',
                createdAt: new Date().toISOString(),
                profile: {
                    fullName: userData.fullName,
                    phone: userData.phone || '',
                    address: userData.address || '',
                    bio: userData.bio || ''
                }
            };

            // Send registration request
            const response = await fetch(`${this.baseURL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newUserData),
            });

            if (!response.ok) {
                throw new Error('Registration failed. Please try again.');
            }

            const newUser = await response.json();
            
            // Generate token and set session
            const token = btoa(`${newUser.email}:${Date.now()}`);
            this.setSession(token, newUser);

            return {
                success: true,
                user: newUser,
                redirectUrl: this.getRedirectUrl(newUser.userType),
                token: token
            };
        } catch (error) {
            console.error('Registration error:', error);
            throw new Error(error.message || 'Registration failed. Please try again.');
        }
    }

    // Set session data
    setSession(token, user, rememberMe = false) {
        // If remember me is true, persist data longer
        if (rememberMe) {
            // Extended expiry (7 days)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 7);
            localStorage.setItem('tokenExpiry', expiryDate.getTime().toString());
        }

        // Store authentication data
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update instance properties
        this.token = token;
        this.user = user;
    }

    // Logout method
    logout() {
        // Clear local storage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiry');

        // Reset instance properties
        this.token = null;
        this.user = null;

        // Redirect to home page
        window.location.href = '/index.html';
    }

    // Check authentication status
    isAuthenticated() {
        // Check if token exists
        if (!this.token) return false;

        // Check token expiry
        const expiryTime = localStorage.getItem('tokenExpiry');
        if (expiryTime) {
            const currentTime = new Date().getTime();
            if (currentTime > parseInt(expiryTime)) {
                // Token expired, logout
                this.logout();
                return false;
            }
        }

        return true;
    }

    // Get the currently logged-in user
    getCurrentUser() {
        return this.isAuthenticated() ? this.user : null;
    }
}

// Initialize the Auth instance globally
const auth = new Auth();

// Error handling utility
function showError(message, containerSelector = '#alertPlaceholder') {
    const alertPlaceholder = document.querySelector(containerSelector);
    if (!alertPlaceholder) return;

    alertPlaceholder.innerHTML = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="bi bi-exclamation-circle me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}

// Global event listeners for authentication forms
document.addEventListener('DOMContentLoaded', () => {
    // Login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const loginButton = document.getElementById('loginButton');
            const loginText = document.getElementById('loginText');
            const loginSpinner = document.getElementById('loginSpinner');
            const alertPlaceholder = document.getElementById('alertPlaceholder');
            
            // Reset previous alerts
            if (alertPlaceholder) alertPlaceholder.innerHTML = '';
            
            // Update UI state
            loginButton.disabled = true;
            loginText.textContent = 'Logging in...';
            loginSpinner.classList.remove('d-none');
            
            try {
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const rememberMe = document.getElementById('rememberMe').checked;
                
                const result = await auth.login(email, password, rememberMe);
                
                // Redirect to appropriate dashboard
                window.location.replace(result.redirectUrl);
            } catch (error) {
                // Show error message
                showError(error.message);
                
                // Reset button state
                loginButton.disabled = false;
                loginText.textContent = 'Login';
                loginSpinner.classList.add('d-none');
            }
        });
    }

    // Registration form handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = registerForm.querySelector('button[type="submit"]');
            const alertPlaceholder = document.getElementById('alertPlaceholder');
            
            // Reset previous alerts
            if (alertPlaceholder) alertPlaceholder.innerHTML = '';
            
            // Disable submit button
            submitButton.disabled = true;
            submitButton.innerHTML = 'Registering...';
            
            try {
                // Collect form data
                const userData = {
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value,
                    fullName: document.getElementById('fullName').value,
                    userType: document.querySelector('input[name="userType"]:checked')?.value,
                    phone: document.getElementById('phone')?.value || '',
                    address: document.getElementById('address')?.value || ''
                };
                
                const result = await auth.register(userData);
                
                // Redirect to appropriate dashboard
                window.location.replace(result.redirectUrl);
            } catch (error) {
                // Show error message
                showError(error.message);
                
                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = 'Register';
            }
        });
    }
});