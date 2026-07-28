const form = document.querySelector("[data-access-form]");
const message = document.querySelector("[data-access-message]");
const title = document.querySelector("[data-access-title]");
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") === "reset" ? "reset" : "invite";
const token = params.get("token") || "";

title.textContent = mode === "reset" ? "Reset admin password" : "Activate admin account";

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = form.elements.password.value;
  const confirmPassword = form.elements.confirmPassword.value;
  if (password !== confirmPassword) {
    message.textContent = "Passwords do not match.";
    return;
  }
  message.textContent = "Saving...";
  const endpoint = mode === "reset" ? "/api/admin/password-reset/complete" : "/api/admin/invitations/accept";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "This link could not be used.");
    message.innerHTML = 'Password saved. <a href="admin.html">Sign in to admin</a>.';
    form.reset();
  } catch (error) {
    message.textContent = error.message;
  }
});
