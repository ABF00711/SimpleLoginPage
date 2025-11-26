// Handle registration form submission and display server responses
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registerForm');
  const msg = document.getElementById('msg');
  const endpoint = './backend/register.php'; // Backend endpoint for user registration

  // Helper Email Validitor
  function validateEmail(email) {
    if (!email.trim()) return "Email is required";

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return "Enter a valid email";

    return "";
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page reload
    msg.textContent = '';
    msg.classList.remove('ok');

    // Extract all fields that contain "data-field" attribute
    const inputs = form.querySelectorAll('[data-field]');
    const payload = {};

    // Build payload object from input fields
    inputs.forEach(i => {
      const key = i.getAttribute('data-field');
      payload[key] = i.value ? String(i.value).trim() : '';
    });

    // Basic client-side validation for required fields
    if (!payload.username || !payload.password || !payload.email) {
      msg.textContent = "Please fill in all fields.";
      return;
    }

    if(payload.password !== payload.confirm_password){
      msg.textContent = "Please confirm password!";
      return;
    }

    const emailErr = validateEmail(payload.email);

    if(emailErr !== "") {
      msg.textContent = emailErr;
      return;
    }

    try {
      // Send form data to backend in JSON format
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Network response was not ok');

      const data = await res.json();

      if (data.status === 'success') {
        msg.textContent = data.message || 'Account created successfully.';
        msg.classList.add('ok');
        window.location.href = './index.php'; 
      } else {
        // Display error from backend (duplicate username/email etc.)
        msg.textContent = data.message || 'Registration failed.';
      }

    } catch (err) {
      console.error(err);
      msg.textContent = 'Server error. Try again later.';
    }
  });
});
