import { Injectable } from '@angular/core';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { VerDocumentoComponent } from './ver-documento.component';

/**
 * Servicio global para abrir el visor de documentos (VerDocumentoComponent)
 * como modal, sin repetir la lógica en cada componente.
 *
 * Para usarlo en otro módulo:
 *   1) importa VerDocumentoModule en ese módulo
 *   2) inyecta DocumentoViewerService y llama abrirVer(...)
 *
 * Uso:
 *   constructor(private docViewer: DocumentoViewerService) {}
 *   this.docViewer.abrirVer({ idDocumento, idEmpresa, idSerieSubserie });
 */
@Injectable({ providedIn: 'root' })
export class DocumentoViewerService {

  constructor(private modalService: NgbModal) {}

  abrirVer(
    params: { idDocumento?: any; idEmpresa?: any; idSerieSubserie?: any; rutaDocumento?: any; urlPdf?: any; pdfBase64?: any; idAnexo?: any; nombreArchivo?: any; zoomInicial?: number; permitirImprimir?: boolean; soloLectura?: boolean },
    options?: NgbModalOptions
  ): NgbModalRef {
    const modalRef = this.modalService.open(VerDocumentoComponent, {
      size: 'xl',
      centered: true,
      ...(options || {})
    });

    if (params.idDocumento !== undefined && params.idDocumento !== null) {
      modalRef.componentInstance.idDocumento = params.idDocumento;
    }
    if (params.idEmpresa !== undefined) {
      modalRef.componentInstance.idEmpresa = params.idEmpresa ?? null;
    }
    if (params.idSerieSubserie !== undefined) {
      modalRef.componentInstance.idSerieSubserie = params.idSerieSubserie ?? null;
    }
    // Modo alternativo: abrir directamente por ruta (ej. documento firmado)
    if (params.rutaDocumento !== undefined && params.rutaDocumento !== null) {
      modalRef.componentInstance.rutaDocumento = params.rutaDocumento;
    }
    // Modo URL: ver un PDF por URL con pdf.js
    if (params.urlPdf !== undefined && params.urlPdf !== null) {
      modalRef.componentInstance.urlPdf = params.urlPdf;
    }
    // Modo base64: ver un PDF traído por API (ej. anexos, sin CORS)
    if (params.pdfBase64 !== undefined && params.pdfBase64 !== null) {
      modalRef.componentInstance.pdfBase64 = params.pdfBase64;
    }
    // Modo anexo: imágenes (TIF, JPG, PNG...) convertidas por el backend con Imagick
    if (params.idAnexo !== undefined && params.idAnexo !== null) {
      modalRef.componentInstance.idAnexo = params.idAnexo;
    }
    if (params.nombreArchivo !== undefined && params.nombreArchivo !== null) {
      modalRef.componentInstance.nombreArchivo = params.nombreArchivo;
    }
    // Zoom con el que abre el visor (por defecto 100%)
    if (params.zoomInicial !== undefined && params.zoomInicial !== null) {
      modalRef.componentInstance.zoomInicial = params.zoomInicial;
    }
    // Permite ocultar el botón Imprimir (ej. el visor de auditoría)
    if (params.permitirImprimir !== undefined && params.permitirImprimir !== null) {
      modalRef.componentInstance.permitirImprimir = params.permitirImprimir;
    }
    // Modo consulta: sin limpiar, separadores, insertar hojas ni guardar versión
    if (params.soloLectura !== undefined && params.soloLectura !== null) {
      modalRef.componentInstance.soloLectura = params.soloLectura;
    }

    return modalRef;
  }
}
