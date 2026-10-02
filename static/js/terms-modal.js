// ==========================================================================
// TubeLoad - Mandatory Terms of Use Notification & Enforcement
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("termsNoticeModal");
  const checkbox = document.getElementById("termsAgreeCheckbox");
  const acceptBtn = document.getElementById("termsAcceptBtn");
  const declineBtn = document.getElementById("termsDeclineBtn");

  const STORAGE_KEY = "tubeload_terms_accepted_v1";

  // Check if terms already accepted
  function isTermsAccepted() {
    return localStorage.getItem(STORAGE_KEY) === "true";
  }

  // Show Terms Modal
  function showTermsModal() {
    if (!modal) return;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  // Hide Terms Modal
  function hideTermsModal() {
    if (!modal) return;
    modal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  // Checkbox toggle state
  if (checkbox && acceptBtn) {
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        acceptBtn.disabled = false;
        acceptBtn.classList.remove("opacity-50", "cursor-not-allowed");
        acceptBtn.classList.add("opacity-100", "cursor-pointer", "shadow-glow-red");
      } else {
        acceptBtn.disabled = true;
        acceptBtn.classList.add("opacity-50", "cursor-not-allowed");
        acceptBtn.classList.remove("opacity-100", "cursor-pointer", "shadow-glow-red");
      }
    });
  }

  // Accept & Continue handler
  if (acceptBtn) {
    acceptBtn.addEventListener("click", () => {
      if (checkbox && checkbox.checked) {
        localStorage.setItem(STORAGE_KEY, "true");
        hideTermsModal();

        // Optional quick success feedback
        console.log("Terms of Use accepted by user.");
      }
    });
  }

  // Decline & Close Website handler
  if (declineBtn) {
    declineBtn.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      
      // Attempt browser window close
      window.close();

      // If browser blocks closing script-originated window, render locked screen and redirect
      document.body.innerHTML = `
        <div style="min-height: 100vh; background: #0F0F0F; color: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; font-family: sans-serif; text-align: center;">
          <div style="width: 60px; height: 60px; border-radius: 20px; background: rgba(255, 0, 0, 0.15); border: 1px solid rgba(255, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
            <svg style="width: 32px; height: 32px; color: #FF0000;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">Access Closed</h2>
          <p style="font-size: 14px; color: #A1A1AA; max-width: 420px; line-height: 1.6; margin-bottom: 24px;">
            You have chosen not to accept the Terms of Use. TubeLoad is unavailable without agreement to our responsible usage policies. Please close this browser tab.
          </p>
          <a href="https://www.google.com" style="padding: 10px 24px; border-radius: 12px; background: #181818; border: 1px solid #27272A; color: #FFFFFF; font-size: 13px; font-weight: 600; text-decoration: none;">
            Leave Website
          </a>
        </div>
      `;

      setTimeout(() => {
        window.location.href = "https://www.google.com";
      }, 1500);
    });
  }

  // Initial check on page load: popup after brief delay
  if (!isTermsAccepted()) {
    setTimeout(() => {
      showTermsModal();
    }, 350);
  }

  // Expose global guard for downloader
  window.ensureTermsAccepted = function () {
    if (isTermsAccepted()) {
      return true;
    }
    showTermsModal();
    return false;
  };
});
