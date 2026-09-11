/* Permit Toolkit — Window Wall Designer
   Opening stays fixed. Units + bucks + mullions reflow. Planning aid only. */
(function () {
  "use strict";

  var MIN_UNIT = 4;
  var SNAP = 1;
  var STOCKS = [
    { id: "1x4", nominal: "1x4", tIn: 0.75 },
    { id: "2x4", nominal: "2x4", tIn: 1.5 },
    { id: "3x4", nominal: "3x4", tIn: 2.5 },
  ];
  var LABELS = [
    { id: "fixed", name: "Fixed", short: "FX" },
    { id: "SH", name: "Single Hung", short: "SH" },
    { id: "roller", name: "Horizontal Roller", short: "HR" },
    { id: "casement", name: "Casement", short: "CM" },
    { id: "swing", name: "Swing Door", short: "SW" },
    { id: "sgd", name: "Sliding Glass Door", short: "SGD" },
  ];

  function stockById(id) {
    for (var i = 0; i < STOCKS.length; i++) if (STOCKS[i].id === id) return STOCKS[i];
    return STOCKS[1];
  }
  function labelName(id) {
    for (var i = 0; i < LABELS.length; i++) if (LABELS[i].id === id) return LABELS[i].name;
    return id;
  }
  function labelShort(id) {
    for (var i = 0; i < LABELS.length; i++) if (LABELS[i].id === id) return LABELS[i].short;
    return id;
  }
  function uid(p) {
    return p + "_" + Math.random().toString(36).slice(2, 9);
  }
  function samePath(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      var t = b;
      b = a % b;
      a = t;
    }
    return a || 1;
  }
  function formatFtIn(inches) {
    if (!isFinite(inches)) return "—";
    var sign = inches < 0 ? "-" : "";
    var total16 = Math.round(Math.abs(inches) * 16);
    var wholeIn = Math.floor(total16 / 16);
    var frac16 = total16 % 16;
    var feet = Math.floor(wholeIn / 12);
    var inn = wholeIn % 12;
    if (frac16 === 0) return sign + feet + "'-" + inn + '"';
    var g = gcd(frac16, 16);
    return sign + feet + "'-" + inn + " " + frac16 / g + "/" + 16 / g + '"';
  }
  function formatIn(inches) {
    if (!isFinite(inches)) return "—";
    var sign = inches < 0 ? "-" : "";
    var total16 = Math.round(Math.abs(inches) * 16);
    var whole = Math.floor(total16 / 16);
    var frac16 = total16 % 16;
    if (frac16 === 0) return sign + whole + '"';
    var g = gcd(frac16, 16);
    var frac = frac16 / g + "/" + 16 / g;
    if (whole === 0) return sign + frac + '"';
    return sign + whole + " " + frac + '"';
  }
  function formatBoth(inches) {
    return formatIn(inches) + "  (" + formatFtIn(inches) + ")";
  }
  function formatPair(w, h) {
    return formatFtIn(w) + " x " + formatFtIn(h);
  }
  function formatDraw(inches) {
    return formatIn(inches);
  }
  function formatDim(inches) {
    return unitMode === "in" ? formatIn(inches) : formatFtIn(inches);
  }
  function parseOpening(raw) {
    var a = parseLength(raw, unitMode);
    if (a != null) return a;
    return parseLength(raw, unitMode === "in" ? "ft" : "in");
  }
  function formatPairDim(w, h) {
    return formatDim(w) + " x " + formatDim(h);
  }
  function parseLength(raw, mode) {
    var s = String(raw || "")
      .trim()
      .toLowerCase()
      .replace(/[–—]/g, "-");
    if (!s) return null;
    var feetInches = s.match(
      /^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*-?\s*(?:(\d+(?:\.\d+)?)(?:\s+(\d+)\s*\/\s*(\d+))?)?\s*(?:"|in|inches?)?\s*$/
    );
    if (feetInches) {
      var feet = Number(feetInches[1]);
      var inches = feetInches[2] ? Number(feetInches[2]) : 0;
      if (feetInches[3] && feetInches[4]) {
        var den = Number(feetInches[4]);
        if (den === 0) return null;
        inches += Number(feetInches[3]) / den;
      }
      if (!isFinite(feet) || !isFinite(inches)) return null;
      return feet * 12 + inches;
    }
    var dashed = s.match(/^(\d+)\s*-\s*(\d+(?:\.\d+)?)(?:\s+(\d+)\s*\/\s*(\d+))?\s*"?\s*$/);
    if (dashed) {
      var inches2 = Number(dashed[2]);
      if (dashed[3] && dashed[4]) {
        var den2 = Number(dashed[4]);
        if (den2 === 0) return null;
        inches2 += Number(dashed[3]) / den2;
      }
      return Number(dashed[1]) * 12 + inches2;
    }
    var justIn = s.match(/^(\d+(?:\.\d+)?)\s*(?:"|in|inches)\s*$/);
    if (justIn) return Number(justIn[1]);
    var mixed = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*"?\s*$/);
    if (mixed) {
      var den3 = Number(mixed[3]);
      if (den3 === 0) return null;
      return Number(mixed[1]) + Number(mixed[2]) / den3;
    }
    var frac = s.match(/^(\d+)\s*\/\s*(\d+)\s*"?\s*$/);
    if (frac) {
      var den4 = Number(frac[2]);
      if (den4 === 0) return null;
      return Number(frac[1]) / den4;
    }
    var num = s.match(/^(\d+(?:\.\d+)?)$/);
    if (num) {
      var n = Number(num[1]);
      if ((mode || unitMode) === "in") return n;
      return n * 12;
    }
    return null;
  }

  function pocketOf(state) {
    var t = state.buckStock.tIn;
    return { w: Math.max(0, state.opening.wIn - t * 2), h: Math.max(0, state.opening.hIn - t * 2) };
  }
  function getNode(tree, path) {
    var n = tree;
    for (var i = 0; i < path.length; i++) {
      if (n.kind !== "split") return null;
      n = path[i] === 0 ? n.a : n.b;
    }
    return n;
  }
  function setNode(tree, path, next) {
    if (path.length === 0) return next;
    if (tree.kind !== "split") return tree;
    var head = path[0];
    var rest = path.slice(1);
    if (head === 0) return Object.assign({}, tree, { a: setNode(tree.a, rest, next) });
    return Object.assign({}, tree, { b: setNode(tree.b, rest, next) });
  }
  function prune(node) {
    if (node.kind !== "split") return node;
    var a = prune(node.a);
    var b = prune(node.b);
    if (a.kind === "gap" && b.kind === "gap") return { kind: "gap" };
    return Object.assign({}, node, { a: a, b: b });
  }

  function flatten(state) {
    var pocket = pocketOf(state);
    var units = [];
    var mullions = [];
    var gaps = [];
    function walk(node, rect, path) {
      if (rect.w <= 0.001 || rect.h <= 0.001) return;
      if (node.kind === "unit") {
        units.push({
          type: "unit",
          id: node.id,
          path: path.slice(),
          label: node.label,
          index: 0,
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: rect.h,
        });
        return;
      }
      if (node.kind === "gap") {
        gaps.push({ type: "gap", path: path.slice(), x: rect.x, y: rect.y, w: rect.w, h: rect.h });
        return;
      }
      var t = node.stock.tIn;
      var span = node.axis === "v" ? rect.w : rect.h;
      var inner = Math.max(0, span - t);
      var tw = node.aWeight + node.bWeight;
      var aSize = tw <= 0 ? inner / 2 : inner * (node.aWeight / tw);
      var bSize = inner - aSize;
      if (node.axis === "v") {
        mullions.push({
          type: "mullion",
          id: node.id,
          path: path.slice(),
          stock: node.stock,
          axis: "v",
          parentRect: rect,
          x: rect.x + aSize,
          y: rect.y,
          w: t,
          h: rect.h,
        });
        walk(node.a, { x: rect.x, y: rect.y, w: aSize, h: rect.h }, path.concat([0]));
        walk(node.b, { x: rect.x + aSize + t, y: rect.y, w: bSize, h: rect.h }, path.concat([1]));
      } else {
        mullions.push({
          type: "mullion",
          id: node.id,
          path: path.slice(),
          stock: node.stock,
          axis: "h",
          parentRect: rect,
          x: rect.x,
          y: rect.y + aSize,
          w: rect.w,
          h: t,
        });
        walk(node.a, { x: rect.x, y: rect.y, w: rect.w, h: aSize }, path.concat([0]));
        walk(node.b, { x: rect.x, y: rect.y + aSize + t, w: rect.w, h: bSize }, path.concat([1]));
      }
    }
    walk(state.tree, { x: 0, y: 0, w: pocket.w, h: pocket.h }, []);
    units.sort(function (a, b) {
      return a.y - b.y || a.x - b.x;
    });
    units.forEach(function (u, i) {
      u.index = i + 1;
    });
    mullions.forEach(function (m, i) {
      m.index = i + 1;
    });
    return { pocket: pocket, units: units, mullions: mullions, gaps: gaps };
  }

  function canSplitUnit(unit, axis, stock) {
    var span = axis === "v" ? unit.w : unit.h;
    return span >= 2 * MIN_UNIT + stock.tIn;
  }
  function canSplitThirds(unit, axis, stock) {
    var span = axis === "v" ? unit.w : unit.h;
    return span >= 3 * MIN_UNIT + 2 * stock.tIn;
  }
  function thirdsNode(unit, axis, stock, span) {
    var t = stock.tIn;
    var piece = (span - 2 * t) / 3;
    var inner = span - t;
    var aSize = piece;
    var bSize = inner - aSize;
    return {
      kind: "split",
      id: uid("m"),
      axis: axis,
      stock: stock,
      aWeight: Math.max(0.01, aSize),
      bWeight: Math.max(0.01, bSize),
      a: { kind: "unit", id: unit.id, label: unit.label },
      b: {
        kind: "split",
        id: uid("m"),
        axis: axis,
        stock: stock,
        aWeight: 1,
        bWeight: 1,
        a: { kind: "unit", id: uid("u"), label: unit.label },
        b: { kind: "unit", id: uid("u"), label: unit.label },
      },
    };
  }
  function leftoverArea(flat) {
    return flat.gaps.reduce(function (s, g) {
      return s + g.w * g.h;
    }, 0);
  }
  function snapIn(v) {
    return Math.round(v / SNAP) * SNAP;
  }
  function snapEighth(v) {
    return Math.round(v * 8) / 8;
  }
  function clampSplitSizes(span, t, aSize) {
    var maxA = span - t - MIN_UNIT;
    var clamped = Math.min(Math.max(aSize, MIN_UNIT), Math.max(MIN_UNIT, maxA));
    return { aWeight: Math.max(0.01, clamped), bWeight: Math.max(0.01, span - t - clamped) };
  }
  function weightsForChildSizeExact(m, child, newSize) {
    var t = m.stock.tIn;
    var span = m.axis === "v" ? m.parentRect.w : m.parentRect.h;
    var aSize = child === 0 ? newSize : span - t - newSize;
    return clampSplitSizes(span, t, aSize);
  }
  function applyUnitSize(state, path, axis, size) {
    size = Math.max(MIN_UNIT, snapEighth(size));
    var flat = flatten(state);
    var unit = null;
    for (var i = 0; i < flat.units.length; i++) {
      if (samePath(flat.units[i].path, path)) unit = flat.units[i];
    }
    if (!unit) return state;
    var current = axis === "v" ? unit.w : unit.h;
    if (Math.abs(current - size) < 0.0005) return state;
    var anc = ancestorSplitOnAxis(state.tree, path, axis);
    if (!anc) {
      var delta0 = size - current;
      return Object.assign({}, state, {
        opening: {
          wIn: Math.max(12, state.opening.wIn + (axis === "v" ? delta0 : 0)),
          hIn: Math.max(12, state.opening.hIn + (axis === "h" ? delta0 : 0)),
        },
      });
    }
    var mull = null;
    for (var j = 0; j < flat.mullions.length; j++) {
      if (samePath(flat.mullions[j].path, anc.splitPath)) mull = flat.mullions[j];
    }
    if (!mull) return state;
    var t = mull.stock.tIn;
    var span = axis === "v" ? mull.parentRect.w : mull.parentRect.h;
    var next = state;
    if (size > span - t - MIN_UNIT + 0.001) {
      var grow = size - current;
      next = Object.assign({}, state, {
        opening: {
          wIn: Math.max(12, state.opening.wIn + (axis === "v" ? grow : 0)),
          hIn: Math.max(12, state.opening.hIn + (axis === "h" ? grow : 0)),
        },
      });
      flat = flatten(next);
      mull = null;
      for (var k = 0; k < flat.mullions.length; k++) {
        if (samePath(flat.mullions[k].path, anc.splitPath)) mull = flat.mullions[k];
      }
      if (!mull) return next;
    }
    var wts = weightsForChildSizeExact(mull, anc.child, size);
    var node = getNode(next.tree, anc.splitPath);
    if (!node || node.kind !== "split") return next;
    return Object.assign({}, next, {
      tree: setNode(
        next.tree,
        anc.splitPath,
        Object.assign({}, node, { aWeight: wts.aWeight, bWeight: wts.bWeight })
      ),
    });
  }
  function weightsFromMullionCenter(m, pointer) {
    var t = m.stock.tIn;
    var span = m.axis === "v" ? m.parentRect.w : m.parentRect.h;
    var start = m.axis === "v" ? m.parentRect.x : m.parentRect.y;
    var p = m.axis === "v" ? pointer.x : pointer.y;
    return clampSplitSizes(span, t, snapIn(p - start - t / 2));
  }
  function weightsFromPointer(m, pointer, edge) {
    var t = m.stock.tIn;
    var span = m.axis === "v" ? m.parentRect.w : m.parentRect.h;
    var start = m.axis === "v" ? m.parentRect.x : m.parentRect.y;
    var p = m.axis === "v" ? pointer.x : pointer.y;
    var aSize = edge === "e" || edge === "s" ? p - start : p - start - t;
    return clampSplitSizes(span, t, snapIn(aSize));
  }
  function movableEdges(tree, unitPath) {
    var edges = [];
    for (var i = unitPath.length; i > 0; i--) {
      var splitPath = unitPath.slice(0, i - 1);
      var child = unitPath[i - 1];
      var parent = getNode(tree, splitPath);
      if (!parent || parent.kind !== "split") continue;
      if (parent.axis === "v") edges.push({ edge: child === 0 ? "e" : "w", splitPath: splitPath });
      else edges.push({ edge: child === 0 ? "s" : "n", splitPath: splitPath });
    }
    return edges;
  }
  function ancestorSplitOnAxis(tree, unitPath, axis) {
    for (var i = unitPath.length; i > 0; i--) {
      var splitPath = unitPath.slice(0, i - 1);
      var child = unitPath[i - 1];
      var parent = getNode(tree, splitPath);
      if (parent && parent.kind === "split" && parent.axis === axis)
        return { splitPath: splitPath, child: child === 0 ? 0 : 1 };
    }
    return null;
  }
  function weightsForChildSize(m, child, newSize) {
    var t = m.stock.tIn;
    var span = m.axis === "v" ? m.parentRect.w : m.parentRect.h;
    var aSize = child === 0 ? newSize : span - t - newSize;
    return clampSplitSizes(span, t, snapIn(aSize));
  }

  function initialState() {
    return {
      opening: { wIn: 120, hIn: 120 },
      buckStock: stockById("2x4"),
      mullionStock: stockById("2x4"),
      tree: { kind: "gap" },
    };
  }

  function reduce(state, action) {
    switch (action.type) {
      case "setOpening":
        return Object.assign({}, state, {
          opening: { wIn: Math.max(12, action.wIn), hIn: Math.max(12, action.hIn) },
        });
      case "setBuckStock":
        return Object.assign({}, state, { buckStock: action.stock });
      case "setMullionStock":
        return Object.assign({}, state, { mullionStock: action.stock });
      case "placeUnit": {
        var n = getNode(state.tree, action.path);
        if (!n || n.kind !== "gap") return state;
        return Object.assign({}, state, {
          tree: setNode(state.tree, action.path, { kind: "unit", id: uid("u"), label: action.label || "fixed" }),
        });
      }
      case "split": {
        var u = getNode(state.tree, action.path);
        if (!u || u.kind !== "unit") return state;
        var next = {
          kind: "split",
          id: uid("m"),
          axis: action.axis,
          stock: state.mullionStock,
          aWeight: 1,
          bWeight: 1,
          a: u,
          b: { kind: "unit", id: uid("u"), label: u.label },
        };
        return Object.assign({}, state, { tree: setNode(state.tree, action.path, next) });
      }
      case "splitThirds": {
        var u3 = getNode(state.tree, action.path);
        if (!u3 || u3.kind !== "unit") return state;
        var flat3 = flatten(state);
        var unitRect = null;
        for (var i3 = 0; i3 < flat3.units.length; i3++) {
          if (samePath(flat3.units[i3].path, action.path)) unitRect = flat3.units[i3];
        }
        if (!unitRect) return state;
        if (!canSplitThirds(unitRect, action.axis, state.mullionStock)) return state;
        var span3 = action.axis === "v" ? unitRect.w : unitRect.h;
        return Object.assign({}, state, {
          tree: setNode(state.tree, action.path, thirdsNode(u3, action.axis, state.mullionStock, span3)),
        });
      }
      case "setLabel": {
        var un = getNode(state.tree, action.path);
        if (!un || un.kind !== "unit") return state;
        return Object.assign({}, state, {
          tree: setNode(state.tree, action.path, Object.assign({}, un, { label: action.label })),
        });
      }
      case "setSplitStock": {
        var sn = getNode(state.tree, action.path);
        if (!sn || sn.kind !== "split") return state;
        return Object.assign({}, state, {
          tree: setNode(state.tree, action.path, Object.assign({}, sn, { stock: action.stock })),
        });
      }
      case "moveSplit": {
        var mn = getNode(state.tree, action.path);
        if (!mn || mn.kind !== "split") return state;
        return Object.assign({}, state, {
          tree: setNode(
            state.tree,
            action.path,
            Object.assign({}, mn, {
              aWeight: Math.max(0.01, action.aWeight),
              bWeight: Math.max(0.01, action.bWeight),
            })
          ),
        });
      }
      case "deleteUnit": {
        var du = getNode(state.tree, action.path);
        if (!du || du.kind !== "unit") return state;
        return Object.assign({}, state, {
          tree: prune(setNode(state.tree, action.path, { kind: "gap" })),
        });
      }
      case "deleteMullion": {
        var dm = getNode(state.tree, action.path);
        if (!dm || dm.kind !== "split") return state;
        if (dm.a.kind === "split" || dm.b.kind === "split") return state;
        var merged;
        if (dm.a.kind === "unit" && dm.b.kind === "unit")
          merged = { kind: "unit", id: dm.a.id, label: dm.a.label };
        else if (dm.a.kind === "unit") merged = dm.a;
        else if (dm.b.kind === "unit") merged = dm.b;
        else merged = { kind: "gap" };
        return Object.assign({}, state, { tree: prune(setNode(state.tree, action.path, merged)) });
      }
      case "setUnitSize":
        return applyUnitSize(state, action.path, action.axis, action.size);
      case "reset":
        return initialState();
      default:
        return state;
    }
  }

  /* ---------- UI ---------- */
  var state = initialState();
  var selection = null;
  var drag = null;
  var pdfUrl = null;
  var unitMode = "in";
  var past = [];
  var MAX_UNDO = 60;
  try {
    var saved = localStorage.getItem("pt_ww_unit_mode_v2");
    if (saved === "in" || saved === "ft") unitMode = saved;
  } catch (e) {}

  var $ = function (id) {
    return document.getElementById(id);
  };

  function cloneSnap() {
    return {
      state: JSON.parse(JSON.stringify(state)),
      selection: selection
        ? { kind: selection.kind, path: selection.path.slice() }
        : null,
    };
  }
  function pushHistory() {
    past.push(cloneSnap());
    if (past.length > MAX_UNDO) past.shift();
  }
  function undo() {
    if (!past.length) return;
    var snap = past.pop();
    state = snap.state;
    selection = snap.selection;
    render();
  }

  function dispatch(action) {
    var next = reduce(state, action);
    if (next === state) return;
    pushHistory();
    state = next;
    render();
  }

  function selectedUnit(flat) {
    if (!selection || selection.kind !== "unit") return null;
    for (var i = 0; i < flat.units.length; i++)
      if (samePath(flat.units[i].path, selection.path)) return flat.units[i];
    return null;
  }
  function selectedMullion(flat) {
    if (!selection || selection.kind !== "mullion") return null;
    for (var i = 0; i < flat.mullions.length; i++)
      if (samePath(flat.mullions[i].path, selection.path)) return flat.mullions[i];
    return null;
  }

  function toolBtn(label, id, disabled, extra) {
    return (
      '<button type="button" class="ww-btn ' +
      (extra || "") +
      '" data-act="' +
      id +
      '"' +
      (disabled ? " disabled" : "") +
      ">" +
      label +
      "</button>"
    );
  }
  function stockPicker(title, valueId, prefix) {
    var html = '<div class="ww-stock"><div class="l">' + title + "</div>";
    STOCKS.forEach(function (s) {
      html +=
        '<button type="button" class="' +
        (s.id === valueId ? "on" : "") +
        '" data-stock="' +
        prefix +
        s.id +
        '"><span>' +
        s.nominal +
        "</span><span>" +
        formatIn(s.tIn) +
        "</span></button>";
    });
    html += "</div>";
    return html;
  }
  var lastLabel = "fixed";

  function typePickerBar(current) {
    var html = "";
    LABELS.forEach(function (l) {
      html +=
        '<button type="button" class="' +
        (l.id === current ? "on" : "") +
        '" data-label="' +
        l.id +
        '" title="' +
        l.name +
        '">' +
        l.name +
        "</button>";
    });
    return html;
  }

  function renderChrome(flat) {
    var su = selectedUnit(flat);
    var sm = selectedMullion(flat);
    var target = su || (flat.units.length === 1 ? flat.units[0] : null);
    var canAdd = flat.gaps.length > 0;
    var canV = target ? canSplitUnit(target, "v", state.mullionStock) : false;
    var canH = target ? canSplitUnit(target, "h", state.mullionStock) : false;
    var can3V = target ? canSplitThirds(target, "v", state.mullionStock) : false;
    var can3H = target ? canSplitThirds(target, "h", state.mullionStock) : false;
    var leftover = leftoverArea(flat);
    var pocket = flat.pocket;

    $("wwTools").innerHTML =
      toolBtn("Add unit", "add", !canAdd) +
      toolBtn("Split vertical", "splitV", !canV) +
      toolBtn("Split horizontal", "splitH", !canH) +
      toolBtn("Split into 3 across", "split3V", !can3V) +
      toolBtn("Split into 3 stacked", "split3H", !can3H) +
      '<p class="ww-hint">Split into 3 makes two mullions and three equal units. Click a mullion to set 1x4 / 2x4 on that bar only. Drag to size.</p>' +
      stockPicker(sm ? "This mullion only" : "Next mullion stock", (sm ? sm.stock : state.mullionStock).id, "m:") +
      stockPicker("Buck stock", state.buckStock.id, "b:") +
      toolBtn("Delete", "delete", !selection, "danger") +
      toolBtn("Undo", "undo", past.length === 0) +
      toolBtn("Reset layout", "reset") +
      toolBtn("Print / save PDF", "pdf");

    var side =
      '<div class="ww-sec">Live sizes</div>' +
      "<dl>" +
      row("Opening", formatPairDim(state.opening.wIn, state.opening.hIn)) +
      row("Bucks", state.buckStock.nominal + " " + formatIn(state.buckStock.tIn) + " x4") +
      row("Pocket", formatPairDim(pocket.w, pocket.h)) +
      row(
        "Leftover",
        leftover > 0.05 && flat.gaps[0]
          ? formatPairDim(flat.gaps[0].w, flat.gaps[0].h) + " unassigned"
          : "Filled"
      ) +
      "</dl>" +
      '<p class="ww-hint">Unit sizes = opening − bucks − mullions. Type exact W and H on a unit to keep this layout.</p>' +
      '<div class="ww-sec">Selected</div>';

    if (su) {
      side +=
        '<div style="font-family:General Sans,sans-serif;font-size:18px;font-weight:600;margin-bottom:4px;">U' +
        su.index +
        " · " +
        labelName(su.label) +
        "</div>" +
        '<div class="inputs-grid-2">' +
        '<div class="field"><label>W</label><input id="unitW" type="text" inputmode="decimal" value="' +
        esc(formatDim(su.w)) +
        '"></div>' +
        '<div class="field"><label>H</label><input id="unitH" type="text" inputmode="decimal" value="' +
        esc(formatDim(su.h)) +
        '"></div></div>' +
        '<p class="ww-hint">Type exact size (48, 48", or 4\'-0"). Layout stays. The other unit on that split takes leftover. Opening grows only if needed.</p>';
    } else if (sm) {
      side +=
        "<div style=\"font-family:General Sans,sans-serif;font-size:18px;font-weight:600;\">M" +
        sm.index +
        " · " +
        sm.stock.nominal +
        "</div>" +
        "<dl>" +
        row("Axis", sm.axis === "v" ? "Vertical" : "Horizontal") +
        row("Thickness", formatIn(sm.stock.tIn)) +
        row("Length", formatDim(sm.axis === "v" ? sm.h : sm.w)) +
        "</dl>" +
        '<p class="ww-hint">Stock on this bar only. Other mullions stay as they are. Drag the bar to resize the units.</p>';
    } else {
      side += '<p class="ww-hint">Click a unit or a mullion. Each mullion can be 1x4 or 2x4 on its own.</p>';
    }

    side += '<div class="ww-sec">Units</div>';
    if (flat.units.length === 0) side += '<p class="ww-hint">None yet — click the opening.</p>';
    else {
      side += "<ul class='ww-unit-list'>";
      flat.units.forEach(function (u) {
        var p = esc(JSON.stringify(u.path));
        var on = su && samePath(su.path, u.path) ? " on" : "";
        side +=
          "<li class='ww-unit-row" +
          on +
          "' data-select-unit='" +
          p +
          "'>" +
          "<button type='button' class='ww-unit-id' data-select-unit='" +
          p +
          "'>U" +
          u.index +
          "</button>" +
          "<input data-unit-size='w' data-path='" +
          p +
          "' type='text' inputmode='decimal' value='" +
          esc(formatDim(u.w)) +
          "' aria-label='U" +
          u.index +
          " width'>" +
          "<span>×</span>" +
          "<input data-unit-size='h' data-path='" +
          p +
          "' type='text' inputmode='decimal' value='" +
          esc(formatDim(u.h)) +
          "' aria-label='U" +
          u.index +
          " height'>" +
          "</li>";
      });
      side += "</ul>";
    }
    side += '<div class="ww-sec">Mullions</div>';
    if (flat.mullions.length === 0) side += '<p class="ww-hint">None yet — split a unit.</p>';
    else {
      side += "<ul style='list-style:none;font-size:13px;'>";
      flat.mullions.forEach(function (m) {
        side +=
          "<li style='display:flex;justify-content:space-between;padding:3px 0;'><span>M" +
          m.index +
          " " +
          m.stock.nominal +
          " " +
          (m.axis === "v" ? "vert" : "horiz") +
          "</span><span style='color:var(--muted)'>" +
          formatIn(m.stock.tIn) +
          " × " +
          formatDim(m.axis === "v" ? m.h : m.w) +
          "</span></li>";
      });
      side += "</ul>";
    }
    $("wwSide").innerHTML = side;

    var typesEl = $("wwTypes");
    if (typesEl) {
      var typeCurrent = su ? su.label : lastLabel;
      typesEl.innerHTML = typePickerBar(typeCurrent);
    }

    $("wwDock").innerHTML =
      '<button type="button" data-act="add"' +
      (canAdd ? "" : " disabled") +
      ">＋<span>Add</span></button>" +
      '<button type="button" data-act="splitV"' +
      (canV ? "" : " disabled") +
      ">⊞<span>Split |</span></button>" +
      '<button type="button" data-act="splitH"' +
      (canH ? "" : " disabled") +
      ">⊟<span>Split —</span></button>" +
      '<button type="button" data-act="split3V"' +
      (can3V ? "" : " disabled") +
      ">|||<span>3 across</span></button>" +
      '<button type="button" data-act="split3H"' +
      (can3H ? "" : " disabled") +
      ">≡<span>3 stacked</span></button>" +
      '<button type="button" data-act="delete"' +
      (selection ? "" : " disabled") +
      ">✕<span>Delete</span></button>" +
      '<button type="button" data-act="undo"' +
      (past.length ? "" : " disabled") +
      ">↩<span>Undo</span></button>" +
      '<button type="button" data-act="reset">↺<span>Reset</span></button>' +
      '<button type="button" data-act="pdf">⇩<span>PDF</span></button>';

    var sel = $("wwSel");
    if (su) {
      sel.className = "ww-sel";
      sel.innerHTML =
        "<div class='ww-sel-head'><strong>U" +
        su.index +
        " · " +
        labelName(su.label) +
        "</strong></div>" +
        "<div class='ww-sel-sizes'>" +
        "<label>W <input data-unit-size='w' data-path='" +
        esc(JSON.stringify(su.path)) +
        "' type='text' inputmode='decimal' value='" +
        esc(formatDim(su.w)) +
        "'></label>" +
        "<label>H <input data-unit-size='h' data-path='" +
        esc(JSON.stringify(su.path)) +
        "' type='text' inputmode='decimal' value='" +
        esc(formatDim(su.h)) +
        "'></label>" +
        "</div>";
    } else if (sm) {
      sel.className = "ww-sel";
      sel.innerHTML =
        "<strong>" + sm.stock.nominal + " mullion</strong> · drag the bar to size the two units";
    } else {
      sel.className = "ww-sel empty";
      sel.innerHTML = "";
    }

    bindChrome(flat);
  }

  function row(k, v) {
    return '<div class="ww-row"><dt>' + k + "</dt><dd>" + v + "</dd></div>";
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "\u0026amp;")
      .replace(/"/g, "\u0026quot;")
      .replace(/</g, "\u0026lt;");
  }

  function bindChrome(flat) {
    function onAct(act) {
      if (act === "add") {
        if (flat.gaps[0]) {
          dispatch({ type: "placeUnit", path: flat.gaps[0].path, label: lastLabel });
          selection = { kind: "unit", path: flat.gaps[0].path };
          render();
        }
      } else if (act === "splitV" || act === "splitH" || act === "split3V" || act === "split3H") {
        var unitPath = null;
        if (selection && selection.kind === "unit") unitPath = selection.path.slice();
        else if (flat.units.length === 1) unitPath = flat.units[0].path.slice();
        if (!unitPath) return;
        var axis = act === "splitH" || act === "split3H" ? "h" : "v";
        if (act === "split3V" || act === "split3H") {
          selection = { kind: "unit", path: unitPath.concat([0]) };
          dispatch({ type: "splitThirds", path: unitPath, axis: axis });
        } else {
          selection = { kind: "mullion", path: unitPath };
          dispatch({ type: "split", path: unitPath, axis: axis });
        }
      } else if (act === "delete") {
        if (!selection) return;
        if (selection.kind === "unit") dispatch({ type: "deleteUnit", path: selection.path });
        else dispatch({ type: "deleteMullion", path: selection.path });
        selection = null;
        render();
      } else if (act === "undo") {
        undo();
      } else if (act === "reset") {
        dispatch({ type: "reset" });
        selection = null;
        $("openW").value = formatDim(120);
        $("openH").value = formatDim(120);
        render();
      } else if (act === "pdf") {
        makePdf();
      }
    }
    document.querySelectorAll("[data-act]").forEach(function (btn) {
      btn.onclick = function () {
        onAct(btn.getAttribute("data-act"));
      };
    });
    document.querySelectorAll("[data-stock]").forEach(function (btn) {
      btn.onclick = function () {
        var raw = btn.getAttribute("data-stock");
        var which = raw.slice(0, 1);
        var id = raw.slice(2);
        var stock = stockById(id);
        if (which === "b") dispatch({ type: "setBuckStock", stock: stock });
        else if (selection && selection.kind === "mullion")
          dispatch({ type: "setSplitStock", path: selection.path, stock: stock });
        else dispatch({ type: "setMullionStock", stock: stock });
      };
    });
    document.querySelectorAll("[data-label]").forEach(function (btn) {
      btn.onclick = function () {
        lastLabel = btn.getAttribute("data-label");
        if (selection && selection.kind === "unit")
          dispatch({ type: "setLabel", path: selection.path, label: lastLabel });
        else render();
      };
    });
    var uw = $("unitW");
    var uh = $("unitH");
    function commitTypedSize(path, axis, raw) {
      var n = parseOpening(raw);
      if (n == null) {
        render();
        return;
      }
      dispatch({ type: "setUnitSize", path: path, axis: axis, size: n });
    }
    function commitSize(axis, input) {
      var su = selectedUnit(flatten(state));
      if (!su) return;
      commitTypedSize(su.path, axis, input.value);
    }
    if (uw)
      uw.onblur = function () {
        commitSize("v", uw);
      };
    if (uh)
      uh.onblur = function () {
        commitSize("h", uh);
      };
    [uw, uh].forEach(function (el) {
      if (!el) return;
      el.onkeydown = function (e) {
        if (e.key === "Enter") el.blur();
      };
    });
    document.querySelectorAll("[data-unit-size]").forEach(function (el) {
      if (el.id === "unitW" || el.id === "unitH") return;
      el.onblur = function () {
        var path;
        try {
          path = JSON.parse(el.getAttribute("data-path") || "[]");
        } catch (err) {
          return;
        }
        commitTypedSize(path, el.getAttribute("data-unit-size") === "h" ? "h" : "v", el.value);
      };
      el.onkeydown = function (e) {
        if (e.key === "Enter") el.blur();
      };
      el.onclick = function (e) {
        e.stopPropagation();
      };
    });
    document.querySelectorAll("[data-select-unit]").forEach(function (el) {
      el.onclick = function (e) {
        e.stopPropagation();
        try {
          selection = { kind: "unit", path: JSON.parse(el.getAttribute("data-select-unit") || "[]") };
        } catch (err) {
          return;
        }
        render();
      };
    });
  }

  function commitOpening() {
    var w = parseOpening($("openW").value);
    var h = parseOpening($("openH").value);
    if (w == null || h == null) {
      $("openW").value = formatDim(state.opening.wIn);
      $("openH").value = formatDim(state.opening.hIn);
      return;
    }
    dispatch({ type: "setOpening", wIn: w, hIn: h });
    $("openW").value = formatDim(w);
    $("openH").value = formatDim(h);
  }
  $("openW").addEventListener("blur", commitOpening);
  $("openH").addEventListener("blur", commitOpening);
  ["openW", "openH"].forEach(function (id) {
    $(id).addEventListener("keydown", function (e) {
      if (e.key === "Enter") e.target.blur();
    });
  });

  function setUnitMode(next) {
    unitMode = next === "in" ? "in" : "ft";
    try {
      localStorage.setItem("pt_ww_unit_mode_v2", unitMode);
    } catch (e) {}
    var ft = $("modeFt");
    var inn = $("modeIn");
    if (ft) ft.className = unitMode === "ft" ? "on" : "";
    if (inn) inn.className = unitMode === "in" ? "on" : "";
    render();
  }
  $("modeFt").onclick = function () {
    setUnitMode("ft");
  };
  $("modeIn").onclick = function () {
    setUnitMode("in");
  };
  if (unitMode === "in") {
    $("modeFt").className = "";
    $("modeIn").className = "on";
  }

  /* ---------- SVG canvas ---------- */
  function draw() {
    var wrap = $("wwCanvasWrap");
    var svg = $("wwSvg");
    var size = { w: wrap.clientWidth || 640, h: wrap.clientHeight || 420 };
    svg.setAttribute("viewBox", "0 0 " + size.w + " " + size.h);
    svg.setAttribute("width", size.w);
    svg.setAttribute("height", size.h);

    var flat = flatten(state);
    var pad = size.w < 520 ? 40 : 56;
    var ow = state.opening.wIn;
    var oh = state.opening.hIn;
    var scale = Math.min((size.w - pad * 2) / ow, (size.h - pad * 2) / oh);
    var drawW = ow * scale;
    var drawH = oh * scale;
    var ox = (size.w - drawW) / 2;
    var oy = (size.h - drawH) / 2;
    var t = state.buckStock.tIn;
    var pocketX = ox + t * scale;
    var pocketY = oy + t * scale;
    function px(n) {
      return n * scale;
    }

    var ns = "http://www.w3.org/2000/svg";
    function el(name, attrs, text) {
      var n = document.createElementNS(ns, name);
      Object.keys(attrs || {}).forEach(function (k) {
        n.setAttribute(k, attrs[k]);
      });
      if (text != null) n.textContent = text;
      return n;
    }
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var defs = el("defs");
    defs.innerHTML =
      '<pattern id="gap-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="8" stroke="#94a3b8" stroke-width="1.5"/></pattern>';
    svg.appendChild(defs);

    svg.appendChild(
      el("rect", {
        x: ox,
        y: oy,
        width: drawW,
        height: drawH,
        fill: "#cbd5e1",
        stroke: "#0b0b0c",
        "stroke-width": "1.5",
      })
    );

    flat.gaps.forEach(function (g) {
      var gEl = el("g", { "data-gap": g.path.join(".") });
      gEl.appendChild(
        el("rect", {
          x: pocketX + px(g.x),
          y: pocketY + px(g.y),
          width: px(g.w),
          height: px(g.h),
          fill: "url(#gap-hatch)",
        })
      );
      if (px(g.w) > 64 && px(g.h) > 36) {
        gEl.appendChild(
          el(
            "text",
            {
              x: pocketX + px(g.x) + px(g.w) / 2,
              y: pocketY + px(g.y) + px(g.h) / 2,
              "text-anchor": "middle",
              fill: "#2563eb",
              "font-size": "12",
              "font-family": "Satoshi, sans-serif",
            },
            "Unassigned " + formatPairDim(g.w, g.h)
          )
        );
      }
      gEl.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        dispatch({ type: "placeUnit", path: g.path, label: lastLabel });
        selection = { kind: "unit", path: g.path };
        render();
      });
      svg.appendChild(gEl);
    });

    flat.units.forEach(function (u) {
      var x = pocketX + px(u.x);
      var y = pocketY + px(u.y);
      var w = px(u.w);
      var h = px(u.h);
      var selected = selection && selection.kind === "unit" && samePath(selection.path, u.path);
      var inset = Math.min(10, w * 0.08, h * 0.08);
      var gEl = el("g", { style: "cursor:pointer" });
      gEl.appendChild(
        el("rect", {
          x: x,
          y: y,
          width: w,
          height: h,
          fill: "#fff",
          stroke: selected ? "#2563eb" : "#0b0b0c",
          "stroke-width": selected ? "2.5" : "1.5",
        })
      );
      gEl.appendChild(
        el("rect", {
          x: x + inset,
          y: y + inset,
          width: Math.max(0, w - inset * 2),
          height: Math.max(0, h - inset * 2),
          fill: "#eff6ff",
          stroke: "#cbd5e1",
          "stroke-width": "0.75",
        })
      );
      sash(gEl, u.label, x + inset, y + inset, Math.max(0, w - inset * 2), Math.max(0, h - inset * 2));
      var idLabel = "U" + u.index + "  " + (w > 90 ? labelName(u.label) : labelShort(u.label)).toUpperCase();
      if (w > 28 && h > 16) {
        gEl.appendChild(
          el(
            "text",
            {
              x: x + w / 2,
              y: y + h / 2 + (h < 44 ? 10 : 4),
              "text-anchor": "middle",
              fill: "#2563eb",
              "font-size": h > 64 ? "10" : "9",
              "font-weight": "600",
              "font-family": "General Sans, sans-serif",
              "letter-spacing": "0.8",
              style: "pointer-events:none",
            },
            idLabel
          )
        );
      }
      if (h >= 56 && w >= 48) {
        unitHDim(gEl, x, y + 12, w, formatDraw(u.w));
        unitVDim(gEl, x + 12, y, h, formatDraw(u.h));
      } else if (w > 36) {
        gEl.appendChild(
          el(
            "text",
            {
              x: x + w / 2,
              y: y + Math.min(14, h * 0.42),
              "text-anchor": "middle",
              fill: "#1d4ed8",
              "font-size": "11",
              "font-weight": "700",
              "font-family": "General Sans, sans-serif",
              style: "pointer-events:none",
            },
            formatDraw(u.w) + "  ×  " + formatDraw(u.h)
          )
        );
      }
      gEl.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        selection = { kind: "unit", path: u.path };
        render();
      });
      svg.appendChild(gEl);

      if (selected) {
        movableEdges(state.tree, u.path).forEach(function (me) {
          var hx = x,
            hy = y,
            hw = 10,
            hh = 10;
          if (me.edge === "e") {
            hx = x + w - 5;
            hy = y + h / 2 - 12;
            hw = 10;
            hh = 24;
          }
          if (me.edge === "w") {
            hx = x - 5;
            hy = y + h / 2 - 12;
            hw = 10;
            hh = 24;
          }
          if (me.edge === "s") {
            hx = x + w / 2 - 12;
            hy = y + h - 5;
            hw = 24;
            hh = 10;
          }
          if (me.edge === "n") {
            hx = x + w / 2 - 12;
            hy = y - 5;
            hw = 24;
            hh = 10;
          }
          var handle = el("rect", {
            x: hx,
            y: hy,
            width: hw,
            height: hh,
            rx: 2,
            fill: "#2563eb",
            stroke: "#fff",
            "stroke-width": "1",
            style: "cursor:" + (me.edge === "e" || me.edge === "w" ? "ew-resize" : "ns-resize"),
          });
          handle.addEventListener("pointerdown", function (e) {
            e.stopPropagation();
            e.preventDefault();
            startDrag(e, me.splitPath, me.edge, { ox: ox, oy: oy, scale: scale, t: t });
          });
          svg.appendChild(handle);
        });
      }
    });

    flat.mullions.forEach(function (m) {
      var x = pocketX + px(m.x);
      var y = pocketY + px(m.y);
      var w = Math.max(px(m.w), 3);
      var h = Math.max(px(m.h), 3);
      var selected = selection && selection.kind === "mullion" && samePath(selection.path, m.path);
      var gEl = el("g", {
        style: "cursor:" + (m.axis === "v" ? "ew-resize" : "ns-resize"),
      });
      var hitPad = 8;
      if (m.axis === "v") {
        gEl.appendChild(
          el("rect", {
            x: x - hitPad,
            y: y,
            width: w + hitPad * 2,
            height: h,
            fill: "transparent",
          })
        );
      } else {
        gEl.appendChild(
          el("rect", {
            x: x,
            y: y - hitPad,
            width: w,
            height: h + hitPad * 2,
            fill: "transparent",
          })
        );
      }
      gEl.appendChild(
        el("rect", {
          x: x,
          y: y,
          width: w,
          height: h,
          fill: selected ? "#1d4ed8" : "#1e293b",
          stroke: selected ? "#93c5fd" : "none",
          "stroke-width": selected ? "2" : "0",
        })
      );
      var mLabel = "M" + m.index + "  " + m.stock.nominal + "  " + formatIn(m.stock.tIn);
      var along = m.axis === "v" ? h : w;
      if (along > 36) {
        var txt;
        if (m.axis === "v") {
          var tx = x + w + 11;
          var ty = y + h / 2;
          txt = el(
            "text",
            {
              x: tx,
              y: ty,
              "text-anchor": "middle",
              fill: "#1d4ed8",
              "font-size": "10",
              "font-weight": "700",
              "font-family": "General Sans, sans-serif",
              stroke: "#fff",
              "stroke-width": "3",
              "paint-order": "stroke",
              style: "pointer-events:none",
              transform: "rotate(-90 " + tx + " " + ty + ")",
            },
            mLabel
          );
        } else {
          var tx2 = x + w / 2;
          var ty2 = y - 5;
          txt = el(
            "text",
            {
              x: tx2,
              y: ty2,
              "text-anchor": "middle",
              fill: "#1d4ed8",
              "font-size": "10",
              "font-weight": "700",
              "font-family": "General Sans, sans-serif",
              stroke: "#fff",
              "stroke-width": "3",
              "paint-order": "stroke",
              style: "pointer-events:none",
            },
            mLabel
          );
        }
        gEl.appendChild(txt);
      }
      gEl.addEventListener("pointerdown", function (e) {
        e.stopPropagation();
        e.preventDefault();
        selection = { kind: "mullion", path: m.path };
        var originX = e.clientX;
        var originY = e.clientY;
        var started = false;
        var geom = { ox: ox, oy: oy, scale: scale, t: t, pocketX: pocketX, pocketY: pocketY };
        function move(ev) {
          if (started) return;
          if (Math.hypot(ev.clientX - originX, ev.clientY - originY) < 6) return;
          started = true;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          startDrag(ev, m.path, "bar", geom);
        }
        function up() {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          if (!started) render();
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      });
      svg.appendChild(gEl);
    });

    dimLine(svg, ox, oy - 16, ox + drawW, oy - 16, "Opening " + formatDraw(ow));
    /* height label */
    svg.appendChild(
      el(
        "text",
        {
          x: ox - 10,
          y: oy + drawH / 2,
          "text-anchor": "middle",
          fill: "#2563eb",
          "font-size": "11",
          "font-weight": "600",
          "font-family": "General Sans, sans-serif",
          transform: "rotate(-90 " + (ox - 10) + " " + (oy + drawH / 2) + ")",
        },
        "Opening " + formatDraw(oh)
      )
    );

    svg._geom = { ox: ox, oy: oy, scale: scale, t: t, pocketX: pocketX, pocketY: pocketY };
  }

  function sash(g, label, x, y, w, h) {
    if (w < 28 || h < 28 || label === "fixed") return;
    var ink = "#0b0b0c";
    var cx = x + w / 2;
    var cy = y + h / 2;
    var ns = "http://www.w3.org/2000/svg";
    function line(x1, y1, x2, y2) {
      var n = document.createElementNS(ns, "line");
      n.setAttribute("x1", x1);
      n.setAttribute("y1", y1);
      n.setAttribute("x2", x2);
      n.setAttribute("y2", y2);
      n.setAttribute("stroke", ink);
      n.setAttribute("stroke-width", "1.5");
      n.setAttribute("opacity", "0.45");
      g.appendChild(n);
    }
    if (label === "SH") line(x, y + h * 0.55, x + w, y + h * 0.55);
    else if (label === "roller") line(cx, y, cx, y + h);
    else if (label === "casement") {
      [0.28, 0.5, 0.72].forEach(function (t) {
        line(x, y + h * t, x + 8, y + h * t);
      });
    } else if (label === "swing") {
      var r = Math.min(w * 0.85, h * 0.55);
      var p = document.createElementNS(ns, "path");
      p.setAttribute("d", "M " + x + " " + (y + h - r) + " A " + r + " " + r + " 0 0 1 " + (x + r) + " " + (y + h));
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", ink);
      p.setAttribute("stroke-width", "1.25");
      p.setAttribute("opacity", "0.5");
      g.appendChild(p);
    } else if (label === "sgd") line(x + w * 0.55, y, x + w * 0.55, y + h);
  }

  function dimLine(svg, x1, y, x2, y2, label) {
    var ns = "http://www.w3.org/2000/svg";
    function L(a, b, c, d) {
      var n = document.createElementNS(ns, "line");
      n.setAttribute("x1", a);
      n.setAttribute("y1", b);
      n.setAttribute("x2", c);
      n.setAttribute("y2", d);
      n.setAttribute("stroke", "#2563eb");
      n.setAttribute("stroke-width", "1.25");
      n.setAttribute("style", "pointer-events:none");
      svg.appendChild(n);
    }
    L(x1, y, x2, y);
    L(x1, y - 4, x1, y + 4);
    L(x2, y - 4, x2, y + 4);
    var t = document.createElementNS(ns, "text");
    t.setAttribute("x", (x1 + x2) / 2);
    t.setAttribute("y", y - 6);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", "#2563eb");
    t.setAttribute("font-size", "11");
    t.setAttribute("font-weight", "600");
    t.setAttribute("font-family", "General Sans, sans-serif");
    t.setAttribute("style", "pointer-events:none");
    t.textContent = label;
    svg.appendChild(t);
  }

  function unitHDim(g, x, y, w, label) {
    var ns = "http://www.w3.org/2000/svg";
    function L(a, b, c, d) {
      var n = document.createElementNS(ns, "line");
      n.setAttribute("x1", a);
      n.setAttribute("y1", b);
      n.setAttribute("x2", c);
      n.setAttribute("y2", d);
      n.setAttribute("stroke", "#2563eb");
      n.setAttribute("stroke-width", "1");
      n.setAttribute("opacity", "0.85");
      n.setAttribute("style", "pointer-events:none");
      g.appendChild(n);
    }
    var x1 = x + 6;
    var x2 = x + w - 6;
    L(x1, y, x2, y);
    L(x1, y - 3, x1, y + 3);
    L(x2, y - 3, x2, y + 3);
    var t = document.createElementNS(ns, "text");
    t.setAttribute("x", x + w / 2);
    t.setAttribute("y", y - 4);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", "#1d4ed8");
    t.setAttribute("font-size", "11");
    t.setAttribute("font-weight", "700");
    t.setAttribute("font-family", "General Sans, sans-serif");
    t.setAttribute("style", "pointer-events:none");
    t.textContent = label;
    g.appendChild(t);
  }

  function unitVDim(g, x, y, h, label) {
    var ns = "http://www.w3.org/2000/svg";
    function L(a, b, c, d) {
      var n = document.createElementNS(ns, "line");
      n.setAttribute("x1", a);
      n.setAttribute("y1", b);
      n.setAttribute("x2", c);
      n.setAttribute("y2", d);
      n.setAttribute("stroke", "#2563eb");
      n.setAttribute("stroke-width", "1");
      n.setAttribute("opacity", "0.85");
      n.setAttribute("style", "pointer-events:none");
      g.appendChild(n);
    }
    var y1 = y + 6;
    var y2 = y + h - 6;
    L(x, y1, x, y2);
    L(x - 3, y1, x + 3, y1);
    L(x - 3, y2, x + 3, y2);
    var t = document.createElementNS(ns, "text");
    var midY = y + h / 2;
    t.setAttribute("x", x);
    t.setAttribute("y", midY);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", "#1d4ed8");
    t.setAttribute("font-size", "11");
    t.setAttribute("font-weight", "700");
    t.setAttribute("font-family", "General Sans, sans-serif");
    t.setAttribute("style", "pointer-events:none");
    t.setAttribute("transform", "rotate(-90 " + x + " " + midY + ")");
    t.textContent = label;
    g.appendChild(t);
  }

  function clientToInches(e, geom) {
    var svg = $("wwSvg");
    var pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    var ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    var p = pt.matrixTransform(ctm.inverse());
    return {
      x: (p.x - geom.pocketX) / geom.scale,
      y: (p.y - geom.pocketY) / geom.scale,
    };
  }

  function startDrag(e, splitPath, edge, geom) {
    var flat = flatten(state);
    var mull = null;
    for (var i = 0; i < flat.mullions.length; i++)
      if (samePath(flat.mullions[i].path, splitPath)) mull = flat.mullions[i];
    if (!mull) return;
    drag = { splitPath: splitPath, edge: edge, geom: geom, mull: mull };
    pushHistory();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
    window.addEventListener("pointermove", onDrag);
    window.addEventListener("pointerup", endDrag);
  }
  function onDrag(e) {
    if (!drag) return;
    var svg = $("wwSvg");
    var geom = svg._geom || drag.geom;
    var p = clientToInches(e, geom);
    var w =
      drag.edge === "bar"
        ? weightsFromMullionCenter(drag.mull, p)
        : weightsFromPointer(drag.mull, p, drag.edge);
    state = reduce(state, {
      type: "moveSplit",
      path: drag.splitPath,
      aWeight: w.aWeight,
      bWeight: w.bWeight,
    });
    var live = $("wwLive");
    var m = flatten(state).mullions.filter(function (mm) {
      return samePath(mm.path, drag.splitPath);
    })[0];
    if (m) {
      var a = m.axis === "v" ? m.x - m.parentRect.x : m.y - m.parentRect.y;
      var b =
        m.axis === "v"
          ? m.parentRect.w - (m.x - m.parentRect.x) - m.w
          : m.parentRect.h - (m.y - m.parentRect.y) - m.h;
      live.style.display = "block";
      live.textContent = formatDraw(a) + "  /  " + formatDraw(b) + "   snap 1\"";
    }
    draw();
  }
  function endDrag() {
    drag = null;
    $("wwLive").style.display = "none";
    window.removeEventListener("pointermove", onDrag);
    window.removeEventListener("pointerup", endDrag);
    render();
  }
  function renderCanvasOnly() {
    draw();
  }

  function render() {
    try {
      var node = selection ? getNode(state.tree, selection.path) : null;
      if (selection) {
        if (!node) selection = null;
        else if (selection.kind === "unit" && node.kind !== "unit") selection = null;
        else if (selection.kind === "mullion" && node.kind !== "split") selection = null;
      }
      var ow = $("openW");
      var oh = $("openH");
      if (ow && document.activeElement !== ow) ow.value = formatDim(state.opening.wIn);
      if (oh && document.activeElement !== oh) oh.value = formatDim(state.opening.hIn);
      var flat = flatten(state);
      renderChrome(flat);
      draw();
    } catch (err) {
      console.error(err);
      var side = $("wwSide");
      if (side) side.textContent = "Designer error: " + err.message;
    }
  }

  window.addEventListener("resize", function () {
    draw();
  });
  window.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (e.key === "Escape") {
      selection = null;
      render();
    }
    if ((e.key === "Delete" || e.key === "Backspace") && selection) {
      e.preventDefault();
      if (selection.kind === "unit") dispatch({ type: "deleteUnit", path: selection.path });
      else dispatch({ type: "deleteMullion", path: selection.path });
      selection = null;
      render();
    }
  });

  /* ---------- PDF ---------- */
  function winAnsi(s) {
    return String(s)
      .replace(/[×✕✖]/g, "x")
      .replace(/[—–−]/g, "-")
      .replace(/[′’‘]/g, "'")
      .replace(/[″“”]/g, '"')
      .replace(/[²]/g, "2")
      .replace(/[·•]/g, " ")
      .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "?");
  }

  async function makePdf() {
    if (!window.PDFLib) {
      alert("PDF library still loading — try again in a second.");
      return;
    }
    var PDFDocument = PDFLib.PDFDocument;
    var StandardFonts = PDFLib.StandardFonts;
    var rgb = PDFLib.rgb;
    var degrees = PDFLib.degrees;
    var pdf = await PDFDocument.create();
    var page = pdf.addPage([792, 612]);
    var pageW = 792,
      pageH = 612;
    var font = await pdf.embedFont(StandardFonts.Helvetica);
    var bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    var NAVY = rgb(0.043, 0.122, 0.227);
    var GOLD = rgb(0.145, 0.388, 0.922);
    var CREAM = rgb(1, 1, 1);
    var INK = rgb(0.05, 0.08, 0.12);
    var MUTED = rgb(0.35, 0.4, 0.48);
    var RULE = rgb(0.78, 0.82, 0.88);
    function yOf(top) {
      return pageH - top;
    }
    function write(str, x, y, size, fnt, color) {
      page.drawText(winAnsi(str), { x: x, y: y, size: size, font: fnt || font, color: color || INK });
    }
    function rect(x, top, w, h, opts) {
      page.drawRectangle({
        x: x,
        y: yOf(top + h),
        width: w,
        height: h,
        color: opts.fill,
        borderColor: opts.stroke,
        borderWidth: opts.thickness || 0,
      });
    }
    function pdfLine(x1, top1, x2, top2) {
      page.drawLine({
        start: { x: x1, y: yOf(top1) },
        end: { x: x2, y: yOf(top2) },
        thickness: 0.8,
        color: NAVY,
        opacity: 0.55,
      });
    }
    function pdfSash(label, x, top, w, h) {
      if (w < 12 || h < 12 || label === "fixed") return;
      var cx = x + w / 2;
      if (label === "SH") {
        pdfLine(x, top + h * 0.55, x + w, top + h * 0.55);
      } else if (label === "roller") {
        pdfLine(cx, top, cx, top + h);
      } else if (label === "casement") {
        [0.28, 0.5, 0.72].forEach(function (t) {
          pdfLine(x, top + h * t, x + Math.min(7, w * 0.12), top + h * t);
        });
      } else if (label === "swing") {
        var r = Math.min(w * 0.85, h * 0.6);
        var steps = 10;
        for (var i = 0; i < steps; i++) {
          var a0 = (Math.PI / 2) * (i / steps);
          var a1 = (Math.PI / 2) * ((i + 1) / steps);
          pdfLine(
            x + r * Math.sin(a0),
            top + h - r * Math.cos(a0),
            x + r * Math.sin(a1),
            top + h - r * Math.cos(a1)
          );
        }
        pdfLine(x, top + h - r, x, top + h);
      } else if (label === "sgd") {
        pdfLine(x + w * 0.55, top, x + w * 0.55, top + h);
        pdfLine(x + w * 0.2, top + h * 0.5, x + w * 0.42, top + h * 0.5);
        pdfLine(x + w * 0.65, top + h * 0.5, x + w * 0.88, top + h * 0.5);
      }
    }

    var flat = flatten(state);
    var tBuck = state.buckStock.tIn;
    var today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    page.drawRectangle({ x: 0, y: pageH - 40, width: pageW, height: 40, color: NAVY });
    write("WINDOW WALL DESIGNER", 20, pageH - 18, 13, bold, CREAM);
    write("Permit Toolkit  -  planning aid, not for construction", 20, pageH - 32, 8, font, GOLD);
    write(today, pageW - 20 - font.widthOfTextAtSize(today, 9), pageH - 22, 9, font, CREAM);

    var ow = state.opening.wIn,
      oh = state.opening.hIn;
    var margin = 20;
    var headerH = 48;
    var footerH = 26;
    var gapCol = 16;
    var contentW = pageW - margin * 2;
    var areaW = contentW * 0.7;
    var chartW = contentW - areaW - gapCol;
    var areaH = pageH - headerH - footerH - 8;
    var chartX = margin + areaW + gapCol;

    var pad = 32;
    var scale = Math.min((areaW - pad * 2) / ow, (areaH - pad * 2) / oh);
    var drawW = ow * scale,
      drawH = oh * scale;
    var ox = margin + (areaW - drawW) / 2;
    var oy = headerH + (areaH - drawH) / 2;

    rect(ox, oy, drawW, drawH, { fill: rgb(0.8, 0.84, 0.88) });
    var bx = ox + tBuck * scale,
      by = oy + tBuck * scale;
    rect(bx, by, flat.pocket.w * scale, flat.pocket.h * scale, { fill: rgb(0.93, 0.95, 0.98) });
    flat.gaps.forEach(function (g) {
      rect(bx + g.x * scale, by + g.y * scale, g.w * scale, g.h * scale, { fill: rgb(0.82, 0.84, 0.87) });
    });
    flat.units.forEach(function (u) {
      var ux = bx + u.x * scale,
        uy = by + u.y * scale,
        uw = u.w * scale,
        uh = u.h * scale;
      rect(ux, uy, uw, uh, { fill: rgb(1, 1, 1), stroke: NAVY, thickness: 0.9 });
      var inset = Math.min(6, uw * 0.08, uh * 0.08);
      if (uw > 12 && uh > 12) {
        rect(ux + inset, uy + inset, Math.max(1, uw - inset * 2), Math.max(1, uh - inset * 2), {
          fill: rgb(0.94, 0.97, 1),
          stroke: rgb(0.55, 0.65, 0.75),
          thickness: 0.4,
        });
        pdfSash(u.label, ux + inset, uy + inset, uw - inset * 2, uh - inset * 2);
      }
      if (uw > 18 && uh > 10) {
        var t1 = "U" + u.index + "  " + labelShort(u.label);
        var sz = uw > 70 && uh > 28 ? 8 : 6.5;
        var tw1 = bold.widthOfTextAtSize(winAnsi(t1), sz);
        var idY = uh < 28 ? uy + uh / 2 + 6 : uy + uh / 2 + 3;
        write(t1, ux + uw / 2 - tw1 / 2, yOf(idY), sz, bold, NAVY);
        var dw = formatIn(u.w);
        var dh = formatIn(u.h);
        if (uh >= 32) {
          var tdw = bold.widthOfTextAtSize(winAnsi(dw), 7);
          write(dw, ux + uw / 2 - tdw / 2, yOf(uy + 9), 7, bold, GOLD);
          var hStr = dh;
          var hw = bold.widthOfTextAtSize(winAnsi(hStr), 7);
          page.drawText(winAnsi(hStr), {
            x: ux + 8,
            y: yOf(uy + uh / 2) - hw / 2,
            size: 7,
            font: bold,
            color: GOLD,
            rotate: degrees(90),
          });
        } else {
          var pair = dw + "  x  " + dh;
          var pw = bold.widthOfTextAtSize(winAnsi(pair), 7);
          write(pair, ux + Math.max(4, uw / 2 - pw / 2), yOf(uy + Math.min(9, uh * 0.4)), 7, bold, GOLD);
        }
      }
    });
    flat.mullions.forEach(function (m) {
      var mx = bx + m.x * scale,
        my = by + m.y * scale,
        mw = Math.max(m.w * scale, 1.2),
        mh = Math.max(m.h * scale, 1.2);
      rect(mx, my, mw, mh, { fill: rgb(0.12, 0.16, 0.23) });
      var along = m.axis === "v" ? mh : mw;
      if (along > 24) {
        var ml = "M" + m.index + "  " + m.stock.nominal + "  " + formatIn(m.stock.tIn);
        var msz = 7;
        var mlw = bold.widthOfTextAtSize(winAnsi(ml), msz);
        if (m.axis === "v") {
          page.drawText(winAnsi(ml), {
            x: mx + mw + 9,
            y: yOf(my + mh / 2) - mlw / 2,
            size: msz,
            font: bold,
            color: NAVY,
            rotate: degrees(90),
          });
        } else {
          var lx = mx + Math.max(2, mw / 2 - mlw / 2);
          var ly = my - 3;
          rect(lx - 2, ly - 9, mlw + 4, 10, { fill: rgb(1, 1, 1) });
          write(ml, lx, yOf(ly - 1), msz, bold, NAVY);
        }
      }
    });
    rect(ox, oy, drawW, drawH, { stroke: NAVY, thickness: 1.4 });

    write("OPENING  " + formatIn(ow) + " x " + formatIn(oh), ox, yOf(oy - 14), 8, bold, NAVY);

    var colX = chartX;
    write("OPENING", colX, yOf(headerH + 8), 8, bold, GOLD);
    write(formatIn(ow) + " x " + formatIn(oh), colX, yOf(headerH + 22), 11, bold, NAVY);
    write("BUCKS  " + state.buckStock.nominal + "  " + formatIn(state.buckStock.tIn) + " all around", colX, yOf(headerH + 36), 8);
    write("POCKET  " + formatIn(flat.pocket.w) + " x " + formatIn(flat.pocket.h), colX, yOf(headerH + 50), 8);

    write("UNIT SCHEDULE", colX, yOf(headerH + 72), 8, bold, GOLD);
    var tableTop = headerH + 86;
    var cols = [colX, colX + 28, colX + 78, colX + 138];
    ["#", "Type", "W in", "H in"].forEach(function (h, i) {
      write(h, cols[i], yOf(tableTop), 8, bold, MUTED);
    });
    page.drawLine({
      start: { x: colX, y: yOf(tableTop + 12) },
      end: { x: pageW - margin, y: yOf(tableTop + 12) },
      thickness: 0.8,
      color: GOLD,
    });
    var rowTop = tableTop + 22;
    var rowH = 22;
    if (flat.units.length === 0) {
      write("No units placed.", colX, yOf(rowTop), 9, font, MUTED);
      rowTop += rowH;
    }
    flat.units.forEach(function (u, i) {
      if (rowTop > pageH - footerH - 70) return;
      if (i % 2 === 0) {
        rect(colX - 4, rowTop - 10, chartW + 4, rowH - 2, { fill: rgb(0.96, 0.97, 0.99) });
      }
      write("U" + u.index, cols[0], yOf(rowTop), 9, bold, NAVY);
      write(labelName(u.label), cols[1], yOf(rowTop), 8, bold, NAVY);
      write(formatIn(u.w), cols[2], yOf(rowTop), 9, font, INK);
      write(formatIn(u.h), cols[3], yOf(rowTop), 9, font, INK);
      page.drawLine({
        start: { x: colX, y: yOf(rowTop + 16) },
        end: { x: pageW - margin, y: yOf(rowTop + 16) },
        thickness: 0.4,
        color: RULE,
      });
      rowTop += rowH;
    });

    rowTop += 10;
    write("MULLIONS", colX, yOf(rowTop), 8, bold, GOLD);
    rowTop += 14;
    if (flat.mullions.length === 0) {
      write("None.", colX, yOf(rowTop), 9, font, MUTED);
    }
    flat.mullions.forEach(function (m) {
      if (rowTop > pageH - footerH - 20) return;
      write(
        m.stock.nominal +
          " " +
          (m.axis === "v" ? "vert" : "horiz") +
          "  " +
          formatIn(m.stock.tIn) +
          "  x  " +
          formatIn(m.axis === "v" ? m.h : m.w),
        colX,
        yOf(rowTop),
        8
      );
      rowTop += 12;
    });

    page.drawRectangle({ x: 0, y: 0, width: pageW, height: 22, color: NAVY });
    write("Permit Toolkit  -  permittoolkit.com", 20, 8, 8, font, CREAM);
    write("Verify with manufacturer and AHJ.", 420, 8, 8, font, GOLD);

    var bytes = await pdf.save();
    var ab = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(ab).set(bytes);
    var blob = new Blob([ab], { type: "application/pdf" });
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    pdfUrl = URL.createObjectURL(blob);
    var name = "window-wall-" + new Date().toISOString().slice(0, 10) + ".pdf";
    $("wwPdfFrame").src = pdfUrl;
    $("wwSave").href = pdfUrl;
    $("wwSave").setAttribute("download", name);
    $("wwOpen").href = pdfUrl;
    $("wwPdf").classList.add("open");
  }

  $("wwPrint").onclick = function () {
    var f = $("wwPdfFrame");
    if (f.contentWindow) {
      f.contentWindow.focus();
      f.contentWindow.print();
    }
  };
  $("wwPdfClose").onclick = function () {
    $("wwPdf").classList.remove("open");
  };

  /* kick */
  if (document.readyState === "complete") render();
  else window.addEventListener("load", function () {
    setTimeout(render, 50);
  });
  setTimeout(render, 200);
  if (window.ResizeObserver && $("wwCanvasWrap")) {
    new ResizeObserver(function () {
      draw();
    }).observe($("wwCanvasWrap"));
  }
})();
