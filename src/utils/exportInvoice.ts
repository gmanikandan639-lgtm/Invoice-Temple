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
 * Converts modern CSS colors (oklab, oklch, etc.) to standard sRGB hex or rgb() strings
 * using the browser's native Canvas 2D color parser.
 */
function convertToRgb(colorStr: string): string {
  if (!colorStr) return '#000000';
  try {
    if (!colorConverterCanvas) {
      colorConverterCanvas = document.createElement('canvas');
      colorConverterCanvas.width = 1;
      colorConverterCanvas.height = 1;
      colorConverterCtx = colorConverterCanvas.getContext('2d');
    }
    if (!colorConverterCtx) return '#000000';
    colorConverterCtx.fillStyle = '#000000';
    colorConverterCtx.fillStyle = colorStr;
    const computed = colorConverterCtx.fillStyle;
    return computed || '#000000';
  } catch {
    return '#000000';
  }
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
function sanitizeOklabColors(
  clonedDoc: Document,
  origElement: HTMLElement,
  clonedElement: HTMLElement
) {
  const COLOR_REGEX = /(?:oklab|oklch|lab|lch|color-mix|color)\([^;}]+\)/gi;

  // 1. Sanitize all stylesheet definitions in the cloned document
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((style) => {
    if (style.textContent && /(oklab|oklch|color\(|lab|lch|color-mix)/i.test(style.textContent)) {
      style.textContent = style.textContent.replace(COLOR_REGEX, (match) =>
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
        inlineStyle.replace(COLOR_REGEX, (match) => convertToRgb(match))
      );
    }

    const comp = window.getComputedStyle(orig);
    for (const prop of COLOR_PROPERTIES) {
      const val = comp.getPropertyValue(prop);
      if (val && /(oklab|oklch|color\(|lab|lch|color-mix)/i.test(val)) {
        const safeVal = val.replace(COLOR_REGEX, (match) => convertToRgb(match));
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
