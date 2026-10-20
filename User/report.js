/* 0. DATE LIMITS: from 2025-01-01 up to today (no future dates) */
const MIN_INCIDENT_DATE = '2025-01-01';

function todayLocalISO() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowHM() {
    const n = new Date();
    return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
}

/* Time can't be later than "now" when the chosen date is today */
function setupIncidentTimeLimit() {
    const dateInput = document.querySelector('input[name="incidentDate"]');
    const timeInput = document.querySelector('input[name="incidentTime"]');
    if (!dateInput || !timeInput) return;

    const sync = () => {
        if (dateInput.value === todayLocalISO()) {
            timeInput.max = nowHM();          // native limit: blocks submit + greys picker
        } else {
            timeInput.removeAttribute('max'); // past dates: any time of day is fine
        }
    };

    const enforce = () => {
        sync();
        if (timeInput.max && timeInput.value && timeInput.value > timeInput.max) {
            showCustomAlert("Invalid Time", "The time can't be later than the current time."); // ✅ Custom Modal na
            timeInput.value = '';
        }
    };

    dateInput.addEventListener('change', enforce);
    dateInput.addEventListener('input', sync);
    timeInput.addEventListener('focus', sync);
    timeInput.addEventListener('change', enforce);
    timeInput.addEventListener('blur', enforce);
    setInterval(sync, 30000);                 
    sync();
}

function setupIncidentDateLimits() {
    const dateInput = document.querySelector('input[name="incidentDate"]');
    if (!dateInput) return;

    const applyLimits = () => {
        dateInput.min = MIN_INCIDENT_DATE;
        dateInput.max = todayLocalISO(); 
    };
    applyLimits();

    dateInput.addEventListener('change', () => {
        applyLimits();
        const v = dateInput.value;
        if (v && (v < dateInput.min || v > dateInput.max)) {
            showCustomAlert("Invalid Date", "Please choose a date from Jan 1, 2025 up to today only."); 
            dateInput.value = '';
        }
    });
}

/* Words that suggest the photo shows real money / an ID or document */
const MONEY_REGEX = /\b(money|cash|banknotes?|bills?\s+of|pesos?|pera|salapi|paper\s+money|coins?)\b|₱|\bphp\s?\d/i;
const ID_DOC_REGEX = /\b(id|i\.d\.|passport|license|licence|driver'?s|umid|philhealth|sss|tin|voter'?s|national\s+id|philsys|birth\s+certificate|diploma|transcript|certificate|document)\b/i;

/* 1. IMAGE PREVIEW & REMOVE LOGIC */
document.addEventListener('DOMContentLoaded', () => {
    setupIncidentDateLimits();
    setupIncidentTimeLimit();
    const fileInput = document.getElementById('file-upload');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    const viewBtn = document.getElementById('viewImageBtn');
    
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    const closeModal = document.getElementById('closeModal');

    const maxSize = 5 * 1024 * 1024; // 5MB Limit (matches the server's multer limit)

    const categoryEl = document.querySelector('select[name="category"]');
    const itemNameEl = document.getElementById('itemName');
    const descEl = document.querySelector('textarea[name="description"]');
    const formEl = document.getElementById('mainForm');

    // Hidden flag sent to the server (server also re-checks this on its own)
    let sensitiveFlag = document.getElementById('isSensitiveImage');
    if (!sensitiveFlag && formEl) {
        sensitiveFlag = document.createElement('input');
        sensitiveFlag.type = 'hidden';
        sensitiveFlag.name = 'isSensitiveImage';
        sensitiveFlag.id = 'isSensitiveImage';
        sensitiveFlag.value = '0';
        formEl.appendChild(sensitiveFlag);
    }

    // Clears the chosen image and restores the empty upload box
    const resetImage = () => {
        if (fileInput) fileInput.value = '';
        if (imagePreview) imagePreview.src = '';
        if (previewContainer) previewContainer.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
        if (sensitiveFlag) sensitiveFlag.value = '0';
    };

    // Looks at what the reporter chose/typed to decide if the photo is risky
    const classifyUpload = () => {
        const category = categoryEl ? categoryEl.value.toLowerCase() : '';
        const text = `${itemNameEl ? itemNameEl.value : ''} ${descEl ? descEl.value : ''}`;
        if (MONEY_REGEX.test(text)) return 'money';
        if (category === 'id' || category === 'documents' || ID_DOC_REGEX.test(text)) return 'sensitive';
        return 'normal';
    };

    // Runs the warning popups and handles automatic RePeso fallback for money
    const checkUploadSafety = () => {
        const kind = classifyUpload();

        if (kind === 'money') {
            showCustomAlert(
                "Default Money Illustration Applied",
                "For safety and privacy, ReFoundly automatically displays the default Peso Image instead of real photos of cash. No actual money photo is needed."
            );
            
            // Clear any physical file attached to form data
            if (fileInput) fileInput.value = '';

            // Automatically set the preview box to show RePeso.png
            if (imagePreview) imagePreview.src = 'RePeso.png';
            if (placeholder) placeholder.style.display = 'none';
            if (previewContainer) previewContainer.style.display = 'block';
            
            if (sensitiveFlag) sensitiveFlag.value = '0';
            return false; // Handled via default illustration
        }

        if (kind === 'sensitive') {
            if (sensitiveFlag) sensitiveFlag.value = '1';
            showCustomAlert(
                "Image Will Be Blurred",
                "IDs and documents contain personal information. For security and fraud prevention, this image will be blurred automatically when the report is posted."
            );
        } else if (sensitiveFlag) {
            sensitiveFlag.value = '0';
        }
        return true;
    };

    // Re-check if they change category / name / description AFTER picking an image
    [categoryEl, itemNameEl, descEl].forEach(el => {
        if (el) el.addEventListener('change', checkUploadSafety);
    });

    if (fileInput) {
        // Handle File Selection
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Validation
                if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
                    showCustomAlert("Invalid File", "Only JPG and PNG files are allowed!");
                    fileInput.value = '';
                    return;
                }

                if (file.size > maxSize) {
                    showCustomAlert("File Too Big", "Please upload an image smaller than 5MB.");
                    fileInput.value = '';
                    return;
                }

                // Money/ID/document warnings (money rejects the image)
                if (!checkUploadSafety()) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    if (imagePreview) imagePreview.src = event.target.result;
                    if (placeholder) placeholder.style.display = 'none';
                    if (previewContainer) previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Remove Selected Image
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent opening file dialog
            resetImage();
        });
    }

    // View Image in Lightbox Modal
    if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (modal) modal.style.display = 'flex';
            if (modalImg && imagePreview) modalImg.src = imagePreview.src;
        });
    }

    // Close Modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (modal && e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

/* 2. FORM SUBMISSION LOGIC (MySQL Database Only) */
const mainForm = document.getElementById('mainForm');
if (mainForm) {
    mainForm.addEventListener('submit', async function(event) {
        event.preventDefault(); 
        
        const submitBtn = document.getElementById('btnSubmit');
        
        // GET CURRENT VALUES WITH SAFE GUARDS
        const itemNameElem = document.getElementById('itemName');
        const descElem = document.querySelector('textarea[name="description"]');
        const firstNameElem = document.getElementsByName('firstName')[0];
        const emailElem = document.getElementsByName('contactEmail')[0];

        const itemNameRaw = itemNameElem ? itemNameElem.value : '';
        const descRaw = descElem ? descElem.value : '';
        const firstName = firstNameElem ? firstNameElem.value : '';
        const emailValue = emailElem ? emailElem.value : '';

        // VALIDATION
        const namePattern = /^[a-zA-Z\s]+$/;
        if (!namePattern.test(firstName)) {
            alert("Please enter a valid name (letters only).");
            return;
        }
        if (!emailValue.includes('@')) {
            alert("Please enter a valid email address.");
            return;
        }

        // DATE / TIME VALIDATION (2025-01-01 up to today, never in the future)
        const dateEl = document.querySelector('input[name="incidentDate"]');
        const timeEl = document.querySelector('input[name="incidentTime"]');
        const today = todayLocalISO();
        if (dateEl && (dateEl.value < MIN_INCIDENT_DATE || dateEl.value > today)) {
            showCustomAlert("Invalid Date", "Please choose a date from Jan 1, 2025 up to today only."); // ✅ Custom Modal na
            return;
        }
        if (dateEl && timeEl && dateEl.value === today && timeEl.value) {
            if (timeEl.value > nowHM()) {
                alert("The time can't be later than the current time.");
                return;
            }
        }

        const maliciousRegex = /https?:\/\/|www\.|<script/i; 
        if (maliciousRegex.test(itemNameRaw) || maliciousRegex.test(descRaw)) {
            alert("Security Block: External links and scripts are strictly prohibited.");
            return; 
        }

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = "⏳ Saving Report...";
            }

            let csrfToken = '';
            try {
                const csrfResponse = await fetch('/api/csrf-token');
                if (csrfResponse.ok) {
                    const csrfData = await csrfResponse.json();
                    csrfToken = csrfData.csrfToken;
                }
            } catch (err) {
                console.warn("CSRF fetch skipped or failed.");
            }

            // PREPARE FORM DATA FOR MYSQL
            // (itemName/description are already included as typed via
            // `new FormData(this)` below — the server strips any HTML tags
            // before storage, so no client-side rewriting is needed here.)
            const formData = new FormData(this);

            // Include Accept header to force a JSON response
            const headers = {
                'Accept': 'application/json'
            };
            if (csrfToken) headers['CSRF-Token'] = csrfToken;

            const response = await fetch('/submit-report', { 
                method: 'POST',
                body: formData,
                headers: headers
            });

            // Check content type before parsing, to avoid "Unexpected token '<'" errors
            // when the server returns an HTML error page instead of JSON
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Your session has expired or a server error occurred. Please log in again and try again.");
            }

            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Server Error");

            showSuccessToast();

        } catch (error) {
            console.error("Submission Error:", error);
            alert("Submission Failed: " + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = "Submit Report";
            }
        }
    });
}

function showSuccessToast() {
    if (typeof showRefoundlyToast === 'function') {
        showRefoundlyToast(
            "Report Submitted!", 
            "Your report has been posted! We'll notify you if a possible match is found.", 
            "fa-solid fa-circle-check"
        );
        setTimeout(() => { window.location.href = "/dashboard.html"; }, 2500);
    } else {
        const toast = document.getElementById('custom-toast');
        if (toast) {
            toast.classList.remove('toast-hidden');
            toast.classList.add('toast-visible');
            setTimeout(() => { window.location.href = "/dashboard.html"; }, 3000);
        } else {
            alert("Report successfully submitted!");
            window.location.href = "/dashboard.html";
        }
    }
}

/* 3. AUTO-FILL & SESSION LOGIC */
window.onload = async () => {
    try {
        const response = await fetch('/user/me');
        if (response.ok) {
            const user = await response.json();
            
            if (user.name) {
                const fullName = user.name.trim();
                const firstNameElem = document.getElementsByName('firstName')[0];
                const lastNameElem = document.getElementsByName('lastName')[0];

                if (fullName.includes(',')) {
                    const parts = fullName.split(',');
                    if (lastNameElem) lastNameElem.value = parts[0].trim();
                    if (firstNameElem) firstNameElem.value = parts[1].trim();
                } else if (fullName.includes(' ')) {
                    const lastSpaceIndex = fullName.lastIndexOf(' ');
                    if (firstNameElem) firstNameElem.value = fullName.substring(0, lastSpaceIndex);
                    if (lastNameElem) lastNameElem.value = fullName.substring(lastSpaceIndex + 1);
                } else {
                    if (firstNameElem) firstNameElem.value = fullName;
                }
            }

            const emailElem = document.getElementsByName('contactEmail')[0];
            if (emailElem) emailElem.value = user.email || '';
            
            const phoneInput = document.getElementById('phoneNumber');
            if (phoneInput) {
                phoneInput.value = user.contact_number || '';
                phoneInput.addEventListener('input', function (e) {
                    this.value = this.value.replace(/[^0-9]/g, ''); 
                });
            }
        }
    } catch (error) {
        console.log("Session inactive.");
    }
};

function checkSession() {
    fetch('/user/me', { headers: { 'Accept': 'application/json' } })
    .then(response => {
        if (response.status === 401) {
            const modal = document.getElementById('session-alert');
            if (modal) modal.style.setProperty('display', 'flex', 'important');
        }
    })
    .catch(() => console.warn("Server connection offline."));
}
setInterval(checkSession, 10000);

function showCustomAlert(title, message) {
    const modal = document.getElementById('customWarningModal');
    const titleEl = document.getElementById('warningModalTitle');
    const msgEl = document.getElementById('warningModalMessage');
    
    if (titleEl) titleEl.innerText = title;
    if (msgEl) msgEl.innerText = message;
    if (modal) modal.style.display = 'flex';
}

function closeCustomWarning() {
    const modal = document.getElementById('customWarningModal');
    if (modal) modal.style.display = 'none';
}