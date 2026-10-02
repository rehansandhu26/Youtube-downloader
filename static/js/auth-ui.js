// ==========================================================================
// TubeLoad - Firebase Auth (Google Sign-In) & Firestore History UI
// ==========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Elements - Desktop
  const googleSignInBtn = document.getElementById("googleSignInBtn");
  const userProfileMenu = document.getElementById("userProfileMenu");
  const userProfileBtn = document.getElementById("userProfileBtn");
  const userAvatarImg = document.getElementById("userAvatarImg");
  const userDisplayName = document.getElementById("userDisplayName");
  const userDropdown = document.getElementById("userDropdown");
  const dropdownUserName = document.getElementById("dropdownUserName");
  const dropdownUserEmail = document.getElementById("dropdownUserEmail");
  const openHistoryBtn = document.getElementById("openHistoryBtn");
  const signOutBtn = document.getElementById("signOutBtn");

  // Elements - Mobile
  const mobileGoogleSignInBtn = document.getElementById("mobileGoogleSignInBtn");
  const mobileUserProfile = document.getElementById("mobileUserProfile");
  const mobileUserAvatar = document.getElementById("mobileUserAvatar");
  const mobileUserName = document.getElementById("mobileUserName");
  const mobileOpenHistoryBtn = document.getElementById("mobileOpenHistoryBtn");
  const mobileSignOutBtn = document.getElementById("mobileSignOutBtn");

  // Elements - History Modal
  const historyModal = document.getElementById("downloadHistoryModal");
  const closeHistoryModalBtn = document.getElementById("closeHistoryModalBtn");
  const historyListContainer = document.getElementById("historyListContainer");
  const historyEmptyState = document.getElementById("historyEmptyState");
  const historyLoadingState = document.getElementById("historyLoadingState");
  const historyItemCount = document.getElementById("historyItemCount");

  // Elements - Subtext Prompt
  const downloaderSubtextRow = document.getElementById("downloaderSubtextRow");
  const subtextSignInTrigger = document.getElementById("subtextSignInTrigger");

  // Dropdown toggle
  if (userProfileBtn && userDropdown) {
    userProfileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", (e) => {
      if (!userDropdown.contains(e.target) && !userProfileBtn.contains(e.target)) {
        userDropdown.classList.add("hidden");
      }
    });
  }

  // Google Sign-In Handler
  async function handleGoogleSignIn() {
    if (!window.TubeLoadFirebase) return;
    try {
      if (googleSignInBtn) googleSignInBtn.disabled = true;
      if (mobileGoogleSignInBtn) mobileGoogleSignInBtn.disabled = true;

      const user = await window.TubeLoadFirebase.signInWithGoogle();
      if (user) {
        console.log("Signed in successfully as:", user.displayName);
      }
    } catch (err) {
      console.error("Sign-in failed:", err);
    } finally {
      if (googleSignInBtn) googleSignInBtn.disabled = false;
      if (mobileGoogleSignInBtn) mobileGoogleSignInBtn.disabled = false;
    }
  }

  if (googleSignInBtn) googleSignInBtn.addEventListener("click", handleGoogleSignIn);
  if (mobileGoogleSignInBtn) mobileGoogleSignInBtn.addEventListener("click", handleGoogleSignIn);

  // Sign-Out Handler
  async function handleSignOut() {
    if (!window.TubeLoadFirebase) return;
    try {
      await window.TubeLoadFirebase.logOut();
      if (userDropdown) userDropdown.classList.add("hidden");
      if (historyModal) historyModal.classList.add("hidden");
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
  }

  if (signOutBtn) signOutBtn.addEventListener("click", handleSignOut);
  if (mobileSignOutBtn) mobileSignOutBtn.addEventListener("click", handleSignOut);

  // Auth State Observer
  function checkFirebaseReady() {
    if (window.TubeLoadFirebase && window.TubeLoadFirebase.onAuthStateChanged) {
      window.TubeLoadFirebase.onAuthStateChanged((user) => {
        updateAuthUI(user);
      });
    } else {
      setTimeout(checkFirebaseReady, 100);
    }
  }
  checkFirebaseReady();

  // Subtext Trigger Handler
  function handleSubtextTriggerClick() {
    if (window.TubeLoadFirebase && window.TubeLoadFirebase.auth && window.TubeLoadFirebase.auth.currentUser) {
      openHistoryModal();
    } else {
      handleGoogleSignIn();
    }
  }

  if (subtextSignInTrigger) {
    subtextSignInTrigger.addEventListener("click", handleSubtextTriggerClick);
  }

  function updateAuthUI(user) {
    if (user) {
      // User is logged in
      const name = user.displayName || "User";
      const email = user.email || "";
      const avatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=FF0000&color=fff`;

      // Update Desktop
      if (googleSignInBtn) googleSignInBtn.classList.add("hidden");
      if (userProfileMenu) userProfileMenu.classList.remove("hidden");
      if (userDisplayName) userDisplayName.textContent = name.split(" ")[0];
      if (userAvatarImg) userAvatarImg.src = avatar;
      if (dropdownUserName) dropdownUserName.textContent = name;
      if (dropdownUserEmail) dropdownUserEmail.textContent = email;

      // Update Mobile
      if (mobileGoogleSignInBtn) mobileGoogleSignInBtn.classList.add("hidden");
      if (mobileUserProfile) mobileUserProfile.classList.remove("hidden");
      if (mobileUserAvatar) mobileUserAvatar.src = avatar;
      if (mobileUserName) mobileUserName.textContent = name;

      // Update Downloader Subtext
      if (downloaderSubtextRow) {
        downloaderSubtextRow.innerHTML = `Fast processing &bull; <button type="button" id="subtextSignInTrigger" class="text-brand-softwhite hover:text-brand-red font-medium underline underline-offset-2 transition-colors cursor-pointer">View download history</button> &bull; Saved to cloud`;
        const updatedTrigger = document.getElementById("subtextSignInTrigger");
        if (updatedTrigger) updatedTrigger.addEventListener("click", handleSubtextTriggerClick);
      }
    } else {
      // User is logged out
      if (googleSignInBtn) googleSignInBtn.classList.remove("hidden");
      if (userProfileMenu) userProfileMenu.classList.add("hidden");
      if (userDropdown) userDropdown.classList.add("hidden");

      if (mobileGoogleSignInBtn) mobileGoogleSignInBtn.classList.remove("hidden");
      if (mobileUserProfile) mobileUserProfile.classList.add("hidden");

      // Update Downloader Subtext
      if (downloaderSubtextRow) {
        downloaderSubtextRow.innerHTML = `Fast processing &bull; <button type="button" id="subtextSignInTrigger" class="text-brand-softwhite hover:text-brand-red font-medium underline underline-offset-2 transition-colors cursor-pointer">Sign in</button> to access previous videos you download`;
        const updatedTrigger = document.getElementById("subtextSignInTrigger");
        if (updatedTrigger) updatedTrigger.addEventListener("click", handleSubtextTriggerClick);
      }
    }
  }

  // --- Download History Modal Logic ---
  async function openHistoryModal() {
    if (!historyModal) return;
    if (userDropdown) userDropdown.classList.add("hidden");
    historyModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    await loadHistoryItems();
  }

  function closeHistoryModal() {
    if (!historyModal) return;
    historyModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  if (openHistoryBtn) openHistoryBtn.addEventListener("click", openHistoryModal);
  if (mobileOpenHistoryBtn) mobileOpenHistoryBtn.addEventListener("click", openHistoryModal);
  if (closeHistoryModalBtn) closeHistoryModalBtn.addEventListener("click", closeHistoryModal);

  // Close on outside backdrop click
  if (historyModal) {
    historyModal.addEventListener("click", (e) => {
      if (e.target === historyModal) {
        closeHistoryModal();
      }
    });
  }

  async function loadHistoryItems() {
    if (!window.TubeLoadFirebase || !historyListContainer) return;

    if (historyLoadingState) historyLoadingState.classList.remove("hidden");
    if (historyEmptyState) historyEmptyState.classList.add("hidden");
    historyListContainer.innerHTML = "";

    try {
      const items = await window.TubeLoadFirebase.fetchUserDownloadHistory();
      if (historyLoadingState) historyLoadingState.classList.add("hidden");

      if (historyItemCount) {
        historyItemCount.textContent = items.length > 0 ? `(${items.length})` : "";
      }

      if (!items || items.length === 0) {
        if (historyEmptyState) historyEmptyState.classList.remove("hidden");
        return;
      }

      items.forEach((item) => {
        const itemEl = document.createElement("div");
        itemEl.className = "p-3.5 rounded-xl bg-brand-bg/80 border border-brand-border/80 flex items-center justify-between gap-3 hover:border-brand-red/30 transition-colors";

        const thumbUrl = item.thumbnail || "/favicon.svg";
        const formatBadge = item.format === "audio" ? "MP3 Audio" : `${item.quality || "HD"} MP4`;

        itemEl.innerHTML = `
          <div class="flex items-center gap-3 overflow-hidden">
            <img src="${thumbUrl}" alt="Thumbnail" class="w-16 h-11 rounded-lg object-cover bg-black flex-shrink-0 border border-white/5">
            <div class="min-w-0">
              <h4 class="text-xs font-bold text-white truncate leading-tight">${escapeHtml(item.title)}</h4>
              <div class="flex items-center gap-2 mt-1 text-[11px] text-brand-gray">
                <span class="px-1.5 py-0.5 rounded bg-brand-secondary text-brand-softwhite border border-brand-border text-[10px] font-semibold">${formatBadge}</span>
                <span>&bull;</span>
                <span>${item.duration || "Video"}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button type="button" class="reDownloadBtn p-2 rounded-lg bg-brand-secondary hover:bg-brand-red text-white text-xs transition-colors" title="Paste URL into downloader" data-url="${escapeHtml(item.url || "")}">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button type="button" class="deleteHistoryBtn p-2 rounded-lg bg-brand-secondary hover:bg-red-950 hover:text-red-400 text-brand-gray text-xs transition-colors" title="Delete from history" data-id="${item.id}">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        `;

        // Wire re-download button
        const reDownloadBtn = itemEl.querySelector(".reDownloadBtn");
        reDownloadBtn.addEventListener("click", () => {
          const url = reDownloadBtn.getAttribute("data-url");
          const urlInput = document.getElementById("youtubeUrlInput");
          if (url && urlInput) {
            urlInput.value = url;
            closeHistoryModal();
            urlInput.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
            const submitBtn = document.getElementById("downloadSubmitBtn");
            if (submitBtn) submitBtn.click();
          }
        });

        // Wire delete button
        const deleteBtn = itemEl.querySelector(".deleteHistoryBtn");
        deleteBtn.addEventListener("click", async () => {
          const id = deleteBtn.getAttribute("data-id");
          if (id && window.TubeLoadFirebase) {
            itemEl.style.opacity = "0.4";
            const success = await window.TubeLoadFirebase.deleteHistoryItem(id);
            if (success) {
              itemEl.remove();
              if (historyListContainer.children.length === 0 && historyEmptyState) {
                historyEmptyState.classList.remove("hidden");
              }
            } else {
              itemEl.style.opacity = "1";
            }
          }
        });

        historyListContainer.appendChild(itemEl);
      });
    } catch (err) {
      console.warn("Error loading history:", err);
      if (historyLoadingState) historyLoadingState.classList.add("hidden");
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
});
