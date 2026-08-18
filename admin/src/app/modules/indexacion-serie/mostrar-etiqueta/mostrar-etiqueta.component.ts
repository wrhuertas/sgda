import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { URL_SERVICIOS } from 'src/app/config/config';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-mostrar-etiqueta',
  templateUrl: './mostrar-etiqueta.component.html',
  styleUrls: ['./mostrar-etiqueta.component.scss']
})
export class MostrarEtiquetaComponent implements AfterViewInit {

  // 'barras' | 'qr'
  @Input() tipo: string = 'barras';
  // Texto/código a codificar
  @Input() codigo: string = '';
  // Título legible de la etiqueta
  @Input() titulo: string = '';

  // Datos de la etiqueta (por ahora con valores de ejemplo; luego se enlazan a datos reales)
  @Input() fondoDocumental: string = 'FONDO DOCUMENTAL';
  @Input() seccion: string = 'DIRECCION FINANCIERA';
  @Input() subseccion: string = 'CONTABILIDAD GENERAL';
  @Input() subseccion2: string = '---';
  @Input() numeroDe: string = '4';
  @Input() cajaNumero: string = '';
  @Input() logoUrl: string | null = null;
  @Input() filasTabla: any[] = [
    { serie: 'COMPROBANTES UNICOS DE REGISTRO (CUR)', subserie: 'EXPEDIENTES DE GASTO / EGRESO', fojas: '514', cantidad: '1', bibliorato: '264', apertura: '16/03/2020', cierre: '06/12/2021' }
  ];

  // Nivel seleccionado y ubicación física (solo hasta ese nivel)
  @Input() nivel: string = '';
  @Input() completo: boolean = false;
  @Input() ubicacion: any = {};

  // ---------- Formulario de observación ----------
  @Input() nombreUbicacion: string = '';

  /** Ruta entera, de la sección documental al punto que se está observando */
  @Input() rutaCompleta: string = '';

  private _idUbicacion: number | null = null;

  /**
   * Id del punto de la ubicación donde se guarda (estantería, fila, caja o
   * carpeta).
   *
   * Va como setter y no como propiedad suelta porque quien abre el modal
   * asigna estos valores DESPUÉS de open(), y para entonces ngOnInit ya pasó:
   * si la carga se hiciera ahí, siempre encontraría el id vacío. Ojo que el
   * nivel tiene que asignarse antes que el id.
   */
  @Input()
  set idUbicacion(valor: number | null) {
    this._idUbicacion = valor;
    this.cargarObservacion();
  }

  get idUbicacion(): number | null {
    return this._idUbicacion;
  }

  informacion: string = '';
  conforme: boolean = false;
  guardando: boolean = false;

  @ViewChild('barcode') barcodeEl?: ElementRef<SVGElement>;

  constructor(
    public activeModal: NgbActiveModal,
    private http: HttpClient,
    private toast: ToastrService
  ) {}


  // True si el número de caja es solo dígitos (para mostrarlo grande)
  get cajaEsNumero(): boolean {
    return /^\s*\d+\s*$/.test(this.cajaNumero || '');
  }

  // Información de la etiqueta para el QR, DINÁMICA según el nivel seleccionado
  get qrData(): string {
    const lineas: string[] = [];
    lineas.push('FONDO DOCUMENTAL: ' + this.fondoDocumental);
    lineas.push('SECCION: ' + this.seccion);
    lineas.push('SUBSECCION: ' + this.subseccion);
    if (this.subseccion2 && this.subseccion2 !== '---') {
      lineas.push('SUBSECCION 2: ' + this.subseccion2);
    }
    lineas.push('NUMERO DE: ' + this.numeroDe);

    // Ubicación física: solo hasta el nivel seleccionado (los inferiores vienen vacíos)
    const u = this.ubicacion || {};
    if (u.edificio) { lineas.push('EDIFICIO: ' + u.edificio); }
    if (u.sala) { lineas.push('SALA: ' + u.sala); }
    if (u.estanteria) { lineas.push('ESTANTERIA: ' + u.estanteria); }
    if (u.fila) { lineas.push('FILA: ' + u.fila); }
    if (u.caja) { lineas.push('CAJA: ' + u.caja); }
    if (u.carpeta) { lineas.push('CARPETA: ' + u.carpeta); }

    // Solo cuando es completo (desde caja) se agrega el detalle documental
    if (this.completo) {
      if (this.cajaNumero) { lineas.push('CAJA N: ' + this.cajaNumero); }
      (this.filasTabla || []).forEach((f: any, i: number) => {
        lineas.push(`--- REGISTRO ${i + 1} ---`);
        lineas.push('SERIE: ' + (f?.serie ?? ''));
        lineas.push('SUBSERIE: ' + (f?.subserie ?? ''));
        lineas.push('FOJAS: ' + (f?.fojas ?? ''));
        lineas.push('CANTIDAD EXPEDIENTE: ' + (f?.cantidad ?? ''));
        lineas.push('BIBLIORATO: ' + (f?.bibliorato ?? ''));
        lineas.push('APERTURA: ' + (f?.apertura ?? ''));
        lineas.push('CIERRE: ' + (f?.cierre ?? ''));
      });
    }

    if (this.codigo) { lineas.push('CODIGO: ' + this.codigo); }
    return lineas.join('\n');
  }

  ngAfterViewInit(): void {
    if (this.tipo === 'barras') {
      this.renderBarcode();
    }
  }

  private renderBarcode(): void {
    try {
      if (this.barcodeEl?.nativeElement && this.codigo) {
        JsBarcode(this.barcodeEl.nativeElement, this.codigo, {
          format: 'CODE128',
          displayValue: true,
          fontSize: 14,
          height: 60,
          margin: 10
        });
      }
    } catch (e) {
      console.error('Error generando código de barras:', e);
    }
  }

  imprimir(): void {
    window.print();
  }

  /** Trae lo que ya estaba guardado, para no pisarlo sin querer */
  private cargarObservacion(): void {
    if (!this.nivel || !this.idUbicacion) { return; }

    this.http.get(this.urlObservacion(), { headers: this.cabeceras() }).subscribe({
      next: (resp: any) => {
        this.informacion = resp?.observacion || '';
        this.conforme = !!resp?.conformidad;
      },
      error: (err: any) => {
        // Que no haya nada guardado todavía no es un problema que mostrar
        console.error('No se pudo cargar la observación', err);
      }
    });
  }

  actualizar(): void {
    if (!this.nivel || !this.idUbicacion) {
      this.toast.error('No se identificó la ubicación');
      return;
    }

    this.guardando = true;

    this.http.post(this.urlObservacion(), {
      observacion: this.informacion,
      conformidad: this.conforme
    }, { headers: this.cabeceras() }).subscribe({
      next: () => {
        this.guardando = false;
        this.toast.success('Observación guardada');
        this.activeModal.close(true);
      },
      error: (err: any) => {
        this.guardando = false;
        this.toast.error(err?.error?.error || 'No se pudo guardar la observación');
      }
    });
  }

  private urlObservacion(): string {
    return `${URL_SERVICIOS}/ubicacion/observacion/${this.nivel}/${this.idUbicacion}`;
  }

  private cabeceras(): HttpHeaders {
    return new HttpHeaders({
      Authorization: 'Bearer ' + (localStorage.getItem('token') || '')
    });
  }
}
