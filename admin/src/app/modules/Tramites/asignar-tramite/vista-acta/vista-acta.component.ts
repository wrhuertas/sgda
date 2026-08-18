import { Component, Input, OnInit } from '@angular/core';
import { AsignartramiteService } from '../service/asignartramite.service';
import Swal from 'sweetalert2';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-vista-acta',
  templateUrl: './vista-acta.component.html',
  styleUrls: ['./vista-acta.component.scss']
})
export class VistaActaComponent implements OnInit {
  @Input() actaData: any;
  @Input() textoSumillar: string | null = null;
  @Input() usuariosDe: any[] = [];
  @Input() usuariosPara: any[] = [];
  // Posición previa del sello (fracciones) para restaurarlo al reabrir
  @Input() overlayInicial: any = null;
  imagenes: string[] = [];
  firmado: boolean | null = null;
  total_paginas: number = 0;
  currentDate: string = '';
  // Overlay position as fractions of image (0..1)
  overlay = { left: 0.05, top: 0.05, width: 0.28, height: 0.12 };
  overlayFixed: boolean = false;
  private dragging = false;
  private dragStart = { x: 0, y: 0, left: 0, top: 0 };

  constructor(private asignarService: AsignartramiteService, public activeModal: NgbActiveModal) {}

  ngOnInit() {
    try {
      console.log('VistaActaComponent - actaData recibida:', this.actaData);
    } catch (e) {
      console.error('VistaActaComponent - error al imprimir actaData:', e);
    }
    
    // Restaurar la posición previa del sello si viene desde el componente padre
    try {
      if (this.overlayInicial && typeof this.overlayInicial === 'object') {
        if (this.overlayInicial.x_frac != null) this.overlay.left = Number(this.overlayInicial.x_frac);
        if (this.overlayInicial.y_frac != null) this.overlay.top = Number(this.overlayInicial.y_frac);
        if (this.overlayInicial.w_frac != null) this.overlay.width = Number(this.overlayInicial.w_frac);
        if (this.overlayInicial.h_frac != null) this.overlay.height = Number(this.overlayInicial.h_frac);
      }
    } catch {}

    // Se ejecuta automáticamente al abrir el componente
    // preparar fecha mostrada en el sello
    try {
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const HH = String(d.getHours()).padStart(2, '0');
      const MM = String(d.getMinutes()).padStart(2, '0');
      this.currentDate = `${dd}/${mm}/${yyyy} ${HH}:${MM}`;
    } catch {}
    this.enviarIdYRutaAlService();
  }

  startDrag(event: PointerEvent) {
    if (this.overlayFixed) return; // no permitir arrastre si está fijado
    event.preventDefault();
    // initialize drag
    this.dragging = true;
    this.dragStart.x = event.clientX;
    this.dragStart.y = event.clientY;
    this.dragStart.left = this.overlay.left;
    this.dragStart.top = this.overlay.top;

    const move = (ev: PointerEvent) => this.onMove(ev);
    const up = (ev: PointerEvent) => {
      this.onEnd(ev);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  private onMove(event: PointerEvent) {
    if (!this.dragging) return;
    // compute delta in pixels; need image size to convert to fraction
    const dx = event.clientX - this.dragStart.x;
    const dy = event.clientY - this.dragStart.y;

    // find image element and its bounding box
    const imgEl = document.querySelector('.va-image-card .va-image') as HTMLElement | null;
    if (!imgEl) return;
    const rect = imgEl.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const deltaLeft = dx / rect.width;
    const deltaTop = dy / rect.height;

    let newLeft = this.dragStart.left + deltaLeft;
    let newTop = this.dragStart.top + deltaTop;

    // clamp 0..1-width/height
    newLeft = Math.max(0, Math.min(1 - this.overlay.width, newLeft));
    newTop = Math.max(0, Math.min(1 - this.overlay.height, newTop));

    this.overlay.left = newLeft;
    this.overlay.top = newTop;
  }

  private onEnd(event: PointerEvent) {
    this.dragging = false;
  }

  close() {
    const coords = this.computeSelloFracciones();
    try { this.activeModal.close(coords); } catch (e) { try { this.activeModal.dismiss(); } catch {} }
  }

  // Calcula la posición del sello en fracciones (0..1) respecto a la imagen,
  // para enviarlas al backend y estampar el sello en el mismo lugar.
  private computeSelloFracciones() {
    try {
      const imgEl = document.querySelector('.va-image-card .va-image') as HTMLElement | null;
      const overlayEl = document.querySelector('.va-overlay') as HTMLElement | null;
      if (imgEl && overlayEl) {
        const imgRect = imgEl.getBoundingClientRect();
        const ovRect = overlayEl.getBoundingClientRect();
        if (imgRect.width > 0 && imgRect.height > 0) {
          return {
            x_frac: (ovRect.left - imgRect.left) / imgRect.width,
            y_frac: (ovRect.top - imgRect.top) / imgRect.height,
            w_frac: ovRect.width / imgRect.width,
            h_frac: ovRect.height / imgRect.height,
            page: 1
          };
        }
      }
    } catch {}
    return {
      x_frac: this.overlay.left,
      y_frac: this.overlay.top,
      w_frac: this.overlay.width,
      h_frac: this.overlay.height,
      page: 1
    };
  }

  // Nombres formateados para mostrar en el sello
  get nombresDe(): string {
    return this.formatUsuarios(this.usuariosDe);
  }

  get nombresPara(): string {
    return this.formatUsuarios(this.usuariosPara);
  }

  private formatUsuarios(list: any[]): string {
    if (!Array.isArray(list) || list.length === 0) return '';
    return list
      .map(u => u?.nombre_completo || u?.nombre || u?.name || '')
      .filter(Boolean)
      .join(', ');
  }

  // Alternar fijado en esquina superior derecha
  toggleFixOverlayTopRight() {
    if (!this.overlayFixed) {
      const margin = 0.02; // 2% margin
      this.overlay.left = Math.max(0, 1 - this.overlay.width - margin);
      this.overlay.top = margin;
      this.overlayFixed = true;
    } else {
      this.overlayFixed = false;
    }
  }

  // Función mínima: extrae id y ruta de actaData y envía al service
  enviarIdYRutaAlService() {
    try {
      const id = this.actaData?.data?.asignar_tramite_id ?? this.actaData?.data?.id ?? null;
      const ruta = this.actaData?.data?.ruta ?? null;
      if (!id) {
        console.warn('VistaActaComponent.enviarIdYRutaAlService: no se encontró id en actaData');
        return;
      }
      const payload = { id_asignacion: Number(id), ruta };

      // Mostrar Swal de carga mientras procesamos las imágenes
      Swal.fire({
        title: 'Cargando imagen',
        html: 'Por favor, espere mientras se carga la imagen...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      this.asignarService.enviarIdYRuta(payload).subscribe({
        next: async (resp: any) => {
          try {
            const imgs = Array.isArray(resp?.imagenes) ? resp.imagenes : [];
            this.firmado = typeof resp?.firmado !== 'undefined' ? !!resp.firmado : null;
            this.total_paginas = Number(resp?.total_paginas || imgs.length || 0);

            // Esperar a que todas las data-URLs se carguen en imagenes reales
            await this.waitForBase64Images(imgs);

            this.imagenes = imgs;
          } catch (e) {
            console.error('Error procesando respuesta de imagenes:', e);
            this.imagenes = [];
            this.firmado = null;
            this.total_paginas = 0;
          } finally {
            try { Swal.close(); } catch {}
          }
        },
        error: (err: any) => {
          console.error('enviarIdYRutaAlService - error:', err);
          try { Swal.close(); } catch {}
        }
      });
    } catch (e) {
      console.error('enviarIdYRutaAlService - excepción:', e);
    }
  }

  // Espera a que todas las data-URL images estén cargadas (o fallen). Timeout opcional.
  private waitForBase64Images(imgDataUrls: string[], timeoutMs: number = 20000): Promise<void> {
    return new Promise((resolve) => {
      if (!imgDataUrls || imgDataUrls.length === 0) return resolve();

      const imgs = imgDataUrls.map(src => {
        const i = new Image();
        i.src = src;
        return i;
      });

      let remaining = imgs.length;
      let finished = false;

      const checkDone = () => {
        if (finished) return;
        remaining--;
        if (remaining <= 0) {
          finished = true;
          resolve();
        }
      };

      imgs.forEach(i => {
        i.onload = () => checkDone();
        i.onerror = () => checkDone();
      });

      // timeout fallback
      setTimeout(() => { if (!finished) { finished = true; resolve(); } }, timeoutMs);
    });
  }

}
