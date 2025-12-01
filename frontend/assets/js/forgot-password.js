// Handle forgot password form submission
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("forgot-password-form");
  const message = document.getElementById("message");
  const endpoint = "./backend/forgot-password.php";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    message.textContent = "";
    message.style.color = "";

    const input = form.querySelector("[data-field='identifier']");
    const identifier = input.value ? input.value.trim() : "";

    if (!identifier) {
      message.style.color = "red";
      message.textContent = "Please enter your email or username.";
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier }),
      });

      const result = await res.json();

      if (result.success) {
        message.style.color = "green";
        if (result.resetLink) {
          // For development: show the reset link
          message.innerHTML = `Password reset link sent!<br><br>
            <strong>Development Mode:</strong><br>
            <a href="${result.resetLink}" target="_blank" style="color: #0066ff; word-break: break-all;">${result.resetLink}</a><br><br>
            In production, this link would be sent to your email.`;
        } else {
          message.textContent = result.message || "Password reset link sent! Please check your email.";
        }
      } else {
        message.style.color = "red";
        message.textContent = result.message || "Failed to send reset link. Please try again.";
      }
    } catch (err) {
      console.error(err);
      message.style.color = "red";
      message.textContent = "Server error, please try again later.";
    }
  });
});

