(function () {
  const THEME_KEY = "phonethik-theme";
  const root = document.documentElement;
  const choices = ["light", "dark", "auto"];

  function getStoredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    return choices.includes(stored) ? stored : "auto";
  }

  function applyTheme(theme) {
    const value = choices.includes(theme) ? theme : "auto";
    root.setAttribute("data-theme", value);
    document.querySelectorAll("[data-theme-choice]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeChoice === value));
    });
  }

  applyTheme(getStoredTheme());

  document.addEventListener("click", (event) => {
    const themeButton = event.target.closest("[data-theme-choice]");
    if (themeButton) {
      const theme = themeButton.dataset.themeChoice;
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
      return;
    }

    const toggle = event.target.closest(".menu-toggle");
    if (toggle) {
      const nav = document.getElementById(toggle.getAttribute("aria-controls") || "main-nav");
      const isOpen = nav && nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
      return;
    }

    const navLink = event.target.closest(".main-nav a");
    if (navLink) {
      const nav = navLink.closest(".main-nav");
      const toggleButton = document.querySelector(".menu-toggle[aria-controls='" + nav.id + "']");
      nav.classList.remove("is-open");
      if (toggleButton) toggleButton.setAttribute("aria-expanded", "false");
    }
  });

  const revealElements = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });

    revealElements.forEach((el) => revealObserver.observe(el));
  } else {
    revealElements.forEach((el) => el.classList.add('is-revealed'));
  }

  const media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  if (media && media.addEventListener) {
    media.addEventListener("change", () => {
      if (getStoredTheme() === "auto") applyTheme("auto");
    });
  }

  const rotatingElement = document.getElementById('rotatingText');
  if (rotatingElement) {
    const words = ['smartphone', 'tablette', 'ordinateur portable', 'montre connectée', 'console'];
    let wordIndex = 0;
    let charIndex = words[0].length;
    let isDeleting = false;
    const typeDelay = 80;
    const deleteDelay = 50;
    const pauseAfterWord = 1800;
    const pauseBeforeNext = 250;

    function tick() {
      const currentWord = words[wordIndex];

      if (!isDeleting && charIndex < currentWord.length) {
        rotatingElement.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
        setTimeout(tick, typeDelay);
      } else if (!isDeleting && charIndex === currentWord.length) {
        isDeleting = true;
        setTimeout(tick, pauseAfterWord);
      } else if (isDeleting && charIndex > 0) {
        rotatingElement.textContent = currentWord.substring(0, charIndex - 1);
        charIndex--;
        setTimeout(tick, deleteDelay);
      } else {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        setTimeout(tick, pauseBeforeNext);
      }
    }

    setTimeout(tick, 1800);
  }
})();
