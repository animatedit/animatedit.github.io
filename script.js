const works = Array.isArray(window.portfolioWorks) ? window.portfolioWorks : [];

const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const isSmallScreen = window.matchMedia("(max-width: 820px)").matches;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const shouldUseLightMode = isTouchDevice || isSmallScreen || prefersReducedMotion;

let threeModulePromise;

document.addEventListener("DOMContentLoaded", () => {
  renderProjectGrid();
  setupContactForm();
  setupRevealObserver();
  setupTiltCard();
  setupCustomCursor();
});

function renderProjectGrid() {
  const grid = document.getElementById("project-grid");

  if (!grid) {
    return;
  }

  const cardStates = [];

  works.forEach((work) => {
    const views = getAvailableViews(work);
    const defaultView = views.includes("render") ? "render" : views[0];
    const article = document.createElement("article");
    article.className = "project-card reveal";
    article.innerHTML = createProjectCardMarkup(work, views, defaultView);
    grid.appendChild(article);

    const state = {
      work,
      views,
      activeView: defaultView,
      article,
      solidPanel: article.querySelector("[data-panel='solid']"),
      stage: article.querySelector(".project-stage"),
      viewerHost: article.querySelector(".viewer-canvas"),
      loadButton: article.querySelector(".solid-load-button"),
      solidHint: article.querySelector(".solid-hint"),
      loadState: "idle",
      resizeObserver: null,
      controls: null,
      camera: null,
      scene: null,
      renderer: null,
    };

    article.querySelectorAll(".mode-button").forEach((button) => {
      button.addEventListener("click", () => {
        const nextView = button.dataset.view;
        if (!state.views.includes(nextView)) {
          return;
        }

        setActiveView(state, nextView);
      });
    });

    if (state.loadButton) {
      state.loadButton.addEventListener("click", () => {
        loadSolidViewer(state);
      });
    }

    setupDeferredImages(article);
    cardStates.push(state);
  });

  cardStates.forEach((state) => {
    setActiveView(state, state.activeView);
  });
}

function createProjectCardMarkup(work, views, defaultView) {
  const safeTitle = escapeHtml(work.title);
  const safeCategory = escapeHtml(work.category);
  const safeDescription = escapeHtml(work.description);
  const safeLabel = escapeHtml(work.glbLabel || "3D asset");
  const artClass = escapeHtml(work.artClass || "");
  const badgeMarkup = work.commerceBadge
    ? `<div class="project-commerce">${escapeHtml(work.commerceBadge)}</div>`
    : "";
  const actionMarkup = createActionMarkup(work);
  const toolMarkup = Array.isArray(work.tools)
    ? work.tools.map((tool) => `<li>${escapeHtml(tool)}</li>`).join("")
    : "";
  const modeButtons = views
    .map((view) => {
      const label = viewLabel(view);
      const activeClass = view === defaultView ? " is-active" : "";
      return `<button class="mode-button${activeClass}" type="button" data-view="${view}">${label}</button>`;
    })
    .join("");

  return `
    <div class="project-viewer-shell ${artClass}">
      <div class="project-modes">${modeButtons}</div>
      <div class="project-stage">
        ${createImagePanelMarkup("render", work.renderPath, "Final render preview coming soon", safeTitle, defaultView === "render")}
        ${createSolidPanelMarkup(work)}
        ${createImagePanelMarkup("wireframe", work.wireframePath, "Wireframe preview coming soon", safeTitle, defaultView === "wireframe")}
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
      ${actionMarkup}
      <ul>${toolMarkup}</ul>
    </div>
  `;
}

function createImagePanelMarkup(type, imagePath, fallbackText, title, eagerLoad) {
  const hasImage = Boolean(imagePath);
  const imageMarkup = hasImage
    ? `<img class="${type === "wireframe" ? "wireframe-image" : "render-image"}" ${eagerLoad ? `src="${escapeAttribute(imagePath)}"` : `data-src="${escapeAttribute(imagePath)}"`} alt="${escapeAttribute(title)} ${type} view" loading="lazy" decoding="async" />`
    : "";
  const emptyClass = hasImage ? "" : " is-active";

  return `
    <div class="render-panel${emptyClass}" data-panel="${type}">
      ${imageMarkup}
      <div class="render-empty${emptyClass}">
        <p>${escapeHtml(fallbackText)}</p>
      </div>
    </div>
  `;
}

function createSolidPanelMarkup(work) {
  const helperText = shouldUseLightMode
    ? "Tap to load a lightweight interactive 3D view."
    : "Load the interactive 3D view when you want to inspect the model.";
  const buttonText = shouldUseLightMode ? "Load 3D Preview" : "Open Interactive 3D";
  const posterText = shouldUseLightMode
    ? "3D is loaded on demand for smoother mobile performance."
    : "3D loads only when opened to keep the site fast.";

  return `
    <div class="viewer-panel" data-panel="solid">
      <div class="solid-placeholder">
        <p class="solid-kicker">${escapeHtml(work.title)}</p>
        <h4>Interactive model view</h4>
        <p class="solid-hint">${helperText}</p>
        <button class="solid-load-button button button-secondary" type="button">${buttonText}</button>
        <p class="solid-note">${posterText}</p>
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

  const text = work.actionText || (work.allowModelDownload ? "Open 3D model" : "View details");
  const rel = work.allowModelDownload ? "" : ` target="_blank" rel="noreferrer"`;
  const downloadAttr = work.allowModelDownload ? "" : "";

  return `<a class="project-link" href="${escapeAttribute(href)}"${rel}${downloadAttr}>${escapeHtml(text)}</a>`;
}

function getAvailableViews(work) {
  if (Array.isArray(work.availableViews) && work.availableViews.length) {
    return work.availableViews.filter((view) => ["render", "solid", "wireframe"].includes(view));
  }

  return ["solid"];
}

function setActiveView(state, nextView) {
  state.activeView = nextView;

  state.article.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === nextView);
  });

  state.article.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === nextView);
  });

  if (nextView === "render" || nextView === "wireframe") {
    hydratePanelImage(state.article.querySelector(`[data-panel="${nextView}"]`));
  }

  if (nextView === "solid" && state.loadState === "loaded" && state.renderer) {
    requestAnimationFrame(() => {
      handleViewerResize(state);
      state.renderer.render(state.scene, state.camera);
    });
  }
}

function setupDeferredImages(root) {
  root.querySelectorAll(".render-panel").forEach((panel) => {
    const img = panel.querySelector("img");

    if (!img) {
      return;
    }

    img.addEventListener("load", () => {
      panel.querySelector(".render-empty")?.classList.remove("is-active");
    });

    img.addEventListener("error", () => {
      img.removeAttribute("src");
      panel.querySelector(".render-empty")?.classList.add("is-active");
    });

    if (img.getAttribute("src")) {
      hydratePanelImage(panel);
    }
  });
}

function hydratePanelImage(panel) {
  if (!panel) {
    return;
  }

  const img = panel.querySelector("img");
  const fallback = panel.querySelector(".render-empty");

  if (!img) {
    fallback?.classList.add("is-active");
    return;
  }

  if (!img.getAttribute("src")) {
    const deferredSource = img.dataset.src;

    if (deferredSource) {
      img.setAttribute("src", deferredSource);
    }
  }

  if (img.complete && img.naturalWidth > 0) {
    fallback?.classList.remove("is-active");
  }
}

async function loadSolidViewer(state) {
  if (!state || state.loadState === "loading" || state.loadState === "loaded") {
    return;
  }

  state.loadState = "loading";
  state.solidPanel.classList.add("is-loading");
  state.loadButton.disabled = true;
  state.loadButton.textContent = "Loading 3D...";
  state.solidHint.textContent = "Preparing the model viewer.";

  try {
    const { THREE, OrbitControls, GLTFLoader } = await loadViewerModules();
    const scene = new THREE.Scene();
    scene.background = null;

    const host = state.viewerHost;
    const renderer = new THREE.WebGLRenderer({
      antialias: !shouldUseLightMode,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = shouldUseLightMode ? 1.45 : 1.2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, shouldUseLightMode ? 1.1 : 1.5));
    renderer.setSize(host.clientWidth || 300, host.clientHeight || 320, false);
    host.innerHTML = "";
    host.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(shouldUseLightMode ? 52 : 46, getHostAspectRatio(host), 0.1, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enablePan = false;
    controls.minDistance = 1.4;
    controls.maxDistance = 20;
    controls.addEventListener("change", () => {
      if (state.activeView === "solid") {
        renderer.render(scene, camera);
      }
    });

    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a1d20, shouldUseLightMode ? 2.8 : 1.9));
    scene.add(new THREE.AmbientLight(0xffffff, shouldUseLightMode ? 1.15 : 0.45));

    const keyLight = new THREE.DirectionalLight(0xffffff, shouldUseLightMode ? 2.8 : 2.15);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff8c86, shouldUseLightMode ? 2.1 : 1.4);
    rimLight.position.set(-3, 2, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xcad8ff, shouldUseLightMode ? 1.7 : 0.8);
    fillLight.position.set(0, -2, 3);
    scene.add(fillLight);

    const frontLight = new THREE.DirectionalLight(0xffffff, shouldUseLightMode ? 1.9 : 0.7);
    frontLight.position.set(0, 1.5, 6);
    scene.add(frontLight);

    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(state.work.glbPath);
    const model = gltf.scene;
    optimizeModelMaterials(THREE, renderer, model);
    scene.add(model);

    fitCameraToModel({ THREE, camera, controls, model });

    state.scene = scene;
    state.camera = camera;
    state.controls = controls;
    state.renderer = renderer;
    state.resizeObserver = new ResizeObserver(() => {
      handleViewerResize(state);
    });
    state.resizeObserver.observe(host);

    state.loadState = "loaded";
    state.solidPanel.classList.remove("is-loading");
    state.solidPanel.classList.add("is-loaded");
    state.viewerHost.hidden = false;
    renderer.render(scene, camera);
  } catch (error) {
    state.loadState = "error";
    state.solidPanel.classList.remove("is-loading");
    state.solidPanel.classList.add("is-error");
    state.loadButton.disabled = false;
    state.loadButton.textContent = "Try 3D Again";
    state.solidHint.textContent = "3D preview is unavailable right now. You can still view renders and wireframes.";
    console.error("3D viewer failed to load", error);
  }
}

function handleViewerResize(state) {
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

function fitCameraToModel({ THREE, camera, controls, model }) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z) || 1;
  const distance = maxSize * (shouldUseLightMode ? 3.55 : 2.75);

  camera.position.set(
    center.x + distance * 0.42,
    center.y + distance * (shouldUseLightMode ? 0.16 : 0.24),
    center.z + distance
  );
  camera.near = Math.max(0.01, maxSize / 100);
  camera.far = Math.max(100, maxSize * 20);
  camera.updateProjectionMatrix();

  controls.target.set(center.x, center.y + maxSize * 0.04, center.z);
  controls.update();
}

function optimizeModelMaterials(THREE, renderer, model) {
  model.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    child.frustumCulled = false;

    materials.forEach((material) => {
      if (material.map) {
        material.map.colorSpace = THREE.SRGBColorSpace;
        material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }

      if (material.normalMap) {
        material.normalMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }

      if (material.roughnessMap) {
        material.roughnessMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }

      material.side = material.side ?? THREE.FrontSide;
      material.needsUpdate = true;
    });
  });
}

function loadViewerModules() {
  if (!threeModulePromise) {
    threeModulePromise = Promise.all([
      import("https://esm.sh/three@0.161.0"),
      import("https://esm.sh/three@0.161.0/examples/jsm/controls/OrbitControls.js"),
      import("https://esm.sh/three@0.161.0/examples/jsm/loaders/GLTFLoader.js"),
    ]).then(([THREE, controlsModule, loaderModule]) => ({
      THREE,
      OrbitControls: controlsModule.OrbitControls,
      GLTFLoader: loaderModule.GLTFLoader,
    }));
  }

  return threeModulePromise;
}

function setupContactForm() {
  const form = document.getElementById("contact-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = `${formData.get("name") || ""}`.trim();
    const email = `${formData.get("email") || ""}`.trim();
    const subject = `${formData.get("subject") || ""}`.trim();
    const message = `${formData.get("message") || ""}`.trim();

    const mailSubject = encodeURIComponent(subject || "Project inquiry");
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\n\n${message}`
    );

    window.location.href = `mailto:panchalnitesh258@gmail.com?subject=${mailSubject}&body=${body}`;
  });
}

function setupRevealObserver() {
  const items = document.querySelectorAll(".reveal");

  if (!items.length || typeof IntersectionObserver === "undefined") {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -6% 0px",
    }
  );

  items.forEach((item) => observer.observe(item));
}

function setupTiltCard() {
  if (shouldUseLightMode) {
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
    const rotateY = (x - 0.5) * 12;
    const rotateX = (0.5 - y) * 10;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  card.addEventListener("pointerleave", () => {
    card.style.transform = "";
  });
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

  const hoverables = document.querySelectorAll("a, button, input, textarea, .project-card");

  const animateRing = () => {
    ringX += (targetX - ringX) * 0.22;
    ringY += (targetY - ringY) * 0.22;
    ring.style.transform = `translate(${ringX}px, ${ringY}px)`;
    requestAnimationFrame(animateRing);
  };

  document.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    dot.style.transform = `translate(${targetX}px, ${targetY}px)`;
    dot.classList.add("is-visible");
    ring.classList.add("is-visible");
  });

  hoverables.forEach((item) => {
    item.addEventListener("pointerenter", () => {
      ring.classList.add("is-active");
    });

    item.addEventListener("pointerleave", () => {
      ring.classList.remove("is-active");
    });
  });

  requestAnimationFrame(animateRing);
}

function getHostAspectRatio(host) {
  const width = host.clientWidth || 300;
  const height = host.clientHeight || 320;
  return width / height;
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
