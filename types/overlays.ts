export type ToolMode = 'select' | 'text' | 'checkbox' | 'signature';

export interface OverlayBase {
  id: string;
  pageIndex: number;
  xPdf: number;
  yPdf: number;
  widthPdf: number;
  heightPdf: number;
}

export interface TextOverlay extends OverlayBase {
  type: 'text';
  text: string;
  fontSize: number;
  color: string;
}

export interface CheckboxOverlay extends OverlayBase {
  type: 'checkbox';
  checked: boolean;
  lineWidth: number;
}

export interface SignatureOverlay extends OverlayBase {
  type: 'signature';
  name: string;
  imageDataUrl: string;
}

export type Overlay = TextOverlay | CheckboxOverlay | SignatureOverlay;

export interface PageDimension {
  widthPdf: number;
  heightPdf: number;
  rotation: number;
}
