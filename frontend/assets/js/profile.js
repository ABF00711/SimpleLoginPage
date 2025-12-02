/**
 * Profile Page Handler
 * Manages user profile settings including 2FA toggle
 */

// Initialize profile page - can be called immediately or after DOM is ready
function initProfilePage() {
    console.log("Initializing profile page...");
    
    const mfaToggle = document.getElementById("mfa-toggle");
    const message = document.getElementById("profile-message");
    const setupModal = document.getElementById("mfa-setup-modal");
    const closeBtn = document.getElementById("mfa-close-btn");
    const doneBtn = document.getElementById("mfa-setup-done-btn");
    const qrCodeElement = document.getElementById("qr-code-image");
    const secretText = document.getElementById("secret-text");
    const secretContainer = document.querySelector(".secret-container");
    const copySecretBtn = document.getElementById("copy-secret-btn");
    
    // User info form elements
    const userInfoForm = document.getElementById("user-info-form");
    const usernameInput = document.getElementById("username-input");
    const emailInput = document.getElementById("email-input");
    const userInfoMessage = document.getElementById("user-info-message");
    
    // Password change form elements
    const passwordChangeForm = document.getElementById("password-change-form");
    const currentPasswordInput = document.getElementById("current-password-input");
    const newPasswordInput = document.getElementById("new-password-input");
    const confirmPasswordInput = document.getElementById("confirm-password-input");
    const passwordChangeMessage = document.getElementById("password-change-message");
    
    if (!mfaToggle) {
        console.error("MFA toggle not found, retrying...");
        // Retry after a short delay if element not found (for dynamic loading)
        setTimeout(initProfilePage, 100);
        return;
    }
    
    console.log("MFA toggle found:", mfaToggle);
    
    // Load current user info
    loadUserInfo();
    
    // Load current 2FA status
    loadMFAStatus();
    
    // Handle user info form submission
    if (userInfoForm) {
        userInfoForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await updateUserInfo();
        });
    }
    
    // Handle password change form submission
    if (passwordChangeForm) {
        passwordChangeForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await changePassword();
        });
    }
    
    // Handle 2FA toggle - standard checkbox change event
    mfaToggle.addEventListener("change", async (e) => {
        console.log("MFA toggle changed:", e);
        console.log("Checked state:", mfaToggle.checked);
        const enabled = mfaToggle.checked;
        await toggle2FA(enabled);
    });
    
    // Also handle click event as backup (in case change doesn't fire)
    mfaToggle.addEventListener("click", (e) => {
        console.log("MFA toggle clicked, checked:", mfaToggle.checked);
    });
    
    // Close modal handlers
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            hideSetupModal();
        });
    }
    
    if (setupModal) {
        setupModal.addEventListener("click", (e) => {
            if (e.target === setupModal) {
                hideSetupModal();
            }
        });
    }
    
    // Done button - close modal
    if (doneBtn) {
        doneBtn.addEventListener("click", () => {
            hideSetupModal();
        });
    }
    
    // Copy secret button
    if (copySecretBtn) {
        copySecretBtn.addEventListener("click", () => {
            const secret = secretText.textContent;
            if (secret) {
                navigator.clipboard.writeText(secret).then(() => {
                    copySecretBtn.textContent = "Copied!";
                    setTimeout(() => {
                        copySecretBtn.textContent = "Copy";
                    }, 2000);
                }).catch(err => {
                    console.error("Failed to copy secret:", err);
                    // Fallback: select text
                    const range = document.createRange();
                    range.selectNodeContents(secretText);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                    try {
                        document.execCommand('copy');
                        copySecretBtn.textContent = "Copied!";
                        setTimeout(() => {
                            copySecretBtn.textContent = "Copy";
                        }, 2000);
                    } catch (err) {
                        console.error("Fallback copy failed:", err);
                    }
                });
            }
        });
    }
    
    /**
     * Load current user information from server
     */
    async function loadUserInfo() {
        try {
            const response = await fetch("./backend/profile.php?action=getUserInfo");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Populate form fields
                if (usernameInput) {
                    usernameInput.value = result.username || "";
                }
                if (emailInput) {
                    emailInput.value = result.email || "";
                }
            } else {
                console.error("Failed to load user info:", result.message);
            }
        } catch (error) {
            console.error("Error loading user info:", error);
        }
    }
    
    /**
     * Update user information
     */
    async function updateUserInfo() {
        if (!userInfoMessage) return;
        
        // Clear previous messages
        userInfoMessage.textContent = "";
        userInfoMessage.style.color = "";
        userInfoMessage.className = "profile-message";
        
        // Get values from Smart UI inputs
        const username = usernameInput?.value || usernameInput?.getValue?.() || "";
        const email = emailInput?.value || emailInput?.getValue?.() || "";
        
        // Validate inputs
        if (!username.trim() || !email.trim()) {
            userInfoMessage.textContent = "Username and email are required";
            userInfoMessage.style.color = "red";
            userInfoMessage.className = "profile-message error";
            return;
        }
        
        try {
            const response = await fetch("./backend/profile.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action: "updateUserInfo",
                    username: username.trim(),
                    email: email.trim()
                })
            });
            
            // Parse JSON response (even if status is not ok, backend returns JSON)
            const responseText = await response.text();
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                // If JSON parsing fails, show generic error
                console.error("Failed to parse response:", responseText, parseError);
                userInfoMessage.textContent = "Server error, please try again later.";
                userInfoMessage.style.color = "red";
                userInfoMessage.className = "profile-message error";
                return;
            }
            
            if (result.success) {
                userInfoMessage.textContent = result.message || "User information updated successfully";
                userInfoMessage.style.color = "green";
                userInfoMessage.className = "profile-message success";
            } else {
                // Show the specific error message from server
                userInfoMessage.textContent = result.message || "Failed to update user information";
                userInfoMessage.style.color = "red";
                userInfoMessage.className = "profile-message error";
            }
        } catch (error) {
            console.error("Error updating user info:", error);
            userInfoMessage.textContent = "Server error, please try again later.";
            userInfoMessage.style.color = "red";
            userInfoMessage.className = "profile-message error";
        }
    }
    
    /**
     * Change password
     */
    async function changePassword() {
        if (!passwordChangeMessage) return;
        
        // Clear previous messages
        passwordChangeMessage.textContent = "";
        passwordChangeMessage.style.color = "";
        passwordChangeMessage.className = "profile-message";
        
        // Get values from Smart UI inputs
        const currentPassword = currentPasswordInput?.value || currentPasswordInput?.getValue?.() || "";
        const newPassword = newPasswordInput?.value || newPasswordInput?.getValue?.() || "";
        const confirmPassword = confirmPasswordInput?.value || confirmPasswordInput?.getValue?.() || "";
        
        // Validate inputs
        if (!currentPassword || !newPassword || !confirmPassword) {
            passwordChangeMessage.textContent = "All password fields are required";
            passwordChangeMessage.style.color = "red";
            passwordChangeMessage.className = "profile-message error";
            return;
        }
        
        // Check if passwords match
        if (newPassword !== confirmPassword) {
            passwordChangeMessage.textContent = "New password and confirmation do not match";
            passwordChangeMessage.style.color = "red";
            passwordChangeMessage.className = "profile-message error";
            return;
        }
        
        // Check password length
        if (newPassword.length < 6) {
            passwordChangeMessage.textContent = "New password must be at least 6 characters long";
            passwordChangeMessage.style.color = "red";
            passwordChangeMessage.className = "profile-message error";
            return;
        }
        
        try {
            const response = await fetch("./backend/profile.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action: "changePassword",
                    currentPassword: currentPassword,
                    newPassword: newPassword,
                    confirmPassword: confirmPassword
                })
            });
            
            // Parse JSON response (even if status is not ok, backend returns JSON)
            const responseText = await response.text();
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                // If JSON parsing fails, show generic error
                console.error("Failed to parse response:", responseText, parseError);
                passwordChangeMessage.textContent = "Server error, please try again later.";
                passwordChangeMessage.style.color = "red";
                passwordChangeMessage.className = "profile-message error";
                return;
            }
            
            if (result.success) {
                passwordChangeMessage.textContent = result.message || "Password changed successfully";
                passwordChangeMessage.style.color = "green";
                passwordChangeMessage.className = "profile-message success";
                
                // Clear password fields
                if (currentPasswordInput) currentPasswordInput.value = "";
                if (newPasswordInput) newPasswordInput.value = "";
                if (confirmPasswordInput) confirmPasswordInput.value = "";
            } else {
                // Show the specific error message from server
                passwordChangeMessage.textContent = result.message || "Failed to change password";
                passwordChangeMessage.style.color = "red";
                passwordChangeMessage.className = "profile-message error";
            }
        } catch (error) {
            console.error("Error changing password:", error);
            passwordChangeMessage.textContent = "Server error, please try again later.";
            passwordChangeMessage.style.color = "red";
            passwordChangeMessage.className = "profile-message error";
        }
    }
    
    /**
     * Load current MFA status from server
     */
    async function loadMFAStatus() {
        try {
            const response = await fetch("./backend/profile.php?action=getMFA");
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Set checkbox checked state directly
                mfaToggle.checked = result.mfa === 1 || result.mfa === true;
            } else {
                console.error("Failed to load MFA status:", result.message);
            }
        } catch (error) {
            console.error("Error loading MFA status:", error);
        }
    }
    
    /**
     * Toggle 2FA on/off
     */
    async function toggle2FA(enabled) {
        message.textContent = "";
        message.style.color = "";
        message.className = "profile-message";
        
        try {
            const response = await fetch("./backend/two-factor.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    action: "toggle",
                    enable: enabled
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error("HTTP error response:", errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                if (enabled && result.totpUri && result.secret) {
                    // Show setup modal with QR code
                    showSetupModal(result.totpUri, result.secret);
                } else {
                    message.textContent = result.message;
                    message.style.color = "green";
                    message.className = "profile-message success";
                }
            } else {
                message.textContent = result.message || "Failed to update 2FA setting";
                message.style.color = "red";
                message.className = "profile-message error";
                // Revert toggle
                mfaToggle.checked = !enabled;
            }
        } catch (error) {
            console.error("Error toggling 2FA:", error);
            message.textContent = "Server error, please try again later.";
            message.style.color = "red";
            message.className = "profile-message error";
            // Revert toggle
            mfaToggle.checked = !enabled;
        }
    }
    
    /**
     * Show 2FA setup modal with QR code
     */
    function showSetupModal(totpUri, secret) {
        if (!setupModal || !qrCodeElement || !secretText) return;
        
        // Wait for Smart UI to upgrade the QR code element
        function waitForSmartQRCode(callback, maxRetries = 50, currentRetry = 0) {
            if (typeof Smart !== 'undefined' && qrCodeElement && typeof qrCodeElement.value !== 'undefined') {
                callback();
            } else if (currentRetry < maxRetries) {
                setTimeout(() => {
                    waitForSmartQRCode(callback, maxRetries, currentRetry + 1);
                }, 100);
            } else {
                console.error("Smart QR code element not available after 5 seconds");
                // Fallback: show secret only
                qrCodeElement.style.display = "none";
            }
        }
        
        // Set secret text first (always available)
        secretText.textContent = secret;
        secretContainer.style.display = "block";
        
        // Show modal
        setupModal.style.display = "flex";
        
        // Wait for Smart UI QR code element and set value
        waitForSmartQRCode(() => {
            // Set the TOTP URI as the QR code value
            qrCodeElement.value = totpUri;
            // Set width for better display
            if (qrCodeElement.width === undefined || qrCodeElement.width === 0) {
                qrCodeElement.width = 200;
            }
            qrCodeElement.style.display = "block";
        });
        
        // Show success message
        message.textContent = "2FA enabled! Please scan the QR code with your authenticator app.";
        message.style.color = "green";
        message.className = "profile-message success";
    }
    
    /**
     * Hide 2FA setup modal
     */
    function hideSetupModal() {
        if (setupModal) {
            setupModal.style.display = "none";
        }
    }
}

// Run initialization when script loads
// Check if DOM is already loaded, otherwise wait for it
if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", initProfilePage);
} else {
    // DOM is already loaded, but wait a bit for dynamic content
    setTimeout(initProfilePage, 100);
}

// Also expose as a global function for tab manager to call
window.initProfilePage = initProfilePage;
