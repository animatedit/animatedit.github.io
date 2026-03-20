const works = Array.isArray(window.portfolioWorks) ? window.portfolioWorks : [];

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const shouldUseLightMode = isTouchDevice || prefersReducedMotion || window.innerWidth < 860;

let viewerModulesPromise;

document.addEventListener("DOMContentLoaded", () => {
  renderProjectGrid();
  setupMenu();
  setupContactForm();
  setupCustomCursor();
  setupHeroTilt();
});

function renderProjectGrid() {
  const grid = document.getElementById("project-grid");

  if (!grid) {
    return;
  }

  const states = [];

  works.forEach((work) => {
    const availableViews = normalizeViews(work.availableViews);
    const defaultView = availableViews.includes("render") ? "render" : availableViews[0] || "solid";
    const article = document.createElement("article");
    article.className = "project-card";
    article.innerHTML = createProjectMarkup(work, availableViews, defaultView);
    grid.appendChild(article);

    const state = {
      article,
      work,
      activeView: defaultView,
      availableViews,
      solidPanel: article.querySelector('[data-panel="solid"]'),
      viewerHost: article.querySelector(".viewer-canvas"),
      loadButton: article.querySelector(".solid-load-button"),
      solidHint: article.querySelector(".solid-hint"),
      renderer: null,
      scene: null,
      camera: null,
      controls: null,
      resizeObserver: null,
      loadState: "idle",
    };

    article.querySelectorAll(".mode-button").forEach((button) => {
      button.addEventListener("click", () => {
        activateView(state, button.dataset.view);
      });
    });

    if (state.loadButton) {
      state.loadButton.addEventListener("click", () => {
        loadSolidViewer(state);
      });
    }

    setupPanelImages(article);
    activateView(state, defaultView);
    states.push(state);
  });

  return states;
}

function createProjectMarkup(work, availableViews, defaultView) {
  const safeTitle = escapeHtml(work.title);
  const safeCategory = escapeHtml(work.category);
  const safeDescription = escapeHtml(work.description);
  const safeLabel = escapeHtml(work.glbLabel || "3D asset");
  const artClass = escapeHtml(work.artClass || "");
  const badgeMarkup = work.commerceBadge
    ? `<div class="project-commerce">${escapeHtml(work.commerceBadge)}</div>`
    : "";
  const toolsMarkup = Array.isArray(work.tools)
    ? work.tools.map((tool) => `<li>${escapeHtml(tool)}</li>`).join("")
    : "";
  const buttonsMarkup = availableViews
    .map((view) => {
      const activeClass = view === defaultView ? " is-active" : "";
      return `<button class="mode-button${activeClass}" type="button" data-view="${view}">${viewLabel(view)}</button>`;
    })
    .join("");

  return `
    <div class="project-viewer-shell ${artClass}">
      <div class="project-modes">${buttonsMarkup}</div>
      <div class="project-stage">
        ${createImagePanel("render", work.renderPath, safeTitle, defaultView === "render", "Final render preview coming soon")}
        ${createSolidPanel(work)}
        ${createImagePanel("wireframe", work.wireframePath, safeTitle, defaultView === "wireframe", "Wireframe preview coming soon")}
      </div>
    </div>
    <div class="project-copy">
      <div class="project-topline">
        <p class="project-type">${safeCategory}</p>
        <span class="project-glb">${safeLabel}</span>
      </div>
      <h3>${safeTitle}</h3>
      ${badgeMarkup}
      <p>${safeDescription}</p>
      ${createActionMarkup(work)}
      <ul>${toolsMarkup}</ul>
    </div>
  `;
}

function createImagePanel(type, path, title, shouldLoadNow, fallbackText) {
  const hasPath = Boolean(path);
  const imageMarkup = hasPath
    ? `<img class="${type === "wireframe" ? "wireframe-image" : "render-image"}" ${shouldLoadNow ? `src="${escapeAttribute(path)}"` : `data-src="${escapeAttribute(path)}"`} alt="${escapeAttribute(title)} ${type} view" loading="lazy" decoding="async" />`
    : "";
  const emptyClass = hasPath ? "" : " is-active";

  return `
    <div class="render-panel" data-panel="${type}">
      ${imageMarkup}
      <div class="render-empty${emptyClass}">
        <p>${escapeHtml(fallbackText)}</p>
      </div>
    </div>
  `;
}

function createSolidPanel(work) {
  const helperText = isTouchDevice
    ? "Tap to load the interactive 3D preview."
    : "Load the interactive 3D preview when you want to inspect the model.";
  const buttonText = isTouchDevice ? "Tap To Load 3D" : "Load Interactive 3D";

  return `
    <div class="viewer-panel" data-panel="solid">
      <div class="solid-placeholder">
        <p class="solid-kicker">${escapeHtml(work.title)}</p>
        <h4>Interactive model view</h4>
        <p class="solid-hint">${helperText}</p>
        <button class="solid-load-button button button-secondary" type="button">${buttonText}</button>
        <p class="solid-note">3D stays on-demand so the site feels smoother on phones and slower networks.</p>
      </div>
      <div class="viewer-canvas" hidden></div>
    </div>
  `;
}

function createActionMarkup(work) {
  const href = work.allowModelDownload ? work.glbPath : work.purchaseUrl;

  if (!href) {
    return "";
  }

  const text = escapeHtml(work.actionText || (work.allowModelDownload ? "Open 3D model" : "View details"));
  const attrs = work.allowModelDownload ? "" : ' target="_blank" rel="noreferrer"';
  return `<a class="project-link" href="${escapeAttribute(href)}"${attrs}>${text}</a>`;
}

function setupPanelImages(root) {
  root.querySelectorAll(".render-panel").forEach((panel) => {
    const img = panel.querySelector("img");
    const fallback = panel.querySelector(".render-empty");

    if (!img || !fallback) {
      return;
    }

    img.addEventListener("load", () => {
      fallback.classList.remove("is-active");
    });

    img.addEventListener("error", () => {
      fallback.classList.add("is-active");
    });

    if (img.getAttribute("src") && img.complete && img.naturalWidth > 0) {
      fallback.classList.remove("is-active");
    }
  });
}

function activateView(state, nextView) {
  if (!state.availableViews.includes(nextView)) {
    return;
  }

  state.activeView = nextView;

  state.article.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === nextView);
  });

  state.article.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === nextView);
  });

  if (nextView === "render" || nextView === "wireframe") {
    hydrateImagePanel(state.article.querySelector(`[data-panel="${nextView}"]`));
  }

  if (nextView === "solid" && state.loadState === "loaded" && state.renderer) {
    requestAnimationFrame(() => {
      resizeViewer(state);
      state.renderer.render(state.scene, state.camera);
    });
  }
}

function hydrateImagePanel(panel) {
  if (!panel) {
    return;
  }

  const img = panel.querySelector("img");
  const fallback = panel.querySelector(".render-empty");

  if (!img || !fallback) {
    return;
  }

  if (!img.getAttribute("src") && img.dataset.src) {
    img.setAttribute("src", img.dataset.src);
  }

  if (img.complete && img.naturalWidth > 0) {
    fallback.classList.remove("is-active");
  }
}

async function loadSolidViewer(state) {
  if (state.loadState === "loading" || state.loadState === "loaded") {
    return;
  }

  state.loadState = "loading";
  state.loadButton.disabled = true;
  state.loadButton.textContent = "Loading 3D...";
  state.solidHint.textContent = "Preparing the viewer and model.";

  try {
    const { THREE, OrbitControls, GLTFLoader } = await loadViewerModules();
    const host = state.viewerHost;
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      antialias: !shouldUseLightMode,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = shouldUseLightMode ? 1.55 : 1.28;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, shouldUseLightMode ? 1.15 : 1.6));
    renderer.setSize(host.clientWidth || 300, host.clientHeight || 320, false);
    host.innerHTML = "";
    host.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(shouldUseLightMode ? 54 : 48, getAspectRatio(host), 0.1, 200);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 1.5;
    controls.maxDistance = 30;
    controls.addEventListener("change", () => {
      renderer.render(scene, camera);
    });

    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a1d20, shouldUseLightMode ? 3.1 : 2.15));
    scene.add(new THREE.AmbientLight(0xffffff, shouldUseLightMode ? 1.3 : 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, shouldUseLightMode ? 3.0 : 2.2);
    keyLight.position.set(4, 6, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xcfdcff, shouldUseLightMode ? 1.95 : 1.0);
    fillLight.position.set(-3, 2, 4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8c86, shouldUseLightMode ? 1.8 : 1.1);
    rimLight.position.set(-4, 3, -5);
    scene.add(rimLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, shouldUseLightMode ? 2.1 : 0.8);
    frontLight.position.set(0, 1.5, 7);
    scene.add(frontLight);

    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(state.work.glbPath);
    const model = gltf.scene;
    optimizeModelMaterials(THREE, renderer, model);
    scene.add(model);

    frameModel({ THREE, camera, controls, model });

    state.scene = scene;
    state.camera = camera;
    state.controls = controls;
    state.renderer = renderer;
    state.resizeObserver = new ResizeObserver(() => {
      resizeViewer(state);
    });
    state.resizeObserver.observe(host);
    state.loadState = "loaded";
    state.viewerHost.hidden = false;
    state.solidPanel.classList.add("is-loaded");
    renderer.render(scene, camera);
  } catch (error) {
    console.error("Failed to load 3D viewer", error);
    state.loadState = "error";
    state.loadButton.disabled = false;
    state.loadButton.textContent = "Try 3D Again";
    state.solidPanel.classList.add("is-error");
    state.solidHint.textContent = "3D preview is unavailable right now. The render and wireframe views still work.";
  }
}

function resizeViewer(state) {
  if (!state.renderer || !state.camera || !state.viewerHost) {
    return;
  }

  const width = state.viewerHost.clientWidth || 300;
  const height = state.viewerHost.clientHeight || 320;
  state.camera.aspect = width / height;
  state.camera.updateProjectionMatrix();
  state.renderer.setSize(width, height, false);
  state.renderer.render(state.scene, state.camera);
}

function frameModel({ THREE, camera, controls, model }) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  const distance = maxSize * (shouldUseLightMode ? 3.8 : 3.0);

  camera.position.set(
    center.x + distance * 0.38,
    center.y + distance * (shouldUseLightMode ? 0.12 : 0.18),
    center.z + distance
  );
  camera.near = Math.max(0.01, maxSize / 120);
  camera.far = Math.max(120, maxSize * 30);
  camera.updateProjectionMatrix();

  controls.target.set(center.x, center.y + maxSize * 0.03, center.z);
  controls.update();
}

function optimizeModelMaterials(THREE, renderer, model) {
  model.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    child.frustumCulled = false;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const anisotropy = renderer.capabilities.getMaxAnisotropy();

    materials.forEach((material) => {
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.anisotropy = anisotropy;
      }

      if (material.normalMap) {
        material.normalMap.anisotropy = anisotropy;
      }

      if (material.roughnessMap) {
        material.roughnessMap.anisotropy = anisotropy;
      }

      material.needsUpdate = true;
    });
  });
}

function loadViewerModules() {
  if (!viewerModulesPromise) {
    viewerModulesPromise = Promise.all([
      import("https://esm.sh/three@0.161.0"),
      import("https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js"),
      import("https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js"),
    ]).then(([THREE, controlsModule, loaderModule]) => ({
      THREE,
      OrbitControls: controlsModule.OrbitControls,
      GLTFLoader: loaderModule.GLTFLoader,
    }));
  }

  return viewerModulesPromise;
}

function setupMenu() {
  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  if (!header || !toggle || !nav) {
    return;
  }

  toggle.addEventListener("click", () => {
    const nextOpen = !header.classList.contains("is-open");
    header.classList.toggle("is-open", nextOpen);
    toggle.setAttribute("aria-expanded", String(nextOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setupContactForm() {
  const form = document.getElementById("contact-form");

  if (!form) {
    return;
  }

  const alertBox = document.getElementById("form-alert");
  const fields = [...form.querySelectorAll("input[required], textarea[required]")];

  fields.forEach((field) => {
    field.addEventListener("input", () => {
      clearFieldError(field);
      if (alertBox) {
        alertBox.hidden = true;
        alertBox.textContent = "";
      }
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const invalidField = fields.find((field) => !field.checkValidity());

    if (invalidField) {
      const message = getFieldErrorMessage(invalidField);
      showFieldError(invalidField, message);

      if (alertBox) {
        alertBox.hidden = false;
        alertBox.textContent = message;
      }

      invalidField.focus();
      return;
    }

    const formData = new FormData(form);
    const name = `${formData.get("name") || ""}`.trim();
    const email = `${formData.get("email") || ""}`.trim();
    const subject = `${formData.get("subject") || ""}`.trim();
    const message = `${formData.get("message") || ""}`.trim();
    const mailSubject = encodeURIComponent(subject || "Project inquiry");
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:panchalnitesh258@gmail.com?subject=${mailSubject}&body=${body}`;
  });
}

function getFieldErrorMessage(field) {
  const label = field.name === "name"
    ? "your name"
    : field.name === "email"
      ? "a valid email address"
      : field.name === "subject"
        ? "what the project is about"
        : "your message";

  if (field.validity.valueMissing) {
    return `Please enter ${label}.`;
  }

  if (field.validity.typeMismatch) {
    return "Please enter a valid email address.";
  }

  return "Please check this field and try again.";
}

function showFieldError(field, message) {
  clearFieldError(field);
  const label = field.closest("label");

  if (!label) {
    return;
  }

  label.classList.add("is-invalid");
  field.setAttribute("aria-invalid", "true");

  const error = document.createElement("p");
  error.className = "field-error";
  error.textContent = message;
  label.appendChild(error);
}

function clearFieldError(field) {
  const label = field.closest("label");

  if (!label) {
    return;
  }

  label.classList.remove("is-invalid");
  field.removeAttribute("aria-invalid");
  label.querySelector(".field-error")?.remove();
}

function setupCustomCursor() {
  if (isTouchDevice || prefersReducedMotion) {
    return;
  }

  const dot = document.querySelector(".cursor-dot");
  const ring = document.querySelector(".cursor-ring");

  if (!dot || !ring) {
    return;
  }

  let targetX = -100;
  let targetY = -100;
  let ringX = -100;
  let ringY = -100;

  const interactive = document.querySelectorAll("a, button, input, textarea, .project-card");

  const animate = () => {
    ringX += (targetX - ringX) * 0.22;
    ringY += (targetY - ringY) * 0.22;
    dot.style.transform = `translate(${targetX}px, ${targetY}px)`;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(animate);
  };

  document.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    dot.classList.add("is-visible");
    ring.classList.add("is-visible");
  });

  interactive.forEach((node) => {
    node.addEventListener("pointerenter", () => ring.classList.add("is-active"));
    node.addEventListener("pointerleave", () => ring.classList.remove("is-active"));
  });

  requestAnimationFrame(animate);
}

function setupHeroTilt() {
  if (isTouchDevice || prefersReducedMotion) {
    return;
  }

  const card = document.querySelector(".tilt-card");

  if (!card) {
    return;
  }

  card.addEventListener("pointermove", (event) => {
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 10;
    const rotateX = (0.5 - y) * 8;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
}

function normalizeViews(views) {
  if (!Array.isArray(views) || !views.length) {
    return ["solid"];
  }

  return views.filter((view) => ["render", "solid", "wireframe"].includes(view));
}

function viewLabel(view) {
  if (view === "render") {
    return "Render";
  }

  if (view === "wireframe") {
    return "Wireframe";
  }

  return "Solid";
}

function getAspectRatio(host) {
  const width = host.clientWidth || 300;
  const height = host.clientHeight || 320;
  return width / height;
}

function escapeHtml(value) {
  return `${value || ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
