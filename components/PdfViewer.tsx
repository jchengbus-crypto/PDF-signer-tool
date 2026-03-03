'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import OverlayLayer from '@/components/OverlayLayer';
import type { Overlay, PageDimension, ToolMode } from '@/types/overlays';

GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs`;

export interface PageRenderInfo {
  renderedWidth: number;
  renderedHeight: number;
}

interface PdfViewerProps {
  pdfData: ArrayBuffer;
  overlays: Overlay[];
  toolMode: ToolMode;
  selectedId: string | null;
  pageDimensions: PageDimension[];
  zoom: number;
  currentPage: number;
  onZoomChange: (zoom: number) => void;
  onCurrentPageChange: (page: number) => void;
  onDocumentLoaded: (dimensions: PageDimension[]) => void;
  onPageClickPlace: (pageIndex: number, xScreen: number, yScreen: number, info: PageRenderInfo) => void;
  onSelect: (id: string | null) => void;
  onOverlayChange: (overlay: Overlay) => void;
  onOverlayDelete: (id: string) => void;
  onCheckboxToggle: (id: string) => void;
}

export default function PdfViewer(props: PdfViewerProps) {
  const {
    pdfData,
    overlays,
    toolMode,
    selectedId,
    pageDimensions,
    zoom,
    currentPage,
    onZoomChange,
    onCurrentPageChange,
    onDocumentLoaded,
    onPageClickPlace,
    onSelect,
    onOverlayChange,
    onOverlayDelete,
    onCheckboxToggle
  } = props;

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [pageRenders, setPageRenders] = useState<Record<number, PageRenderInfo>>({});
  const canvasRefs = useRef<Record<number, HTMLCanvasElement | null>>({});
  const thumbRefs = useRef<Record<number, HTMLCanvasElement | null>>({});

  useEffect(() => {
    const load = async () => {
      const loaded = await getDocument({ data: pdfData }).promise;
      setPdfDoc(loaded);
      setPageCount(loaded.numPages);

      const dimensions: PageDimension[] = [];
      for (let i = 1; i <= loaded.numPages; i += 1) {
        const page = await loaded.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        dimensions.push({
          widthPdf: viewport.width,
          heightPdf: viewport.height,
          rotation: viewport.rotation
        });
      }
      onDocumentLoaded(dimensions);
    };

    load();
  }, [pdfData, onDocumentLoaded]);

  useEffect(() => {
    if (!pdfDoc) return;

    const render = async () => {
      for (let i = 1; i <= pageCount; i += 1) {
        const page = await pdfDoc.getPage(i);
        const mainViewport = page.getViewport({ scale: zoom });
        const canvas = canvasRefs.current[i - 1];
        if (canvas) {
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = mainViewport.width;
            canvas.height = mainViewport.height;
            canvas.style.width = `${mainViewport.width}px`;
            canvas.style.height = `${mainViewport.height}px`;
            await page.render({ canvasContext: context, viewport: mainViewport }).promise;
            setPageRenders((prev) => ({
              ...prev,
              [i - 1]: { renderedWidth: mainViewport.width, renderedHeight: mainViewport.height }
            }));
          }
        }

        const thumbCanvas = thumbRefs.current[i - 1];
        if (thumbCanvas) {
          const thumbVp = page.getViewport({ scale: 0.2 });
          const thumbCtx = thumbCanvas.getContext('2d');
          if (thumbCtx) {
            thumbCanvas.width = thumbVp.width;
            thumbCanvas.height = thumbVp.height;
            await page.render({ canvasContext: thumbCtx, viewport: thumbVp }).promise;
          }
        }
      }
    };

    render();
  }, [pdfDoc, pageCount, zoom]);

  const zoomLabel = useMemo(() => `${Math.round(zoom * 100)}%`, [zoom]);

  return (
    <div className="flex flex-1 gap-4 overflow-hidden">
      <aside className="w-40 overflow-y-auto rounded bg-white p-2 shadow">
        <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">Pages</h3>
        <div className="space-y-2">
          {Array.from({ length: pageCount }).map((_, index) => (
            <button
              type="button"
              key={index}
              className={`w-full rounded border p-1 ${currentPage === index ? 'border-sky-600' : 'border-slate-200'}`}
              onClick={() => onCurrentPageChange(index)}
            >
              <canvas ref={(node) => (thumbRefs.current[index] = node)} className="mx-auto" />
              <p className="text-xs">Page {index + 1}</p>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 overflow-auto rounded bg-slate-200 p-3">
        <div className="sticky top-0 z-10 mb-3 flex items-center gap-2 rounded bg-white px-3 py-2 shadow">
          <button
            className="rounded border px-2 py-1 text-sm"
            onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))}
          >
            -
          </button>
          <span className="w-16 text-center text-sm">{zoomLabel}</span>
          <button
            className="rounded border px-2 py-1 text-sm"
            onClick={() => onZoomChange(Math.min(2.5, zoom + 0.1))}
          >
            +
          </button>
        </div>

        <div className="space-y-4">
          {Array.from({ length: pageCount }).map((_, pageIndex) => (
            <div
              key={pageIndex}
              className="relative mx-auto w-fit bg-white shadow"
              onMouseDown={(event) => {
                if (toolMode === 'select') return;
                const info = pageRenders[pageIndex];
                if (!info) return;
                const rect = event.currentTarget.getBoundingClientRect();
                onPageClickPlace(pageIndex, event.clientX - rect.left, event.clientY - rect.top, info);
              }}
            >
              <canvas ref={(node) => (canvasRefs.current[pageIndex] = node)} />
              {pageDimensions[pageIndex] && pageRenders[pageIndex] && (
                <OverlayLayer
                  pageIndex={pageIndex}
                  overlays={overlays}
                  selectedId={selectedId}
                  toolMode={toolMode}
                  pageDimensions={pageDimensions[pageIndex]}
                  renderedWidth={pageRenders[pageIndex].renderedWidth}
                  renderedHeight={pageRenders[pageIndex].renderedHeight}
                  onSelect={onSelect}
                  onOverlayChange={onOverlayChange}
                  onOverlayDelete={onOverlayDelete}
                  onCheckboxToggle={onCheckboxToggle}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
