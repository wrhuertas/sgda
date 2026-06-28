import { Component } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { URL_SERVICIOS } from 'src/app/config/config';
import Swal from 'sweetalert2';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-seguimiento-tramite-publico',
  templateUrl: './seguimiento-tramite.component.html'
})
export class SeguimientoTramiteComponent {
  api = environment.apiUrl ?? '/api';
  private readonly backendUrl = URL_SERVICIOS;

  criterioBusqueda: 'dni' | 'tramite' | 'ambos' | '' = '';
  numeroTramite = '';
  dni = '';

  showResultado = false;
  tramite: any = null;
  cliente: any = null;
  timeline: any[] = [];
  historialTramites: any[] = [];
  
  // Nuevas propiedades para organizar por estado
  tramitesActivos: any[] = [];
  tramitesRechazados: any[] = [];
  tramitesCaducados: any[] = [];
  activeTab: number = 1;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  onCambioCriterio(_v: any) { /* noop */ }

  esValidoBusqueda() {
    if (this.criterioBusqueda === 'dni') return !!this.dni?.trim();
    if (this.criterioBusqueda === 'tramite') return !!this.numeroTramite?.trim();
    if (this.criterioBusqueda === 'ambos') return !!this.dni?.trim() && !!this.numeroTramite?.trim();
    return false;
  }

  buscarTramite() {
    this.showResultado = false;
    this.tramite = null;
    this.cliente = null;
    this.timeline = [];
    this.historialTramites = [];
    this.tramitesActivos = [];
    this.tramitesRechazados = [];
    this.tramitesCaducados = [];
    this.activeTab = 1;

    const payload: any = {};
    if (this.criterioBusqueda === 'dni' || this.criterioBusqueda === 'ambos') payload.n_documento = this.dni.trim();
    if (this.criterioBusqueda === 'tramite' || this.criterioBusqueda === 'ambos') payload.numero = this.numeroTramite.trim();

    // Loading
    Swal.fire({ title: 'Buscando...', text: 'Espere por favor', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    // Endpoint backend que devuelve datos y/o timeline
    this.http.post(`${this.backendUrl}/tramite/seguimientoDatos`, payload).subscribe({
      next: (resp: any) => {
        try { console.log('seguimientoDatos resp:', resp); } catch {}
        // Parseo tolerante a estructuras
        this.tramite = resp?.tramite || resp?.data?.tramite || null;
        this.cliente = resp?.cliente || resp?.data?.cliente || null;
        try { console.log('tramite parsed:', this.tramite); } catch {}
        try { console.log('cliente parsed:', this.cliente); } catch {}
        // Fallback: si no vino 'tramite' explícito, usar el primero del arreglo 'tramites' (o cliente.tramites)
        if (!this.tramite) {
          const arr1 = Array.isArray(resp?.tramites) ? resp.tramites : [];
          const arr2 = Array.isArray(resp?.data?.tramites) ? resp.data.tramites : [];
          const arr3 = Array.isArray(this.cliente?.tramites) ? this.cliente.tramites : [];
          const cand = arr1[0] || arr2[0] || arr3[0] || null;
          if (cand) this.tramite = cand;
        }
        const tl = resp?.timeline || resp?.asignaciones || [];
        this.timeline = Array.isArray(tl) ? tl.map((it: any) => ({
          fecha: it.fecha_registro || it.created_at || it.fecha || new Date().toISOString(),
          area_destino: it.area_destino?.nombre_area || it.area_destino || it.destino || '-',
          estado_tramite: it.estado || it.estado_tramite || '-',
          asunto: it.asunto || it.observacion || (this.tramite?.asunto_tramite || ''),
          documentos: it.documentos || []
        })) : [];
        try { console.log('timeline parsed:', this.timeline); } catch {}

         // Historial de trámites encadenados por número_tramite (si viene del backend)
         const hist = resp?.tramites || resp?.data?.tramites || this.cliente?.tramites || [];
         this.historialTramites = Array.isArray(hist) ? [...hist] : [];
         // Orden cronológico por created_at ascendente
         this.historialTramites.sort((a: any, b: any) => new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime());
         // Si aún no hay tramite principal, usar el primero del historial
         if (!this.tramite && this.historialTramites.length > 0) {
           this.tramite = this.historialTramites[0];
         }
         try { console.log('historial parsed:', this.historialTramites); } catch {}
         
         // Clasificar trámites por estado
         this.clasificarTramitesPorEstado();
         
         try { console.log('setting showResultado = true'); } catch {}
         this.showResultado = true;
         try { this.cdr.detectChanges(); } catch {}
         try { Swal.close(); } catch {}
       },
      error: () => { this.showResultado = false; try { Swal.close(); } catch {};
        Swal.fire({ icon: 'info', title: 'Sin resultados', text: 'No se encontraron datos para los criterios ingresados.' });
      }
    });
  }

  descargarArchivo(doc: any) {
    // Si el backend expone una URL directa, usarla; si no, armarla con un endpoint existente.
    if (doc?.url) {
      window.open(doc.url, '_blank');
    }
  }

  // Prioridad segun el tipo de documento del trámite
  getPrioridadLabel(): string {
    const p = (this.tramite?.tipo_documento?.prioridad || this.tramite?.prioridad || '').toString().toLowerCase();
    if (p.includes('urgente')) return 'Urgente';
    if (p.includes('especial')) return 'Especial';
    if (p.includes('normal')) return 'Normal';
    return '';
  }

  getPrioridadBadgeClass(): string {
    const label = this.getPrioridadLabel();
    if (label === 'Urgente') return 'badge badge-light-danger';
    if (label === 'Especial') return 'badge badge-light-primary';
    if (label === 'Normal') return 'badge badge-light-success';
    return 'badge badge-light';
  }

  private clasificarTramitesPorEstado(): void {
    this.tramitesActivos = [];
    this.tramitesRechazados = [];
    this.tramitesCaducados = [];

    console.log('[Seguimiento] Clasificando trámites. Total:', this.historialTramites.length);

    this.historialTramites.forEach((tramite: any) => {
      const estado = (tramite?.id_estado_tramite || tramite?.estado || tramite?.estado_tramite || '').toLowerCase();
      
      console.log('[Seguimiento] Trámite:', tramite.numero_tramite, 'Estado:', estado);
      
      if (estado.includes('rechazado') || estado.includes('rejected') || estado.includes('rechazo')) {
        this.tramitesRechazados.push(tramite);
      } else if (estado.includes('caducado') || estado.includes('expired') || estado.includes('vencido')) {
        this.tramitesCaducados.push(tramite);
      } else {
        // Por defecto, consideramos como activo
        this.tramitesActivos.push(tramite);
      }
    });

    console.log('[Seguimiento] Activos:', this.tramitesActivos.length, 'Rechazados:', this.tramitesRechazados.length, 'Caducados:', this.tramitesCaducados.length);

    // Si no hay clasificación clara, poner todos como activos
    if (this.tramitesActivos.length === 0 && this.tramitesRechazados.length === 0 && this.tramitesCaducados.length === 0) {
      this.tramitesActivos = [...this.historialTramites];
    }
  }

  getAsignacionesParaTramite(tramite: any): any[] {
    // Retorna las asignaciones (historial de derivaciones) del trámite específico
    return Array.isArray(tramite?.asignaciones) ? tramite.asignaciones : [];
  }

  getEstadoBadgeClass(tramite: any): string {
    const estado = (tramite?.estado || tramite?.estado_tramite || '').toLowerCase();
    if (estado.includes('rechazado') || estado.includes('rejected')) return 'badge-light-danger';
    if (estado.includes('caducado') || estado.includes('expired')) return 'badge-light-warning';
    return 'badge-light-success';
  }
}
