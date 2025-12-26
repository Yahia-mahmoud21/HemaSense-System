// Create Report Page - API Integration
// Handles loading patient data, submitting reports, AI prediction, and chat

let currentUser = null;
let currentPatient = null;
let patientId = null;

// Initialize page
async function initCreateReportPage() {
    try {
        // Check if user is doctor
        currentUser = await Utils.requireDoctor();
        if (!currentUser) return;

        // Get patient ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        patientId = urlParams.get('patient_id') || getPatientIdFromPath();

        if (!patientId) {
            alert('No patient ID provided');
            window.location.href = '/reports/pending';
            return;
        }

        // Load patient data
        await loadPatientData();

        // Initialize AI chat
        initializeAIChat();
    } catch (error) {
        console.error('Create report page initialization error:', error);
        Utils.showError('Failed to initialize page');
    }
}

// Get patient ID from path (for /reports/create/{id} format)
function getPatientIdFromPath() {
    const path = window.location.pathname;
    const match = path.match(/\/reports\/create\/(\d+)/);
    return match ? match[1] : null;
}

// Load patient data
async function loadPatientData() {
    try {
        currentPatient = await PatientAPI.getById(patientId);

        // Populate patient info header
        const patientIdStr = String(currentPatient.patient_id).padStart(3, '0');
        const currentDate = new Date().toISOString().split('T')[0];

        document.getElementById('patientId').textContent = `#${patientIdStr}`;
        document.getElementById('patientName').textContent = currentPatient.name;
        document.getElementById('patientAge').textContent = `${currentPatient.age} years`;
        document.getElementById('patientPhone').textContent = currentPatient.phone;
        document.getElementById('patientDate').textContent = currentDate;
    } catch (error) {
        console.error('Error loading patient:', error);
        Utils.showError('Failed to load patient data');
    }
}

// Handle report submission
function setupReportForm() {
    const cbcForm = document.getElementById('cbcForm');

    // Track input changes
    const inputs = document.querySelectorAll('.cbc-input-group input');
    inputs.forEach(input => {
        input.addEventListener('input', function () {
            if (this.value) {
                this.classList.add('changed');
            } else {
                this.classList.remove('changed');
            }
        });
    });

    // Save report button (we'll add this functionality)
    const saveReportBtn = document.createElement('button');
    saveReportBtn.type = 'button';
    saveReportBtn.className = 'action-btn action-btn-predict';
    saveReportBtn.innerHTML = '<i class="fa-solid fa-save"></i><span>Save Report</span>';
    saveReportBtn.addEventListener('click', saveReport);

    const actionFooter = document.querySelector('.action-footer');
    if (actionFooter) {
        actionFooter.insertBefore(saveReportBtn, actionFooter.firstChild);
    }
}

// Save report to backend
async function saveReport() {
    const form = document.getElementById('cbcForm');
    if (!form.checkValidity()) {
        alert('Please fill in all CBC values');
        return;
    }

    try {
        const reportData = {
            patient_id: parseInt(patientId),
            WBC: parseFloat(document.getElementById('wbc').value),
            RBC: parseFloat(document.getElementById('rbc').value),
            HGB: parseFloat(document.getElementById('hgb').value),
            HCT: parseFloat(document.getElementById('hct').value),
            MCV: parseFloat(document.getElementById('mcv').value),
            MCH: parseFloat(document.getElementById('mch').value),
            MCHC: parseFloat(document.getElementById('mchc').value),
            PLT: parseFloat(document.getElementById('plt').value),
            Diagnosis: document.getElementById('diagnosisLabel')?.textContent || 'Pending'
        };

        const response = await ReportAPI.create(reportData);

        if (response.success) {
            alert('Report saved successfully!');
            window.location.href = '/reports/pending';
        }
    } catch (error) {
        console.error('Error saving report:', error);
        Utils.showError('Failed to save report: ' + error.message);
    }
}

// Predict diagnosis
function setupPredictButton() {
    const predictBtn = document.getElementById('predictBtn');
    if (predictBtn) {
        predictBtn.addEventListener('click', async function () {
            const form = document.getElementById('cbcForm');
            if (!form.checkValidity()) {
                alert('Please fill in all CBC values');
                return;
            }

            const modal = document.getElementById('predictionModal');
            const spinner = document.getElementById('loadingSpinner');
            const result = document.getElementById('predictionResult');

            modal.classList.add('show');
            spinner.classList.add('show');
            result.style.display = 'none';

            try {
                const cbcData = {
                    WBC: parseFloat(document.getElementById('wbc').value),
                    RBC: parseFloat(document.getElementById('rbc').value),
                    HGB: parseFloat(document.getElementById('hgb').value),
                    HCT: parseFloat(document.getElementById('hct').value),
                    MCV: parseFloat(document.getElementById('mcv').value),
                    MCH: parseFloat(document.getElementById('mch').value),
                    MCHC: parseFloat(document.getElementById('mchc').value),
                    PLT: parseFloat(document.getElementById('plt').value)
                };

                const prediction = await AIAPI.predict(cbcData);

                spinner.classList.remove('show');
                result.style.display = 'block';

                const diagnosis = prediction.diagnosis || 'Normal';
                const confidence = Math.round((prediction.confidence || 0.85) * 100);

                document.getElementById('diagnosisLabel').textContent = diagnosis;
                document.getElementById('confidenceText').textContent = `Confidence: ${confidence}%`;
                document.getElementById('confidenceFill').style.width = `${confidence}%`;

                // Update diagnosis class
                const label = document.getElementById('diagnosisLabel');
                label.className = 'diagnosis-label';
                if (diagnosis.toLowerCase().includes('normal')) {
                    label.classList.add('diagnosis-normal');
                } else if (diagnosis.toLowerCase().includes('anemia') || diagnosis.toLowerCase().includes('critical')) {
                    label.classList.add('diagnosis-critical');
                } else {
                    label.classList.add('diagnosis-warning');
                }
            } catch (error) {
                console.error('Prediction error:', error);
                spinner.classList.remove('show');
                alert('Failed to get prediction: ' + error.message);
                modal.classList.remove('show');
            }
        });
    }

    // Close modal
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function () {
            document.getElementById('predictionModal').classList.remove('show');
        });
    }
}

// Print preview
function setupPrintButton() {
    const printBtn = document.getElementById('printBtn');
    if (printBtn) {
        printBtn.addEventListener('click', function () {
            const form = document.getElementById('cbcForm');
            if (!form.checkValidity()) {
                alert('Please fill in all CBC values before printing');
                return;
            }

            const cbcData = {
                wbc: document.getElementById('wbc').value,
                rbc: document.getElementById('rbc').value,
                hgb: document.getElementById('hgb').value,
                hct: document.getElementById('hct').value,
                mcv: document.getElementById('mcv').value,
                mch: document.getElementById('mch').value,
                mchc: document.getElementById('mchc').value,
                plt: document.getElementById('plt').value
            };

            sessionStorage.setItem('cbcData', JSON.stringify(cbcData));
            window.location.href = `/reports/print/${patientId}`;
        });
    }
}

// WhatsApp button
function setupWhatsAppButton() {
    const whatsappBtn = document.getElementById('whatsappBtn');
    if (whatsappBtn) {
        whatsappBtn.addEventListener('click', function () {
            const form = document.getElementById('cbcForm');
            if (!form.checkValidity()) {
                alert('Please fill in all CBC values');
                return;
            }
            alert(`PDF will be generated and sent to patient phone number: ${currentPatient.phone}`);
        });
    }
}

// Get CBC data if form is filled
function getCBCDataIfAvailable() {
    try {
        const wbc = document.getElementById('wbc')?.value?.trim();
        const rbc = document.getElementById('rbc')?.value?.trim();
        const hgb = document.getElementById('hgb')?.value?.trim();
        const hct = document.getElementById('hct')?.value?.trim();
        const mcv = document.getElementById('mcv')?.value?.trim();
        const mch = document.getElementById('mch')?.value?.trim();
        const mchc = document.getElementById('mchc')?.value?.trim();
        const plt = document.getElementById('plt')?.value?.trim();

        console.log('CBC Form values:', { wbc, rbc, hgb, hct, mcv, mch, mchc, plt });

        // Check if all fields have valid numeric values
        const values = {
            wbc: wbc ? parseFloat(wbc) : null,
            rbc: rbc ? parseFloat(rbc) : null,
            hgb: hgb ? parseFloat(hgb) : null,
            hct: hct ? parseFloat(hct) : null,
            mcv: mcv ? parseFloat(mcv) : null,
            mch: mch ? parseFloat(mch) : null,
            mchc: mchc ? parseFloat(mchc) : null,
            plt: plt ? parseFloat(plt) : null
        };

        console.log('Parsed CBC values:', values);

        // Check if all fields are filled and valid numbers
        const allFilled = Object.values(values).every(v => v !== null && !isNaN(v));
        
        if (allFilled) {
            const cbcData = {
                WBC: values.wbc,
                RBC: values.rbc,
                HGB: values.hgb,
                HCT: values.hct,
                MCV: values.mcv,
                MCH: values.mch,
                MCHC: values.mchc,
                PLT: values.plt
            };
            console.log('Returning CBC data:', cbcData);
            return cbcData;
        } else {
            console.log('Not all CBC fields are filled. Missing:', 
                Object.entries(values)
                    .filter(([k, v]) => v === null || isNaN(v))
                    .map(([k]) => k)
            );
        }
    } catch (error) {
        console.error('Error getting CBC data:', error);
    }
    return null;
}

// Initialize AI Chat
function initializeAIChat() {
    const chatWindow = document.getElementById('chatWindow');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    if (!chatWindow || !chatInput || !sendBtn) return;

    // Welcome message
    addMessage('assistant', 'Hello! I am your AI Medical Assistant. I can help analyze test results or answer general medical questions. How can I assist you?');

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage('user', message);
        chatInput.value = '';

        // Show typing indicator
        const typingId = addTypingIndicator();

        try {
            // Get CBC data if form is filled
            console.log('=== Attempting to get CBC data ===');
            const cbcData = getCBCDataIfAvailable();
            console.log('CBC Data retrieved:', cbcData);
            console.log('CBC Data type:', typeof cbcData);
            console.log('CBC Data is null:', cbcData === null);
            console.log('CBC Data is undefined:', cbcData === undefined);
            console.log('CBC Data truthy check:', !!cbcData);
            
            // Call AI streaming endpoint
            const requestBody = { prompt: message };
            console.log('Initial request body:', requestBody);
            
            if (cbcData !== null && cbcData !== undefined) {
                requestBody.cbc_data = cbcData;
                console.log('✓ Including CBC data in request');
                console.log('CBC data being sent:', requestBody.cbc_data);
            } else {
                console.log('✗ No CBC data available - form may not be filled or incomplete');
                console.log('Form elements check:');
                ['wbc', 'rbc', 'hgb', 'hct', 'mcv', 'mch', 'mchc', 'plt'].forEach(id => {
                    const el = document.getElementById(id);
                    console.log(`  ${id}:`, el ? (el.value || '(empty)') : '(not found)');
                });
            }
            
            console.log('Final request body:', JSON.stringify(requestBody, null, 2));
            
            const response = await fetch(`${API_BASE_URL}/api/ai/diagnosis/stream`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error('Chat request failed');
            }

            // Remove typing indicator
            removeTypingIndicator(typingId);

            // Create message container for streaming text
            const messageDiv = document.createElement('div');
            messageDiv.className = 'chat-message assistant';

            const avatar = document.createElement('div');
            avatar.className = 'chat-avatar';
            avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';

            const bubble = document.createElement('div');
            bubble.className = 'chat-bubble';

            messageDiv.appendChild(avatar);
            messageDiv.appendChild(bubble);
            chatWindow.appendChild(messageDiv);

            // Read the stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                bubble.innerHTML = parseMarkdown(fullText);
                chatWindow.scrollTop = chatWindow.scrollHeight;
            }

        } catch (error) {
            console.error('Chat Error:', error);
            removeTypingIndicator(typingId);
            addMessage('assistant', 'Unable to connect to AI server. Please ensure the backend is running.');
        }
    }

    function addMessage(role, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${role}`;

        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        avatar.innerHTML = role === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerHTML = parseMarkdown(text);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        chatWindow.appendChild(messageDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message assistant typing-indicator-msg';
        typingDiv.id = 'typing-' + Date.now();

        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        avatar.innerHTML = '<i class="fa-solid fa-robot"></i>';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';

        typingDiv.appendChild(avatar);
        typingDiv.appendChild(bubble);
        chatWindow.appendChild(typingDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        return typingDiv.id;
    }

    function removeTypingIndicator(id) {
        const typing = document.getElementById(id);
        if (typing) typing.remove();
    }

    function parseMarkdown(text) {
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.+?)_/g, '<em>$1</em>');
        html = html.replace(/`(.+?)`/g, '<code>$1</code>');
        html = html.replace(/\n/g, '<br>');
        html = html.replace(/^- (.+)$/gm, '<li>$1</li>');

        return html;
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
    await initCreateReportPage();
    setupReportForm();
    setupPredictButton();
    setupPrintButton();
    setupWhatsAppButton();
    setupLogout();
});
