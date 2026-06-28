import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core'; 
import { DomSanitizer } from '@angular/platform-browser';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { IndexacionSerieService } from '../service/indexacion-serie.service';

@Component({
  selector: 'app-crear-lugar-documento',
  templateUrl: './crear-lugar-documento.component.html',
  styleUrls: ['./crear-lugar-documento.component.scss']
})
export class CrearLugarDocumentoComponent implements OnInit {
  @Input() idSerie: number | null = null; 
  
  // 👥 Datos del usuario autenticado globales
  usuario_id: number | null = null;
  id_empresa: number | null = null;

  // 🔄 Control de flujo visual
  pasoActual: number = 1; 
  estanteriasLista: any[] = []; 

  // 📝 Variables para capturar los datos de los inputs (Edificio y Sala)
  nombreEdificio: string = '';
  nombreSala: string = '';
  cantidadEstanterias: number | null = null;

  idEdificioCreado: number | null = null;
  idSalaCreada: number | null = null;

  // Variables de estanterías para control mínimo
  cantidadFilas: number | null = null; // usada en modo individual si fuera necesario
  estanteriasGrabadas: number = 0;

  // Selección y manejo de filas por estantería
  selectedEstanteria: any | null = null;
  filasLista: any[] = [];
  cantidadFilasEstanteria: number | null = null; // para formulario de filas
  selectedFila: any | null = null;
  // Cajas
  cajasLista: any[] = [];
  cantidadCajasFila: number | null = null;
  selectedCaja: any | null = null;
  // Carpetas
  carpetasLista: any[] = [];
  cantidadCarpetasCaja: number | null = null;

  // Edificios existentes por empresa
  edificiosEmpresa: Array<{ id_edificio: number; nombre: string }> = [];
  idEdificioSeleccionado: number | null = null;
  salasEdificio: Array<{ id_sala: number; nombre: string }> = [];
  idSalaSeleccionada: number | null = null;
  creandoSalaNueva: boolean = false;


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
    console.log('ID Serie recibido en el modal:', this.idSerie);
    // cargar edificios disponibles para la empresa del usuario
    if (this.id_empresa) {
      this.cargarEdificiosEmpresa();
    }
  }

  /**
   * Carga los datos del almacenamiento local y los asigna a las variables de la clase
   */
  private cargarUsuarioLogeado(): void {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('Usuario cargado manualmente:', user);

      this.usuario_id = user.id ?? null;
      console.log('Usuario logeado:', this.usuario_id);

      if (user && user.id_empresa != null) {
        this.id_empresa = user.id_empresa;
        console.log('ID Empresa del usuario logeado:', this.id_empresa);
      } else {
        this.toast.warning('No se pudo obtener la empresa del usuario actual.', 'Atención');
        console.error('No se pudo obtener el id_empresa del usuario.');
      }
    } catch (error) {
      console.error('Error al parsear el usuario desde localStorage:', error);
    }
  }

  // ❌ Cerrar modal
  cerrarModal() {
    this.activeModal.dismiss('cross_click');
  }

  // =========================================================================
  // 🔥 ACCIONES DE GUARDADO PASO A PASO
  // =========================================================================

  guardarEdificio() {
    if (!this.nombreEdificio.trim()) {
      this.toast.error('El nombre del edificio es obligatorio.', 'Error');
      return;
    }

    // Validación local: no permitir duplicado por nombre (case-insensitive) en la lista cargada
    const nombreNorm = this.nombreEdificio.trim().toLowerCase();
    const dupLocal = this.edificiosEmpresa.some(e => String(e.nombre || '').trim().toLowerCase() === nombreNorm);
    if (dupLocal) {
      this.toast.error('Ya existe un edificio con ese nombre en esta serie/empresa.', 'Duplicado');
      return;
    }

    const payload = {
      nombre: this.nombreEdificio,
      id_empresa: this.id_empresa,
      usuario_registro: this.usuario_id,
      id_serie: this.idSerie
    };

    this.seccionesService.registrarEdificio(payload).subscribe({
      next: (resp: any) => {
        if (resp && (resp.success || resp)) {
          this.idEdificioCreado = resp.data?.id_edificio || resp.id; 
          console.log('ID Edificio capturado con éxito:', this.idEdificioCreado);
          this.toast.success('Edificio grabado correctamente.', 'Éxito');
          this.pasoActual = 2; 
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.toast.error('Ocurrió un error al guardar el edificio.', 'Error');
        console.error(err);
      }
    });
  }

  guardarSala() {
    // Si seleccionó una sala existente, usar y avanzar
    if (this.idSalaSeleccionada) {
      this.idSalaCreada = this.idSalaSeleccionada;
      this.toast.success('Sala seleccionada.', 'Éxito');
      this.pasoActual = 3;
      this.cdr.detectChanges();
      this.cantidadEstanteria();
      this.listarEstanterias();
      return;
    }

    // Crear sala nueva
    if (!this.nombreSala.trim()) {
      this.toast.error('El nombre de la sala es obligatorio.', 'Error');
      return;
    }
    // Validación local de duplicado dentro del edificio
    const salaNorm = this.nombreSala.trim().toLowerCase();
    const dupSala = this.salasEdificio.some(s => String(s.nombre || '').trim().toLowerCase() === salaNorm);
    if (dupSala) {
      this.toast.error('Ya existe una sala con ese nombre en este edificio.', 'Duplicado');
      return;
    }
    if (!this.cantidadEstanterias || this.cantidadEstanterias <= 0) {
      this.toast.error('Debe ingresar una cantidad válida de estanterías.', 'Error');
      return;
    }

    const payload = {
      id_edificio: this.idEdificioCreado || this.idEdificioSeleccionado, 
      nombre: this.nombreSala,
      cantidad_estanterias: this.cantidadEstanterias,
      usuario_registro: this.usuario_id
    };

    this.seccionesService.registrarSala(payload).subscribe({
      next: (resp: any) => {
        if (resp?.success || resp) {
          this.toast.success('Sala grabada correctamente.', 'Éxito');
          this.idSalaCreada = resp.data?.id_sala || resp.id;
          this.pasoActual = 3;
          this.cdr.detectChanges();
          this.cantidadEstanteria();
          this.listarEstanterias();
        }
      },
      error: (err) => {
        this.toast.error('Ocurrió un error al guardar la sala.', 'Error');
        console.error('Error al registrar sala:', err);
      }
    });
  }

  // Cargar estanterías desde la BD para esta sala
  listarEstanterias() {
    if (!this.idSalaCreada) { return; }
    const payload = { id_sala: this.idSalaCreada };
    this.seccionesService.listarEstanteriasPorSala(payload).subscribe({
      next: (res: any) => {
        // Se asume que el backend devuelve un array en res.data o directamente res
        const lista = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        // Normalizamos mínimamente a propiedades esperadas
        this.estanteriasLista = lista.map((e: any) => ({
          id: e.id || e.id_estanteria || null,
          nombre: e.nombre || e.codigo || e.descripcion || '',
          cantidad_filas: e.cantidad_filas ?? null,
          guardado: !!e.cantidad_filas // si ya tiene filas, lo consideramos guardado
        }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast.error('No se pudieron cargar las estanterías desde la base de datos.', 'Error');
        console.error('Error listando estanterías:', err);
      }
    });
  }

  // Al hacer clic en una estantería, cargar sus filas desde la BD
  seleccionarEstanteria(estanteria: any) {
    this.selectedEstanteria = estanteria;
    this.filasLista = [];
    this.cantidadFilasEstanteria = null;
    this.cargarFilasPorEstanteria();
  }

  private cargarFilasPorEstanteria() {
    if (!this.selectedEstanteria?.id) { return; }
    this.selectedFila = null; // limpia selección de fila al cambiar estantería
    const payload = { id_estanteria: this.selectedEstanteria.id };
    this.seccionesService.listarFilasPorEstanteria(payload).subscribe({
      next: (res: any) => {
        const lista = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        // Normaliza a un arreglo simple de filas con nombre/etiqueta
        this.filasLista = lista.map((f: any, i: number) => ({
          id: f.id_fila || f.id || i,
          nombre: f.nombre || f.codigo || f.descripcion || `Fila ${i + 1}`,
          cantidad_cajas: (f.cantidad_cajas != null ? f.cantidad_cajas : 0)
        }));
        // Si el backend devuelve la cantidad en la estantería, úsala como referencia del input
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

  // Guardar/actualizar la cantidad de filas para la estantería seleccionada
  guardarFilasParaEstanteria() {
    if (!this.selectedEstanteria?.id) {
      this.toast.error('Seleccione una estantería válida.', 'Error');
      return;
    }
    if (this.cantidadFilasEstanteria == null || this.cantidadFilasEstanteria < 0) {
      this.toast.error('Ingrese una cantidad válida de filas.', 'Error');
      return;
    }
    const cantidad = Number(this.cantidadFilasEstanteria);
    const nombre = this.selectedEstanteria?.nombre || `ID ${this.selectedEstanteria?.id}`;
    const ok = window.confirm(`La cantidad de filas que desea poner para la estantería "${nombre}" es ${cantidad}. ¿Desea continuar?`);
    if (!ok) { return; }
    const payload = {
      estanteria_id: this.selectedEstanteria.id,
      cantidad: cantidad,
      usuario_registro: this.usuario_id
    };
    this.seccionesService.registrarFilas(payload).subscribe({
      next: (resp: any) => {
        this.toast.success('Filas actualizadas correctamente.', 'Éxito');
        // Refresca filas y también listado de estanterías para reflejar cantidad
        this.cargarFilasPorEstanteria();
        this.listarEstanterias();
      },
      error: (err) => {
        this.toast.error('Ocurrió un error al guardar las filas.', 'Error');
        console.error('Error al registrar filas:', err);
      }
    });
  }

  // Guardar cantidad de cajas por fila
  actualizarCantidadCajas(fila: any) {
    if (!fila?.id) { return; }
    const payload = {
      id_fila: fila.id,
      cantidad_cajas: Number(fila.cantidad_cajas || 0),
      usuario_registro: this.usuario_id
    };
    this.seccionesService.actualizarFila(payload).subscribe({
      next: () => {
        this.toast.success('Cantidad de cajas actualizada.', 'Éxito');
        this.cargarFilasPorEstanteria();
      },
      error: (err) => {
        this.toast.error('No se pudo actualizar la fila.', 'Error');
        console.error('Error actualizando fila:', err);
      }
    });
  }

  // Seleccionar fila para habilitar panel de Cajas
  seleccionarFila(fila: any) {
    this.selectedFila = fila;
    // Cargar cajas para la fila seleccionada
    this.cargarCajasPorFila();
    this.cdr.detectChanges();
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
        // cantidad deseada por UI: si queremos reflejarla, usar length
        this.cantidadCajasFila = this.cajasLista.length || 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast.error('No se pudieron cargar las cajas de la fila.', 'Error');
        console.error('Error listando cajas:', err);
      }
    });
  }

  crearCajasParaFila() {
    if (!this.selectedFila?.id) { return; }
    const cant = Number(this.cantidadCajasFila ?? 0);
    const ok = window.confirm(`La cantidad de cajas que desea crear para la ${this.selectedFila?.nombre || 'fila seleccionada'} es ${cant}. ¿Desea continuar?`);
    if (!ok) { return; }
    const payload = {
      fila_id: this.selectedFila.id,
      cantidad: cant,
      usuario_registro: this.usuario_id
    };
    this.seccionesService.registrarCajas(payload).subscribe({
      next: () => {
        this.toast.success('Cajas actualizadas correctamente.', 'Éxito');
        this.cargarCajasPorFila();
      },
      error: (err) => {
        this.toast.error('No se pudieron crear las cajas.', 'Error');
        console.error('Error registrando cajas:', err);
      }
    });
  }

  actualizarCantidadCarpetas(caja: any) {
    if (!caja?.id) { return; }
    const payload = {
      id_caja: caja.id,
      cantidad_carpetas: Number(caja.cantidad_carpetas || 0),
      usuario_registro: this.usuario_id
    };
    this.seccionesService.actualizarCaja(payload).subscribe({
      next: () => {
        this.toast.success('Cantidad de carpetas actualizada.', 'Éxito');
        this.cargarCajasPorFila();
      },
      error: (err) => {
        this.toast.error('No se pudo actualizar la caja.', 'Error');
        console.error('Error actualizando caja:', err);
      }
    });
  }

  // Seleccionar caja para ver/gestionar carpetas
  seleccionarCaja(caja: any) {
    this.selectedCaja = caja;
    this.cargarCarpetasPorCaja();
    this.cdr.detectChanges();
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
        this.cantidadCarpetasCaja = this.carpetasLista.length || 0;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toast.error('No se pudieron cargar las carpetas de la caja.', 'Error');
        console.error('Error listando carpetas:', err);
      }
    });
  }

  crearCarpetasParaCaja() {
    if (!this.selectedCaja?.id) { return; }
    const cant = Number(this.cantidadCarpetasCaja ?? 0);
    const ok = window.confirm(`Se crearán/ajustarán ${cant} carpetas para ${this.selectedCaja?.nombre || 'la caja seleccionada'}. ¿Desea continuar?`);
    if (!ok) { return; }
    const payload = {
      caja_id: this.selectedCaja.id,
      cantidad: cant,
      usuario_registro: this.usuario_id
    };
    this.seccionesService.registrarCarpetas(payload).subscribe({
      next: () => {
        this.toast.success('Carpetas actualizadas correctamente.', 'Éxito');
        this.cargarCarpetasPorCaja();
      },
      error: (err) => {
        this.toast.error('No se pudieron crear/ajustar las carpetas.', 'Error');
        console.error('Error registrando carpetas:', err);
      }
    });
  }

  actualizarCantidadDocumentos(carpeta: any) {
    if (!carpeta?.id) { return; }
    const payload = {
      id_carpeta: carpeta.id,
      numero_documentos: Number(carpeta.numero_documentos || 0)
    } as any;
    this.seccionesService.actualizarCarpeta(payload).subscribe({
      next: () => {
        this.toast.success('Cantidad de documentos actualizada.', 'Éxito');
        this.cargarCarpetasPorCaja();
      },
      error: (err) => {
        this.toast.error('No se pudo actualizar la carpeta.', 'Error');
        console.error('Error actualizando carpeta:', err);
      }
    });
  }

  // Desde la fila: crea/ajusta las cajas con la cantidad indicada en la propia fila
  crearOActualizarCajasDesdeFila(fila: any) {
    if (!fila?.id) { return; }
    this.selectedFila = fila; // asegura contexto
    const cant = Number(fila.cantidad_cajas || 0);
    const ok = window.confirm(`Se crearán/ajustarán ${cant} cajas para ${fila.nombre || 'la fila seleccionada'}. ¿Desea continuar?`);
    if (!ok) { return; }
    const payload = {
      fila_id: fila.id,
      cantidad: cant,
      usuario_registro: this.usuario_id
    };
    this.seccionesService.registrarCajas(payload).subscribe({
      next: () => {
        this.toast.success('Cajas actualizadas para la fila.', 'Éxito');
        // Refresca cajas y filas (para reflejar cantidades)
        this.cargarCajasPorFila();
        this.cargarFilasPorEstanteria();
      },
      error: (err) => {
        this.toast.error('No se pudieron crear/ajustar las cajas.', 'Error');
        console.error('Error registrarCajas desde fila:', err);
      }
    });
  }

  // Input de cantidad en estanterías: ya no dispara ninguna acción

  // Botón explícito para crear/actualizar filas desde la fila de la estantería
  crearFilasDesdeEstanteria(estanteria: any) {
    // Forzamos selección y cantidad en el panel derecho
    this.selectedEstanteria = estanteria;
    this.cantidadFilasEstanteria = Number(estanteria?.cantidad_filas ?? 0);
    this.cdr.detectChanges();
    // Ejecuta el guardado con confirmación
    this.guardarFilasParaEstanteria();
  }

  // Desactivar (eliminar lógico) la estantería
  eliminarEstanteria(estanteria: any) {
    if (!estanteria?.id) { return; }
    const nombre = estanteria.nombre || `ID ${estanteria.id}`;
    const ok = window.confirm(`¿Desea eliminar (desactivar) la estantería "${nombre}"?`);
    if (!ok) { return; }
    const payload = {
      id_estanteria: estanteria.id,
      usuario_registro: this.usuario_id
    };
    this.seccionesService.desactivarEstanteria(payload).subscribe({
      next: () => {
        this.toast.success('Estantería desactivada.', 'Éxito');
        // Limpiar selección si coincide
        if (this.selectedEstanteria?.id === estanteria.id) {
          this.selectedEstanteria = null;
          this.selectedFila = null;
          this.filasLista = [];
        }
        this.listarEstanterias();
      },
      error: (err) => {
        this.toast.error('No se pudo desactivar la estantería.', 'Error');
        console.error('Error desactivando estantería:', err);
      }
    });
  }

  // Botón superior "Crear" (usa la estantería seleccionada y su cantidad actual)
  crearFilasDesdeEncabezado() {
    if (!this.selectedEstanteria) {
      this.toast.warning('Seleccione una estantería primero.', 'Atención');
      return;
    }
    this.cantidadFilasEstanteria = Number(this.selectedEstanteria?.cantidad_filas ?? 0);
    this.cdr.detectChanges();
    this.guardarFilasParaEstanteria();
  }

  // Guardar una estantería puntual (solo nombre y cantidad de filas)
  guardarEstanteriaIndividual(estanteria: any) {
    if (!this.idSalaCreada) {
      this.toast.error('No se encontró la sala para esta estantería.', 'Error');
      return;
    }
    if (!estanteria?.nombre || !String(estanteria.nombre).trim()) {
      this.toast.error('El nombre de la estantería es obligatorio.', 'Error');
      return;
    }
    if (!estanteria?.cantidad_filas || estanteria.cantidad_filas <= 0) {
      this.toast.error('Debe ingresar una cantidad válida de filas.', 'Error');
      return;
    }

    const payload = {
      sala_id: this.idSalaCreada,
      nombre: estanteria.nombre,
      cantidad_filas: estanteria.cantidad_filas,
      usuario_registro: this.usuario_id
    };

    this.seccionesService.registrarEstanteria(payload).subscribe({
      next: (resp: any) => {
        if (resp?.success || resp) {
          this.toast.success('Estantería guardada correctamente.', 'Éxito');
          estanteria.guardado = true;
          this.estanteriasGrabadas++;

          // Si alcanzó el tope de cantidad definida en sala, avanzar
          if (this.cantidadEstanterias && this.estanteriasGrabadas >= this.cantidadEstanterias) {
            this.pasoActual = 4;
          }

          // Refrescar listado desde BD para mantener consistencia
          this.listarEstanterias();
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.toast.error('Ocurrió un error al guardar la estantería.', 'Error');
        console.error('Error al registrar estantería:', err);
      }
    });
  }


  cantidadEstanteria() {
  const payload = {
    id_sala: this.idSalaCreada // El ID de la sala guardada en el paso 2
  };

  console.log('Verificando tope con payload:', payload);

  this.seccionesService.cantidadEstanteriaAqui(payload).subscribe({
    next: (res: any) => {
      console.log('Respuesta de la verificación:', res);
      
      // Si el conteo en la base de datos ya llegó al límite permitido
      if (res?.existe || res?.completado) {
        this.pasoActual = 4; // Avanza a Cajas si ya se cumplió la condición
      }
      
      this.cdr.detectChanges();
    },
    error: (err) => {
      this.toast.error('Error al verificar la cantidad de la estantería.', 'Error');
      console.error(err);
    }
  });
}

  guardarCajas() {
    this.pasoActual = 5;
    this.cdr.detectChanges();
  }

  finalTodo() {
    // Código de respaldo por si tu botón usa finalizarTodo() o finalTodo()
    this.finalizarTodo();
  }

  finalizarTodo() {
    this.toast.success('Toda la ruta de almacenamiento ha sido guardada con éxito.', 'Completado');
    this.activeModal.close('guardado_exitoso'); 
  }

  // Cerrar y solicitar actualización de la lista en el padre
  actualizarRuta() {
    this.activeModal.close('ruta_actualizada');
  }

  // ===========================
  // Edificios por empresa
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
      this.nombreEdificio = found.nombre; // precarga nombre y desactiva creación duplicada
      this.idEdificioCreado = found.id_edificio; // usar existente
      // habilita inmediatamente el paso 2 para mostrar el bloque de sala
      this.pasoActual = Math.max(this.pasoActual, 2);
      // Cargar salas del edificio seleccionado
      this.cargarSalasPorEdificio();
    }
  }

  private cargarSalasPorEdificio() {
    this.salasEdificio = [];
    this.idSalaSeleccionada = null;
    this.creandoSalaNueva = false;
    if (!this.idEdificioSeleccionado) { return; }
    const payload = { id_edificio: this.idEdificioSeleccionado } as any;
    this.seccionesService.listarSalasPorEdificio(payload).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        this.salasEdificio = data.map((s: any) => ({ id_sala: s.id_sala || s.id, nombre: s.nombre }));
        // al seleccionar edificio, habilita paso 2 (definir sala existente o crear nueva)
        this.pasoActual = Math.max(this.pasoActual, 2);
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error listando salas por edificio:', err)
    });
  }

  onSeleccionSala(idStr: string) {
    if (idStr === 'new') {
      this.creandoSalaNueva = true;
      this.idSalaSeleccionada = null;
      this.nombreSala = '';
      return;
    }
    this.creandoSalaNueva = false;
    const id = Number(idStr || 0) || null;
    this.idSalaSeleccionada = id;
  }
















































  crearRuta(){}
}
