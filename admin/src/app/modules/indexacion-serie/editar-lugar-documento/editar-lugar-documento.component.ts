import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { IndexacionSerieService } from '../service/indexacion-serie.service';

@Component({
  selector: 'app-editar-lugar-documento',
  templateUrl: './editar-lugar-documento.component.html',
  styleUrls: ['./editar-lugar-documento.component.scss']
})
export class EditarLugarDocumentoComponent implements OnInit {
  @Input() idLugarRuta: number | null = null; 
  
  // 👥 Datos del usuario autenticado globales
  usuario_id: number | null = null;
  id_empresa: number | null = null;

  // 🔄 Control de flujo visual
  pasoActual: number = 1; 
  estanteriasLista: any[] = []; 

  // 📝 Variables para los datos cargados
  nombreEdificio: string = '';
  nombreSala: string = '';
  cantidadEstanterias: number | null = null;

  idEdificioActual: number | null = null;
  idSalaActual: number | null = null;
  idEdificioSeleccionado: number | null = null;
  idEdificioCreado: number | null = null;
  salasEdificio: Array<{ id_sala: number; nombre: string; cantidad_estanterias?: number }> = [];
  idSalaSeleccionada: number | null = null;
  idSalaCreada: number | null = null;
  creandoSalaNueva: boolean = false;

  // Variables para estanterías, filas, cajas, carpetas
  selectedEstanteria: any | null = null;
  filasLista: any[] = [];
  cantidadFilasEstanteria: number | null = null;
  selectedFila: any | null = null;
  cajasLista: any[] = [];
  cantidadCajasFila: number | null = null;
  selectedCaja: any | null = null;
  carpetasLista: any[] = [];
  cantidadCarpetasCaja: number | null = null;

  // Estructura completa de la ruta que trae el backend
  estructuraRuta: any = null;
  estanteriasConEstructura: any[] = [];

  // Edificios existentes por empresa
  edificiosEmpresa: Array<{ id_edificio: number; nombre: string }> = [];

  // Modal de crear/editar edificio
  mostrarModalCrearEdificio: boolean = false;
  nuevoEdificioNombre: string = '';
  estaEditandoEdificio: boolean = false;

  // Modal de crear/editar sala
  mostrarModalCrearSala: boolean = false;
  nuevoSalaNombre: string = '';
  estaEditandoSala: boolean = false;
  cantidadEstanteriasModal: number | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private toast: ToastrService,
    private seccionesService: IndexacionSerieService, 
    public modalService: NgbModal,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {} 

  ngOnInit(): void {
    this.cargarUsuarioLogeado();
    console.log('ID Lugar Ruta recibido en el modal:', this.idLugarRuta);
    if (this.id_empresa) {
      this.cargarEdificiosEmpresa();
      if (this.idLugarRuta) {
        this.cargarDetallesRuta();
      }
    }
  }

  private cargarUsuarioLogeado(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.usuario_id = user.id ?? null;
      if (user && user.id_empresa != null) {
        this.id_empresa = user.id_empresa;
      } else {
        this.toast.warning('No se pudo obtener la empresa del usuario actual.', 'Atención');
      }
    } catch (error) {
      console.error('Error al parsear el usuario desde localStorage:', error);
    }
  }

  private cargarDetallesRuta(): void {
    if (!this.idLugarRuta) { return; }
    
    const payload = { id_lugar: this.idLugarRuta };
    this.seccionesService.obtenerDetallesLugar(payload).subscribe({
      next: (resp: any) => {
        // Estructura viene en resp.data.ruta_info y resp.data.contenido
        const ruta_info = resp.data.ruta_info || {};
        const contenido = resp.data.contenido || {};
        
        console.log('ruta_info:', ruta_info);
        console.log('contenido:', contenido);
        
        // Guardar la estructura completa que trae el backend
        this.estructuraRuta = contenido;
        this.estanteriasConEstructura = contenido.estanterias || [];
        
        // Preseleccionar edificio y sala desde ruta_info
        this.idEdificioSeleccionado = ruta_info.id_edificio;
        this.idEdificioCreado = ruta_info.id_edificio;
        this.nombreEdificio = ruta_info.edificio || '';
        
        // Guardar nombre de sala y cantidad de estanterías desde contenido
        this.nombreSala = contenido.nombre || '';
        this.cantidadEstanterias = contenido.cantidad_estanterias || null;
        
        this.cdr.detectChanges();
        this.cdr.markForCheck();
        
        // Cargar salas del edificio seleccionado, pasando el ID de sala a preseleccionar
        this.cargarSalasPorEdificio(ruta_info.id_sala);
      },
      error: (err) => {
        this.toast.error('Error al cargar detalles de la ruta', 'Error');
        console.error(err);
      }
    });
  }

  cerrarModal() {
    this.activeModal.dismiss('cross_click');
  }

  // =========================================================================
  // FUNCIONES DE EDIFICIO
  // =========================================================================

  abrirModalEditarEdificio() {
    if (!this.idEdificioSeleccionado) {
      this.toast.error('Seleccione un edificio primero', 'Error');
      return;
    }
    const edificio = this.edificiosEmpresa.find(e => e.id_edificio === this.idEdificioSeleccionado);
    this.nuevoEdificioNombre = edificio?.nombre || '';
    this.estaEditandoEdificio = true;
    this.mostrarModalCrearEdificio = true;
  }

  cerrarModalEdificio() {
    this.mostrarModalCrearEdificio = false;
    this.nuevoEdificioNombre = '';
    this.estaEditandoEdificio = false;
  }

  guardarNuevoEdificio() {
    if (!this.nuevoEdificioNombre.trim()) {
      this.toast.error('Ingrese un nombre para el edificio', 'Error');
      return;
    }

    this.editarEdificio();
  }

  editarEdificio() {
    const payload = {
      id_edificio: this.idEdificioSeleccionado,
      nombre: this.nuevoEdificioNombre,
      usuario_registro: this.usuario_id
    };

    this.seccionesService.actualizarEdificio(payload).subscribe({
      next: (resp: any) => {
        // Actualizar el nombre en el array sin deseleccionar
        const edificio = this.edificiosEmpresa.find(e => e.id_edificio === this.idEdificioSeleccionado);
        if (edificio) {
          edificio.nombre = this.nuevoEdificioNombre;
        }
        this.nombreEdificio = this.nuevoEdificioNombre;
        this.cdr.detectChanges();
        
        this.toast.success('Edificio actualizado correctamente', 'Éxito');
        this.cerrarModalEdificio();
      },
      error: (err) => {
        this.toast.error('Error al actualizar el edificio', 'Error');
        console.error(err);
      }
    });
  }

  // =========================================================================
  // FUNCIONES DE SALA
  // =========================================================================

  abrirModalEditarSala() {
    if (!this.idSalaSeleccionada) {
      this.toast.error('Seleccione una sala primero', 'Error');
      return;
    }
    const sala = this.salasEdificio.find(s => s.id_sala === this.idSalaSeleccionada);
    this.nuevoSalaNombre = sala?.nombre || '';
    this.cantidadEstanteriasModal = sala?.cantidad_estanterias || null;
    this.estaEditandoSala = true;
    this.mostrarModalCrearSala = true;
  }

  cerrarModalSala() {
    this.mostrarModalCrearSala = false;
    this.nuevoSalaNombre = '';
    this.estaEditandoSala = false;
    this.cantidadEstanteriasModal = null;
  }

  guardarNuevaSala() {
    if (!this.nuevoSalaNombre.trim()) {
      this.toast.error('Ingrese un nombre para la sala', 'Error');
      return;
    }

    this.editarSala();
  }

  editarSala() {
    if (!this.cantidadEstanteriasModal || this.cantidadEstanteriasModal <= 0) {
      this.toast.error('Ingrese una cantidad válida de estanterías (mínimo 1)', 'Error');
      return;
    }

    const payload = {
      id_sala: this.idSalaSeleccionada,
      nombre: this.nuevoSalaNombre,
      cantidad_estanterias: this.cantidadEstanteriasModal,
      usuario_registro: this.usuario_id
    };

    this.seccionesService.actualizarSala(payload).subscribe({
      next: (resp: any) => {
        // Actualizar en el array sin deseleccionar
        const sala = this.salasEdificio.find(s => s.id_sala === this.idSalaSeleccionada);
        if (sala) {
          sala.nombre = this.nuevoSalaNombre;
          sala.cantidad_estanterias = this.cantidadEstanteriasModal || 0;
        }
        this.nombreSala = this.nuevoSalaNombre;
        this.cantidadEstanterias = this.cantidadEstanteriasModal;
        this.cdr.detectChanges();
        
        this.toast.success('Sala actualizada correctamente', 'Éxito');
        this.cerrarModalSala();
      },
      error: (err: any) => {
        const mensaje = err?.error?.message || 'Error al actualizar la sala';
        this.toast.error(mensaje, 'Error');
        console.error(err);
      }
    });
  }

  // =========================================================================
  // FUNCIONES AUXILIARES
  // =========================================================================

  private cargarEdificiosEmpresa() {
    if (!this.id_empresa) { return; }
    const payload = { id_empresa: this.id_empresa } as any;
    this.seccionesService.listarEdificiosPorEmpresa(payload).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.edificiosEmpresa = data.map((e: any) => ({ id_edificio: e.id_edificio || e.id, nombre: e.nombre }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error listando edificios por empresa:', err);
      }
    });
  }

  onSeleccionEdificio(idStr: string) {
    const id = Number(idStr || 0) || null;
    this.idEdificioSeleccionado = id;
    const found = this.edificiosEmpresa.find(e => e.id_edificio === id);
    if (found) {
      this.nombreEdificio = found.nombre;
      this.pasoActual = Math.max(this.pasoActual, 2);
      this.cargarSalasPorEdificio();
    }
  }

  private cargarSalasPorEdificio(idSalaAPreseleccionar?: number) {
    this.salasEdificio = [];
    this.creandoSalaNueva = false;
    if (!this.idEdificioSeleccionado) { return; }
    const payload = { id_edificio: this.idEdificioSeleccionado } as any;
    this.seccionesService.listarSalasPorEdificio(payload).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.salasEdificio = data.map((s: any) => ({ 
          id_sala: s.id_sala || s.id, 
          nombre: s.nombre,
          cantidad_estanterias: s.cantidad_estanterias || 0
        }));
        
        this.cdr.detectChanges();
        this.cdr.markForCheck();
        
        // Si viene un ID de sala a preseleccionar, hacerlo
         if (idSalaAPreseleccionar) {
           setTimeout(() => {
             this.idSalaSeleccionada = idSalaAPreseleccionar;
             this.idSalaCreada = idSalaAPreseleccionar;
             this.cdr.detectChanges();
             this.cdr.markForCheck();
             this.listarEstanterias();
           }, 500);
         } else {
           this.idSalaSeleccionada = null;
         }
        
        this.pasoActual = Math.max(this.pasoActual, 2);
      },
      error: (err) => console.error('Error listando salas por edificio:', err)
    });
  }

  onSeleccionSala(idStr: string) {
    this.creandoSalaNueva = false;
    const id = Number(idStr || 0) || null;
    this.idSalaSeleccionada = id;
    if (this.idSalaSeleccionada) {
      this.listarEstanterias();
    }
  }

  private listarEstanterias() {
    if (!this.idSalaSeleccionada) { return; }
    const payload = { id_sala: this.idSalaSeleccionada };
    this.seccionesService.listarEstanteriasPorSala(payload).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
    this.estanteriasLista = lista.map((e: any) => ({
          id: e.id || e.id_estanteria || null,
          nombre: e.nombre || e.codigo || e.descripcion || '',
          cantidad_filas: e.cantidad_filas ?? null,
          guardado: !!e.cantidad_filas
        }));
        // Orden natural por id o número en el nombre
        this.estanteriasLista.sort((a: any, b: any) => {
          const extractNum = (v: any) => { const m = String(v || '').match(/-?\d+/); return m ? Number(m[0]) : NaN; };
          const na = !isNaN(Number(a.id)) ? Number(a.id) : extractNum(a.nombre);
          const nb = !isNaN(Number(b.id)) ? Number(b.id) : extractNum(b.nombre);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return String(a.nombre || '').localeCompare(String(b.nombre || ''));
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast.error('No se pudieron cargar las estanterías desde la base de datos.', 'Error');
        console.error('Error listando estanterías:', err);
      }
    });
  }

  seleccionarEstanteria(estanteria: any) {
    this.selectedEstanteria = estanteria;
    this.filasLista = [];
    this.cantidadFilasEstanteria = null;
    this.cargarFilasPorEstanteria();
  }

  // --- Edición inline: Estantería ---
  startEditNombreEstanteria(estanteria: any, event?: Event) {
    if (event) { try { event.preventDefault(); } catch {} }
    // Seleccionar para cargar filas
    this.seleccionarEstanteria(estanteria);
    estanteria._originalName = estanteria._originalName ?? estanteria.nombre;
    this.estanteriasLista.forEach((e: any) => { if (e !== estanteria) e.isEditingName = false; });
    estanteria.isEditingName = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      const inp = document.querySelector(`[data-est-id="${estanteria.id}"]`) as HTMLInputElement | null;
      if (inp) { inp.focus(); inp.select(); }
    }, 50);
  }

  guardarNombreEstanteria(estanteria: any) {
    if (!estanteria) return;
    const nuevo = String(estanteria.nombre || '').trim();
    if (nuevo === '') { this.toast.error('El nombre no puede quedar vacío', 'Error'); return; }
    if (estanteria._originalName === nuevo) { estanteria.isEditingName = false; return; }

    const payload: any = { id_estanteria: estanteria.id, nombre: nuevo, usuario_registro: this.usuario_id };
    this.seccionesService.actualizarEstanteria(payload).subscribe({
      next: (resp: any) => {
        this.toast.success('Nombre de estantería actualizado', 'Éxito');
        estanteria.isEditingName = false;
        this.listarEstanterias();
      },
      error: (err: any) => {
        console.error('Error actualizando estantería:', err);
        this.toast.error('No se pudo actualizar el nombre', 'Error');
        estanteria.nombre = estanteria._originalName ?? estanteria.nombre;
        estanteria.isEditingName = false;
      }
    });
  }

  cancelarEditNombreEstanteria(estanteria: any) {
    estanteria.nombre = estanteria._originalName ?? estanteria.nombre;
    estanteria.isEditingName = false;
  }

  private cargarFilasPorEstanteria() {
    if (!this.selectedEstanteria?.id) { return; }
    this.selectedFila = null;
    const payload = { id_estanteria: this.selectedEstanteria.id };
    this.seccionesService.listarFilasPorEstanteria(payload).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.filasLista = lista.map((f: any, i: number) => ({
          id: f.id_fila || f.id || i,
          nombre: f.nombre || f.codigo || f.descripcion || `Fila ${i + 1}`,
          cantidad_cajas: (f.cantidad_cajas != null ? f.cantidad_cajas : 0)
        }));
        // Orden natural por id o número en el nombre
        this.filasLista.sort((a: any, b: any) => {
          const extractNum = (v: any) => { const m = String(v || '').match(/-?\d+/); return m ? Number(m[0]) : NaN; };
          const na = !isNaN(Number(a.id)) ? Number(a.id) : extractNum(a.nombre);
          const nb = !isNaN(Number(b.id)) ? Number(b.id) : extractNum(b.nombre);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return String(a.nombre || '').localeCompare(String(b.nombre || ''));
        });
        if (this.selectedEstanteria?.cantidad_filas != null) {
          this.cantidadFilasEstanteria = this.selectedEstanteria.cantidad_filas;
        } else {
          this.cantidadFilasEstanteria = this.filasLista.length || 0;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast.error('No se pudieron cargar las filas de la estantería.', 'Error');
        console.error('Error listando filas:', err);
      }
    });
  }

  seleccionarFila(fila: any) {
    this.selectedFila = fila;
    this.cargarCajasPorFila();
    this.cdr.detectChanges();
  }

  // --- Edición inline: Fila ---
  startEditNombreFila(fila: any, event?: Event) {
    if (event) { try { event.preventDefault(); } catch {} }
    this.seleccionarFila(fila);
    fila._originalName = fila._originalName ?? fila.nombre;
    this.filasLista.forEach((r: any) => { if (r !== fila) r.isEditingName = false; });
    fila.isEditingName = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      const inp = document.querySelector(`[data-f-id="${fila.id}"]`) as HTMLInputElement | null;
      if (inp) { inp.focus(); inp.select(); }
    }, 50);
  }

  guardarNombreFila(fila: any) {
    if (!fila) return;
    const nuevo = String(fila.nombre || '').trim();
    if (nuevo === '') { this.toast.error('El nombre no puede quedar vacío', 'Error'); return; }
    if (fila._originalName === nuevo) { fila.isEditingName = false; return; }

    const payload: any = { id_fila: fila.id, cantidad_cajas: fila.cantidad_cajas ?? 0, usuario_registro: this.usuario_id, nombre: nuevo };
    this.seccionesService.actualizarFila(payload).subscribe({
      next: (resp: any) => {
        this.toast.success('Nombre de fila actualizado', 'Éxito');
        fila.isEditingName = false;
        this.cargarCajasPorFila();
        this.cargarFilasPorEstanteria();
      },
      error: (err: any) => {
        console.error('Error actualizando fila:', err);
        this.toast.error('No se pudo actualizar el nombre', 'Error');
        fila.nombre = fila._originalName ?? fila.nombre;
        fila.isEditingName = false;
      }
    });
  }

  cancelarEditNombreFila(fila: any) {
    fila.nombre = fila._originalName ?? fila.nombre;
    fila.isEditingName = false;
  }

  private cargarCajasPorFila() {
    if (!this.selectedFila?.id) { this.cajasLista = []; return; }
    const payload = { id_fila: this.selectedFila.id };
    this.seccionesService.listarCajasPorFila(payload).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.cajasLista = lista.map((c: any, i: number) => ({
          id: c.id_caja || c.id || i,
          nombre: c.nombre || `Caja ${c.numero_caja || (i + 1)}`,
          numero_caja: c.numero_caja || (i + 1),
          cantidad_carpetas: (c.cantidad_carpetas != null ? c.cantidad_carpetas : 0)
        }));
        // Orden natural por numero_caja o id
        this.cajasLista.sort((a: any, b: any) => {
          const na = Number(a.numero_caja ?? a.id ?? NaN);
          const nb = Number(b.numero_caja ?? b.id ?? NaN);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          if (a.id && b.id) return Number(a.id) - Number(b.id);
          return String(a.nombre).localeCompare(String(b.nombre));
        });
        this.cantidadCajasFila = this.cajasLista.length || 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast.error('No se pudieron cargar las cajas de la fila.', 'Error');
        console.error('Error listando cajas:', err);
      }
    });
  }

  seleccionarCaja(caja: any) {
    this.selectedCaja = caja;
    this.cargarCarpetasPorCaja();
    this.cdr.detectChanges();
  }

  // --- Edición inline: Caja ---
  startEditNombreCaja(caja: any, event?: Event) {
    if (event) { try { event.preventDefault(); } catch {} }
    this.seleccionarCaja(caja);
    caja._originalName = caja._originalName ?? caja.nombre;
    this.cajasLista.forEach((r: any) => { if (r !== caja) r.isEditingName = false; });
    caja.isEditingName = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      const inp = document.querySelector(`[data-c-id="${caja.id}"]`) as HTMLInputElement | null;
      if (inp) { inp.focus(); inp.select(); }
    }, 50);
  }

  guardarNombreCaja(caja: any) {
    if (!caja) return;
    const nuevo = String(caja.nombre || '').trim();
    if (nuevo === '') { this.toast.error('El nombre no puede quedar vacío', 'Error'); return; }
    if (caja._originalName === nuevo) { caja.isEditingName = false; return; }

    const payload: any = { id_caja: caja.id, cantidad_carpetas: caja.cantidad_carpetas ?? 0, usuario_registro: this.usuario_id, nombre: nuevo };
    this.seccionesService.actualizarCaja(payload).subscribe({
      next: (resp: any) => {
        this.toast.success('Nombre de caja actualizado', 'Éxito');
        caja.isEditingName = false;
        this.cargarCarpetasPorCaja();
        this.cargarCajasPorFila();
      },
      error: (err: any) => {
        console.error('Error actualizando caja:', err);
        this.toast.error('No se pudo actualizar el nombre', 'Error');
        caja.nombre = caja._originalName ?? caja.nombre;
        caja.isEditingName = false;
      }
    });
  }

  cancelarEditNombreCaja(caja: any) {
    caja.nombre = caja._originalName ?? caja.nombre;
    caja.isEditingName = false;
  }

  private cargarCarpetasPorCaja() {
    if (!this.selectedCaja?.id) { this.carpetasLista = []; return; }
    const payload = { id_caja: this.selectedCaja.id };
    this.seccionesService.listarCarpetasPorCaja(payload).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.carpetasLista = lista.map((k: any, i: number) => ({
          id: k.id_carpeta || k.id || i,
          nombre: k.nombre || `Carpeta ${i + 1}`,
          numero_documentos: (k.numero_documentos != null ? k.numero_documentos : 0)
        }));
        // Orden natural por id o número en el nombre
        this.carpetasLista.sort((a: any, b: any) => {
          const extractNum = (v: any) => { const m = String(v || '').match(/-?\d+/); return m ? Number(m[0]) : NaN; };
          const na = !isNaN(Number(a.id)) ? Number(a.id) : extractNum(a.nombre);
          const nb = !isNaN(Number(b.id)) ? Number(b.id) : extractNum(b.nombre);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return String(a.nombre || '').localeCompare(String(b.nombre || ''));
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast.error('No se pudieron cargar las carpetas de la caja.', 'Error');
        console.error('Error listando carpetas:', err);
      }
    });
  }

  // --- Edición inline: Carpeta ---
  startEditNombreCarpeta(carpeta: any, event?: Event) {
    if (event) { try { event.preventDefault(); } catch {} }
    carpeta._originalName = carpeta._originalName ?? carpeta.nombre;
    this.carpetasLista.forEach((r: any) => { if (r !== carpeta) r.isEditingName = false; });
    carpeta.isEditingName = true;
    this.cdr.detectChanges();
    setTimeout(() => {
      const inp = document.querySelector(`[data-ca-id="${carpeta.id}"]`) as HTMLInputElement | null;
      if (inp) { inp.focus(); inp.select(); }
    }, 50);
  }

  guardarNombreCarpeta(carpeta: any) {
    if (!carpeta) return;
    const nuevo = String(carpeta.nombre || '').trim();
    if (nuevo === '') { this.toast.error('El nombre no puede quedar vacío', 'Error'); return; }
    if (carpeta._originalName === nuevo) { carpeta.isEditingName = false; return; }

    const payload: any = { id_carpeta: carpeta.id, numero_documentos: carpeta.numero_documentos ?? 0, usuario_registro: this.usuario_id, nombre: nuevo };
    this.seccionesService.actualizarCarpeta(payload).subscribe({
      next: (resp: any) => {
        this.toast.success('Nombre de carpeta actualizado', 'Éxito');
        carpeta.isEditingName = false;
        this.cargarCarpetasPorCaja();
      },
      error: (err: any) => {
        console.error('Error actualizando carpeta:', err);
        this.toast.error('No se pudo actualizar el nombre', 'Error');
        carpeta.nombre = carpeta._originalName ?? carpeta.nombre;
        carpeta.isEditingName = false;
      }
    });
  }

  cancelarEditNombreCarpeta(carpeta: any) {
    carpeta.nombre = carpeta._originalName ?? carpeta.nombre;
    carpeta.isEditingName = false;
  }

  // =========================================================================
  // GUARDAR CANTIDADES POR NIVEL
  // =========================================================================

  // Estantería: guarda la cantidad de filas (crea/ajusta las filas)
  guardarCantidadEstanteria(estanteria: any) {
    if (!estanteria?.id) { return; }
    const cantidad = Number(estanteria.cantidad_filas);
    if (isNaN(cantidad) || cantidad < 1) {
      this.toast.error('Ingrese una cantidad válida de filas (mínimo 1)', 'Error');
      return;
    }
    const payload = { estanteria_id: estanteria.id, cantidad: cantidad, usuario_registro: this.usuario_id };
    this.seccionesService.registrarFilas(payload).subscribe({
      next: () => {
        this.toast.success('Filas actualizadas correctamente', 'Éxito');
        estanteria.guardado = true;
        if (this.selectedEstanteria?.id === estanteria.id) { this.cargarFilasPorEstanteria(); }
        this.listarEstanterias();
      },
      error: (err: any) => {
        console.error('Error guardando cantidad de filas:', err);
        this.toast.error('No se pudieron actualizar las filas', 'Error');
      }
    });
  }

  // Fila: guarda la cantidad de cajas (crea/ajusta los registros de cajas)
  guardarCantidadFila(fila: any) {
    if (!fila?.id) { return; }
    const cantidad = Number(fila.cantidad_cajas);
    if (isNaN(cantidad) || cantidad < 0) {
      this.toast.error('Ingrese una cantidad válida de cajas', 'Error');
      return;
    }
    const payload = { fila_id: fila.id, cantidad: cantidad, usuario_registro: this.usuario_id };
    this.seccionesService.registrarCajas(payload).subscribe({
      next: () => {
        this.toast.success('Cajas actualizadas correctamente', 'Éxito');
        // Seleccionar la fila para ver sus cajas y recargarlas
        this.seleccionarFila(fila);
        this.cargarFilasPorEstanteria();
      },
      error: (err: any) => {
        console.error('Error guardando cantidad de cajas:', err);
        this.toast.error('No se pudieron actualizar las cajas', 'Error');
      }
    });
  }

  // Caja: guarda la cantidad de carpetas (crea/ajusta los registros de carpetas)
  guardarCantidadCaja(caja: any) {
    if (!caja?.id) { return; }
    const cantidad = Number(caja.cantidad_carpetas);
    if (isNaN(cantidad) || cantidad < 0) {
      this.toast.error('Ingrese una cantidad válida de carpetas', 'Error');
      return;
    }
    const payload = { caja_id: caja.id, cantidad: cantidad, usuario_registro: this.usuario_id };
    this.seccionesService.registrarCarpetas(payload).subscribe({
      next: () => {
        this.toast.success('Carpetas actualizadas correctamente', 'Éxito');
        // Seleccionar la caja para ver sus carpetas y recargarlas
        this.seleccionarCaja(caja);
        this.cargarCajasPorFila();
      },
      error: (err: any) => {
        console.error('Error guardando cantidad de carpetas:', err);
        this.toast.error('No se pudieron actualizar las carpetas', 'Error');
      }
    });
  }

  // Carpeta: guarda el número de documentos
  guardarCantidadCarpeta(carpeta: any) {
    if (!carpeta?.id) { return; }
    const cantidad = Number(carpeta.numero_documentos);
    if (isNaN(cantidad) || cantidad < 0) {
      this.toast.error('Ingrese un número válido de documentos', 'Error');
      return;
    }
    const payload = { id_carpeta: carpeta.id, numero_documentos: cantidad };
    this.seccionesService.actualizarCarpeta(payload).subscribe({
      next: () => {
        this.toast.success('Documentos actualizados correctamente', 'Éxito');
        this.cargarCarpetasPorCaja();
      },
      error: (err: any) => {
        console.error('Error guardando número de documentos:', err);
        this.toast.error('No se pudieron actualizar los documentos', 'Error');
      }
    });
  }

  // Eliminar (desactivar) una estantería
  eliminarEstanteria(estanteria: any) {
    if (!estanteria?.id) { return; }
    Swal.fire({
      title: '¿Eliminar estantería?',
      html: `Se eliminará la estantería <strong>${estanteria.nombre || ''}</strong> y su contenido.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33'
    }).then(result => {
      if (!result.isConfirmed) { return; }
      this.seccionesService.desactivarEstanteria({ id_estanteria: estanteria.id, usuario_registro: this.usuario_id }).subscribe({
        next: () => {
          this.toast.success('Estantería eliminada correctamente', 'Éxito');
          // Limpiar selección si era la eliminada
          if (this.selectedEstanteria?.id === estanteria.id) {
            this.selectedEstanteria = null;
            this.filasLista = [];
            this.selectedFila = null;
            this.cajasLista = [];
            this.selectedCaja = null;
            this.carpetasLista = [];
          }
          this.listarEstanterias();
        },
        error: (err: any) => {
          console.error('Error eliminando estantería:', err);
          this.toast.error('No se pudo eliminar la estantería', 'Error');
        }
      });
    });
  }

  actualizarRuta() {
    this.toast.success('Ruta de almacenamiento actualizada exitosamente.', 'Éxito');
    this.activeModal.close('ruta_actualizada');
  }
}
