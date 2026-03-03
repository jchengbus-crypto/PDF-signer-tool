'use client';

import { Trash2 } from 'lucide-react';
import type { Overlay, PageDimension, ToolMode } from '@/types/overlays';

interface OverlayLayerProps {
  pageIndex: number;
  overlays: Overlay[];
  selectedId: string | null;
  toolMode: ToolMode;
  pageDimensions: PageDimension;
  renderedWidth: number;
  renderedHeight: number;
  onSelect: (id: string | null) => void;
  onOverlayChange: (overlay: Overlay) => void;
  onOverlayDelete: (id: string) => void;
  onCheckboxToggle: (id: string) => void;
}

export default function OverlayLayer({
  pageIndex,
  overlays,
  selectedId,
  toolMode,
  pageDimensions,
  renderedWidth,
  renderedHeight,
  onSelect,
  onOverlayChange,
  onOverlayDelete,
  onCheckboxToggle
}: OverlayLayerProps) {
  const xScale = renderedWidth / pageDimensions.widthPdf;
  const yScale = renderedHeight / pageDimensions.heightPdf;

  const handleDrag = (event: React.MouseEvent, overlay: Overlay) => {
    event.stopPropagation();
    if (toolMode !== 'select') return;

    const startX = event.clientX;
    const startY = event.clientY;
    const startOverlayX = overlay.xPdf;
    const startOverlayY = overlay.yPdf;

    const onMove = (moveEvent: MouseEvent) => {
      const deltaXPdf = (moveEvent.clientX - startX) / xScale;
      const deltaYPdf = (moveEvent.clientY - startY) / yScale;

      const next = {
        ...overlay,
        xPdf: Math.max(0, Math.min(startOverlayX + deltaXPdf, pageDimensions.widthPdf - overlay.widthPdf)),
        yPdf: Math.max(0, Math.min(startOverlayY + deltaYPdf, pageDimensions.heightPdf - overlay.heightPdf))
      };

      onOverlayChange(next);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleResizeSignature = (event: React.MouseEvent, overlay: Overlay) => {
    if (overlay.type !== 'signature') return;
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startW = overlay.widthPdf;
    const startH = overlay.heightPdf;

    const onMove = (moveEvent: MouseEvent) => {
      const deltaXPdf = (moveEvent.clientX - startX) / xScale;
      const deltaYPdf = (moveEvent.clientY - startY) / yScale;
      const nextW = Math.max(50, Math.min(startW + deltaXPdf, pageDimensions.widthPdf - overlay.xPdf));
      const nextH = Math.max(20, Math.min(startH + deltaYPdf, pageDimensions.heightPdf - overlay.yPdf));
      onOverlayChange({ ...overlay, widthPdf: nextW, heightPdf: nextH });
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="absolute inset-0" onMouseDown={() => onSelect(null)}>
      {overlays
        .filter((overlay) => overlay.pageIndex === pageIndex)
        .map((overlay) => {
          const left = overlay.xPdf * xScale;
          const top = overlay.yPdf * yScale;
          const width = overlay.widthPdf * xScale;
          const height = overlay.heightPdf * yScale;
          const selected = selectedId === overlay.id;

          return (
            <div
              key={overlay.id}
              className={`absolute cursor-move select-none ${
                selected ? 'ring-2 ring-sky-500' : 'ring-1 ring-slate-300'
              }`}
              style={{ left, top, width, height, background: 'rgba(255,255,255,0.45)' }}
              onMouseDown={(event) => {
                onSelect(overlay.id);
                if (overlay.type === 'checkbox' && toolMode === 'select') {
                  onCheckboxToggle(overlay.id);
                  return;
                }
                handleDrag(event, overlay);
              }}
            >
              {overlay.type === 'text' && (
                <div className="h-full w-full overflow-hidden px-1 py-0.5" style={{ fontSize: overlay.fontSize * xScale }}>
                  {overlay.text || 'Text'}
                </div>
              )}
              {overlay.type === 'checkbox' && (
                <div className="grid h-full w-full place-items-center text-lg">{overlay.checked ? '✓' : ''}</div>
              )}
              {overlay.type === 'signature' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={overlay.imageDataUrl} alt={overlay.name} className="h-full w-full object-contain" />
              )}

              {selected && (
                <>
                  <button
                    className="absolute -right-3 -top-3 rounded-full bg-red-600 p-1 text-white"
                    onMouseDown={(event) => {
                      event.stopPropagation();
                      onOverlayDelete(overlay.id);
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                  {overlay.type === 'signature' && (
                    <button
                      className="absolute -bottom-2 -right-2 h-3 w-3 rounded-sm bg-sky-600"
                      onMouseDown={(event) => handleResizeSignature(event, overlay)}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
    </div>
  );
}
