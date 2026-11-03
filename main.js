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
     Dashboard por rol
     ========================================================================== */
  const roles = {
    dueno: [
      { t: 'Facturación · últimos 5 días', wide: true, html: `<div class="bars">${[48,66,54,86,72].map(h=>`<i style="height:${h}%"></i>`).join('')}</div>` },
      { t: 'Alertas pendientes', html: rows([['Aceite 10W40','Stock mínimo','o'],['Filtro de aire','Stock mínimo','o']]) },
      { t: 'Órdenes en curso', wide: true, html: rows([['AB 123 CD · Frenos','En curso','y'],['AC 456 EF · Distribución','En curso','y'],['AA 789 GH · Service','Finalizada','g']]) },
      { t: 'Próximos services', html: rows([['AB 123 CD','A 600 km','y'],['AD 321 BC','Vencido','o']]) },
    ],
    mecanico: [
      { t: 'Mis órdenes de hoy', wide: true, html: rows([['#2041 · Cambio de pastillas','En curso','y'],['#2044 · Service 30.000 km','Pendiente','b'],['#2038 · Alineación','Finalizada','g']]) },
      { t: 'Checklist de ingreso', html: rows([['Exterior','OK','g'],['Motor & Fluidos','OK','g'],['Tren rodante','Pendiente','y']]) },
      { t: 'Repuestos usados', wide: true, html: rows([['Pastillas Brembo x1','Sumado a la orden','g'],['Aceite 10W40 x4','Sumado a la orden','g']]) },
      { t: 'Acceso', html: rows([['Configuración contable','Sin acceso','o']]) },
    ],
    recepcion: [
      { t: 'Ingresos de hoy', wide: true, html: rows([['09:00 · Rodríguez','AB 123 CD','g'],['10:30 · Fernández','AC 456 EF','b'],['15:00 · Gómez','AA 789 GH','b']]) },
      { t: 'Presupuestos', html: rows([['#P-881','Borrador','y'],['#P-879','Enviado PDF','g']]) },
      { t: 'Listos para retirar', wide: true, html: rows([['AD 321 BC','Email enviado','g'],['AE 654 DE','Email enviado','g']]) },
      { t: 'Buscar por patente', html: rows([['Historial completo','1 clic','b']]) },
    ],
  };
  function rows(list) {
    return list.map(([a, b, c]) => `<div class="row"><span>${a}</span><span class="tag ${c}">${b}</span></div>`).join('');
  }
  const widgets = $('#widgets');
  function renderRole(key) {
    widgets.innerHTML = roles[key].map((w, i) =>
      `<div class="widget fade-swap ${w.wide ? 'wide' : ''}" style="animation-delay:${i * 60}ms"><h4>${w.t}</h4>${w.html}</div>`).join('');
    if (window.gsap) gsap.from($$('.bars i', widgets), { scaleY: 0, duration: .8, stagger: .06, ease: 'power3.out' });
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
