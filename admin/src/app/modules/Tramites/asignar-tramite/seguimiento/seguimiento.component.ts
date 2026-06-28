import { Component, Input, Output, EventEmitter, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom } from 'rxjs';
import { AuthService } from 'src/app/modules/auth';
import { AsignartramiteService } from '../service/asignartramite.service';
import { URL_BACKEND } from 'src/app/config/config';

@Component({
  selector: 'app-seguimiento',
  templateUrl: './seguimiento.component.html',
  styleUrls: ['./seguimiento.component.scss']
})
export class SeguimientoComponent implements OnInit, OnDestroy {

  // Datos recibidos del padre
  @Input() id_tramite!: number;
  @Input() tramiteDatos!: any;
  @Input() areas!: any[];
  @Input() soloActas: boolean = false;

  // Datos internos
  tramite: any = null;
  documentos: any[] = [];
  selectedDoc: any = null;
  selectedPreviewUrl: SafeResourceUrl | null = null;
  selectedRawUrl: string = '';
  previewNoDisponible: boolean = false;
  private currentObjectUrl: string | null = null;
  // Tabla de seguimiento (rellenar desde API si aplica)
  seguimientos: Array<{ seccion: string; fecha_hora: string; dias: number | string; comentario: string }> = [];

  // Evento para notificar cambios al padre (si necesitas refrescar listado)
  @Output() tramiteC: EventEmitter<any> = new EventEmitter();

  constructor(
    public activeModal: NgbActiveModal,
    public AsignartramiteService: AsignartramiteService,
    public toast: ToastrService,
    private cdr: ChangeDetectorRef,
    public authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    if (this.id_tramite) {
      console.log('ID del trámite recibido:', this.id_tramite);
      this.cargarSeguimiento(this.id_tramite);
    }
  }

  ngOnDestroy(): void {
    this.revokeCurrentObjectUrl();
  }

  // Carga el trámite y sus documentos desde la API
  cargarSeguimiento(id_tramite: number) {
    this.AsignartramiteService.seguimientosTramite(id_tramite).subscribe({
      next: (resp: any) => {
        console.log('Trámite y documentos cargados:', resp);
        this.tramite = resp.tramite;
        const docs = resp.documentos || [];
        this.documentos = this.soloActas ? docs.filter((d: any) => this.esActa(d)) : docs;
        if (this.documentos.length > 0) {
          this.seleccionarDocumento(this.documentos[0]);
        } else {
          this.selectedDoc = null;
          this.selectedPreviewUrl = null;
          this.selectedRawUrl = '';
          this.previewNoDisponible = false;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando trámite:', err);
        this.toast.error('No se pudo cargar el trámite');
      }
    });
  }

  private esActa(doc: any): boolean {
    const nombre = String(doc?.nombre_original || doc?.nombre_archivo || '').toLowerCase();
    return nombre.includes('acta');
  }

  getTituloTramite(): string {
    const numero = this.tramiteDatos?.num_documento_interno || this.tramite?.num_documento_interno || '';
    const base = this.soloActas ? 'Actas del trámite' : 'Seguimiento del trámite';
    return numero ? `${base} ${numero}` : `${base} #${this.id_tramite}`;
  }

  getClienteLabel(): string {
    return (
      this.tramiteDatos?.cliente_razon_social ||
      this.tramiteDatos?.cliente_nombre ||
      this.tramite?.cliente?.razon_social ||
      this.tramite?.cliente?.nombre ||
      '-'
    );
  }

  getAsuntoLabel(): string {
    return this.tramiteDatos?.asunto_tramite || this.tramite?.asunto_tramite || '-';
  }

  getCedulaRucLabel(): string {
    return this.tramiteDatos?.cedula_ruc || this.tramite?.cliente?.cedula_ruc || '-';
  }

  private buildStorageUrl(ruta_archivo: string): string {
    const cleanBase = String(URL_BACKEND || '').replace(/\/+$/, '');
    const raw = String(ruta_archivo || '').trim();
    if (!raw) return '';

    if (/^https?:\/\//i.test(raw)) {
      return encodeURI(raw);
    }

    let cleanRuta = raw.replace(/^\/+/, '');

    if (cleanRuta.startsWith('public/')) {
      cleanRuta = cleanRuta.slice('public/'.length);
    }

    if (cleanRuta.startsWith('storage/')) {
      return encodeURI(`${cleanBase}/${cleanRuta}`);
    }

    return encodeURI(`${cleanBase}/storage/${cleanRuta}`);
  }

  private getExtension(doc: any): string {
    const extFromField = String(doc?.extension || '').toLowerCase();
    if (extFromField) return extFromField;
    const nombre = String(doc?.nombre_original || doc?.nombre_archivo || '').toLowerCase();
    const idx = nombre.lastIndexOf('.');
    return idx >= 0 ? nombre.slice(idx + 1) : '';
  }

  seleccionarDocumento(doc: any) {
    if (!doc?.ruta_archivo) return;
    this.selectedDoc = doc;
    this.previewNoDisponible = false;
    this.selectedPreviewUrl = null;
    this.selectedRawUrl = '';
    this.revokeCurrentObjectUrl();

    const ext = this.getExtension(doc);
    if (ext && ext !== 'pdf') {
      this.previewNoDisponible = true;
      this.cdr.detectChanges();
      return;
    }

    this.cargarPreviewPdf(doc);
  }

  private revokeCurrentObjectUrl(): void {
    if (!this.currentObjectUrl) return;
    URL.revokeObjectURL(this.currentObjectUrl);
    this.currentObjectUrl = null;
  }

  private async cargarPreviewPdf(doc: any): Promise<void> {
    if (!doc?.id_documento_tramite) {
      const url = this.buildStorageUrl(doc?.ruta_archivo);
      if (!url) {
        this.previewNoDisponible = true;
        this.toast.error('El documento no está disponible.');
        this.cdr.detectChanges();
        return;
      }
      this.selectedRawUrl = url;
      this.selectedPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.cdr.detectChanges();
      return;
    }

    try {
      const blob = await firstValueFrom(this.AsignartramiteService.obtenerDocumentoTramite(doc.id_documento_tramite));
      if (!blob || blob.size === 0) {
        this.previewNoDisponible = true;
        this.toast.error('El documento no está disponible.');
        return;
      }

      const urlBlob = URL.createObjectURL(blob);
      this.currentObjectUrl = urlBlob;
      this.selectedRawUrl = urlBlob;
      this.selectedPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(urlBlob);
    } catch (err) {
      this.previewNoDisponible = true;
      this.toast.error('No se pudo abrir el documento.');
    } finally {
      this.cdr.detectChanges();
    }
  }

  // Descargar archivo
  async descargarArchivo(doc: any) {
    if (!doc.ruta_archivo) return;
    if (!doc?.id_documento_tramite) {
      const url = this.buildStorageUrl(doc?.ruta_archivo);
      if (!url) return;
      window.open(url, '_blank', 'noopener');
      return;
    }
    try {
      const blob = await firstValueFrom(this.AsignartramiteService.obtenerDocumentoTramite(doc.id_documento_tramite));
      if (!blob || blob.size === 0) {
        this.toast.error('El documento no está disponible.');
        return;
      }

      const urlBlob = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlBlob;
      a.download = doc.nombre_original || doc.nombre_archivo || 'documento';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlBlob);
    } catch (err) {
      this.toast.error('No se pudo descargar el documento.');
    }
  }

  async abrirEnNuevaPestana() {
    if (!this.selectedDoc) return;
    if (this.selectedRawUrl) {
      window.open(this.selectedRawUrl, '_blank', 'noopener');
      return;
    }
    if (!this.selectedDoc?.id_documento_tramite) {
      const url = this.buildStorageUrl(this.selectedDoc?.ruta_archivo);
      if (!url) return;
      window.open(url, '_blank', 'noopener');
      return;
    }
    try {
      const blob = await firstValueFrom(this.AsignartramiteService.obtenerDocumentoTramite(this.selectedDoc.id_documento_tramite));
      if (!blob || blob.size === 0) {
        this.toast.error('El documento no está disponible.');
        return;
      }
      const urlBlob = URL.createObjectURL(blob);
      window.open(urlBlob, '_blank', 'noopener');
    } catch (err) {
      this.toast.error('No se pudo abrir el documento.');
    }
  }

  // Cerrar modal
  cerrarModal() {
    this.activeModal.close();
  }

}
