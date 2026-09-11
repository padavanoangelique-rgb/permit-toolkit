/* Permit Toolkit — 60-Second Site Check */
(function (root) {
  "use strict";

  var STORAGE_KEY = "pt_60_second_site_check_v1";
  var AIO = (root && root.PT_AIO_URL) || "https://permitaio.com";
  var DISCLAIMER =
    "This field checklist is an organizational pre-production tool. It does not determine code compliance, engineering requirements, permit approval, electrical scope, egress compliance, or jurisdictional requirements. Requirements vary by location, building classification, scope, product system, site conditions, and authority having jurisdiction. Verify final requirements with the applicable jurisdiction and qualified design, engineering, electrical, and permitting professionals.";

  var ELECTRICAL_ITEMS = [
    { id: "exterior_light", label: "Exterior light" },
    { id: "interior_switch", label: "Interior switch" },
    { id: "interior_outlet", label: "Interior patio outlet" },
    { id: "exterior_outlet", label: "Exterior patio outlet" },
  ];

  function initialState() {
    return {
      projectScope: null,
      propertyType: null,
      siteVisitComplete: null,
      measurementsTaken: null,
      roomLocationsRecorded: null,
      photosTaken: null,
      permitApplication: null,
      hoaStatus: null,
      moreThanThreeStories: null,
      patioHasGlass: null,
      patioPreviouslyPermitted: null,
      patioPhotosTaken: null,
      patioElectrical: null,
      bedroomPatioAccess: null,
      optionalElectricalMissing: [],
      optionalNote: "",
      completedAt: null,
      screen: "quiz",
    };
  }

  function isPatio(s) {
    return s.projectScope === "patio" || s.projectScope === "both";
  }
  function isWindows(s) {
    return s.projectScope === "windows_doors" || s.projectScope === "both";
  }

  var QUESTIONS = [
    {
      id: "projectScope",
      title: "What are you checking today?",
      options: [
        { value: "windows_doors", label: "Windows / Doors" },
        { value: "patio", label: "Patio Enclosure" },
        { value: "both", label: "Both" },
      ],
      when: function () { return true; },
    },
    {
      id: "propertyType",
      title: "What type of property is this?",
      options: [
        { value: "house_townhome", label: "House / Townhome" },
        { value: "condo", label: "Condo" },
        { value: "commercial_other", label: "Commercial / Other" },
      ],
      when: function () { return true; },
    },
    {
      id: "siteVisitComplete",
      title: "Is this site visit complete?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "Not yet" },
      ],
      when: function () { return true; },
    },
    {
      id: "measurementsTaken",
      title: "Did you take measurements?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
      when: function () { return true; },
    },
    {
      id: "roomLocationsRecorded",
      title: "Did you record room locations?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
      when: function () { return true; },
    },
    {
      id: "photosTaken",
      title: "Did you take job photos?",
      hint: "General job photos. Patio jobs get a separate patio-photo question.",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
      when: function () { return true; },
    },
    {
      id: "permitApplication",
      title: "Signed permit application received?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "verify", label: "Verify later" },
      ],
      when: function () { return true; },
    },
    {
      id: "hoaStatus",
      title: "HOA / condo association status?",
      options: [
        { value: "none", label: "No HOA / association" },
        { value: "complete", label: "HOA — contact and form received" },
        { value: "missing", label: "HOA — information or form still needed" },
        { value: "unknown", label: "Not sure" },
      ],
      when: function () { return true; },
    },
    {
      id: "moreThanThreeStories",
      title: "Is the building more than 3 stories?",
      options: [
        { value: "no", label: "No" },
        { value: "yes", label: "Yes" },
        { value: "unknown", label: "Not sure" },
      ],
      when: function (s) { return s.propertyType === "condo"; },
    },
    {
      id: "patioHasGlass",
      title: "Is there currently glass in the patio?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "unknown", label: "Not sure" },
      ],
      when: isPatio,
    },
    {
      id: "patioPreviouslyPermitted",
      title: "Was the existing patio permitted?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
        { value: "unknown", label: "Not sure" },
      ],
      when: isPatio,
    },
    {
      id: "patioPhotosTaken",
      title: "Did you take patio-condition photos?",
      options: [
        { value: "yes", label: "Yes" },
        { value: "no", label: "No" },
      ],
      when: isPatio,
    },
    {
      id: "patioElectrical",
      title: "Patio electrical check",
      hint: "Exterior light, interior switch, interior outlet, and exterior outlet.",
      options: [
        { value: "all_present", label: "All present" },
        { value: "one_or_more_missing", label: "One or more missing" },
        { value: "unknown", label: "Not sure / needs photo review" },
      ],
      when: isPatio,
    },
    {
      id: "bedroomPatioAccess",
      title: "Bedroom access to patio?",
      options: [
        { value: "no_bedroom", label: "No bedroom opens to patio" },
        { value: "bedroom_door_exists", label: "Bedroom has a door to patio" },
        { value: "bedroom_no_door", label: "Bedroom opens toward patio — no door" },
        { value: "unknown", label: "Not sure" },
      ],
      when: isPatio,
    },
  ];

  function visibleQuestions(state) {
    return QUESTIONS.filter(function (q) {
      return q.when(state);
    });
  }

  function currentQuestion(state) {
    var list = visibleQuestions(state);
    if (holdId) {
      for (var h = 0; h < list.length; h++) {
        if (list[h].id === holdId) return { q: list[h], index: h, total: list.length };
      }
    }
    for (var i = 0; i < list.length; i++) {
      if (state[list[i].id] == null) return { q: list[i], index: i, total: list.length };
    }
    return { q: null, index: list.length, total: list.length };
  }

  function buildChecklistResult(state) {
    var flags = [];
    function add(id, flag, priority, action, tag) {
      flags.push({ id: id, flag: flag, priority: priority, action: action, tag: tag || null });
    }

    if (state.siteVisitComplete === "no") {
      add("visit", "Site visit not complete", "Medium", "Complete remaining field visit items before handoff.", "field_visit_open");
    }
    if (state.measurementsTaken === "no") {
      add("meas", "Measurements missing", "High", "Assign measure/field follow-up.", "field_measurements_missing");
    }
    if (state.roomLocationsRecorded === "no") {
      add("rooms", "Room locations missing", "High", "Record room locations for affected openings.", "field_locations_missing");
    }
    if (state.photosTaken === "no") {
      add("photos", "General job photos missing", "Medium", "Capture interior/exterior opening and site-condition photos.", "field_photos_missing");
    }

    if (state.permitApplication === "no") {
      add("app", "Signed permit application missing", "High", "Obtain signed permit application before submittal.", "permit_application_missing");
    } else if (state.permitApplication === "verify") {
      add("appv", "Permit application status needs verification", "Medium", "Confirm signing/authorization requirements.", "permit_application_verify");
    }

    if (state.hoaStatus === "missing") {
      add("hoa", "HOA/association information or form missing", "High", "Obtain association contact, application/form, and approval requirements.", "hoa_followup");
    } else if (state.hoaStatus === "unknown") {
      add("hoau", "HOA/association status unconfirmed", "Medium", "Confirm whether HOA/condo approval requirements apply.", "hoa_followup");
    }

    if (state.propertyType === "condo" && state.moreThanThreeStories === "yes") {
      add("eng", "Engineering review required", "Critical", "Assign engineering/building review before the job moves forward.", "engineering_review");
    } else if (state.propertyType === "condo" && state.moreThanThreeStories === "unknown") {
      add("engv", "Building height/engineering review needs verification", "High", "Confirm building height and applicable review requirements.", "engineering_review");
    }
    if (state.propertyType === "commercial_other") {
      add("class", "Building classification review suggested", "Medium", "Confirm project classification and applicable permit/engineering workflow.", "commercial_other");
    }

    if (isPatio(state)) {
      if (state.patioHasGlass === "unknown") {
        add("glass", "Existing patio/glass condition unconfirmed", "Medium", "Photograph and verify existing screened/glazed enclosure condition.", "patio_glass_verify");
      }
      if (state.patioPreviouslyPermitted === "no") {
        add("pp", "Existing patio permit history needs review", "High", "Verify existing permit records before finalizing scope.", "existing_patio_permit_verify");
      } else if (state.patioPreviouslyPermitted === "unknown") {
        add("ppu", "Existing patio permit history unconfirmed", "Medium", "Verify prior permitting/record history.", "existing_patio_permit_verify");
      }
      if (state.patioPhotosTaken === "no") {
        add("pph", "Patio-condition photos missing", "High", "Capture patio, roof connection, enclosure, door, and electrical-condition photos.", "field_photos_missing");
      }
      if (state.patioElectrical === "one_or_more_missing") {
        add("elec", "Electrical review required", "Critical", "Assign electrician review before final scope/production decisions.", "electrical_review");
      } else if (state.patioElectrical === "unknown") {
        add("elecv", "Patio electrical verification needed", "High", "Confirm exterior light, interior switch, interior outlet, and exterior outlet.", "electrical_verify");
      }
      if (state.bedroomPatioAccess === "bedroom_no_door") {
        add("egr", "Potential egress issue", "Critical", "Flag for permit/code/engineering review before finalizing the enclosure scope.", "egress_review");
      } else if (state.bedroomPatioAccess === "unknown") {
        add("egrv", "Bedroom-to-patio egress condition unconfirmed", "High", "Verify bedroom access and affected path before finalizing scope.", "egress_review");
      }
    }

    var rank = { Critical: 3, High: 2, Medium: 1 };
    flags.sort(function (a, b) {
      return (rank[b.priority] || 0) - (rank[a.priority] || 0);
    });

    var hasCritical = flags.some(function (f) { return f.priority === "Critical"; });
    var docIds = { app: 1, appv: 1, hoa: 1, hoau: 1 };
    var hasDoc = flags.some(function (f) { return docIds[f.id]; });
    var hasOther = flags.length > 0;

    var overallStatus;
    if (hasCritical) overallStatus = "hold_for_review";
    else if (hasDoc) overallStatus = "needs_documents";
    else if (hasOther) overallStatus = "needs_field_followup";
    else overallStatus = "ready";

    var labels = {
      ready: "Ready for Product & Permit-Prep Review",
      needs_documents: "Needs Documents / Association Follow-Up",
      needs_field_followup: "Needs Field Follow-Up",
      hold_for_review: "Hold for Engineering, Electrical, or Egress Review",
    };

    var seen = {};
    var nextActions = [];
    flags.forEach(function (f) {
      if (!f.action || seen[f.action]) return;
      seen[f.action] = true;
      nextActions.push(f.action);
    });
    nextActions = nextActions.slice(0, 5);

    var completeItems = [];
    var missingItems = [];
    var verificationItems = [];
    flags.forEach(function (f) {
      if (f.priority === "Critical" || f.priority === "High") missingItems.push(f.flag);
      else verificationItems.push(f.flag);
    });
    if (state.measurementsTaken === "yes") completeItems.push("Measurements recorded");
    if (state.roomLocationsRecorded === "yes") completeItems.push("Room locations recorded");
    if (state.photosTaken === "yes") completeItems.push("General job photos taken");
    if (isPatio(state) && state.patioPhotosTaken === "yes") completeItems.push("Patio-condition photos taken");
    if (state.permitApplication === "yes") completeItems.push("Signed permit application received");
    if (state.hoaStatus === "none" || state.hoaStatus === "complete") completeItems.push("HOA/association status captured");

    var tags = [];
    if (isWindows(state)) tags.push("window_door_job");
    if (isPatio(state)) tags.push("patio_enclosure");
    if (state.propertyType === "condo") tags.push("condo");
    if (state.propertyType === "commercial_other") tags.push("commercial_other");
    flags.forEach(function (f) {
      if (f.tag && tags.indexOf(f.tag) === -1) tags.push(f.tag);
    });

    function yn(v) {
      if (v === "yes") return "Complete";
      if (v === "no") return "Missing";
      return "—";
    }
    function hoaRow() {
      if (state.hoaStatus === "none") return "None";
      if (state.hoaStatus === "complete") return "Complete";
      if (state.hoaStatus === "missing") return "Follow-up needed";
      if (state.hoaStatus === "unknown") return "Verify";
      return "—";
    }
    function appRow() {
      if (state.permitApplication === "yes") return "Received";
      if (state.permitApplication === "no") return "Missing";
      if (state.permitApplication === "verify") return "Verify";
      return "—";
    }
    function engRow() {
      if (state.propertyType === "condo" && state.moreThanThreeStories === "yes") return "Review required";
      if (state.propertyType === "condo" && state.moreThanThreeStories === "unknown") return "Verify";
      if (state.propertyType === "commercial_other") return "Verify";
      return "Not flagged";
    }
    function patioPermitRow() {
      if (!isPatio(state)) return "Not applicable";
      if (state.patioPreviouslyPermitted === "yes") return "Confirmed";
      if (state.patioPreviouslyPermitted === "unknown") return "Verify";
      if (state.patioPreviouslyPermitted === "no") return "Review needed";
      return "—";
    }
    function elecRow() {
      if (!isPatio(state)) return "Not applicable";
      if (state.patioElectrical === "all_present") return "Clear";
      if (state.patioElectrical === "unknown") return "Verify";
      if (state.patioElectrical === "one_or_more_missing") return "Electrician review needed";
      return "—";
    }
    function egrRow() {
      if (!isPatio(state)) return "Not applicable";
      if (state.bedroomPatioAccess === "bedroom_no_door") return "Potential issue";
      if (state.bedroomPatioAccess === "unknown") return "Verify";
      if (state.bedroomPatioAccess === "bedroom_door_exists") return "Captured — not a code clearance";
      if (state.bedroomPatioAccess === "no_bedroom") return "Not flagged";
      return "—";
    }

    var related = [];
    if (flags.some(function (f) { return f.id === "eng" || f.id === "engv"; })) {
      related.push({ href: "./design-pressure-calculator.html", label: "Design Pressure Estimator" });
    }
    if (isWindows(state)) {
      related.push({ href: "./noa-lookup.html", label: "NOA / FL Product Approval Lookup" });
      related.push({ href: "./window-wall-designer.html", label: "Window Wall Designer" });
    }
    if (flags.some(function (f) { return f.id === "egr" || f.id === "egrv"; })) {
      related.push({ href: "./egress-calculator.html", label: "Egress Opening Calculator" });
    }
    if (state.measurementsTaken === "no") {
      related.push({ href: "./rough-opening-calculator.html", label: "Rough Opening Calculator" });
    }

    return {
      overallStatus: overallStatus,
      statusLabel: labels[overallStatus],
      completeItems: completeItems,
      missingItems: missingItems,
      verificationItems: verificationItems,
      flags: flags,
      nextActions: nextActions,
      tags: tags,
      rows: {
        measurements: yn(state.measurementsTaken),
        rooms: yn(state.roomLocationsRecorded),
        photos: yn(state.photosTaken),
        patioPhotos: isPatio(state) ? yn(state.patioPhotosTaken) : "Not applicable",
        permit: appRow(),
        hoa: hoaRow(),
        engineering: engRow(),
        patioPermit: patioPermitRow(),
        electrical: elecRow(),
        egress: egrRow(),
      },
      related: related,
    };
  }

  function scopeLabel(v) {
    if (v === "windows_doors") return "Windows / Doors";
    if (v === "patio") return "Patio Enclosure";
    if (v === "both") return "Windows / Doors + Patio Enclosure";
    return "—";
  }
  function propertyLabel(v) {
    if (v === "house_townhome") return "House / Townhome";
    if (v === "condo") return "Condo";
    if (v === "commercial_other") return "Commercial / Other";
    return "—";
  }

  root.PTSiteCheck = {
    initialState: initialState,
    buildChecklistResult: buildChecklistResult,
    visibleQuestions: visibleQuestions,
    QUESTIONS: QUESTIONS,
  };

  if (typeof document === "undefined") return;
  var app = document.getElementById("scApp");
  if (!app) return;

  var state = load();
  var flash = null;
  var holdId = null;

  function load() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return initialState();
      var parsed = JSON.parse(raw);
      var base = initialState();
      Object.keys(base).forEach(function (k) {
        if (parsed[k] !== undefined) base[k] = parsed[k];
      });
      return base;
    } catch (e) {
      return initialState();
    }
  }
  function save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "\u0026amp;")
      .replace(/</g, "\u0026lt;")
      .replace(/"/g, "\u0026quot;");
  }

  function toneClass(status) {
    if (status === "ready") return "ok";
    if (status === "hold_for_review") return "hold";
    return "warn";
  }
  function toneIcon(status) {
    if (status === "ready") return "✓";
    if (status === "hold_for_review") return "!";
    return "•";
  }

  function render() {
    if (state.screen === "result") {
      renderResult();
      return;
    }
    var cur = currentQuestion(state);
    if (!cur.q) {
      state.screen = "result";
      state.completedAt = state.completedAt || new Date().toISOString();
      save();
      renderResult();
      return;
    }
    var step = cur.index + 1;
    var html = "";
    html += '<div class="sc-top">';
    html += '<button type="button" class="sc-back"' + (cur.index === 0 ? " disabled" : "") + ' id="scBack">← Back</button>';
    html += '<div class="sc-progress" aria-live="polite">Step ' + step + " of " + cur.total + " · About 1 minute</div>";
    html += "</div>";
    html += '<h1 class="sc-q">' + esc(cur.q.title) + "</h1>";
    if (cur.q.hint) html += '<p class="sc-hint">' + esc(cur.q.hint) + "</p>";
    html += '<div class="sc-choices" role="group" aria-label="' + esc(cur.q.title) + '">';
    cur.q.options.forEach(function (opt) {
      var on = state[cur.q.id] === opt.value || flash === opt.value;
      html +=
        '<button type="button" class="sc-choice' +
        (on ? " on" : "") +
        '" data-val="' +
        esc(opt.value) +
        '" aria-pressed="' +
        (on ? "true" : "false") +
        '">' +
        esc(opt.label) +
        "</button>";
    });
    html += "</div>";

    if (cur.q.id === "patioElectrical" && state.patioElectrical === "one_or_more_missing") {
      html += '<p class="sc-hint" style="margin-top:18px">Which item is missing? Optional.</p>';
      html += '<div class="sc-checks">';
      ELECTRICAL_ITEMS.forEach(function (it) {
        var ck = (state.optionalElectricalMissing || []).indexOf(it.id) >= 0;
        html +=
          '<label class="sc-check"><input type="checkbox" data-elec="' +
          it.id +
          '"' +
          (ck ? " checked" : "") +
          "> " +
          esc(it.label) +
          "</label>";
      });
      html += "</div>";
      html += '<button type="button" class="btn-primary sc-continue" id="scContinue">Continue</button>';
    }

    app.innerHTML = html;
    bindQuiz(cur);
  }

  function bindQuiz(cur) {
    var back = document.getElementById("scBack");
    if (back) {
      back.onclick = function () {
        goBack();
      };
    }
    app.querySelectorAll(".sc-choice").forEach(function (btn) {
      btn.onclick = function () {
        pick(cur.q.id, btn.getAttribute("data-val"));
      };
    });
    app.querySelectorAll("[data-elec]").forEach(function (box) {
      box.onchange = function () {
        var id = box.getAttribute("data-elec");
        var list = (state.optionalElectricalMissing || []).slice();
        var i = list.indexOf(id);
        if (box.checked && i < 0) list.push(id);
        if (!box.checked && i >= 0) list.splice(i, 1);
        state.optionalElectricalMissing = list;
        save();
      };
    });
    var cont = document.getElementById("scContinue");
    if (cont) {
      cont.onclick = function () {
        flash = null;
        render();
      };
    }
  }

  function pick(id, value) {
    state[id] = value;
    if (id === "patioElectrical" && value !== "one_or_more_missing") {
      state.optionalElectricalMissing = [];
    }
    if (id === "propertyType" && value !== "condo") state.moreThanThreeStories = null;
    if (id === "projectScope" && value === "windows_doors") {
      state.patioHasGlass = null;
      state.patioPreviouslyPermitted = null;
      state.patioPhotosTaken = null;
      state.patioElectrical = null;
      state.bedroomPatioAccess = null;
      state.optionalElectricalMissing = [];
    }
    save();
    flash = value;
    holdId = id;
    render();
    if (id === "patioElectrical" && value === "one_or_more_missing") {
      holdId = null;
      return;
    }
    setTimeout(function () {
      flash = null;
      holdId = null;
      var nxt = currentQuestion(state);
      if (!nxt.q) {
        state.screen = "result";
        state.completedAt = new Date().toISOString();
        save();
      }
      render();
    }, 160);
  }

  function goBack() {
    var list = visibleQuestions(state);
    var last = -1;
    for (var i = 0; i < list.length; i++) {
      if (state[list[i].id] != null) last = i;
    }
    if (last < 0) return;
    state[list[last].id] = null;
    if (list[last].id === "patioElectrical") state.optionalElectricalMissing = [];
    state.screen = "quiz";
    save();
    render();
  }

  function startOver() {
    state = initialState();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    render();
  }

  function row(k, v) {
    return (
      '<div class="sc-row"><dt>' +
      esc(k) +
      '</dt><dd data-v="' +
      esc(v) +
      '">' +
      esc(v) +
      "</dd></div>"
    );
  }

  function renderResult() {
    var r = buildChecklistResult(state);
    var tone = toneClass(r.overallStatus);
    var html = "";
    html += '<div class="sc-result-live" aria-live="polite">';
    html += '<div class="sc-status ' + tone + '">';
    html += '<div class="sc-status-kicker">60-Second Site Check Complete</div>';
    html +=
      '<div class="sc-status-label"><span class="sc-ico" aria-hidden="true">' +
      toneIcon(r.overallStatus) +
      "</span> " +
      esc(r.statusLabel) +
      "</div>";
    html +=
      '<p class="sc-status-meta">' +
      esc(scopeLabel(state.projectScope)) +
      " · " +
      esc(propertyLabel(state.propertyType)) +
      (state.siteVisitComplete === "no" ? " · Site visit not complete" : "") +
      "</p>";
    html += "</div>";

    html += '<div class="sc-card"><h2>Field capture</h2><dl>';
    html += row("Measurements", r.rows.measurements);
    html += row("Room locations", r.rows.rooms);
    html += row("General photos", r.rows.photos);
    html += row("Patio photos", r.rows.patioPhotos);
    html += "</dl></div>";

    html += '<div class="sc-card"><h2>Documents and HOA</h2><dl>';
    html += row("Permit application", r.rows.permit);
    html += row("HOA / association", r.rows.hoa);
    html += "</dl></div>";

    html += '<div class="sc-card"><h2>Professional review flags</h2><dl>';
    html += row("Engineering", r.rows.engineering);
    if (isPatio(state)) {
      html += row("Existing patio permit", r.rows.patioPermit);
      html += row("Electrical", r.rows.electrical);
      html += row("Egress", r.rows.egress);
    }
    if (state.propertyType === "condo" && state.moreThanThreeStories === "no") {
      html += '<p class="sc-hint">This check does not determine all engineering requirements.</p>';
    }
    html += "</dl></div>";

    html += '<div class="sc-card"><h2>Next actions</h2>';
    if (!r.nextActions.length) {
      html += "<p>No blockers flagged. Move to product and permit-prep review.</p>";
    } else {
      html += "<ol class=\"sc-actions\">";
      r.nextActions.forEach(function (a) {
        html += "<li>" + esc(a) + "</li>";
      });
      html += "</ol>";
    }
    html += "</div>";

    if (r.related.length) {
      html += '<div class="sc-card"><h2>Related tools</h2><p class="sc-hint">Optional — not a required task or code determination.</p><div class="sc-links">';
      r.related.forEach(function (l) {
        html += '<a href="' + esc(l.href) + '">' + esc(l.label) + " →</a>";
      });
      html += "</div></div>";
    }

    html += '<div class="sc-card"><label for="scNote">Optional site note</label>';
    html +=
      '<textarea id="scNote" maxlength="160" rows="2" placeholder="Job nickname, unit count, anything useful…">' +
      esc(state.optionalNote || "") +
      "</textarea>";
    html += '<div class="sc-hint"><span id="scNoteCount">0</span>/160</div></div>';

    html += '<div class="sc-actions-bar">';
    html += '<button type="button" class="btn-primary" id="scPdf">Save as PDF</button>';
    html += '<button type="button" class="btn-secondary" id="scPrintBtn">Print / Save PDF</button>';
    html += '<button type="button" class="btn-secondary" id="scReset">Start Over</button>';
    html += "</div>";

    html += '<div class="sc-cta">';
    html += "<h2>You found what could delay the job. Now keep it moving.</h2>";
    html +=
      "<p>PermitAIO turns this one-time site check into a live production workflow with assigned owners, product approvals, schedules, files, permit requirements, and next-stage readiness.</p>";
    html +=
      '<p class="sc-hint">Permit Toolkit helps contractors check the job. PermitAIO helps the team move the job.</p>';
    html +=
      '<a class="btn-primary" href="' +
      AIO +
      '" target="_blank" rel="noopener">Start My 30-Day Trial</a>';
    html += "</div>";

    html += '<div class="sc-card sc-email">';
    html += "<h2>Email yourself this site-check summary</h2>";
    html +=
      "<p>Get your result by email and receive PermitAIO’s practical South Florida window-and-door field updates.</p>";
    html +=
      '<form id="scEmailForm" class="sc-email-form" novalidate><input type="email" name="email" placeholder="you@company.com" autocomplete="email" required /><button type="submit">Send</button></form>';
    html += '<div class="ok" id="scEmailOk" hidden>✓ Thanks — you\'re on the list.</div>';
    html += "</div>";
    html += "</div>";

    app.innerHTML = html;
    buildPrint(r);
    bindResult(r);
  }

  function bindResult(r) {
    var note = document.getElementById("scNote");
    var count = document.getElementById("scNoteCount");
    function syncNote() {
      state.optionalNote = (note.value || "").slice(0, 160);
      if (count) count.textContent = String(state.optionalNote.length);
      save();
      buildPrint(r);
    }
    if (note) {
      note.oninput = syncNote;
      syncNote();
    }
    document.getElementById("scPdf").onclick = function () {
      buildPrint(buildChecklistResult(state));
      window.print();
    };
    document.getElementById("scPrintBtn").onclick = function () {
      buildPrint(buildChecklistResult(state));
      window.print();
    };
    document.getElementById("scReset").onclick = startOver;
    var form = document.getElementById("scEmailForm");
    if (form) {
      form.onsubmit = function (e) {
        e.preventDefault();
        var email = (form.querySelector('input[type="email"]').value || "").trim();
        if (!email || email.indexOf("@") === -1) return;
        var payload = {
          email: email,
          source: "60_second_site_check",
          first_tool: "60-second-site-check",
          user_agent: (navigator.userAgent || "").slice(0, 200),
          referrer: (document.referrer || "").slice(0, 200),
        };
        if (typeof root.PTCaptureLead === "function") {
          root.PTCaptureLead(payload).catch(function () {});
        }
        document.getElementById("scEmailOk").hidden = false;
        form.querySelector("input").value = "";
      };
    }
  }

  function buildPrint(r) {
    var el = document.getElementById("scPrint");
    if (!el) return;
    var when = state.completedAt ? new Date(state.completedAt) : new Date();
    var whenStr = when.toLocaleString();
    var missingElec = (state.optionalElectricalMissing || [])
      .map(function (id) {
        var f = ELECTRICAL_ITEMS.filter(function (x) { return x.id === id; })[0];
        return f ? f.label : id;
      })
      .join(", ");
    var html = "";
    html += "<h1>PermitAIO 60-Second Site Check</h1>";
    html += "<h2>Window, Door & Patio Pre-Production Summary</h2>";
    html += '<p class="meta">' + esc(whenStr) + "</p>";
    html += "<table>";
    html += "<tr><th>Project scope</th><td>" + esc(scopeLabel(state.projectScope)) + "</td></tr>";
    html += "<tr><th>Property type</th><td>" + esc(propertyLabel(state.propertyType)) + "</td></tr>";
    html +=
      "<tr><th>Site visit</th><td>" +
      (state.siteVisitComplete === "yes" ? "Complete" : "Not complete") +
      "</td></tr>";
    html += "<tr><th>Status</th><td><strong>" + esc(r.statusLabel) + "</strong></td></tr>";
    html += "</table>";
    html += "<h3>Field capture</h3><table>";
    html += "<tr><th>Measurements</th><td>" + esc(r.rows.measurements) + "</td></tr>";
    html += "<tr><th>Room locations</th><td>" + esc(r.rows.rooms) + "</td></tr>";
    html += "<tr><th>General photos</th><td>" + esc(r.rows.photos) + "</td></tr>";
    html += "<tr><th>Patio photos</th><td>" + esc(r.rows.patioPhotos) + "</td></tr>";
    html += "</table>";
    html += "<h3>Documents and HOA</h3><table>";
    html += "<tr><th>Permit application</th><td>" + esc(r.rows.permit) + "</td></tr>";
    html += "<tr><th>HOA / association</th><td>" + esc(r.rows.hoa) + "</td></tr>";
    html += "</table>";
    html += "<h3>Review flags</h3><table>";
    html += "<tr><th>Engineering</th><td>" + esc(r.rows.engineering) + "</td></tr>";
    if (isPatio(state)) {
      html += "<tr><th>Existing patio permit</th><td>" + esc(r.rows.patioPermit) + "</td></tr>";
      html +=
        "<tr><th>Electrical</th><td>" +
        esc(r.rows.electrical) +
        (missingElec ? " (" + esc(missingElec) + ")" : "") +
        "</td></tr>";
      html += "<tr><th>Egress</th><td>" + esc(r.rows.egress) + "</td></tr>";
    }
    html += "</table>";
    html += "<h3>Next actions</h3>";
    if (!r.nextActions.length) html += "<p>No blockers flagged.</p>";
    else {
      html += "<ol>";
      r.nextActions.forEach(function (a) {
        html += "<li>" + esc(a) + "</li>";
      });
      html += "</ol>";
    }
    if (state.optionalNote) {
      html += "<h3>Site note</h3><p>" + esc(state.optionalNote) + "</p>";
    }
    html +=
      "<p class=\"cta\"><strong>You found what could delay the job. Now keep it moving.</strong><br>PermitAIO turns this one-time site check into a live production workflow. " +
      AIO +
      "</p>";
    html += "<p class=\"disc\">" + esc(DISCLAIMER) + "</p>";
    el.innerHTML = html;
  }

  render();
})(typeof window !== "undefined" ? window : globalThis);
