import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../auth';
import { IndexacionSerieService } from '../service/indexacion-serie.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ingresar-informacion',
  templateUrl: './ingresar-informacion.component.html',
  styleUrls: ['./ingresar-informacion.component.scss']
})
export class IngresarInformacionComponent {

  
    @Input() idDocumento!: number;
    @Input() idEmpresa!: number;
    @Input() idSerieSubserie!: number;
    @Input() camposExtraTitulos: string[] = []; // opcional
    @Input() rutaDocumento!: string;
  nombre: string = '';
   user: any;
   isLoading: boolean = false;
 

activeTab = 1; // Tab por defecto


   


// Propiedades nuevas que resuelven el error:
  public nombreDocumento: string = '';
  public fechaDocumento: string = ''; // O Date, dependiendo de cómo manejes las fechas




  // FECHAS EXTREMAS
    fechaApertura: string = '';
    fechaCierre: string = '';
    
    // NÚMEROS DE FOLIOS/PÁGINAS
    nroFolios: number | null = null;
    folioSecuencialInicio: number | null = null;
    folioSecuencialFin: number | null = null;
    nroPaginasDigitales: number | null = null;
    
    // DESTINO FINAL
    destinoFinal: string = '';
    
    // UBICACIÓN TOPOGRÁFICA
    nroCaja: number | null = null;
    nroCarpetaFisica: number | null = null;
    nroTomo: number | null = null;
    nroEstanteria: string | null = null;
    nroBandeja: string | null = null;

    // VARIABLES ADICIONALES (De la imagen 2)
    tipoSoporte: string = 'PAPEL';
    tipoAcceso: string = 'PUBLICA';
    estadoConservacion: string = 'BUENO';
    observaciones: string = '';





    // Plazos de Conservación (Retención)
    plazoGestion: number | null = null;
    plazoCentral: number | null = null;
    plazoIntermedio: string = '';
    plazoHistorico: string = '';


    // Base Legal
    baseLegal: string = '';

    // Disposición y Técnica
    disposicionFinal: string = 'CONSERVACION'; // O 'ELIMINACION'
    tecnicaSeleccion: string = 'COMPLETA'; // O 'PARCIAL', 'N/A'


    observacionesRespuesta: string = '';
    revisadoDigitadoPor: string = '';

    public documentos: any[] = []
    // QR helpers
    showQr: boolean = false;
    qrGeneratedUrl: string = '';
    // Barcode helpers
    showBarcode: boolean = false;
    barcodeUrl: string = '';
   constructor(
     private authService: AuthService,
     private indexacionService: IndexacionSerieService,
     public toast: ToastrService,
     public modal: NgbActiveModal
   ) {}
 
   ngOnInit(): void {
     this.user = this.authService.user;
     this.listarDatosDocumento();
   }


   listarDatosDocumento() {
    if (!this.idDocumento) return;

    const payload = { id_documento: this.idDocumento };

    Swal.fire({
        title: 'Cargando datos...',
        didOpen: () => { Swal.showLoading(); }
    });

    this.indexacionService.listarDatosDocumento(payload).subscribe({
        next: (resp: any) => {
            if (resp.res && resp.documentos && resp.documentos.length > 0) {
                const doc = resp.documentos[0];

                // --- GRUPO 1: FECHAS ---
                // Formateamos a YYYY-MM-DD para que el <input type="date"> los entienda
                this.fechaApertura = doc.fecha_apertura ? doc.fecha_apertura.substring(0, 10) : '';
                this.fechaCierre = doc.fecha_cierre ? doc.fecha_cierre.substring(0, 10) : '';

                // --- GRUPO 2: FOJAS Y DESTINO ---
                this.nroFolios = doc.nro_folios;
                this.nroPaginasDigitales = doc.nro_paginas_digitales;
                this.destinoFinal = doc.destino_final || '';

                // --- GRUPO 3: SECUENCIALES ---
                this.folioSecuencialInicio = doc.folio_secuencial_inicio;
                this.folioSecuencialFin = doc.folio_secuencial_fin;

                // --- GRUPO 4: UBICACIÓN TOPOGRÁFICA ---
                this.nroCaja = doc.nro_caja;
                this.nroCarpetaFisica = doc.nro_carpeta_fisica;
                this.nroTomo = doc.nro_tomo;
                this.nroEstanteria = doc.nro_estanteria;
                this.nroBandeja = doc.nro_bandeja;

                // --- GRUPO 5: CLASIFICACIÓN Y CONTROL ---
                this.tipoSoporte = doc.tipo_soporte || 'PAPEL';
                this.tipoAcceso = doc.tipo_acceso || 'PÚBLICA';
                this.estadoConservacion = doc.estado_conservacion || 'BUENO';
                this.revisadoDigitadoPor = doc.revisado_digitado_por || '';
                
                // OJO: En tu HTML usas "observacionesRespuesta" para el textarea
                this.observacionesRespuesta = doc.observaciones || ''; 
            }
            Swal.close();
        },
        error: (err) => {
            Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
        }
    });
}

   limpiarFormulario() {
    this.fechaApertura = '';
      this.fechaCierre = '';
      this.nroFolios = null;
      this.nroPaginasDigitales = null;
      this.destinoFinal = '';

      this.folioSecuencialInicio = null;
      this.folioSecuencialFin = null;

      this.nroCaja = null;
      this.nroCarpetaFisica = null;
      this.nroTomo = null;
      this.nroEstanteria = '';
      this.nroBandeja = '';

      this.tipoSoporte = '';
      this.revisadoDigitadoPor = '';
      this.tipoAcceso = '';
      this.estadoConservacion = '';
      this.observacionesRespuesta = '';
    }

 
  guardar() {

  if (!this.user?.id_empresa) {
    this.toast.error('No se encontró la empresa del usuario');
    return;
  }

  if (!this.idDocumento) {
    this.toast.error('No se encontró el documento');
    return;
  }

  const payload = {

    // ─────────────────────────
    // RELACIÓN PRINCIPAL
    // ─────────────────────────
    id_documento: this.idDocumento,
    id_empresa: this.idEmpresa || this.user.id_empresa,
    usuario_id: this.user.id,

    // ─────────────────────────
    // DATOS DE CONTROL (TAB 1)
    // ─────────────────────────
    fecha_apertura: this.fechaApertura,
    fecha_cierre: this.fechaCierre,
    nro_folios: this.nroFolios,
    nro_paginas_digitales: this.nroPaginasDigitales,
    destino_final: this.destinoFinal,
    folio_secuencial_inicio: this.folioSecuencialInicio,
    folio_secuencial_fin: this.folioSecuencialFin,

    // ─────────────────────────
    // UBICACIÓN (TAB 2)
    // ─────────────────────────
    nro_caja: this.nroCaja,
    nro_carpeta_fisica: this.nroCarpetaFisica,
    nro_tomo: this.nroTomo,
    nro_estanteria: this.nroEstanteria,
    nro_bandeja: this.nroBandeja,

    // ─────────────────────────
    // CLASIFICACIÓN (TAB 3)
    // ─────────────────────────
    tipo_soporte: this.tipoSoporte,
    revisado_digitado_por: this.revisadoDigitadoPor,
    tipo_acceso: this.tipoAcceso,
    estado_conservacion: this.estadoConservacion,
    observaciones: this.observacionesRespuesta,
  };

  console.log('📦 Payload enviado:', payload);

  this.isLoading = true;

  this.indexacionService.guardarDatosDocumentales(payload).subscribe({
    next: (resp: any) => {
      console.log('✅ Guardado:', resp);

      Swal.fire({
        icon: 'success',
        title: 'Correcto',
        text: 'Información guardada correctamente'
      });

      this.limpiarFormulario();
      this.modal.close(true);
      this.isLoading = false;
    },
    error: (err: any) => {
      console.error('❌ Error:', err);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar la información'
      });

      this.isLoading = false;
    }
  });

}

  // ====== QR: Generación e impresión ======
  private buildQrPayload(): any {
    return {
      id_documento: this.idDocumento,
      id_empresa: this.idEmpresa,
      fecha_apertura: this.fechaApertura || null,
      fecha_cierre: this.fechaCierre || null,
      nro_folios: this.nroFolios,
      nro_paginas_digitales: this.nroPaginasDigitales,
      destino_final: this.destinoFinal || null,
      ubicacion: {
        caja: this.nroCaja,
        carpeta_fisica: this.nroCarpetaFisica,
        tomo: this.nroTomo,
        estanteria: this.nroEstanteria,
        bandeja: this.nroBandeja,
      },
      clasificacion: {
        soporte: this.tipoSoporte,
        acceso: this.tipoAcceso,
        conservacion: this.estadoConservacion,
      }
    };
  }

  private buildQrUrl(): string {
    const data = JSON.stringify(this.buildQrPayload());
    const enc = encodeURIComponent(data);
    // Servicio público de QR: api.qrserver.com
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${enc}`;
  }

  generarQR(): void {
    this.qrGeneratedUrl = this.buildQrUrl();
    this.showQr = true;
  }

  imprimirQR(): void {
    if (!this.qrGeneratedUrl) {
      this.generarQR();
    }
    const w = window.open('', '_blank', 'width=400,height=500');
    if (!w) return;
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>QR Documento ${this.idDocumento}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align:center; margin: 20px; }
            .title{ font-weight:600; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="title">QR del Documento #${this.idDocumento}</div>
          <img src="${this.qrGeneratedUrl}" alt="QR" />
          <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(), 300); };</script>
        </body>
      </html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  // ====== Código de Barras: Generación e impresión ======
  private buildBarcodeUrl(): string {
    // Usamos el servicio público TEC-IT para Code128
    // Solo codificamos identificadores esenciales para mantener el tamaño
    const data = `DOC:${this.idDocumento}|EMP:${this.idEmpresa}`;
    const enc = encodeURIComponent(data);
    return `https://barcode.tec-it.com/barcode.ashx?data=${enc}&code=Code128&dpi=96`;
  }

  generarCodigoBarras(): void {
    this.barcodeUrl = this.buildBarcodeUrl();
    this.showBarcode = true;
  }

  imprimirCodigoBarras(): void {
    if (!this.barcodeUrl) {
      this.generarCodigoBarras();
    }
    const w = window.open('', '_blank', 'width=400,height=300');
    if (!w) return;
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Barras Documento ${this.idDocumento}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align:center; margin: 20px; }
            .title{ font-weight:600; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="title">Código de Barras - Documento #${this.idDocumento}</div>
          <img src="${this.barcodeUrl}" alt="BARCODE" />
          <script>window.onload = function(){ window.print(); setTimeout(()=>window.close(), 300); };</script>
        </body>
      </html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }


   close() {
    this.modal.close();
  }
   cerrar() {
     this.modal.close();
   }
}
