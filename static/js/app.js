/**
 * TubeLoad - Modern YouTube Video Downloader
 * Frontend Architecture & Downloader Service Abstraction
 */

// ==========================================
// 1. Downloader Service Layer Abstraction
// ==========================================
class TubeLoadService {
  /**
   * Fetches metadata and actual supported formats for a public YouTube URL.
   * @param {string} url
   * @returns {Promise<Object>}
   */
  static async fetchVideoInfo(url) {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      throw new Error("Please enter a valid YouTube URL.");
    }

    const response = await fetch(`/api/info?url=${encodeURIComponent(cleanUrl)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "This video could not be processed. Please try another publicly accessible video.");
    }

    return data;
  }

  /**
   * Initiates download job on the backend.
   * @param {string} url
   * @param {string} formatType "video" | "audio"
   * @param {string} quality "best" | "1080" | "720" | "mp3_320" etc.
   * @returns {Promise<Object>}
   */
  static async startDownload(url, formatType, quality) {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: url.trim(),
        format_type: formatType,
        quality: quality
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Something went wrong while processing the video. Please try again.");
    }
    return data;
  }

  /**
   * Checks the progress of a processing/download job.
   * @param {string} jobId
   * @returns {Promise<Object>}
   */
  static async getProgress(jobId) {
    const response = await fetch(`/api/progress/${jobId}`);
    if (!response.ok) {
      throw new Error("The server could not process your request. Please try again in a moment.");
    }
    return await response.json();
  }
}

// Global abstraction as requested in Section 21
window.downloadYouTubeVideo = async function(url) {
  return await TubeLoadService.fetchVideoInfo(url);
};

// ==========================================
// 2. UI Controller & Interaction Handlers
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // DOM Elements
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const downloaderForm = document.getElementById("downloaderForm");
  const youtubeUrlInput = document.getElementById("youtubeUrlInput");
  const pasteBtn = document.getElementById("pasteBtn");
  const downloadSubmitBtn = document.getElementById("downloadSubmitBtn");
  const submitBtnText = document.getElementById("submitBtnText");
  const submitBtnIcon = document.getElementById("submitBtnIcon");

  const errorStateCard = document.getElementById("errorStateCard");
  const errorMessageText = document.getElementById("errorMessageText");
  const tryAgainBtn = document.getElementById("tryAgainBtn");

  const processingStateCard = document.getElementById("processingStateCard");
  const processingStateText = document.getElementById("processingStateText");

  const resultCard = document.getElementById("resultCard");
  const resultThumb = document.getElementById("resultThumb");
  const resultDuration = document.getElementById("resultDuration");
  const resultTitle = document.getElementById("resultTitle");
  const resultUploader = document.getElementById("resultUploader");
  const resultMetadata = document.getElementById("resultMetadata");
  const tabVideoBtn = document.getElementById("tabVideoBtn");
  const tabAudioBtn = document.getElementById("tabAudioBtn");
  const qualitySelect = document.getElementById("qualitySelect");
  const startProcessDownloadBtn = document.getElementById("startProcessDownloadBtn");
  const finalDownloadBtnText = document.getElementById("finalDownloadBtnText");

  const liveDownloadProgress = document.getElementById("liveDownloadProgress");
  const progressStepTitle = document.getElementById("progressStepTitle");
  const progressPercentNum = document.getElementById("progressPercentNum");
  const progressFillBar = document.getElementById("progressFillBar");
  const progressLiveSpeed = document.getElementById("progressLiveSpeed");
  const progressLiveEta = document.getElementById("progressLiveEta");

  // Application State
  let currentVideoInfo = null;
  let activeFormatType = "video"; // "video" | "audio"
  let activeJobId = null;
  let pollInterval = null;

  // --- Mobile Navigation ---
  mobileMenuBtn.addEventListener("click", () => {
    const isExpanded = mobileMenuBtn.getAttribute("aria-expanded") === "true";
    mobileMenuBtn.setAttribute("aria-expanded", !isExpanded);
    mobileMenu.classList.toggle("hidden");
  });

  document.querySelectorAll(".mobile-nav-link").forEach(link => {
    link.addEventListener("click", () => {
      mobileMenu.classList.add("hidden");
      mobileMenuBtn.setAttribute("aria-expanded", "false");
    });
  });

  // --- Clipboard Paste Helper ---
  pasteBtn.addEventListener("click", async () => {
    hideError();
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          youtubeUrlInput.value = text.trim();
          handleUrlSubmit();
        }
      } else {
        youtubeUrlInput.focus();
      }
    } catch (err) {
      youtubeUrlInput.focus();
    }
  });

  // --- Error Display Handler ---
  function showError(message) {
    processingStateCard.classList.add("hidden");
    resultCard.classList.add("hidden");
    errorStateCard.classList.remove("hidden");
    errorMessageText.textContent = message || "Please enter a valid YouTube URL.";
    errorStateCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (window.lucide) window.lucide.createIcons();
  }

  function hideError() {
    errorStateCard.classList.add("hidden");
  }

  tryAgainBtn.addEventListener("click", () => {
    hideError();
    youtubeUrlInput.focus();
  });

  // --- Main Downloader Form Submission ---
  downloaderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    handleUrlSubmit();
  });

  async function handleUrlSubmit() {
    // Enforce Terms of Use agreement
    if (window.ensureTermsAccepted && !window.ensureTermsAccepted()) {
      return;
    }

    const url = youtubeUrlInput.value.trim();
    hideError();

    if (!url) {
      showError("Please enter a valid YouTube URL.");
      return;
    }

    // Step 1: Processing State: "Analyzing video..."
    resultCard.classList.add("hidden");
    processingStateCard.classList.remove("hidden");
    processingStateText.textContent = "Analyzing video...";
    setSubmitButtonLoading(true);

    // Smooth UI progression: "Fetching available formats..."
    const stepTimer = setTimeout(() => {
      if (!processingStateCard.classList.contains("hidden")) {
        processingStateText.textContent = "Fetching available formats...";
      }
    }, 900);

    try {
      const data = await window.downloadYouTubeVideo(url);
      clearTimeout(stepTimer);
      processingStateCard.classList.add("hidden");
      currentVideoInfo = data;
      renderResultCard(data);
    } catch (err) {
      clearTimeout(stepTimer);
      showError(err.message || "Something went wrong while processing the video. Please try again.");
    } finally {
      setSubmitButtonLoading(false);
    }
  }

  function setSubmitButtonLoading(isLoading) {
    if (isLoading) {
      downloadSubmitBtn.disabled = true;
      submitBtnIcon.classList.add("hidden");
      submitBtnText.innerHTML = `<span class="inline-block animate-spin mr-2">⟳</span> Processing...`;
    } else {
      downloadSubmitBtn.disabled = false;
      submitBtnIcon.classList.remove("hidden");
      submitBtnText.textContent = "Download Video";
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // --- Render Result Card ---
  function renderResultCard(data) {
    resultThumb.src = data.thumbnail;
    resultDuration.textContent = data.duration_formatted;
    resultTitle.textContent = data.title;
    resultUploader.textContent = data.uploader;

    // Reset default format to video
    activeFormatType = "video";
    updateFormatTabs();
    populateQualityDropdown();

    resultCard.classList.remove("hidden");
    resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (window.lucide) window.lucide.createIcons();
  }

  // --- Format Switcher (VIDEO vs AUDIO) ---
  tabVideoBtn.addEventListener("click", () => {
    activeFormatType = "video";
    updateFormatTabs();
    populateQualityDropdown();
  });

  tabAudioBtn.addEventListener("click", () => {
    activeFormatType = "audio";
    updateFormatTabs();
    populateQualityDropdown();
  });

  function updateFormatTabs() {
    if (activeFormatType === "video") {
      tabVideoBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-brand-red text-white";
      tabAudioBtn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-gray hover:text-white transition-all";
      resultMetadata.textContent = "MP4 Video";
      finalDownloadBtnText.textContent = "Download MP4";
    } else {
      tabAudioBtn.className = "px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-brand-red text-white";
      tabVideoBtn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-gray hover:text-white transition-all";
      resultMetadata.textContent = "MP3 Audio";
      finalDownloadBtnText.textContent = "Download MP3";
    }
  }

  function populateQualityDropdown() {
    qualitySelect.innerHTML = "";
    const options = activeFormatType === "video" 
      ? currentVideoInfo.video_qualities 
      : currentVideoInfo.audio_qualities;

    options.forEach(opt => {
      const optionEl = document.createElement("option");
      optionEl.value = opt.id;
      optionEl.textContent = opt.label;
      qualitySelect.appendChild(optionEl);
    });
  }

  // --- Process & Download Execution ---
  startProcessDownloadBtn.addEventListener("click", async () => {
    // Enforce Terms of Use agreement
    if (window.ensureTermsAccepted && !window.ensureTermsAccepted()) {
      return;
    }

    if (!currentVideoInfo) return;

    hideError();
    const selectedQuality = qualitySelect.value;

    liveDownloadProgress.classList.remove("hidden");
    progressStepTitle.textContent = "Connecting to media streams...";
    progressPercentNum.textContent = "0%";
    progressFillBar.style.width = "0%";
    progressLiveSpeed.textContent = "Starting...";
    progressLiveEta.textContent = "In progress...";
    startProcessDownloadBtn.disabled = true;

    try {
      const job = await TubeLoadService.startDownload(
        currentVideoInfo.video_url,
        activeFormatType,
        selectedQuality
      );

      activeJobId = job.job_id;
      pollJobProgress(activeJobId);
    } catch (err) {
      liveDownloadProgress.classList.add("hidden");
      startProcessDownloadBtn.disabled = false;
      showError(err.message || "The server could not process your request. Please try again in a moment.");
    }
  });

  function pollJobProgress(jobId) {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
      try {
        const progress = await TubeLoadService.getProgress(jobId);

        const pct = Math.min(Math.round(progress.progress || 0), 100);
        progressPercentNum.textContent = `${pct}%`;
        progressFillBar.style.width = `${pct}%`;

        if (progress.status_text) {
          progressStepTitle.textContent = progress.status_text;
        }
        if (progress.speed) {
          progressLiveSpeed.textContent = progress.speed;
        }
        if (progress.eta) {
          progressLiveEta.textContent = `ETA: ${progress.eta}`;
        }

        if (progress.status === "finished") {
          clearInterval(pollInterval);
          progressPercentNum.textContent = "100%";
          progressFillBar.style.width = "100%";
          progressStepTitle.textContent = "Download complete!";
          startProcessDownloadBtn.disabled = false;

          // Trigger file download to save directly to user's gallery / downloads
          setTimeout(() => {
            const downloadLink = document.createElement("a");
            downloadLink.href = `/api/file/${jobId}`;
            downloadLink.download = progress.filename || "TubeLoad_download.mp4";
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
          }, 300);

          // If authenticated with Firebase, save to Firestore download history
          if (window.TubeLoadFirebase && window.TubeLoadFirebase.saveDownloadToHistory && currentVideoInfo) {
            window.TubeLoadFirebase.saveDownloadToHistory({
              title: currentVideoInfo.title,
              url: currentVideoInfo.video_url,
              format: activeFormatType,
              quality: qualitySelect.value,
              thumbnail: currentVideoInfo.thumbnail,
              duration: currentVideoInfo.duration_string,
              channel: currentVideoInfo.uploader
            });
          }

        } else if (progress.status === "error") {
          clearInterval(pollInterval);
          startProcessDownloadBtn.disabled = false;
          liveDownloadProgress.classList.add("hidden");
          showError(progress.error || "Something went wrong while processing the video. Please try again.");
        }
      } catch (err) {
        clearInterval(pollInterval);
        startProcessDownloadBtn.disabled = false;
        liveDownloadProgress.classList.add("hidden");
        showError("The server could not process your request. Please try again in a moment.");
      }
    }, 600);
  }

  // --- Accessible FAQ Accordion ---
  const faqToggles = document.querySelectorAll(".faq-toggle");
  faqToggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      const content = toggle.nextElementSibling;
      const icon = toggle.querySelector(".faq-icon");
      const isHidden = content.classList.contains("hidden");

      // Close other accordions
      document.querySelectorAll(".faq-content").forEach(c => c.classList.add("hidden"));
      document.querySelectorAll(".faq-icon").forEach(i => i.classList.remove("rotate-180"));

      if (isHidden) {
        content.classList.remove("hidden");
        icon.classList.add("rotate-180");
      }
    });
  });

  // --- Dynamic Mouse Spotlight Effect on Cards ---
  const spotlightCards = document.querySelectorAll(".interactive-card, .main-downloader-card");
  spotlightCards.forEach(card => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    });
  });
});
