const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const toast = document.querySelector("[data-toast]");
let toastTimer;

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
}

function closeMenu() {
  if (!menuToggle || !mobileNav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  mobileNav.hidden = true;
  header?.classList.remove("is-open");
}

function showToast(message = "Copied to clipboard") {
  if (!toast) return;
  const label = toast.querySelector("span");
  if (label) label.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const fallback = document.createElement("textarea");
    fallback.value = value;
    fallback.setAttribute("readonly", "");
    fallback.style.position = "fixed";
    fallback.style.opacity = "0";
    document.body.appendChild(fallback);
    fallback.select();
    document.execCommand("copy");
    fallback.remove();
  }
  showToast();
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

menuToggle?.addEventListener("click", () => {
  const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  menuToggle.setAttribute("aria-expanded", String(willOpen));
  mobileNav.hidden = !willOpen;
  header?.classList.toggle("is-open", willOpen);
});

mobileNav?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

document.querySelectorAll("[data-copy-value]").forEach((button) => {
  button.addEventListener("click", () => copyText(button.dataset.copyValue || ""));
});

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.copyTarget || "");
    const firstLine = target?.textContent?.trim().split("\n")[0].replace(/^\$\s*/, "");
    if (firstLine) copyText(firstLine);
  });
});

document.querySelectorAll("[data-year]").forEach((node) => {
  node.textContent = String(new Date().getFullYear());
});

/* Hero HUD demo */
const heroStates = {
  working: {
    source: "CLAUDE · STOP HOOK",
    title: "Checking the release build",
    body: "Round 3 · tests still running",
    time: "NOW",
    action: "Open",
    progress: "46%",
  },
  attention: {
    source: "CLAUDE · PERMISSION",
    title: "Permission required",
    body: "Bash wants to run pnpm test",
    time: "NOW",
    action: "Review",
    progress: "72%",
  },
  complete: {
    source: "HOOKED · UNTIL",
    title: "All checks passed",
    body: "10 tests · 0 failures · loop cleared",
    time: "JUST NOW",
    action: "Open",
    progress: "100%",
  },
};

const demo = document.querySelector("[data-demo]");
const surface = demo?.querySelector("[data-surface]");
const scenarioButtons = [...(demo?.querySelectorAll("[data-scenario]") || [])];
const tourToggle = demo?.querySelector("[data-tour-toggle]");
const stateOrder = Object.keys(heroStates);
let heroStateIndex = 0;
let tourTimer;
let tourPaused = reduceMotion;

if (reduceMotion && tourToggle) {
  tourToggle.setAttribute("aria-pressed", "true");
  tourToggle.setAttribute("aria-label", "Play automatic demo");
}

function setText(selector, value) {
  const node = demo?.querySelector(selector);
  if (node) node.textContent = value;
}

function setHeroState(name, animate = true) {
  const state = heroStates[name];
  if (!state || !demo || !surface) return;

  heroStateIndex = stateOrder.indexOf(name);
  if (animate && !reduceMotion) demo.classList.remove("is-expanded");

  window.setTimeout(() => {
    surface.classList.remove("is-working", "is-attention", "is-complete", "is-error");
    surface.classList.add(`is-${name}`);
    setText("[data-event-source]", state.source);
    setText("[data-event-title]", state.title);
    setText("[data-event-body]", state.body);
    setText("[data-event-time]", state.time);
    setText("[data-event-action]", state.action);
    const progress = demo.querySelector("[data-event-progress]");
    if (progress) progress.style.width = state.progress;

    scenarioButtons.forEach((button) => {
      const active = button.dataset.scenario === name;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    demo.classList.add("is-expanded");
  }, animate && !reduceMotion ? 240 : 0);
}

function startTour() {
  window.clearInterval(tourTimer);
  if (tourPaused || document.hidden) return;
  tourTimer = window.setInterval(() => {
    heroStateIndex = (heroStateIndex + 1) % stateOrder.length;
    setHeroState(stateOrder[heroStateIndex]);
  }, 4800);
}

scenarioButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setHeroState(button.dataset.scenario || "working");
    startTour();
  });
});

tourToggle?.addEventListener("click", () => {
  tourPaused = !tourPaused;
  tourToggle.setAttribute("aria-pressed", String(tourPaused));
  tourToggle.setAttribute("aria-label", tourPaused ? "Play automatic demo" : "Pause automatic demo");
  startTour();
});

demo?.querySelector("[data-event-action]")?.addEventListener("click", () => {
  showToast("Demo action · opens the attached URL");
});

document.addEventListener("visibilitychange", startTour);
setHeroState("working", false);
startTour();

/* Signal examples */
const signalStates = {
  working: {
    meta: "CLAUDE · UNTIL",
    title: "Running the full test suite",
    body: "142 checks · round 3",
    action: "Open",
  },
  attention: {
    meta: "CLAUDE · PERMISSION",
    title: "Permission required",
    body: "Bash wants to run pnpm test",
    action: "Review",
  },
  complete: {
    meta: "HOOKED · STOP",
    title: "All checks passed",
    body: "10 tests · until loop cleared",
    action: "Open",
  },
  error: {
    meta: "BUILD · ERROR",
    title: "Release build failed",
    body: "HookSurface.swift · line 84",
    action: "Inspect",
  },
};

const signalShowcase = document.querySelector("[data-signal-showcase]");
const signalPanel = signalShowcase?.querySelector("[role='tabpanel']");
const signalTabs = [...(signalShowcase?.querySelectorAll("[role='tab']") || [])];

function setSignalState(name) {
  const state = signalStates[name];
  if (!state || !signalShowcase || !signalPanel) return;

  signalShowcase.dataset.state = name;
  signalPanel.classList.remove("is-working", "is-attention", "is-complete", "is-error");
  signalPanel.classList.add(`is-${name}`);
  signalPanel.setAttribute("aria-labelledby", `signal-tab-${name}`);

  const values = {
    "[data-signal-meta]": state.meta,
    "[data-signal-title]": state.title,
    "[data-signal-body]": state.body,
    "[data-signal-action]": state.action,
  };

  Object.entries(values).forEach(([selector, value]) => {
    const node = signalPanel.querySelector(selector);
    if (node) node.textContent = value;
  });

  signalTabs.forEach((tab) => {
    const active = tab.dataset.signal === name;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
}

signalTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => setSignalState(tab.dataset.signal || "working"));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = signalTabs[(index + direction + signalTabs.length) % signalTabs.length];
    next.focus();
    setSignalState(next.dataset.signal || "working");
  });
});

signalPanel?.querySelector("[data-signal-action]")?.addEventListener("click", () => {
  showToast("Demo action · returns to the source");
});

setSignalState("working");

/* Scroll reveals */
const revealItems = document.querySelectorAll(".reveal");
if (reduceMotion || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8%" },
  );
  revealItems.forEach((item) => observer.observe(item));
}
