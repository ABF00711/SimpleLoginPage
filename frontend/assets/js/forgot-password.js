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
        message.textContent = result.message || "Password reset link has been generated and saved.";
      } else {
        message.style.color = "red";
        message.textContent = result.message || "Failed to generate reset link. Please try again.";
      }
    } catch (err) {
      console.error(err);
      message.style.color = "red";
      message.textContent = "Server error, please try again later.";
    }
  });
});

