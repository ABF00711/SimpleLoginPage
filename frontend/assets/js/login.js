// Handle login form submission after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login");
  const message = document.getElementById("message");
  const endpoint = "./backend/login.php"; // Backend login API

  // Form submit event
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent page reload
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
        payload[key] = input.value ? input.value.trim() : "";
      }
    });

    // Determine login identifier (email or username)
    const rawIdentifier = payload.username || payload.identifier || "";
    payload.identifier = rawIdentifier; // backend accepts identifier

    // If identifier looks like email, send email field as hint to backend
    if (rawIdentifier.includes("@") && rawIdentifier.includes(".")) {
      payload.email = rawIdentifier;
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

      // Backend always returns JSON
      const result = await res.json();

      if (result.success) {
        // Login succeeded
        message.style.color = "green";
        message.textContent = "Login successful!";

        // Delay to show success message, then redirect to dashboard
        setTimeout(() => {
          window.location.href = "./dashboard.php";
        }, 400);
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
  });
});
