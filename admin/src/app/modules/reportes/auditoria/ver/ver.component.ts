import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ReportesService } from '../../service/reportes.service';
import { URL_BACKEND } from 'src/app/config/config';
import { DocumentoViewerService } from 'src/app/modules/indexacion-serie/ver-documento/documento-viewer.service';
import Swal from 'sweetalert2';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

interface Usuario {
  id: number;
  nombre: string;
  correo: string;
}

interface Actividad {
  id: number;
  nombre: string;
  detalle: string;
  fecha: Date;
}

@Component({
  selector: 'app-ver',
  templateUrl: './ver.component.html',
  styleUrls: ['./ver.component.scss']
})
export class VerComponent implements OnInit {


  get usuariosVisibles() {
  if (!this.searchUser) return this.leftUsuarios;
  const texto = this.searchUser.toLowerCase();
  return this.leftUsuarios.filter(u =>
    u.nombre?.toLowerCase().includes(texto) ||
    u.correo?.toLowerCase().includes(texto)
  );
}

  // 🔹 Filtros
  fechaInicio!: string;      // fecha tipo 'yyyy-MM-dd'
  fechaFin!: string;
  usuarioFiltro: number | null = null;
  actividadFiltro: number | null = null;
  tipoDocumentoFiltro: string | null = null;

  // 🔹 Listas
  usuarios: Usuario[] = [];           // todos los usuarios

  searchUser: string = '';

  actividadesTipos: {id: number, nombre: string}[] = [];  // tipos de actividad
  tiposDocumento: string[] = [];                          // tipos de documento (texto de la serie)
  // Variable para el usuario seleccionado
  usuarioSeleccionado: any = null;

  // Todas las actividades
  actividades: any[] = [];

  // Actividades filtradas según el usuario seleccionado
  actividadesFiltradas: any[] = [];

  usuariosFiltrados: any[] = [];
  // Lista inmutable usada por la UI (lista izquierda)
  leftUsuarios: any[] = [];
  // Snapshot serializado de la lista inicial para detectar cambios
  private initialLeftUsuariosJson: string = '';

  auditoriaUsuario: any[] = [];
  auditoriaRaw: any[] = [];
  ultimoFiltrosAplicados: any | null = null;

  // 🔹 Paginación real (viene del backend)
  paginaActual: number = 1;
  totalPaginas: number = 1;
  totalRegistros: number = 0;
  porPagina: number = 50;

  // 🔹 Búsqueda con debounce (evita 1 petición por cada tecla)
  textoBusqueda: string = '';
  private busquedaSubject = new Subject<string>();

  // (Se mantienen por compatibilidad si se usan en otro lado; ya no gobiernan la paginación real)
  currentPage: number = 1;
  totalPages: number = 1;

  userId: number = 0;
  id_empresa: any = null;

  constructor(
      public modalService: NgbModal,
      public ReporteService: ReportesService,
       private cdr: ChangeDetectorRef,
      private router: Router,
      private documentoViewer: DocumentoViewerService
    ) {
      this.busquedaSubject.pipe(
        debounceTime(400),
        distinctUntilChanged()
      ).subscribe((texto) => {
        this.textoBusqueda = texto;
        this.paginaActual = 1;
        this.recargarActividades();
      });
    }

  ngOnInit(): void {
    // Por defecto el rango de fechas es el día de hoy
    const hoy = new Date();
    const hoyTexto = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    this.fechaInicio = hoyTexto;
    this.fechaFin = hoyTexto;

    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (user && user.id_empresa != null) {
      this.id_empresa = user.id_empresa;
    }
    //this.enviarUsuarioAlServicio(); // ❌ Deshabilitada: causaba condición de carrera con cargarIdEmpresaUsuario()
    this.cargarIdEmpresaUsuario();
  }


  /**
   * Carga los tipos de actividad de toda la empresa. El combo se llena al
   * entrar y se mantiene aunque no haya un usuario elegido, para poder filtrar
   * por actividad y ver qué usuarios la realizaron.
   */
  cargarActividades() {
    if (!this.id_empresa) { return; }

    this.ReporteService.getActividadesUnicas(null, this.id_empresa).subscribe({
      next: (res: any) => {
        this.actividadesTipos = res.actividades ?? [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al traer actividades', err);
        this.actividadesTipos = [];
      }
    });
  }

  /**
   * Llena el combo con los tipos de documento cargados en las series de la
   * empresa. Es un campo de texto de la serie, no una tabla aparte, así que el
   * nombre es a la vez el valor. Por ahora sólo se muestra: todavía no
   * interviene en el filtrado.
   */
  cargarTiposDocumento() {
    if (!this.id_empresa) { return; }

    this.ReporteService.getTiposDocumento(this.id_empresa).subscribe({
      next: (res: any) => {
        // La respuesta viene agrupada por tipo: cada clave es un nombre
        this.tiposDocumento = Object.keys(res || {}).sort();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al traer tipos de documento', err);
        this.tiposDocumento = [];
      }
    });
  }

  onUsuarioChange() {
    // El combo de actividades ya no depende del usuario: siempre se muestran
    // todas las de la empresa, para poder filtrar sólo por actividad.
    // La selección de actividad se respeta al cambiar de usuario.
  }


  cargarIdEmpresaUsuario() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (user && user.id_empresa) {
      this.id_empresa = user.id_empresa;

      // Los combos se llenan de entrada, sin depender del usuario
      this.cargarActividades();
      this.cargarTiposDocumento();

      this.ReporteService.getAuditoriaPorEmpresa(this.id_empresa).subscribe({
        next: (res: any) => {
          console.log('Respuesta de Usuarios desde Laravel:', res);

          const mapped = res.usuarios.map((u: any) => ({
            id: u.id,
            nombre: u.nombre + (u.surname ? ' ' + u.surname : ''),
            correo: u.correo
          }));

          this.usuarios = mapped;
          this.leftUsuarios = [...mapped];
          this.initialLeftUsuariosJson = JSON.stringify(this.leftUsuarios.map((u: any) => u.id));

          console.log('primera lista (cargarIdEmpresaUsuario)', this.leftUsuarios);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error cargando usuarios', err);
        }
      });

    } else {
      Swal.fire('Error de Sesión', 'No se encontró el ID de la empresa en el storage.', 'error');
    }
  }


  // 🔹 Función para seleccionar un usuario
  // Se dispara al hacer clic. El comportamiento normal (clic simple) sigue igual,
  // "page" solo se usa cuando se navega de página con los botones de paginación.
  seleccionarUsuario(user: any, page: number = 1) {
    this.usuarioSeleccionado = user;
    this.ultimoFiltrosAplicados = null;
    this.paginaActual = page;
    console.log('Usuario seleccionado:', user);

    this.ReporteService.getAuditoriaUsuario(user.id, this.id_empresa, page, this.textoBusqueda).subscribe({
      next: (res: any) => {
        console.log('Auditoría del usuario:', res);

        const currentJson = JSON.stringify(this.leftUsuarios.map((u: any) => u.id));
        if (this.initialLeftUsuariosJson && this.initialLeftUsuariosJson !== currentJson) {
          console.error('SE CAMBIO LA LISTA: la lista izquierda fue modificada', { before: this.initialLeftUsuariosJson, after: currentJson });
        }

        if (res.success && res.auditoria) {
          this.auditoriaRaw = Array.isArray(res.auditoria) ? res.auditoria : [];

          this.actividadesFiltradas = this.auditoriaRaw.map((a: any) => ({
            id: a.id ?? null,
            nombre: a.accion ?? a.nombre ?? '',
            detalle: a.detalle ?? '',
            detalle2: a.detalle2 ?? '',
            documentos: a.documentos ?? '',
            fecha: a.created_at ?? a.fecha ?? null,
            modulo: a.modulo ?? '',
            accion: a.accion ?? '',
            usuario: a.usuario ?? null,
            // 🔹 Se calculan una sola vez para no rearmarlas en cada render
            usuarioColumna: this.nombreDelUsuario(a),
            nombreUsuario: this.usuarioDetalle2(a.detalle2 ?? ''),
            lineasDetalle: this.lineasTexto(a.detalle ?? ''),
            lineasDetalle2: this.lineasDetalle2(a.detalle2 ?? ''),
          }));

          // 🔹 Datos de paginación devueltos por el backend
          if (res.pagination) {
            this.paginaActual = res.pagination.current_page;
            this.totalPaginas = res.pagination.last_page;
            this.totalRegistros = res.pagination.total;
          }

          this.cdr.detectChanges(); // 🔹 Forzar refresco de la vista
        } else {
          this.auditoriaRaw = [];
          this.actividadesFiltradas = [];
          this.totalPaginas = 1;
          this.totalRegistros = 0;
        }
      },
      error: (err) => {
        console.error('Error al obtener auditoría:', err);
        this.auditoriaRaw = [];
        this.actividadesFiltradas = [];
      }
    });
  }


  // Función para enviar el ID al servicio y traer auditoría
  // NOTA: no se usa actualmente en el HTML (seleccionarUsuario cubre ese flujo). Se conserva por compatibilidad.
  obtenerAuditoriaUsuario(userId: string) {
    this.ReporteService.getAuditoriaUsuario(userId, this.id_empresa).subscribe({
      next: (res: any) => {
        console.log('Auditoría del usuario:', res);
        this.auditoriaUsuario = res.auditoria || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al obtener auditoría:', err);
      }
    });
  }


  aplicarFiltros(page: number = 1) {
    // 1. Validación de Empresa
    if (!this.id_empresa) {
      Swal.fire('Error', 'No se identificó la empresa.', 'error');
      return;
    }

    // 2. Prioridad: Validación de Fechas Obligatorias
    if (!this.fechaInicio || !this.fechaFin) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas requeridas',
        text: 'Debe seleccionar un rango de fechas (Inicio y Fin) para continuar.',
        confirmButtonColor: '#3085d6'
      });
      return;
    }

    // 3. Validación de Rango Lógico
    if (new Date(this.fechaFin) < new Date(this.fechaInicio)) {
      Swal.fire('Error', 'La fecha fin no puede ser menor a la de inicio', 'error');
      return;
    }

    // 4. Armado de Filtros
    const filtros = {
      empresa_id: this.id_empresa,
      user_id: this.usuarioFiltro || "TODOS",
      actividad_id: this.actividadFiltro || "TODOS",
      tipo_documento: this.tipoDocumentoFiltro || "TODOS",
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin
    };

    // 5. Mostrar Cargando
    Swal.fire({
      title: 'Buscando registros',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // 6. Llamada al Servicio
    this.ReporteService.getAuditoriaFiltrada(filtros, page, this.textoBusqueda).subscribe({
      next: (res: any) => {
        Swal.close(); // Cerramos el loading inmediatamente

        const datos = Array.isArray(res) ? res : (res.data || []);

        if (datos.length === 0) {
          this.auditoriaRaw = [];
          this.actividadesFiltradas = [];
          this.totalPaginas = 1;
          this.totalRegistros = 0;
          Swal.fire({
            icon: 'info',
            title: 'Sin resultados',
            text: 'No se encontraron datos para el rango seleccionado.',
            confirmButtonColor: '#3085d6'
          });
          return;
        }

        this.ultimoFiltrosAplicados = filtros;
        this.usuarioSeleccionado = null; // limpiamos selección de usuario individual
        this.auditoriaRaw = datos;

        if (res.pagination) {
          this.paginaActual = res.pagination.current_page;
          this.totalPaginas = res.pagination.last_page;
          this.totalRegistros = res.pagination.total;
        }

        this.actividadesFiltradas = datos.map((a: any) => ({
          id: a.id ?? null,
          nombre: a.accion ?? a.nombre ?? '',
          detalle: a.detalle ?? '',
          detalle2: a.detalle2 ?? '',
          documentos: a.documentos ?? '',
          fecha: a.created_at ?? a.fecha ?? null,
          modulo: a.modulo ?? '',
          accion: a.accion ?? '',
          usuario: a.usuario ?? null,
          // 🔹 Se calculan una sola vez para no rearmarlas en cada render
          usuarioColumna: this.nombreDelUsuario(a),
          nombreUsuario: this.usuarioDetalle2(a.detalle2 ?? ''),
          lineasDetalle: this.lineasTexto(a.detalle ?? ''),
          lineasDetalle2: this.lineasDetalle2(a.detalle2 ?? ''),
        }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        Swal.close();
        console.error('Error al filtrar:', err);
        this.auditoriaRaw = [];
        this.actividadesFiltradas = [];
        Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
      }
    });
  }


  // 🔹 Input de búsqueda (con debounce, conectar en el HTML con (input))
  onBuscarChange(texto: string) {
    this.busquedaSubject.next(texto);
  }

  // 🔹 Vuelve a pedir la misma vista (usuario seleccionado o filtros aplicados) manteniendo el contexto actual
  recargarActividades() {
    if (this.usuarioSeleccionado) {
      this.seleccionarUsuario(this.usuarioSeleccionado, this.paginaActual);
    } else if (this.ultimoFiltrosAplicados) {
      this.aplicarFiltros(this.paginaActual);
    }
  }

  // 🔹 Botones de paginación (Primera / Anterior / Siguiente / Última)
  cambiarPagina(page: number) {
    if (page < 1 || page > this.totalPaginas) return;
    this.paginaActual = page;
    this.recargarActividades();
  }


  // Función para el botón de descarga
  descargarReporte(formato: 'pdf' | 'excel') {
    if (this.actividadesFiltradas.length === 0) {
      Swal.fire('Error', 'No hay datos para exportar', 'error');
      return;
    }

    Swal.fire({
      title: 'Generando reporte',
      text: 'Espere un momento...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const payloadFiltros =
      this.ultimoFiltrosAplicados ??
      (this.id_empresa
        ? {
            empresa_id: this.id_empresa,
            user_id: this.usuarioFiltro || (this.usuarioSeleccionado?.id ?? 'TODOS'),
            actividad_id: this.actividadFiltro || 'TODOS',
            fecha_inicio: this.fechaInicio || null,
            fecha_fin: this.fechaFin || null,
          }
        : null);

    const payload: any = payloadFiltros ?? this.auditoriaRaw;

    this.ReporteService.exportarAuditoria(payload, formato).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const extension = formato === 'pdf' ? 'pdf' : 'xlsx';

        a.href = url;
        a.download = `reporte_auditoria_${new Date().getTime()}.${extension}`;
        a.click();

        window.URL.revokeObjectURL(url);
        Swal.close();
        Swal.fire('Éxito', 'Reporte generado correctamente', 'success');
      },
      error: (err) => {
        console.error(err);
        Swal.close();
        Swal.fire('Error', 'No se pudo generar el reporte', 'error');
      }
    });
  }

  loadPage(page: number) {
     if (page < 1 || page > this.totalPages) return;
     this.currentPage = page;
     // Nota: ya no se usa para la paginación real; ver cambiarPagina()
  }

  // 🔹 Extrae el nombre del usuario que aparece al inicio de "Detalle 2"
  //    Formato guardado: "Usuario: Juan Pérez | ID Documento: 123 | ..."
  /**
   * Nombre para la columna "Usuario". Se toma de la relación que trae el
   * backend; si ese registro no la tiene, se cae al nombre que algunos
   * detalles guardan como texto ("Usuario: ...").
   */
  nombreDelUsuario(a: any): string {
    const u = a?.usuario;

    if (u) {
      const completo = `${u.name ?? ''} ${u.surname ?? ''}`.trim();
      if (completo) { return completo; }
    }

    return this.usuarioDetalle2(a?.detalle2 ?? '') || '—';
  }

  usuarioDetalle2(detalle2: string): string {
    if (!detalle2) return '';
    const match = String(detalle2).match(/Usuario:\s*(.+?)(?:\s*\||$)/);
    return match && match[1] ? match[1].trim() : '';
  }

  // 🔹 Devuelve "Detalle 2" sin la parte del usuario (que se pinta aparte en negrilla)
  restoDetalle2(detalle2: string): string {
    if (!detalle2) return '';
    return String(detalle2)
      .replace(/Usuario:\s*(.+?)(\s*\|\s*|$)/, '')
      .trim();
  }

  // 🔹 Segmentos que en realidad son listas y conviene desglosar en filas
  private readonly listasDetalle: Array<{ prefijo: RegExp; separador: string }> = [
    { prefijo: /^Cambios:\s*/i,                  separador: ';' },
    { prefijo: /^Campos indexados[^:]*:\s*/i,    separador: ';' },
    { prefijo: /^Campos modificados[^:]*:\s*/i,  separador: ',' },
    { prefijo: /^Documentos( procesados)?:\s*/i, separador: ',' }
  ];

  // 🔹 Convierte un detalle largo ("a | b | Cambios: x ; y") en filas legibles
  lineasTexto(texto: string): Array<{ texto: string; sub: boolean }> {
    if (!texto) return [];

    const lineas: Array<{ texto: string; sub: boolean }> = [];
    const partes = String(texto).split('|').map(p => p.trim()).filter(p => p !== '');

    for (const parte of partes) {
      const lista = this.listasDetalle.find(l => l.prefijo.test(parte));

      if (lista) {
        const etiqueta = (parte.match(lista.prefijo) || [''])[0].trim();
        const cuerpo = parte.replace(lista.prefijo, '');

        lineas.push({ texto: etiqueta, sub: false });
        cuerpo.split(lista.separador)
          .map(c => c.trim())
          .filter(c => c !== '')
          .forEach(c => lineas.push({ texto: c, sub: true }));
      } else {
        lineas.push({ texto: parte, sub: false });
      }
    }

    return lineas;
  }

  /**
   * 🔹 "Detalle 2" en filas, ya sin la parte del usuario.
   * Además:
   *  - se ocultan los identificadores internos (ID Documento, ID Serie...),
   *    que no le dicen nada a quien revisa la auditoría
   *  - "Almacenamiento: ENCRIPTADO / NORMAL" se separa en etiqueta y valor
   *    para poder pintar el valor con su color
   */
  lineasDetalle2(detalle2: string): Array<{ texto: string; sub: boolean; valor?: string; resalte?: string }> {
    return this.lineasTexto(this.restoDetalle2(detalle2))
      // Fuera los "ID ..." (ID Documento, ID Serie/Subserie, ID Empresa...)
      .filter(linea => !/^ID\s/i.test(linea.texto))
      .map(linea => {
        const almacenamiento = linea.texto.match(/^Almacenamiento:\s*(ENCRIPTADO|NORMAL)\s*$/i);

        if (almacenamiento) {
          const valor = almacenamiento[1].toUpperCase();
          return {
            texto: 'Almacenamiento:',
            sub: linea.sub,
            valor,
            resalte: valor === 'ENCRIPTADO' ? 'encriptado' : 'normal'
          };
        }

        return linea;
      });
  }

  // 🔹 En la tabla se muestra sólo el nombre, aunque se guarde la ruta completa
  soloNombre(doc: string): string {
    const texto = String(doc || '').trim();
    if (!texto) return '';
    return texto.split(/[\\/]/).pop() || texto;
  }

  // 🔹 Función para abrir el visor de PDF
  abrirVisorPDF(actividad: any, nombreDocumento: string) {
    if (!nombreDocumento || nombreDocumento.trim() === '') {
      Swal.fire('Error', 'No hay documento para visualizar', 'error');
      return;
    }

    // Extraer la ruta de detalle2 usando regex
    // Formato: "ID Documento: 7575 | Tiempo trabajado: 13s | Ruta: documentos/..."
    let rutaDocumento = nombreDocumento;

    if (actividad && actividad.detalle2) {
      const match = actividad.detalle2.match(/Ruta:\s*(.+?)(?:\s*\||$)/);
      if (match && match[1]) {
        rutaDocumento = match[1].trim();
      }
    }

    // Si ya es una URL absoluta, el visor puede abrirla directamente
    if (rutaDocumento.startsWith('http')) {
      // En auditoría el documento es solo para revisión: sin imprimir
      this.documentoViewer.abrirVer({ urlPdf: encodeURI(rutaDocumento.trim()), permitirImprimir: false });
      return;
    }

    // El PDF se pide por API en base64: descargarlo desde /storage falla por CORS
    Swal.fire({ title: 'Cargando documento...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.ReporteService.verDocumentoBase64(rutaDocumento).subscribe({
      next: (resp: any) => {
        try { Swal.close(); } catch {}
        if (resp?.success && resp?.base64) {
          this.documentoViewer.abrirVer({ pdfBase64: resp.base64, permitirImprimir: false });
        } else {
          Swal.fire('Error', resp?.message || 'No se pudo obtener el documento', 'error');
        }
      },
      error: (err) => {
        try { Swal.close(); } catch {}
        console.error('Error trayendo el documento:', err);
        Swal.fire('Error', 'No se pudo cargar el documento', 'error');
      }
    });
  }

  descargarDocumento(nombreDocumento: string) {
    if (!nombreDocumento || nombreDocumento.trim() === '') {
      Swal.fire('Error', 'No hay documento para descargar', 'error');
      return;
    }

    // Normalizar y codificar la ruta de descarga, usar URL_BACKEND para consistencia
    const ruta = nombreDocumento.startsWith('http') ? nombreDocumento : `storage/documentos/${nombreDocumento}`;
    const fullUrl = nombreDocumento.startsWith('http') ? ruta : `${URL_BACKEND}${ruta}`;
    try {
      window.open(encodeURI(fullUrl.trim()), '_blank');
    } catch (e) {
      console.error('Error abriendo documento:', e);
      window.open(fullUrl, '_blank');
    }
  }

}
