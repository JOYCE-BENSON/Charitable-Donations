// Donations handling
class DonationManager {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.auth = auth; // Reference to auth instance
    }

    async createDonation(donationData) {
        try {
            if (!this.auth.isAuthenticated()) {
                throw new Error('Authentication required');
            }

            const donation = {
                ...donationData,
                donorId: this.auth.getCurrentUser().id,
                status: 'available',
                createdAt: new Date().toISOString()
            };

            const response = await fetch(`${this.baseURL}/donations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.auth.token}`
                },
                body: JSON.stringify(donation)
            });

            return await response.json();
        } catch (error) {
            throw new Error(`Failed to create donation: ${error.message}`);
        }
    }

    async listDonations(filters = {}) {
        try {
            let url = `${this.baseURL}/donations?`;
            
            // Add filters to URL
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    url += `${key}=${filters[key]}&`;
                }
            });

            const response = await fetch(url);
            const donations = await response.json();

            // Sort donations by date
            return donations.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        } catch (error) {
            throw new Error(`Failed to fetch donations: ${error.message}`);
        }
    }

    async getDonationById(id) {
        try {
            const response = await fetch(`${this.baseURL}/donations/${id}`);
            return await response.json();
        } catch (error) {
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
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.auth.token}`
                },
                body: JSON.stringify({ status })
            });

            return await response.json();
        } catch (error) {
            throw new Error(`Failed to update donation status: ${error.message}`);
        }
    }

    async createRequest(donationId, message, documents = []) {
        try {
            if (!this.auth.isAuthenticated()) {
                throw new Error('Authentication required');
            }

            const request = {
                userId: this.auth.getCurrentUser().id,
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
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.auth.token}`
                },
                body: JSON.stringify(request)
            });

            return await response.json();
        } catch (error) {
            throw new Error(`Failed to create request: ${error.message}`);
        }
    }

    async listRequests(filters = {}) {
        try {
            if (!this.auth.isAuthenticated()) {
                throw new Error('Authentication required');
            }

            let url = `${this.baseURL}/requests?`;
            
            // Add filters to URL
            Object.keys(filters).forEach(key => {
                if (filters[key]) {
                    url += `${key}=${filters[key]}&`;
                }
            });

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.auth.token}`
                }
            });

            const requests = await response.json();

            // Get related donations and users
            const enrichedRequests = await Promise.all(requests.map(async request => {
                const [donation, user] = await Promise.all([
                    this.getDonationById(request.donationId),
                    this.getUserById(request.userId)
                ]);
                return { ...request, donation, user };
            }));

            return enrichedRequests;
        } catch (error) {
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
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.auth.token}`
                },
                body: JSON.stringify({ 
                    status,
                    updatedAt: new Date().toISOString()
                })
            });

            return await response.json();
        } catch (error) {
            throw new Error(`Failed to update request status: ${error.message}`);
        }
    }

    async completeDonation(requestId) {
        try {
            if (!this.auth.isAuthenticated()) {
                throw new Error('Authentication required');
            }

            const request = await fetch(`${this.baseURL}/requests/${requestId}`).then(r => r.json());
            const donation = await this.getDonationById(request.donationId);

            // Create transaction record
            const transaction = {
                donationId: donation.id,
                donorId: donation.donorId,
                recipientId: request.userId,
                requestId,
                amount: donation.amount,
                status: 'completed',
                createdAt: new Date().toISOString(),
                completedAt: new Date().toISOString()
            };

            // Update donation and request status
            await Promise.all([
                this.updateDonationStatus(donation.id, 'completed'),
                this.updateRequestStatus(requestId, 'approved'),
                fetch(`${this.baseURL}/transactions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.auth.token}`
                    },
                    body: JSON.stringify(transaction)
                })
            ]);

            return transaction;
        } catch (error) {
            throw new Error(`Failed to complete donation: ${error.message}`);
        }
    }

    // Helper method to get user details
    async getUserById(userId) {
        try {
            const response = await fetch(`${this.baseURL}/users/${userId}`);
            return await response.json();
        } catch (error) {
            throw new Error(`Failed to fetch user: ${error.message}`);
        }
    }
}

// Initialize donation manager
const donationManager = new DonationManager();

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Create Donation Form
    const createDonationForm = document.getElementById('createDonationForm');
    if (createDonationForm) {
        createDonationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const donationData = {
                    title: document.getElementById('title').value,
                    description: document.getElementById('description').value,
                    amount: parseFloat(document.getElementById('amount').value),
                    category: document.getElementById('category').value,
                    requirements: {
                        documentation: Array.from(document.getElementById('documentation').selectedOptions).map(opt => opt.value),
                        verification: document.getElementById('verification').value,
                        timeframe: document.getElementById('timeframe').value
                    },
                    location: {
                        city: document.getElementById('city').value,
                        country: document.getElementById('country').value
                    }
                };

                await donationManager.createDonation(donationData);
                window.location.href = '/pages/donor-dashboard.html';
            } catch (error) {
                showError(error.message);
            }
        });
    }

    // Donation Listing
    const donationsList = document.getElementById('donationsList');
    if (donationsList) {
        loadDonations();
    }

    // Request Form
    const requestForm = document.getElementById('requestForm');
    if (requestForm) {
        requestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
                const donationId = document.getElementById('donationId').value;
                const message = document.getElementById('message').value;
                const documents = Array.from(document.getElementById('documents').files)
                    .map(file => ({
                        type: file.type,
                        url: URL.createObjectURL(file),
                        uploadedAt: new Date().toISOString()
                    }));

                await donationManager.createRequest(donationId, message, documents);
                window.location.href = '/pages/user-dashboard.html';
            } catch (error) {
                showError(error.message);
            }
        });
    }
});

// Helper function to load and display donations
async function loadDonations(filters = {}) {
    try {
        const donations = await donationManager.listDonations(filters);
        const donationsList = document.getElementById('donationsList');
        
        donationsList.innerHTML = donations.map(donation => `
            <div class="col-md-4 mb-4">
                <div class="donation-card card">
                    <div class="card-body">
                        <h5 class="card-title">${donation.title}</h5>
                        <p class="card-text">${donation.description}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="badge bg-primary">${donation.category}</span>
                            <strong>$${donation.amount}</strong>
                        </div>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-primary" 
                                onclick="window.location.href='/pages/request-donation.html?id=${donation.id}'">
                            Request Support
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showError(error.message);
    }
}

// Helper function to show errors
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger mt-3';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    container.insertAdjacentElement('afterbegin', errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}