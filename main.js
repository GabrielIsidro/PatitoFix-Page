/* ==========================================================================
   PatitoFix — main.js
   Lenis · GSAP/ScrollTrigger · Three.js (hero) · Vanilla-Tilt · Lucide
   ========================================================================== */
(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Fallback de imágenes (logo) ---------- */
  $$('img[data-fallback]').forEach(img => {
    const show = () => { img.style.display = 'none'; $('#' + img.dataset.fallback)?.classList.add('show'); };
    img.addEventListener('error', show);
    if (img.complete && img.naturalWidth === 0) show();
  });

  /* ---------- Iconos ---------- */
  const icons = () => window.lucide && lucide.createIcons();
  icons();
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Menú móvil ---------- */
  const menu = $('#mobile-menu');
  $('#burger').addEventListener('click', () => menu.classList.toggle('open'));
  $$('a', menu).forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = $(id); if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { offset: -20 }) : t.scrollIntoView({ behavior: 'smooth' });
  }));

  /* ==========================================================================
     HERO — Three.js: orbe luminoso + fragmentos antigravedad + polvo cósmico
     ========================================================================== */
  const heroEl = $('#hero');
  const canvas = $('#hero-canvas');
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

  function initHero() {
    if (!window.THREE) return heroEl.classList.add('no-webgl');
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
    catch (e) { return heroEl.classList.add('no-webgl'); }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 14);

    /* Engranaje dentado (forma 2D extruida) */
    function makeGear(teeth, rOut, rIn, rHole, depth) {
      const sh = new THREE.Shape(), steps = teeth * 4;
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2, phase = i % 4;
        const r = (phase === 1 || phase === 2) ? rOut : rIn;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        i === 0 ? sh.moveTo(x, y) : sh.lineTo(x, y);
      }
      sh.closePath();
      const hole = new THREE.Path(); hole.absarc(0, 0, rHole, 0, Math.PI * 2, true); sh.holes.push(hole);
      return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 1 });
    }
    const steel = new THREE.MeshStandardMaterial({ color: 0x0c1830, metalness: .9, roughness: .38, flatShading: true });
    const edgeMat = (c, o) => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o });

    scene.add(new THREE.AmbientLight(0x20335a, 1.4));
    const lb = new THREE.PointLight(0x0066ff, 9, 60); lb.position.set(-9, 3, 7); scene.add(lb);
    const la = new THREE.PointLight(0xff8a00, 8, 60); la.position.set(7, -6, 6); scene.add(la);
    const lc = new THREE.PointLight(0x00d4ff, 3, 50); lc.position.set(0, 8, 5); scene.add(lc);

    const gearDefs = [
      { teeth: 16, r: 5.2, pos: [-9.2, -2.6, -2], speed: .06, edge: 0x1e88e5 },
      { teeth: 12, r: 3.8, pos: [8.4, -3.4, -2.5], speed: -.08, edge: 0xffb800 },
      { teeth: 10, r: 2.2, pos: [-4.2, 5.4, -4], speed: -.1, edge: 0x00a2ff },
      { teeth: 8,  r: 1.6, pos: [10.2, 4.4, -5], speed: .12, edge: 0xff6b00 },
    ];
    const gears = gearDefs.map(d => {
      const geo = makeGear(d.teeth, d.r, d.r * .86, d.r * .32, .9);
      const m = new THREE.Mesh(geo, steel);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 40), edgeMat(d.edge, .35)));
      m.position.set(...d.pos); m.rotation.x = -.18; m.rotation.y = .22;
      scene.add(m);
      return { m, base: new THREE.Vector3(...d.pos), speed: d.speed };
    });

    /* Resplandor del piso del taller (luz de portón / foso) */
    const glowMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime; varying vec2 vUv;
        void main(){
          vec2 p = vec2((vUv.x - 0.5) * 2.0, vUv.y);
          float flick = 0.94 + 0.06 * sin(uTime * 2.3) * sin(uTime * 0.7);
          float amber = exp(-length(vec2(p.x * 0.8, p.y * 3.2)) * 2.4) * 0.85 * flick;
          float blue  = exp(-length(vec2(p.x * 0.6, (p.y - 0.15) * 1.6)) * 2.0) * 0.55;
          vec3 col = vec3(1.0,0.55,0.0) * amber + vec3(0.0,0.4,1.0) * blue;
          gl_FragColor = vec4(col, (col.r + col.g + col.b) * 0.5);
        }`
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(40, 12), glowMat);
    glow.position.z = -6; scene.add(glow);

    function resize() {
      const w = heroEl.clientWidth, h = heroEl.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      const visH = 2 * Math.tan(THREE.MathUtils.degToRad(22.5)) * 14, visW = visH * camera.aspect;
      const visBottom = -visH / 2;
      glow.scale.set(Math.max(visW / 40 * 1.2, .8), 1, 1); glow.position.y = visBottom + 1.2;
      const k = Math.max(Math.min(visW / 26, 1), .35);
      gears.forEach(g => { g.m.position.x = g.base.x * k; g.k = k; });
    }
    resize(); addEventListener('resize', resize);

    let vis = true;
    new IntersectionObserver(([e]) => vis = e.isIntersecting).observe(heroEl);
    const clock = new THREE.Clock();
    (function tick() {
      requestAnimationFrame(tick);
      if (!vis) return;
      const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
      mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
      glowMat.uniforms.uTime.value = t;
      gears.forEach((g, i) => {
        g.m.rotation.z += g.speed * dt;
        g.m.position.x = g.base.x * g.k + mouse.x * (.3 + i * .12);
        g.m.position.y = g.base.y - mouse.y * (.2 + i * .1);
      });
      camera.position.x = mouse.x * .6; camera.position.y = -mouse.y * .35; camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    })();
  }
  initHero();
  heroEl.addEventListener('pointermove', e => {
    const r = heroEl.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width - .5) * 2;
    mouse.ty = ((e.clientY - r.top) / r.height - .5) * 2;
  });

  /* ==========================================================================
     Dashboard interactivo por rol (fiel a PatitoFix)
     ========================================================================== */
  const roleData = {
    dueno: {
      title: '¡Hola, Administrador!',
      sub: 'Así está el taller en este momento.',
      userName: 'Dueño del Taller',
      userRole: 'admin@patitofix.com',
      kpis: [
        { type: 'amber', icon: 'wrench', title: 'En reparación', val: '5', sub: 'Autos con trabajo en curso' },
        { type: 'green', icon: 'package-check', title: 'Listos para entregar', val: '3', sub: 'Esperando al cliente' },
        { type: 'blue', icon: 'receipt', title: 'Facturación', val: '$ 1.45M', sub: 'Este mes consolidado' },
        { type: 'purple', icon: 'file-edit', title: 'Nuevo Ingreso', val: '+ Orden', sub: 'Cotizador y checklist en 30s' }
      ],
      html: `
        <div class="sim-panel fade-swap">
          <div class="sim-panel-header">
            <span class="sim-panel-title"><i data-lucide="wrench" width="14"></i> En reparación</span>
            <span class="sim-badge-count">5 autos</span>
          </div>
          <div class="sim-order-card">
            <div class="sim-order-top">
              <span class="sim-vehicle-title">Ford Ranger 3.2 TDCi</span>
              <span class="sim-plate-pill">AB 123 CD</span>
            </div>
            <div class="sim-order-job">Cambio de pastillas Brembo + Service programado 90.000 km</div>
            <div class="sim-order-meta">
              <span>Cliente: Martín Rodríguez · Mecánico: Carlos</span>
              <span class="sim-status-tag amber">En Reparación</span>
            </div>
          </div>
          <div class="sim-order-card">
            <div class="sim-order-top">
              <span class="sim-vehicle-title">Toyota Hilux 2.8 D-4D</span>
              <span class="sim-plate-pill">AC 456 EF</span>
            </div>
            <div class="sim-order-job">Kit de distribución completo + Bomba de agua y tensores</div>
            <div class="sim-order-meta">
              <span>Cliente: Laura Fernández · Mecánico: Mariano</span>
              <span class="sim-status-tag amber">En Reparación</span>
            </div>
          </div>
        </div>

        <div class="sim-panel fade-swap" style="animation-delay: 80ms">
          <div class="sim-panel-header">
            <span class="sim-panel-title"><i data-lucide="package-check" width="14"></i> Listos para entregar</span>
            <span class="sim-badge-count">3 listos</span>
          </div>
          <div class="sim-order-card">
            <div class="sim-order-top">
              <span class="sim-vehicle-title">VW Gol Trend 1.6 MSI</span>
              <span class="sim-plate-pill">AA 789 GH</span>
            </div>
            <div class="sim-order-job">Service completo 60.000 km + Rectificado de discos</div>
            <div class="sim-order-meta">
              <span>Facturado: <strong>$ 135.500</strong></span>
              <span class="sim-status-tag green">Aviso Enviado ✓</span>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:4px;">
              <button class="sim-btn-action green"><i data-lucide="check-circle" width="12"></i> Entregar Llaves</button>
            </div>
          </div>
          <div class="sim-order-card">
            <div class="sim-order-top">
              <span class="sim-vehicle-title">Chevrolet Cruze 1.4 Turbo</span>
              <span class="sim-plate-pill">AD 321 BC</span>
            </div>
            <div class="sim-order-job">Cambio de embrague + Líquido de frenos DOT4</div>
            <div class="sim-order-meta">
              <span>Facturado: <strong>$ 240.000</strong></span>
              <span class="sim-status-tag green">Listo</span>
            </div>
            <div style="display:flex; justify-content:flex-end; margin-top:4px;">
              <button class="sim-btn-action green"><i data-lucide="check-circle" width="12"></i> Entregar Llaves</button>
            </div>
          </div>
        </div>
      `
    },
    mecanico: {
      title: '¡Hola, Carlos!',
      sub: 'Esto es lo que tenés asignado hoy en el taller.',
      userName: 'Carlos Gómez',
      userRole: 'Mecánico Oficial · Foso 2',
      kpis: [
        { type: 'slate', icon: 'clipboard-list', title: 'Por iniciar', val: '2', sub: 'Esperando ingreso a foso' },
        { type: 'amber', icon: 'wrench', title: 'En curso', val: '3', sub: 'Asignados a tu cargo' },
        { type: 'green', icon: 'check-circle-2', title: 'Terminados', val: '4', sub: 'Completados esta semana' },
        { type: 'red', icon: 'alert-triangle', title: 'Alertas service', val: '2', sub: 'Kilometraje crítico' }
      ],
      html: `
        <div class="sim-panel fade-swap">
          <div class="sim-panel-header">
            <span class="sim-panel-title"><i data-lucide="hammer" width="14"></i> Mis Asignadas</span>
            <div class="sim-filter-bar">
              <button class="sim-filter-btn active">Solo mías (3)</button>
              <button class="sim-filter-btn">Todo el taller (7)</button>
            </div>
          </div>
          <div class="sim-order-card">
            <div class="sim-order-top">
              <span class="sim-vehicle-title">#2041 · Ford Ranger (AB 123 CD)</span>
              <span class="sim-status-tag amber">En Reparación</span>
            </div>
            <div class="sim-order-job">Cambio de pastillas de freno Brembo + Purga de circuito</div>
            <div class="sim-order-meta">
              <span>Repuesto: <strong>Pastillas Brembo x1</strong></span>
              <button class="sim-btn-action blue"><i data-lucide="check" width="12"></i> Finalizar y Notificar</button>
            </div>
          </div>
          <div class="sim-order-card">
            <div class="sim-order-top">
              <span class="sim-vehicle-title">#2044 · Peugeot 208 (AF 912 JK)</span>
              <span class="sim-status-tag blue">Por Iniciar</span>
            </div>
            <div class="sim-order-job">Service 30.000 km: Aceite 10W40 + Filtros originales</div>
            <div class="sim-order-meta">
              <span>Tiempo est.: 45 min · Bahía 1</span>
              <button class="sim-btn-action blue"><i data-lucide="play" width="12"></i> Iniciar Trabajo</button>
            </div>
          </div>
        </div>

        <div class="sim-panel fade-swap" style="animation-delay: 80ms">
          <div class="sim-panel-header">
            <span class="sim-panel-title"><i data-lucide="clipboard-check" width="14"></i> Checklist 360° en Elevador</span>
            <span class="sim-badge-count">Ficha de ingreso</span>
          </div>
          <div class="ck on"><i data-lucide="check" width="13"></i> Exterior sin daños de carrocería</div>
          <div class="ck on"><i data-lucide="check" width="13"></i> Motor: Aceite y filtros verificados</div>
          <div class="ck on" style="border-color: rgba(245,158,11,.4);"><i data-lucide="alert-triangle" width="13" style="color:#f59e0b"></i> Tren delantero: Fuelles con desgaste leve</div>
          <div class="ck on"><i data-lucide="check" width="13"></i> Batería y carga de alternador OK</div>
          <div style="font-size:0.68rem; color:#94a3b8; margin-top:8px; line-height:1.4;">
            🔒 <em>Registrado con firma digital y fotos adjuntas para protección contra reclamos.</em>
          </div>
        </div>
      `
    }
  };

  const simGreetingTitle = $('#sim-greeting-title');
  const simGreetingSub = $('#sim-greeting-sub');
  const simUserName = $('#sim-user-name');
  const simUserRole = $('#sim-user-role');
  const simKpisGrid = $('#sim-kpis-grid');
  const widgets = $('#widgets');

  function renderRole(key) {
    const data = roleData[key] || roleData.dueno;
    if (simGreetingTitle) simGreetingTitle.textContent = data.title;
    if (simGreetingSub) simGreetingSub.textContent = data.sub;
    if (simUserName) simUserName.textContent = data.userName;
    if (simUserRole) simUserRole.textContent = data.userRole;

    if (simKpisGrid) {
      simKpisGrid.innerHTML = data.kpis.map(k => `
        <div class="sim-kpi-card ${k.type}">
          <div class="sim-kpi-title"><i data-lucide="${k.icon}" width="14"></i> ${k.title}</div>
          <div class="sim-kpi-value">${k.val}</div>
          <div class="sim-kpi-sub">${k.sub}</div>
        </div>
      `).join('');
    }

    if (widgets) {
      widgets.innerHTML = data.html;
    }

    icons();
  }

  $$('.role-btn').forEach(b => b.addEventListener('click', () => {
    $$('.role-btn').forEach(x => x.classList.toggle('active', x === b));
    renderRole(b.dataset.role);
  }));
  renderRole('dueno');

  /* ==========================================================================
     Spotlight del Bento (coordenadas X/Y del cursor)
     ========================================================================== */
  $$('.card').forEach(c => c.addEventListener('pointermove', e => {
    const r = c.getBoundingClientRect();
    c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    c.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }));
  /* Vanilla-tilt: en táctil/reduced-motion lo desactivamos vía CSS/opciones ya declaradas en data-attrs */
  if (reduceMotion || matchMedia('(hover: none)').matches) $$('[data-tilt]').forEach(e => e.vanillaTilt?.destroy());

  /* ==========================================================================
     Precios: switch mensual/anual con conteo animado
     ========================================================================== */
  let yearly = false;
  $$('.toggle button').forEach(b => b.addEventListener('click', () => {
    yearly = b.dataset.period === 'yearly';
    $$('.toggle button').forEach(x => x.classList.toggle('active', x === b));
    $$('[data-price]').forEach(el => {
      const base = +el.dataset.price, target = Math.round(yearly ? base * .8 : base);
      const o = { v: +el.textContent };
      if (window.gsap) gsap.to(o, { v: target, duration: .8, ease: 'power3.out', onUpdate: () => el.textContent = Math.round(o.v) });
      else el.textContent = target;
    });
    $$('[data-note]').forEach(n => n.textContent = yearly ? 'Facturado anualmente · 20% OFF' : 'Facturado mensualmente');
  }));

  /* ==========================================================================
     GSAP: reveals, hero intro, dashboard 3D, contadores, timeline
     ========================================================================== */
  if (window.gsap && window.ScrollTrigger && !reduceMotion) {
    gsap.registerPlugin(ScrollTrigger);

    /* Hero: entrada escalonada */
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.nav', { y: -60, opacity: 0, duration: .9 })
      .from('[data-hero]', { y: 30, opacity: 0, duration: 1, stagger: .15 }, '-=.5');

    /* Reveal genérico */
    gsap.utils.toArray('.reveal').forEach(el => {
      gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    /* Dashboard se endereza con scroll */
    gsap.to('#dash3d', { rotateX: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.dash-persp', start: 'top 85%', end: 'top 25%', scrub: true } });

    /* Contadores en vivo */
    $$('[data-count]').forEach(el => {
      const target = +el.dataset.count, o = { v: 0 }, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true,
        onEnter: () => gsap.to(o, { v: target, duration: 1.8, ease: 'power2.out', onUpdate: () => el.textContent = pre + Math.round(o.v) + suf }) });
    });

    /* Parallax suave del hero al hacer scroll */
    gsap.to('.hero-content', { yPercent: 18, opacity: .2, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  } else {
    /* Sin animación: mostrar estados finales */
    $$('[data-count]').forEach(el => el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || ''));
    $('#dash3d').style.transform = 'none';
  }
})();
