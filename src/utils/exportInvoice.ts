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

let colorConverterCanvas: HTMLCanvasElement | null = null;
let colorConverterCtx: CanvasRenderingContext2D | null = null;

/**
 * Converts modern CSS colors (oklab, oklch, lab, lch, color-mix, color) to standard sRGB hex or rgb/rgba strings
 * using native Canvas 2D parser with an algorithmic fallback for all OKLCH and OKLAB expressions.
 */
export function convertColorToStandardRgb(colorStr: string): string {
  if (!colorStr) return '#000000';
  const trimmed = colorStr.trim();

  // 1. Try native canvas parser first
  try {
    if (!colorConverterCanvas) {
      colorConverterCanvas = document.createElement('canvas');
      colorConverterCanvas.width = 1;
      colorConverterCanvas.height = 1;
      colorConverterCtx = colorConverterCanvas.getContext('2d');
    }
    if (colorConverterCtx) {
      colorConverterCtx.fillStyle = 'rgba(1, 2, 3, 0.5)';
      colorConverterCtx.fillStyle = trimmed;
      const computed = colorConverterCtx.fillStyle;
      if (computed && computed !== 'rgba(1, 2, 3, 0.5)' && !/(oklab|oklch)/i.test(computed)) {
        return computed;
      }
    }
  } catch {
    // Ignore canvas parsing errors
  }

  // 2. Algorithmic OKLCH parser: oklch(L C H [/ A])
  const oklchMatch = trimmed.match(
    /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+(?:deg|rad|turn)?|none)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i
  );
  if (oklchMatch) {
    const L = oklchMatch[1].endsWith('%') ? parseFloat(oklchMatch[1]) / 100 : parseFloat(oklchMatch[1]);
    const C = parseFloat(oklchMatch[2]);
    const hStr = oklchMatch[3];
    let H = 0;
    if (hStr && hStr.toLowerCase() !== 'none') {
      H = parseFloat(hStr);
      if (hStr.endsWith('turn')) H = H * 360;
      else if (hStr.endsWith('rad')) H = (H * 180) / Math.PI;
    }
    let alpha = 1;
    if (oklchMatch[4]) {
      alpha = oklchMatch[4].endsWith('%') ? parseFloat(oklchMatch[4]) / 100 : parseFloat(oklchMatch[4]);
    }
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);
    return oklabCoordinatesToRgb(L, a, b, alpha);
  }

  // 3. Algorithmic OKLAB parser: oklab(L a b [/ A])
  const oklabMatch = trimmed.match(
    /^oklab\(\s*([\d.]+%?)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i
  );
  if (oklabMatch) {
    const L = oklabMatch[1].endsWith('%') ? parseFloat(oklabMatch[1]) / 100 : parseFloat(oklabMatch[1]);
    const a = parseFloat(oklabMatch[2]);
    const b = parseFloat(oklabMatch[3]);
    let alpha = 1;
    if (oklabMatch[4]) {
      alpha = oklabMatch[4].endsWith('%') ? parseFloat(oklabMatch[4]) / 100 : parseFloat(oklabMatch[4]);
    }
    return oklabCoordinatesToRgb(L, a, b, alpha);
  }

  return '#334155';
}

const COLOR_FUNCTION_REGEX = /\b(?:oklab|oklch|lab|lch|color-mix|color)\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/gi;

/**
 * Replaces all modern/unsupported color expressions in a CSS text chunk with standard RGB/RGBA.
 */
export function sanitizeAllCssText(css: string): string {
  if (!css || !/(oklab|oklch|color\(|lab|lch|color-mix)/i.test(css)) {
    return css;
  }
  return css.replace(COLOR_FUNCTION_REGEX, (match) => convertColorToStandardRgb(match));
}

const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'box-shadow',
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
  // 1. Remove external <link rel="stylesheet"> tags so html2canvas doesn't load un-sanitized external CSS
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => link.remove());

  // 2. Replace all existing <style> tags with clean, newly created <style> tags with sanitized CSS
  const existingStyles = Array.from(clonedDoc.querySelectorAll('style'));
  existingStyles.forEach((oldStyle) => {
    const raw = oldStyle.textContent || '';
    const sanitized = sanitizeAllCssText(raw);
    const freshStyle = clonedDoc.createElement('style');
    freshStyle.textContent = sanitized;
    oldStyle.parentNode?.replaceChild(freshStyle, oldStyle);
  });

  // 3. Unclip layout and remove scroll bounds on cloned invoice element
  clonedElement.style.overflow = 'visible';
  clonedElement.style.maxHeight = 'none';
  clonedElement.style.height = 'auto';
  clonedElement.style.width = '100%';

  const scrollContainers = clonedElement.querySelectorAll('.overflow-x-auto, [class*="overflow-"]');
  scrollContainers.forEach((c) => {
    const el = c as HTMLElement;
    el.style.overflow = 'visible';
    el.style.maxHeight = 'none';
  });

  // 4. Sanitize element and all descendants
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

    // Inspect computed color properties
    try {
      const comp = window.getComputedStyle(orig);
      for (const prop of COLOR_PROPERTIES) {
        const val = comp.getPropertyValue(prop);
        if (val && /(oklab|oklch|color\(|lab|lch|color-mix)/i.test(val)) {
          const safeVal = sanitizeAllCssText(val);
          cloned.style.setProperty(prop, safeVal, 'important');
        }
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
      windowWidth: Math.max(element.scrollWidth, 1024),
      windowHeight: element.scrollHeight,
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
    console.warn('html2canvas rendering error, using fallback image generator:', error);
    // Robust fallback: direct element cloning and canvas capture
    await fallbackDownloadInvoiceImage(element, safeFilename);
  }
}

/**
 * High-reliability fallback image renderer for environments where html2canvas encounters an unexpected browser hurdle.
 */
async function fallbackDownloadInvoiceImage(element: HTMLElement, filename: string): Promise<void> {
  const width = Math.max(element.scrollWidth, 1024);
  const height = element.scrollHeight || 1200;

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.overflow = 'visible';
  clone.style.backgroundColor = '#ffffff';

  // Sanitize all inline styles in clone
  const allCloned = [clone, ...Array.from(clone.querySelectorAll('*'))] as HTMLElement[];
  allCloned.forEach((node) => {
    const inline = node.getAttribute('style');
    if (inline) {
      node.setAttribute('style', sanitizeAllCssText(inline));
    }
  });

  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject width="100%" height="100%">
      <div xmlns="http://www.w3.org/1999/xhtml">
        ${serialized}
      </div>
    </foreignObject>
  </svg>`;

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image fallback'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
  }

  URL.revokeObjectURL(url);
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
    windowWidth: Math.max(element.scrollWidth, 1024),
    windowHeight: element.scrollHeight,
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
