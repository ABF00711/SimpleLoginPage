// Handle reset password form submission
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reset-password-form");
  const message = document.getElementById("message");
  const tokenInput = document.getElementById("token");
  const endpoint = "./backend/reset-password.php";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "";
    message.style.color = "";

    const passwordInput = form.querySelector("[data-field='password']");
    const confirmPasswordInput = form.querySelector("[data-field='confirm_password']");
    
    const token = tokenInput.value;
    const password = passwordInput.value ? passwordInput.value.trim() : "";
    const confirmPassword = confirmPasswordInput.value ? confirmPasswordInput.value.trim() : "";

    if (!password || !confirmPassword) {
      message.style.color = "red";
      message.textContent = "Please fill in all fields.";
      return;
    }

    if (password !== confirmPassword) {
      message.style.color = "red";
      message.textContent = "Passwords do not match.";
      return;
    }

    if (password.length < 6) {
      message.style.color = "red";
      message.textContent = "Password must be at least 6 characters long.";
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: token,
          password: password,
          confirm_password: confirmPassword
        }),
      });

      const result = await res.json();

      if (result.success) {
        message.style.color = "green";
        message.textContent = result.message || "Password reset successfully! Redirecting to login...";
        
        setTimeout(() => {
          window.location.href = "./index.php";
        }, 2000);
      } else {
        message.style.color = "red";
        message.textContent = result.message || "Failed to reset password. Please try again.";
      }
    } catch (err) {
      console.error(err);
      message.style.color = "red";
      message.textContent = "Server error, please try again later.";
    }
  });
});

