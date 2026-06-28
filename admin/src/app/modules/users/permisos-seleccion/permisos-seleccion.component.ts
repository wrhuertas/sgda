import { Component, OnInit, Input, TemplateRef, ViewChild } from '@angular/core';
import { UsersService } from '../service/users.service';
import { forkJoin } from 'rxjs';
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
}

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

  ngOnInit(): void {
    if (this.USER_SELECTED) {
      this.id_empresa = this.id_empresa || this.USER_SELECTED.id_empresa;
      console.log('[PERMISOS] Modal abierto para usuario:', this.USER_SELECTED.id, 'empresa:', this.id_empresa);
      // Primero traer permisos del usuario para precargar checks
      this.usersService.getPermisosDocumentalesUsuario(this.USER_SELECTED.id).subscribe((resp: any) => {
        this.permisosBD = resp?.permissions || [];
        this.permisoLookup = this.buildPermisoLookup(this.permisosBD);
        console.log('[PERMISOS] Permisos cargados desde BD:', this.permisosBD);
        this.cargarSeccionesRaiz();
      }, () => {
        // En caso de error, continuar sin lookup
        console.warn('[PERMISOS] No se pudieron cargar permisos BD, continuando sin lookup');
        this.cargarSeccionesRaiz();
      });
    }
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
    return {
      checkGeneral: false, ver: false, crear: false, editar: false, eliminar: false,
      buscar: false, subir_documentos: false, ver_documento: false, registrar_datos: false,
      indexar: false, indexar_masivo: false, eliminar_documento: false, firmar_documento: false, limpiar_documento: false
    };
  }

  // --- Carga Inicial (Nivel 1) ---
  cargarSeccionesRaiz() {
    this.isLoading = true;
    this.usersService.listarSeccionesRaiz(this.id_empresa, this.USER_SELECTED.id).subscribe((resp: any) => {
      this.secciones = resp.secciones.map((s: any) => ({
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
      this.isLoading = false;
    });
  }

  // --- Expansión de Proyectos ---
// --- Carga Hijos (Proyectos y Series Raíz) ---
  toggleSeccion(seccion: any) {
  seccion.abierto = !seccion.abierto;
  console.log(`[CLICK] Seccion ${seccion?.nombre} (${seccion?.id_proyecto}) abierto=:`, seccion.abierto);
  if (seccion.abierto && !seccion.cargado) {
    seccion.cargando = true;
    forkJoin({
      proyectosHijos: this.usersService.listarHijos(seccion.id_proyecto, this.USER_SELECTED.id),
      seriesRaiz: this.usersService.listarSeriesRaiz(seccion.id_proyecto, this.USER_SELECTED.id)
    }).subscribe((resp: any) => {
      // Mapeo hijos (Subsecciones)
      seccion.subsecciones = resp.proyectosHijos.hijos.map((h: any) => ({
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
      seccion.series = resp.seriesRaiz.series.map((s: any) => ({
        ...s,
        isSerie: true, // Es serie
        nivel: 'serie',
        subseries: [],
        abierto: false,
        cargando: false,
        cargado: false,
        permisos: this.findPermisosForNodo('serie', s.id_serie) || s.permisos || this.crearPermisosVacios()
      }));
      seccion.cargando = false;
      seccion.cargado = true;
      console.log('[LOAD] Subsecciones y series raíz cargadas para sección:', seccion?.nombre);
    });
  }
}

// --- Carga Series Hijas (Recursivo) ---
  toggleSerie(serie: any) {
  serie.abierto = !serie.abierto;
  const tipoSerie = serie.nivel === 'subserie' ? 'subserie' : 'serie';
  console.log(`[CLICK] ${tipoSerie} ${serie?.nombre} (${serie?.id_serie}) abierto=:`, serie.abierto);
  if (serie.abierto && !serie.cargado) {
    serie.cargando = true;
    this.usersService.listarSeriesHijas(serie.id_serie, this.USER_SELECTED.id).subscribe({
      next: (resp: any) => {
        serie.subseries = (resp.hijas || []).map((h: any) => ({
          ...h,
          isSerie: true, // Es subserie
          nivel: 'subserie',
          subseries: [],
          abierto: false,
          cargando: false,
          cargado: false,
          permisos: this.findPermisosForNodo('subserie', h.id_serie) || h.permisos || this.crearPermisosVacios()
        }));
        serie.cargando = false;
        serie.cargado = true;
        console.log('[LOAD] Subseries cargadas para serie:', serie?.nombre);
      },
      error: () => { serie.cargando = false; }
    });
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
    p.buscar = !!raw.buscar;
    p.subir_documentos = !!raw.subir_documentos;
    p.ver_documento = !!raw.ver_documento;
    p.registrar_datos = !!raw.registrar_datos;
    p.indexar = !!raw.indexar;
    p.indexar_masivo = !!raw.indexar_masivo;
    p.eliminar_documento = !!raw.eliminar_documento;
    p.firmar_documento = !!raw.firmar_documento;
    p.limpiar_documento = !!raw.limpiar_documento;
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

      const item: any = {
        id_empresa: this.id_empresa,
        permisos: {
          ver: !!p.ver,
          crear: !!p.crear,
          editar: !!p.editar,
          eliminar: !!p.eliminar,
          buscar: !!p.buscar,
          subir_documentos: !!p.subir_documentos,
          ver_documento: !!p.ver_documento,
          registrar_datos: !!p.registrar_datos,
          indexar: !!p.indexar,
          indexar_masivo: !!p.indexar_masivo,
          eliminar_documento: !!p.eliminar_documento,
          firmar_documento: !!p.firmar_documento,
          limpiar_documento: !!p.limpiar_documento,
        }
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
