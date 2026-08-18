import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { EtiquetaService } from '../etiqueta/service/etiqueta.service';
import { IndexacionSerieService } from '../../indexacion-serie/service/indexacion-serie.service';
import { ScanDocumentosComponent } from './scan-documentos/scan-documentos.component';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss']
})
export class ScannerComponent implements OnInit {

  // ---------- Clasificación ----------
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

  // ---------- Ubicación topográfica ----------
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

  usuarioActual: any = null;

  constructor(
    public modalService: NgbModal,
    private etiquetaService: EtiquetaService,
    private indexacionService: IndexacionSerieService,
    private toast: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.usuarioActual = JSON.parse(localStorage.getItem('user') || '{}');
    this.cargarSecciones();
  }

  /** El último nivel elegido: la subserie si la hay, si no la serie */
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
        this.cdr.detectChanges();
      },
      error: () => this.toast.error('No se pudieron cargar las secciones')
    });
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

  private limpiarClasificacion(nivel: 'subseccion' | 'serie'): void {
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
  private prepararUbicacion(): void {
    this.limpiarUbicacion();

    if (!this.idSerieSubserie) { return; }

    this.cargarEdificios();
  }

  private limpiarUbicacion(): void {
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
  private aLista(res: any): any[] {
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
  // LECTOR
  // ====================================================

  /**
   * Abre el modal de escaneo con la ruta armada hasta el nivel elegido.
   */
  escanear(nivel: string): void {
    const modalRef = this.modalService.open(ScanDocumentosComponent, {
      centered: true,
      size: 'xl'
    });

    modalRef.componentInstance.RUTA = this.rutaHasta(nivel);
    modalRef.componentInstance.NIVEL = nivel;

    // Los nombres son para mostrar; estos ids son los que van a decidir
    // en qué serie y en qué ubicación física queda guardado el documento
    modalRef.componentInstance.IDS = this.idsDeLaRuta();
  }

  /**
   * Ids de lo que el usuario tiene elegido, listos para mandar al servidor.
   * Se omite lo que esté vacío para no pisar nada con cadenas en blanco.
   */
  private idsDeLaRuta(): { [campo: string]: any } {
    const posibles: { [campo: string]: any } = {
      id_serie:      this.serieId,
      id_subserie:   this.subserieId,
      id_edificio:   this.idEdificio,
      id_sala:       this.idSala,
      id_estanteria: this.idEstanteria,
      id_fila:       this.idFila,
      id_caja:       this.idCaja,
      id_carpeta:    this.idCarpeta
    };

    const ids: { [campo: string]: any } = {};

    Object.keys(posibles).forEach((campo) => {
      const valor = posibles[campo];
      if (valor !== null && valor !== undefined && valor !== '') {
        ids[campo] = valor;
      }
    });

    return ids;
  }

  /**
   * Tramos de la ruta, de la sección hasta el nivel indicado. Sólo se incluyen
   * los que tienen nombre, así no quedan huecos si algún nivel no se eligió.
   */
  private rutaHasta(nivel: string): Array<{ icono: string; paths: number; nombre: string }> {
    const tramos = [
      { clave: 'seccion',     icono: 'ki-folder',         paths: 2, nombre: this.nombrePorId(this.secciones.map(this.aOpcionProyecto), this.seccionId) },
      { clave: 'subseccion',  icono: 'ki-folder',         paths: 2, nombre: this.nombrePorId(this.subsecciones.map(this.aOpcionProyecto), this.subseccionId) },
      { clave: 'subseccion2', icono: 'ki-folder',         paths: 2, nombre: this.nombrePorId(this.subsubsecciones.map(this.aOpcionProyecto), this.subsubseccionId) },
      { clave: 'serie',       icono: 'ki-folder',         paths: 2, nombre: this.nombrePorId(this.series.map(this.aOpcionSerie), this.serieId) },
      { clave: 'subserie',    icono: 'ki-folder',         paths: 2, nombre: this.nombrePorId(this.subseries.map(this.aOpcionSerie), this.subserieId) },
      { clave: 'edificio',    icono: 'ki-bank',           paths: 2, nombre: this.nombrePorId(this.edificios, this.idEdificio) },
      { clave: 'sala',        icono: 'ki-home-2',         paths: 2, nombre: this.nombrePorId(this.salas, this.idSala) },
      { clave: 'estanteria',  icono: 'ki-burger-menu',    paths: 4, nombre: this.nombrePorId(this.estanterias, this.idEstanteria) },
      { clave: 'fila',        icono: 'ki-row-horizontal', paths: 2, nombre: this.nombrePorId(this.filas, this.idFila) },
      { clave: 'caja',        icono: 'ki-parcel',         paths: 5, nombre: this.nombrePorId(this.cajas, this.idCaja) },
      { clave: 'carpeta',     icono: 'ki-folder',         paths: 2, nombre: this.nombrePorId(this.carpetas, this.idCarpeta) },
    ];

    const corte = tramos.findIndex(t => t.clave === nivel);
    const hasta = corte === -1 ? tramos.length : corte + 1;

    return tramos
      .slice(0, hasta)
      .filter(t => t.nombre)
      .map(({ icono, paths, nombre }) => ({ icono, paths, nombre }));
  }

  /** Los proyectos y las series usan otras claves que las listas de ubicación */
  private aOpcionProyecto(p: any) {
    return { id: p.id_proyecto, nombre: p.nombre };
  }

  private aOpcionSerie(s: any) {
    return { id: s.id_serie, nombre: s.nombre };
  }

  // ====================================================
  // RUTA ELEGIDA
  // ====================================================

  private nombrePorId(lista: any[], id: any): string {
    const item = (lista || []).find((x: any) => x.id == id);
    return item ? (item.nombre ?? '') : '';
  }

  /** Ruta legible con los niveles elegidos, de edificio hacia abajo */
  get rutaTexto(): string {
    return [
      this.nombrePorId(this.edificios, this.idEdificio),
      this.nombrePorId(this.salas, this.idSala),
      this.nombrePorId(this.estanterias, this.idEstanteria),
      this.nombrePorId(this.filas, this.idFila),
      this.nombrePorId(this.cajas, this.idCaja),
      this.nombrePorId(this.carpetas, this.idCarpeta),
    ].filter(p => p !== '').join(' / ');
  }
}
