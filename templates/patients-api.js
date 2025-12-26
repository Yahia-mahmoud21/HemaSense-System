// Patients Page - API Integration
// This script handles the patients page with backend API integration

let currentUser = null;
let allPatients = [];

// Initialize patients page
async function initPatientsPage() {
    try {
        // Check authentication
        currentUser = await Utils.requireAuth();
        if (!currentUser) return;

        // Load all patients
        await loadPatients();
    } catch (error) {
        console.error('Patients page initialization error:', error);
        Utils.showError('Failed to load patients');
    }
}

// Load patients from API
async function loadPatients() {
    try {
        allPatients = await PatientAPI.getAll();
        displayPatients(allPatients);
    } catch (error) {
        console.error('Error loading patients:', error);
        Utils.showError('Failed to load patients');
    }
}

// Display patients in table
function displayPatients(patientsToShow) {
    const patientTableBody = document.getElementById('patientTableBody');
    if (!patientTableBody) return;

    patientTableBody.innerHTML = '';

    // Update patients count
    const patientsCountEl = document.getElementById('patientsCount');
    if (patientsCountEl) {
        patientsCountEl.textContent = patientsToShow.length;
    }

    if (patientsToShow.length === 0) {
        patientTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">No patients found</td></tr>';
        return;
    }

    patientsToShow.forEach((patient) => {
        const row = document.createElement('tr');
        const patientId = String(patient.patient_id).padStart(3, '0');
        const registeredDate = patient.created_at ? new Date(patient.created_at).toLocaleDateString() : '-';
        const remaining = patient.total_payment - (patient.paid_amount || 0);

        row.innerHTML = `
            <td>#${patientId}</td>
            <td>${patient.name}</td>
            <td>${patient.age}</td>
            <td>${patient.phone}</td>
            <td>Secretary ${patient.secertary_id}</td>
            <td>$${parseFloat(patient.total_payment).toFixed(2)}</td>
            <td>${registeredDate}</td>
            <td><span class="status-active">Active</span></td>
            <td>
                <div class="action-links">
                    <a href="#" onclick="viewPatient(${patient.patient_id}); return false;" title="View details"><i class="fa-solid fa-eye"></i></a>
                    <a href="#" onclick="editPatient(${patient.patient_id}); return false;" title="Edit patient"><i class="fa-solid fa-pen-to-square"></i></a>
                    <a href="#" onclick="deletePatient(${patient.patient_id}); return false;" title="Delete patient" class="delete-btn"><i class="fa-solid fa-trash"></i></a>
                    <a href="#" onclick="openPaymentModal(${patient.patient_id}); return false;" title="Add Payment" class="payment-btn"><i class="fa-solid fa-credit-card"></i></a>
                </div>
            </td>
        `;
        patientTableBody.appendChild(row);
    });
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const closeIcon = document.querySelector('.close-icon');

    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            if (searchTerm === '') {
                displayPatients(allPatients);
            } else {
                const filtered = allPatients.filter(p =>
                    p.name.toLowerCase().includes(searchTerm) ||
                    p.phone.includes(searchTerm)
                );
                displayPatients(filtered);
            }
        });

        if (closeIcon) {
            closeIcon.addEventListener('click', function () {
                searchInput.value = '';
                displayPatients(allPatients);
            });
        }
    }
}

// View patient details
window.viewPatient = async function (patientId) {
    try {
        const patient = await PatientAPI.getById(patientId);
        const remaining = patient.total_payment - (patient.paid_amount || 0);
        const patientIdStr = String(patient.patient_id).padStart(3, '0');
        const registeredDate = patient.created_at ? new Date(patient.created_at).toLocaleString() : 'N/A';

        // Populate modal
        document.getElementById('viewPatientId').textContent = `#${patientIdStr}`;
        document.getElementById('viewPatientName').textContent = patient.name;
        document.getElementById('viewPatientAge').textContent = patient.age + ' years';
        document.getElementById('viewPatientPhone').textContent = patient.phone;
        document.getElementById('viewPatientSecretary').textContent = `Secretary ${patient.secertary_id}`;
        document.getElementById('viewPatientStatus').textContent = 'Active';
        document.getElementById('viewPatientTotal').textContent = `$${parseFloat(patient.total_payment).toFixed(2)}`;
        document.getElementById('viewPatientPaid').textContent = `$${parseFloat(patient.paid_amount || 0).toFixed(2)}`;
        document.getElementById('viewPatientRemaining').textContent = `$${parseFloat(remaining).toFixed(2)}`;
        document.getElementById('viewPatientDate').textContent = registeredDate;

        // Show modal
        document.getElementById('viewPatientModal').classList.add('show');
    } catch (error) {
        console.error('Error loading patient:', error);
        Utils.showError('Failed to load patient details');
    }
};

// Edit patient
let currentEditPatientId = null;

window.editPatient = async function (patientId) {
    try {
        currentEditPatientId = patientId;
        const patient = await PatientAPI.getById(patientId);

        // Populate form
        document.getElementById('editPatientName').value = patient.name;
        document.getElementById('editPatientAge').value = patient.age;
        document.getElementById('editPatientPhone').value = patient.phone;
        document.getElementById('editPatientSecretary').value = `Secretary ${patient.secertary_id}`;
        document.getElementById('editPatientTotal').value = parseFloat(patient.total_payment).toFixed(2);
        document.getElementById('editPatientStatus').value = 'Active';

        // Show modal
        document.getElementById('editPatientModal').classList.add('show');
    } catch (error) {
        console.error('Error loading patient:', error);
        Utils.showError('Failed to load patient for editing');
    }
};

// Save edited patient
function setupEditForm() {
    const editPatientForm = document.getElementById('editPatientForm');
    if (editPatientForm) {
        editPatientForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (currentEditPatientId === null) return;

            try {
                const updatedData = {
                    name: document.getElementById('editPatientName').value,
                    age: parseInt(document.getElementById('editPatientAge').value),
                    phone: document.getElementById('editPatientPhone').value,
                    total_payment: parseFloat(document.getElementById('editPatientTotal').value)
                };

                await PatientAPI.update(currentEditPatientId, updatedData);

                // Close modal
                document.getElementById('editPatientModal').classList.remove('show');
                currentEditPatientId = null;

                // Reload patients
                await loadPatients();

                alert('Patient information updated successfully!');
            } catch (error) {
                console.error('Error updating patient:', error);
                Utils.showError('Failed to update patient');
            }
        });
    }
}

// Delete patient
window.deletePatient = async function (patientId) {
    if (confirm('Are you sure you want to delete this patient?')) {
        try {
            await PatientAPI.delete(patientId);
            await loadPatients();
            alert('Patient deleted successfully!');
        } catch (error) {
            console.error('Error deleting patient:', error);
            Utils.showError('Failed to delete patient');
        }
    }
};

// Payment modal
let currentPaymentPatientId = null;

window.openPaymentModal = async function (patientId) {
    try {
        currentPaymentPatientId = patientId;
        const patient = await PatientAPI.getById(patientId);
        const paymentModal = document.getElementById('paymentModal');

        const remaining = patient.total_payment - (patient.paid_amount || 0);

        // Update modal content
        document.getElementById('paymentPatientName').textContent = patient.name;
        document.getElementById('paymentPatientId').textContent = String(patient.patient_id).padStart(3, '0');
        document.getElementById('totalCost').textContent = `$${parseFloat(patient.total_payment).toFixed(2)}`;
        document.getElementById('paidAmount').textContent = `$${parseFloat(patient.paid_amount || 0).toFixed(2)}`;
        document.getElementById('remainingAmount').textContent = `$${parseFloat(remaining).toFixed(2)}`;

        // Show modal
        document.getElementById('paymentError').style.display = 'none';
        paymentModal.classList.add('show');
    } catch (error) {
        console.error('Error loading patient for payment:', error);
        Utils.showError('Failed to load patient payment details');
    }
};

// Handle payment form submission
function setupPaymentForm() {
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            if (currentPaymentPatientId === null) return;

            const paymentInput = parseFloat(document.getElementById('paymentInput').value);
            const errorDiv = document.getElementById('paymentError');
            errorDiv.style.display = 'none';

            if (!paymentInput || paymentInput <= 0) {
                errorDiv.textContent = 'Please enter a valid payment amount!';
                errorDiv.style.display = 'block';
                return;
            }

            try {
                const response = await PatientAPI.addPayment(currentPaymentPatientId, paymentInput);

                // Update modal display
                const patient = await PatientAPI.getById(currentPaymentPatientId);
                const newRemaining = patient.total_payment - (patient.paid_amount || 0);

                document.getElementById('paidAmount').textContent = `$${parseFloat(patient.paid_amount || 0).toFixed(2)}`;
                document.getElementById('remainingAmount').textContent = `$${parseFloat(newRemaining).toFixed(2)}`;

                // Clear input
                document.getElementById('paymentInput').value = '';

                // Reload table
                await loadPatients();

                alert(`Payment of $${paymentInput.toFixed(2)} added successfully!\nRemaining balance: $${newRemaining.toFixed(2)}`);
            } catch (error) {
                console.error('Error adding payment:', error);
                errorDiv.textContent = error.message || 'Failed to add payment';
                errorDiv.style.display = 'block';
            }
        });
    }
}

// Setup modal close handlers
function setupModals() {
    // View modal
    const closeViewModal = document.getElementById('closeViewModal');
    const closeViewBtn = document.getElementById('closeViewBtn');
    if (closeViewModal) {
        closeViewModal.addEventListener('click', function () {
            document.getElementById('viewPatientModal').classList.remove('show');
        });
    }
    if (closeViewBtn) {
        closeViewBtn.addEventListener('click', function () {
            document.getElementById('viewPatientModal').classList.remove('show');
        });
    }

    // Edit modal
    const closeEditModal = document.getElementById('closeEditModal');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (closeEditModal) {
        closeEditModal.addEventListener('click', function () {
            document.getElementById('editPatientModal').classList.remove('show');
            currentEditPatientId = null;
        });
    }
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', function () {
            document.getElementById('editPatientModal').classList.remove('show');
            currentEditPatientId = null;
        });
    }

    // Payment modal
    const closePaymentModal = document.getElementById('closePaymentModal');
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    if (closePaymentModal) {
        closePaymentModal.addEventListener('click', function () {
            document.getElementById('paymentModal').classList.remove('show');
            document.getElementById('paymentInput').value = '';
        });
    }
    if (cancelPaymentBtn) {
        cancelPaymentBtn.addEventListener('click', function () {
            document.getElementById('paymentModal').classList.remove('show');
            document.getElementById('paymentInput').value = '';
        });
    }
}

// Add new patient button
function setupAddPatientBtn() {
    const addPatientBtn = document.getElementById('addPatientBtn');
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', function () {
            window.location.href = '/register';
        });
    }
}

// Logout
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function (e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await AuthAPI.logout();
                    window.location.href = '/';
                } catch (error) {
                    window.location.href = '/';
                }
            }
        });
    }
}

// Initialize on page load
window.addEventListener('load', async function () {
    await initPatientsPage();
    setupSearch();
    setupEditForm();
    setupPaymentForm();
    setupModals();
    setupAddPatientBtn();
    setupLogout();
});
