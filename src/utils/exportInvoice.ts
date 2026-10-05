import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Ensures all images inside an element are fully loaded before capturing
 */
async function waitForElementImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );
}

/**
 * Mathematical conversion of OKLAB coordinates to sRGB rgb/rgba string.
 */
function oklabCoordinatesToRgb(L: number, a: number, b: number, alpha: number = 1): string {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const lLinear = l_ * l_ * l_;
  const mLinear = m_ * m_ * m_;
  const sLinear = s_ * s_ * s_;

  const rLinear = +4.0767416621 * lLinear - 3.3077115913 * mLinear + 0.2309699292 * sLinear;
  const gLinear = -1.2684380046 * lLinear + 2.6097574011 * mLinear - 0.3413193965 * sLinear;
  const bLinear = -0.0041960863 * lLinear - 0.7034186147 * mLinear + 1.707614701 * sLinear;

  const toSrgb = (c: number) => {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1.0 / 2.4) - 0.055;
  };

  const r = Math.round(toSrgb(rLinear) * 255);
  const g = Math.round(toSrgb(gLinear) * 255);
  const bByte = Math.round(toSrgb(bLinear) * 255);

  return alpha < 1 ? `rgba(${r}, ${g}, ${bByte}, ${alpha})` : `rgb(${r}, ${g}, ${bByte})`;
}

/**
 * Algorithmic parser for oklch(...) expressions
 */
export function parseOklch(str: string): string | null {
  const normalized = str.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  const match = normalized.match(
    /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([-\d.]+(?:deg|rad|turn)?|none)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i
  );
  if (!match) return null;
  const L = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
  const C = parseFloat(match[2]);
  const hStr = match[3];
  let H = 0;
  if (hStr && hStr.toLowerCase() !== 'none') {
    H = parseFloat(hStr);
    if (hStr.endsWith('turn')) H = H * 360;
    else if (hStr.endsWith('rad')) H = (H * 180) / Math.PI;
  }
  let alpha = 1;
  if (match[4]) {
    alpha = match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
  }
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabCoordinatesToRgb(L, a, b, alpha);
}

/**
 * Algorithmic parser for oklab(...) expressions
 */
export function parseOklab(str: string): string | null {
  const normalized = str.trim().replace(/,/g, ' ').replace(/\s+/g, ' ');
  const match = normalized.match(
    /^oklab\(\s*([\d.]+%?)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i
  );
  if (!match) return null;
  const L = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
  const a = parseFloat(match[2]);
  const b = parseFloat(match[3]);
  let alpha = 1;
  if (match[4]) {
    alpha = match[4].endsWith('%') ? parseFloat(match[4]) / 100 : parseFloat(match[4]);
  }
  return oklabCoordinatesToRgb(L, a, b, alpha);
}

let colorConverterCanvas: HTMLCanvasElement | null = null;
let colorConverterCtx: CanvasRenderingContext2D | null = null;

/**
 * Converts modern CSS colors (oklab, oklch, lab, lch, color-mix, color) to standard sRGB hex or rgb/rgba strings.
 */
export function convertColorToStandardRgb(colorStr: string): string {
  if (!colorStr) return '#000000';
  const trimmed = colorStr.trim();

  // If already standard RGB or Hex, return directly
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) || /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/i.test(trimmed)) {
    return trimmed;
  }

  // 1. Try native canvas parser (works in modern Chromium/Safari)
  try {
    if (!colorConverterCanvas && typeof document !== 'undefined') {
      colorConverterCanvas = document.createElement('canvas');
      colorConverterCanvas.width = 1;
      colorConverterCanvas.height = 1;
      colorConverterCtx = colorConverterCanvas.getContext('2d');
    }
    if (colorConverterCtx) {
      colorConverterCtx.fillStyle = 'rgba(1, 2, 3, 0.5)';
      colorConverterCtx.fillStyle = trimmed;
      const computed = colorConverterCtx.fillStyle;
      if (computed && computed !== 'rgba(1, 2, 3, 0.5)' && !/(oklab|oklch|color-mix)/i.test(computed)) {
        return computed;
      }
    }
  } catch {
    // Continue to algorithmic parsers
  }

  // 2. Algorithmic OKLCH
  if (/^oklch\(/i.test(trimmed)) {
    const oklch = parseOklch(trimmed);
    if (oklch) return oklch;
  }

  // 3. Algorithmic OKLAB
  if (/^oklab\(/i.test(trimmed)) {
    const oklab = parseOklab(trimmed);
    if (oklab) return oklab;
  }

  return '#334155';
}

/**
 * Replaces nested balanced function calls in a CSS string with a sanitized result.
 */
function replaceBalancedFunctions(
  input: string,
  funcNames: string[],
  replacer: (name: string, innerArgs: string, fullCall: string) => string
): string {
  let prev = '';
  let curr = input;
  const pattern = new RegExp('\\b(' + funcNames.join('|') + ')\\(', 'i');

  while (pattern.test(curr) && curr !== prev) {
    prev = curr;
    const globalPattern = new RegExp('\\b(' + funcNames.join('|') + ')\\(', 'gi');
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = globalPattern.exec(curr)) !== null) {
      const startIndex = match.index;
      result += curr.substring(lastIndex, startIndex);
      const funcName = match[1];
      let depth = 1;
      let i = globalPattern.lastIndex;

      while (i < curr.length && depth > 0) {
        if (curr[i] === '(') depth++;
        else if (curr[i] === ')') depth--;
        i++;
      }

      if (depth === 0) {
        const fullCall = curr.substring(startIndex, i);
        const innerArgs = curr.substring(globalPattern.lastIndex, i - 1);
        result += replacer(funcName.toLowerCase(), innerArgs, fullCall);
        lastIndex = i;
      } else {
        result += match[0];
        lastIndex = globalPattern.lastIndex;
      }
    }
    result += curr.substring(lastIndex);
    curr = result;
  }
  return curr;
}

/**
 * Completely purges and converts all modern color functions (oklch, oklab, color-mix, lab, lch)
 * and unsupported gradient interpolation syntax from CSS text.
 */
export function sanitizeAllCssText(rawCss: string): string {
  if (!rawCss) return '';

  // 1. Strip Tailwind v4 @property and @supports blocks with modern colors
  let cleaned = rawCss.replace(/@property\s+[^\{]+\{[^\}]+\}/gi, '');
  cleaned = cleaned.replace(/@supports\s*\([^\)]*(?:okl[a-z]|color-mix)[^\)]*\)\s*\{[^\}]*\}/gi, '');

  // 2. Strip "in oklab", "in oklch", "in lab" interpolation from gradients
  cleaned = cleaned.replace(/\bin\s+(?:oklab|oklch|lab)\b/gi, '');

  // 3. Replace all balanced color functions: oklch, oklab, color-mix, lab, lch
  cleaned = replaceBalancedFunctions(cleaned, ['oklch', 'oklab', 'color-mix', 'lab', 'lch'], (name, args, full) => {
    if (name === 'oklch') {
      return parseOklch(full) || 'rgb(30, 41, 59)';
    }
    if (name === 'oklab') {
      return parseOklab(full) || 'rgb(30, 41, 59)';
    }
    if (name === 'color-mix') {
      const parts = args.split(',');
      if (parts.length >= 3) {
        const c1Part = parts[1].trim();
        const c2Part = parts.slice(2).join(',').trim();
        if (c2Part.includes('transparent')) {
          const matchPercent = c1Part.match(/([\d.]+)%/);
          const alpha = matchPercent ? parseFloat(matchPercent[1]) / 100 : 0.5;
          const cleanColor = c1Part.replace(/[\d.]+%/g, '').trim();
          return cleanColor.startsWith('rgb(')
            ? cleanColor.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
            : cleanColor;
        }
        return c1Part.replace(/[\d.]+%/g, '').trim();
      }
      return 'rgb(30, 41, 59)';
    }
    return 'rgb(30, 41, 59)';
  });

  return cleaned;
}

const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'fill',
  'stroke',
];

/**
 * Sanitizes all oklab/oklch color references in cloned document stylesheets
 * and DOM node computed styles before html2canvas rendering.
 */
function sanitizeClonedDocument(
  clonedDoc: Document,
  origElement: HTMLElement,
  clonedElement: HTMLElement
) {
  // 1. Extract all stylesheets from the live main document (covers dev Vite and prod bundles)
  let combinedCss = '';
  try {
    const sheets = Array.from(document.styleSheets);
    for (const sheet of sheets) {
      try {
        if (sheet.cssRules) {
          for (let r = 0; r < sheet.cssRules.length; r++) {
            combinedCss += sheet.cssRules[r].cssText + '\n';
          }
        }
      } catch {
        // Cross-origin stylesheet access restriction - continue safely
      }
    }
  } catch {
    // Continue safely
  }

  // Also include any <style> tags from the cloned document
  const existingStyles = Array.from(clonedDoc.querySelectorAll('style'));
  existingStyles.forEach((s) => {
    combinedCss += (s.textContent || '') + '\n';
    s.remove();
  });

  // Remove all <link rel="stylesheet"> from clonedDoc so html2canvas doesn't fetch un-sanitized CSS
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => link.remove());

  // Sanitize the combined CSS text completely
  const sanitizedCss = sanitizeAllCssText(combinedCss);
  const cleanStyle = clonedDoc.createElement('style');
  cleanStyle.id = 'sanitized-export-styles';
  cleanStyle.textContent = sanitizedCss;
  clonedDoc.head?.appendChild(cleanStyle);

  // 2. Isolate the target invoice element as the sole top-level element in clonedDoc.body
  // This removes any outer shell elements (Sidebar, Navbar, modal backdrops, flex/grid wrappers)
  // preventing content from being compressed to the right side!
  clonedDoc.body.innerHTML = '';
  clonedDoc.body.appendChild(clonedElement);

  // 3. Set root document and body dimensions to clean standard 800px width
  const printWidth = 800;

  if (clonedDoc.documentElement) {
    clonedDoc.documentElement.style.width = `${printWidth}px`;
    clonedDoc.documentElement.style.maxWidth = `${printWidth}px`;
    clonedDoc.documentElement.style.minWidth = `${printWidth}px`;
    clonedDoc.documentElement.style.margin = '0 auto';
    clonedDoc.documentElement.style.backgroundColor = '#ffffff';
    clonedDoc.documentElement.style.color = '#0f172a';
  }

  if (clonedDoc.body) {
    clonedDoc.body.style.width = `${printWidth}px`;
    clonedDoc.body.style.maxWidth = `${printWidth}px`;
    clonedDoc.body.style.minWidth = `${printWidth}px`;
    clonedDoc.body.style.margin = '0 auto';
    clonedDoc.body.style.padding = '0';
    clonedDoc.body.style.backgroundColor = '#ffffff';
    clonedDoc.body.style.color = '#0f172a';
  }

  // 4. Configure clonedElement to use full 800px width with balanced margins
  clonedElement.style.width = `${printWidth}px`;
  clonedElement.style.maxWidth = `${printWidth}px`;
  clonedElement.style.minWidth = `${printWidth}px`;
  clonedElement.style.boxSizing = 'border-box';
  clonedElement.style.margin = '0 auto';
  clonedElement.style.padding = '36px 40px';
  clonedElement.style.backgroundColor = '#ffffff';
  clonedElement.style.boxShadow = 'none';
  clonedElement.style.border = 'none';
  clonedElement.style.borderRadius = '0';
  clonedElement.style.overflow = 'visible';
  clonedElement.style.maxHeight = 'none';
  clonedElement.style.height = 'auto';

  // Ensure all tables and internal containers inside the invoice use full 100% width
  const tables = clonedElement.querySelectorAll('table');
  tables.forEach((t) => {
    t.style.width = '100%';
    t.style.maxWidth = '100%';
  });

  const scrollContainers = clonedElement.querySelectorAll('.overflow-x-auto, [class*="overflow-"]');
  scrollContainers.forEach((c) => {
    const el = c as HTMLElement;
    el.style.overflow = 'visible';
    el.style.maxHeight = 'none';
  });

  // 4. Sanitize computed colors on every node inside clonedElement
  const origNodes = [origElement, ...Array.from(origElement.querySelectorAll('*'))] as HTMLElement[];
  const clonedNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];
  const count = Math.min(origNodes.length, clonedNodes.length);

  for (let i = 0; i < count; i++) {
    const orig = origNodes[i];
    const cloned = clonedNodes[i];
    if (!orig || !cloned || !cloned.style) continue;

    // Sanitize inline style attribute
    const inlineStyle = cloned.getAttribute('style');
    if (inlineStyle && /(oklab|oklch|color\(|lab|lch|color-mix)/i.test(inlineStyle)) {
      cloned.setAttribute('style', sanitizeAllCssText(inlineStyle));
    }

    // Inspect computed color properties from the live window
    try {
      const comp = window.getComputedStyle(orig);
      for (const prop of COLOR_PROPERTIES) {
        const val = comp.getPropertyValue(prop);
        if (val && /(oklab|oklch|color\(|lab|lch|color-mix)/i.test(val)) {
          const safeVal = convertColorToStandardRgb(val);
          cloned.style.setProperty(prop, safeVal, 'important');
        }
      }

      // Box shadow
      const boxShadow = comp.getPropertyValue('box-shadow');
      if (boxShadow && /(oklab|oklch|color-mix)/i.test(boxShadow)) {
        cloned.style.setProperty('box-shadow', sanitizeAllCssText(boxShadow), 'important');
      }

      // Background image gradients
      const bgImg = comp.getPropertyValue('background-image');
      if (bgImg && /(oklab|oklch|color-mix|\bin\s+)/i.test(bgImg)) {
        cloned.style.setProperty('background-image', sanitizeAllCssText(bgImg), 'important');
      }
    } catch {
      // Continue safely
    }
  }
}

/**
 * Downloads a DOM element as a high-resolution, uncropped PNG image.
 * Fully immune to unsupported CSS oklab / oklch color parsing errors.
 */
export async function downloadInvoiceImage(
  elementId: string,
  filename: string = 'invoice'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Pre-load all images (logo, signature, QR, etc.)
  await waitForElementImages(element);

  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');

  try {
    // Render to canvas with high resolution scale and full bounds
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: 800,
      windowHeight: element.scrollHeight || 1200,
      onclone: (clonedDoc) => {
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          sanitizeClonedDocument(clonedDoc, element, clonedElement);
        }
      },
    });

    const imgData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${safeFilename}.png`;
    link.href = imgData;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.warn('html2canvas rendering error, using robust offscreen clone capture:', error);
    await fallbackRenderImage(element, safeFilename);
  }
}

/**
 * High-reliability offscreen fallback renderer
 */
async function fallbackRenderImage(element: HTMLElement, filename: string): Promise<void> {
  const width = Math.max(element.scrollWidth, 1024);
  const height = element.scrollHeight || 1200;

  // Use html2canvas with foreignObject disabled and minimal settings
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    foreignObjectRendering: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: width,
    windowHeight: height,
    onclone: (clonedDoc) => {
      // Force all elements inside the clone to have inline standard sRGB styles
      const target = clonedDoc.getElementById(element.id) || clonedDoc.body;
      const allCloned = [target, ...Array.from(target.querySelectorAll('*'))] as HTMLElement[];
      const allOrig = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
      const count = Math.min(allCloned.length, allOrig.length);

      for (let i = 0; i < count; i++) {
        const orig = allOrig[i];
        const cl = allCloned[i];
        if (!orig || !cl || !cl.style) continue;
        try {
          const comp = window.getComputedStyle(orig);
          cl.style.color = convertColorToStandardRgb(comp.color || '#0f172a');
          cl.style.backgroundColor = comp.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : convertColorToStandardRgb(comp.backgroundColor);
          cl.style.borderColor = convertColorToStandardRgb(comp.borderColor || '#e2e8f0');
          cl.style.boxShadow = 'none';
        } catch {
          // Continue safely
        }
      }
    },
  });

  const imgData = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = imgData;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a DOM element as an A4 PDF document.
 * Fully immune to unsupported CSS oklab / oklch color parsing errors.
 */
export async function downloadInvoicePdf(
  elementId: string,
  filename: string = 'invoice'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Pre-load all images (logo, signature, QR, etc.)
  await waitForElementImages(element);

  const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    windowWidth: 800,
    windowHeight: element.scrollHeight || 1200,
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.getElementById(elementId);
      if (clonedElement) {
        sanitizeClonedDocument(clonedDoc, element, clonedElement);
      }
    },
  });

  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF('p', 'mm', 'a4');
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  pdf.save(`${safeFilename}.pdf`);
}
