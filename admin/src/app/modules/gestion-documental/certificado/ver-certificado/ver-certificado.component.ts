import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CertificadoService } from '../service/certificado.service';
import { URL_SERVICIOS } from 'src/app/config/config';

import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";

(pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;

@Component({
  selector: 'app-ver-certificado',
  templateUrl: './ver-certificado.component.html',
  styleUrls: ['./ver-certificado.component.scss']
})
export class VerCertificadoComponent implements OnInit {
  @Input() id_certificacion: any;
  @Input() id_empresa: any;
  @Input() data: any;

  pdfUrl: SafeResourceUrl | null = null;
  certData: any = null;
  logoEmpresaBase64: string | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private certificadoService: CertificadoService
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const id_usuario = user.id || null;
    if (this.id_certificacion) {
      this.cargarDesdeBackend(this.id_certificacion, this.id_empresa, id_usuario);
    } else {
      setTimeout(() => this.generarPDF(), 0);
    }
  }

  cargarDesdeBackend(idCert: any, idEmpresa: any, idUsuario: any) {
    this.certificadoService.getDatosDocumento(idCert, idEmpresa, idUsuario).subscribe({
      next: (resp: any) => {
        if (resp.status === 200) {
          this.certData = resp.certificacion || resp.data;
          if (this.certData) this.data = this.certData;
          if (this.certData && this.certData.imagen_empresa) {
            this.obtenerLogoBase64(this.certData.imagen_empresa);
          } else {
            setTimeout(() => this.generarPDF(), 0);
          }
        } else {
          setTimeout(() => this.generarPDF(), 0);
        }
      },
      error: () => setTimeout(() => this.generarPDF(), 0)
    });
  }

  obtenerLogoBase64(urlRelativa: string) {
    const imageUrl = `${URL_SERVICIOS}/storage/${urlRelativa}`;
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      this.logoEmpresaBase64 = canvas.toDataURL('image/png');
      this.generarPDF();
    };
    img.onerror = () => {
      this.logoEmpresaBase64 = null;
      setTimeout(() => this.generarPDF(), 0);
    };
  }

  generarPDF() {
    if (!this.data) this.data = {};

    const tablaDocumentosRows: any[] = [
      [
        { text: '#', style: 'tableHeader', alignment: 'center' },
        { text: 'ID Sistema / Doc.', style: 'tableHeader' },
        { text: 'Nombre del Archivo Digital / Ruta', style: 'tableHeader' },
        { text: 'Ext.', style: 'tableHeader', alignment: 'center' }
      ]
    ];

    const docs = this.data.documentos_detalles || [];
    if (docs.length > 0) {
      docs.forEach((doc: any, index: number) => {
        tablaDocumentosRows.push([
          { text: (index + 1).toString(), alignment: 'center', fontSize: 9, margin: [0, 4, 0, 4] },
          { text: doc.numero_documento || `ID-${doc.id_documento}`, fontSize: 9, margin: [0, 4, 0, 4], bold: true },
          { text: [ { text: `${doc.nombre_archivo}\n`, fontSize: 9, bold: true, color: '#2d3748' }, { text: doc.ruta_completa || 'Sin ruta registrada', fontSize: 7.5, color: '#718096', italics: true } ], margin: [0, 4, 0, 4] },
          { text: (doc.tipo_archivo || 'pdf').toUpperCase(), fontSize: 8.5, alignment: 'center', margin: [0, 4, 0, 4], color: '#4a5568' }
        ]);
      });
    } else {
      tablaDocumentosRows.push([
        { text: 'No se encontraron registros de documentos detallados para esta certificación.', colSpan: 4, alignment: 'center', italics: true, fontSize: 9, color: '#e53e3e' },
        {}, {}, {}
      ]);
    }

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [45, 40, 45, 60],
      content: [
        {
          columns: [
            this.logoEmpresaBase64 ? { image: this.logoEmpresaBase64, width: 90, alignment: 'left' } : { text: '⚠️ LOGO NO ENCONTRADO', color: 'red', bold: true, fontSize: 9, alignment: 'left' },
            {
              text: [
                { text: `${this.data.nombre_empresa || 'GOBIERNO AUTÓNOMO DESCENTRALIZADO'}\n`, bold: true, fontSize: 11, color: '#1a365d' },
                { text: `RUC: ${this.data.ruc_empresa || 'N/A'}\n`, fontSize: 9, color: '#4a5568' },
                { text: `Dirección: ${this.data.direccion_empresa || 'N/A'}\n`, fontSize: 8, color: '#718096' },
                { text: `Teléfono: ${this.data.telefono_empresa || 'N/A'}\n`, fontSize: 8, color: '#718096' }
              ],
              alignment: 'right',
              margin: [0, 5, 0, 0]
            }
          ]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 505, y2: 10, lineWidth: 1.5, lineColor: '#1a365d' }] },
        { text: '\n' },

        { text: 'ACTA DE CERTIFICACIÓN DOCUMENTAL', style: 'tituloPrincipal' },
        { text: `No. ${this.data.numero_acta || 'REG-S/N'}`, style: 'subTituloActa' },
        // Bloque informativo de fechas y trámite
      
        this.data.numero_tramite ? { text: `Trámite Asociado: ${this.data.numero_tramite}`, style: 'subTituloTramite' } : null,
        { text: '\n' },

        {
          text: [
            { text: 'Por medio de la presente, se deja constancia del proceso de certificación de la documentación física detallada. Intervienen en el presente acto el/la servidor/a ', fontSize: 10 },
            { text: `${this.data.gestor?.nombre_completo || 'N/A'}`, bold: true, fontSize: 10, color: '#1a365d' },
            { text: ' en calidad de Custodio/Gestor de Archivo, y el/la Sr./Sra. ', fontSize: 10 },
            { text: `${this.data.solicitante?.nombre_completo || 'N/A'}`, bold: true, fontSize: 10, color: '#1a365d' },
            { text: ` con documento de identidad No. `, fontSize: 10 },
            { text: `${this.data.solicitante?.n_documento || 'N/A'}`, bold: true, fontSize: 10 },
            { text: `, quien declara recibir la certificación de los expedientes detallados, conforme a normativa institucional.`, fontSize: 10 }
          ],
          alignment: 'justify',
          lineHeight: 1.4,
          margin: [0, 5, 0, 15]
        },

          {
          columns: [
            { width: '*', text: `FECHA DE EMISIÓN: ${this.data.fecha_solicitud || ''}`, fontSize: 9, color: '#2d3748' },
            { width: '*', text: this.data.fecha_entrega_finalizada ? `FECHA ENTREGA FINALIZADA: ${this.data.fecha_entrega_finalizada}` : '', fontSize: 9, color: '#2d3748', alignment: 'right' }
          ]
        },
       { text: '\n\n\n\n' },
        { text: 'DETALLE DE LOS DOCUMENTOS:', style: 'seccionLabel' },
        {
          table: { headerRows: 1, widths: [25, 95, '*', 35], body: tablaDocumentosRows },
          layout: {
            fillColor: (rowIndex: number) => rowIndex === 0 ? '#1a365d' : (rowIndex % 2 === 0 ? '#f7fafc' : null),
            hLineColor: () => '#e2e8f0',
            vLineColor: () => '#e2e8f0'
          }
        },

        { text: '\n\n\n\n' },
        {
          columns: [
            { width: '*', stack: [ { text: '_____________________________________\n', alignment: 'center', color: '#cbd5e0' }, { text: `${this.data.gestor?.nombre_completo || 'N/A'}`, bold: true, fontSize: 9, alignment: 'center' }, { text: 'ENTREGUÉ CONFORME', fontSize: 8, bold: true, color: '#718096', alignment: 'center', margin: [0, 2, 0, 0] }, { text: 'Custodio de Archivo / Gestor', fontSize: 8, color: '#a0aec0', alignment: 'center' } ] },
            { width: 40, text: '' },
            { width: '*', stack: [ { text: '_____________________________________\n', alignment: 'center', color: '#cbd5e0' }, { text: `${this.data.solicitante?.nombre_completo || 'N/A'}`, bold: true, fontSize: 9, alignment: 'center' }, { text: 'RECIBÍ CONFORME', fontSize: 8, bold: true, color: '#718096', alignment: 'center', margin: [0, 2, 0, 0] }, { text: `C.I: ${this.data.solicitante?.n_documento || 'N/A'}`, fontSize: 8, color: '#a0aec0', alignment: 'center' } ] }
          ]
        }
      ],
      styles: {
        tituloPrincipal: { fontSize: 13, bold: true, alignment: 'center', color: '#2d3748', letterSpacing: 0.5 },
        subTituloActa: { fontSize: 11, bold: true, alignment: 'center', color: '#e53e3e', margin: [0, 2, 0, 10] },
        seccionLabel: { fontSize: 9.5, bold: true, color: '#2d3748', margin: [0, 0, 0, 6], letterSpacing: 0.3 },
        subTituloTramite: { fontSize: 10, bold: true, alignment: 'center', color: '#1a365d', margin: [0, 1, 0, 8] }
      }
    };

    try {
      const pMake: any = pdfMake;
      pMake.createPdf(docDefinition).getBuffer((buffer: any) => {
        const blob = new Blob([buffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setTimeout(() => {
          this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          this.cdr.detectChanges();
        }, 0);
      });
    } catch (err) {
      console.error('Error al generar PDF de certificación:', err);
    }
  }
}
