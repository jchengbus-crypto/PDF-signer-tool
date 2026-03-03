'use client';

import { useMemo, useState } from 'react';
import PdfViewer, { PageRenderInfo } from '@/components/PdfViewer';
import { exportPdfWithOverlays } from '@/lib/pdf/exportPdf';
import { generateSignature } from '@/lib/signature/generateSignature';
import type { CheckboxOverlay, Overlay, PageDimension, SignatureOverlay, TextOverlay, ToolMode } from '@/types/overlays';

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const createId = () => crypto.randomUUID();

export default function HomePage() {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfFileName, setPdfFileName] = useState('signed-document.pdf');
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageDimensions, setPageDimensions] = useState<PageDimension[]>([]);
  const [zoom, setZoom] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [signatureName, setSignatureName] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedOverlay = useMemo(
    () => overlays.find((item) => item.id === selectedId) ?? null,
    [overlays, selectedId]
  );

  const onUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a valid PDF file.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError('File is too large. Limit is 10MB for this MVP.');
      return;
    }

    const bytes = await file.arrayBuffer();
    setPdfData(bytes);
    setPdfFileName(file.name.replace(/\.pdf$/i, '-signed.pdf'));
    setOverlays([]);
    setSelectedId(null);
    setError(null);
  };

  const placeOverlay = (pageIndex: number, xScreen: number, yScreen: number, info: PageRenderInfo) => {
    const dims = pageDimensions[pageIndex];
    if (!dims) return;

    const xScale = dims.widthPdf / info.renderedWidth;
    const yScale = dims.heightPdf / info.renderedHeight;
    const xPdf = xScreen * xScale;
    const yPdf = yScreen * yScale;

    if (toolMode === 'text') {
      const item: TextOverlay = {
        id: createId(),
        type: 'text',
        pageIndex,
        xPdf,
        yPdf,
        widthPdf: 160,
        heightPdf: 26,
        text: 'Type here',
        fontSize: 14,
        color: '#111111'
      };
      setOverlays((prev) => [...prev, item]);
      setSelectedId(item.id);
      setCurrentPage(pageIndex);
    }

    if (toolMode === 'checkbox') {
      const item: CheckboxOverlay = {
        id: createId(),
        type: 'checkbox',
        pageIndex,
        xPdf,
        yPdf,
        widthPdf: 18,
        heightPdf: 18,
        checked: false,
        lineWidth: 1.2
      };
      setOverlays((prev) => [...prev, item]);
      setSelectedId(item.id);
      setCurrentPage(pageIndex);
    }

    if (toolMode === 'signature') {
      if (!signatureName) {
        const name = window.prompt('Type your full name for automatic signature generation:')?.trim();
        if (!name) return;
        setSignatureName(name);
        const imageData = generateSignature(name);
        setSignatureDataUrl(imageData);
      }

      const image = signatureDataUrl ?? generateSignature(signatureName);

      const item: SignatureOverlay = {
        id: createId(),
        type: 'signature',
        pageIndex,
        xPdf,
        yPdf,
        widthPdf: 160,
        heightPdf: 48,
        name: signatureName,
        imageDataUrl: image
      };
      setOverlays((prev) => [...prev, item]);
      setSelectedId(item.id);
      setCurrentPage(pageIndex);
    }
  };

  const downloadPdf = async () => {
    if (!pdfData) return;
    const output = await exportPdfWithOverlays(pdfData, overlays, pageDimensions);
    const blob = new Blob([output.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = pdfFileName;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  return (
    <main className="h-screen p-4">
      <div className="mb-4 rounded bg-white p-3 shadow">
        <h1 className="text-xl font-semibold">PDF Signer MVP</h1>
        <p className="text-sm text-slate-600">Client-side PDF upload, annotate, and secure export.</p>
      </div>

      <div className="grid h-[calc(100vh-7rem)] grid-cols-[220px_1fr_260px] gap-4">
        <aside className="rounded bg-white p-3 shadow">
          <label className="mb-3 block text-sm font-semibold">Upload PDF</label>
          <input type="file" accept="application/pdf" onChange={onUpload} className="mb-4 block w-full text-sm" />

          <div className="space-y-2">
            {(['select', 'text', 'checkbox', 'signature'] as ToolMode[]).map((tool) => (
              <button
                key={tool}
                className={`w-full rounded border px-3 py-2 text-left text-sm ${
                  toolMode === tool ? 'border-sky-600 bg-sky-50' : 'border-slate-300'
                }`}
                onClick={() => setToolMode(tool)}
              >
                {tool[0].toUpperCase() + tool.slice(1)}
              </button>
            ))}
          </div>

          <button
            className="mt-6 w-full rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-300"
            onClick={downloadPdf}
            disabled={!pdfData}
          >
            Download PDF
          </button>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <p className="mt-3 text-xs text-slate-500">Security: file never leaves your browser in this MVP.</p>
        </aside>

        <section className="overflow-hidden rounded bg-white p-2 shadow">
          {pdfData ? (
            <PdfViewer
              pdfData={pdfData}
              overlays={overlays}
              toolMode={toolMode}
              selectedId={selectedId}
              pageDimensions={pageDimensions}
              zoom={zoom}
              currentPage={currentPage}
              onZoomChange={setZoom}
              onCurrentPageChange={setCurrentPage}
              onDocumentLoaded={setPageDimensions}
              onPageClickPlace={placeOverlay}
              onSelect={setSelectedId}
              onOverlayChange={(next) =>
                setOverlays((prev) => prev.map((item) => (item.id === next.id ? next : item)))
              }
              onOverlayDelete={(id) => {
                setOverlays((prev) => prev.filter((item) => item.id !== id));
                setSelectedId(null);
              }}
              onCheckboxToggle={(id) =>
                setOverlays((prev) =>
                  prev.map((item) =>
                    item.id === id && item.type === 'checkbox' ? { ...item, checked: !item.checked } : item
                  )
                )
              }
            />
          ) : (
            <div className="grid h-full place-items-center rounded border-2 border-dashed border-slate-300 text-slate-500">
              Upload a PDF to start editing.
            </div>
          )}
        </section>

        <aside className="rounded bg-white p-3 shadow">
          <h2 className="mb-2 text-sm font-semibold">Selection Inspector</h2>
          {!selectedOverlay && <p className="text-sm text-slate-500">Select an overlay to edit fields.</p>}

          {selectedOverlay?.type === 'text' && (
            <div className="space-y-2">
              <label className="block text-xs uppercase text-slate-500">Text</label>
              <input
                value={selectedOverlay.text}
                onChange={(event) =>
                  setOverlays((prev) =>
                    prev.map((item) =>
                      item.id === selectedOverlay.id && item.type === 'text'
                        ? { ...item, text: event.target.value }
                        : item
                    )
                  )
                }
                className="w-full rounded border p-2 text-sm"
              />
              <label className="block text-xs uppercase text-slate-500">Font size</label>
              <input
                type="number"
                min={8}
                max={48}
                value={selectedOverlay.fontSize}
                onChange={(event) =>
                  setOverlays((prev) =>
                    prev.map((item) =>
                      item.id === selectedOverlay.id && item.type === 'text'
                        ? { ...item, fontSize: Number(event.target.value) }
                        : item
                    )
                  )
                }
                className="w-full rounded border p-2 text-sm"
              />
            </div>
          )}

          {selectedOverlay?.type === 'checkbox' && (
            <div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedOverlay.checked}
                  onChange={() =>
                    setOverlays((prev) =>
                      prev.map((item) =>
                        item.id === selectedOverlay.id && item.type === 'checkbox'
                          ? { ...item, checked: !item.checked }
                          : item
                      )
                    )
                  }
                />
                Checked
              </label>
            </div>
          )}

          {selectedOverlay?.type === 'signature' && (
            <div className="space-y-2 text-sm">
              <p>Signer: {selectedOverlay.name || signatureName}</p>
              <button
                className="rounded border px-2 py-1"
                onClick={() => {
                  const name = window.prompt('Regenerate signature using name:', signatureName)?.trim();
                  if (!name) return;
                  const image = generateSignature(name);
                  setSignatureName(name);
                  setSignatureDataUrl(image);
                  setOverlays((prev) =>
                    prev.map((item) =>
                      item.id === selectedOverlay.id && item.type === 'signature'
                        ? { ...item, name, imageDataUrl: image }
                        : item
                    )
                  );
                }}
              >
                Regenerate
              </button>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
