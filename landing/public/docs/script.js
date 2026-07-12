const toast = document.querySelector("[data-docs-toast]");
let toastTimer;

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

  toast?.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast?.classList.remove("is-visible"), 1800);
}

document.querySelectorAll("[data-copy-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.copyTarget || "");
    const value = target?.textContent?.trim();
    if (value) copyText(value);
  });
});

const sections = [...document.querySelectorAll(".doc-section[id]")];
const sidebarLinks = [...document.querySelectorAll(".docs-sidebar a[href^='#']")];
const minimap = document.querySelector(".docs-minimap");
const minimapLinks = [...document.querySelectorAll(".docs-minimap a[href^='#']")];
const minimapPosition = document.querySelector("[data-minimap-position]");

function setActiveSection(id) {
  const target = `#${id}`;
  const index = sections.findIndex((section) => section.id === id);

  [...sidebarLinks, ...minimapLinks].forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === target);
  });

  if (index >= 0) {
    const current = String(index + 1).padStart(2, "0");
    const total = String(sections.length).padStart(2, "0");
    if (minimapPosition) minimapPosition.textContent = `${current} / ${total}`;
    minimap?.style.setProperty("--mini-progress", `${((index + 1) / sections.length) * 100}%`);
  }
}

const initialSection = window.location.hash.slice(1);
if (sections.some((section) => section.id === initialSection)) setActiveSection(initialSection);

let scrollFrame;

function updateActiveFromScroll() {
  const marker = window.scrollY + Math.max(140, window.innerHeight * 0.18);
  let active = sections[0];

  sections.forEach((section) => {
    const top = section.getBoundingClientRect().top + window.scrollY;
    if (top <= marker) active = section;
  });

  if (active) setActiveSection(active.id);
  scrollFrame = undefined;
}

window.addEventListener("scroll", () => {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(updateActiveFromScroll);
}, { passive: true });

window.addEventListener("hashchange", () => {
  const id = window.location.hash.slice(1);
  if (sections.some((section) => section.id === id)) setActiveSection(id);
});

window.requestAnimationFrame(updateActiveFromScroll);
