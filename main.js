(function () {
  "use strict";

  var canvas = document.getElementById("webgl");
  var hero = document.getElementById("hero");

  function useFallback() {
    if (hero) hero.classList.add("no-webgl");
    if (canvas) canvas.style.display = "none";
  }

  if (!canvas || !hero) return;
  if (typeof THREE === "undefined") return useFallback();

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function supportsWebGL() {
    try {
      var test = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (test.getContext("webgl") || test.getContext("experimental-webgl")));
    } catch (e) {
      return false;
    }
  }

  if (!supportsWebGL()) return useFallback();

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
  } catch (e) {
    return useFallback();
  }

  var isSmallScreen = window.innerWidth < 900;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmallScreen ? 1.75 : 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07070a, 0.06);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);

  /* Procedural environment map for metal reflections */
  function makeEnvTexture() {
    var c = document.createElement("canvas");
    c.width = 512;
    c.height = 256;
    var ctx = c.getContext("2d");

    var base = ctx.createLinearGradient(0, 0, 0, 256);
    base.addColorStop(0, "#1a1030");
    base.addColorStop(0.45, "#0a0a12");
    base.addColorStop(0.62, "#12121c");
    base.addColorStop(1, "#050508");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 256);

    var glowA = ctx.createRadialGradient(360, 90, 0, 360, 90, 150);
    glowA.addColorStop(0, "rgba(139,92,246,0.95)");
    glowA.addColorStop(1, "rgba(139,92,246,0)");
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, 512, 256);

    var glowB = ctx.createRadialGradient(150, 195, 0, 150, 195, 130);
    glowB.addColorStop(0, "rgba(34,211,238,0.7)");
    glowB.addColorStop(1, "rgba(34,211,238,0)");
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, 512, 256);

    var tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  try {
    var pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    var envSource = makeEnvTexture();
    var envTarget = pmrem.fromEquirectangular(envSource);
    scene.environment = envTarget.texture;
    envSource.dispose();
    pmrem.dispose();
  } catch (e) {
    /* Environment optional; lights still carry the scene */
  }

  /* Main object */
  var group = new THREE.Group();
  scene.add(group);

  var knotGeometry = new THREE.TorusKnotGeometry(1.05, 0.33, 256, 32, 2, 3);

  var knot = new THREE.Mesh(
    knotGeometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x7c3aed,
      metalness: 0.85,
      roughness: 0.16,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2
    })
  );
  group.add(knot);

  var wire = new THREE.Mesh(
    knotGeometry,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.07
    })
  );
  wire.scale.setScalar(1.008);
  group.add(wire);

  var ringGeometry = new THREE.TorusGeometry(1.95, 0.006, 8, 200);
  var ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xa78bfa,
    transparent: true,
    opacity: 0.35
  });

  var ringA = new THREE.Mesh(ringGeometry, ringMaterial);
  ringA.rotation.set(Math.PI / 2.3, 0.3, 0);
  group.add(ringA);

  var ringB = new THREE.Mesh(ringGeometry, ringMaterial);
  ringB.rotation.set(Math.PI / 1.8, 0, Math.PI / 3);
  ringB.scale.setScalar(1.12);
  group.add(ringB);

  /* Particles */
  var particleCount = isSmallScreen ? 350 : 700;
  var positions = new Float32Array(particleCount * 3);

  for (var i = 0; i < particleCount; i++) {
    var radius = 2.5 + Math.random() * 4;
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }

  var particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  var particles = new THREE.Points(
    particleGeometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.018,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  scene.add(particles);

  /* Lights */
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));

  var keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
  keyLight.position.set(4, 5, 6);
  scene.add(keyLight);

  var magentaLight = new THREE.PointLight(0x8b5cf6, 2.2, 14, 2);
  magentaLight.position.set(-3, 1, 3);
  scene.add(magentaLight);

  var cyanLight = new THREE.PointLight(0x22d3ee, 1.5, 14, 2);
  cyanLight.position.set(3, -1, 2);
  scene.add(cyanLight);

  /* Interaction state */
  var targetScroll = 0;
  var currentScroll = 0;
  var pointer = { x: 0, y: 0 };
  var targetPointer = { x: 0, y: 0 };

  function damp(current, target, lambda, dt) {
    return current + (target - current) * (1 - Math.exp(-lambda * dt));
  }

  function updateScroll() {
    var rect = hero.getBoundingClientRect();
    var progress = -rect.top / (rect.height || 1);
    targetScroll = Math.max(0, Math.min(1, progress));
  }

  function updatePointer(event) {
    targetPointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    targetPointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  function resize() {
    var width = hero.clientWidth;
    var height = hero.clientHeight;
    if (!width || !height) return;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", updatePointer, { passive: true });

  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(resize).observe(hero);
  }

  canvas.addEventListener("webglcontextlost", function (event) {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    useFallback();
  });

  updateScroll();
  resize();

  /* Render loop */
  var clock = new THREE.Clock();
  var ready = false;

  function render() {
    var dt = Math.min(clock.getDelta(), 0.05);
    var time = clock.elapsedTime;

    currentScroll = damp(currentScroll, targetScroll, 6, dt);
    pointer.x = damp(pointer.x, targetPointer.x, 6, dt);
    pointer.y = damp(pointer.y, targetPointer.y, 6, dt);

    if (!reduceMotion) {
      group.rotation.y = time * 0.08 + pointer.x * 0.25;
      group.rotation.x = 0.18 + pointer.y * 0.18 + currentScroll * 0.4;
      group.rotation.z = currentScroll * 0.6 + pointer.x * 0.08;
      particles.rotation.y = time * 0.01;
    } else {
      group.rotation.set(0.2, 0.5, 0);
    }

    camera.position.z = 6.2 - currentScroll * 1.4;
    camera.position.y = currentScroll * 0.5;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);

    if (!ready) {
      ready = true;
      var wrap = canvas.parentNode;
      if (wrap) wrap.classList.add("is-ready");
    }
  }

  /* Pause when hero off-screen or tab hidden */
  var heroVisible = true;
  var pageVisible = !document.hidden;

  function syncLoop() {
    if (heroVisible && pageVisible) {
      renderer.setAnimationLoop(render);
    } else {
      renderer.setAnimationLoop(null);
    }
  }

  if (typeof IntersectionObserver !== "undefined") {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      syncLoop();
    }, { threshold: 0.05 }).observe(hero);
  }

  document.addEventListener("visibilitychange", function () {
    pageVisible = !document.hidden;
    syncLoop();
  });

  renderer.setAnimationLoop(render);
})();