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

let colorConverterCanvas: HTMLCanvasElement | null = null;
let colorConverterCtx: CanvasRenderingContext2D | null = null;

/**
 * Mathematical fallback conversion of OKLCH to sRGB hex string.
 * Used when browser Canvas2D context does not natively resolve oklch/oklab.
 */
function oklchToRgb(lchStr: string): string | null {
  try {
    // Parse oklch(L C H [/ A]) where L can be percentage or decimal, C is number, H is angle/number
    const match = lchStr.match(/oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/i);
    if (!match) return null;

    let L = match[1].endsWith('%') ? parseFloat(match[1]) / 100 : parseFloat(match[1]);
    const C = parseFloat(match[2]);
    const H = parseFloat(match[3]);

    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;

    const lLinear = l_ * l_ * l_;
    const mLinear = m_ * m_ * m_;
    const sLinear = s_ * s_ * s_;

    let rLinear = +4.0767416621 * lLinear - 3.3077115913 * mLinear + 0.2309699292 * sLinear;
    let gLinear = -1.2684380046 * lLinear + 2.6097574011 * mLinear - 0.3413193965 * sLinear;
    let bLinear = -0.0041960863 * lLinear - 0.7034186147 * mLinear + 1.707614701 * sLinear;

    // Linear to sRGB gamma transfer
    const toSrgb = (c: number) => {
      const clamped = Math.max(0, Math.min(1, c));
      return clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1.0 / 2.4) - 0.055;
    };

    const r = Math.round(toSrgb(rLinear) * 255);
    const g = Math.round(toSrgb(gLinear) * 255);
    const bByte = Math.round(toSrgb(bLinear) * 255);

    return `rgb(${r}, ${g}, ${bByte})`;
  } catch {
    return null;
  }
}

/**
 * Converts modern CSS colors (oklab, oklch, etc.) to standard sRGB hex or rgb() strings
 * using the browser's native Canvas 2D color parser with fallback mathematical conversion.
 */
function convertToRgb(colorStr: string): string {
  if (!colorStr) return '#000000';
  const trimmed = colorStr.trim();
  try {
    if (!colorConverterCanvas) {
      colorConverterCanvas = document.createElement('canvas');
      colorConverterCanvas.width = 1;
      colorConverterCanvas.height = 1;
      colorConverterCtx = colorConverterCanvas.getContext('2d');
    }
    if (colorConverterCtx) {
      // Set to sentinel value first
      colorConverterCtx.fillStyle = 'rgba(1, 2, 3, 0.5)';
      colorConverterCtx.fillStyle = trimmed;
      const computed = colorConverterCtx.fillStyle;
      if (computed && computed !== 'rgba(1, 2, 3, 0.5)') {
        return computed;
      }
    }
  } catch {
    // Canvas parser failed or unsupported
  }

  // Fallback to algorithmic OKLCH parser
  if (/^oklch/i.test(trimmed)) {
    const fallback = oklchToRgb(trimmed);
    if (fallback) return fallback;
  }

  // Safe standard neutral fallback
  return '#334155';
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

// Matches modern unsupported color functions with balanced nested parentheses
const BALANCED_COLOR_REGEX = /\b(?:oklab|oklch|lab|lch|color-mix|color)\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/gi;

/**
 * Sanitizes all oklab/oklch color references in cloned document stylesheets
 * and DOM node computed styles before html2canvas rendering.
 */
function sanitizeOklabColors(
  clonedDoc: Document,
  origElement: HTMLElement,
  clonedElement: HTMLElement
) {
  // 1. Sanitize all stylesheet definitions in the cloned document
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((style) => {
    if (style.textContent && /(oklab|oklch|color\(|lab|lch|color-mix)/i.test(style.textContent)) {
      style.textContent = style.textContent.replace(BALANCED_COLOR_REGEX, (match) =>
        convertToRgb(match)
      );
    }
  });

  // 2. Sanitize element and all descendants
  const origNodes = [origElement, ...Array.from(origElement.querySelectorAll('*'))] as HTMLElement[];
  const clonedNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];

  const count = Math.min(origNodes.length, clonedNodes.length);
  for (let i = 0; i < count; i++) {
    const orig = origNodes[i];
    const cloned = clonedNodes[i];
    if (!orig || !cloned || !cloned.style) continue;

    // Sanitize any existing inline style attribute
    const inlineStyle = cloned.getAttribute('style');
    if (inlineStyle && /(oklab|oklch|color\(|lab|lch|color-mix)/i.test(inlineStyle)) {
      cloned.setAttribute(
        'style',
        inlineStyle.replace(BALANCED_COLOR_REGEX, (match) => convertToRgb(match))
      );
    }

    const comp = window.getComputedStyle(orig);
    for (const prop of COLOR_PROPERTIES) {
      const val = comp.getPropertyValue(prop);
      if (val && /(oklab|oklch|color\(|lab|lch|color-mix)/i.test(val)) {
        const safeVal = val.replace(BALANCED_COLOR_REGEX, (match) => convertToRgb(match));
        cloned.style.setProperty(prop, safeVal, 'important');
      }
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
        // Fix layout and unclip overflow
        clonedElement.style.overflow = 'visible';
        clonedElement.style.maxHeight = 'none';
        clonedElement.style.height = 'auto';
        clonedElement.style.width = '100%';

        // Ensure no child table or scroll container clips content
        const scrollContainers = clonedElement.querySelectorAll(
          '.overflow-x-auto, [class*="overflow-"]'
        );
        scrollContainers.forEach((c) => {
          (c as HTMLElement).style.overflow = 'visible';
          (c as HTMLElement).style.maxHeight = 'none';
        });

        // Strip and convert all oklab/oklch color references
        sanitizeOklabColors(clonedDoc, element, clonedElement);
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
        clonedElement.style.overflow = 'visible';
        clonedElement.style.maxHeight = 'none';
        clonedElement.style.height = 'auto';
        clonedElement.style.width = '100%';

        const scrollContainers = clonedElement.querySelectorAll(
          '.overflow-x-auto, [class*="overflow-"]'
        );
        scrollContainers.forEach((c) => {
          (c as HTMLElement).style.overflow = 'visible';
          (c as HTMLElement).style.maxHeight = 'none';
        });

        // Strip and convert all oklab/oklch color references
        sanitizeOklabColors(clonedDoc, element, clonedElement);
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
