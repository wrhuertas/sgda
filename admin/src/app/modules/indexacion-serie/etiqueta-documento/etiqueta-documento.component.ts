import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { IndexacionSerieService } from '../service/indexacion-serie.service';
import { MostrarEtiquetaComponent } from '../mostrar-etiqueta/mostrar-etiqueta.component';

@Component({
  selector: 'app-etiqueta-documento',
  templateUrl: './etiqueta-documento.component.html',
  styleUrls: ['./etiqueta-documento.component.scss']
})
export class EtiquetaDocumentoComponent implements OnInit {

  // Datos recibidos del componente padre (fila = lugar/ubicación)
  @Input() lugar: any = null;
  @Input() idSerie: number | null = null;

  /** Sección / subsección / serie de donde viene, para mostrarla en el modal */
  @Input() rutaDocumental: string = '';

  // Tipo de etiqueta seleccionado: 'barras' | 'qr'
  tipoEtiqueta: string = 'barras';

  id_empresa: number | null = null;

  // Si el edificio/sala vienen de la fila seleccionada, se toman fijos
  desdeFila: boolean = false;
  nombreEdificio: string = '';
  nombreSala: string = '';

  // Listas por nivel (ubicación topográfica)
  edificios: any[] = [];
  salas: any[] = [];
  estanterias: any[] = [];
  filas: any[] = [];
  cajas: any[] = [];
  carpetas: any[] = [];

  // Selecciones
  idEdificio: number | null = null;
  idSala: number | null = null;
  idEstanteria: number | null = null;
  idFila: number | null = null;
  idCaja: number | null = null;
  idCarpeta: number | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal,
    private indexacionService: IndexacionSerieService,
    private toast: ToastrService
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.id_empresa = user?.id_empresa ?? null;

    // Tomar edificio y sala de la fila seleccionada
    this.idEdificio = this.lugar?.id_edificio ?? null;
    this.idSala = this.lugar?.id_sala ?? null;
    this.nombreEdificio = this.lugar?.edificio ?? '';
    this.nombreSala = this.lugar?.sala ?? '';
    this.desdeFila = !!(this.idEdificio && this.idSala);

    if (this.desdeFila) {
      // Arrancar la selección directamente desde Estantería (de esa sala)
      this.cargarEstanterias();
    } else {
      // Fallback: si la fila no trae edificio/sala, permitir seleccionarlos
      this.cargarEdificios();
    }
  }

  // Normaliza la respuesta a un array (res.data o res)
  private aLista(res: any): any[] {
    return Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
  }

  cargarEdificios(): void {
    if (!this.id_empresa) { return; }
    this.indexacionService.listarEdificiosPorEmpresa({ id_empresa: this.id_empresa }).subscribe({
      next: (res: any) => {
        this.edificios = this.aLista(res).map((e: any) => ({ id: e.id_edificio ?? e.id, nombre: e.nombre }));
      },
      error: () => this.toast.error('No se pudieron cargar los edificios')
    });
  }

  onEdificioChange(): void {
    this.salas = []; this.estanterias = []; this.filas = []; this.cajas = []; this.carpetas = [];
    this.idSala = this.idEstanteria = this.idFila = this.idCaja = this.idCarpeta = null;
    if (!this.idEdificio) { return; }
    this.indexacionService.listarSalasPorEdificio({ id_edificio: this.idEdificio }).subscribe({
      next: (res: any) => {
        this.salas = this.aLista(res).map((s: any) => ({ id: s.id_sala ?? s.id, nombre: s.nombre }));
      },
      error: () => this.toast.error('No se pudieron cargar las salas')
    });
  }

  onSalaChange(): void {
    this.cargarEstanterias();
  }

  cargarEstanterias(): void {
    this.estanterias = []; this.filas = []; this.cajas = []; this.carpetas = [];
    this.idEstanteria = this.idFila = this.idCaja = this.idCarpeta = null;
    if (!this.idSala) { return; }
    this.indexacionService.listarEstanteriasPorSala({ id_sala: this.idSala }).subscribe({
      next: (res: any) => {
        this.estanterias = this.aLista(res).map((e: any) => ({ id: e.id ?? e.id_estanteria, nombre: e.nombre ?? e.codigo ?? e.descripcion }));
      },
      error: () => this.toast.error('No se pudieron cargar las estanterías')
    });
  }

  onEstanteriaChange(): void {
    this.filas = []; this.cajas = []; this.carpetas = [];
    this.idFila = this.idCaja = this.idCarpeta = null;
    if (!this.idEstanteria) { return; }
    this.indexacionService.listarFilasPorEstanteria({ id_estanteria: this.idEstanteria }).subscribe({
      next: (res: any) => {
        this.filas = this.aLista(res).map((f: any) => ({ id: f.id ?? f.id_fila, nombre: f.nombre ?? f.codigo ?? f.descripcion }));
      },
      error: () => this.toast.error('No se pudieron cargar las filas')
    });
  }

  onFilaChange(): void {
    this.cajas = []; this.carpetas = [];
    this.idCaja = this.idCarpeta = null;
    if (!this.idFila) { return; }
    this.indexacionService.listarCajasPorFila({ id_fila: this.idFila }).subscribe({
      next: (res: any) => {
        this.cajas = this.aLista(res).map((c: any) => ({ id: c.id ?? c.id_caja, nombre: c.nombre ?? c.codigo ?? c.descripcion }));
      },
      error: () => this.toast.error('No se pudieron cargar las cajas')
    });
  }

  onCajaChange(): void {
    this.carpetas = [];
    this.idCarpeta = null;
    if (!this.idCaja) { return; }
    this.indexacionService.listarCarpetasPorCaja({ id_caja: this.idCaja }).subscribe({
      next: (res: any) => {
        this.carpetas = this.aLista(res).map((c: any) => ({ id: c.id ?? c.id_carpeta, nombre: c.nombre ?? c.codigo ?? c.descripcion }));
      },
      error: () => this.toast.error('No se pudieron cargar las carpetas')
    });
  }

  generar(): void {
    // La observación se guarda en el punto más profundo que haya elegido:
    // si llegó hasta la carpeta va ahí, si sólo llegó a la caja va en la caja
    const niveles: Array<{ nivel: string, id: number | null }> = [
      { nivel: 'estanteria', id: this.idEstanteria },
      { nivel: 'fila',       id: this.idFila },
      { nivel: 'caja',       id: this.idCaja },
      { nivel: 'carpeta',    id: this.idCarpeta }
    ];

    const elegido = niveles.filter((n) => !!n.id).pop();

    if (!elegido) {
      this.toast.warning('Seleccione al menos la estantería');
      return;
    }

    const modalRef = this.modalService.open(MostrarEtiquetaComponent, {
      centered: true,
      size: 'md'
    });

    // El nivel y la ruta van antes que el id: el id dispara la carga
    modalRef.componentInstance.nivel = elegido.nivel;
    modalRef.componentInstance.nombreUbicacion = this.nombrePorId(
      { estanteria: this.estanterias, fila: this.filas, caja: this.cajas, carpeta: this.carpetas }[elegido.nivel] || [],
      elegido.id
    );
    modalRef.componentInstance.rutaCompleta = this.rutaCompletaHasta(elegido.nivel);
    modalRef.componentInstance.idUbicacion = elegido.id;
  }

  /**
   * Arma la ruta entera para mostrarla en el modal: desde la sección
   * documental hasta el nivel de ubicación física que se está observando.
   */
  private rutaCompletaHasta(nivel: string): string {
    const tramos: string[] = [];

    if (this.rutaDocumental) { tramos.push(this.rutaDocumental); }
    if (this.nombreEdificio) { tramos.push(this.nombreEdificio); }
    if (this.nombreSala) { tramos.push(this.nombreSala); }

    const fisicos = [
      { nivel: 'estanteria', lista: this.estanterias, id: this.idEstanteria },
      { nivel: 'fila',       lista: this.filas,       id: this.idFila },
      { nivel: 'caja',       lista: this.cajas,       id: this.idCaja },
      { nivel: 'carpeta',    lista: this.carpetas,    id: this.idCarpeta }
    ];

    for (const f of fisicos) {
      const nombre = this.nombrePorId(f.lista, f.id);
      if (nombre) { tramos.push(nombre); }
      // No se sigue más allá del nivel que se está observando
      if (f.nivel === nivel) { break; }
    }

    return tramos.join(' / ');
  }

  // Generar la etiqueta (barras/QR) para un nivel específico
  generarEtiquetaNivel(nivel: string, id: number | null): void {
    if (!id) { return; }

    // Construir el código con la ruta topográfica hasta el nivel seleccionado
    const partes: string[] = [];
    if (this.idEdificio) partes.push('E' + this.idEdificio);
    if (this.idSala) partes.push('S' + this.idSala);

    const niveles = ['estanteria', 'fila', 'caja', 'carpeta'];
    const idsPorNivel: { [k: string]: number | null } = {
      estanteria: this.idEstanteria,
      fila: this.idFila,
      caja: this.idCaja,
      carpeta: this.idCarpeta
    };
    const prefijos: { [k: string]: string } = { estanteria: 'ES', fila: 'F', caja: 'C', carpeta: 'CP' };
    for (const n of niveles) {
      if (idsPorNivel[n]) partes.push(prefijos[n] + idsPorNivel[n]);
      if (n === nivel) break;
    }

    const codigo = partes.join('-');
    const titulo = `${this.nombreEdificio} / ${this.nombreSala} · ${nivel.toUpperCase()}`;

    // Nombres de ubicación SOLO hasta el nivel seleccionado
    const ubicacion: any = { edificio: this.nombreEdificio, sala: this.nombreSala, estanteria: '', fila: '', caja: '', carpeta: '' };
    const listas: { [k: string]: any[] } = { estanteria: this.estanterias, fila: this.filas, caja: this.cajas, carpeta: this.carpetas };
    const idsSel: { [k: string]: number | null } = { estanteria: this.idEstanteria, fila: this.idFila, caja: this.idCaja, carpeta: this.idCarpeta };
    for (const n of niveles) {
      ubicacion[n] = this.nombrePorId(listas[n], idsSel[n]);
      if (n === nivel) break;
    }

    // Desde "caja" en adelante se muestra la etiqueta completa
    const completo = (nivel === 'caja' || nivel === 'carpeta');

    const modalRef = this.modalService.open(MostrarEtiquetaComponent, {
      centered: true,
      size: 'xl'
    });
    modalRef.componentInstance.tipo = this.tipoEtiqueta;
    modalRef.componentInstance.codigo = codigo;
    modalRef.componentInstance.titulo = titulo;
    modalRef.componentInstance.nivel = nivel;
    modalRef.componentInstance.completo = completo;
    modalRef.componentInstance.ubicacion = ubicacion;
    modalRef.componentInstance.cajaNumero = ubicacion.caja || '';

    // Sin el id no se puede guardar la observación: es lo único que necesita.
    // Se asigna al final porque es lo que dispara la carga de lo guardado.
    modalRef.componentInstance.nombreUbicacion = ubicacion[nivel] || '';
    modalRef.componentInstance.rutaCompleta = this.rutaCompletaHasta(nivel);
    modalRef.componentInstance.idUbicacion = id;
  }

  private nombrePorId(lista: any[], id: number | null): string {
    const it = (lista || []).find((x: any) => x.id === id);
    return it ? (it.nombre ?? '') : '';
  }
}
