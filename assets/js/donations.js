// Make donationManager globally available
window.donationManager = (() => {
    class DonationManager {
        constructor() {
            this.baseURL = 'http://localhost:3000';
            if (typeof window.auth === 'undefined') {
                console.error('Auth module not loaded');
            }
            this.auth = window.auth;
        }

        async createDonation(donationData) {
            try {
                if (!this.auth || !this.auth.isAuthenticated()) {
                    throw new Error('Authentication required');
                }

                const user = JSON.parse(localStorage.getItem('user'));
                if (!user) {
                    throw new Error('User information not found');
                }

                const donation = {
                    ...donationData,
                    donorId: user.id,
                    status: 'available',
                    createdAt: new Date().toISOString()
                };

                const response = await fetch(`${this.baseURL}/donations`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(donation)
                });

                if (!response.ok) {
                    throw new Error('Failed to create donation');
                }

                return await response.json();
            } catch (error) {
                console.error('Donation creation error:', error);
                throw new Error(`Failed to create donation: ${error.message}`);
            }
        }

        async listDonations(filters = {}) {
            try {
                let url = `${this.baseURL}/donations?`;
                
                Object.keys(filters).forEach(key => {
                    if (filters[key]) {
                        url += `${key}=${filters[key]}&`;
                    }
                });

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Failed to fetch donations');
                }

                const donations = await response.json();
                return donations.sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
            } catch (error) {
                console.error('Failed to fetch donations:', error);
                throw new Error(`Failed to fetch donations: ${error.message}`);
            }
        }

        async getDonationById(id) {
            try {
                const response = await fetch(`${this.baseURL}/donations/${id}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch donation');
                }
                return await response.json();
            } catch (error) {
                console.error('Failed to fetch donation:', error);
                throw new Error(`Failed to fetch donation: ${error.message}`);
            }
        }

        async updateDonationStatus(donationId, status) {
            try {
                if (!this.auth.isAuthenticated()) {
                    throw new Error('Authentication required');
                }

                const response = await fetch(`${this.baseURL}/donations/${donationId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        status,
                        updatedAt: new Date().toISOString() 
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update donation status');
                }

                return await response.json();
            } catch (error) {
                console.error('Failed to update donation status:', error);
                throw new Error(`Failed to update donation status: ${error.message}`);
            }
        }

        async createRequest(donationId, message, documents = []) {
            try {
                if (!this.auth.isAuthenticated()) {
                    throw new Error('Authentication required');
                }

                const user = JSON.parse(localStorage.getItem('user'));
                const request = {
                    userId: user.id,
                    donationId,
                    message,
                    documents,
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };

                const response = await fetch(`${this.baseURL}/requests`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(request)
                });

                if (!response.ok) {
                    throw new Error('Failed to create request');
                }

                return await response.json();
            } catch (error) {
                console.error('Failed to create request:', error);
                throw new Error(`Failed to create request: ${error.message}`);
            }
        }

        async listRequests(filters = {}) {
            try {
                if (!this.auth.isAuthenticated()) {
                    throw new Error('Authentication required');
                }

                let url = `${this.baseURL}/requests?`;
                Object.keys(filters).forEach(key => {
                    if (filters[key]) {
                        url += `${key}=${filters[key]}&`;
                    }
                });

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Failed to fetch requests');
                }

                const requests = await response.json();
                return await Promise.all(requests.map(async request => {
                    const donation = await this.getDonationById(request.donationId);
                    return { ...request, donation };
                }));
            } catch (error) {
                console.error('Failed to fetch requests:', error);
                throw new Error(`Failed to fetch requests: ${error.message}`);
            }
        }

        async updateRequestStatus(requestId, status) {
            try {
                if (!this.auth.isAuthenticated()) {
                    throw new Error('Authentication required');
                }

                const response = await fetch(`${this.baseURL}/requests/${requestId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        status,
                        updatedAt: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update request status');
                }

                return await response.json();
            } catch (error) {
                console.error('Failed to update request status:', error);
                throw new Error(`Failed to update request status: ${error.message}`);
            }
        }

        getCategoryBadgeColor(category) {
            const colors = {
                medical: 'danger',
                education: 'info',
                disaster: 'warning',
                business: 'success',
                food: 'primary',
                housing: 'secondary'
            };
            return colors[category.toLowerCase()] || 'secondary';
        }

        showSuccess(message) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-success alert-dismissible fade show';
            alertDiv.innerHTML = `
                <i class="bi bi-check-circle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            const container = document.querySelector('.container');
            if (container) {
                container.insertAdjacentElement('afterbegin', alertDiv);
                setTimeout(() => alertDiv.remove(), 3000);
            }
        }

        showError(message) {
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger alert-dismissible fade show';
            alertDiv.innerHTML = `
                <i class="bi bi-exclamation-circle me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            const container = document.querySelector('.container');
            if (container) {
                container.insertAdjacentElement('afterbegin', alertDiv);
                setTimeout(() => alertDiv.remove(), 5000);
            }
        }
    }

    // Create and return singleton instance
    return new DonationManager();
})();

// Global helper functions
window.formatCurrency = function(amount) {
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: 'KES'
    }).format(amount);
};

window.formatDate = function(dateString) {
    return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Event Listeners for Donation Management
document.addEventListener('DOMContentLoaded', async () => {
    // Handle Create Donation Form
    const createDonationForm = document.getElementById('createDonationForm');
    if (createDonationForm) {
        createDonationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...';
            
            try {
                const donationData = {
                    title: document.getElementById('title').value,
                    description: document.getElementById('description').value,
                    amount: parseFloat(document.getElementById('amount').value),
                    category: document.getElementById('category').value,
                    requirements: {
                        documentation: Array.from(document.getElementById('documentation').selectedOptions)
                            .map(opt => opt.value),
                        verification: document.getElementById('verification').value,
                        timeframe: document.getElementById('timeframe').value
                    },
                    location: {
                        city: document.getElementById('city').value,
                        country: document.getElementById('country').value
                    }
                };

                await window.donationManager.createDonation(donationData);
                window.donationManager.showSuccess('Donation created successfully!');
                
                setTimeout(() => {
                    window.location.href = 'donor-dashboard.html';
                }, 1500);
            } catch (error) {
                window.donationManager.showError(error.message);
                submitButton.disabled = false;
                submitButton.innerHTML = originalText;
            }
        });
    }

    // Handle Donation Listing
    const donationsList = document.getElementById('donationsList');
    if (donationsList) {
        try {
            const donations = await window.donationManager.listDonations();
            renderDonationsList(donations);
        } catch (error) {
            window.donationManager.showError(error.message);
        }
    }
});

function renderDonationsList(donations) {
    const donationsList = document.getElementById('donationsList');
    if (!donationsList) return;

    donationsList.innerHTML = donations.map(donation => `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${donation.title}</h5>
                    <p class="card-text">${donation.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-${window.donationManager.getCategoryBadgeColor(donation.category)}">
                            ${donation.category}
                        </span>
                        <strong>${window.formatCurrency(donation.amount)}</strong>
                    </div>
                    ${donation.location ? `
                        <div class="mt-2 text-muted small">
                            <i class="bi bi-geo-alt"></i> 
                            ${donation.location.city}, ${donation.location.country}
                        </div>
                    ` : ''}
                </div>
                <div class="card-footer bg-transparent">
                    <a href="request-donation.html?id=${donation.id}" 
                       class="btn btn-primary w-100">
                        Request Support
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}