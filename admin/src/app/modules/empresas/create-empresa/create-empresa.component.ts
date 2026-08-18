import { Component, EventEmitter, Output } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { EmpresaService } from '../service/empresa.service';
import { SIDEBAR } from 'src/app/config/config'; // <-- Ajusta la ruta correcta
import Swal from 'sweetalert2';

@Component({
  selector: 'app-create-empresa',
  templateUrl: './create-empresa.component.html',
  styleUrls: ['./create-empresa.component.scss']
})
export class CreateEmpresaComponent {

  @Output() EmpresaC: EventEmitter<any> = new EventEmitter();

  nombre: string = '';
  ruc: string = '';
  telefono: string = '';
  correo: string = '';
  direccion: string = '';
  //DATOS PARA EL ADMINISTRADOR DEL SSTEMA
  admin_nombre: string = '';
  admin_apellido: string = '';
  admin_correo: string = '';
  admin_password: string = '';
  admin_password_confirm: string = '';

  isLoading: any;

  LOGO_EMPRESA: any;
  LOGO_PREVISUALIZA: any;

 // Firma digital
  firmaFile: File | null = null;
  contrasena_firma: string = '';
  fecha_expiracion_firma: string = '';




  SIDEBAR: any = SIDEBAR; // <-- Aquí lo expones al template
  permisions: any = [];

  // Configuración de agrupación de permisos
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
      'Cliente', 'Clientes', 'Tramite', 'Tipo Documento', 'Tipo Tramite', 'Seguimiento', 'Despacho Trámite','Recepcion Trámite', 'Buzon Tramite', 'Historial Tramite'
    ]
  };

  groupedSidebar: Array<{ title: string; items: any[] }> = [];

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


  constructor(
    public modal: NgbActiveModal,
    public empresaService: EmpresaService,
    public toast: ToastrService,
  ) {}


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
  ngOnInit(): void {
    this.groupedSidebar = this.buildGroupedSidebar();
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
        this.toast.warning("WARN", "El archivo no es una imagen");
        return;
      }
      this.LOGO_EMPRESA = $event.target.files[0];
      let reader = new FileReader();
      reader.readAsDataURL(this.LOGO_EMPRESA);
      reader.onloadend = () => this.LOGO_PREVISUALIZA = reader.result;
    }

  onFirmaSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.firmaFile = file;
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
  

  console.log('Contraseña firma:', this.contrasena_firma);
  console.log('Fecha expiración firma:', this.fecha_expiracion_firma);

  let valido = true;
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

  // Validaciones
   if (!this.nombre) {
    this.nombreInvalid = true;
    this.toast.error("Validación", "El nombre de la empresa es requerido");
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
 // Validación contraseña
  if (!this.admin_password) {
    this.adminPasswordInvalid = true;
    this.toast.error("Validación", "La contraseña del administrador es requerida");
    valido = false;
  } else if (this.admin_password.length < 6) {
    this.adminPasswordInvalid = true;
    this.toast.error("Validación", "La contraseña debe tener al menos 6 caracteres");
    valido = false;
  }

  if (!this.admin_password_confirm) {
    this.adminPasswordConfirmInvalid = true;
    this.toast.error("Validación", "La confirmación de la contraseña es requerida");
    valido = false;
  } else if (this.admin_password !== this.admin_password_confirm) {
    this.adminPasswordInvalid = true;
    this.adminPasswordConfirmInvalid = true;
    this.toast.error("Validación", "Las contraseñas no coinciden");
    valido = false;
  }
  if (!valido) return;
  // FormData
  const formData = new FormData();
  formData.append("nombre_empresa", this.nombre);
  // Normalizar para no enviar nunca la cadena 'NULL'
  const norm = (v: any) => (v && String(v).toUpperCase() !== 'NULL') ? String(v) : '';
  formData.append("ruc_empresa", norm(this.ruc));
  formData.append("telefono", norm(this.telefono));
  formData.append("correo", norm(this.correo));
  formData.append("direccion", norm(this.direccion));
  formData.append("logo", this.LOGO_EMPRESA);

  if (this.firmaFile) formData.append("firma", this.firmaFile);

  // ⚡ Siempre enviar contraseña y fecha aunque no haya archivo
  formData.append("contrasena_firma", this.contrasena_firma || '');
  formData.append("fecha_expiracion_firma", this.fecha_expiracion_firma || '');

  formData.append("admin_nombre", this.admin_nombre);
  formData.append("admin_apellido", this.admin_apellido);
  formData.append("admin_correo", this.admin_correo);
  formData.append("admin_password", this.admin_password);

  formData.append("permisos", JSON.stringify(this.permisions));

  // Autenticación externa: todos opcionales. Los switches viajan como 1/0
  // porque en un FormData el booleano se convertiría en "true"/"false".
  formData.append("utiliza_ldap", this.utiliza_ldap ? '1' : '0');
  formData.append("ldap_host", norm(this.ldap_host));
  formData.append("ldap_port", norm(this.ldap_port));
  formData.append("ldap_base_dn", norm(this.ldap_base_dn));
  formData.append("ldap_username", norm(this.ldap_username));
  formData.append("ldap_password", norm(this.ldap_password));

  formData.append("utiliza_api_auth", this.utiliza_api_auth ? '1' : '0');
  formData.append("api_auth_url", norm(this.api_auth_url));
  formData.append("api_auth_token", norm(this.api_auth_token));

  // 🔹 Swal de espera mientras se crea la empresa
  Swal.fire({
    title: 'Espere',
    text: 'Se está creando la empresa...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  // Llamada al servicio
  this.empresaService.registerEmpresa(formData).subscribe({ 
    next: (resp: any) => {
      Swal.close(); // cerrar Swal de espera

      if (resp.message === 403) {
        this.toast.error("Validación", resp.message_text);
      } else if (resp.message === 200) {
        // 1️⃣ Emitir al padre que se creó la empresa
        this.EmpresaC.emit(resp.empresa);
    
        // 2️⃣ Cerrar modal
        this.modal.close();
    
        // 3️⃣ Swal de éxito simple
        Swal.fire({
            title: '¡Registro Exitoso!',
            text: 'La empresa se registró correctamente y se envió un correo con las credenciales al administrador creado.',
            icon: 'success',
            confirmButtonText: 'Aceptar',
            confirmButtonColor: '#28a745' // Color verde para éxito
        });
    
    } else {
        this.toast.error("Error", "Ocurrió un problema al registrar la empresa");
    }
    },
    error: err => {
      Swal.close();
      this.toast.error("Error", "Error al comunicarse con el servidor");
      console.error(err);
    }
  });

}







}
