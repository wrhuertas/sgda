import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { EtiquetaService } from '../service/etiqueta.service';
import { IndexacionSerieService } from '../../../indexacion-serie/service/indexacion-serie.service';

@Component({
  selector: 'app-rutaetiqueta',
  templateUrl: './rutaetiqueta.component.html',
  styleUrls: ['./rutaetiqueta.component.scss']
})
export class RutaetiquetaComponent implements OnInit {

  // ---------- Columna izquierda: clasificación ----------
  secciones: any[] = [];
  subsecciones: any[] = [];
  subsubsecciones: any[] = [];
  series: any[] = [];
  subseries: any[] = [];

  seccionId: any = '';
  subseccionId: any = '';
  subsubseccionId: any = '';
  serieId: any = '';
  subserieId: any = '';

  // ---------- Columna derecha: ubicación topográfica ----------
  edificios: any[] = [];
  salas: any[] = [];
  estanterias: any[] = [];
  filas: any[] = [];
  cajas: any[] = [];
  carpetas: any[] = [];

  idEdificio: any = '';
  idSala: any = '';
  idEstanteria: any = '';
  idFila: any = '';
  idCaja: any = '';
  idCarpeta: any = '';

  guardando = false;
  usuarioActual: any = null;

  constructor(
    public activeModal: NgbActiveModal,
    protected etiquetaService: EtiquetaService,
    protected indexacionService: IndexacionSerieService,
    protected toast: ToastrService,
    protected cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.usuarioActual = JSON.parse(localStorage.getItem('user') || '{}');
    this.cargarSecciones();
  }

  /**
   * Lo que se guarda en id_serie_subserie: el último nivel elegido.
   * Si hay subserie manda la subserie; si no, la serie.
   */
  get idSerieSubserie(): number | null {
    const id = this.subserieId || this.serieId;
    return id ? Number(id) : null;
  }

  // ====================================================
  // CLASIFICACIÓN
  // ====================================================

  cargarSecciones(): void {
    if (!this.usuarioActual?.id) { return; }

    this.etiquetaService.selectSecciones(this.usuarioActual.id).subscribe({
      next: (resp: any) => {
        this.secciones = resp?.proyectos || resp?.secciones || [];
        this.alCargarSecciones();
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('No se pudieron cargar las secciones')
    });
  }

  /** Hook para las subclases: se dispara cuando ya está el árbol cargado */
  protected alCargarSecciones(): void {
    // En alta no hay nada que preseleccionar
  }

  onSeccionChange(): void {
    const sel = this.secciones.find(s => s.id_proyecto == this.seccionId);
    this.subsecciones = sel?.subsecciones || [];
    this.limpiarClasificacion('subseccion');
  }

  onSubseccionChange(): void {
    const sel = this.subsecciones.find(s => s.id_proyecto == this.subseccionId);
    this.subsubsecciones = sel?.subsecciones || [];
    this.series = sel?.series || [];
    this.limpiarClasificacion('serie');
  }

  onSubSubseccionChange(): void {
    const sel = this.subsubsecciones.find(s => s.id_proyecto == this.subsubseccionId);
    this.series = sel?.series || [];
    this.limpiarClasificacion('serie');
  }

  onSerieChange(): void {
    const sel = this.series.find(s => s.id_serie == this.serieId);
    this.subseries = sel?.hijos || sel?.hijos_recursivos || [];
    this.subserieId = '';
    this.prepararUbicacion();
  }

  onSubserieChange(): void {
    this.prepararUbicacion();
  }

  protected limpiarClasificacion(nivel: 'subseccion' | 'serie'): void {
    if (nivel === 'subseccion') {
      this.subseccionId = '';
      this.subsubsecciones = [];
      this.subsubseccionId = '';
      this.series = [];
    }

    this.serieId = '';
    this.subserieId = '';
    this.subseries = [];
    this.limpiarUbicacion();
  }

  // ====================================================
  // UBICACIÓN TOPOGRÁFICA
  // ====================================================

  /** Al elegir serie o subserie se habilita el lado derecho */
  protected prepararUbicacion(): void {
    this.limpiarUbicacion();

    if (!this.idSerieSubserie) { return; }

    this.cargarEdificios();
  }

  protected limpiarUbicacion(): void {
    this.edificios = [];
    this.salas = [];
    this.estanterias = [];
    this.filas = [];
    this.cajas = [];
    this.carpetas = [];

    this.idEdificio = '';
    this.idSala = '';
    this.idEstanteria = '';
    this.idFila = '';
    this.idCaja = '';
    this.idCarpeta = '';
  }

  /** Normaliza la respuesta a un array (res.data o res) */
  protected aLista(res: any): any[] {
    return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  }

  cargarEdificios(): void {
    const idEmpresa = this.usuarioActual?.id_empresa;
    if (!idEmpresa) { return; }

    this.indexacionService.listarEdificiosPorEmpresa({ id_empresa: idEmpresa }).subscribe({
      next: (res: any) => {
        this.edificios = this.aLista(res).map((e: any) => ({ id: e.id_edificio ?? e.id, nombre: e.nombre }));
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('No se pudieron cargar los edificios')
    });
  }

  onEdificioChange(): void {
    this.salas = []; this.estanterias = []; this.filas = []; this.cajas = []; this.carpetas = [];
    this.idSala = this.idEstanteria = this.idFila = this.idCaja = this.idCarpeta = '';

    if (!this.idEdificio) { return; }

    this.indexacionService.listarSalasPorEdificio({ id_edificio: this.idEdificio }).subscribe({
      next: (res: any) => {
        this.salas = this.aLista(res).map((s: any) => ({ id: s.id_sala ?? s.id, nombre: s.nombre }));
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('No se pudieron cargar las salas')
    });
  }

  onSalaChange(): void {
    this.estanterias = []; this.filas = []; this.cajas = []; this.carpetas = [];
    this.idEstanteria = this.idFila = this.idCaja = this.idCarpeta = '';

    if (!this.idSala) { return; }

    this.indexacionService.listarEstanteriasPorSala({ id_sala: this.idSala }).subscribe({
      next: (res: any) => {
        this.estanterias = this.aLista(res).map((e: any) => ({
          id: e.id ?? e.id_estanteria,
          nombre: e.nombre ?? e.codigo ?? e.descripcion
        }));
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('No se pudieron cargar las estanterías')
    });
  }

  onEstanteriaChange(): void {
    this.filas = []; this.cajas = []; this.carpetas = [];
    this.idFila = this.idCaja = this.idCarpeta = '';

    if (!this.idEstanteria) { return; }

    this.indexacionService.listarFilasPorEstanteria({ id_estanteria: this.idEstanteria }).subscribe({
      next: (res: any) => {
        this.filas = this.aLista(res).map((f: any) => ({
          id: f.id ?? f.id_fila,
          nombre: f.nombre ?? f.codigo ?? f.descripcion
        }));
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('No se pudieron cargar las filas')
    });
  }

  onFilaChange(): void {
    this.cajas = []; this.carpetas = [];
    this.idCaja = this.idCarpeta = '';

    if (!this.idFila) { return; }

    this.indexacionService.listarCajasPorFila({ id_fila: this.idFila }).subscribe({
      next: (res: any) => {
        this.cajas = this.aLista(res).map((c: any) => ({
          id: c.id ?? c.id_caja,
          nombre: c.nombre ?? c.numero_caja ?? c.codigo
        }));
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('No se pudieron cargar las cajas')
    });
  }

  onCajaChange(): void {
    this.carpetas = [];
    this.idCarpeta = '';

    if (!this.idCaja) { return; }

    this.indexacionService.listarCarpetasPorCaja({ id_caja: this.idCaja }).subscribe({
      next: (res: any) => {
        this.carpetas = this.aLista(res).map((c: any) => ({
          id: c.id ?? c.id_carpeta,
          nombre: c.nombre ?? c.codigo ?? c.descripcion
        }));
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('No se pudieron cargar las carpetas')
    });
  }

  // ====================================================
  // GUARDADO
  // ====================================================

  protected nombrePorId(lista: any[], id: any): string {
    const item = (lista || []).find((x: any) => x.id == id);
    return item ? (item.nombre ?? '') : '';
  }

  /** Ruta legible con los niveles elegidos, de edificio hacia abajo */
  get rutaTexto(): string {
    const partes = [
      this.nombrePorId(this.edificios, this.idEdificio),
      this.nombrePorId(this.salas, this.idSala),
      this.nombrePorId(this.estanterias, this.idEstanteria),
      this.nombrePorId(this.filas, this.idFila),
      this.nombrePorId(this.cajas, this.idCaja),
      this.nombrePorId(this.carpetas, this.idCarpeta),
    ].filter(p => p !== '');

    return partes.join(' / ');
  }

  /**
   * Ids de cada nivel elegido. Se guardan todos los que tenga la ruta: si llega
   * hasta carpeta van los seis, y si quedó en estantería van sólo los tres
   * primeros. Así después se sabe hasta dónde llega y se puede rearmar.
   */
  protected idsUbicacion(): any {
    const num = (v: any) => (v ? Number(v) : null);

    return {
      id_edificio:   num(this.idEdificio),
      id_sala:       num(this.idSala),
      id_estanteria: num(this.idEstanteria),
      id_fila:       num(this.idFila),
      id_caja:       num(this.idCaja),
      id_carpeta:    num(this.idCarpeta),
    };
  }

  /**
   * Muestra el mensaje que manda el backend (por ejemplo, que la ruta ya
   * existe) y sólo cae al genérico si la respuesta no trae ninguno.
   */
  protected mostrarError(err: any, generico: string): void {
    const mensaje = err?.error?.message;

    if (mensaje) {
      Swal.fire('Atención', mensaje, 'warning');
      return;
    }

    Swal.fire('Error', generico, 'error');
  }

  guardar(): void {
    if (!this.idSerieSubserie) {
      Swal.fire('Falta selección', 'Debe seleccionar una Serie o Sub-Serie.', 'warning');
      return;
    }

    if (!this.idEdificio) {
      Swal.fire('Falta selección', 'Debe seleccionar al menos el Edificio de la ubicación.', 'warning');
      return;
    }

    const ruta = this.rutaTexto;

    if (!ruta) {
      Swal.fire('Falta selección', 'No se pudo armar la ruta con lo seleccionado.', 'warning');
      return;
    }

    this.guardando = true;

    this.etiquetaService.guardarEtiqueta({
      ruta,
      id_empresa: this.usuarioActual?.id_empresa,
      id_usuario: this.usuarioActual?.id,
      id_serie_subserie: this.idSerieSubserie,
      ...this.idsUbicacion()
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.toast.success('Ruta guardada correctamente');
        this.activeModal.close(true);
      },
      error: (err) => {
        this.guardando = false;
        console.error('Error guardando la etiqueta:', err);
        this.mostrarError(err, 'No se pudo guardar la ruta.');
      }
    });
  }
}
