// Utility functions and shared code
const Utils = {
    // Format currency amounts
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    // Format dates
    formatDate: (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Get time ago
    getTimeAgo: (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        return date.toLocaleDateString();
    },

    // Validate email format
    isValidEmail: (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validate password strength
    isValidPassword: (password) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return re.test(password);
    },

    // Generate random ID
    generateId: () => {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    },

    // Show success message
    showSuccess: (message, duration = 5000) => {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-success alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.querySelector('.container').insertAdjacentElement('afterbegin', alertDiv);
        
        setTimeout(() => alertDiv.remove(), duration);
    },

    // Show error message
    showError: (message, duration = 5000) => {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.querySelector('.container').insertAdjacentElement('afterbegin', alertDiv);
        
        setTimeout(() => alertDiv.remove(), duration);
    },

    // Validate file
    validateFile: (file, allowedTypes, maxSizeMB = 5) => {
        if (!file) return false;
        
        const fileType = file.type;
        const fileSize = file.size / (1024 * 1024); // Convert to MB

        if (!allowedTypes.includes(fileType)) {
            Utils.showError('Invalid file type. Please upload a supported format.');
            return false;
        }

        if (fileSize > maxSizeMB) {
            Utils.showError(`File size must be less than ${maxSizeMB}MB.`);
            return false;
        }

        return true;
    },

    // Sanitize HTML content
    sanitizeHTML: (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    // Handle form data
    getFormData: (formElement) => {
        const formData = new FormData(formElement);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    },

    // Category management
    categories: {
        list: [
            { id: 'medical', name: 'Medical', icon: 'bi-heart-pulse' },
            { id: 'education', name: 'Education', icon: 'bi-book' },
            { id: 'disaster', name: 'Disaster Relief', icon: 'bi-hurricane' },
            { id: 'food', name: 'Food & Nutrition', icon: 'bi-cup-hot' },
            { id: 'housing', name: 'Housing', icon: 'bi-house' },
            { id: 'other', name: 'Other', icon: 'bi-three-dots' }
        ],

        getIcon: (categoryId) => {
            const category = Utils.categories.list.find(c => c.id === categoryId);
            return category ? category.icon : 'bi-three-dots';
        },

        getBadgeColor: (categoryId) => {
            const colors = {
                medical: 'danger',
                education: 'info',
                disaster: 'warning',
                food: 'success',
                housing: 'primary',
                other: 'secondary'
            };
            return colors[categoryId] || colors.other;
        }
    },

    // Document management
    documents: {
        allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        maxSize: 5, // MB

        validateDocument: (file) => {
            return Utils.validateFile(file, Utils.documents.allowedTypes, Utils.documents.maxSize);
        },

        formatName: (docType) => {
            return docType.split('_')
                         .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                         .join(' ');
        }
    },

    // API error handling
    handleApiError: (error) => {
        console.error('API Error:', error);
        
        if (error.response) {
            // Server responded with error
            Utils.showError(error.response.data.message || 'An error occurred');
        } else if (error.request) {
            // No response received
            Utils.showError('Unable to connect to server');
        } else {
            // Other error
            Utils.showError('An unexpected error occurred');
        }
    }
};

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication status
    const publicPages = ['index.html', 'login.html', 'register.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (!publicPages.includes(currentPage) && !auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Setup logout handlers
    const logoutButtons = document.querySelectorAll('[onclick="auth.logout()"]');
    logoutButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            auth.logout();
        });
    });

    // Initialize category selectors
    const categorySelects = document.querySelectorAll('select[data-type="category"]');
    categorySelects.forEach(select => {
        select.innerHTML = Utils.categories.list.map(category => 
            `<option value="${category.id}">${category.name}</option>`
        ).join('');
    });

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Handle back buttons
    const backButtons = document.querySelectorAll('[data-action="back"]');
    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            window.history.back();
        });
    });
});

// Export utilities
window.Utils = Utils;