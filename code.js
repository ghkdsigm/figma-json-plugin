console.log("PLUGIN CODE LOADED");
figma.notify("PLUGIN CODE LOADED");

function pick(node, keys) {
  const out = {};
  for (const k of keys) {
    if (node && node[k] !== undefined) out[k] = node[k];
  }
  return out;
}

function round(n, p = 3) {
  if (typeof n !== "number") return n;
  const m = Math.pow(10, p);
  return Math.round(n * m) / m;
}

function cloneJSONSafe(v) {
  try {
    return JSON.parse(JSON.stringify(v));
  } catch (e) {
    return v;
  }
}

function toBase64(bytes) {
  let binary = "";
  const len = bytes.length;
  const chunk = 0x8000;
  for (let i = 0; i < len; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, sub);
  }
  return btoa(binary);
}

function normalizeColor(c) {
  if (!c) return null;
  return {
    r: round(c.r),
    g: round(c.g),
    b: round(c.b),
    a: c.a !== undefined ? round(c.a) : 1
  };
}

function normalizePaint(p) {
  if (!p) return null;

  const out = {
    type: p.type,
    visible: p.visible !== false,
    opacity: p.opacity !== undefined ? round(p.opacity) : 1,
    blendMode: p.blendMode
  };

  if (p.type === "SOLID") {
    out.color = normalizeColor(p.color);
  } else if (
    p.type === "GRADIENT_LINEAR" ||
    p.type === "GRADIENT_RADIAL" ||
    p.type === "GRADIENT_ANGULAR" ||
    p.type === "GRADIENT_DIAMOND"
  ) {
    out.gradientStops = (p.gradientStops || []).map((s) => ({
      position: round(s.position),
      color: normalizeColor(s.color)
    }));
    out.gradientTransform = cloneJSONSafe(p.gradientTransform);
  } else if (p.type === "IMAGE") {
    out.imageHash = p.imageHash;
    out.scaleMode = p.scaleMode;
    out.imageTransform = cloneJSONSafe(p.imageTransform);
    out.scalingFactor = p.scalingFactor;
    out.rotation = p.rotation;
    out.filters = cloneJSONSafe(p.filters);
  }

  if (p.boundVariables) out.boundVariables = cloneJSONSafe(p.boundVariables);
  return out;
}

function normalizeEffect(e) {
  if (!e) return null;
  const out = {
    type: e.type,
    visible: e.visible !== false,
    radius: e.radius !== undefined ? round(e.radius) : undefined,
    spread: e.spread !== undefined ? round(e.spread) : undefined,
    color: e.color ? normalizeColor(e.color) : undefined,
    blendMode: e.blendMode,
    offset: e.offset ? { x: round(e.offset.x), y: round(e.offset.y) } : undefined
  };
  if (e.boundVariables) out.boundVariables = cloneJSONSafe(e.boundVariables);
  return out;
}

function normalizeGeometry(node) {
  const out = {};
  if ("x" in node) out.x = round(node.x);
  if ("y" in node) out.y = round(node.y);
  if ("width" in node) out.width = round(node.width);
  if ("height" in node) out.height = round(node.height);

  if ("relativeTransform" in node) out.relativeTransform = cloneJSONSafe(node.relativeTransform);
  if ("absoluteTransform" in node) out.absoluteTransform = cloneJSONSafe(node.absoluteTransform);

  if ("absoluteBoundingBox" in node) out.absoluteBoundingBox = cloneJSONSafe(node.absoluteBoundingBox);
  if ("absoluteRenderBounds" in node) out.absoluteRenderBounds = cloneJSONSafe(node.absoluteRenderBounds);

  return out;
}

function normalizeCorner(node) {
  const out = {};
  if ("cornerRadius" in node) out.cornerRadius = node.cornerRadius !== figma.mixed ? round(node.cornerRadius) : "MIXED";
  if ("cornerSmoothing" in node) out.cornerSmoothing = round(node.cornerSmoothing);
  if ("topLeftRadius" in node) out.topLeftRadius = round(node.topLeftRadius);
  if ("topRightRadius" in node) out.topRightRadius = round(node.topRightRadius);
  if ("bottomLeftRadius" in node) out.bottomLeftRadius = round(node.bottomLeftRadius);
  if ("bottomRightRadius" in node) out.bottomRightRadius = round(node.bottomRightRadius);
  return out;
}

function normalizeFills(node) {
  const out = {};
  if ("fills" in node) out.fills = (node.fills || []).map(normalizePaint);
  if ("fillStyleId" in node && node.fillStyleId) out.fillStyleId = node.fillStyleId;
  return out;
}

function normalizeStrokes(node) {
  const out = {};
  if ("strokes" in node) out.strokes = (node.strokes || []).map(normalizePaint);
  if ("strokeWeight" in node) out.strokeWeight = round(node.strokeWeight);
  if ("strokeTopWeight" in node) out.strokeTopWeight = round(node.strokeTopWeight);
  if ("strokeBottomWeight" in node) out.strokeBottomWeight = round(node.strokeBottomWeight);
  if ("strokeLeftWeight" in node) out.strokeLeftWeight = round(node.strokeLeftWeight);
  if ("strokeRightWeight" in node) out.strokeRightWeight = round(node.strokeRightWeight);
  if ("strokeAlign" in node) out.strokeAlign = node.strokeAlign;
  if ("strokeJoin" in node) out.strokeJoin = node.strokeJoin;
  if ("strokeCap" in node) out.strokeCap = node.strokeCap;
  if ("dashPattern" in node) out.dashPattern = cloneJSONSafe(node.dashPattern);
  if ("strokeMiterLimit" in node) out.strokeMiterLimit = round(node.strokeMiterLimit);
  if ("strokeStyleId" in node && node.strokeStyleId) out.strokeStyleId = node.strokeStyleId;
  return out;
}

function normalizeAutoLayout(node) {
  if (!("layoutMode" in node)) return null;

  const keys = [
    "layoutMode",
    "primaryAxisAlignItems",
    "counterAxisAlignItems",
    "primaryAxisSizingMode",
    "counterAxisSizingMode",
    "layoutWrap",
    "itemSpacing",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "paddingBottom",
    "itemReverseZIndex",
    "strokesIncludedInLayout"
  ];

  const info = pick(node, keys);

  const extraKeys = [
    "primaryAxisAlignContent",
    "counterAxisAlignContent",
    "horizontalPadding",
    "verticalPadding",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight"
  ];

  for (const k of extraKeys) {
    if (node && node[k] !== undefined) info[k] = node[k];
  }

  return Object.keys(info).length ? cloneJSONSafe(info) : null;
}

function normalizeLayout(node) {
  const out = {};
  if ("constraints" in node) out.constraints = cloneJSONSafe(node.constraints);
  if ("layoutAlign" in node) out.layoutAlign = node.layoutAlign;
  if ("layoutGrow" in node) out.layoutGrow = node.layoutGrow;
  if ("layoutPositioning" in node) out.layoutPositioning = node.layoutPositioning;
  if ("clipsContent" in node) out.clipsContent = node.clipsContent;

  if ("layoutGrids" in node) out.layoutGrids = cloneJSONSafe(node.layoutGrids);

  const al = normalizeAutoLayout(node);
  if (al) out.autoLayout = al;

  return out;
}

function normalizeCommon(node) {
  const out = {
    id: node.id,
    type: node.type,
    name: node.name,
    visible: node.visible !== false
  };

  if ("locked" in node) out.locked = node.locked;
  if ("opacity" in node) out.opacity = node.opacity !== figma.mixed ? round(node.opacity) : "MIXED";
  if ("blendMode" in node) out.blendMode = node.blendMode;
  if ("isMask" in node) out.isMask = node.isMask;

  if ("effects" in node) out.effects = (node.effects || []).map(normalizeEffect);
  if ("effectStyleId" in node && node.effectStyleId) out.effectStyleId = node.effectStyleId;

  if ("exportSettings" in node) out.exportSettings = cloneJSONSafe(node.exportSettings);

  return out;
}

function normalizeComponentInfo(node) {
  const out = {};
  if (node.type === "INSTANCE") {
    out.instance = {
      mainComponentId: node.mainComponent ? node.mainComponent.id : null,
      componentProperties: cloneJSONSafe(node.componentProperties || {})
    };
  }
  if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
    out.component = {
      key: node.key,
      componentId: node.id
    };
    if (node.type === "COMPONENT_SET") {
      out.component.variants = cloneJSONSafe(node.variantGroupProperties || {});
    }
  }
  return out;
}

function normalizeTextNode(node) {
  const out = {};
  if (node.type !== "TEXT") return out;

  out.text = {
    characters: node.characters,
    autoRename: node.autoRename,
    textAlignHorizontal: node.textAlignHorizontal,
    textAlignVertical: node.textAlignVertical,
    textAutoResize: node.textAutoResize,
    paragraphIndent: node.paragraphIndent,
    paragraphSpacing: node.paragraphSpacing,
    fontSize: node.fontSize !== figma.mixed ? round(node.fontSize) : "MIXED",
    fontName: node.fontName !== figma.mixed ? cloneJSONSafe(node.fontName) : "MIXED",
    letterSpacing: node.letterSpacing !== figma.mixed ? cloneJSONSafe(node.letterSpacing) : "MIXED",
    lineHeight: node.lineHeight !== figma.mixed ? cloneJSONSafe(node.lineHeight) : "MIXED",
    textCase: node.textCase !== figma.mixed ? node.textCase : "MIXED",
    textDecoration: node.textDecoration !== figma.mixed ? node.textDecoration : "MIXED"
  };

  const len = node.characters.length;
  const ranges = {};

  function tryRange(name, fn) {
    try {
      const v = fn(0, len);
      if (v !== undefined && v !== null) ranges[name] = cloneJSONSafe(v);
    } catch (e) {
    }
  }

  tryRange("fills", (s, e) => node.getRangeFills(s, e));
  tryRange("allFontNames", (s, e) => node.getRangeAllFontNames(s, e));
  tryRange("fontSize", (s, e) => node.getRangeFontSize(s, e));
  tryRange("lineHeight", (s, e) => node.getRangeLineHeight(s, e));
  tryRange("letterSpacing", (s, e) => node.getRangeLetterSpacing(s, e));
  tryRange("textStyleId", (s, e) => node.getRangeTextStyleId(s, e));

  if (Object.keys(ranges).length) out.text.ranges = ranges;
  return out;
}

function serializeNode(node, opts, depth = 0, stats) {
  const base = {};
  Object.assign(base, normalizeCommon(node));
  Object.assign(base, normalizeGeometry(node));
  Object.assign(base, normalizeCorner(node));
  Object.assign(base, normalizeFills(node));
  Object.assign(base, normalizeStrokes(node));
  Object.assign(base, normalizeLayout(node));
  Object.assign(base, normalizeComponentInfo(node));
  Object.assign(base, normalizeTextNode(node));

  if (base.autoLayout && stats) stats.autoLayoutNodes += 1;

  if ("children" in node && depth < opts.maxDepth) {
    base.children = node.children.map((c) => serializeNode(c, opts, depth + 1, stats));
  }

  return base;
}

function collectNodes(root) {
  const all = [];
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    all.push(n);
    if ("children" in n) {
      for (let i = n.children.length - 1; i >= 0; i--) stack.push(n.children[i]);
    }
  }
  return all;
}

function findComponentSetsWithin(root) {
  const nodes = collectNodes(root);
  return nodes.filter((n) => n.type === "COMPONENT_SET");
}

function buildFontMeta(root) {
  const nodes = collectNodes(root);
  const textNodes = nodes.filter((n) => n.type === "TEXT");
  const used = new Map();
  const perNode = [];

  for (const t of textNodes) {
    const item = {
      id: t.id,
      name: t.name,
      charactersLength: t.characters ? t.characters.length : 0,
      fontName: t.fontName !== figma.mixed ? cloneJSONSafe(t.fontName) : "MIXED"
    };

    if (t.fontName !== figma.mixed && t.fontName) {
      const key = `${t.fontName.family}::${t.fontName.style}`;
      used.set(key, { family: t.fontName.family, style: t.fontName.style });
    }

    const len = t.characters.length;
    try {
      const ranges = t.getRangeAllFontNames(0, len);
      item.rangeAllFontNames = cloneJSONSafe(ranges);

      for (const seg of ranges) {
        if (Array.isArray(seg)) {
          for (const fn of seg) {
            if (fn && fn.family && fn.style) {
              const key = `${fn.family}::${fn.style}`;
              used.set(key, { family: fn.family, style: fn.style });
            }
          }
        } else if (seg && seg.family && seg.style) {
          const key = `${seg.family}::${seg.style}`;
          used.set(key, { family: seg.family, style: seg.style });
        }
      }
    } catch (e) {
    }

    perNode.push(item);
  }

  return {
    totalTextNodes: textNodes.length,
    uniqueFonts: Array.from(used.values()),
    perTextNode: perNode
  };
}

function shouldExportAsSVG(node, opts) {
  if (!opts.exportAssets) return false;
  const svgTypes = new Set([
    "VECTOR",
    "BOOLEAN_OPERATION",
    "STAR",
    "LINE",
    "ELLIPSE",
    "POLYGON",
    "RECTANGLE",
    "TEXT"
  ]);
  if (svgTypes.has(node.type)) return true;

  if ("exportSettings" in node && node.exportSettings && node.exportSettings.length) {
    const hasSVG = node.exportSettings.some((s) => s.format === "SVG");
    if (hasSVG) return true;
  }
  return false;
}

function shouldExportAsPNG(node, opts) {
  if (!opts.exportAssets) return false;

  if ("exportSettings" in node && node.exportSettings && node.exportSettings.length) {
    const hasPNG = node.exportSettings.some((s) => s.format === "PNG" || s.format === "JPG");
    if (hasPNG) return true;
  }

  const pngCandidates = new Set([
    "FRAME",
    "GROUP",
    "COMPONENT",
    "INSTANCE"
  ]);
  if (pngCandidates.has(node.type)) return true;

  return false;
}

function safeAssetName(name) {
  return (name || "asset")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

async function exportNodeAsset(node, fmt, opts) {
  const format = fmt === "SVG" ? "SVG" : "PNG";
  const settings = format === "SVG"
    ? { format: "SVG", svgOutlineText: false, svgIdAttribute: true, svgSimplifyStroke: false }
    : { format: "PNG", constraint: { type: "SCALE", value: opts.pngScale || 1 } };

  const bytes = await node.exportAsync(settings);
  const b64 = toBase64(bytes);

  return {
    format,
    mime: format === "SVG" ? "image/svg+xml" : "image/png",
    base64: b64
  };
}

async function exportImageFillAssets(root) {
  const nodes = collectNodes(root);
  const hashes = new Set();

  for (const n of nodes) {
    if (!("fills" in n)) continue;
    const fills = n.fills || [];
    for (const f of fills) {
      if (f && f.type === "IMAGE" && f.imageHash) {
        hashes.add(f.imageHash);
      }
    }
  }

  const assets = {};
  for (const hash of hashes) {
    const img = figma.getImageByHash(hash);
    if (!img) continue;
    const bytes = await img.getBytesAsync();
    assets[`imageHash:${hash}`] = {
      id: `imageHash:${hash}`,
      name: `imageHash_${hash}.png`,
      kind: "FILL_IMAGE",
      mime: "image/png",
      base64: toBase64(bytes)
    };
  }

  return assets;
}

async function exportAssetsForRoot(root, opts) {
  const nodes = collectNodes(root);
  const assets = {};
  const tasks = [];

  for (const n of nodes) {
    if (!("exportAsync" in n)) continue;

    if (opts.assetFormats.includes("SVG") && shouldExportAsSVG(n, opts)) {
      tasks.push(
        (async () => {
          try {
            const data = await exportNodeAsset(n, "SVG", opts);
            const key = `node:${n.id}:svg`;
            assets[key] = {
              id: key,
              name: `${safeAssetName(n.name)}__${n.id}.svg`,
              kind: "NODE_EXPORT",
              nodeId: n.id,
              nodeType: n.type,
              mime: data.mime,
              base64: data.base64
            };
          } catch (e) {
          }
        })()
      );
    }

    if (opts.assetFormats.includes("PNG") && shouldExportAsPNG(n, opts)) {
      tasks.push(
        (async () => {
          try {
            const data = await exportNodeAsset(n, "PNG", opts);
            const key = `node:${n.id}:png`;
            assets[key] = {
              id: key,
              name: `${safeAssetName(n.name)}__${n.id}.png`,
              kind: "NODE_EXPORT",
              nodeId: n.id,
              nodeType: n.type,
              mime: data.mime,
              base64: data.base64
            };
          } catch (e) {
          }
        })()
      );
    }
  }

  await Promise.all(tasks);

  const fillImages = await exportImageFillAssets(root);
  for (const k of Object.keys(fillImages)) {
    assets[k] = fillImages[k];
  }

  return assets;
}

function buildExportMeta(opts, stats) {
  return {
    exporter: "Export JSON Pro",
    exportedAt: new Date().toISOString(),
    figmaFileKey: figma.fileKey || null,
    pageId: figma.currentPage.id,
    pageName: figma.currentPage.name,
    options: cloneJSONSafe(opts),
    stats: cloneJSONSafe(stats)
  };
}

function serializeRoot(root, opts, stats) {
  return serializeNode(root, opts, 0, stats);
}

function buildVariantExports(componentSet, opts, stats) {
  const exports = [];
  if (!componentSet || componentSet.type !== "COMPONENT_SET") return exports;

  const setName = safeAssetName(componentSet.name);
  const variants = componentSet.children || [];

  for (const c of variants) {
    if (c.type !== "COMPONENT") continue;
    const variantName = safeAssetName(c.name);
    exports.push({
      id: `variant:${componentSet.id}:${c.id}`,
      kind: "VARIANT",
      componentSetId: componentSet.id,
      componentId: c.id,
      name: `${setName}__${variantName}`,
      tree: serializeRoot(c, opts, stats)
    });
  }

  return exports;
}

figma.showUI(__html__, { width: 520, height: 720 });

function resolveExportRoots(options) {
  if (options.exportMode === "page") {
    return [figma.currentPage];
  }

  const sel = figma.currentPage.selection;
  if (!sel || sel.length === 0) return [];

  return sel;
}

figma.ui.onmessage = async (msg) => {
  console.log("MSG", msg);
  figma.notify("MSG RECEIVED: " + msg.type);

  if (msg.type !== "EXPORT") return;

  const opts = msg.options || {};
  const options = {
    exportMode: opts.exportMode || "selection",
    maxDepth: Number(opts.maxDepth || 80),
    exportAssets: !!opts.exportAssets,
    assetFormats: Array.isArray(opts.assetFormats) ? opts.assetFormats : ["SVG", "PNG"],
    pngScale: Number(opts.pngScale || 1),
    splitVariants: !!opts.splitVariants,
    includeMainTree: opts.includeMainTree !== false
  };

  const roots = resolveExportRoots(options);

  if (!roots.length) {
    figma.ui.postMessage({ type: "ERROR", message: "선택된 레이어가 없습니다. FRAME/COMPONENT를 선택하세요." });
    return;
  }

  const stats = { autoLayoutNodes: 0 };

  const exportsList = [];
  const allAssets = {};
  const fontsMerged = { totalTextNodes: 0, uniqueFonts: [], perTextNode: [] };
  const fontSet = new Map();

  for (const root of roots) {
    const fonts = buildFontMeta(root);
    fontsMerged.totalTextNodes += fonts.totalTextNodes;
    fontsMerged.perTextNode.push(...fonts.perTextNode);
    for (const f of fonts.uniqueFonts) {
      const key = `${f.family}::${f.style}`;
      if (!fontSet.has(key)) fontSet.set(key, f);
    }

    if (options.includeMainTree) {
      exportsList.push({
        id: `root:${root.id}`,
        kind: root.type === "PAGE" ? "PAGE" : "ROOT",
        name: safeAssetName(root.name || "root"),
        tree: serializeRoot(root, options, stats)
      });
    }

    if (options.splitVariants) {
      const sets = findComponentSetsWithin(root);
      for (const set of sets) {
        const variants = buildVariantExports(set, options, stats);
        for (const v of variants) exportsList.push(v);
      }
    }

    if (options.exportAssets) {
      try {
        const assets = await exportAssetsForRoot(root, options);
        for (const k of Object.keys(assets)) allAssets[k] = assets[k];
      } catch (e) {
      }
    }
  }

  fontsMerged.uniqueFonts = Array.from(fontSet.values());

  const meta = buildExportMeta(options, stats);

  const payload = {
    meta,
    exports: exportsList,
    assets: allAssets,
    fonts: fontsMerged
  };

  figma.notify("RESULT SENT: exports=" + exportsList.length + ", autoLayoutNodes=" + stats.autoLayoutNodes);
  figma.ui.postMessage({ type: "RESULT", payload });
};
