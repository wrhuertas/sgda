import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import * as htmlToPdfmake from "html-to-pdfmake";

import { URL_SERVICIOS } from 'src/app/config/config';
import { PrestamoService } from '../service/prestamo.service';

(pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;

@Component({
  selector: 'app-ver-prestamo',
  templateUrl: './ver-prestamo.component.html',
  styleUrls: ['./ver-prestamo.component.scss']
})
export class VerPrestamoComponent implements OnInit { // Se añade implements OnInit de forma estricta

  @Input() id_prestamo: any; 
  @Input() id_empresa: any; 
  @Input() data: any;
    
  pdfUrl: SafeResourceUrl | null = null;
  prestamoData: any = null; // Cambiado de empresaData a prestamoData para mantener consistencia
  logoEmpresaBase64: string | null = null;
  
  constructor(
    public activeModal: NgbActiveModal, 
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    public prestamoService: PrestamoService
  ) {}
  
  ngOnInit() {
    console.log('=== VerPrestamoComponent - Inicializado ===');
    console.log('id_prestamo recibido en Visor:', this.id_prestamo);
    console.log('id_empresa recibido en Visor:', this.id_empresa);

    // 🟢 Extraemos el id del usuario logueado en tiempo real
    const userLogeado = JSON.parse(localStorage.getItem('user') || '{}');
    const id_usuario = userLogeado.id || null;
    console.log('id_usuario detectado en Visor:', id_usuario);

    // Si recibimos el id_prestamo, cargamos todo enviando también la empresa y el usuario
    if (this.id_prestamo) {
      console.log(`[Flujo] Buscando en backend -> Préstamo: ${this.id_prestamo}, Empresa: ${this.id_empresa}, Usuario: ${id_usuario}`);
      this.cargarDatosDesdeBackend(this.id_prestamo, this.id_empresa, id_usuario); 
    } else {
      console.warn('[Flujo] No se detectó id_prestamo. Usando data local enviada por el formulario.');
      setTimeout(() => this.generarPDF(), 0);
    }
  }
  
  // 🟢 Añadimos idUsuario como tercer parámetro
  cargarDatosDesdeBackend(idPrestamo: any, idEmpresa: any, idUsuario: any) {
    console.log(`Consultando getDatosDocumento -> Préstamo: ${idPrestamo}, Empresa: ${idEmpresa}, Usuario: ${idUsuario}`);
    
    // Pasamos los tres IDs al servicio
    this.prestamoService.getDatosDocumento(idPrestamo, idEmpresa, idUsuario).subscribe({
      next: (resp: any) => {
        if (resp.status === 200) {
          this.prestamoData = resp.prestamo || resp.tramite; 
          console.log('Datos del préstamo recuperados del backend:', this.prestamoData);
          
          if (this.prestamoData) {
            this.data = this.prestamoData; 
          }

          if (this.prestamoData && this.prestamoData.imagen_empresa) {
            this.obtenerLogoBase64(this.prestamoData.imagen_empresa);
          } else {
            console.warn('No se encontró "imagen_empresa" en la respuesta del servidor.');
            setTimeout(() => this.generarPDF(), 0);
          }
        } else {
          console.error('El backend no devolvió un estado 200:', resp.message);
          setTimeout(() => this.generarPDF(), 0);
        }
      },
      error: (err) => {
        console.error('Error cargando datos desde el servidor:', err);
        setTimeout(() => this.generarPDF(), 0);
      }
    });
  }
  
  obtenerLogoBase64(urlRelativa: string) {
    const imageUrl = `${URL_SERVICIOS}/storage/${urlRelativa}`;
    console.log('--- Intento de carga de Logo ---');
    console.log('Ruta buscada:', imageUrl);
  
    const img = new Image();
    img.crossOrigin = 'Anonymous'; 
    img.src = imageUrl;
  
    img.onload = () => {
      console.log('✅ Logo cargado exitosamente.');
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      this.logoEmpresaBase64 = canvas.toDataURL('image/png');
      this.generarPDF();
    };
  
    img.onerror = () => {
      console.error("❌ ERROR 404: No se encontró el logo en la ruta:", imageUrl);
      this.logoEmpresaBase64 = null; 
      
      setTimeout(() => {
        this.generarPDF();
      }, 0);
    };
  }
  
generarPDF() {
    console.log('--- Ejecutando generarPDF ---');
    console.log('Datos finales utilizados para armar el PDF (this.data):', this.data);
    
    if (!this.data) {
      console.warn('⚠️ No hay datos (this.data) disponibles para renderizar el PDF.');
      this.data = {};
    }
  
    // ==========================================
    // 🛠️ CORRECCIÓN: MAPEO CON DATOS REALES DEL BACKEND
    // ==========================================
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
        // Usamos las propiedades reales: id_documento, nombre_archivo y tipo_archivo
        tablaDocumentosRows.push([
          { text: (index + 1).toString(), alignment: 'center', fontSize: 9, margin: [0, 4, 0, 4] },
          { text: doc.numero_documento || `ID-${doc.id_documento}`, fontSize: 9, margin: [0, 4, 0, 4], bold: true },
          { 
            text: [
              { text: `${doc.nombre_archivo}\n`, fontSize: 9, bold: true, color: '#2d3748' },
              { text: doc.ruta_completa || 'Sin ruta registrada', fontSize: 7.5, color: '#718096', italics: true }
            ], 
            margin: [0, 4, 0, 4] 
          },
          { text: (doc.tipo_archivo || 'pdf').toUpperCase(), fontSize: 8.5, alignment: 'center', margin: [0, 4, 0, 4], color: '#4a5568' }
        ]);
      });
    } else {
      tablaDocumentosRows.push([
        { text: 'No se encontraron registros de documentos detallados para este préstamo.', colSpan: 4, alignment: 'center', italics: true, fontSize: 9, color: '#e53e3e' },
        {}, {}, {}
      ]);
    }

    // ==========================================
    // CONSTRUCCIÓN DE LA DEFINICIÓN DEL PDF
    // ==========================================
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [45, 40, 45, 60],
      content: [
        // Encabezado institucional
        {
          columns: [
            this.logoEmpresaBase64 ? 
              { image: this.logoEmpresaBase64, width: 90, alignment: 'left' } : 
              { text: '⚠️ LOGO NO ENCONTRADO', color: 'red', bold: true, fontSize: 9, alignment: 'left' },
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

        // Título del Acta
        { text: 'MEMORANDUM DE PRÉSTAMO DOCUMENTAL', style: 'tituloPrincipal' },
        { text: `No. ${this.data.numero_acta || 'REG-S/N'}`, style: 'subTituloActa' },
        // 📑 Si tiene número de trámite, lo pintamos aquí abajo con un estilo sutil
        this.data.numero_tramite ? {
          text: `Trámite Asociado: ${this.data.numero_tramite}`,
          style: 'subTituloTramite'
        } : null,
        
        { text: '\n' },
        

        // Leyenda o cláusula formal
        {
          text: [
            { text: 'Por medio de la presente, se deja constancia legal de la ejecución del préstamo y entrega-recepción de la documentación física detallada en las instalaciones del archivo central. Intervienen en el presente acto, por una parte el/la servidor/a ', fontSize: 10 },
            { text: `${this.data.gestor?.nombre_completo || 'N/A'}`, bold: true, fontSize: 10, color: '#1a365d' },
            { text: ' en calidad de Custodio/Gestor de Archivo, quien realiza la entrega de la información, y por otra parte el/la Sr./Sra. ', fontSize: 10 },
            { text: `${this.data.solicitante?.nombre_completo || 'N/A'}`, bold: true, fontSize: 10, color: '#1a365d' },
            { text: ` con documento de identidad No. `, fontSize: 10 },
            { text: `${this.data.solicitante?.n_documento || 'N/A'}`, bold: true, fontSize: 10 },
            { text: `, quien en calidad de `, fontSize: 10 },
            { text: `${this.data.tipo_prestamo || 'SOLICITANTE'}`, bold: true, fontSize: 10 },
            { text: ` declara recibir a entera satisfacción los expedientes que se detallan a continuación, asumiendo la total custodia, reserva y responsabilidad de su integridad bajo las normativas institucionales vigentes.`, fontSize: 10 }
          ],
          alignment: 'justify',
          lineHeight: 1.4,
          margin: [0, 5, 0, 15]
        },


        // 📅 NUEVO: Bloque condicional para la Fecha Límite de Retorno
        this.data.fecha_fin_prestamo ? {
          text: [
            { text: 'FECHA MÁXIMA DE DEVOLUCIÓN DEL PRÉSTAMO DOCUMENTOS: ', bold: true, fontSize: 9.5, color: '#2d3748' },
            { text: `${this.data.fecha_fin_prestamo}`, bold: true, fontSize: 10, color: '#1a365d' }
          ],
          margin: [0, 0, 0, 15]
        } : {
          text: '⚠️ ADVERTENCIA: NO SE HA DEFINIDO UNA FECHA LÍMITE DE RETORNO PARA ESTE PRÉSTAMO.',
          bold: true,
          fontSize: 9.5,
          color: '#e53e3e', // 🔴 Color rojo de alerta
          margin: [0, 0, 0, 15]
        },

        // Tabla con datos reales ya mapeados
        { text: 'DETALLE DE LOS DOCUMENTOS ENTREGADOS:', style: 'seccionLabel' },
        {
          table: {
            headerRows: 1,
            widths: [25, 95, '*', 35], 
            body: tablaDocumentosRows
          },
          layout: {
            fillColor: function (rowIndex: number) {
              if (rowIndex === 0) return '#1a365d';
              return (rowIndex % 2 === 0) ? '#f7fafc' : null;
            },
            hLineColor: function () { return '#e2e8f0'; },
            vLineColor: function () { return '#e2e8f0'; }
          }
        },
        { text: '\n\n\n\n' },

        // ==========================================
        // ✍️ SECCIÓN DE FIRMAS DE RESPONSABILIDAD
        // ==========================================
        {
          columns: [
            // Entregado por (Gestor)
            {
              width: '*',
              stack: [
                { text: '_____________________________________\n', alignment: 'center', color: '#cbd5e0' },
                { text: `${this.data.gestor?.nombre_completo || 'N/A'}`, bold: true, fontSize: 9, alignment: 'center' },
                { text: 'ENTREGUÉ CONFORME', fontSize: 8, bold: true, color: '#718096', alignment: 'center', margin: [0, 2, 0, 0] },
                { text: 'Custodio de Archivo / Gestor', fontSize: 8, color: '#a0aec0', alignment: 'center' }
              ]
            },
            // Espaciador central
            { width: 40, text: '' },
            // Recibido por (Solicitante)
            {
              width: '*',
              stack: [
                { text: '_____________________________________\n', alignment: 'center', color: '#cbd5e0' },
                { text: `${this.data.solicitante?.nombre_completo || 'N/A'}`, bold: true, fontSize: 9, alignment: 'center' },
                { text: 'RECIBÍ CONFORME', fontSize: 8, bold: true, color: '#718096', alignment: 'center', margin: [0, 2, 0, 0] },
                { text: `C.I: ${this.data.solicitante?.n_documento || 'N/A'}`, fontSize: 8, color: '#a0aec0', alignment: 'center' }
              ]
            }
          ]
        }
      ],

      styles: {
        tituloPrincipal: { fontSize: 13, bold: true, alignment: 'center', color: '#2d3748', letterSpacing: 0.5 },
        subTituloActa: { fontSize: 11, bold: true, alignment: 'center', color: '#e53e3e', margin: [0, 2, 0, 10] },
        seccionLabel: { fontSize: 9.5, bold: true, color: '#2d3748', margin: [0, 0, 0, 6], letterSpacing: 0.3 },
        tableHeader: { fontSize: 9, bold: true, color: '#ffffff', alignment: 'left', margin: [0, 2, 0, 2] },
        // 🔵 NUEVO: Estilo para el trámite en azul institucional
        subTituloTramite: { 
          fontSize: 10, 
          bold: true, 
          alignment: 'center', 
          color: '#1a365d', 
          margin: [0, 1, 0, 8] // Un margen inferior de 8 para darle aire antes de la leyenda
        }
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
          console.log('✅ PDF actualizado con campos reales y bloque de firmas.');
        }, 0);
      });
    } catch (err) {
      console.error("❌ Error al procesar PDF con pdfMake:", err);
    }
  }
  
  formatLista(usuarios: any[]) {
    if (!usuarios || usuarios.length === 0) return 'No asignado';
    return usuarios.map(u => u.nombre_completo || u.nombre).join(', ');
  }

}