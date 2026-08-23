// Permit Toolkit — shared header, PermitAIO promo, footer injection.
// Runs on every page. Interior pages use data-page-type="interior" to also inject
// a top compact PermitAIO bar just below the header.
(function(){
  var AIO_URL = 'https://permitaio.com';

  function el(html){
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
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
      // insert after the back link if present, else at top of wrap
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

  // Email capture handler — stores in localStorage + posts to a placeholder endpoint.
  // Wire this to your real backend (Supabase, Formspree, Mailchimp, etc.) later.
  var form = document.getElementById('aioEmailForm');
  if (form) {
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var input = form.querySelector('input[type=email]');
      var okEl = document.getElementById('aioEmailOk');
      var email = (input.value || '').trim();
      if (!email || email.indexOf('@') === -1) {
        input.focus();
        return;
      }
      try {
        var list = JSON.parse(localStorage.getItem('pt_emails') || '[]');
        list.push({email: email, at: new Date().toISOString(), page: location.pathname});
        localStorage.setItem('pt_emails', JSON.stringify(list));
      } catch(err){}
      // Fire-and-forget beacon to a placeholder endpoint.
      // Replace with your real endpoint when ready.
      try {
        var payload = JSON.stringify({email: email, source: 'permittoolkit', page: location.pathname});
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/subscribe', new Blob([payload], {type:'application/json'}));
        }
      } catch(err){}
      input.value = '';
      if (okEl) okEl.hidden = false;
    });
  }
})();
