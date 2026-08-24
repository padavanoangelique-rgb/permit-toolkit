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

  function el(html){
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function isCaptured(){
    try { return !!localStorage.getItem(LS_KEY); } catch(e){ return false; }
  }
  function markCaptured(email){
    try { localStorage.setItem(LS_KEY, JSON.stringify({email:email, at:new Date().toISOString()})); } catch(e){}
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

  // --- Header ---
  var header = el(
    '<header class="site-header">' +
      '<div class="inner">' +
        '<a class="brand" href="/index.html" aria-label="Permit Toolkit home">' +
          '<div class="brand-mark">PT</div>' +
          '<div class="brand-text">' +
            '<div class="brand-name">Permit Toolkit</div>' +
            '<div class="brand-tag">Free Contractor Tools</div>' +
          '</div>' +
        '</a>' +
        '<a class="header-cta" href="' + AIO_URL + '" target="_blank" rel="noopener">' +
          'Try PermitAIO <span class="arrow">→</span>' +
        '</a>' +
      '</div>' +
    '</header>'
  );
  document.body.insertBefore(header, document.body.firstChild);

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
  var footer = el(
    '<footer class="site-footer">' +
      '<div class="row">' +
        '<a href="/index.html">All tools</a>' +
        '<a href="' + AIO_URL + '" target="_blank" rel="noopener">PermitAIO</a>' +
      '</div>' +
      '<div>Permit Toolkit · permittoolkit.com · Reference tools only — verify with the local building department.</div>' +
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
  //  EMAIL GATE — one-time, remembered forever via localStorage.
  //  Skips on the homepage (index.html / "/") so people can browse tool cards.
  //  Blocks every interior tool page until email is submitted.
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
          '<h2 id="pt-gate-title">Enter your email to use the free tools</h2>' +
          '<p class="pt-gate-sub">One email, unlimited access to all 13 calculators — forever. No login, no password. Built by the team behind <b>PermitAIO</b>.</p>' +
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
      });
    });

    // Focus the email field for accessibility
    setTimeout(function(){
      var inp = gate.querySelector('input[name=email]');
      if (inp) inp.focus();
    }, 60);
  }

  // Trigger the gate on every non-homepage page unless already captured.
  if (!isCaptured() && !isHomepage()) {
    // Slight delay so the page renders first (better perceived value + SEO)
    if (document.readyState === 'complete') showGate();
    else window.addEventListener('load', function(){ setTimeout(showGate, 150); });
  }
})();
