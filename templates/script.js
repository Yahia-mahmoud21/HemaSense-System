// Store all data
let patients = JSON.parse(localStorage.getItem('patients')) || [];
let tests = JSON.parse(localStorage.getItem('tests')) || [];
let samples = JSON.parse(localStorage.getItem('samples')) || [];
let doctors = JSON.parse(localStorage.getItem('doctors')) || [];

const form = document.getElementById('registerForm');
const searchInput = document.getElementById('searchInput');
const closeIcon = document.querySelector('.close-icon');
const successMsg = document.getElementById('successMsg');
const logoutBtn = document.getElementById('logoutBtn');
const patientTableBody = document.getElementById('patientTableBody');
const addPatientBtn = document.getElementById('addPatientBtn');

// Check if we're on register page or patients page
const isRegisterPage = form !== null;
const isPatientsPage = patientTableBody !== null;

console.log('Loaded Patients:', patients);
console.log('Loaded Tests:', tests);
console.log('Loaded Samples:', samples);
console.log('Loaded Doctors:', doctors);

// ============ REGISTER PAGE FUNCTIONS ============
if (isRegisterPage) {
    // Handle form submission
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Get form data
        const patientData = {
            id: Date.now(),
            name: document.getElementById('name').value,
            age: document.getElementById('age').value,
            phone: document.getElementById('phone').value,
            secretary: document.getElementById('SecretarySecretary').value || '-',
            totalCost: parseFloat(document.getElementById('bill').value) || 0,
            paidAmount: 0,
            status: 'Active',
            registeredAt: new Date().toLocaleString()
        };

        // Add to patients array
        patients.push(patientData);

        // Save to browser storage
        localStorage.setItem('patients', JSON.stringify(patients));

        // Show success message
        successMsg.classList.add('show');
        setTimeout(() => {
            successMsg.classList.remove('show');
        }, 3000);

        // Log to console
        console.log('Patient Registered:', patientData);
        console.log('All Patients:', patients);

        // Reset form
        form.reset();
    });
}

// ============ PATIENTS PAGE FUNCTIONS ============

// Display patients in table
function displayPatients(patientsToShow = patients) {
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

    patientsToShow.forEach((patient, index) => {
        const row = document.createElement('tr');
        const patientId = String(patient.id).slice(-3).padStart(3, '0');
        const status = patient.status || 'Active';
        const statusClass = status === 'Active' ? 'status-active' : 'status-inactive';

        // Handle legacy data - convert old format to new format
        const totalCost = patient.totalCost || patient.bill || 0;
        const paidAmount = patient.paidAmount || 0;
        const secretary = patient.secretary || patient.tests || '-';
        const registeredDate = patient.now_date ? new Date(patient.now_date).toLocaleDateString() : '-';

        row.innerHTML = `
            <td>${patientId}</td>
            <td>${patient.name}</td>
            <td>${patient.age}</td>
            <td>${patient.phone}</td>
            <td>${secretary}</td>
            <td>$${parseFloat(totalCost).toFixed(2)}</td>
            <td>${registeredDate}</td>
            <td><span class="${statusClass}">${status}</span></td>
            <td>
                <div class="action-links">
                    <a href="#" onclick="viewPatient(${index}); return false;" title="View details"><i class="fa-solid fa-eye"></i></a>
                    <a href="#" onclick="editPatient(${index}); return false;" title="Edit patient"><i class="fa-solid fa-pen-to-square"></i></a>
                    <a href="#" onclick="deletePatient(${index}); return false;" title="Delete patient" class="delete-btn"><i class="fa-solid fa-trash"></i></a>
                    <a href="#" onclick="openPaymentModal(${index}); return false;" title="Add Payment" class="payment-btn"><i class="fa-solid fa-credit-card"></i></a>
                </div>
            </td>
        `;
        patientTableBody.appendChild(row);
    });
}

if (isPatientsPage) {
    // Add New Patient
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', function () {
            window.location.href = 'index.html';
        });
    }

    // Search functionality on patients page
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase();
            if (searchTerm === '') {
                displayPatients();
            } else {
                const filtered = patients.filter(p =>
                    p.name.toLowerCase().includes(searchTerm) ||
                    p.phone.includes(searchTerm) ||
                    (p.secretary && p.secretary.toLowerCase().includes(searchTerm))
                );
                displayPatients(filtered);
            }
        });

        // Clear search
        if (closeIcon) {
            closeIcon.addEventListener('click', function () {
                searchInput.value = '';
                displayPatients();
            });
        }
    }

    // Initialize table on page load
    displayPatients();
}

// ============ DASHBOARD PAGE FUNCTIONS ============

function initializeDashboard() {
    const patients = JSON.parse(localStorage.getItem('patients')) || [];
    const tests = JSON.parse(localStorage.getItem('tests')) || [];
    const samples = JSON.parse(localStorage.getItem('samples')) || [];

    // Update stats
    const totalPatientsEl = document.getElementById('totalPatients');
    const totalTestsEl = document.getElementById('totalTests');
    const thisWeekEl = document.getElementById('thisWeek');

    if (totalPatientsEl) {
        totalPatientsEl.textContent = patients.length;
    }

    if (totalTestsEl) {
        totalTestsEl.textContent = tests.length;
    }

    if (thisWeekEl) {
        thisWeekEl.textContent = samples.length;
    }

    // Display latest patients
    displayLatestPatients(patients);

    // Initialize charts
    initializeCharts(patients);
}

function displayLatestPatients(patients) {
    const tbody = document.getElementById('latestPatientsTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    const latestPatients = patients.slice(-3).reverse();

    if (latestPatients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 40px;">No patients registered yet</td></tr>';
        return;
    }

    latestPatients.forEach(patient => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${patient.name}</td>
            <td>${patient.age}</td>
            <td>${patient.tests || '-'}</td>
            <td>${patient.phone}</td>
        `;
        tbody.appendChild(row);
    });
}

function initializeCharts(patients) {
    const lineChartEl = document.getElementById('lineChart');
    const donutChartEl = document.getElementById('donutChart');

    if (!lineChartEl || !donutChartEl) return;

    // Line Chart
    const lineCtx = lineChartEl.getContext('2d');
    new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            datasets: [{
                label: 'Patients',
                data: [250, 600, 400, 150, 900, 300, 100, 800, 200, 150],
                borderColor: '#9c27b0',
                backgroundColor: 'rgba(156, 39, 176, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#9c27b0'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1000
                }
            }
        }
    });

    // Donut Chart
    const donutCtx = donutChartEl.getContext('2d');
    new Chart(donutCtx, {
        type: 'doughnut',
        data: {
            labels: ['Tests', 'Pending', 'Completed'],
            datasets: [{
                data: [1000, 500, 300, 200],
                backgroundColor: [
                    '#cddc39',
                    '#ff9800',
                    '#e91e63',
                    '#2196f3'
                ],
                borderColor: 'white',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Initialize dashboard on page load
if (document.getElementById('latestPatientsTable')) {
    window.addEventListener('load', initializeDashboard);

    // Update dashboard when returning to this page
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
            initializeDashboard();
        }
    });
}

// ============ TESTS PAGE FUNCTIONS ============
const testsTableBody = document.getElementById('testsTableBody');
const addTestBtn = document.getElementById('addTestBtn');
const testModal = document.getElementById('testModal');
const testForm = document.getElementById('testForm');

if (testsTableBody) {
    function displayTests(testsToShow = tests) {
        testsTableBody.innerHTML = '';
        if (testsToShow.length === 0) {
            testsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No tests found</td></tr>';
            return;
        }

        testsToShow.forEach((test, index) => {
            const row = document.createElement('tr');
            const testId = String(test.id).slice(-3).padStart(3, '0');
            const statusClass = test.status === 'Completed' ? 'status-active' : test.status === 'Pending' ? 'status-inactive' : 'status-pending';

            row.innerHTML = `
                <td>${testId}</td>
                <td>${test.name}</td>
                <td>${test.patient}</td>
                <td>${test.price}</td>
                <td><span class="${statusClass}">${test.status}</span></td>
                <td>${test.date}</td>
                <td>
                    <div class="action-links">
                        <a href="#" onclick="editTest(${index}); return false;">Edit</a>
                        <span class="action-separator">/</span>
                        <a href="#" onclick="deleteTest(${index}); return false;">Delete</a>
                    </div>
                </td>
            `;
            testsTableBody.appendChild(row);
        });
    }

    addTestBtn.addEventListener('click', function () {
        testModal.classList.add('show');
    });

    document.getElementById('closeTestModal').addEventListener('click', function () {
        testModal.classList.remove('show');
    });

    document.getElementById('cancelTestBtn').addEventListener('click', function () {
        testModal.classList.remove('show');
    });

    testForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const testData = {
            id: Date.now(),
            name: document.getElementById('testName').value,
            patient: document.getElementById('testPatient').value,
            price: document.getElementById('testPrice').value,
            status: document.getElementById('testStatus').value,
            date: new Date().toLocaleDateString()
        };
        tests.push(testData);
        localStorage.setItem('tests', JSON.stringify(tests));
        testForm.reset();
        testModal.classList.remove('show');
        displayTests();
        alert('Test added successfully!');
    });

    window.editTest = function (index) {
        const test = tests[index];
        const newName = prompt('Edit Test Name:', test.name);
        if (newName) {
            tests[index].name = newName;
            localStorage.setItem('tests', JSON.stringify(tests));
            displayTests();
        }
    };

    window.deleteTest = function (index) {
        if (confirm('Delete this test?')) {
            tests.splice(index, 1);
            localStorage.setItem('tests', JSON.stringify(tests));
            displayTests();
            alert('Test deleted!');
        }
    };

    displayTests();
}

// ============ SAMPLES PAGE FUNCTIONS ============
const samplesTableBody = document.getElementById('samplesTableBody');
const addSampleBtn = document.getElementById('addSampleBtn');
const sampleModal = document.getElementById('sampleModal');
const sampleForm = document.getElementById('sampleForm');

if (samplesTableBody) {
    function displaySamples(samplesToShow = samples) {
        samplesTableBody.innerHTML = '';
        if (samplesToShow.length === 0) {
            samplesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No samples found</td></tr>';
            return;
        }

        samplesToShow.forEach((sample, index) => {
            const row = document.createElement('tr');
            const sampleId = String(sample.id).slice(-3).padStart(3, '0');
            const statusClass = sample.status === 'Stored' ? 'status-active' : 'status-inactive';

            row.innerHTML = `
                <td>${sampleId}</td>
                <td>${sample.type}</td>
                <td>${sample.patient}</td>
                <td>${sample.date}</td>
                <td><span class="${statusClass}">${sample.status}</span></td>
                <td>${sample.quantity} ml</td>
                <td>
                    <div class="action-links">
                        <a href="#" onclick="editSample(${index}); return false;">Edit</a>
                        <span class="action-separator">/</span>
                        <a href="#" onclick="deleteSample(${index}); return false;">Delete</a>
                    </div>
                </td>
            `;
            samplesTableBody.appendChild(row);
        });
    }

    addSampleBtn.addEventListener('click', function () {
        sampleModal.classList.add('show');
    });

    document.getElementById('closeSampleModal').addEventListener('click', function () {
        sampleModal.classList.remove('show');
    });

    document.getElementById('cancelSampleBtn').addEventListener('click', function () {
        sampleModal.classList.remove('show');
    });

    sampleForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const sampleData = {
            id: Date.now(),
            type: document.getElementById('sampleType').value,
            patient: document.getElementById('samplePatient').value,
            date: document.getElementById('sampleDate').value,
            status: document.getElementById('sampleStatus').value,
            quantity: document.getElementById('sampleQuantity').value
        };
        samples.push(sampleData);
        localStorage.setItem('samples', JSON.stringify(samples));
        sampleForm.reset();
        sampleModal.classList.remove('show');
        displaySamples();
        alert('Sample added successfully!');
    });

    window.editSample = function (index) {
        const sample = samples[index];
        const newType = prompt('Edit Sample Type:', sample.type);
        if (newType) {
            samples[index].type = newType;
            localStorage.setItem('samples', JSON.stringify(samples));
            displaySamples();
        }
    };

    window.deleteSample = function (index) {
        if (confirm('Delete this sample?')) {
            samples.splice(index, 1);
            localStorage.setItem('samples', JSON.stringify(samples));
            displaySamples();
            alert('Sample deleted!');
        }
    };

    displaySamples();
}

// ============ DOCTOR PAGE FUNCTIONS ============
const doctorsTableBody = document.getElementById('doctorsTableBody');
const addDoctorBtn = document.getElementById('addDoctorBtn');
const doctorModal = document.getElementById('doctorModal');
const doctorForm = document.getElementById('doctorForm');

if (doctorsTableBody) {
    function displayDoctors(doctorsToShow = doctors) {
        doctorsTableBody.innerHTML = '';
        if (doctorsToShow.length === 0) {
            doctorsTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No doctors found</td></tr>';
            return;
        }

        doctorsToShow.forEach((doctor, index) => {
            const row = document.createElement('tr');
            const doctorId = String(doctor.id).slice(-3).padStart(3, '0');
            const statusClass = doctor.status === 'Active' ? 'status-active' : 'status-inactive';

            row.innerHTML = `
                <td>${doctorId}</td>
                <td>${doctor.name}</td>
                <td>${doctor.specialization}</td>
                <td>${doctor.phone}</td>
                <td>${doctor.email}</td>
                <td><span class="${statusClass}">${doctor.status}</span></td>
                <td>
                    <div class="action-links">
                        <a href="#" onclick="editDoctor(${index}); return false;">Edit</a>
                        <span class="action-separator">/</span>
                        <a href="#" onclick="deleteDoctor(${index}); return false;">Delete</a>
                    </div>
                </td>
            `;
            doctorsTableBody.appendChild(row);
        });
    }

    addDoctorBtn.addEventListener('click', function () {
        doctorModal.classList.add('show');
    });

    document.getElementById('closeDoctorModal').addEventListener('click', function () {
        doctorModal.classList.remove('show');
    });

    document.getElementById('cancelDoctorBtn').addEventListener('click', function () {
        doctorModal.classList.remove('show');
    });

    doctorForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const doctorData = {
            id: Date.now(),
            name: document.getElementById('doctorName').value,
            specialization: document.getElementById('doctorSpecialization').value,
            phone: document.getElementById('doctorPhone').value,
            email: document.getElementById('doctorEmail').value,
            status: document.getElementById('doctorStatus').value
        };
        doctors.push(doctorData);
        localStorage.setItem('doctors', JSON.stringify(doctors));
        doctorForm.reset();
        doctorModal.classList.remove('show');
        displayDoctors();
        alert('Doctor added successfully!');
    });

    window.editDoctor = function (index) {
        const doctor = doctors[index];
        const newName = prompt('Edit Doctor Name:', doctor.name);
        if (newName) {
            doctors[index].name = newName;
            localStorage.setItem('doctors', JSON.stringify(doctors));
            displayDoctors();
        }
    };

    window.deleteDoctor = function (index) {
        if (confirm('Delete this doctor?')) {
            doctors.splice(index, 1);
            localStorage.setItem('doctors', JSON.stringify(doctors));
            displayDoctors();
            alert('Doctor deleted!');
        }
    };

    displayDoctors();
}

// ============ COMMON FUNCTIONS ============

// View Patient - Open Modal
window.viewPatient = function (index) {
    const patient = patients[index];
    const totalCost = patient.totalCost || patient.bill || 0;
    const paidAmount = patient.paidAmount || 0;
    const remaining = totalCost - paidAmount;
    const secretary = patient.secretary || patient.tests || 'N/A';
    const status = patient.status || 'Active';
    const registeredDate = patient.now_date ? new Date(patient.now_date).toLocaleDateString() : '-';
    const patientId = String(patient.id).slice(-3).padStart(3, '0');

    // Populate modal
    document.getElementById('viewPatientId').textContent = patientId;
    document.getElementById('viewPatientName').textContent = patient.name;
    document.getElementById('viewPatientAge').textContent = patient.age + ' years';
    document.getElementById('viewPatientPhone').textContent = patient.phone;
    document.getElementById('viewPatientSecretary').textContent = secretary;
    document.getElementById('viewPatientStatus').textContent = status;
    document.getElementById('viewPatientTotal').textContent = `$${parseFloat(totalCost).toFixed(2)}`;
    document.getElementById('viewPatientPaid').textContent = `$${parseFloat(paidAmount).toFixed(2)}`;
    document.getElementById('viewPatientRemaining').textContent = `$${parseFloat(remaining).toFixed(2)}`;
    document.getElementById('viewPatientDate').textContent = registeredDate;

    // Show modal
    document.getElementById('viewPatientModal').classList.add('show');
};

// Edit Patient - Open Modal
let currentEditIndex = null;

window.editPatient = function (index) {
    currentEditIndex = index;
    const patient = patients[index];
    const totalCost = patient.totalCost || patient.bill || 0;
    const secretary = patient.secretary || patient.tests || '';
    const status = patient.status || 'Active';

    // Populate form
    document.getElementById('editPatientName').value = patient.name;
    document.getElementById('editPatientAge').value = patient.age;
    document.getElementById('editPatientPhone').value = patient.phone;
    document.getElementById('editPatientSecretary').value = secretary;
    document.getElementById('editPatientTotal').value = parseFloat(totalCost).toFixed(2);
    document.getElementById('editPatientStatus').value = status;

    // Show modal
    document.getElementById('editPatientModal').classList.add('show');
};

// Delete Patient
window.deletePatient = function (index) {
    if (confirm('Are you sure you want to delete this patient?')) {
        patients.splice(index, 1);
        localStorage.setItem('patients', JSON.stringify(patients));
        displayPatients();
        alert('Patient deleted successfully!');
    }
};

// ============ PAYMENT MODAL FUNCTIONS ============
let currentPatientIndex = null;

window.openPaymentModal = function (index) {
    currentPatientIndex = index;
    const patient = patients[index];
    const paymentModal = document.getElementById('paymentModal');

    // Handle legacy data
    const totalCost = patient.totalCost || patient.bill || 0;
    const paidAmount = patient.paidAmount || 0;
    const remaining = totalCost - paidAmount;

    // Update modal content
    document.getElementById('paymentPatientName').textContent = patient.name;
    document.getElementById('paymentPatientId').textContent = String(patient.id).slice(-3).padStart(3, '0');
    document.getElementById('totalCost').textContent = `$${parseFloat(totalCost).toFixed(2)}`;
    document.getElementById('paidAmount').textContent = `$${parseFloat(paidAmount).toFixed(2)}`;
    document.getElementById('remainingAmount').textContent = `$${parseFloat(remaining).toFixed(2)}`;

    // Show modal
    document.getElementById('paymentError').style.display = 'none';
    paymentModal.classList.add('show');
};

// Close payment modal
const closePaymentModal = document.getElementById('closePaymentModal');
const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
const paymentModal = document.getElementById('paymentModal');

if (closePaymentModal) {
    closePaymentModal.addEventListener('click', function () {
        paymentModal.classList.remove('show');
        document.getElementById('paymentInput').value = '';
    });
}

if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener('click', function () {
        paymentModal.classList.remove('show');
        document.getElementById('paymentInput').value = '';
    });
}

// Handle payment form submission
const paymentForm = document.getElementById('paymentForm');
if (paymentForm) {
    paymentForm.addEventListener('submit', function (e) {
        e.preventDefault();

        if (currentPatientIndex === null) return;

        const paymentInput = parseFloat(document.getElementById('paymentInput').value);

        const errorDiv = document.getElementById('paymentError');
        errorDiv.style.display = 'none';

        if (!paymentInput || paymentInput <= 0) {
            errorDiv.textContent = 'Please enter a valid payment amount!';
            errorDiv.style.display = 'block';
            return;
        }

        const patient = patients[currentPatientIndex];
        const totalCost = patient.totalCost || patient.bill || 0;
        const currentPaid = patient.paidAmount || 0;
        const remaining = totalCost - currentPaid;

        if (paymentInput > remaining) {
            errorDiv.textContent = `Payment cannot exceed remaining balance ($${remaining.toFixed(2)})`;
            errorDiv.style.display = 'block';
            return;
        }

        // Update patient payment
        patients[currentPatientIndex].paidAmount = currentPaid + paymentInput;

        // Migrate legacy data
        if (!patients[currentPatientIndex].totalCost && patients[currentPatientIndex].bill) {
            patients[currentPatientIndex].totalCost = parseFloat(patients[currentPatientIndex].bill);
        }

        // Save to localStorage
        localStorage.setItem('patients', JSON.stringify(patients));

        // Update modal display
        const newPaid = patients[currentPatientIndex].paidAmount;
        const newRemaining = totalCost - newPaid;

        document.getElementById('paidAmount').textContent = `$${parseFloat(newPaid).toFixed(2)}`;
        document.getElementById('remainingAmount').textContent = `$${parseFloat(newRemaining).toFixed(2)}`;

        // Clear input
        document.getElementById('paymentInput').value = '';

        // Refresh table
        displayPatients();

        alert(`Payment of $${paymentInput.toFixed(2)} added successfully!\nRemaining balance: $${newRemaining.toFixed(2)}`);
    });
}

// ============ VIEW PATIENT MODAL HANDLERS ============
const viewPatientModal = document.getElementById('viewPatientModal');
const closeViewModal = document.getElementById('closeViewModal');
const closeViewBtn = document.getElementById('closeViewBtn');

if (closeViewModal) {
    closeViewModal.addEventListener('click', function () {
        viewPatientModal.classList.remove('show');
    });
}

if (closeViewBtn) {
    closeViewBtn.addEventListener('click', function () {
        viewPatientModal.classList.remove('show');
    });
}

// ============ EDIT PATIENT MODAL HANDLERS ============
const editPatientModal = document.getElementById('editPatientModal');
const closeEditModal = document.getElementById('closeEditModal');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editPatientForm = document.getElementById('editPatientForm');

if (closeEditModal) {
    closeEditModal.addEventListener('click', function () {
        editPatientModal.classList.remove('show');
        currentEditIndex = null;
    });
}

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', function () {
        editPatientModal.classList.remove('show');
        currentEditIndex = null;
    });
}

if (editPatientForm) {
    editPatientForm.addEventListener('submit', function (e) {
        e.preventDefault();

        if (currentEditIndex === null) return;

        // Get form values
        const updatedData = {
            name: document.getElementById('editPatientName').value,
            age: document.getElementById('editPatientAge').value,
            phone: document.getElementById('editPatientPhone').value,
            secretary: document.getElementById('editPatientSecretary').value,
            totalCost: parseFloat(document.getElementById('editPatientTotal').value),
            status: document.getElementById('editPatientStatus').value
        };

        // Update patient
        patients[currentEditIndex] = {
            ...patients[currentEditIndex],
            ...updatedData
        };

        // Save to localStorage
        localStorage.setItem('patients', JSON.stringify(patients));

        // Close modal
        editPatientModal.classList.remove('show');
        currentEditIndex = null;

        // Refresh table
        displayPatients();

        alert('Patient information updated successfully!');
    });
}

// Sidebar menu navigation
document.querySelectorAll('.sidebar-menu a').forEach(link => {
    link.addEventListener('click', function (e) {
        if (this.getAttribute('href').startsWith('#')) {
            e.preventDefault();
        }
    });
});

// Logout
if (logoutBtn) {
    logoutBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            console.log('Logged out');
            alert('Logged out successfully!');
        }
    });
}

// Sidebar toggle
document.querySelector('.chevron').addEventListener('click', function () {
    const sidebar = document.querySelector('.sidebar');
    sidebar.style.width = sidebar.style.width === '0px' ? '268px' : '0px';
});