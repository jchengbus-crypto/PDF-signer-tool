import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { Overlay, PageDimension } from '@/types/overlays';

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return [0, 0, 0];
  }

  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return [r, g, b];
};

export async function exportPdfWithOverlays(
  sourcePdfBytes: ArrayBuffer,
  overlays: Overlay[],
  pageDimensions: PageDimension[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(sourcePdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const overlay of overlays) {
    const page = pages[overlay.pageIndex];
    const dims = pageDimensions[overlay.pageIndex];
    if (!page || !dims) continue;

    const pageHeight = dims.heightPdf;
    const yBottom = pageHeight - overlay.yPdf - overlay.heightPdf;

    switch (overlay.type) {
      case 'text': {
        const [r, g, b] = hexToRgb(overlay.color);
        page.drawText(overlay.text || '', {
          x: overlay.xPdf,
          y: yBottom,
          size: overlay.fontSize,
          color: rgb(r, g, b),
          font
        });
        break;
      }
      case 'checkbox': {
        page.drawRectangle({
          x: overlay.xPdf,
          y: yBottom,
          width: overlay.widthPdf,
          height: overlay.heightPdf,
          borderColor: rgb(0.1, 0.1, 0.1),
          borderWidth: overlay.lineWidth
        });

        if (overlay.checked) {
          page.drawLine({
            start: { x: overlay.xPdf + 3, y: yBottom + overlay.heightPdf / 2 },
            end: { x: overlay.xPdf + overlay.widthPdf / 2, y: yBottom + 3 },
            thickness: overlay.lineWidth,
            color: rgb(0, 0, 0)
          });
          page.drawLine({
            start: { x: overlay.xPdf + overlay.widthPdf / 2, y: yBottom + 3 },
            end: { x: overlay.xPdf + overlay.widthPdf - 3, y: yBottom + overlay.heightPdf - 3 },
            thickness: overlay.lineWidth,
            color: rgb(0, 0, 0)
          });
        }
        break;
      }
      case 'signature': {
        const png = await pdfDoc.embedPng(overlay.imageDataUrl);
        page.drawImage(png, {
          x: overlay.xPdf,
          y: yBottom,
          width: overlay.widthPdf,
          height: overlay.heightPdf
        });
        break;
      }
      default:
        break;
    }
  }

  return pdfDoc.save();
}
