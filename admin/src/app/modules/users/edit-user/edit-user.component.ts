import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { UsersService } from '../service/users.service';
import { SIDEBAR } from 'src/app/config/config';
import { AreaRegistrarComponent } from '../area-registrar/area-registrar.component';
import { AuthService } from '../../auth';
import Swal from 'sweetalert2';



interface PermisoItem {
  permiso: string;
  name: string;
}

interface GrupoPermisos {
  name: string;
  permisos: PermisoItem[];
}



export interface Proyecto {
  id_proyecto: number;
  nombre: string;
  subsecciones?: Proyecto[];
  series?: Serie[];
  expanded?: boolean; // 👈 controla visualización
  subsubsecciones?: Proyecto[]; 
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
  selector: 'app-edit-user',
  templateUrl: './edit-user.component.html',
  styleUrls: ['./edit-user.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditUserComponent {

  @Output() UserE: EventEmitter<any> = new EventEmitter();
  @Input() roles:any = [];
  @Input() USER_SELECTED:any;
  @Input() sucursales:any = [];
  @Input() areas: any = [];
@Input() secciones: any[] = [];


 availablePermissions: GrupoPermisos[] = [];
  @Input() permissions: string[] = [];
  public selectedPermissions: string[] = [];
  // Grupos de módulos para selección masiva (Trámites)
  groupRecepAdminMods: string[] = ['Tipo Documento','Tipo Tramite','Cliente','Recepcion Trámite'];
  groupUsuarioInternoMods: string[] = ['Asignar Tramites','Historial Tramite','Buzon Tramite'];
  groupClienteExternoMods: string[] = ['Tramite','Seguimiento'];
  


permisions: string[] = [];

// Mantener como number para que coincida con los id de roles y el [ngValue]
role_id: number | null = null;
rolSeleccionadoNombre = '';

  isLoading:any;
  
  name:string = '';
  surname:string = '';
  email:string = '';
  phone:string = '';
  sigla:string = '';
  titulo:string = '';
  //role_id:string = '';
  gender:string = '';
  type_document:string = 'DNI';
  n_document:string = '';
  address:string = '';
  area_id: any = '';

  file_name:any;
  imagen_previzualiza:any;

  password:string = '';
  password_repit:string = '';
  sucursale_id:string = '';

  public PERMISSION: any[] = [];
  SIDEBAR: any = SIDEBAR; 

  public mostrarPermisos: boolean = false;
  loggedUser: any;
  id_empresa: any;

mostrarPermisosDocumentales: boolean = false;

 estado: number = 1;
 cambio_pass: number = 0; // 0 = no resetear, 1 = resetear contraseña

roleName: string = '';

enablePermisosDocumentales: boolean = false;
showPermisosDocumentales: boolean = false;


  isSuperAdmin: boolean = false;
  isAdmin: boolean = false;
  selectedUserIsAdmin: boolean = false;
  permisosBloqueados: boolean = false;


isRoleDisabled: boolean = true;

    // ===== FIRMA DIGITAL =====
  firmaFile: File | null = null;
  contrasena_firma: string = '';
  fecha_expiracion_firma: string = '';

  permisos_documentales: any[] = [];

    emailExiste: boolean = false;
  emailChecking: boolean = false;

  private emailTimer: any;

  cedulaValida: boolean | null = null; 
  rucValido: boolean | null = null;
  tiposDocumento: { value: string, label: string }[] = [
    { value: 'CEDULA IDENTIDAD', label: 'Cédula' },
    { value: 'RUC', label: 'RUC' },
    { value: 'PASAPORTE', label: 'Pasaporte' }
  ];

  public titulosAmigables: { [key: string]: string } = {
    'Tramite': 'Crear Trámite',
    'Asignar Tramites': 'Asignación de Trámites',
    'Sección Docuemntal': 'Sección Documental', // Aquí corregimos la ortografía
    'Recepcion Trámite': 'Recepción de trámites',
    'Despacho Trámite': 'Despacho de trámites',
    'Busqueda de documentos': 'Buscador de Archivos',
    'Historial Tramite': 'Historial de Trámites',
    'Seguimiento': 'Seguimiento trámite',
  };



  showPermisosDocumentalesSection = false; // aparece o no
  


  subsecciones: Proyecto[] = [];
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
  
  
  permisosMap: {
    [key: string]: Permisos;
  } = {};
  
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




//subsecciones: any[] = [];  // Nivel 2
seccion: any[] = [];      // Nivel 1
subsubsecciones: any[] = []; // Nivel 3

// Variables para los ngModel
id_proyecto_seleccionado: any = '';
id_subseccion_seleccionada: any = '';
id_subsubseccion_seleccionada: any = '';


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



usuario_recepcionista: boolean = false;
usuario_despacho: boolean = false;
usuario_recepcionista_anterior: boolean = false;
usuario_despacho_anterior: boolean = false;

  constructor(
    public modal: NgbActiveModal,
    public usersService: UsersService,
    public toast: ToastrService,
    public modalService: NgbModal,
    private cdr: ChangeDetectorRef,
    public authService: AuthService,
  ) {}

    ngOnChanges(): void {
    if (this.permissions) {
      this.selectedPermissions = [...this.permissions];
    }

    // Actualizar roleName cuando cambien inputs (USER_SELECTED o roles)
    // y normalizar role_id si viene como string
    const incomingRoleId: any = this.USER_SELECTED?.role_id;
    this.role_id = incomingRoleId !== undefined && incomingRoleId !== null && incomingRoleId !== ''
      ? Number(incomingRoleId)
      : null;

    // Normalizar ids de roles (algunos entornos dev/productivo pueden enviarlos como string)
    if (Array.isArray(this.roles)) {
      this.roles = this.roles.map((r: any) => ({
        ...r,
        id: r?.id !== undefined && r?.id !== null && r?.id !== '' ? Number(r.id) : r?.id
      }));
    }

    // Preferir el nombre que viene embebido en USER_SELECTED.role; si no, buscarlo por id en roles
    this.roleName = this.USER_SELECTED?.role?.name
      || (Array.isArray(this.roles) ? (this.roles.find((r: any) => Number(r?.id) === this.role_id)?.name || '') : '');
  }


  ngOnInit(): void {



     const user = JSON.parse(localStorage.getItem('user') || '{}');

     if (user && user.id_empresa) {
        this.id_empresa = user.id_empresa;
        // Llama a la función pasando el ID obtenido
     //   this.listarRoles(this.id_empresa); 
        //this.listarSucursales(this.id_empresa); 
        this.listarSecciones(this.id_empresa); 
      } else {
        console.error('Usuario sin empresa:', user);
      }
    // 🔥 ESTO ES LO QUE NECESITAMOS VER
  console.log("Datos recibidos en EditUser (Secciones):", this.secciones);
  
  // Opcional: ver el tamaño de la estructura (aproximado)
  console.log("Cantidad de secciones raíz:", this.secciones?.length);
  
  // Puedes verificar si tiene demasiada profundidad así:
  if (this.secciones && this.secciones.length > 0) {
     console.log("Primera sección de ejemplo:", this.secciones[0]);
  }

    // 1️⃣ Inicializar permisos documentales desde DB
    this.initPermisosDesdeDB();
  
    // 2️⃣ Normalizar permisos del usuario (UNA SOLA VEZ)
    this.selectedPermissions = Array.isArray(this.USER_SELECTED?.permissions)
      ? this.USER_SELECTED.permissions.map((p: any) =>
          typeof p === 'string' ? p : p.permiso
        )
      : [];
  
    // 3️⃣ Datos de empresa
    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    this.id_empresa = loggedUser.id_empresa;
  
    // 4️⃣ Obtener permisos disponibles
    this.usersService.getPermissionsByEmpresa(this.id_empresa)
      .subscribe((permisos: any) => {
  
        // permisos del sistema (sidebar)
        this.availablePermissions = this.mapPermissionsToSidebar(
          permisos[0].permisos.map((p: any) => p.permiso)
        );
  
        // sincronizar sección documental
        this.updatePermisosDocumentales();
  
        this.enablePermisosDocumentales = this.selectedPermissions.length > 0;
        this.showPermisosDocumentales = this.hasDocumentalPermissionsSelected();
  
        this.cdr.detectChanges();
      });
  
    // 5️⃣ Datos del usuario
    this.roleName = this.USER_SELECTED?.role?.name || '';
    this.name = this.USER_SELECTED.name;
    this.surname = this.USER_SELECTED.surname;
    this.email = this.USER_SELECTED.email;
    const normUserPhone = (v: any) => (v && String(v).toUpperCase() !== 'NULL') ? String(v) : '';
    this.phone = normUserPhone(this.USER_SELECTED.phone);
    // Normalizamos role_id a number para que haga match con [ngValue]
    const initRoleId: any = this.USER_SELECTED.role_id;
    this.role_id = initRoleId !== undefined && initRoleId !== null && initRoleId !== ''
      ? Number(initRoleId)
      : null;

    // Si no vino USER_SELECTED.role, intentar resolverlo desde la lista de roles (puede llegar después)
    if (!this.roleName && Array.isArray(this.roles) && this.role_id != null) {
      const found = this.roles.find((r: any) => Number(r?.id) === this.role_id);
      this.roleName = found?.name || '';
    }
    this.gender = this.USER_SELECTED.gender;
    this.type_document = this.USER_SELECTED.type_document;
    this.n_document = this.USER_SELECTED.n_document;
    this.address = this.USER_SELECTED.address;
    // Sigla y título profesional: si no se cargan aquí, el input sale vacío
    // y al guardar se termina borrando el valor que ya tenía el usuario.
    this.sigla = this.USER_SELECTED.sigla || '';
    this.titulo = this.USER_SELECTED.titulo || '';
    // El backend manda un avatar por defecto (una URL de flaticon) cuando el
    // usuario no tiene foto. Se ignora para que se vea el recuadro con las
    // dimensiones recomendadas, igual que al crear.
    const avatar = this.USER_SELECTED.avatar;
    this.imagen_previzualiza = (avatar && !String(avatar).includes('cdn-icons-png.flaticon.com'))
      ? avatar
      : null;
    this.sucursale_id = this.USER_SELECTED.sucursale_id;
    this.area_id = this.USER_SELECTED.id_area;
     this.contrasena_firma = this.USER_SELECTED.password_firma || '';
      this.fecha_expiracion_firma = this.USER_SELECTED.fecha_expiracion_firma || '';
     this.cambio_pass = this.USER_SELECTED.cambio_pass ? 1 : 0;
    // 🔥 AQUÍ
   this.usuario_recepcionista = !!this.USER_SELECTED.usuario_recepcionista;
  this.usuario_despacho = !!this.USER_SELECTED.usuario_despacho;
  // Guardar valores anteriores para detectar cambios
  this.usuario_recepcionista_anterior = this.usuario_recepcionista;
  this.usuario_despacho_anterior = this.usuario_despacho;

     this.cargarSeccion();

    // Después de asignar this.roleName
console.log('ROL DEL USUARIO:', this.roleName);
console.log('ID DEL ROL:', this.role_id);
  }
  

// Retorna true si hay permisos documentales seleccionados
hasDocumentalPermissionsSelected(): boolean {
  const documentalKeys = this.getDocumentalPermissionKeys();
  return this.selectedPermissions.some(p => documentalKeys.includes(p));
}


listarSecciones(id_empresa: any) {
  this.usersService.ListarSecciones(id_empresa).subscribe((resp: any) => {
    console.log("Respuesta completa del servidor Listar Secciones DESDE edit:", resp);
    
    this.secciones = resp.secciones;
    
    // 🔥 IMPORTANTE: Notificar a Angular que los datos llegaron
    this.cdr.detectChanges(); 

    console.log("Lista de Secciones recibida:", this.roles);
  });
}


// Llamar después de cargar el usuario y sus permisos_documentales
initPermisosDesdeDB() {
  if (!this.USER_SELECTED?.permisos_documentales) return;

  this.USER_SELECTED.permisos_documentales.forEach((p: any) => {
    // Detectar tipo y crear la key
    let key = '';
    if (p.id_seccion) key = 'seccion_' + p.id_seccion;
    else if (p.id_subseccion) key = 'sub_' + p.id_subseccion;
    else if (p.id_subsubseccion) key = 'subsub_' + p.id_subsubseccion;
    else if (p.id_serie) key = 'serie_' + p.id_serie;
    else if (p.id_subserie) key = 'subserie_' + p.id_subserie;

    if (!key) return;

    // Guardar los permisos en el mapa
    this.permisosMap[key] = {
      ver: p.ver,
      crear: p.crear,
      editar: p.editar,
      eliminar: p.eliminar,
      buscar: p.buscar,
      subir_documentos: p.subir_documentos,
      ver_documento: p.ver_documento,
      registrar_datos: p.registrar_datos,
      indexar: p.indexar,
      indexar_masivo: p.indexar_masivo,
      eliminar_documento: p.eliminar_documento,
      firmar_documento: p.firmar_documento,
      limpiar_documento: p.limpiar_documento,
    };
  });

  console.log('✅ permisosMap inicializado desde DB:', this.permisosMap);
}




  onTypeDocumentChange() {
    // 1. Borra el número escrito en el input
    this.n_document = ''; 
    
    // 2. Resetea el estado de validación (quita los bordes rojo/verde)
    this.cedulaValida = null; 
    
    // Opcional: si usas la variable rucValido por separado, límpiala también
    this.rucValido = null; 
  }

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


  private updatePermisosDocumentales(): void {
    const permisosDocumentales = this.getDocumentalPermissionKeys();

    // En edición usamos selectedPermissions (no 'permisions')
    const tienePermisoDocumental =
      permisosDocumentales.some(p => this.selectedPermissions.includes(p));

    this.enablePermisosDocumentales = tienePermisoDocumental;
    this.showPermisosDocumentales = tienePermisoDocumental;
  }





  mapPermissionsToSidebar(receivedPermissions: string[]): GrupoPermisos[] {
  console.log("1. Permisos que vienen de la DB:", receivedPermissions);
  console.log("2. Estructura de SIDEBAR actual:", SIDEBAR);

  return SIDEBAR.map((group: GrupoPermisos) => {
    const permisosFiltrados: PermisoItem[] = group.permisos.filter((p: PermisoItem) => {
      const existe = receivedPermissions.includes(p.permiso);
      if (p.permiso === 'buzon_tramite') {
        console.log("-> ¿Se encontró 'buzon_tramite' en los permisos de la DB?:", existe);
      }
      return existe;
    });

    return {
      name: group.name,
      permisos: permisosFiltrados
    };
  }).filter((group: GrupoPermisos) => {
    const tienePermisos = group.permisos.length > 0;
    if (group.name === 'Buzon Tramite') {
      console.log("3. Grupo 'Buzon Tramite' - ¿Tiene permisos tras filtrar?:", tienePermisos);
    }
    return tienePermisos;
  });
}



  onlyNumbers(event: any) {
    let value = event.target.value;
    value = value.replace(/[^0-9]/g, '');
    this.phone = value.substring(0, 10);
  }



  addPermission(permiso: string, event: any): void {

    if (event.target.checked) {
      if (!this.selectedPermissions.includes(permiso)) {
        this.selectedPermissions.push(permiso);
      }
    } else {
      this.selectedPermissions = this.selectedPermissions.filter(p => p !== permiso);
    }
  
    // 🔥 recalcular SIEMPRE
    this.updatePermisosDocumentales();
  
    console.log('Permisos seleccionados:', this.selectedPermissions);
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
    const set = new Set(this.selectedPermissions);
    return keys.every(k => set.has(k));
  }

  toggleGroupPermissions(modNames: string[], event: any): void {
    const checked = !!event?.target?.checked;
    const keys = this.getPermissionKeysForModules(modNames);
    if (checked) {
      const set = new Set([...(this.selectedPermissions || []), ...keys]);
      this.selectedPermissions = Array.from(set);
    } else {
      const rm = new Set(keys);
      this.selectedPermissions = (this.selectedPermissions || []).filter((p: string) => !rm.has(p));
    }
    // Sincronizar bloque documental
    this.updatePermisosDocumentales();
  }

  // Devuelve todos los permisos visibles actualmente en la UI, aplanados
  private getAllVisiblePermissions(): string[] {
    return (this.availablePermissions || []).flatMap(g => g.permisos?.map(p => p.permiso) || []);
  }

  // ¿Todos los permisos visibles están seleccionados?
  isAllSelected(): boolean {
    const visibles = this.getAllVisiblePermissions();
    if (visibles.length === 0) return false;
    const sel = new Set(this.selectedPermissions);
    return visibles.every(v => sel.has(v));
  }

  // Seleccionar/deseleccionar todos los permisos visibles
  toggleAllPermissions(event: any): void {
    const isChecked = event?.target?.checked === true;
    const visibles = this.getAllVisiblePermissions();
    if (isChecked) {
      const set = new Set([...(this.selectedPermissions || []), ...visibles]);
      this.selectedPermissions = Array.from(set);
    } else {
      const remove = new Set(visibles);
      this.selectedPermissions = (this.selectedPermissions || []).filter(p => !remove.has(p));
    }

    // Sincronizar bloque documental
    this.updatePermisosDocumentales();
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

  togglePermisos() {
    this.mostrarPermisos = !this.mostrarPermisos;
  }



  processFile($event:any){
    if($event.target.files[0].type.indexOf("image") < 0){
      this.toast.warning("WARN","El archivo no es una imagen");
      return;
    }
    this.file_name = $event.target.files[0];
    let reader = new FileReader();
    reader.readAsDataURL(this.file_name);

    reader.onloadend = () => {
      this.imagen_previzualiza = reader.result;
      // El componente es OnPush: sin esto la vista previa no se redibuja
      this.cdr.detectChanges();
    };
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







  onFirmaSelected(event: Event): void {
      const input = event.target as HTMLInputElement;

      if (input.files && input.files.length > 0) {
        this.firmaFile = input.files[0];

        console.log('📄 Archivo de firma seleccionado:', {
          nombre: this.firmaFile.name,
          tipo: this.firmaFile.type,
          tamaño: this.firmaFile.size
        });
      } else {
        this.firmaFile = null;
      }
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

    // Marca/desmarca todos los permisos de una serie y sus subseries
    private marcarSerieYSubseries(serie: any, isChecked: boolean) {
      const sKey = 'serie_' + (serie.id_serie || serie.id_proyecto);
      this.initPermisos(sKey);
      this.marcarObjeto(this.permisosMap[sKey], isChecked);

      if (serie.hijos_recursivos?.length) {
        this.subSeriesMap[serie.id_serie] = [...serie.hijos_recursivos];
        serie.hijos_recursivos.forEach((subS: any) => {
          const subSKey = 'subserie_' + subS.id_serie;
          this.initPermisos(subSKey);
          this.marcarObjeto(this.permisosMap[subSKey], isChecked);
        });
      }
    }

    marcarTodoSerie(serie: any, event: any) {
      const isChecked = event.target.checked;
      this.marcarSerieYSubseries(serie, isChecked);
      if (!isChecked) {
        delete this.subSeriesMap[serie.id_serie];
      } else if (serie.hijos_recursivos?.length) {
        this.subSeriesMap[serie.id_serie] = [...serie.hijos_recursivos];
      }
    }

    private marcarObjeto(obj: any, value: boolean) {
      if (obj) {
        Object.keys(obj).forEach(k => (obj[k] = value));
      }
    }

    isAllPermsTrue(key: string): boolean {
      const obj = this.permisosMap[key];
      if (!obj) return false;
      return Object.values(obj).every(Boolean);
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
    
    
abrirNodosSegunPermisos() {
  console.log('🔥 Abriendo nodos según permisos...');

  // Abrir secciones
  this.secciones.forEach(seccion => {
    const keySeccion = 'seccion_' + seccion.id_proyecto;
    const permisoSeccion = this.permisosMap[keySeccion];

    if (permisoSeccion?.ver) {
      console.log('[SECCION] Abriendo:', seccion.nombre);

      this.subseccionesMap[seccion.id_proyecto] =
        seccion.subsecciones ? [...seccion.subsecciones] : [];

      seccion.subsecciones?.forEach((sub: Proyecto) =>
        this.abrirSubSeccion(sub)
      );
    }
  });

  // Abrir series raíz
  this.series.forEach(serie => {
    const keySerie = 'serie_' + serie.id_serie;
    const permisoSerie = this.permisosMap[keySerie];

    if (permisoSerie?.ver) {
      console.log('[SERIE] Abriendo:', serie.nombre);
      this.subSeriesMap[serie.id_serie] =
        serie.hijos_recursivos ? [...serie.hijos_recursivos] : [];
    }
  });
}


abrirSubSeccion(sub: Proyecto) {
  const keySub = 'sub_' + sub.id_proyecto;
  const permisoSub = this.permisosMap[keySub];

  if (permisoSub?.ver) {
    console.log('[SUBSECCION] Abriendo:', sub.nombre);

    if (sub.subsubsecciones?.length) {
      this.subSubSeccionesMap[sub.id_proyecto] = [...sub.subsubsecciones];
    }

    if (sub.series?.length) {
      this.seriesMap[sub.id_proyecto] = [...sub.series];
    }

    sub.subsubsecciones?.forEach((ss: Proyecto) =>
      this.abrirSubSub(ss)
    );
  }
}


abrirSubSub(ss: Proyecto) {
  const keySubSub = 'subsub_' + ss.id_proyecto;
  const permisoSubSub = this.permisosMap[keySubSub];

  if (permisoSubSub?.ver) {
    console.log('[SUB-SUB] Abriendo:', ss.nombre);

    if (ss.series?.length) {
      this.seriesMap[ss.id_proyecto] = [...ss.series];
    }
  }
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

              // Preseleccionar usando id_proyecto; si no existe, usar id_area como respaldo
              if (this.USER_SELECTED) {
                const targetId = this.USER_SELECTED.id_proyecto || this.USER_SELECTED.id_area;
                if (targetId) {
                  this.preseleccionarJerarquia(targetId);
                }
              }
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
onSeccionChange1(id: any, manual: boolean = false) {
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
  if (manual) { // Solo borra si el usuario cambió el select con el mouse
    this.id_subseccion_seleccionada = '';
    this.id_subsubseccion_seleccionada = '';
    this.subsubsecciones = [];
  }
  // Forzamos a Angular a reconocer el cambio de inmediato
  this.cdr.detectChanges();
}

// Nivel 2 -> Nivel 3
onSubseccionChange1(id: any, manual: boolean = false) {
  if (!id) {
    this.subsubsecciones = [];
    return;
  }

  const subEncontrada = this.subsecciones.find(s => s.id_proyecto == id);

  this.subsubsecciones = subEncontrada?.subsecciones || [];
  if (manual) {
    this.id_subsubseccion_seleccionada = '';
  } // Reset valor seleccionado

  this.cdr.detectChanges();
}
    



preseleccionarJerarquia(idTarget: any) {
  if (!idTarget || !this.seccion) return;

  // Recorremos Nivel 1
  for (let s of this.seccion) {
    if (s.id_proyecto == idTarget) {
      this.id_proyecto_seleccionado = s.id_proyecto;
      this.onSeccionChange1(s.id_proyecto);
      return;
    }

    // Recorremos Nivel 2
    if (s.subsecciones) {
      for (let sub of s.subsecciones) {
        if (sub.id_proyecto == idTarget) {
          this.id_proyecto_seleccionado = s.id_proyecto;
          this.onSeccionChange1(s.id_proyecto); // Carga subsecciones
          this.id_subseccion_seleccionada = sub.id_proyecto;
          this.onSubseccionChange1(sub.id_proyecto); // Carga subsubsecciones
          return;
        }

        // Recorremos Nivel 3
        if (sub.subsecciones) {
          for (let subsub of sub.subsecciones) {
            if (subsub.id_proyecto == idTarget) {
              this.id_proyecto_seleccionado = s.id_proyecto;
              this.onSeccionChange1(s.id_proyecto);
              
              this.id_subseccion_seleccionada = sub.id_proyecto;
              this.onSubseccionChange1(sub.id_proyecto);
              
              this.id_subsubseccion_seleccionada = subsub.id_proyecto;
              return;
            }
          }
        }
      }
    }
  }
}




























 ActualizarUsuario() {
    console.log("🔹 store() llamado");

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

    // Validaciones
    if (!this.name) {
        this.nombreInvalid = true;
        this.toast.error("Validación", "El nombre es requerido");
        valido = false;
    }

    if (!this.surname) {
        this.apellidoInvalid = true;
        this.toast.error("Validación", "El apellido es requerido");
        valido = false;
    }

    if (!this.type_document) {
        this.selecttipodocumentoInvalid = true;
        this.toast.error("Validación", "Debe seleccionar un tipo de documento");
        valido = false;
    }

    if (!this.n_document) {
        this.numerodocuemntoInvalid = true;
        this.toast.error("Validación", "Debe ingresar el número de documento");
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

    if (!this.role_id) {
        this.rolInvalid = true;
        this.toast.error("Validación", "Debe seleccionar un tipo Rol");
        valido = false;
      }

    if(!this.role_id){
      this.toast.error("Validación","El rol es requerido");
      return false;
    }

    // Validación de contraseña
     // ===== VALIDACIÓN CONTRASEÑA (NO OBLIGATORIA) =====
    if (this.password || this.password_repit) {

      // mínimo 6 caracteres
      if (!this.password || this.password.length < 6) {
        this.adminPasswordInvalid = true;
        valido = false;
      }

      // confirmar contraseña
      if (!this.password_repit || this.password !== this.password_repit) {
        this.adminPasswordConfirmInvalid = true;
        valido = false;
      }
    }



    // 1️⃣ LÓGICA PARA DETERMINAR EL PROYECTO/SECCIÓN FINAL
    // Buscamos el ID más profundo seleccionado
    let idProyectoFinal = '';
    if (this.id_subsubseccion_seleccionada) {
        idProyectoFinal = this.id_subsubseccion_seleccionada;
    } else if (this.id_subseccion_seleccionada) {
        idProyectoFinal = this.id_subseccion_seleccionada;
    } else if (this.id_proyecto_seleccionado) {
        idProyectoFinal = this.id_proyecto_seleccionado;
    }

    if (!valido) return;

    // Construir FormData
    let formData = new FormData();

    const permisosDocumentales = this.buildPermisosDocumentales();

    formData.append(
      'permisos_documentales',
      JSON.stringify(permisosDocumentales)
    );
    formData.append("name", this.name);
    formData.append("surname", this.surname);
    formData.append("email", this.email);
    formData.append("phone", this.phone || '');
    formData.append("role_id", this.role_id != null ? String(this.role_id) : ''); // normalizar a string
    formData.append("gender", this.gender);
    formData.append("type_document", this.type_document);
    formData.append("n_document", this.n_document);
    formData.append("id_area", this.area_id);
    formData.append("estado", String(this.estado));
    if (this.address) formData.append("address", this.address);
    // Nuevos campos: sigla y titulo profesional.
    // Se envían siempre (aunque estén vacíos) para que el backend guarde
    // exactamente lo que el usuario ve en el formulario.
    formData.append('sigla', (this.sigla || '').trim());
    formData.append('titulo', (this.titulo || '').trim());
    if (this.password) formData.append("password", this.password);
    // Enviar avatar con la clave esperada por el backend
    if (this.file_name) formData.append("avatar", this.file_name);
    formData.append("sucursale_id", this.sucursale_id);
    formData.append("cambio_pass", String(this.cambio_pass ? 1 : 0));

     if (this.firmaFile instanceof File) {
      formData.append('archivo_firma', this.firmaFile);
     }

    if (this.contrasena_firma && this.contrasena_firma.trim() !== '') {
      formData.append('password_firma', this.contrasena_firma);
    }

    if (this.fecha_expiracion_firma && this.fecha_expiracion_firma !== '') {
      formData.append('fecha_expiracion_firma', this.fecha_expiracion_firma);
    }
 

    // Permisos
    this.selectedPermissions.forEach(p => {
      formData.append('permissions[]', p);
    });

    formData.append(
      'usuario_recepcionista',
      this.usuario_recepcionista ? '1' : '0'
    );

    formData.append(
      'usuario_despacho',
      this.usuario_despacho ? '1' : '0'
    );
    
   // Enviamos el ID final al campo 'id_proyecto' que agregamos al modelo User
   if (idProyectoFinal) {
    formData.append("id_proyecto", idProyectoFinal);
  }

  // Marcar director/subdirector según el nivel seleccionado en los selects
  // - Si hay una SECCIÓN seleccionada  -> director = 1
  // - Si hay una SUBSECCIÓN seleccionada -> subdirector = 1
  formData.append('director', this.id_proyecto_seleccionado ? '1' : '0');
  formData.append('subdirector', this.id_subseccion_seleccionada ? '1' : '0');

    // Llamada al servicio
    this.usersService.updateUser(this.USER_SELECTED.id, formData).subscribe(
        (resp: any) => {
            console.log("RESPUESTA:", resp);

            if (resp.message == 403) {
                this.toast.error("Validación", resp.message_text);
            } else {
                this.toast.success("Éxito", "El usuario se ha editado correctamente");
                this.UserE.emit(resp.user);
                this.modal.close();
            }
        },
        (error) => {
            console.error("ERROR:", error);
            this.toast.error("Error", "Ocurrió un error al editar el usuario");
        }
    );
}

// ========== VALIDACIÓN TOGGLES CON CONFIRMACIÓN ==========
onUsuarioRecepcionistaChange() {
  // Si está intentando activar recepcionista cuando despacho está activo
  if (this.usuario_recepcionista && this.usuario_despacho) {
    this.usuario_despacho = false;
  }
  
  // Si está cambiando de despacho a recepcionista, pedir confirmación
  if (this.usuario_recepcionista && this.usuario_despacho_anterior && !this.usuario_recepcionista_anterior) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Vas a cambiar el tipo de usuario de DESPACHO a RECEPCIONISTA',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (!result.isConfirmed) {
        // Revertir el cambio
        this.usuario_recepcionista = false;
        this.cdr.detectChanges();
      }
    });
  }
}

onUsuarioDespachoChange() {
  // Si está intentando activar despacho cuando recepcionista está activo
  if (this.usuario_despacho && this.usuario_recepcionista) {
    this.usuario_recepcionista = false;
  }
  
  // Si está cambiando de recepcionista a despacho, pedir confirmación
  if (this.usuario_despacho && this.usuario_recepcionista_anterior && !this.usuario_despacho_anterior) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Vas a cambiar el tipo de usuario de RECEPCIONISTA a DESPACHO',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    }).then((result) => {
      if (!result.isConfirmed) {
        // Revertir el cambio
        this.usuario_despacho = false;
        this.cdr.detectChanges();
      }
    });
  }
}

  
}
