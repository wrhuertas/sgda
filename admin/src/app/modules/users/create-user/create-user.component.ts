import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { UsersService } from '../service/users.service';
import { SIDEBAR } from 'src/app/config/config'; // -> Se asume que esta importación es real y provee la data
import { AreaRegistrarComponent } from '../area-registrar/area-registrar.component';
import Swal from 'sweetalert2';
import { AuthService } from '../../auth';

interface PermisoItem {
  permiso: string;
  name: string;
}

interface GrupoPermisos {
  name: string;
  permisos: PermisoItem[];
}


interface Seccion {
  id: number;
  nombre: string;
}

interface SubSeccion {
  id: number;
  nombre: string;
  seccion_id: number;
}

interface SubSubSeccion {
  id: number;
  nombre: string;
  subseccion_id: number;
}


export interface Proyecto {
  id_proyecto: number;
  nombre: string;
  subsecciones?: Proyecto[];
  series?: Serie[];
  expanded?: boolean; // 👈 controla visualización
}


export interface Serie {
  id_serie: number;
  nombre: string;
  hijos_recursivos?: Serie[];
  expanded?: boolean;
}


export interface Permisos {
  // permisos base
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;

  // permisos documentales (solo serie / subserie)
  buscar?: boolean;
  subir_documentos?: boolean;
  ver_documento?: boolean;
  registrar_datos?: boolean;
  indexar?: boolean;
  indexar_masivo?: boolean;
  eliminar_documento?: boolean;
  firmar_documento?: boolean;
  limpiar_documento?: boolean;
}







@Component({
  selector: 'app-create-user',
  templateUrl: './create-user.component.html',
  styleUrls: ['./create-user.component.scss']
})
export class CreateUserComponent {

  @Output() UserC: EventEmitter<any> = new EventEmitter();
  @Input() roles: { id: any, name: string }[] = [];

  @Input() sucursales:any = [];
  @Input() areas: any[] = [];

  @Input() secciones: any[] = [];


  availablePermissions: GrupoPermisos[] = [];


  isLoading:any;
  
  name:string = '';
  surname:string = '';
  email:string = '';
  phone:string = '';
  sigla:string = '';
  titulo:string = '';
  role_id:string = '';
  gender:string = '';
tiposDocumento: { value: string, label: string }[] = [
  { value: 'CEDULA IDENTIDAD', label: 'Cédula' },
  { value: 'RUC', label: 'RUC' },
  { value: 'PASAPORTE', label: 'Pasaporte' }
];

public titulosAmigables: { [key: string]: string } = {
  'Tramite': 'Crear Trámite (Cliente)',
  'Asignar Tramites': 'Asignación de Trámites',
  'Sección Docuemntal': 'Sección Documental', // Aquí corregimos la ortografía
  'Recepcion Trámite': 'Recepción de trámites',
  'Desapcho Trámite': 'Desapcho de trámites',
  'Busqueda de documentos': 'Buscador de Archivos',
  'Historial Tramite': 'Historial de Trámites',
  'Seguimiento': 'Seguimiento trámite',
};



showPermisosDocumentalesSection = false;
showPermisosDocumentales = false;
enablePermisosDocumentales = false;    // aparece o no

  documentPermissions = [
  {
    name: 'Documentos',
    permisos: [
      { name: 'Ver documentos', permiso: 'documentos_ver' },
      { name: 'Subir documentos', permiso: 'documentos_subir' },
      { name: 'Editar documentos', permiso: 'documentos_editar' },
      { name: 'Eliminar documentos', permiso: 'documentos_eliminar' },
    ]
  },
  {
    name: 'Expedientes',
    permisos: [
      { name: 'Ver expedientes', permiso: 'expedientes_ver' },
      { name: 'Adjuntar archivos', permiso: 'expedientes_adjuntar' },
    ]
  }
];


permisosMap: {
  [key: string]: Permisos;
} = {};


subsecciones: any[] = [];  // Nivel 2
seccion: any[] = [];      // Nivel 1
subsubsecciones: any[] = []; // Nivel 3

// Variables para los ngModel
id_proyecto_seleccionado: any = '';
id_subseccion_seleccionada: any = '';
id_subsubseccion_seleccionada: any = '';

initPermisos(key: string) {
  if (!this.permisosMap[key]) {
    this.permisosMap[key] = {
      ver: true,
      crear: false,
      editar: false,
      eliminar: false,
      buscar: false,
      subir_documentos: false,
      ver_documento: false,
      registrar_datos: false,
      indexar: false,
      indexar_masivo: false,
      eliminar_documento: false,
      firmar_documento: false,
      limpiar_documento: false
    };
  }
}







// Variable ligada al ngModel
type_document: string = '';
  n_document:string = '';
  address:string = '';
  sucursale_id:string = '';

  area_id: string = '';
  cedulaValida: boolean | null = null; 
  rucValido: boolean | null = null;

  file_name:any;
  imagen_previzualiza:any;
  loggedUser: any; 
  id_empresa: number | null = null;

  password:string = '';
  password_repit:string = '';
  
  permisions: any[] = [];
  // Grupos de módulos para selección masiva (Trámites)
  groupRecepAdminMods: string[] = ['Tipo Documento','Tipo Tramite','Cliente','Recepcion Trámite','Despacho Trámite'];
  groupUsuarioInternoMods: string[] = ['Asignar Tramites','Historial Tramite','Buzon Tramite'];
  groupClienteExternoMods: string[] = ['Tramite','Seguimiento'];
  
  // Se declara la propiedad de la clase para exponer la constante importada (tal como se solicitó)
  SIDEBAR: any = SIDEBAR; 


  // ===== FIRMA DIGITAL =====
  firmaFile: File | null = null;
  contrasena_firma: string = '';
  fecha_expiracion_firma: string = '';


  emailExiste: boolean = false;
  emailChecking: boolean = false;

  private emailTimer: any;


//subsecciones: Proyecto[] = [];
subSubSecciones: Proyecto[] = [];

  // SELECCIÓN
  selectedSeccionId: number | null = null;
  selectedSubseccionId: number | null = null;
  nodoSeleccionado: number | null = null;

seccionSeleccionadas: number[] = [];
subseccionSeleccionadas: number[] = [];
subSubSeleccionadas: number[] = [];


series: Serie[] = [];
subSeries: Serie[] = [];

seriesSeleccionadas: number[] = [];
subSeriesSeleccionadas: number[] = [];

// 🔹 MAPAS PARA CONTROLAR EL ÁRBOL COMPLETO
subseccionesMap: { [key: number]: any[] } = {};
subSubSeccionesMap: { [key: number]: any[] } = {};
seriesMap: { [key: number]: any[] } = {};
subSeriesMap: { [key: number]: any[] } = {};
usuario_recepcionista: boolean = false;
usuario_despacho: boolean = false;


  constructor(
    public modal: NgbActiveModal,
    public usersService: UsersService,
    public toast: ToastrService,
    public modalService: NgbModal,
    public authService: AuthService,
    private cdr: ChangeDetectorRef,
    
  ) {
    
  }

  ngOnInit(): void {
    // Carga el usuario logeado desde localStorage
    this.loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    if (this.loggedUser && this.loggedUser.id_empresa) {
      this.id_empresa = this.loggedUser.id_empresa;
    }
    // Inicializa los permisos disponibles para asignar
    this.initPermissions();
    console.log("Áreas recibidas en el modal:", this.areas);
    this.cargarSeccion();
  }

  get rolSeleccionadoNombre(): string {
  const rol = this.roles.find(r => r.id == this.role_id);
  return rol ? rol.name : '';
this.cargarSeccion();

   // 🔹 EJEMPLO DE DATA (luego viene del backend)
    this.secciones = [
      { id: 1, nombre: 'Recursos Humanos' },
      { id: 2, nombre: 'Finanzas' }
    ];
  this.cargarSeccion();
}

  
  initPermissions(): void {
    // Si no hay usuario logeado o no tiene permisos, no hay nada que asignar
    if (!this.loggedUser || !this.loggedUser.permissions) {
      this.availablePermissions = [];
      return;
    }
    
    // Si es Super Administrador, puede ver todos los permisos
    if (this.loggedUser.role_name === 'Super Administrador') {
        // Se usa la propiedad de clase this.SIDEBAR
        this.availablePermissions = this.SIDEBAR;
    } else {
        // Si es Admin, solo puede ver los permisos que él mismo tiene
        const userPermissionsSet = new Set(this.loggedUser.permissions);
        
        this.availablePermissions = this.SIDEBAR // Se usa la propiedad de clase this.SIDEBAR
            // Mapea los grupos de permisos
            .map((group: any) => ({
                ...group,
                // Filtra los permisos individuales del grupo
                permisos: group.permisos.filter((permiso: any) => 
                    userPermissionsSet.has(permiso.permiso)
                )
            }))
            // Elimina los grupos que quedaron vacíos después del filtro
            .filter((group: any) => group.permisos.length > 0);
    }
  }

  addPermission(permiso: string, event: any): void {
    if (event.target.checked) {
      this.permisions.push(permiso);
    } else {
      this.permisions = this.permisions.filter(p => p !== permiso);
    }

    const permisosDocumentales = this.getDocumentalPermissionKeys();

    // 👇 APARECE EL BLOQUE SI HAY AL MENOS UNO
    this.enablePermisosDocumentales =
      permisosDocumentales.some(p => this.permisions.includes(p));

    // 👇 Si ya no hay ninguno, lo cerramos
    if (!this.enablePermisosDocumentales) {
      this.showPermisosDocumentales = false;
    }

    // 👇 Actualiza el estado del bloque documental
    this.actualizarLogicaDocumental();

    console.log('Permisos seleccionados:', this.permisions);
    console.log('Mostrar bloque:', this.enablePermisosDocumentales);
  }

  // ===== Selección masiva por grupo (Trámites) =====
  private getPermissionKeysForModules(modNames: string[]): string[] {
    const keys: string[] = [];
    (this.availablePermissions || []).forEach((group: any) => {
      if (modNames.includes(group.name)) {
        (group.permisos || []).forEach((p: any) => keys.push(p.permiso));
      }
    });
    return keys;
  }

  isGroupSelected(modNames: string[]): boolean {
    const keys = this.getPermissionKeysForModules(modNames);
    if (keys.length === 0) return false;
    const set = new Set(this.permisions);
    return keys.every(k => set.has(k));
  }

  toggleGroupPermissions(modNames: string[], event: any): void {
    const checked = !!event?.target?.checked;
    const keys = this.getPermissionKeysForModules(modNames);
    if (checked) {
      const set = new Set([...(this.permisions || []), ...keys]);
      this.permisions = Array.from(set);
    } else {
      const rm = new Set(keys);
      this.permisions = (this.permisions || []).filter((p: string) => !rm.has(p));
    }
  }




  // 1. Verifica si todos los permisos que el usuario ve están seleccionados
isAllSelected(): boolean {
  if (!this.availablePermissions || this.availablePermissions.length === 0) return false;

  // Calculamos el total de permisos individuales dentro de los grupos visibles
  const totalVisible = this.availablePermissions.reduce((acc, group) => acc + group.permisos.length, 0);
  
  // Si la cantidad de permisos seleccionados es igual al total visible
  return this.permisions.length === totalVisible && totalVisible > 0;
}

// 2. Acción del Switch
toggleAllPermissions(event: any): void {
  const isChecked = event.target.checked;

  if (isChecked) {
    // Recorremos todos los grupos y extraemos los nombres de los permisos
    const allAvailable: string[] = [];
    this.availablePermissions.forEach(group => {
      group.permisos.forEach((p: any) => {
        allAvailable.push(p.permiso);
      });
    });
    // Asignamos todos (usamos Set por si hay duplicados, aunque no debería)
    this.permisions = [...new Set(allAvailable)];
  } else {
    // Limpiamos la selección
    this.permisions = [];
  }

  // Actualizamos la lógica de permisos documentales que ya tienes
  this.actualizarLogicaDocumental();
}

// Mueve tu lógica de permisos documentales aquí para reutilizarla
  private actualizarLogicaDocumental(): void {
    const permisosDocumentales = this.getDocumentalPermissionKeys();
    this.enablePermisosDocumentales = permisosDocumentales.some(p => this.permisions.includes(p));

    if (!this.enablePermisosDocumentales) {
      this.showPermisosDocumentales = false;
    }
  }




  allowOnlyNumbers(event: KeyboardEvent) {
    const charCode = event.charCode ? event.charCode : event.keyCode;
    // Permite solo números (0-9)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  processFile($event:any){
    if($event.target.files[0].type.indexOf("image") < 0){
      this.toast.warning("WARN","El archivo no es una imagen");
      return;
    }
    this.file_name = $event.target.files[0];
    let reader = new FileReader();
    reader.readAsDataURL(this.file_name);
    reader.onloadend = () => this.imagen_previzualiza = reader.result;
  }

  isValidEmail(email: string): boolean {
    // Expresión regular básica para validar email
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }


  onEmailChange(email: string) {

  this.correoInvalid = false;
  this.emailExiste = false;

  // ❌ vacío
  if (!email) {
    return;
  }

  // ❌ formato inválido
  if (!this.isValidEmail(email)) {
    return;
  }

  // ⏳ debounce (evita muchas llamadas)
  clearTimeout(this.emailTimer);

  this.emailChecking = true;

  this.emailTimer = setTimeout(() => {

      this.usersService.checkEmail(email).subscribe({
        next: (exists) => {
          this.emailExiste = exists; // ✅ true o false
        }
      });


  }, 500);
}



  


  // 1. LLAMA A ESTA FUNCIÓN en el (change) de tu selector de tipo
  onTypeDocumentChange() {
    // 1. Borra el número escrito en el input
    this.n_document = ''; 
    
    // 2. Resetea el estado de validación (quita los bordes rojo/verde)
    this.cedulaValida = null; 
    
    // Opcional: si usas la variable rucValido por separado, límpiala también
    this.rucValido = null; 
  }

  // 2. FUNCIÓN DE VALIDACIÓN UNIFICADA
  validarDocumento(valor: any): boolean {
    const doc = String(valor).trim();
    if (!doc || !/^\d+$/.test(doc)) return false;

    const prov = parseInt(doc.substring(0, 2), 10);
    if (prov < 1 || (prov > 24 && prov !== 30)) return false;

    // VALIDACIÓN CÉDULA (10 dígitos)
    if (this.type_document === 'CEDULA IDENTIDAD') {
      if (doc.length !== 10) return false;
      return this.algoritmoModulo10(doc);
    }

    // VALIDACIÓN RUC (13 dígitos)
    if (this.type_document === 'RUC') {
      if (doc.length !== 13 || !doc.endsWith('001')) return false;
      const tercerDigito = parseInt(doc[2], 10);

      if (tercerDigito < 6) { // Persona Natural
        return this.algoritmoModulo10(doc.substring(0, 10));
      } else if (tercerDigito === 6) { // Pública
        return this.algoritmoRucExtra(doc, [3, 2, 7, 6, 5, 4, 3, 2], 8);
      } else if (tercerDigito === 9) { // Privada/Jurídica
        return this.algoritmoRucExtra(doc, [4, 3, 2, 7, 6, 5, 4, 3, 2], 9);
      }
    }
    
    return doc.length > 5; // Pasaporte simple
  }

  private algoritmoModulo10(digitos10: string): boolean {
    const d = digitos10.split('').map(Number);
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let p = d[i] * (i % 2 === 0 ? 2 : 1);
      suma += p > 9 ? p - 9 : p;
    }
    const dv = (10 - (suma % 10)) % 10;
    return dv === d[9];
  }

  private algoritmoRucExtra(ruc: string, coef: number[], pos: number): boolean {
    const d = ruc.split('').map(Number);
    let suma = 0;
    for (let i = 0; i < coef.length; i++) suma += d[i] * coef[i];
    const residuo = suma % 11;
    const dv = residuo === 0 ? 0 : 11 - residuo;
    return dv === d[pos];
  }



  getDocumentalPermissionKeys(): string[] {
    // Aceptar variantes: 'documento', 'documental' y el nombre exacto usado en el sidebar
    const esGrupoDocumental = (name: string) => {
      const n = (name || '').toLowerCase();
      return n.includes('documento') || n.includes('documental') || n.includes('sección docuemntal');
    };

    const grupoDocumentos = this.availablePermissions.find(g => esGrupoDocumental(g.name));

    const permisosGrupo = grupoDocumentos
      ? grupoDocumentos.permisos.map(p => p.permiso)
      : [];

    const permisosExtra = [
      'register_documento'
    ];

    return Array.from(new Set([...permisosGrupo, ...permisosExtra]));
  }



   onFirmaSelected(event: any): void {
    const file = event.target.files[0];

    if (!file) {
      this.firmaFile = null;
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'p12' && extension !== 'pfx') {
      this.toast.error(
        'Validación',
        'Solo se permiten archivos .p12 o .pfx'
      );
      event.target.value = '';
      this.firmaFile = null;
      return;
    }

    this.firmaFile = file;

    console.log('📄 Firma seleccionada:', file.name);
  }





  RegistrarArea() {
    const modalRef = this.modalService.open(
      AreaRegistrarComponent,
      { centered: true, size: 'lg', backdrop: 'static' }
    );

    // 🔹 enviar empresa al modal
    modalRef.componentInstance.id_empresa = this.id_empresa;

    // 🔹 recibir área creada
    modalRef.componentInstance.UserC.subscribe((area: any) => {

      // ➕ agregar área al select
      this.areas.unshift(area);

      // ➕ seleccionar automáticamente
      this.area_id = area.id_area;

      this.toast.success('Área registrada correctamente');
    });
  }





  togglePermisosDocumentales() {
    console.log('✅ CLICK EN PERMISOS DOCUMENTALES');
    this.showPermisosDocumentales = !this.showPermisosDocumentales;
    console.log('showPermisosDocumentales:', this.showPermisosDocumentales);
  }








onSeccionChange(event: any) {
  const id = +event.target.value;

  const seccion = this.secciones.find(
    s => s.id_proyecto === id
  );

  this.subsecciones = seccion?.subsecciones || [];
  this.subSubSecciones = []; // reset
}

onSubSeccionChange(event: any) {
  const id = +event.target.value;

  const sub = this.subsecciones.find(
    s => s.id_proyecto === id
  );

  this.subSubSecciones = sub?.subsecciones || [];
}











toggleSeccion(seccion: any, event: any) {
  const checked = event.target.checked;

  console.log('[SECCION]', seccion.id_proyecto, 'checked:', checked);

  if (checked) {
    this.initPermisos('seccion_' + seccion.id_proyecto);
    this.subseccionesMap[seccion.id_proyecto] =
      seccion.subsecciones ? [...seccion.subsecciones] : [];
  } else {
    delete this.permisosMap['seccion_' + seccion.id_proyecto];
    delete this.subseccionesMap[seccion.id_proyecto];
  }
}

logPermiso(key: string, permiso: string, value: boolean) {
  console.log(
    '[PERMISO]',
    key,
    permiso,
    '=>',
    value
  );
}



marcarTodoMasivo(seccion: any, event: any) {
  const isChecked = event.target.checked;
  const key = 'seccion_' + seccion.id_proyecto;

  if (isChecked) {
    // 1. Marcar la Sección principal
    this.initPermisos(key);
    this.marcarObjeto(this.permisosMap[key], true);

    // 2. Cargar subsecciones para que se vean en el HTML
    this.subseccionesMap[seccion.id_proyecto] = seccion.subsecciones ? [...seccion.subsecciones] : [];
    
    // 3. Recorrer hijos recursivamente para marcar sus propios permisos
    seccion.subsecciones?.forEach((sub: any) => {
      this.marcarHijosRecursivo(sub, true);
    });
  } else {
    // Limpiar todo si se desmarca
    this.limpiarMapasRecursivo(seccion);
    delete this.permisosMap[key];
  }
}

private marcarHijosRecursivo(nodo: any, isChecked: boolean) {
  if (!nodo) return;

  // KEY para Subsección (ajusta 'sub_' según uses en tu HTML)
  const subKey = 'sub_' + nodo.id_proyecto;
  this.initPermisos(subKey);
  this.marcarObjeto(this.permisosMap[subKey], isChecked);

  // Si tiene Sub-subsecciones
  if (nodo.subsecciones?.length) {
    this.subSubSeccionesMap[nodo.id_proyecto] = [...nodo.subsecciones];
    nodo.subsecciones.forEach((ss: any) => {
      const ssKey = 'subsub_' + ss.id_proyecto;
      this.initPermisos(ssKey);
      this.marcarObjeto(this.permisosMap[ssKey], isChecked);
    });
  }

  // Si tiene Series
  if (nodo.series?.length) {
    this.seriesMap[nodo.id_proyecto] = [...nodo.series];
    nodo.series.forEach((serie: any) => {
      const serieKey = 'serie_' + serie.id_serie;
      this.initPermisos(serieKey);
      this.marcarObjeto(this.permisosMap[serieKey], isChecked);

      if (serie.hijos_recursivos?.length) {
        this.subSeriesMap[serie.id_serie] = [...serie.hijos_recursivos];
        serie.hijos_recursivos.forEach((subS: any) => {
           const subSKey = 'subserie_' + subS.id_serie;
           this.initPermisos(subSKey);
           this.marcarObjeto(this.permisosMap[subSKey], isChecked);
        });
      }
    });
  }
}

// Función auxiliar para poner todos los booleanos en true/false
  private marcarObjeto(obj: any, value: boolean) {
    if (obj) {
      Object.keys(obj).forEach(p => obj[p] = value);
    }
  }

  // Devuelve true si existen permisos para la key y todos están en true
  isAllPermsTrue(key: string): boolean {
    const obj = this.permisosMap[key];
    if (!obj) return false;
    return Object.values(obj).every(Boolean);
  }

private limpiarMapasRecursivo(nodo: any) {
  delete this.subseccionesMap[nodo.id_proyecto];
  delete this.subSubSeccionesMap[nodo.id_proyecto];
  delete this.seriesMap[nodo.id_proyecto];
  
  nodo.subsecciones?.forEach((s: any) => this.limpiarMapasRecursivo(s));
  nodo.series?.forEach((ser: any) => {
    delete this.subSeriesMap[ser.id_serie];
    delete this.permisosMap['serie_' + ser.id_serie];
  });
}



toggleSubSeccion(sub: any, event: any) {
  console.log(
    '[SUBSECCION]',
    sub.id_proyecto,
    'checked:',
    event.target.checked
  );

  if (event.target.checked) {

    if (sub.subsecciones?.length) {
      this.subSubSeccionesMap[sub.id_proyecto] = [...sub.subsecciones];
    }

    if (sub.series?.length) {
      this.seriesMap[sub.id_proyecto] = [...sub.series];
    }

  } else {
    delete this.subSubSeccionesMap[sub.id_proyecto];
    delete this.seriesMap[sub.id_proyecto];
  }
}




marcarTodoNodo(nodo: any, event: any, prefijo: string) {
  const isChecked = event.target.checked;
  const key = prefijo + nodo.id_proyecto;

  // 1. Marcar el nodo actual (SubSección o Sub-Sub)
  this.initPermisos(key);
  this.marcarObjeto(this.permisosMap[key], isChecked);

  if (isChecked) {
    // 2. Si es SubSección, abrir sus hijos (Series o Sub-Subsecciones)
    if (nodo.subsecciones?.length) {
      this.subSubSeccionesMap[nodo.id_proyecto] = [...nodo.subsecciones];
      // Marcar permisos de cada Sub-Sub
      nodo.subsecciones.forEach((ss: any) => {
        const ssKey = 'subsub_' + ss.id_proyecto;
        this.initPermisos(ssKey);
        this.marcarObjeto(this.permisosMap[ssKey], true);
        
        // Si la sub-sub tiene series, marcarlas también
        if (ss.series?.length) {
          this.seriesMap[ss.id_proyecto] = [...ss.series];
          ss.series.forEach((ser: any) => this.marcarSerieYSubseries(ser, true));
        }
      });
    }

    // 3. Si tiene Series directamente
    if (nodo.series?.length) {
      this.seriesMap[nodo.id_proyecto] = [...nodo.series];
      nodo.series.forEach((serie: any) => {
        this.marcarSerieYSubseries(serie, true);
      });
    }
  } else {
    // Si desmarca, podrías elegir limpiar los mapas o solo poner los permisos en false
    this.marcarObjeto(this.permisosMap[key], false);
    // Opcional: limpiarMapasRecursivo(nodo) si quieres que se cierre la vista
  }
}

// Función auxiliar para el nivel más profundo (Series y sus checkboxes internos)
  private marcarSerieYSubseries(serie: any, isChecked: boolean) {
    const sKey = 'serie_' + (serie.id_serie || serie.id_proyecto);
    this.initPermisos(sKey);
    this.marcarObjeto(this.permisosMap[sKey], isChecked);

    // Marcar Subseries si existen
    if (serie.hijos_recursivos?.length) {
      this.subSeriesMap[serie.id_serie] = [...serie.hijos_recursivos];
      serie.hijos_recursivos.forEach((subS: any) => {
        const subSKey = 'subserie_' + subS.id_serie;
        this.initPermisos(subSKey);
        this.marcarObjeto(this.permisosMap[subSKey], isChecked);
      });
    }
  }

  // Marcar/Desmarcar todos los permisos de una Serie y sus subseries
  marcarTodoSerie(serie: any, event: any) {
    const isChecked = event.target.checked;
    this.marcarSerieYSubseries(serie, isChecked);

    // Si se desmarca, opcionalmente cerramos la vista de subseries
    if (!isChecked) {
      delete this.subSeriesMap[serie.id_serie];
    } else if (serie.hijos_recursivos?.length) {
      // Asegurar que se visualicen si se marca
      this.subSeriesMap[serie.id_serie] = [...serie.hijos_recursivos];
    }
  }




toggleSubSub(ss: any, event: any) {
  console.log(
    '[SUB-SUB]',
    ss.id_proyecto,
    'checked:',
    event.target.checked
  );

  if (event.target.checked) {
    if (ss.series?.length) {
      this.seriesMap[ss.id_proyecto] = [...ss.series];
    }
  } else {
    delete this.seriesMap[ss.id_proyecto];
  }
}




toggleSerie(serie: any, event: any) {
  console.log(
    '[SERIE]',
    serie.id_serie,
    'checked:',
    event.target.checked
  );

  if (event.target.checked) {
    if (serie.hijos_recursivos?.length) {
      this.subSeriesMap[serie.id_serie] = [...serie.hijos_recursivos];
    }
  } else {
    delete this.subSeriesMap[serie.id_serie];
  }
}





toggleSubSerie(subSerie: Serie, event: any) {
  const checked = event.target.checked;
  const key = 'subserie_' + subSerie.id_serie;

  console.log('[SUBSERIE]', key, 'checked:', checked);

  if (checked) {
    this.initPermisos(key);
  } else {
    delete this.permisosMap[key];
  }
}






cargarSeriesDesdeNodo(nodo: any) {
  this.seriesMap[nodo.id_proyecto] = nodo.series
    ? [...nodo.series]
    : [];
}









    buildPermisosDocumentales() {
      const permisos: any[] = [];

      Object.keys(this.permisosMap).forEach(key => {

        const data = this.permisosMap[key];
        if (!data) return;

        const item: any = {
          id_empresa: this.id_empresa,
          permisos: data
        };

        // detectar tipo y ID
        if (key.startsWith('seccion_')) {
          item.id_seccion = Number(key.replace('seccion_', ''));
        }

        if (key.startsWith('sub_')) {
          item.id_subseccion = Number(key.replace('sub_', ''));
        }

        if (key.startsWith('subsub_')) {
          item.id_subsubseccion = Number(key.replace('subsub_', ''));
        }

        if (key.startsWith('serie_')) {
          item.id_serie = +key.replace('serie_', '');
        }

        if (key.startsWith('subserie_')) {
          item.id_subserie = +key.replace('subserie_', '');
        }

        permisos.push(item);
      });

      return permisos;
    }












    cargarSeccion() {
      const user = this.authService.user;
      if (!user || !user.id_empresa) {
          console.warn("No se encontró usuario o id_empresa en authService");
          return;
      }

      this.usersService.configSeccion(user.id_empresa).subscribe({
        next: (resp: any) => {
          console.log("Respuesta recibida del servidor (POST):", resp);
      
          // Verificamos que 'secciones' exista en la respuesta
          if (resp && resp.secciones) {
              this.seccion = resp.secciones; // Asignamos el array de proyectos/secciones
              console.log("Secciones cargadas:", this.seccion);
          } else {
              console.warn("La respuesta no contiene la propiedad 'secciones'", resp);
              this.seccion = [];
          }
          
          this.cdr.detectChanges();
      },
          error: (err) => {
              console.error("Error en la petición POST de Áreas:", err);
              this.toast.error('No se pudo cargar la configuración de áreas');
          }
      });
    }


    // Nivel 1 -> Nivel 2
    onSeccionChange1(id: any) {
      if (!id) {
        this.subsecciones = [];
        this.subsubsecciones = [];
        return;
      }

      // Buscamos en "this.seccion" (asegúrate que el nombre coincida con tu variable de clase)
      const encontrado = this.seccion.find(s => s.id_proyecto == id);

      this.subsecciones = encontrado?.subsecciones || [];
      this.subsubsecciones = []; // Reset nivel 3
      this.id_subseccion_seleccionada = ''; // Reset valor seleccionado
      
      // Forzamos a Angular a reconocer el cambio de inmediato
      this.cdr.detectChanges();
    }

    // Nivel 2 -> Nivel 3
    onSubseccionChange1(id: any) {
      if (!id) {
        this.subsubsecciones = [];
        return;
      }

      const subEncontrada = this.subsecciones.find(s => s.id_proyecto == id);

      this.subsubsecciones = subEncontrada?.subsecciones || [];
      this.id_subsubseccion_seleccionada = ''; // Reset valor seleccionado

      this.cdr.detectChanges();
    }























    // Flags de validación
    nombreInvalid = false;
    apellidoInvalid = false;
    selecttipodocumentoInvalid = false;
    numerodocuemntoInvalid = false;
    rucInvalid = false;
    cedulaInvalid = false;
    correoInvalid = false;
    adminPasswordInvalid = false;
    adminPasswordConfirmInvalid = false;
    rolInvalid = false;





  
  store(){



    // 1️⃣ DETERMINAR EL PROYECTO SELECCIONADO (Jerarquía)
    let proyectoFinalId = '';
    if (this.id_subsubseccion_seleccionada) {
        proyectoFinalId = this.id_subsubseccion_seleccionada;
    } else if (this.id_subseccion_seleccionada) {
        proyectoFinalId = this.id_subseccion_seleccionada;
    } else if (this.id_proyecto_seleccionado) {
        proyectoFinalId = this.id_proyecto_seleccionado;
    }




    // Reiniciar flags
    this.nombreInvalid = false;
    this.apellidoInvalid = false;
    this.selecttipodocumentoInvalid = false;
    this.numerodocuemntoInvalid = false;
    this.rucInvalid = false;
    this.cedulaInvalid = false;
    this.correoInvalid = false;
    this.adminPasswordInvalid = false;
    this.adminPasswordConfirmInvalid = false;
    this.rolInvalid = false;

    let valido = true;

    

      if (!this.name) {
        this.nombreInvalid = true;
        this.toast.error("Validación", "El nombre es requerido");
        valido = false;
      }

      if (!this.surname) {
        this.apellidoInvalid = true;
        this.toast.error("Validación", "El Apellido es requerido");
        valido = false;
      }

      if (!this.type_document) {
        this.apellidoInvalid = true;
        this.toast.error("Validación", "Debe seleccionar un tipo documento");
        valido = false;
      }
    
    
    if((!this.n_document)){
      this.toast.error("Validación","Es requerido el tipo de documento , junto con el numero del documento");
       valido = false;
    }

    if (!this.email) {
      this.correoInvalid = true;
      this.toast.error("Validación", "El correo es requerido");
      valido = false;
    } else if (!this.isValidEmail(this.email)) {
      this.correoInvalid = true;
      this.toast.error("Validación", "Correo inválido");
      valido = false;
    }




    // Validación contraseña
    if (!this.password) {
      this.adminPasswordInvalid = true;
      this.toast.error("Validación", "La contraseña del administrador es requerida");
      valido = false;
    } else if (this.password.length < 6) {
      this.adminPasswordInvalid = true;
      this.toast.error("Validación", "La contraseña debe tener al menos 6 caracteres");
      valido = false;
    }
    if (!this.password_repit) {
      this.adminPasswordConfirmInvalid = true;
      this.toast.error("Validación", "La confirmación de la contraseña es requerida");
      valido = false;
    } else if (this.password !== this.password_repit) {
      this.adminPasswordInvalid = true;
      this.adminPasswordConfirmInvalid = true;
      this.toast.error("Validación", "Las contraseñas no coinciden");
      valido = false;
    }



    if (!this.role_id) {
        this.rolInvalid = true;
        this.toast.error("Validación", "Debe seleccionar un tipo Rol");
        valido = false;
      }

    if(!this.role_id){
      this.toast.error("Validación","El rol es requerido");
      return false;
    }

    if (!this.id_empresa) {
      this.toast.error("Validación", "No se encontró el ID de la empresa del usuario logeado");
      return false;
    }


    // Validación opcional: Si quieres que sea obligatorio asignar una sección
   /* if (!proyectoFinalId) {
      this.toast.error("Validación", "Debe seleccionar al menos una Sección para el usuario");
      return;
  }*/

    if (!valido) return;

    let formData = new FormData();
    const permisosDocumentales = this.buildPermisosDocumentales();

    formData.append(
      'permisos_documentales',
      JSON.stringify(permisosDocumentales)
    );
    formData.append("name",this.name);
    formData.append("surname",this.surname);
    formData.append("email",this.email);
    // Normalizar para no enviar nunca la cadena 'NULL'
    formData.append("phone", this.phone && this.phone.toUpperCase() !== 'NULL' ? this.phone : '');
    formData.append("role_id",this.role_id);
    formData.append("gender",this.gender);
    formData.append("type_document",this.type_document);
    formData.append("n_document",this.n_document);
    if(this.address){
      formData.append("address",this.address);
    }
    // Nuevos campos: sigla y titulo profesional
    if (this.sigla) {
      formData.append('sigla', this.sigla.trim());
    }
    if (this.titulo) {
      formData.append('titulo', this.titulo.trim());
    }
    formData.append("sucursale_id",this.sucursale_id);
   // formData.append("id_area", this.area_id);
    formData.append("id_proyecto", proyectoFinalId);
    // Marcar director/subdirector según el nivel seleccionado en los selects
    // - Sección seleccionada    -> director = 1
    // - Subsección seleccionada -> subdirector = 1
    formData.append('director', this.id_proyecto_seleccionado ? '1' : '0');
    formData.append('subdirector', this.id_subseccion_seleccionada ? '1' : '0');
    formData.append("password",this.password);
    // Enviar avatar con la clave esperada por el backend. Sólo si se eligió
    // un archivo: sin esta condición viajaba la cadena "undefined".
    if (this.file_name) {
      formData.append("avatar", this.file_name);
    }
    formData.append("id_empresa", this.id_empresa.toString());

    // ===============================
    // 🔐 DATOS DE FIRMA ELECTRÓNICA
    // ===============================
    if (this.firmaFile) {
      formData.append('archivo_firma', this.firmaFile);

      if (this.contrasena_firma) {
        formData.append('password_firma', this.contrasena_firma);
      }

      if (this.fecha_expiracion_firma) {
        formData.append(
          'fecha_expiracion_firma',
          this.fecha_expiracion_firma
        );
      }
    }
    
    // Agregar toggles de usuario recepcionista y despacho
    formData.append(
      'usuario_recepcionista',
      this.usuario_recepcionista ? '1' : '0'
    );

    formData.append(
      'usuario_despacho',
      this.usuario_despacho ? '1' : '0'
    );
    
    // Adjunta los permisos seleccionados al FormData
    this.permisions.forEach(p => formData.append('permissions[]', p));

     Swal.fire({
        title: 'Espere',
        text: 'Se está creando el usuario...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
    
    this.usersService.registerUser(formData).subscribe({
      next: (resp: any) => {

        Swal.fire({
          title: '¡Éxito!',
          html: `
            El usuario <b>${resp.user.full_name}</b> se registró correctamente.<br>
            Se ha enviado un correo con sus credenciales de acceso.
          `,
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#28a745', // O el color que prefieras (verde success)
        }).then(() => {
          // ✅ cerrar modal y refrescar lista inmediatamente al dar click en Aceptar
          this.UserC.emit(resp.user);
          this.modal.close();
        });
      },

      error: (err) => {

        // 👇 VALIDACIONES LARAVEL (422)
        if (err.status === 422) {

          if (err.error?.errors?.email) {
            this.correoInvalid = true;
            this.toast.error('Validación', err.error.errors.email[0]);
            return;
          }

          if (err.error?.errors?.name) {
            this.toast.error('Validación', err.error.errors.name[0]);
            return;
          }

          this.toast.error('Validación', 'Datos inválidos');
        }

        // 👇 ERRORES 403
        else if (err.status === 403) {
          this.toast.error('Validación', err.error.message_text);
        }

        // 👇 ERROR GENERAL
        else {
          this.toast.error('Error', 'Ocurrió un error inesperado');
        }
      }
    });


  }

  // ========== VALIDACIÓN TOGGLES ==========
  // Solo permite un toggle seleccionado a la vez
  onUsuarioRecepcionistaChange() {
    if (this.usuario_recepcionista && this.usuario_despacho) {
      this.usuario_despacho = false;
    }
  }

  onUsuarioDespachoChange() {
    if (this.usuario_despacho && this.usuario_recepcionista) {
      this.usuario_recepcionista = false;
    }
  }

}
