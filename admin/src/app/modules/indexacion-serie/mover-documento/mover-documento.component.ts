import { ChangeDetectorRef, Component, Renderer2, Input, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import { DomSanitizer } from '@angular/platform-browser';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { IndexacionSerieService } from '../service/indexacion-serie.service';

@Component({
  selector: 'app-mover-documento',
  templateUrl: './mover-documento.component.html',
  styleUrls: ['./mover-documento.component.scss']
})
export class MoverDocumentoComponent {
  @Input() documentos: any[] = [];
  @Input() documentIds: number[] = [];
  @Input() serieRutaJerarquica: any = null;
  @Input() ubicacionTopografica: any = null;
  // Árbol de la ruta ya abierta (serieRespuesta.data) para mostrar SOLO esa ruta
  @Input() ubicacionTree: any = null;

  destinoSeleccionado: any = null;
  // Navegador jerárquico dentro del modal
  expandKeys: { [key: string]: boolean } = {};
  edificiosEmpresa: any[] = [];
  salasMap: { [edificioId: number]: any[] } = {};
  estanteriasMap: { [salaId: number]: any[] } = {};
  filasMap: { [estanteriaId: number]: any[] } = {};
  cajasMap: { [filaId: number]: any[] } = {};
  carpetasMap: { [cajaId: number]: any[] } = {};

  selectedEdificio: any = null;
  selectedSala: any = null;
  selectedEstanteria: any = null;
  selectedFila: any = null;
  selectedCaja: any = null;
  selectedCarpeta: any = null;
  id_empresa: number | null = null;
  // Track the last selected location level and id so we send only that level on confirm
  lastSelectedField: string | null = null;
  lastSelectedId: number | null = null;

  toggle(key: string) { this.expandKeys[key] = !this.expandKeys[key]; }

  // Ruta que se va armando conforme el usuario navega (Edificio > Sala > Estantería > ...)
  get rutaSeleccionadaDisplay(): string {
    const parts: string[] = [];
    if (this.selectedEdificio) { parts.push(this.selectedEdificio.nombre || 'Edificio'); }
    if (this.selectedSala) { parts.push(this.selectedSala.nombre || 'Sala'); }
    if (this.selectedEstanteria) { parts.push(this.selectedEstanteria.nombre || this.selectedEstanteria.codigo || 'Estantería'); }
    if (this.selectedFila) { parts.push(this.selectedFila.nombre || 'Fila'); }
    if (this.selectedCaja) { parts.push(this.selectedCaja.nombre || ('Caja ' + (this.selectedCaja.numero_caja || ''))); }
    if (this.selectedCarpeta) { parts.push(this.selectedCarpeta.nombre || 'Carpeta'); }
    return parts.join(' > ');
  }

  private cargarUsuarioLogeado(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.id_empresa = user.id_empresa ?? null;
    } catch { this.id_empresa = null; }
  }

  loadEdificiosEmpresa() {
    if (!this.id_empresa) return null;
    const payload = { id_empresa: this.id_empresa };
    return this.seccionesService.listarEdificiosPorEmpresa(payload);
  }

  selectEdificio(ed: any) {
    this.selectedEdificio = ed;
    this.selectedSala = null; this.selectedEstanteria = null; this.selectedFila = null; this.selectedCaja = null; this.selectedCarpeta = null;
    const edId = ed.id_edificio || ed.id;
    // Solo consultar al backend si no tenemos ya las salas de la ruta abierta
    if (!this.salasMap[edId] || this.salasMap[edId].length === 0) {
      this.seccionesService.listarSalasPorEdificio({ id_edificio: edId }).subscribe({
        next: (res: any) => { this.salasMap[edId] = Array.isArray(res?.data) ? res.data : res || []; this.cdr.detectChanges(); },
        error: (err) => console.error('Error listando salas:', err)
      });
    }
    try { this.toast.info(`Edificio seleccionado: ${ed.nombre || ed.id || ''}`, 'Seleccionado'); } catch {}
    this.lastSelectedField = 'id_edificio';
    this.lastSelectedId = ed.id_edificio ?? ed.id ?? null;
  }

  selectSala(ed: any, sala: any) {
    this.selectedSala = sala;
    this.selectedEstanteria = null; this.selectedFila = null; this.selectedCaja = null; this.selectedCarpeta = null;
    const salaId = sala.id_sala || sala.id;
    if (!this.estanteriasMap[salaId] || this.estanteriasMap[salaId].length === 0) {
      this.seccionesService.listarEstanteriasPorSala({ id_sala: salaId }).subscribe({
        next: (res: any) => { this.estanteriasMap[salaId] = Array.isArray(res?.data) ? res.data : res || []; this.cdr.detectChanges(); },
        error: (err) => console.error('Error listando estanterias:', err)
      });
    }
    try { this.toast.info(`Sala seleccionada: ${sala.nombre || sala.id || ''}`, 'Seleccionado'); } catch {}
    this.lastSelectedField = 'id_sala';
    this.lastSelectedId = sala.id_sala ?? sala.id ?? null;
  }

  selectEstanteria(est: any) {
    this.selectedEstanteria = est; this.selectedFila = null; this.selectedCaja = null; this.selectedCarpeta = null;
    const estId = est.id_estanteria || est.id;
    if (!this.filasMap[estId] || this.filasMap[estId].length === 0) {
      this.seccionesService.listarFilasPorEstanteria({ id_estanteria: estId }).subscribe({
        next: (res: any) => { this.filasMap[estId] = Array.isArray(res?.data) ? res.data : res || []; this.cdr.detectChanges(); },
        error: (err) => console.error('Error listando filas:', err)
      });
    }
    try { this.toast.info(`Estantería seleccionada: ${est.nombre || est.codigo || est.id || ''}`, 'Seleccionado'); } catch {}
    this.lastSelectedField = 'id_estanteria';
    this.lastSelectedId = est.id_estanteria ?? est.id ?? null;
  }

  selectFila(f: any) {
    this.selectedFila = f; this.selectedCaja = null; this.selectedCarpeta = null;
    const filaId = f.id_fila || f.id;
    if (!this.cajasMap[filaId] || this.cajasMap[filaId].length === 0) {
      this.seccionesService.listarCajasPorFila({ id_fila: filaId }).subscribe({
        next: (res: any) => { this.cajasMap[filaId] = Array.isArray(res?.data) ? res.data : res || []; this.cdr.detectChanges(); },
        error: (err) => console.error('Error listando cajas:', err)
      });
    }
    try { this.toast.info(`Fila seleccionada: ${f.nombre || f.id || ''}`, 'Seleccionado'); } catch {}
    this.lastSelectedField = 'id_fila';
    this.lastSelectedId = f.id_fila ?? f.id ?? null;
  }

  selectCaja(c: any) {
    this.selectedCaja = c; this.selectedCarpeta = null;
    const cajaId = c.id_caja || c.id;
    if (!this.carpetasMap[cajaId] || this.carpetasMap[cajaId].length === 0) {
      this.seccionesService.listarCarpetasPorCaja({ id_caja: cajaId }).subscribe({
        next: (res: any) => { this.carpetasMap[cajaId] = Array.isArray(res?.data) ? res.data : res || []; this.cdr.detectChanges(); },
        error: (err) => console.error('Error listando carpetas:', err)
      });
    }
    try { this.toast.info(`Caja seleccionada: ${c.nombre || c.numero_caja || c.id || ''}`, 'Seleccionado'); } catch {}
    this.lastSelectedField = 'id_caja';
    this.lastSelectedId = c.id_caja ?? c.id ?? null;
  }

  selectCarpeta(k: any) {
    this.selectedCarpeta = k;
    // Marcar destino seleccionado por defecto
    this.destinoSeleccionado = { tipo: 'carpeta', id: k.id_carpeta || k.id };
    try { this.toast.info(`Carpeta seleccionada: ${k.nombre || k.id || ''}`, 'Seleccionado'); } catch {}
    // set last selected to carpeta
    this.lastSelectedField = 'id_carpeta';
    this.lastSelectedId = k.id_carpeta ?? k.id ?? null;
  }

  constructor(
    public activeModal: NgbActiveModal,
    private toast: ToastrService,
    private seccionesService: IndexacionSerieService,
    public modalService: NgbModal,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    // Normalizar IDs si vienen como objetos
    if ((!this.documentIds || this.documentIds.length === 0) && Array.isArray(this.documentos)) {
      this.documentIds = this.documentos.map(d => d.id ?? d.id_documento).filter(Boolean as any);
    }

    console.log('[MoverDocumentoComponent] documentos:', this.documentos);
    console.log('[MoverDocumentoComponent] documentIds:', this.documentIds);
    console.log('[MoverDocumentoComponent] serieRutaJerarquica:', this.serieRutaJerarquica);
    console.log('[MoverDocumentoComponent] ubicacionTopografica:', this.ubicacionTopografica);

    // Obtener la empresa del usuario logeado
    this.cargarUsuarioLogeado();

    // Mostrar SOLO la ruta ya abierta (la de la serie), no todos los edificios.
    this.cargarDesdeUbicacionTree();
  }

  // Construye el árbol usando únicamente la ruta ya abierta (serieRespuesta.data),
  // para trasladar documentos dentro de esa misma ruta.
  private cargarDesdeUbicacionTree(): void {
    const lugares = Array.isArray(this.ubicacionTree) ? this.ubicacionTree : [];

    if (lugares.length === 0) {
      console.warn('[MoverDocumentoComponent] No se recibió la ruta abierta (ubicacionTree).');
      return;
    }

    const edificios: any[] = [];

    lugares.forEach((l: any) => {
      const ed = l?.edificio;
      if (!ed) { return; }
      const edId = ed.id_edificio ?? ed.id;

      // Agregar el edificio si aún no está
      if (!edificios.find(e => (e.id_edificio ?? e.id) === edId)) {
        edificios.push(ed);
      }

      const sala = l?.sala;
      if (sala) {
        const salaId = sala.id_sala ?? sala.id;
        this.salasMap[edId] = this.salasMap[edId] || [];
        if (!this.salasMap[edId].find((s: any) => (s.id_sala ?? s.id) === salaId)) {
          this.salasMap[edId].push(sala);
        }

        const estanterias = Array.isArray(sala.estanterias) ? sala.estanterias : [];
        this.estanteriasMap[salaId] = estanterias;

        estanterias.forEach((est: any) => {
          const estId = est.id_estanteria ?? est.id;
          const filas = Array.isArray(est.filas) ? est.filas : [];
          this.filasMap[estId] = filas;

          filas.forEach((f: any) => {
            const filaId = f.id_fila ?? f.id;
            const cajas = Array.isArray(f.cajas) ? f.cajas : [];
            this.cajasMap[filaId] = cajas;

            cajas.forEach((c: any) => {
              const cajaId = c.id_caja ?? c.id;
              this.carpetasMap[cajaId] = Array.isArray(c.carpetas) ? c.carpetas : [];
            });
          });
        });
      }
    });

    this.edificiosEmpresa = edificios;
    this.cdr.detectChanges();
  }

  cancelar() {
    this.activeModal.dismiss();
  }

  confirmarTraslado() {
    if (!this.documentIds || this.documentIds.length === 0) {
      this.toast.warning('No hay documentos seleccionados para trasladar');
      return;
    }
    // Construir objeto de ubicación con solo el último nivel seleccionado (prioridad definida por lastSelectedField)
    const ubic: { [k: string]: number | null } = {
      id_edificio: null,
      id_sala: null,
      id_estanteria: null,
      id_fila: null,
      id_caja: null,
      id_carpeta: null
    };

    if (this.lastSelectedField && this.lastSelectedId != null) {
      (ubic as any)[this.lastSelectedField] = this.lastSelectedId;
    } else if (this.ubicacionTopografica) {
      // Fallback: take deepest non-null from ubicacionTopografica
      const order = ['id_carpeta','id_caja','id_fila','id_estanteria','id_sala','id_edificio'];
      for (const field of order) {
        const key = field.replace('id_','');
        const candidate = (this.ubicacionTopografica as any)[key];
        const candidateId = candidate?.id ?? candidate;
        if (candidateId) {
          (ubic as any)[field] = candidateId;
          break;
        }
      }
    }

    // Validar que se haya elegido un destino
    if (!this.lastSelectedField || this.lastSelectedId == null) {
      this.toast.warning('Seleccione una ubicación de destino en el árbol.');
      return;
    }

    const payload = { ids: this.documentIds, ubicacion: ubic };
    const cantidad = this.documentIds.length;
    const rutaDestino = this.rutaSeleccionadaDisplay || 'la ubicación seleccionada';

    console.log('[MoverDocumentoComponent] payload traslado:', payload);

    // Confirmación mostrando la ubicación completa de destino
    Swal.fire({
      icon: 'question',
      title: '¿Está seguro?',
      html: `¿Desea trasladar <strong>${cantidad}</strong> documento${cantidad === 1 ? '' : 's'} a la siguiente ubicación?<br><br>
             <span style="color:#0d6efd; font-weight:600;">${rutaDestino}</span>`,
      showCancelButton: true,
      confirmButtonText: 'Sí, trasladar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (!result.isConfirmed) { return; }

      // Llamada al servicio
      this.seccionesService.trasladarDocumentos(payload).subscribe({
        next: (resp: any) => {
          // Intentar obtener el conteo devuelto por el backend, con fallback
          const count = resp?.updated || resp?.updatedCount || resp?.actualizados || resp?.count || resp?.data?.updated || resp?.data?.count || this.documentIds?.length || 0;
          Swal.fire({
            icon: 'success',
            title: 'Traslado completado',
            html: `Se trasladaron <strong>${count}</strong> documento${count === 1 ? '' : 's'} a:<br><span style="color:#0d6efd; font-weight:600;">${rutaDestino}</span>`,
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#3085d6'
          }).then(() => {
            this.activeModal.close(true);
          });
        },
        error: (err: any) => {
          console.error('Error trasladando documentos:', err);
          this.toast.error('No se pudo trasladar los documentos');
        }
      });
    });
  }
}
