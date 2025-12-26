// API Client Utility for My Lab Application
// Handles all API calls with error handling and authentication

const API_BASE_URL = 'http://127.0.0.1:7500';

/**
 * API Client with common fetch wrapper
 */
class ApiClient {
    /**
     * Make a fetch request with error handling
     */
    static async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;

        const defaultOptions = {
            credentials: 'include', // Include cookies for session management
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);

            // Handle 401 Unauthorized - redirect to login
            if (response.status === 401) {
                window.location.href = '/login';
                throw new Error('Unauthorized - redirecting to login');
            }

            // Handle 403 Forbidden
            if (response.status === 403) {
                throw new Error('Access denied - insufficient permissions');
            }

            // Parse JSON response
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    /**
     * GET request
     */
    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    /**
     * POST request
     */
    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * PUT request
     */
    static async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     * DELETE request
     */
    static async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

/**
 * Authentication API
 */
const AuthAPI = {
    /**
     * Login user
     */
    async login(username, password, role) {
        return ApiClient.post('/api/login', { username, password, role });
    },

    /**
     * Logout user
     */
    async logout() {
        return ApiClient.post('/api/logout', {});
    },

    /**
     * Get current user
     */
    async getCurrentUser() {
        return ApiClient.get('/api/current-user');
    },
};

/**
 * Patient API
 */
const PatientAPI = {
    /**
     * Get all patients
     */
    async getAll() {
        return ApiClient.get('/api/patients');
    },

    /**
     * Get single patient by ID
     */
    async getById(patientId) {
        return ApiClient.get(`/api/patients/${patientId}`);
    },

    /**
     * Create new patient
     */
    async create(patientData) {
        return ApiClient.post('/api/patients', patientData);
    },

    /**
     * Update patient
     */
    async update(patientId, patientData) {
        return ApiClient.put(`/api/patients/${patientId}`, patientData);
    },

    /**
     * Delete patient
     */
    async delete(patientId) {
        return ApiClient.delete(`/api/patients/${patientId}`);
    },

    /**
     * Add payment to patient
     */
    async addPayment(patientId, amount) {
        return ApiClient.post(`/api/patients/${patientId}/payment`, { amount });
    },
};

/**
 * Report API
 */
const ReportAPI = {
    /**
     * Get pending reports (patients without reports)
     */
    async getPending() {
        return ApiClient.get('/api/reports/pending');
    },

    /**
     * Get all reports
     */
    async getAll() {
        return ApiClient.get('/api/reports');
    },

    /**
     * Get report for specific patient
     */
    async getByPatient(patientId) {
        return ApiClient.get(`/api/reports/patient/${patientId}`);
    },

    /**
     * Create new report
     */
    async create(reportData) {
        return ApiClient.post('/api/reports', reportData);
    },
};

/**
 * Dashboard API
 */
const DashboardAPI = {
    /**
     * Get dashboard statistics
     */
    async getStats() {
        return ApiClient.get('/api/dashboard/stats');
    },
};

/**
 * Secretary API
 */
const SecretaryAPI = {
    /**
     * Get all secretaries
     */
    async getAll() {
        return ApiClient.get('/api/secretaries');
    },
};

/**
 * AI/ML API
 */
const AIAPI = {
    /**
     * Predict diagnosis from CBC values
     */
    async predict(cbcData) {
        return ApiClient.post('/api/predict', cbcData);
    },

    /**
     * Stream AI diagnosis (for chat)
     */
    async diagnosisStream(prompt) {
        const url = `${API_BASE_URL}/api/ai/diagnosis/stream`;
        const response = await fetch(url, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.body;
    },
};

/**
 * Utility functions
 */
const Utils = {
    /**
     * Check if user is authenticated and redirect if not
     */
    async requireAuth() {
        try {
            const user = await AuthAPI.getCurrentUser();
            if (!user) {
                window.location.href = '/login';
                return null;
            }
            return user;
        } catch (error) {
            window.location.href = '/login';
            return null;
        }
    },

    /**
     * Check if user is doctor and redirect if not
     */
    async requireDoctor() {
        const user = await this.requireAuth();
        if (user && user.role !== 'doctor') {
            alert('Access denied. This page is for doctors only.');
            window.location.href = '/dashboard';
            return null;
        }
        return user;
    },

    /**
     * Show error message to user
     */
    showError(message) {
        alert(`Error: ${message}`);
    },

    /**
     * Show success message to user
     */
    showSuccess(message) {
        console.log('Success:', message);
    },
};
