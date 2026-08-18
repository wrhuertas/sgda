import { Component, Input, ChangeDetectorRef } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AsignartramiteService } from '../service/asignartramite.service';
import { AuthService } from 'src/app/modules/auth';
import { ToastrService } from 'ngx-toastr';
import * as pdfjsLib from 'pdfjs-dist';
import { pdfjsWorker } from 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

@Component({
  selector: 'app-ver-actas',
  templateUrl: './ver-actas.component.html',
  styleUrls: ['./ver-actas.component.scss']
})
export class VerActasComponent {
  @Input() actas: any[] = [];
  @Input() id_asignacion_tramite: number | null = null;
  @Input() id_tramite: number | null = null;

  public loading: boolean = false;
  public selectedActa: any = null;
  public selectedPdfUrl: SafeResourceUrl | null = null;
  public selectedPdfHref: string | null = null;
  public selectedPdfSrc: string | null = null;
  public currentPage: number = 1;
  public paginaMostrada: string | null = null;
  public totalPaginas: number | null = null;
  public zoomScale: number = 1;
  public isPdf: boolean = false;

  constructor(
    public activeModal: NgbActiveModal,
    private AsignartramiteService: AsignartramiteService,
    private authService: AuthService,
    private toast: ToastrService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Si el padre ya pasó actas, usarlas; si no, pedirlas al backend
    if (Array.isArray(this.actas) && this.actas.length > 0) {
      try { this.verActa(this.actas[0]); } catch (e) { console.error(e); }
      return;
    }
    this.cargarActas();
  }

  cargarActas() {
    const user = this.authService?.currentUserValue ?? JSON.parse(localStorage.getItem('user') || '{}');
    const id_usuario = user?.id ?? null;
    const id_empresa = user?.id_empresa ?? null;

    if (!this.id_tramite && !this.id_asignacion_tramite) {
      this.toast.error('Falta id_tramite o id_asignacion_tramite');
      return;
    }
    if (!id_usuario || !id_empresa) {
      this.toast.error('No se encontró usuario o empresa');
      return;
    }

    const payload: any = {
      id_asignacion_tramite: this.id_asignacion_tramite ?? 0,
      id_empresa: id_empresa,
      id_usuario: id_usuario,
      id_tramite: this.id_tramite ?? 0
    };

    this.loading = true;
    this.AsignartramiteService.cargarActas(payload).subscribe({
      next: (resp: any) => {
        this.loading = false;
        if (this.id_asignacion_tramite && Array.isArray(resp?.asignaciones)) {
          const found = resp.asignaciones.find((a: any) => Number(a.id_asignacion_tramite) === Number(this.id_asignacion_tramite));
          this.actas = found?.actas ?? resp.actas_tramite ?? [];
        } else {
          this.actas = resp?.actas_tramite ?? [];
        }
        if (Array.isArray(this.actas) && this.actas.length > 0) {
          try { this.verActa(this.actas[0]); } catch (e) { console.error(e); }
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error cargando actas en VerActasComponent:', err);
        this.toast.error('No se pudieron cargar las actas');
      }
    });
  }

  abrirRuta(ruta: string) {
    if (!ruta) return;
    const cleanBase = String(URL_SERVICIOS || '').replace(/\/+$/, '');
    let cleanRuta = String(ruta || '').replace(/^\/+/, '');
    if (cleanRuta.startsWith('storage/')) cleanRuta = cleanRuta.replace(/^storage\//, '');
    const url = `${cleanBase}/storage/${cleanRuta}`;
    window.open(url, '_blank');
  }

  verActa(acta: any) {
    if (!acta) return;
    this.selectedActa = acta;
    this.currentPage = 1;
    const base64 = acta.base64 ?? null;
    if (base64) {
      this.selectedPdfHref = base64;
      if (typeof base64 === 'string' && base64.indexOf('application/pdf') !== -1) {
        this.isPdf = false;
        this.currentPage = 1;
        this.renderPdfBase64ToImage(base64, this.currentPage).catch(err => {
          console.error('Error renderizando PDF base64 en cliente:', err);
          this.fetchActaImage(acta, this.currentPage);
        });
        return;
      }
      this.isPdf = false;
      this.paginaMostrada = base64;
      this.selectedPdfUrl = null;
      this.totalPaginas = acta.total_pages ?? acta.totalPaginas ?? null;
      this.currentPage = 1;
      return;
    }
    this.selectedPdfHref = null;
    this.fetchActaImage(acta, this.currentPage);
  }

  fetchActaImage(acta: any, page: number = 1) {
    const user = this.authService?.currentUserValue ?? JSON.parse(localStorage.getItem('user') || '{}');
    const id_usuario = user?.id ?? null;
    const id_empresa = user?.id_empresa ?? null;

    const payload: any = {
      id_acta: acta?.id ?? null,
      id_asignacion_tramite: acta?.asignar_tramite_id ?? this.id_asignacion_tramite ?? null,
      id_tramite: acta?.tramite_id ?? this.id_tramite ?? null,
      id_empresa: id_empresa,
      id_usuario: id_usuario,
      page: page
    };

    this.loading = true;
    this.AsignartramiteService.obtenerImagenActa(payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        const img = res?.image ?? res?.data ?? null;
        if (img) {
          this.selectedPdfHref = img;
          if (typeof img === 'string' && img.indexOf('application/pdf') !== -1) {
            this.renderPdfBase64ToImage(img, page).catch(err => {
              console.error('Error renderizando PDF desde backend:', err);
              try {
                this.isPdf = false;
                this.paginaMostrada = img;
                this.selectedPdfUrl = null;
              } catch {}
            });
          } else {
            this.isPdf = false;
            this.paginaMostrada = img;
            this.selectedPdfUrl = null;
            try { this.cdr.detectChanges(); } catch {}
          }
          this.totalPaginas = res?.total_pages ?? this.totalPaginas;
        } else {
          this.toast.error('No se recibió imagen del servidor');
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error obteniendo imagen acta:', err);
        this.toast.error('No se pudo obtener la imagen de la acta');
      }
    });
  }

  private async renderPdfBase64ToImage(base64Pdf: string, page: number = 1): Promise<void> {
    try {
      const base64Data = base64Pdf.split(',')[1] || base64Pdf;
      const raw = atob(base64Data);
      const len = raw.length;
      const u8 = new Uint8Array(len);
      for (let i = 0; i < len; i++) u8[i] = raw.charCodeAt(i);

      const loadingTask = (pdfjsLib as any).getDocument({ data: u8 });
      const pdf = await loadingTask.promise;
      this.totalPaginas = pdf.numPages || null;
      const p = await pdf.getPage(page);
      const viewport = p.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await p.render({ canvasContext: ctx, viewport }).promise;
      const dataUrl = canvas.toDataURL('image/png');
      this.paginaMostrada = dataUrl;
      this.selectedPdfHref = base64Pdf;
      try { this.cdr.detectChanges(); } catch {}
    } catch (e) {
      console.error('renderPdfBase64ToImage error', e);
      throw e;
    }
  }

  cerrarVisor() {
    this.selectedActa = null;
    this.selectedPdfUrl = null;
    this.paginaMostrada = null;
    this.selectedPdfHref = null;
    this.currentPage = 1;
  }

  zoomMas() { this.zoomScale = Math.min(3, this.zoomScale + 0.25); }
  zoomMenos() { this.zoomScale = Math.max(0.25, this.zoomScale - 0.25); }
  resetZoom() { this.zoomScale = 1; }

  paginaAnterior() {
    if (this.currentPage > 1) {
      this.currentPage--;
      if (this.selectedActa) this.fetchActaImage(this.selectedActa, this.currentPage);
    }
  }

  siguientePagina() {
    this.currentPage++;
    if (this.selectedActa) this.fetchActaImage(this.selectedActa, this.currentPage);
  }
}
