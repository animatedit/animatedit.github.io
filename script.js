const projectGrid = document.querySelector("#project-grid");
const viewerInstances = [];

const getAssetPath = (path) => encodeURI(path);
const allModes = ["render", "solid", "wireframe"];

const createModeButtons = (work) => {
  const availableViews = work.availableViews || ["solid"];
  const firstMode = availableViews[0];

  return allModes
    .filter((mode) => availableViews.includes(mode))
    .map(
      (mode) => `
        <button class="mode-button ${mode === firstMode ? "is-active" : ""}" type="button" data-mode="${mode}">
          ${mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      `
    )
    .join("");
};

const createProjectAction = (work) => {
  const actionText = work.actionText || "Open 3D model";

  if (work.allowModelDownload) {
    return `
      <a class="project-link" href="${getAssetPath(work.glbPath)}" target="_blank" rel="noreferrer">
        ${actionText}
      </a>
    `;
  }

  if (work.purchaseUrl) {
    return `
      <a class="project-link" href="${work.purchaseUrl}" target="_blank" rel="noreferrer">
        ${actionText}
      </a>
    `;
  }

  return "";
};

const createCommerceBadge = (work) => {
  if (!work.commerceBadge) {
    return "";
  }

  return `<span class="project-commerce">${work.commerceBadge}</span>`;
};

const createViewerMarkup = (work, index) => `
  <article class="project-card reveal">
    <div class="project-viewer-shell ${work.artClass || ""}">
      <div class="project-modes" role="tablist" aria-label="${work.title} showcase modes">
        ${createModeButtons(work)}
      </div>
      <div class="project-stage">
        <div class="render-panel ${(work.availableViews || ["solid"])[0] === "render" ? "is-active" : ""}" data-panel="render">
          <img
            class="render-image"
            src="${getAssetPath(work.renderPath)}"
            alt="${work.title} final render"
            loading="lazy"
          />
          <div class="render-empty">Final render preview coming soon.</div>
        </div>
        <div class="viewer-panel ${(work.availableViews || ["solid"])[0] === "solid" ? "is-active" : ""}" data-panel="solid">
          <div class="viewer-canvas" data-viewer="${index}" aria-label="${work.title} solid viewer">
            <div class="viewer-loading">Loading interactive model...</div>
          </div>
        </div>
        <div class="render-panel ${(work.availableViews || ["solid"])[0] === "wireframe" ? "is-active" : ""}" data-panel="wireframe">
          <img
            class="wireframe-image"
            src="${getAssetPath(work.wireframePath)}"
            alt="${work.title} wireframe viewport render"
            loading="lazy"
          />
          <div class="render-empty wireframe-empty">Wireframe preview coming soon.</div>
        </div>
      </div>
    </div>
    <div class="project-copy">
      <div class="project-topline">
        <p class="project-type">${work.category}</p>
        <span class="project-glb">${work.glbLabel}</span>
      </div>
      ${createCommerceBadge(work)}
      <h3>${work.title}</h3>
      <p>${work.description}</p>
      ${createProjectAction(work)}
      <ul>
        ${work.tools.map((tool) => `<li>${tool}</li>`).join("")}
      </ul>
    </div>
  </article>
`;

const initProjectGrid = () => {
  if (!projectGrid || !Array.isArray(window.portfolioWorks)) {
    return;
  }

  projectGrid.innerHTML = window.portfolioWorks.map(createViewerMarkup).join("");
};

const initModeSwitches = () => {
  const cards = document.querySelectorAll(".project-card");

  cards.forEach((card) => {
    const buttons = card.querySelectorAll(".mode-button");
    const panels = card.querySelectorAll("[data-panel]");
    const renderImage = card.querySelector(".render-image");
    const renderEmpty = card.querySelector(".render-empty");
    const wireframeImage = card.querySelector(".wireframe-image");
    const wireframeEmpty = card.querySelector(".wireframe-empty");

    if (renderImage && renderEmpty) {
      renderImage.addEventListener("load", () => {
        renderEmpty.style.display = "none";
        renderImage.style.display = "block";
      });

      renderImage.addEventListener("error", () => {
        renderImage.style.display = "none";
        renderEmpty.style.display = "grid";
      });
    }

    if (wireframeImage && wireframeEmpty) {
      wireframeImage.addEventListener("load", () => {
        wireframeEmpty.style.display = "none";
        wireframeImage.style.display = "block";
      });

      wireframeImage.addEventListener("error", () => {
        wireframeImage.style.display = "none";
        wireframeEmpty.style.display = "grid";
      });
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.mode;

        buttons.forEach((item) => item.classList.toggle("is-active", item === button));
        panels.forEach((panel) => {
          panel.classList.toggle("is-active", panel.dataset.panel === mode);
        });
      });
    });
  });
};

const initReveal = () => {
  const revealItems = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
};

const initHeroTilt = () => {
  const tiltCard = document.querySelector(".tilt-card");

  if (tiltCard && window.matchMedia("(pointer:fine)").matches) {
    tiltCard.addEventListener("mousemove", (event) => {
      const bounds = tiltCard.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;

      const rotateY = ((x / bounds.width) - 0.5) * 14;
      const rotateX = ((y / bounds.height) - 0.5) * -14;

      tiltCard.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    tiltCard.addEventListener("mouseleave", () => {
      tiltCard.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
    });
  }
};

const initContactForm = () => {
  const form = document.querySelector("#contact-form");

  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const name = formData.get("name")?.toString().trim() || "";
    const email = formData.get("email")?.toString().trim() || "";
    const subject = formData.get("subject")?.toString().trim() || "Project Inquiry";
    const message = formData.get("message")?.toString().trim() || "";

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      message,
    ].join("\n");

    const mailto = `mailto:panchalnitesh258@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });
};

const showViewerMessage = (mountNode, message, type = "error") => {
  mountNode.innerHTML = `<div class="viewer-${type}">${message}</div>`;
};

const setMaterialMode = (root, mode) => {
  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const sourceMaterial = child.userData.baseMaterial || child.material;
    child.userData.baseMaterial = sourceMaterial;
    child.material = sourceMaterial;
    child.material.wireframe = mode === "wireframe";
    child.material.needsUpdate = true;
  });
};

const fitCameraToObject = (THREE, camera, controls, object) => {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const fov = (camera.fov * Math.PI) / 180;
  const distance = maxDim / (2 * Math.tan(fov / 2));

  camera.position.set(center.x + distance * 0.9, center.y + distance * 0.45, center.z + distance * 1.2);
  camera.near = distance / 100;
  camera.far = distance * 100;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = distance * 0.4;
  controls.maxDistance = distance * 4;
  controls.update();
};

const buildViewer = async (deps, mountNode, glbPath, mode) => {
  const { THREE, GLTFLoader, OrbitControls } = deps;
  mountNode.innerHTML = "";

  const loader = new GLTFLoader();
  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  mountNode.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = mode === "solid";
  controls.autoRotateSpeed = 1.1;
  controls.enablePan = false;

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1a1414, 1.3);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
  dirLight.position.set(4, 5, 6);
  scene.add(dirLight);

  const rimLight = new THREE.DirectionalLight(0xff7d70, 1.1);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);

  const resize = () => {
    const width = mountNode.clientWidth || 100;
    const height = mountNode.clientHeight || 320;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  resize();

  const gltf = await loader.loadAsync(getAssetPath(glbPath));
  const modelRoot = gltf.scene;
  setMaterialMode(modelRoot, mode);
  scene.add(modelRoot);
  fitCameraToObject(THREE, camera, controls, modelRoot);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(mountNode);

  return {
    renderer,
    resizeObserver,
  };
};

const loadThreeDependencies = async () => {
  const [THREE, gltfModule, orbitModule] = await Promise.all([
    import("https://esm.sh/three@0.164.1"),
    import("https://esm.sh/three@0.164.1/examples/jsm/loaders/GLTFLoader"),
    import("https://esm.sh/three@0.164.1/examples/jsm/controls/OrbitControls"),
  ]);

  return {
    THREE,
    GLTFLoader: gltfModule.GLTFLoader,
    OrbitControls: orbitModule.OrbitControls,
  };
};

const initThreeViewers = async () => {
  if (!Array.isArray(window.portfolioWorks)) {
    return;
  }

  let deps;

  try {
    deps = await loadThreeDependencies();
  } catch (error) {
    document.querySelectorAll(".viewer-canvas").forEach((mountNode) => {
      showViewerMessage(mountNode, "Interactive model preview is unavailable right now.");
    });
    return;
  }

  const jobs = [];

  window.portfolioWorks.forEach((work, index) => {
    const solidMount = document.querySelector(`[data-viewer="${index}"]`);

    if (solidMount) {
      jobs.push(
        buildViewer(deps, solidMount, work.glbPath, "solid").catch(() => {
          showViewerMessage(solidMount, "Interactive model preview is unavailable for this piece.");
        })
      );
    }
  });

  const results = await Promise.allSettled(jobs);
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      viewerInstances.push(result.value);
    }
  });
};

initProjectGrid();
initModeSwitches();
initReveal();
initHeroTilt();
initContactForm();
initThreeViewers();
