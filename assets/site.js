// Permit Toolkit — shared header, PermitAIO promo, footer, and email gate.
// Runs on every page. Interior pages use data-page-type="interior" for the compact top bar.
(function(){
  var AIO_URL = 'https://permitaio.com';

  // Supabase RPC — uses a security-definer function to capture leads.
  // The function bypasses RLS quirks and silently deduplicates by lowercased email.
  var SUPA_URL = 'https://gkckgzruadshnblxtxiq.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrY2tnenJ1YWRzaG5ibHh0eGlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MDU3NTIsImV4cCI6MjEwMjk4MTc1Mn0.xNEkA5pckTyWFW5XIJGcnQAVxkwBqLfKTCV8WCcQOg0';
  var CAPTURE_RPC = 'capture_permit_toolkit_lead';
  var LS_KEY = 'pt_lead_captured_v1';
  var COOKIE_KEY = 'pt_lead_v1';
  var COOKIE_DAYS = 3650; // ~10 years

  function el(html){
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function readCookie(name){
    try {
      var parts = ('; ' + document.cookie).split('; ' + name + '=');
      if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    } catch(e){}
    return '';
  }
  function writeCookie(name, value, days){
    try {
      var d = new Date();
      d.setTime(d.getTime() + days*24*60*60*1000);
      // Domain-less cookie so it works on preview + prod. SameSite=Lax so top-level nav sends it.
      document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + d.toUTCString() + '; path=/; SameSite=Lax';
    } catch(e){}
  }
  function isCaptured(){
    try { if (localStorage.getItem(LS_KEY)) return true; } catch(e){}
    if (readCookie(COOKIE_KEY)) return true;
    return false;
  }
  function markCaptured(email){
    var payload = JSON.stringify({email:email, at:new Date().toISOString()});
    try { localStorage.setItem(LS_KEY, payload); } catch(e){}
    writeCookie(COOKIE_KEY, '1', COOKIE_DAYS);
  }

  function postLead(payload){
    // Call the security-definer RPC. Function handles dedup and returns {ok:true}.
    return fetch(SUPA_URL + '/rest/v1/rpc/' + CAPTURE_RPC, {
      method: 'POST',
      headers: {
        'apikey': SUPA_ANON,
        'Authorization': 'Bearer ' + SUPA_ANON,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_email: payload.email,
        p_role: payload.role || null,
        p_source: payload.source || 'permit-toolkit',
        p_first_tool: payload.first_tool || null,
        p_user_agent: payload.user_agent || null,
        p_referrer: payload.referrer || null
      })
    });
  }

  // --- Header (with Tools dropdown) ---
  // Categorized list of every tool on the site — kept here so every page picks it up.
  var NAV_TOOLS = [
    { group: 'Windows & Doors', items: [
      { href: '/noa-lookup.html',              label: 'NOA / FL Product Approval Lookup' },
      { href: '/rough-opening-calculator.html',label: 'Rough Opening Calculator' },
      { href: '/design-pressure-calculator.html', label: 'Design Pressure Estimator' },
      { href: '/energy-code-check.html',       label: 'Energy Code Check (U & SHGC)' },
      { href: '/egress-calculator.html',       label: 'Egress Opening Calculator' }
    ]},
    { group: 'Enclosures', items: [
      { href: '/patio-enclosure-permit-guide.html', label: 'Sunroom Category Guide' }
    ]},
    { group: 'Any Trade', items: [
      { href: '/permit-fee-estimator.html',    label: 'Permit Fee Estimator' },
      { href: '/electrical-load-calculator.html', label: 'Electrical Service Load' },
      { href: '/property-appraisers.html',     label: 'Property Appraisers' }
    ]}
  ];

  function buildToolsMenuHtml(){
    var currentPath = (location.pathname || '').replace(/\/$/, '') || '/index.html';
    var html = '';
    for (var i = 0; i < NAV_TOOLS.length; i++){
      var g = NAV_TOOLS[i];
      html += '<div class="pt-tools-group">';
      html += '<div class="pt-tools-group-label">' + g.group + '</div>';
      for (var j = 0; j < g.items.length; j++){
        var it = g.items[j];
        var active = (it.href === currentPath) ? ' aria-current="page"' : '';
        html += '<a class="pt-tools-item" href="' + it.href + '"' + active + '>' + it.label + '</a>';
      }
      html += '</div>';
    }
    return html;
  }

  var header = el(
    '<header class="site-header">' +
      '<div class="inner">' +
        '<a class="brand" href="/index.html" aria-label="Permit Toolkit home">' +
          '<div class="brand-mark">PT</div>' +
          '<div class="brand-text">' +
            '<div class="brand-name">Permit Toolkit</div>' +
            '<div class="brand-tag">by <span class="brand-parent">PermitAIO</span></div>' +
          '</div>' +
        '</a>' +
        '<div class="header-right">' +
          '<div class="pt-tools-nav" id="ptToolsNav">' +
            '<button type="button" class="pt-tools-btn" id="ptToolsBtn" aria-haspopup="true" aria-expanded="false" aria-controls="ptToolsMenu">' +
              'Tools <span class="pt-tools-caret" aria-hidden="true">▾</span>' +
            '</button>' +
            '<div class="pt-tools-menu" id="ptToolsMenu" role="menu" hidden>' +
              buildToolsMenuHtml() +
            '</div>' +
          '</div>' +
          '<a class="header-cta" href="' + AIO_URL + '" target="_blank" rel="noopener">' +
            'Try PermitAIO <span class="arrow">→</span>' +
          '</a>' +
        '</div>' +
      '</div>' +
    '</header>'
  );
  document.body.insertBefore(header, document.body.firstChild);

  // Tools dropdown: click to toggle, click-outside/Escape to close.
  (function(){
    var btn  = document.getElementById('ptToolsBtn');
    var menu = document.getElementById('ptToolsMenu');
    var nav  = document.getElementById('ptToolsNav');
    if (!btn || !menu || !nav) return;
    function open(){ menu.hidden = false; btn.setAttribute('aria-expanded','true');  nav.classList.add('open'); }
    function close(){ menu.hidden = true;  btn.setAttribute('aria-expanded','false'); nav.classList.remove('open'); }
    btn.addEventListener('click', function(e){
      e.stopPropagation();
      if (menu.hidden) open(); else close();
    });
    document.addEventListener('click', function(e){
      if (menu.hidden) return;
      if (!nav.contains(e.target)) close();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !menu.hidden) close();
    });
  })();

  // --- Interior compact promo bar ---
  var pageType = document.body.getAttribute('data-page-type');
  if (pageType === 'interior') {
    var wrap = document.querySelector('.wrap, .wrap-narrow');
    if (wrap) {
      var bar = el(
        '<a class="aio-bar" href="' + AIO_URL + '" target="_blank" rel="noopener" style="text-decoration:none;">' +
          '<div class="aio-bar-text">' +
            '<b>Skip the calculators.</b> ' +
            '<span>PermitAIO builds the whole permit package — floor plan, forms, NOAs, HOA — from one Job number.</span>' +
          '</div>' +
          '<span class="aio-bar-cta">Try PermitAIO free →</span>' +
        '</a>'
      );
      var back = wrap.querySelector('.back-link');
      if (back) {
        back.parentNode.insertBefore(bar, back.nextSibling);
      } else {
        wrap.insertBefore(bar, wrap.firstChild);
      }
    }
  }

  // --- Full PermitAIO promo + email capture (all pages) ---
  var promo = el(
    '<section class="aio-promo">' +
      '<div class="aio-promo-inner">' +
        '<div>' +
          '<div class="aio-eyebrow">⚡ Built by the same team</div>' +
          '<h2>Stop calculating. Start submitting.</h2>' +
          '<p>These free tools are handy — but PermitAIO does the whole job: floor plans, county forms, NOA matching, permit tracking, HOA requirements — all connected by one Job number and packaged into a submission-ready ZIP.</p>' +
          '<div class="aio-features">' +
            '<span class="aio-feature">Broward · Miami-Dade · Palm Beach</span>' +
            '<span class="aio-feature">545 South Florida HOAs</span>' +
            '<span class="aio-feature">One-click permit packages</span>' +
            '<span class="aio-feature">Windows &amp; roofing contractors</span>' +
          '</div>' +
          '<a class="aio-cta" href="' + AIO_URL + '" target="_blank" rel="noopener">Start free trial <span>→</span></a>' +
        '</div>' +
        '<div class="aio-email-card">' +
          '<div class="l">Free updates</div>' +
          '<h3>Get new tools by email</h3>' +
          '<p>Occasional emails when we add new calculators, code updates, or PermitAIO features. No spam.</p>' +
          '<form class="aio-email-form" id="aioEmailForm" novalidate>' +
            '<input type="email" name="email" placeholder="you@company.com" required autocomplete="email" />' +
            '<button type="submit">Notify me</button>' +
            '<div class="ok" id="aioEmailOk" hidden>✓ Thanks — you\'re on the list.</div>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</section>'
  );

  // --- Site footer ---
  var YEAR = new Date().getFullYear();
  var footer = el(
    '<footer class="site-footer">' +
      '<div class="row">' +
        '<a href="/index.html">All tools</a>' +
        '<a href="' + AIO_URL + '" target="_blank" rel="noopener">PermitAIO</a>' +
      '</div>' +
      '<div class="footer-disclaimer">Reference tools only — verify with the local building department before permit submission.</div>' +
      '<div class="footer-copyright">© ' + YEAR + ' PermitAIO. Permit Toolkit is a product of PermitAIO. All rights reserved.</div>' +
    '</footer>'
  );

  document.body.appendChild(promo);
  document.body.appendChild(footer);

  // Footer email form → Supabase
  var footerForm = document.getElementById('aioEmailForm');
  if (footerForm) {
    footerForm.addEventListener('submit', function(e){
      e.preventDefault();
      var input = footerForm.querySelector('input[type=email]');
      var okEl = document.getElementById('aioEmailOk');
      var email = (input.value || '').trim();
      if (!email || email.indexOf('@') === -1) { input.focus(); return; }
      postLead({
        email: email,
        source: 'permit-toolkit-footer',
        first_tool: location.pathname,
        user_agent: navigator.userAgent.slice(0,200),
        referrer: (document.referrer || '').slice(0,200)
      }).catch(function(){});
      markCaptured(email);
      input.value = '';
      if (okEl) okEl.hidden = false;
    });
  }

  // ========================================================================
  //  EMAIL GATE — one email, one time, remembered forever.
  //  Homepage: tool grid is hidden behind a "Browse tools" wall until
  //            they submit their email. Hero + PermitAIO promo stay visible.
  //  Tool pages: skip the gate entirely if already captured; otherwise
  //              redirect back to the homepage where the wall lives.
  //  Persistence: localStorage + 10-year cookie — either signal unlocks.
  // ========================================================================
  function isHomepage(){
    var p = location.pathname.replace(/\/$/,'');
    return p === '' || p === '/index' || p === '/index.html' || p.endsWith('/index.html');
  }

  function buildGate(){
    var overlay = el(
      '<div class="pt-gate" role="dialog" aria-modal="true" aria-labelledby="pt-gate-title">' +
        '<div class="pt-gate-card">' +
          '<div class="pt-gate-badge">FREE FOREVER</div>' +
          '<h2 id="pt-gate-title">Enter email to use free tools</h2>' +
          '<p class="pt-gate-sub">One email unlocks all 9 tools — forever. No login, no password. Built by the team behind <b>PermitAIO</b>.</p>' +
          '<form class="pt-gate-form" id="ptGateForm" novalidate>' +
            '<label class="pt-gate-label">Email <span aria-hidden="true">*</span>' +
              '<input type="email" name="email" required autocomplete="email" placeholder="you@company.com" />' +
            '</label>' +
            '<label class="pt-gate-label">I am a…' +
              '<select name="role">' +
                '<option value="">Select one (optional)</option>' +
                '<option value="contractor">Licensed contractor</option>' +
                '<option value="subcontractor">Subcontractor / installer</option>' +
                '<option value="architect">Architect / designer</option>' +
                '<option value="engineer">Engineer</option>' +
                '<option value="expediter">Permit expediter</option>' +
                '<option value="homeowner">Homeowner</option>' +
                '<option value="inspector">Inspector / plans reviewer</option>' +
                '<option value="other">Other</option>' +
              '</select>' +
            '</label>' +
            '<button type="submit" class="pt-gate-btn">Unlock the tools →</button>' +
            '<div class="pt-gate-err" id="ptGateErr" hidden></div>' +
            '<div class="pt-gate-fine">We\'ll never sell your email. Unsubscribe anytime.</div>' +
          '</form>' +
        '</div>' +
      '</div>'
    );
    return overlay;
  }

  // Called after successful capture — reveals the homepage tool grid if we're
  // on the homepage, so the user sees the tools appear behind them.
  function revealHomepageGrid(){
    var wall = document.getElementById('ptHomeWall');
    var grid = document.getElementById('tools');
    if (wall) wall.remove();
    if (grid) grid.classList.remove('pt-locked');
  }

  function showGate(){
    if (document.querySelector('.pt-gate')) return;
    // Freeze page scroll behind overlay
    document.documentElement.classList.add('pt-gate-open');
    var gate = buildGate();
    document.body.appendChild(gate);

    var form = gate.querySelector('#ptGateForm');
    var errEl = gate.querySelector('#ptGateErr');
    var btn = gate.querySelector('.pt-gate-btn');

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var emailInput = form.querySelector('input[name=email]');
      var roleSel = form.querySelector('select[name=role]');
      var email = (emailInput.value || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = 'Please enter a valid email address.';
        errEl.hidden = false;
        emailInput.focus();
        return;
      }
      errEl.hidden = true;
      btn.disabled = true;
      btn.textContent = 'Unlocking…';

      var payload = {
        email: email,
        role: roleSel.value || null,
        source: 'permit-toolkit-gate',
        first_tool: location.pathname,
        user_agent: navigator.userAgent.slice(0,200),
        referrer: (document.referrer || '').slice(0,200)
      };

      postLead(payload).then(function(res){
        // Even 409 duplicate-email is treated as success (Prefer: resolution=ignore-duplicates
        // makes duplicate inserts return 201, but be defensive)
        if (res.ok || res.status === 409) {
          markCaptured(email);
          gate.classList.add('pt-gate-closing');
          setTimeout(function(){
            document.documentElement.classList.remove('pt-gate-open');
            gate.remove();
            revealHomepageGrid();
          }, 250);
        } else {
          errEl.textContent = 'Something went wrong. Please try again.';
          errEl.hidden = false;
          btn.disabled = false;
          btn.textContent = 'Unlock the tools →';
        }
      }).catch(function(){
        // Network failure — save locally and let them through anyway.
        markCaptured(email);
        document.documentElement.classList.remove('pt-gate-open');
        gate.remove();
        revealHomepageGrid();
      });
    });

    // Focus the email field for accessibility
    setTimeout(function(){
      var inp = gate.querySelector('input[name=email]');
      if (inp) inp.focus();
    }, 60);
  }

  // Build the homepage "Browse tools" wall that hides the tool grid until
  // the user submits their email. Anchored just above the grid.
  function installHomepageWall(){
    var grid = document.getElementById('tools');
    if (!grid) return;
    grid.classList.add('pt-locked');
    var wall = el(
      '<div id="ptHomeWall" class="pt-home-wall">' +
        '<div class="pt-home-wall-inner">' +
          '<div class="pt-home-wall-badge">FREE FOREVER</div>' +
          '<h2>Browse the free tools</h2>' +
          '<p>9 field-ready tools for permit prep. One email unlocks the whole site — forever, no login, no password.</p>' +
          '<button type="button" class="pt-home-wall-btn" id="ptHomeWallBtn">Browse tools →</button>' +
          '<div class="pt-home-wall-fine">Built by the team behind PermitAIO. We\'ll never sell your email.</div>' +
        '</div>' +
      '</div>'
    );
    grid.parentNode.insertBefore(wall, grid);
    wall.querySelector('#ptHomeWallBtn').addEventListener('click', function(){
      showGate();
    });
  }

  // Trigger logic:
  // - Homepage + not captured: install the wall (grid hidden, button opens gate).
  // - Homepage + captured: no gate, no wall — full grid visible.
  // - Tool page + not captured: bounce back to homepage where the wall lives.
  // - Tool page + captured: no gate, tool loads immediately.
  function initGate(){
    if (isCaptured()) return;
    if (isHomepage()) {
      installHomepageWall();
    } else {
      // Send them home so the wall can capture them there.
      var current = location.pathname + location.search;
      location.replace('/index.html?next=' + encodeURIComponent(current));
    }
  }

  if (document.readyState === 'complete') initGate();
  else window.addEventListener('load', function(){ setTimeout(initGate, 100); });
})();
