// Handle login form submission after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login");
  const message = document.getElementById("message");
  const endpoint = "./backend/login.php"; // Backend login API

  // Handle form submission
  async function handleFormSubmit(e) {
    if (e) {
      e.preventDefault(); // Prevent page reload
    }
    message.textContent = "";
    message.style.color = ""; // Reset message style

    // Collect form fields via data-field attributes
    const inputs = loginForm.querySelectorAll("[data-field]");
    const payload = {};

    inputs.forEach((input) => {
      const key = input.getAttribute("data-field");
      // Handle checkbox differently
      if (input.type === "checkbox") {
        payload[key] = input.checked ? true : false;
      } else {
        // For Smart UI elements, try multiple ways to get value
        let value = "";
        if (input.tagName && input.tagName.toLowerCase().startsWith("smart-")) {
          // Smart UI component - try value property, then getValue method
          value = input.value !== undefined ? input.value : 
                  (typeof input.getValue === 'function' ? input.getValue() : "");
        } else {
          // Regular HTML input
          value = input.value || "";
        }
        payload[key] = value ? String(value).trim() : "";
      }
    });

    // Determine login identifier (email or username)
    const rawIdentifier = payload.username || payload.identifier || "";
    payload.identifier = rawIdentifier; // backend accepts identifier

    // If identifier looks like email, send email field as hint to backend
    if (rawIdentifier.includes("@") && rawIdentifier.includes(".")) {
      payload.email = rawIdentifier;
    }

    // Check if we're in 2FA mode
    const mfaCode = payload.mfa_code || '';
    const is2FAMode = loginForm.hasAttribute('data-pending-identifier');
    
    console.log("Login form submit:", { is2FAMode, mfaCode, payload });
    
    if (is2FAMode) {
      if (!mfaCode || mfaCode.length < 6) {
        message.style.color = "red";
        message.textContent = "Please enter a valid 6-digit 2FA code.";
        return;
      }
      // Submit 2FA code
      await submit2FACode(mfaCode);
      return;
    }
    
    // Basic validation: ensure identifier and password exist
    if (!payload.identifier || !payload.password) {
      message.textContent = "Please fill in all fields.";
      return;
    }

    try {
      // Send login request as JSON
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Check if response is ok before parsing JSON
      let result;
      try {
        result = await res.json();
      } catch (err) {
        console.error("Failed to parse JSON response:", err);
        message.style.color = "red";
        message.textContent = "Server error: Invalid response format.";
        return;
      }

      if (result.success) {
        // Login succeeded
        message.style.color = "green";
        message.textContent = "Login successful!";

        // Delay to show success message, then redirect to dashboard
        setTimeout(() => {
          window.location.href = "./dashboard.php";
        }, 400);
      } else if (result.requires_2fa) {
        // 2FA required - show code input
        show2FAInput(result.message || "Please enter your 2FA code");
      } else {
        // Backend returned error (wrong credentials)
        message.style.color = "red";
        message.textContent = result.message || "Invalid username or password.";
      }
    } catch (err) {
      // Network or server failure
      console.error(err);
      message.style.color = "red";
      message.textContent = "Server error, please try again later.";
    }
  }

  // Form submit event
  loginForm.addEventListener("submit", handleFormSubmit);
  
  // Also handle smart-button click directly (in case form submit doesn't fire)
  setTimeout(() => {
    const submitButton = loginForm.querySelector('smart-button[type="submit"]');
    if (submitButton) {
      // Remove any existing click handlers to avoid duplicates
      const newButton = submitButton.cloneNode(true);
      submitButton.parentNode.replaceChild(newButton, submitButton);
      
      // Add click handler
      if (typeof newButton.onClick === 'function' || newButton.addEventListener) {
        newButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("Submit button clicked directly");
          handleFormSubmit(e);
        });
      }
      
      // Also try Smart UI's onClick property
      if (typeof newButton.onClick !== 'undefined') {
        const originalOnClick = newButton.onClick;
        newButton.onClick = (e) => {
          if (originalOnClick) {
            originalOnClick.call(newButton, e);
          }
          e.preventDefault();
          e.stopPropagation();
          console.log("Submit button clicked via Smart UI onClick");
          handleFormSubmit(e);
        };
      }
    }
  }, 500);
  
  /**
   * Show 2FA code input field
   */
  function show2FAInput(messageText) {
    // Hide login form fields
    const usernameField = loginForm.querySelector("[data-field='username']");
    const passwordField = loginForm.querySelector("[data-field='password']");
    const rememberMeField = loginForm.querySelector("[data-field='remember_me']");
    const rememberMeRow = rememberMeField ? rememberMeField.closest('.smart-form-row') : null;
    const submitButton = loginForm.querySelector('smart-button[type="submit"]');
    
    if (usernameField) usernameField.style.display = 'none';
    if (passwordField) passwordField.style.display = 'none';
    if (rememberMeRow) rememberMeRow.style.display = 'none';
    if (submitButton) submitButton.style.display = 'none';
    
    // Hide labels
    const labels = loginForm.querySelectorAll('label');
    labels.forEach(label => {
      if (label.textContent.includes('Username') || 
          label.textContent.includes('Password') || 
          label.textContent.includes('Remember')) {
        label.style.display = 'none';
      }
    });
    
    // Show message
    message.style.color = "orange";
    message.textContent = messageText;
    
    // Check if 2FA input already exists
    let mfaInput = loginForm.querySelector("[data-field='mfa_code']");
    if (!mfaInput) {
      // Create 2FA code input
      const mfaRow = document.createElement('div');
      mfaRow.className = 'smart-form-row';
      mfaRow.innerHTML = `
        <label>2FA Code:</label>
        <smart-input
          data-field="mfa_code"
          placeholder="Enter 6-digit code"
          class="underlined"
          form-control-name="mfaCode"
          required
          maxlength="6"
        ></smart-input>
      `;
      
      // Insert before submit button row
      const submitRow = loginForm.querySelector('.smart-form-row.submit');
      if (submitRow) {
        submitRow.parentNode.insertBefore(mfaRow, submitRow);
      } else {
        loginForm.appendChild(mfaRow);
      }
      
      mfaInput = loginForm.querySelector("[data-field='mfa_code']");
    }
    
    // Show 2FA input
    if (mfaInput) {
      mfaInput.style.display = '';
      mfaInput.closest('.smart-form-row').style.display = '';
      // Wait for Smart UI to upgrade the element
      setTimeout(() => {
        if (mfaInput) {
          // Clear any previous value
          if (mfaInput.value !== undefined) {
            mfaInput.value = '';
          }
          if (mfaInput.focus) {
            mfaInput.focus();
          }
        }
      }, 200);
    }
    
    // Update submit button text and ensure it's clickable
    if (submitButton) {
      submitButton.textContent = "Verify Code";
      submitButton.style.display = '';
      
      // Ensure button has click handler for 2FA mode
      setTimeout(() => {
        // Remove old handlers by cloning
        const newButton = submitButton.cloneNode(true);
        submitButton.parentNode.replaceChild(newButton, submitButton);
        
        // Add click handler
        if (newButton.addEventListener) {
          newButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Verify Code button clicked");
            handleFormSubmit(e);
          });
        }
        
        // Also set Smart UI onClick
        if (typeof newButton.onClick !== 'undefined') {
          newButton.onClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Verify Code button clicked via Smart UI");
            handleFormSubmit(e);
          };
        }
      }, 300);
    }
    
    // Store identifier and password for resubmission
    const identifier = loginForm.querySelector("[data-field='username']")?.value || 
                      loginForm.querySelector("[data-field='identifier']")?.value || '';
    const password = loginForm.querySelector("[data-field='password']")?.value || '';
    const rememberMe = loginForm.querySelector("[data-field='remember_me']")?.checked || false;
    
    // Store in form data attributes
    loginForm.setAttribute('data-pending-identifier', identifier);
    loginForm.setAttribute('data-pending-password', password);
    loginForm.setAttribute('data-pending-remember', rememberMe);
  }
  
  /**
   * Handle 2FA code submission
   */
  async function submit2FACode(mfaCode) {
    const identifier = loginForm.getAttribute('data-pending-identifier');
    const password = loginForm.getAttribute('data-pending-password');
    const rememberMe = loginForm.getAttribute('data-pending-remember') === 'true';
    
    console.log("Submitting 2FA code:", { identifier, mfaCode, rememberMe });
    
    if (!identifier || !password) {
      message.style.color = "red";
      message.textContent = "Session expired. Please refresh and try again.";
      return;
    }
    
    if (!mfaCode || mfaCode.length < 6) {
      message.style.color = "red";
      message.textContent = "Please enter a valid 6-digit 2FA code.";
      return;
    }
    
    const payload = {
      identifier: identifier,
      password: password,
      remember_me: rememberMe,
      mfa_code: mfaCode
    };
    
    try {
      console.log("Sending 2FA request:", payload);
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      console.log("2FA response status:", res.status);
      
      let result;
      try {
        result = await res.json();
        console.log("2FA response:", result);
      } catch (err) {
        console.error("Failed to parse JSON response:", err);
        const text = await res.text();
        console.error("Response text:", text);
        message.style.color = "red";
        message.textContent = "Server error: Invalid response format.";
        return;
      }
      
      if (result.success) {
        message.style.color = "green";
        message.textContent = "Login successful!";
        
        setTimeout(() => {
          window.location.href = "./dashboard.php";
        }, 400);
      } else {
        message.style.color = "red";
        message.textContent = result.message || "Invalid 2FA code. Please try again.";
        // Clear the 2FA input
        const mfaInput = loginForm.querySelector("[data-field='mfa_code']");
        if (mfaInput) {
          mfaInput.value = "";
          if (mfaInput.focus) {
            mfaInput.focus();
          }
        }
      }
    } catch (err) {
      console.error("2FA submission error:", err);
      message.style.color = "red";
      message.textContent = "Server error, please try again later.";
    }
  }
});
