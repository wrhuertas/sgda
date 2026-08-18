import { Component, Input, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { IndexacionSerieService } from 'src/app/modules/indexacion-serie/service/indexacion-serie.service';
import { ToastrService } from 'ngx-toastr';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AsignartramiteService } from '../service/asignartramite.service';

@Component({
  selector: 'app-sumillar',
  templateUrl: './sumillar.component.html',
  styleUrls: ['./sumillar.component.scss']
})
export class SumillarComponent implements OnInit {
  @Input() anexo: any; // se espera { ruta, nombre_anexo, ... }

  public previewUrl: string | null = null;
  public isPdf: boolean = false;
  public id_empresa: number | null = null;
  @ViewChild('imageRef') imageRef!: ElementRef<HTMLImageElement>;
  @ViewChild('canvasRef') canvasRef!: ElementRef<HTMLCanvasElement>;
  paginaMostrada: string | null = null;
  isDataImage: boolean = false;
  paginaActual: number = 0;
  totalPaginas: number = 0;
  doc: any = null;
  usuario_id: number | null = null;
  anexoFirmado: boolean = false;
  nombrePdfFirmado: string | null = null;

  // Firma overlay
  firmaActiva: boolean = false;
  firmaX: number = 50;
  firmaY: number = 50;
  firmaWidth: number = 150;
  firmaHeight: number = 80;
  // Si se captura una firma como base64 (ej. desde un canvas de firma), se puede asignar aquí
  firmaBase64: string | null = null;
  dragging: boolean = false;
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;

  constructor(
    private AsignartramiteService: AsignartramiteService,
    private seccionesService: IndexacionSerieService,
    private toast: ToastrService,
    public activeModal: NgbActiveModal,
    private cdr: ChangeDetectorRef
  ) {}

  close() {
    try { this.activeModal.close(); } catch { try { this.activeModal.dismiss(); } catch {} }
  }

  abrirDocFirmado() {
    try {
      const publicBase = String(URL_SERVICIOS).replace(/\/api\/?$/i, '');
      // preferir ruta_doc_firmado en anexo, luego nombrePdfFirmado si existe, luego doc.ruta
      const rutaFirmada = this.anexo?.ruta_doc_firmado ?? (this.nombrePdfFirmado ? ('/storage/' + (this.doc?.ruta ? this.doc.ruta.split('/').slice(0, -1).join('/') + '/' + this.nombrePdfFirmado : this.nombrePdfFirmado)) : null) ?? this.doc?.ruta;
      if (!rutaFirmada) { this.toast.info('Ruta del documento firmado no disponible'); return; }
      let url = rutaFirmada;
      // si la ruta no incluye /storage/ la añadimos
      if (!String(url).startsWith('/storage/') && !/^https?:\/\//i.test(String(url))) url = '/storage/' + String(url).replace(/^\//, '');
      const full = publicBase + url;
      window.open(full, '_blank');
    } catch (e) { console.error('abrirDocFirmado error:', e); this.toast.error('No se pudo abrir el documento firmado'); }
  }

  ngOnInit(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.id_empresa = user.id_empresa ?? null;
    } catch { this.id_empresa = null; }

    if (!this.anexo) return;

    console.log('[Sumillar] anexo recibido en modal:', this.anexo);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.usuario_id = user.id ?? null;

    const idDoc = this.anexo.id_documento ?? this.anexo.id_documento_tramite ?? this.anexo.id;
    // Asignar información básica del documento siempre que exista un identificador (puede ser id_anexo)
    if (idDoc) {
      // Asignar doc de forma inmediata para que el template lo muestre
      this.doc = { id: Number(idDoc), nombre: (this.anexo.nombre_anexo ?? this.anexo.nombre ?? null), ruta: (this.anexo.ruta ?? this.anexo.ruta_archivo ?? null), id_anexo: this.anexo.id ?? this.anexo.id_anexo ?? null };
      console.log('[Sumillar] doc inicial (assign):', this.doc);
      try { this.cdr.detectChanges(); } catch {}
    }
    // estado de firmado
    this.anexoFirmado = !!(this.anexo?.anexo_firmado || this.anexo?.documento_firmado || this.anexo?.anexo_firmado === 1);

    // Intentar cargar la página si conocemos la empresa
    if (idDoc && this.id_empresa) {
      this.cargarPagina(0, Number(idDoc));
    } else if (idDoc) {
      // still try with user stored empresa
      const userEmpresa = user.id_empresa ?? null;
      if (userEmpresa) {
        this.id_empresa = userEmpresa;
        this.cargarPagina(0, Number(idDoc));
      }
    } else {
      // fallback to direct storage URL
      if (this.anexo.ruta) {
        const publicBase = String(URL_SERVICIOS).replace(/\/api\/?$/i, '');
        this.paginaMostrada = publicBase + '/storage/' + this.anexo.ruta;
        this.isPdf = String(this.anexo.ruta).toLowerCase().endsWith('.pdf');
    } else if (this.anexo.ruta_archivo) {
      const publicBase = String(URL_SERVICIOS).replace(/\/api\/?$/i, '');
      this.paginaMostrada = publicBase + '/storage/' + this.anexo.ruta_archivo;
      this.isPdf = String(this.anexo.ruta_archivo).toLowerCase().endsWith('.pdf');
      // asignar doc info desde anexo para que la acción de firmar tenga el id si está disponible
      if (!this.doc && (this.anexo.id_documento || this.anexo.id_documento_tramite || this.anexo.id)) {
        const idDocFallback = this.anexo.id_documento ?? this.anexo.id_documento_tramite ?? this.anexo.id;
        this.doc = { id: Number(idDocFallback), nombre: (this.anexo.nombre_anexo ?? this.anexo.nombre ?? null), ruta: (this.anexo.ruta ?? this.anexo.ruta_archivo ?? null) };
      }
    }
    // mostrar doc en consola para depuración
    console.log('[Sumillar] doc inicial:', this.doc);
  }
    this.validarfirma();
  }

  cargarPagina(index: number = 0, idDocumentoParam?: number) {
    // Llamar al endpoint específico de Asignacion (obtenerAnexoImagen) primero
    const anexoPayload: any = { page: index };
    if (this.anexo?.id_anexo) anexoPayload.id_anexo = this.anexo.id_anexo;
    if (this.anexo?.ruta) anexoPayload.ruta = String(this.anexo.ruta).replace(/^\//, '').replace(/^storage\//, '');
    else if (this.anexo?.ruta_archivo) anexoPayload.ruta = String(this.anexo.ruta_archivo).replace(/^\//, '').replace(/^storage\//, '');

    this.seccionesService.obtenerAnexoImagen(anexoPayload).subscribe({
      next: (resp: any) => {
        if (resp?.success && resp.data && resp.data.imagen) {
          this.paginaMostrada = resp.data.imagen;
          this.isDataImage = String(this.paginaMostrada).startsWith('data:image');
          this.totalPaginas = resp.data.total_paginas ?? 1;
          this.paginaActual = resp.data.pagina_actual ?? index;
          // No sobreescribir el id del documento si ya lo tenemos; preferir id devuelto en resp.data.documento
          const respDocId = resp.data?.documento?.id_documento ?? resp.data?.documento?.id ?? null;
          const resolvedId = respDocId ?? this.anexo?.id_documento ?? this.anexo?.id ?? this.doc?.id ?? null;
          this.doc = { id: resolvedId, nombre: resp.data.nombre ?? this.doc?.nombre ?? null, ruta: resp.data.ruta ?? this.doc?.ruta ?? null };
        } else {
          // Si no devuelve imagen, usar fallback público y/o conversión
          console.warn('obtenerAnexoImagen no devolvió imagen, fallback:', resp);
          this.handleFallbackToPublicOrConvert();
        }
      },
      error: (err) => {
        console.error('Error obtenerAnexoImagen:', err);
        this.handleFallbackToPublicOrConvert();
      }
    });
  }

  private handleFallbackToPublicOrConvert() {
    // original fallback logic: try public URL and call convertirPdfAImagenes
    if (this.anexo?.ruta) {
      // Si el anexo trae información del documento, asignarla para permitir firmar
      if (!this.doc && (this.anexo.id_documento || this.anexo.id_documento_tramite || this.anexo.id)) {
        const idDocFallback = this.anexo.id_documento ?? this.anexo.id_documento_tramite ?? this.anexo.id;
        this.doc = { id: Number(idDocFallback), nombre: (this.anexo.nombre_anexo ?? this.anexo.nombre ?? null), ruta: (this.anexo.ruta ?? this.anexo.ruta_archivo ?? null) };
      }
      const publicBase = String(URL_SERVICIOS).replace(/\/api\/?$/i, '');
      const storagePath = '/storage/' + this.anexo.ruta;
      this.isPdf = String(this.anexo.ruta).toLowerCase().endsWith('.pdf');
      if (this.isPdf) {
        this.paginaMostrada = publicBase + storagePath;
        this.isDataImage = false;
        console.log('[Sumillar] fallback convertirPdfAImagenes ->', storagePath);
        this.seccionesService.convertirPdfAImagenes(storagePath).subscribe({
          next: (r: any) => {
            if (r?.success && Array.isArray(r.imagenes) && r.imagenes.length > 0) {
              this.paginaMostrada = 'data:image/png;base64,' + r.imagenes[0];
              this.isDataImage = true;
              this.totalPaginas = r.imagenes.length;
              this.paginaActual = 0;
            } else {
              this.paginaMostrada = publicBase + storagePath;
              this.isDataImage = false;
            }
          },
          error: (e) => {
            console.error('Error convertirPdfAImagenes:', e);
            this.paginaMostrada = publicBase + storagePath;
            this.isDataImage = false;
          }
        });
      } else {
        this.paginaMostrada = publicBase + storagePath;
      }
    } else if (this.anexo?.ruta_archivo) {
      const publicBase = String(URL_SERVICIOS).replace(/\/api\/?$/i, '');
      const storagePath = '/storage/' + this.anexo.ruta_archivo;
      this.isPdf = String(this.anexo.ruta_archivo).toLowerCase().endsWith('.pdf');
      if (this.isPdf) {
        this.paginaMostrada = publicBase + storagePath;
        this.isDataImage = false;
        console.log('[Sumillar] fallback convertirPdfAImagenes ->', storagePath);
        this.seccionesService.convertirPdfAImagenes(storagePath).subscribe({
          next: (r: any) => {
            if (r?.success && Array.isArray(r.imagenes) && r.imagenes.length > 0) {
              this.paginaMostrada = 'data:image/png;base64,' + r.imagenes[0];
              this.isDataImage = true;
              this.totalPaginas = r.imagenes.length;
              this.paginaActual = 0;
            } else {
              this.paginaMostrada = publicBase + storagePath;
              this.isDataImage = false;
            }
          },
          error: (e) => {
            console.error('Error convertirPdfAImagenes:', e);
            this.paginaMostrada = publicBase + storagePath;
            this.isDataImage = false;
          }
        });
      } else {
        this.paginaMostrada = publicBase + storagePath;
      }
    } else {
      this.paginaMostrada = null;
      this.toast.error('No se pudo obtener la vista previa del anexo');
    }
  }

  ajustarCanvas() {
    try {
      const img = this.imageRef?.nativeElement;
      const canvas = this.canvasRef?.nativeElement;
      if (!img || !canvas) return;
      canvas.width = img.clientWidth;
      canvas.height = img.clientHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    } catch (e) { console.error('Error ajustarCanvas:', e); }
  }

  descargar() {
    if (!this.paginaMostrada) return;
    window.open(this.paginaMostrada, '_blank');
  }


validarfirma() {
  if (!this.usuario_id) return;

  this.AsignartramiteService.validarfirma(this.usuario_id).subscribe({
    next: (response: any) => {
      console.log('Firma validada con éxito', response);
      
      // Forzar el tipado como any o definir la estructura para evitar el error de TS
      const res = response as any;
      this.firmaActiva = res.vigente;
      // Forzar cambio de detección para evitar ExpressionChangedAfterItHasBeenCheckedError
      try { this.cdr.detectChanges(); } catch {}
    },
    error: (error) => {
      console.error('Error al validar la firma', error);
      this.firmaActiva = false;
    }
  });
}


  async firmarAnexo() {
    console.log('🖊 Click en firmar', { doc: this.doc, anexo: this.anexo });

    if (!this.firmaActiva) {
      Swal.fire({
        icon: 'warning',
        title: 'Firma no activada',
        text: 'Usted todavía no tiene una firma en el sistema',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    // buscar el elemento visual del documento
    const imgElement = this.imageRef?.nativeElement as HTMLElement | undefined || document.querySelector('.preview-img') as HTMLElement | null;

    if (!this.doc || !this.doc.id) {
      Swal.fire('Error', 'Falta el ID del documento. No se puede firmar.', 'error');
      return;
    }

    if (!this.usuario_id) {
      Swal.fire('Sesión caducada', 'Debe iniciar sesión nuevamente', 'warning');
      return;
    }

    const opcion = await Swal.fire({
      title: '¿Firmar esta hoja o todas las hojas?',
      icon: 'question',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Firmar solo esta hoja',
      denyButtonText: 'Firmar todas las hojas',
      cancelButtonText: 'Cancelar'
    });

    if (opcion.isDismissed) return;

    const anchoVisor = (imgElement as HTMLElement | null)?.offsetWidth ?? '';
    const altoVisor = (imgElement as HTMLElement | null)?.offsetHeight ?? '';

    const buildFormDataForPage = (pagina: number) => {
      const fd = new FormData();
      fd.append('idDoc', String(this.doc.id));
      fd.append('nombreDoc', this.doc.nombre || '');
      fd.append('rutaDoc', this.doc.ruta || '');
      fd.append('usuario_id', String(this.usuario_id));
      fd.append('id_empresa', String(this.id_empresa ?? ''));
      fd.append('pagina_a_firmar', String(pagina));
      fd.append('x', String(this.firmaX));
      fd.append('y', String(this.firmaY));
      fd.append('width', String(this.firmaWidth));
      fd.append('height', String(this.firmaHeight));
      try { const idAnexo = this.anexo?.id_anexo ?? this.anexo?.id ?? this.doc?.id_anexo ?? null; if (idAnexo) fd.append('id_anexo', String(idAnexo)); } catch {}
      if (anchoVisor) fd.append('ancho_visor', String(anchoVisor));
      if (altoVisor) fd.append('alto_visor', String(altoVisor));
      if (this.firmaBase64) {
        try { const blob = this.base64ToBlob(this.firmaBase64.replace(/^data:image\/[a-z]+;base64,/, ''), 'image/png'); fd.append('firma', blob, 'firma.png'); } catch (e) { console.warn('No se pudo adjuntar firma base64:', e); }
      }
      return fd;
    };

    const signOnePage = async (page: number) => {
      Swal.fire({ title: 'Firmando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const fd = buildFormDataForPage(page);
        const result = await new Promise<any>((resolve, reject) => {
          this.AsignartramiteService.firmarDocumento(fd).subscribe({
            next: (event: any) => {
              const body = event?.body ?? event;
              if (body && (body.success !== undefined || body.mensaje !== undefined)) resolve(body);
            },
            error: (err: any) => reject(err)
          });
        });
        Swal.close();
        return result;
      } catch (err) {
        Swal.close();
        throw err;
      }
    };

    if (opcion.isConfirmed) {
      // solo la página actual
      try {
        const res = await signOnePage(this.paginaActual + 1);
        if (res.success) {
          // actualizar estado y cerrar modal retornando información al padre
          this.anexoFirmado = true;
          this.anexo.anexo_firmado = 1;
          this.nombrePdfFirmado = res.nombre_pdf ?? null;
          const resultObj: any = { signed: true, nombre_pdf: this.nombrePdfFirmado };
          // intentar incluir ruta_doc_firmado si backend la devolvió
          if (res.ruta_doc_firmado) resultObj.ruta_doc_firmado = res.ruta_doc_firmado;
          Swal.fire('¡Firmado!', res.mensaje || 'El documento se ha firmado con éxito.', 'success').then(() => {
            try { this.activeModal.close(resultObj); } catch { try { this.activeModal.dismiss(resultObj); } catch {} }
          });
        } else { Swal.fire('Atención', res.mensaje || 'No se pudo firmar el documento', 'warning'); }
      } catch (err: any) {
        console.error('❌ Error firmando anexo:', err);
        const mensajeError = err?.error?.message || 'Error al procesar la firma electrónica';
        Swal.fire({ icon: 'warning', title: 'Atención', text: mensajeError, confirmButtonColor: '#3085d6', confirmButtonText: 'Entendido' });
      }
    } else if (opcion.isDenied) {
      // Enviar una sola petición indicando que se deben firmar todas las páginas
      const fd = buildFormDataForPage(1);
      // indicar al backend que firme todas las páginas (frontend muestra 'todas')
      fd.set('pagina_a_firmar', 'todas');
      fd.append('firmar_todas', '1');

      Swal.fire({ title: 'Firmando todas las hojas...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      try {
        const res = await new Promise<any>((resolve, reject) => {
          this.AsignartramiteService.firmarDocumento(fd).subscribe({
            next: (event: any) => {
              const body = event?.body ?? event;
              if (body && (body.success !== undefined || body.mensaje !== undefined)) resolve(body);
            },
            error: (err: any) => reject(err)
          });
        });

        Swal.close();
        if (res.success) {
          this.anexoFirmado = true;
          this.anexo.anexo_firmado = 1;
          this.nombrePdfFirmado = res.nombre_pdf ?? null;
          const resultObj: any = { signed: true, nombre_pdf: this.nombrePdfFirmado };
          if (res.ruta_doc_firmado) resultObj.ruta_doc_firmado = res.ruta_doc_firmado;
          Swal.fire('¡Firmado!', res.mensaje || 'Todas las páginas se han procesado para firma.', 'success').then(() => {
            try { this.activeModal.close(resultObj); } catch { try { this.activeModal.dismiss(resultObj); } catch {} }
          });
        } else { Swal.fire('Atención', res.mensaje || 'No se pudo procesar la firma de todas las páginas', 'warning'); }
      } catch (err: any) {
        Swal.close();
        console.error('❌ Error firmando todas las páginas:', err);
        const mensajeError = err?.error?.message || (err?.mensaje || 'Error al firmar las páginas');
        Swal.fire({ icon: 'warning', title: 'Atención', text: mensajeError, confirmButtonColor: '#3085d6', confirmButtonText: 'Entendido' });
      }
    }
  }

  // Helper: convertir base64 (sin data:) a Blob
  base64ToBlob(base64: string, mime: string) {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mime });
  }

  startDrag(event: MouseEvent) {
    event.preventDefault();
    this.dragging = true;
    const img = this.imageRef?.nativeElement as HTMLElement | undefined;
    if (img) {
      const rect = img.getBoundingClientRect();
      const clickXRel = event.clientX - rect.left;
      const clickYRel = event.clientY - rect.top;
      this.dragOffsetX = clickXRel - this.firmaX;
      this.dragOffsetY = clickYRel - this.firmaY;
    }
    window.addEventListener('mousemove', this.onDrag);
    window.addEventListener('mouseup', this.stopDrag);
  }

  startTouchDrag(event: TouchEvent) {
    try { event.preventDefault(); } catch {}
    this.dragging = true;
    const img = this.imageRef?.nativeElement as HTMLElement | undefined;
    if (img && event.touches && event.touches.length > 0) {
      const rect = img.getBoundingClientRect();
      const t = event.touches[0];
      const clickXRel = t.clientX - rect.left;
      const clickYRel = t.clientY - rect.top;
      this.dragOffsetX = clickXRel - this.firmaX;
      this.dragOffsetY = clickYRel - this.firmaY;
    }
    window.addEventListener('touchmove', this.onTouchMove, { passive: false } as any);
    window.addEventListener('touchend', this.stopDrag as any);
  }

  onDrag = (event: MouseEvent) => {
    if (!this.dragging) return;
    const img = this.imageRef?.nativeElement as HTMLElement | undefined;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    let mouseX = event.clientX - rect.left;
    let mouseY = event.clientY - rect.top;
    let newX = mouseX - this.dragOffsetX;
    let newY = mouseY - this.dragOffsetY;
    this.firmaX = Math.max(0, Math.min(newX, rect.width - this.firmaWidth));
    this.firmaY = Math.max(0, Math.min(newY, rect.height - this.firmaHeight));
  }

  onTouchMove = (event: TouchEvent) => {
    if (!this.dragging) return;
    try { event.preventDefault(); } catch {}
    const img = this.imageRef?.nativeElement as HTMLElement | undefined;
    if (!img || !event.touches || event.touches.length === 0) return;
    const rect = img.getBoundingClientRect();
    const t = event.touches[0];
    let touchX = t.clientX - rect.left;
    let touchY = t.clientY - rect.top;
    let newX = touchX - this.dragOffsetX;
    let newY = touchY - this.dragOffsetY;
    this.firmaX = Math.max(0, Math.min(newX, rect.width - this.firmaWidth));
    this.firmaY = Math.max(0, Math.min(newY, rect.height - this.firmaHeight));
  }

  stopDrag = (event: MouseEvent) => {
    this.dragging = false;
    window.removeEventListener('mousemove', this.onDrag);
    window.removeEventListener('mouseup', this.stopDrag);
    try {
      window.removeEventListener('touchmove', this.onTouchMove as any);
      window.removeEventListener('touchend', this.stopDrag as any);
    } catch {}
  }
}
