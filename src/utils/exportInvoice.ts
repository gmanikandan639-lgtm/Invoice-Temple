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
 * Downloads a DOM element as a high-resolution, uncropped PNG image.
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
        clonedElement.style.overflow = 'visible';
        clonedElement.style.maxHeight = 'none';
        clonedElement.style.height = 'auto';
        clonedElement.style.width = '100%';
        // Ensure no child table or scroll container clips content
        const scrollContainers = clonedElement.querySelectorAll('.overflow-x-auto, [class*="overflow-"]');
        scrollContainers.forEach((c) => {
          (c as HTMLElement).style.overflow = 'visible';
          (c as HTMLElement).style.maxHeight = 'none';
        });
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
        const scrollContainers = clonedElement.querySelectorAll('.overflow-x-auto, [class*="overflow-"]');
        scrollContainers.forEach((c) => {
          (c as HTMLElement).style.overflow = 'visible';
          (c as HTMLElement).style.maxHeight = 'none';
        });
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

