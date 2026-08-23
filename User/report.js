function sanitizeInput(text) {
    const element = document.createElement('div');
    element.innerText = text;
    return element.innerHTML;
}

/* 1. IMAGE PREVIEW & REMOVE LOGIC */
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('file-upload');
    const placeholder = document.getElementById('uploadPlaceholder');
    const previewContainer = document.getElementById('previewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const removeBtn = document.getElementById('removeImageBtn');
    const viewBtn = document.getElementById('viewImageBtn');
    
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    const closeModal = document.getElementById('closeModal');

    const maxSize = 2 * 1024 * 1024; // 2MB Limit

    // Handle File Selection
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validation
            if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
                alert("Only JPG and PNG files are allowed!");
                fileInput.value = '';
                return;
            }

            if (file.size > maxSize) {
                alert("File is too big! Please upload an image smaller than 2MB.");
                fileInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                imagePreview.src = event.target.result;
                placeholder.style.display = 'none';
                previewContainer.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Remove Selected Image
    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent opening file dialog
            fileInput.value = ''; // Reset input
            imagePreview.src = '';
            previewContainer.style.display = 'none';
            placeholder.style.display = 'flex';
        });
    }

    // View Image in Lightbox Modal
    if (viewBtn) {
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modal.style.display = 'flex';
            modalImg.src = imagePreview.src;
        });
    }

    // Close Modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

/* 2. FORM SUBMISSION LOGIC (MySQL Database Only) */
document.getElementById('mainForm').addEventListener('submit', async function(event) {
    event.preventDefault(); 
    
    const submitBtn = document.getElementById('btnSubmit');
    
    // GET CURRENT VALUES
    const itemNameRaw = document.getElementById('itemName').value;
    const descRaw = document.querySelector('textarea[name="description"]').value;
    const firstName = document.getElementsByName('firstName')[0].value;
    const emailValue = document.getElementsByName('contactEmail')[0].value;

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

    const maliciousRegex = /https?:\/\/|www\.|<script/i; 
    if (maliciousRegex.test(itemNameRaw) || maliciousRegex.test(descRaw)) {
        alert("Security Block: External links and scripts are strictly prohibited.");
        return; 
    }
        
    const sanitizedItemName = sanitizeInput(itemNameRaw);
    const sanitizedDesc = sanitizeInput(descRaw);

    try {
        submitBtn.disabled = true;
        submitBtn.innerText = "⏳ Saving Report...";

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
        const formData = new FormData(this);
        formData.set('itemName', sanitizedItemName);
        formData.set('description', sanitizedDesc);

        // 🟢 BINAGO: Isinama ang Accept header para piliting JSON response ang ibalik
        const headers = {
            'Accept': 'application/json'
        };
        if (csrfToken) headers['CSRF-Token'] = csrfToken;

        const response = await fetch('/submit-report', { 
            method: 'POST',
            body: formData,
            headers: headers
        });

        // 🟢 BINAGO: Sini-check muna kung JSON ang content bago mag-.json() para iwas Unexpected token '<' error
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Expired na ang session o may server error. Mag-login ulit bago subukan uli.");
        }

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Server Error");

        showSuccessToast();

    } catch (error) {
        console.error("Submission Error:", error);
        alert("Submission Failed: " + error.message);
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Report";
    }
});

function showSuccessToast() {
    const toast = document.getElementById('custom-toast');
    if (toast) {
        toast.classList.remove('toast-hidden');
        toast.classList.add('toast-visible');

        setTimeout(() => {
            toast.classList.remove('toast-visible');
            toast.classList.add('toast-hidden');
            window.location.href = "/dashboard.html";
        }, 3000);
    } else {
        alert("Report successfully submitted!");
        window.location.href = "/dashboard.html";
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
                
                if (fullName.includes(',')) {
                    // Kapag nakasulat sa DB nang: "Dela Cruz, Juan"
                    const parts = fullName.split(',');
                    document.getElementsByName('lastName')[0].value = parts[0].trim();
                    document.getElementsByName('firstName')[0].value = parts[1].trim();
                } else if (fullName.includes(' ')) {
                    // Kapag nakasulat sa DB nang: "Juan Dela Cruz"
                    const lastSpaceIndex = fullName.lastIndexOf(' ');
                    document.getElementsByName('firstName')[0].value = fullName.substring(0, lastSpaceIndex);
                    document.getElementsByName('lastName')[0].value = fullName.substring(lastSpaceIndex + 1);
                } else {
                    document.getElementsByName('firstName')[0].value = fullName;
                }
            }

            document.getElementsByName('contactEmail')[0].value = user.email || '';
            
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

// Burahin ang pangalawang showSuccessToast() sa dulo at gamitin ito:
function showSuccessToast() {
    if (typeof showRefoundlyToast === 'function') {
        showRefoundlyToast(
            "Report Submitted!", 
            "Na-post na ang report mo! Bibigyan ka namin ng notification kapag may natagpuang match.", 
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