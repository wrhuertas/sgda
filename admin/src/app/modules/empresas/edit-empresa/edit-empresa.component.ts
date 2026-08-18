import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { EmpresaService } from '../service/empresa.service';
import { SIDEBAR } from 'src/app/config/config';

@Component({
  selector: 'app-edit-empresa',
  templateUrl: './edit-empresa.component.html',
  styleUrls: ['./edit-empresa.component.scss']
})
export class EditEmpresaComponent {

  @Output() EmpresaE: EventEmitter<any> = new EventEmitter();
  @Input() EMPRESA_SELECTED: any;

  nombre: string = '';
  ruc: string = '';
  telefono: string = '';
  correo: string = '';
  direccion: string = '';
  estado: number = 1;

  firmaFile: File | null = null;
  contrasena_firma = '';
  fecha_expiracion_firma = '';

  // Imagen
  IMAGEN_EMPRESA: any;
  IMAGEN_PREVISUALIZA: any;

  // Datos del administrador
  admin_nombre: string = '';
  admin_apellido: string = '';
  admin_correo: string = '';
  admin_password: string = '';
  admin_password_confirm: string = '';

  isLoading: any;

  firma_file: File | null = null;
  nombre_firma = '';

   permisions: any = [];
     SIDEBAR: any = SIDEBAR; // <-- Aquí lo expones al template

  mostrarPermisos: boolean = false;

  // ---------- Autenticación externa (opcional) ----------
  mostrarDirectorio: boolean = false;

  utiliza_ldap: boolean = false;
  ldap_host: string = '';
  ldap_port: any = '';
  ldap_base_dn: string = '';
  ldap_username: string = '';
  ldap_password: string = '';

  utiliza_api_auth: boolean = false;
  api_auth_url: string = '';
  api_auth_token: string = '';

  toggleDirectorio() {
    this.mostrarDirectorio = !this.mostrarDirectorio;
  }

  // Agrupación de permisos (igual que crear empresa)
  private gruposConfig: { [key: string]: string[] } = {
    'Administración': [
      'Dashboard', 'Empresa', 'Usuarios', 'Auditoria', 'Respaldo Archivo_&_BD'
    ],
    'Gestión Documental': [
      'Sección Docuemntal',
      'Prestamos',
      'Certificado',
      'Prestamo Expediente',
      'Certifiados Expediente',
      'Scan',
      'Etiquetas',
      'Busqueda de documentos',
      'Reporte'
    ],
    'Trámites': [
      'Cliente', 'Clientes', 'Tramite', 'Tipo Documento', 'Tipo Tramite', 'Seguimiento', 'Recepcion Trámite','Despacho Trámite', 'Buzon Tramite', 'Historial Tramite'
    ]
  };

  groupedSidebar: Array<{ title: string; items: any[] }> = [];


  constructor(
    public modal: NgbActiveModal,
    public empresaService: EmpresaService,
    public toast: ToastrService,
  ) {}

  ngOnInit(): void {
  console.log('Datos recibidos para editar 2:', this.EMPRESA_SELECTED);

  this.nombre = this.EMPRESA_SELECTED.nombre_empresa;
  this.ruc = this.EMPRESA_SELECTED.ruc_empresa;
  const norm = (v: any) => (v && String(v).toUpperCase() !== 'NULL') ? String(v) : '';
  this.telefono = norm(this.EMPRESA_SELECTED.telefono);
  this.correo = norm(this.EMPRESA_SELECTED.correo);
  this.direccion = norm(this.EMPRESA_SELECTED.direccion);
  this.estado = this.EMPRESA_SELECTED.estado;
  this.IMAGEN_PREVISUALIZA = this.EMPRESA_SELECTED.imagen;
  console.log('Vista previa imagen:', this.IMAGEN_PREVISUALIZA);



  if (this.EMPRESA_SELECTED.ruta_firma) {
    console.log('Firma actual:', this.EMPRESA_SELECTED.ruta_firma);
  }

  this.nombre_firma = this.EMPRESA_SELECTED.ruta_firma
    ? this.EMPRESA_SELECTED.ruta_firma.split('/').pop()
    : '';

  // Firma
  this.contrasena_firma = this.EMPRESA_SELECTED.contrasena_firma || '';
  this.fecha_expiracion_firma = this.EMPRESA_SELECTED.fecha_expiracion_firma
    ? this.EMPRESA_SELECTED.fecha_expiracion_firma.split(' ')[0]
    : '';

  // Autenticación externa. Si la empresa ya tiene algo configurado se abre
  // la sección sola, para que no quede escondida.
  this.utiliza_ldap = !!Number(this.EMPRESA_SELECTED.utiliza_ldap);
  this.ldap_host = norm(this.EMPRESA_SELECTED.ldap_host);
  this.ldap_port = norm(this.EMPRESA_SELECTED.ldap_port);
  this.ldap_base_dn = norm(this.EMPRESA_SELECTED.ldap_base_dn);
  this.ldap_username = norm(this.EMPRESA_SELECTED.ldap_username);
  this.ldap_password = norm(this.EMPRESA_SELECTED.ldap_password);

  this.utiliza_api_auth = !!Number(this.EMPRESA_SELECTED.utiliza_api_auth);
  this.api_auth_url = norm(this.EMPRESA_SELECTED.api_auth_url);
  this.api_auth_token = norm(this.EMPRESA_SELECTED.api_auth_token);

  this.mostrarDirectorio = this.utiliza_ldap || this.utiliza_api_auth;

  // Datos del administrador
  if (this.EMPRESA_SELECTED.admin) {
    this.admin_nombre = this.EMPRESA_SELECTED.admin.nombre || '';
    this.admin_apellido = this.EMPRESA_SELECTED.admin.apellido || '';
    this.admin_correo = this.EMPRESA_SELECTED.admin.email || '';
    this.admin_password = '';
    this.admin_password_confirm = '';
  }

  // ----------------------------------
  // 🔥 CARGAR PERMISOS DEL ADMIN
  // ----------------------------------

  this.permisions = []; // limpiar

  if (this.EMPRESA_SELECTED.admin?.permisos) {
    this.permisions = [...this.EMPRESA_SELECTED.admin.permisos];
  }

  // Construir agrupación para UI
  this.groupedSidebar = this.buildGroupedSidebar();
 }




togglePermisos() {
  this.mostrarPermisos = !this.mostrarPermisos;
}


 addPermission(permiso: string) {
    let INDEX = this.permisions.findIndex((perm: string) => perm == permiso);
    if (INDEX != -1) {
      this.permisions.splice(INDEX, 1);
    } else {
      this.permisions.push(permiso);
    }
    console.log(this.permisions);
  }

  private buildGroupedSidebar(): Array<{ title: string; items: any[] }> {
    const result: Array<{ title: string; items: any[] }> = [];
    const byName: { [key: string]: any } = {};
    (this.SIDEBAR || []).forEach((g: any) => { byName[g?.name] = g; });

    Object.keys(this.gruposConfig).forEach(title => {
      const names = this.gruposConfig[title] || [];
      const items = names
        .map(n => byName[n])
        .filter(Boolean)
        .map((g: any) => ({ name: g.name, permisos: g.permisos || [] }));
      if (items.length) {
        result.push({ title, items });
      }
    });
    return result;
  }

  // ====== Selección masiva ======
  private getAllPermissionKeys(): string[] {
    const keys: string[] = [];
    (this.groupedSidebar || []).forEach(g => {
      g.items.forEach(mod => {
        (mod.permisos || []).forEach((p: any) => keys.push(p.permiso));
      });
    });
    return keys;
  }

  private getGroupPermissionKeys(groupTitle: string): string[] {
    const g = (this.groupedSidebar || []).find(gr => gr.title === groupTitle);
    if (!g) return [];
    const keys: string[] = [];
    g.items.forEach(mod => (mod.permisos || []).forEach((p: any) => keys.push(p.permiso)));
    return keys;
  }

  isAllSelected(): boolean {
    const all = this.getAllPermissionKeys();
    if (all.length === 0) return false;
    const set = new Set(this.permisions);
    return all.every(k => set.has(k));
  }

  toggleAll(event: any) {
    const checked = !!event?.target?.checked;
    const all = this.getAllPermissionKeys();
    if (checked) {
      const set = new Set([...(this.permisions || []), ...all]);
      this.permisions = Array.from(set);
    } else {
      const rm = new Set(all);
      this.permisions = (this.permisions || []).filter((p: string) => !rm.has(p));
    }
  }

  isGroupAllSelected(groupTitle: string): boolean {
    const keys = this.getGroupPermissionKeys(groupTitle);
    if (keys.length === 0) return false;
    const set = new Set(this.permisions);
    return keys.every(k => set.has(k));
  }

  toggleGroup(groupTitle: string, event: any) {
    const checked = !!event?.target?.checked;
    const keys = this.getGroupPermissionKeys(groupTitle);
    if (checked) {
      const set = new Set([...(this.permisions || []), ...keys]);
      this.permisions = Array.from(set);
    } else {
      const rm = new Set(keys);
      this.permisions = (this.permisions || []).filter((p: string) => !rm.has(p));
    }
  }


  processFile($event: any) {
    if ($event.target.files[0].type.indexOf("image") < 0) {
      this.toast.warning("Advertencia", "El archivo no es una imagen");
      return;
    }
    this.IMAGEN_EMPRESA = $event.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(this.IMAGEN_EMPRESA);
    reader.onloadend = () => this.IMAGEN_PREVISUALIZA = reader.result;
  }

    onFirmaSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.firma_file = file;
    }
  }

  validateRUC(ruc: string): boolean {
    if (!ruc || !/^\d{13}$/.test(ruc)) return false;
  
    const provincia = parseInt(ruc.substring(0, 2), 10);
    if (provincia < 1 || provincia > 24) return false;
  
    // Todo RUC debe terminar en 001
    if (!ruc.endsWith('001')) return false;
  
    const tercerDigito = parseInt(ruc[2], 10);
  
    // PERSONA NATURAL
    if (tercerDigito >= 0 && tercerDigito <= 5) {
      return this.algoritmoModulo10(ruc.substring(0, 10));
    }
  
    // RUC PÚBLICO
    if (tercerDigito === 6) {
      return this.algoritmoRucExtra(
        ruc,
        [3, 2, 7, 6, 5, 4, 3, 2],
        8
      );
    }
  
    // RUC PRIVADO / JURÍDICO
    if (tercerDigito === 9) {
      return this.algoritmoRucExtra(
        ruc,
        [4, 3, 2, 7, 6, 5, 4, 3, 2],
        9
      );
    }
  
    return false;
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
  allowOnlyNumbers(event: KeyboardEvent) {
    const charCode = event.charCode ? event.charCode : event.keyCode;
    // Permite solo números (0-9)
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  isValidEmail(email: string): boolean {
    // Expresión regular básica para validar email
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }


  // Flags de validación
  nombreInvalid = false;
  adminNombreInvalid = false;
  adminApellidoInvalid = false;
  adminCorreoInvalid = false;
  rucInvalid = false;
  adminPasswordInvalid = false;
  adminPasswordConfirmInvalid = false;


  store() {

    // Reiniciar flags
    this.nombreInvalid = false;
    this.adminNombreInvalid = false;
    this.adminApellidoInvalid = false;
    this.adminCorreoInvalid = false;
    this.rucInvalid = false;
    this.adminPasswordInvalid = false;
    this.adminPasswordConfirmInvalid = false;

    let valido = true;

   if (!this.nombre) {
      this.nombreInvalid = true;
      this.toast.error("Validación", "El nombre de la empresa es requerido");
      valido = false;
    }

    // Validar RUC
  if (!this.ruc) {
    this.rucInvalid = true;
    this.toast.error("Validación", "El RUC es requerido");
    valido = false;
  } else if (!this.validateRUC(this.ruc)) {
    this.rucInvalid = true;
    this.toast.error("Validación", "RUC inválido");
    valido = false;
  }


  if (!this.admin_nombre) {
    this.adminNombreInvalid = true;
    this.toast.error("Validación", "El nombre del administrador es requerido");
    valido = false;
  }

  if (!this.admin_apellido) {
    this.adminApellidoInvalid = true;
    this.toast.error("Validación", "El apellido del administrador es requerido");
    valido = false;
  }
 if (!this.admin_correo) {
    this.adminCorreoInvalid = true;
    this.toast.error("Validación", "El correo del administrador es requerido");
    valido = false;
  }

 // Validación de contraseñas SOLO si se ingresa alguna
if (this.admin_password || this.admin_password_confirm) {
  if (this.admin_password.length < 6) {
    this.adminPasswordInvalid = true;
    this.toast.error("Validación", "La contraseña debe tener al menos 6 caracteres");
    valido = false;
  }

  if (this.admin_password !== this.admin_password_confirm) {
    this.adminPasswordInvalid = true;
    this.adminPasswordConfirmInvalid = true;
    this.toast.error("Validación", "Las contraseñas no coinciden");
    valido = false;
  }
}



  if (!valido) return;
  const formData = new FormData();
  formData.append("nombre_empresa", this.nombre);
  formData.append("ruc_empresa", this.ruc);
  formData.append("telefono", this.telefono || '');
  formData.append("correo", this.correo || '');
  formData.append("direccion", this.direccion || '');
  formData.append("estado", this.estado.toString());

  // Imagen
  if (this.IMAGEN_EMPRESA) {
    formData.append("imagen_empresa", this.IMAGEN_EMPRESA);
  }

  // Autenticación externa: todos opcionales. Los switches viajan como 1/0
  // porque en un FormData el booleano se convertiría en "true"/"false".
  formData.append("utiliza_ldap", this.utiliza_ldap ? '1' : '0');
  formData.append("ldap_host", this.ldap_host || '');
  formData.append("ldap_port", this.ldap_port || '');
  formData.append("ldap_base_dn", this.ldap_base_dn || '');
  formData.append("ldap_username", this.ldap_username || '');
  formData.append("ldap_password", this.ldap_password || '');

  formData.append("utiliza_api_auth", this.utiliza_api_auth ? '1' : '0');
  formData.append("api_auth_url", this.api_auth_url || '');
  formData.append("api_auth_token", this.api_auth_token || '');

  // 🔹 Datos del administrador
  formData.append("admin_nombre", this.admin_nombre);
  formData.append("admin_apellido", this.admin_apellido);
  formData.append("admin_correo", this.admin_correo);
  // Solo enviar la nueva contraseña si se escribió algo
if (this.admin_password && this.admin_password_confirm) {
  formData.append("admin_password", this.admin_password);
}

 // Permisos del administrador
  if (this.permisions && this.permisions.length > 0) {
    formData.append('admin_permisos', JSON.stringify(this.permisions));
  }

  // Roles del administrador (IDs)
  if (this.EMPRESA_SELECTED.admin?.roles && this.EMPRESA_SELECTED.admin.roles.length > 0) {
    const roleIds = this.EMPRESA_SELECTED.admin.roles.map((r: any) => r.id);
    formData.append('admin_roles', JSON.stringify(roleIds));
  }

  // 🔹 ARCHIVO DE FIRMA (.p12 / .pfx)
  if (this.firma_file) {
    formData.append("firma_digital", this.firma_file);
  }

  // 🔹 CONTRASEÑA DE LA FIRMA
  formData.append("contrasena_firma", this.contrasena_firma ?? "");

  // 🔹 FECHA DE EXPIRACIÓN
  formData.append("fecha_expiracion_firma", this.fecha_expiracion_firma ?? "");

  this.empresaService.updateEmpresa(this.EMPRESA_SELECTED.id, formData).subscribe((resp: any) => {
    if (resp.message === 403) {
      this.toast.error("Validación", resp.message_text);
    } else {
      this.toast.success("Éxito", "La empresa se actualizó correctamente");
      this.EmpresaE.emit(resp.empresa);
      this.modal.close();
    }
  });
}

}
