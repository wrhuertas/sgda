import { Component, OnInit, Input, TemplateRef, ViewChild } from '@angular/core';
import { UsersService } from '../service/users.service';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

// Interfaz para definir la estructura de permisos y permitir acceso dinámico
interface Permisos {
  [key: string]: boolean;
  checkGeneral: boolean;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  // Nuevos campos de tu imagen
  buscar: boolean;
  subir_documentos: boolean;
  ver_documento: boolean;
  registrar_datos: boolean;
  indexar: boolean;
  indexar_masivo: boolean;
  eliminar_documento: boolean;
  firmar_documento: boolean;
  limpiar_documento: boolean;
  // Acciones documentales adicionales
  subir_por_carpeta: boolean;
  subir_por_zip: boolean;
  subir_excel: boolean;
  ocr_local: boolean;
  ocr_masivo_ia: boolean;
  subir_anexos: boolean;
  eliminar_anexos: boolean;
  compartir_documento: boolean;
  ver_versiones: boolean;
  trasladar_documentos: boolean;
  imprimir_documento: boolean;
  separadores_documento: boolean;
  controlo_calidad: boolean;
}

// Permisos que sólo aplican a Series/Subseries, agrupados por tipo de acción.
// Se usa para pintar los checkboxes y para armar el payload sin repetir la lista.
const PERMISOS_SERIE_GRUPOS: Array<{ grupo: string; items: Array<{ campo: string; etiqueta: string }> }> = [
  {
    grupo: 'Consulta',
    items: [
      { campo: 'buscar',        etiqueta: 'Buscar' },
      { campo: 'ver_documento', etiqueta: 'Ver documento' },
      { campo: 'ver_versiones', etiqueta: 'Ver versiones' },
    ]
  },
  {
    grupo: 'Carga de documentos',
    items: [
      { campo: 'subir_documentos', etiqueta: 'Subir documentos (uno a uno)' },
      { campo: 'subir_por_carpeta', etiqueta: 'Subir PDF por carpeta' },
      { campo: 'subir_por_zip',     etiqueta: 'Subir PDF por ZIP' },
      { campo: 'subir_excel',       etiqueta: 'Subir Excel (indexación masiva)' },
      { campo: 'subir_anexos',      etiqueta: 'Subir anexos' },
    ]
  },
  {
    grupo: 'Indexación',
    items: [
      { campo: 'registrar_datos',  etiqueta: 'Registrar datos de inventario' },
      { campo: 'indexar',          etiqueta: 'Indexar' },
      { campo: 'indexar_masivo',   etiqueta: 'Indexar masivo' },
      { campo: 'controlo_calidad', etiqueta: 'Control de calidad' },
      { campo: 'ocr_local',        etiqueta: 'Hacer OCR local' },
      { campo: 'ocr_masivo_ia',    etiqueta: 'OCR masivo con IA' },
      { campo: 'firmar_documento', etiqueta: 'Firmar documento' },
    ]
  },
  {
    grupo: 'Dentro del visor',
    items: [
      { campo: 'imprimir_documento',    etiqueta: 'Imprimir' },
      { campo: 'limpiar_documento',     etiqueta: 'Limpiar' },
      { campo: 'separadores_documento', etiqueta: 'Separadores' },
    ]
  },
  {
    grupo: 'Gestión',
    items: [
      { campo: 'compartir_documento',  etiqueta: 'Compartir enlace' },
      { campo: 'trasladar_documentos', etiqueta: 'Transferir documentos' },
      { campo: 'eliminar_anexos',      etiqueta: 'Eliminar anexos' },
      { campo: 'eliminar_documento',   etiqueta: 'Eliminar documento' },
    ]
  },
];

// Lista plana, para recorrer todos los campos de una sola pasada
const PERMISOS_SERIE = PERMISOS_SERIE_GRUPOS.reduce(
  (acc, g) => acc.concat(g.items),
  [] as Array<{ campo: string; etiqueta: string }>
);

@Component({
  selector: 'app-permisos-seleccion',
  templateUrl: './permisos-seleccion.component.html',
  styleUrls: ['./permisos-seleccion.component.scss'] // <-- Cambia css por scss
})
export class PermisosSeleccionComponent implements OnInit {
  @Input() USER_SELECTED: any;
  @Input() id_empresa: any;
  
  @ViewChild('proyectoTemplate', { static: true }) proyectoTemplate!: TemplateRef<any>;
  @ViewChild('serieTemplate', { static: true }) serieTemplate!: TemplateRef<any>;

  secciones: any[] = [];
  isLoading = false;

  // Permisos de serie que se pintan en el modal, agrupados por tipo de acción
  permisosSerieGrupos = PERMISOS_SERIE_GRUPOS;

  // Cambios agrupados por nodo (no por campo)
  cambiosPendientes: any[] = [];
  private cambiosMap: { [key: string]: any } = {};

  // Permisos actuales desde BD y un lookup rápido
  private permisosBD: any[] = [];
  private permisoLookup: { [key: string]: any } = {};
  // En tu clase del componente
itemSeleccionado: any = null; // Nodo (sección o serie) seleccionado

seleccionarNodo(nodo: any) {
  this.itemSeleccionado = nodo;
  const tipo = this.detectarNivel(nodo);
  const id = nodo.id_proyecto || nodo.id_serie || nodo.id;
  console.log(`[CLICK] Nodo seleccionado -> tipo: ${tipo}, id: ${id}, nombre: ${nodo?.nombre}`);
}

  constructor(private usersService: UsersService, private toast: ToastrService) {}

  async ngOnInit(): Promise<void> {
    if (!this.USER_SELECTED) { return; }

    this.id_empresa = this.id_empresa || this.USER_SELECTED.id_empresa;
    console.log('[PERMISOS] Modal abierto para usuario:', this.USER_SELECTED.id, 'empresa:', this.id_empresa);

    this.isLoading = true;

    // Permisos ya guardados, para precargar los checks
    try {
      const resp: any = await firstValueFrom(
        this.usersService.getPermisosDocumentalesUsuario(this.USER_SELECTED.id)
      );
      this.permisosBD = resp?.permissions || [];
      this.permisoLookup = this.buildPermisoLookup(this.permisosBD);
      console.log('[PERMISOS] Permisos cargados desde BD:', this.permisosBD);
    } catch {
      console.warn('[PERMISOS] No se pudieron cargar permisos BD, continuando sin lookup');
    }

    // Rutas del árbol que hay que abrir para que se vean los permisos marcados
    try {
      const rutas: any = await firstValueFrom(
        this.usersService.getRutasPermisosDocumentales(this.USER_SELECTED.id)
      );
      this.rutasExpandir = {
        proyectos: (rutas?.proyectos || []).map((n: any) => Number(n)),
        series: (rutas?.series || []).map((n: any) => Number(n))
      };
    } catch {
      console.warn('[PERMISOS] No se pudieron cargar las rutas a expandir');
    }

    await this.cargarSeccionesRaiz();

    // cargarSeccionesRaiz apaga el loader, pero aún falta abrir las ramas
    this.isLoading = true;
    await this.autoExpandir(this.secciones);
    this.seleccionarPrimerNodoConPermisos(this.secciones);

    this.isLoading = false;
  }

  // Nodos que deben quedar abiertos al abrir el modal
  private rutasExpandir: { proyectos: number[]; series: number[] } = { proyectos: [], series: [] };

  /** ¿Este nodo tiene al menos un permiso marcado? */
  tienePermisos(nodo: any): boolean {
    const p = nodo?.permisos;
    if (!p) { return false; }
    return Object.keys(p).some(k => k !== 'checkGeneral' && !!p[k]);
  }

  /**
   * Abre las ramas que llevan a los nodos con permisos. El árbol es perezoso,
   * así que hay que ir cargando cada nivel antes de poder seguir bajando.
   */
  private async autoExpandir(nodos: any[]): Promise<void> {
    for (const nodo of nodos || []) {
      if (nodo.isSerie) {
        if (!this.rutasExpandir.series.includes(Number(nodo.id_serie))) { continue; }
        await this.cargarHijosSerie(nodo);
        nodo.abierto = true;
        await this.autoExpandir(nodo.subseries || []);
      } else {
        if (!this.rutasExpandir.proyectos.includes(Number(nodo.id_proyecto))) { continue; }
        await this.cargarHijosSeccion(nodo);
        nodo.abierto = true;
        await this.autoExpandir([...(nodo.subsecciones || []), ...(nodo.series || [])]);
      }
    }
  }

  /** Deja seleccionado el primer nodo que ya tenga permisos, para no abrir el panel vacío */
  private seleccionarPrimerNodoConPermisos(nodos: any[]): boolean {
    for (const nodo of nodos || []) {
      if (this.tienePermisos(nodo)) {
        this.itemSeleccionado = nodo;
        return true;
      }

      const hijos = nodo.isSerie
        ? (nodo.subseries || [])
        : [...(nodo.subsecciones || []), ...(nodo.series || [])];

      if (this.seleccionarPrimerNodoConPermisos(hijos)) { return true; }
    }
    return false;
  }

  // Etiqueta amigable del tipo de nodo (mayúsculas)
  getTituloTipo(nodo: any): string {
    if (!nodo) return '';
    const t = this.detectarNivel(nodo);
    switch (t) {
      case 'seccion': return 'SECCION';
      case 'subseccion': return 'SUBSECCION';
      case 'subsubseccion': return 'SUBSUBSECCION';
      case 'serie': return 'SERIE';
      case 'subserie': return 'SUBSERIE';
      default: return t?.toString().toUpperCase?.() || '';
    }
  }

  // --- Inicialización de permisos por defecto ---
  private crearPermisosVacios(): Permisos {
    const base: any = { checkGeneral: false, ver: false, crear: false, editar: false, eliminar: false };
    PERMISOS_SERIE.forEach(p => base[p.campo] = false);
    return base as Permisos;
  }

  // --- Carga Inicial (Nivel 1) ---
  async cargarSeccionesRaiz(): Promise<void> {
    this.isLoading = true;
    try {
      const resp: any = await firstValueFrom(
        this.usersService.listarSeccionesRaiz(this.id_empresa, this.USER_SELECTED.id)
      );
      this.secciones = (resp?.secciones || []).map((s: any) => ({
        ...s,
        isSerie: false,
        nivel: 'seccion',
        subsecciones: [],
        series: [],
        abierto: false,
        cargando: false,
        cargado: false,
        permisos: this.findPermisosForNodo('seccion', s.id_proyecto) || s.permisos || this.crearPermisosVacios()
      }));
    } finally {
      this.isLoading = false;
    }
  }

  // --- Expansión de Proyectos ---
// --- Carga Hijos (Proyectos y Series Raíz) ---
  toggleSeccion(seccion: any) {
    seccion.abierto = !seccion.abierto;
    console.log(`[CLICK] Seccion ${seccion?.nombre} (${seccion?.id_proyecto}) abierto=:`, seccion.abierto);
    if (seccion.abierto) { this.cargarHijosSeccion(seccion); }
  }

  /** Carga subsecciones y series de una sección. Reutilizable por el clic y por el auto-expandir. */
  private async cargarHijosSeccion(seccion: any): Promise<void> {
    if (seccion.cargado) { return; }

    seccion.cargando = true;
    try {
      const resp: any = await firstValueFrom(forkJoin({
        proyectosHijos: this.usersService.listarHijos(seccion.id_proyecto, this.USER_SELECTED.id),
        seriesRaiz: this.usersService.listarSeriesRaiz(seccion.id_proyecto, this.USER_SELECTED.id)
      }));

      // Mapeo hijos (Subsecciones)
      seccion.subsecciones = (resp?.proyectosHijos?.hijos || []).map((h: any) => ({
        ...h,
        isSerie: false, // Es subsección
        nivel: (h.nivel || 'subseccion'),
        subsecciones: [],
        series: [],
        abierto: false,
        cargando: false,
        cargado: false,
        permisos: this.findPermisosForNodo('subseccion', h.id_proyecto) || h.permisos || this.crearPermisosVacios()
      }));

      // Mapeo series raíz
      seccion.series = (resp?.seriesRaiz?.series || []).map((s: any) => ({
        ...s,
        isSerie: true, // Es serie
        nivel: 'serie',
        subseries: [],
        abierto: false,
        cargando: false,
        cargado: false,
        permisos: this.findPermisosForNodo('serie', s.id_serie) || s.permisos || this.crearPermisosVacios()
      }));

      seccion.cargado = true;
      console.log('[LOAD] Subsecciones y series raíz cargadas para sección:', seccion?.nombre);
    } catch {
      console.warn('[LOAD] No se pudieron cargar los hijos de la sección:', seccion?.nombre);
    } finally {
      seccion.cargando = false;
    }
  }

// --- Carga Series Hijas (Recursivo) ---
  toggleSerie(serie: any) {
    serie.abierto = !serie.abierto;
    const tipoSerie = serie.nivel === 'subserie' ? 'subserie' : 'serie';
    console.log(`[CLICK] ${tipoSerie} ${serie?.nombre} (${serie?.id_serie}) abierto=:`, serie.abierto);
    if (serie.abierto) { this.cargarHijosSerie(serie); }
  }

  /** Carga las subseries de una serie. Reutilizable por el clic y por el auto-expandir. */
  private async cargarHijosSerie(serie: any): Promise<void> {
    if (serie.cargado) { return; }

    serie.cargando = true;
    try {
      const resp: any = await firstValueFrom(
        this.usersService.listarSeriesHijas(serie.id_serie, this.USER_SELECTED.id)
      );

      serie.subseries = (resp?.hijas || []).map((h: any) => ({
        ...h,
        isSerie: true, // Es subserie
        nivel: 'subserie',
        subseries: [],
        abierto: false,
        cargando: false,
        cargado: false,
        permisos: this.findPermisosForNodo('subserie', h.id_serie) || h.permisos || this.crearPermisosVacios()
      }));

      serie.cargado = true;
      console.log('[LOAD] Subseries cargadas para serie:', serie?.nombre);
    } catch {
      console.warn('[LOAD] No se pudieron cargar las subseries de:', serie?.nombre);
    } finally {
      serie.cargando = false;
    }
  }
  // --- Lógica de Checkbox "Marcar todo" ---
 // Lógica principal de cambios (lo que pediste)
  addPermission(item: any, campo: string, event: any): void {
    const isChecked = event.target.checked;
    item.permisos[campo] = isChecked; // Actualiza el modelo
    this.upsertCambioNodo(item);
  }

  // Modificado para registrar el cambio masivo también
  toggleTodo(item: any) {
    const estado = !!item.permisos.checkGeneral;
    Object.keys(item.permisos).forEach(key => item.permisos[key] = estado);
    this.upsertCambioNodo(item);
  }

  // Determina el nivel del nodo para diferenciar seccion/subseccion/subsubseccion/serie/subserie
  private detectarNivel(item: any): string {
    if (item.isSerie) {
      return item.nivel === 'subserie' ? 'subserie' : 'serie';
    }
    // Normalizar 'nivel' si viene numérico desde backend
    if (typeof item.nivel === 'number') {
      const n = item.nivel;
      if (n >= 3) return 'subsubseccion';
      if (n >= 2) return 'subseccion';
      return 'seccion';
    }
    // Para proyectos: si backend manda string, lo usamos
    if (typeof item.nivel === 'string') return item.nivel;
    return 'seccion';
  }

  // Inserta/actualiza un cambio de un nodo, agrupado por nodo (no por campo)
  private upsertCambioNodo(item: any) {
    const id = item.id_proyecto || item.id_seccion || item.id_serie;
    const key = `${this.detectarNivel(item)}_${id}`;
    const entry = {
      id,
      tipo: this.detectarNivel(item),
      nombre: item.nombre,
      permisos: { ...item.permisos }
    };
    this.cambiosMap[key] = entry;
    this.cambiosPendientes = Object.values(this.cambiosMap);
    console.log('Cambios registrados (agrupados):', this.cambiosPendientes);
  }

  // Crea un lookup rápido de permisos por clave de alcance
  private buildPermisoLookup(items: any[]): { [key: string]: any } {
    const map: any = {};
    (items || []).forEach((it: any) => {
      const keys: string[] = [];
      if (it.id_seccion) keys.push(`seccion_${it.id_seccion}`);
      if (it.id_subseccion) keys.push(`subseccion_${it.id_subseccion}`);
      if (it.id_subsubseccion) keys.push(`subsubseccion_${it.id_subsubseccion}`);
      if (it.id_serie) keys.push(`serie_${it.id_serie}`);
      if (it.id_subserie) keys.push(`subserie_${it.id_subserie}`);
      // Si por alguna razón no hay alcance, lo ignoramos
      keys.forEach(k => map[k] = it);
    });
    return map;
  }

  // Dado el tipo y el id, retorna un objeto Permisos listo para el nodo o null
  private findPermisosForNodo(tipo: 'seccion'|'subseccion'|'subsubseccion'|'serie'|'subserie', id: any): any | null {
    const raw = this.permisoLookup?.[`${tipo}_${id}`];
    if (!raw) return null;
    const p = this.crearPermisosVacios();
    // Mapear booleans con defaults
    p.ver = !!raw.ver;
    p.crear = !!raw.crear;
    p.editar = !!raw.editar;
    p.eliminar = !!raw.eliminar;
    PERMISOS_SERIE.forEach(item => p[item.campo] = !!raw[item.campo]);
    return p;
  }

  // Recorre el árbol y construye el arreglo de permisos documentales estilo edit-user
  private buildPermisosDocumentales(): any[] {
    const permisos: any[] = [];

    const pushNodo = (nodo: any) => {
      const p = nodo.permisos as Permisos;
      if (!p) return;
      // Si no hay ningún permiso marcado, omitimos el nodo
      const algunTrue = Object.keys(p).some(k => k !== 'checkGeneral' && !!p[k]);
      if (!algunTrue) return;

      const permisosPlanos: any = {
        ver: !!p.ver,
        crear: !!p.crear,
        editar: !!p.editar,
        eliminar: !!p.eliminar,
      };
      PERMISOS_SERIE.forEach(campo => permisosPlanos[campo.campo] = !!p[campo.campo]);

      const item: any = {
        id_empresa: this.id_empresa,
        permisos: permisosPlanos
      };

      const nivel = this.detectarNivel(nodo);
      if (nivel === 'serie') item.id_serie = nodo.id_serie;
      else if (nivel === 'subserie') item.id_subserie = nodo.id_serie;
      else if (nivel === 'seccion') item.id_seccion = nodo.id_proyecto || nodo.id_seccion;
      else if (nivel === 'subseccion') item.id_subseccion = nodo.id_proyecto || nodo.id_seccion || nodo.id_subseccion || nodo.id;
      else if (nivel === 'subsubseccion') item.id_subsubseccion = nodo.id_proyecto || nodo.id_seccion || nodo.id_subsubseccion || nodo.id;

      permisos.push(item);
    };

    const walkProyecto = (nodo: any, depth: number) => {
      // Establecer nivel si falta
      if (!nodo.nivel) {
        nodo.nivel = depth === 0 ? 'seccion' : depth === 1 ? 'subseccion' : 'subsubseccion';
      }
      pushNodo(nodo);
      // hijos proyectos
      (nodo.subsecciones || []).forEach((h: any) => walkProyecto(h, depth + 1));
      // series raíz bajo este proyecto
      (nodo.series || []).forEach((s: any) => {
        if (!s.nivel) s.nivel = 'serie';
        pushNodo(s);
        (s.subseries || []).forEach((ss: any) => {
          if (!ss.nivel) ss.nivel = 'subserie';
          pushNodo(ss);
        });
      });
    };

    (this.secciones || []).forEach((s: any) => walkProyecto(s, 0));
    return permisos;
  }

  // Guarda los cambios en el backend
  guardarCambios(): void {
    const payload = this.buildPermisosDocumentales();
    this.isLoading = true;
    this.usersService.guardarPermisosDocumentales(this.USER_SELECTED.id, payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.cambiosPendientes = [];
        console.log('✅ Permisos documentales guardados');
        this.toast.success('Permisos guardados correctamente');
      },
      error: (err) => {
        this.isLoading = false;
        console.error('❌ Error al guardar permisos documentales', err);
        this.toast.error('No se pudieron guardar los permisos');
      }
    });
  }
  
}
