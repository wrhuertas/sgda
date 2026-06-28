import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CreateEmpresaComponent } from '../create-empresa/create-empresa.component';
import { EditEmpresaComponent } from '../edit-empresa/edit-empresa.component';
import { DeleteEmpresaComponent } from '../delete-empresa/delete-empresa.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmpresaService } from '../service/empresa.service';
import { ToastrService } from 'ngx-toastr';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { URL_SERVICIOS } from 'src/app/config/config';

@Component({
  selector: 'app-list-empresa',
  templateUrl: './list-empresa.component.html',
  styleUrls: ['./list-empresa.component.scss']
})
export class ListEmpresaComponent {
  @Output() EmpresaE: EventEmitter<any> = new EventEmitter();
  search: string = '';
  EMPRESAS: any[] = [];
  isLoading$: any;
  private readonly backendUrl = URL_SERVICIOS;

  totalPages: number = 0;
  currentPage: number = 1;
  usuarioActual: any = null;
  isSuperAdmin: boolean = false;
  loggedUser: any = {};
  userRole: string = '';
  empresaDelAdmin: any = null;


  @Input() EMPRESA_SELECTED: any;

  nombre: string = '';
  ruc: string = '';
  telefono: string = '';
  correo: string = '';
  direccion: string = '';
  estado: number = 1;
  sigla_empresa: string = '';

  firmaFile: File | null = null;
  contrasena_firma = '';
  fecha_expiracion_firma = '';

  // Imagen
  IMAGEN_EMPRESA: any;
  IMAGEN_PREVISUALIZA: any;
  
  // Imagen Cabecera y Pie de Página
  IMAGEN_CABECERA: any;
  IMAGEN_CABECERA_PREVISUALIZA: any;
  IMAGEN_PIE_PAGINA: any;
  IMAGEN_PIE_PAGINA_PREVISUALIZA: any;

  // Datos del administrador
  admin_nombre: string = '';
  admin_apellido: string = '';
  admin_correo: string = '';
  admin_password: string = '';
  admin_password_confirm: string = '';
  isLoading: any;

  constructor(
    
    public modalService: NgbModal,
    public empresaService: EmpresaService,
    public toast: ToastrService,
  private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
  this.isLoading$ = this.empresaService.isLoading$;

  // 1️⃣ Cargar usuario y decidir rol
  this.loadCurrentUser();

  // 2️⃣ Acciones según rol
  if (this.isSuperAdmin) {
    console.log('👑 Super Admin → cargando todas las empresas');
    this.listEmpresas();
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

  processCabecera($event: any) {
    if ($event.target.files[0].type.indexOf("image") < 0) {
      this.toast.warning("Advertencia", "El archivo no es una imagen");
      return;
    }
    this.IMAGEN_CABECERA = $event.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(this.IMAGEN_CABECERA);
    reader.onloadend = () => this.IMAGEN_CABECERA_PREVISUALIZA = reader.result;
  }

  processPiePagina($event: any) {
    if ($event.target.files[0].type.indexOf("image") < 0) {
      this.toast.warning("Advertencia", "El archivo no es una imagen");
      return;
    }
    this.IMAGEN_PIE_PAGINA = $event.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(this.IMAGEN_PIE_PAGINA);
    reader.onloadend = () => this.IMAGEN_PIE_PAGINA_PREVISUALIZA = reader.result;
  }

    onFirmaSelected(event: any) {
  const file = event.target.files[0];
  if (file) {
    this.firmaFile = file;
  }
}


loadCurrentUser() {
  console.log('🟡 loadCurrentUser ejecutado');

  const userData = localStorage.getItem('user');
  if (!userData) {
    console.warn('⚠️ No hay usuario en localStorage');
    return;
  }

  try {
    this.usuarioActual = JSON.parse(userData);
    console.log('👤 Usuario actual:', this.usuarioActual);

    // ✅ Validar Super Admin
    this.isSuperAdmin = this.usuarioActual.role_name === 'Super-Admin';
    console.log('👑 ¿Es SuperAdmin?', this.isSuperAdmin);

    // ✅ SI NO ES SUPER ADMIN → USAR id_empresa DIRECTO
    if (!this.isSuperAdmin && this.usuarioActual.id_empresa) {
      const idEmpresa = this.usuarioActual.id_empresa;

      console.log('🏢 ID EMPRESA DEL USUARIO:', idEmpresa);

      this.cargarEmpresa(idEmpresa);
    }

  } catch (error) {
    console.error('❌ Error al parsear el usuario:', error);
  }
}




cargarEmpresa(idEmpresa: number) {
  console.log('📡 Consultando empresa:', idEmpresa);

  // 🔥 Swal de carga
  Swal.fire({
    title: 'Cargando datos',
    text: 'Por favor espere...',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  this.empresaService.cargarempresaid(idEmpresa).subscribe({
    next: (empresa: any) => {
      console.log('✅ Empresa recibida:', empresa);

      this.EMPRESA_SELECTED = empresa;

      // 🧠 Asignar valores al formulario
      // Normalizar valores nulos a cadena vacía para que no aparezca "null" en los inputs
      this.nombre    = empresa.nombre_empresa ?? '';
      this.ruc       = empresa.ruc_empresa ?? '';
      this.telefono  = empresa.telefono ?? '';
      this.correo    = empresa.correo ?? '';
      this.direccion = empresa.direccion ?? '';
      this.sigla_empresa = empresa.sigla ?? '';

      // 🖼️ Imagen Principal (viene con URL completa desde el backend)
      if (empresa.imagen_empresa) {
        this.IMAGEN_PREVISUALIZA = empresa.imagen_empresa;
      }

      // 🖼️ Imagen Cabecera (viene con URL completa desde el backend)
      if (empresa.imagen_cabecera) {
        this.IMAGEN_CABECERA_PREVISUALIZA = empresa.imagen_cabecera;
      }

      // 🖼️ Imagen Pie de Página (viene con URL completa desde el backend)
      if (empresa.imagen_pie_pagina) {
        this.IMAGEN_PIE_PAGINA_PREVISUALIZA = empresa.imagen_pie_pagina;
      }

      // 🔁 Forzar refresco de vista
      this.cdr.detectChanges();

      // ✅ Cerrar loading
      Swal.close();
    },
    error: (err) => {
      console.error('❌ Error al cargar empresa', err);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cargar la información de la empresa'
      });
    }
  });
}






  listEmpresas(page = 1) {
    this.empresaService.listEmpresas(page, this.search).subscribe((resp: any) => {
      console.log('Respuesta del backend de empresas:', resp);
      this.EMPRESAS = resp.empresas; // asegúrate que el backend devuelve `empresas`
      this.totalPages = resp.total;
      this.currentPage = page;
    });
  }

  loadPage($event: any) {
    this.listEmpresas($event);
  }

  createEmpresa() {
    const modalRef = this.modalService.open(CreateEmpresaComponent, { centered: true, size: 'xl' });


    modalRef.componentInstance.EmpresaC.subscribe((empresa: any) => {
        this.toast.success('Éxito', `La empresa ${empresa.nombre_empresa} se agregó`);
        // Refrescar listado completo (opcional)
        this.listEmpresas(this.currentPage);
      });
  }


  

  editEmpresa(EMPRESA: any) {
    const modalRef = this.modalService.open(EditEmpresaComponent, { centered: true, size: 'xl' });
    modalRef.componentInstance.EMPRESA_SELECTED = EMPRESA;

    modalRef.componentInstance.EmpresaE.subscribe((empresa: any) => {
      const INDEX = this.EMPRESAS.findIndex((e: any) => e.id == EMPRESA.id);
      if (INDEX != -1) {
        this.EMPRESAS[INDEX] = empresa;
      }
      // 2️⃣ Refrescar listado completo opcionalmente
    this.listEmpresas(this.currentPage);
    });
  }

  deleteEmpresa(EMPRESA: any) {
    const modalRef = this.modalService.open(DeleteEmpresaComponent, { centered: true, size: 'md' });
    modalRef.componentInstance.EMPRESA_SELECTED = EMPRESA;

    modalRef.componentInstance.EmpresaD.subscribe(() => {
      const INDEX = this.EMPRESAS.findIndex((e: any) => e.id == EMPRESA.id);
      if (INDEX != -1) {
        this.EMPRESAS.splice(INDEX, 1);
      }
    });
  }


  enviarMensajeWhatsApp() {
  const numeroDestino = '5939982463178'; // 🔥 número fijo (sin el +)
  const mensaje = prompt('Ingrese el mensaje a enviar');

  if (!mensaje) return;

  const payload = {
    number: numeroDestino,
    message: mensaje
  };

  this.empresaService.enviarMensajeWhatsApp(payload)
    .subscribe({
      next: res => alert('✅ Mensaje enviado correctamente'),
      error: err => alert('❌ Error al enviar el mensaje')
    });
}


cerrarVistaEmpresa() {
 // this.vistaNoSuperAdminAbierta = false;
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
rucInvalid = false;

ActulizarEmpresa() {

     // Reiniciar flags
  this.nombreInvalid = false;
  this.rucInvalid = false;

  if (!this.EMPRESA_SELECTED?.id_empresa) {
    console.error('❌ No hay empresa seleccionada');
    return;
  }


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

  if (!valido) return;

  // 🔥 Crear FormData
  const formData = new FormData();
  formData.append('nombre_empresa', this.nombre ?? '');
  formData.append('ruc_empresa', this.ruc ?? '');
  formData.append('telefono', this.telefono ?? '');
  formData.append('correo', this.correo ?? '');
  formData.append('direccion', this.direccion ?? '');
  if (this.sigla_empresa) {
    formData.append('sigla_empresa', this.sigla_empresa.trim());
  }

  // 📷 Agregar imagen principal solo si se seleccionó
  if (this.IMAGEN_EMPRESA) {
    formData.append('imagen_empresa', this.IMAGEN_EMPRESA);
  }

  // 📷 Agregar imagen cabecera solo si se seleccionó
  if (this.IMAGEN_CABECERA) {
    formData.append('imagen_cabecera', this.IMAGEN_CABECERA);
  }

  // 📷 Agregar imagen pie de página solo si se seleccionó
  if (this.IMAGEN_PIE_PAGINA) {
    formData.append('imagen_pie_pagina', this.IMAGEN_PIE_PAGINA);
  }

  // ✅ Log para revisar que los datos se están enviando
  console.log('📤 Datos a enviar:', {
    id_empresa: this.EMPRESA_SELECTED.id_empresa,
    nombre: this.nombre,
    ruc: this.ruc,
    telefono: this.telefono,
    correo: this.correo,
    direccion: this.direccion,
    sigla_empresa: this.sigla_empresa,
    imagen: this.IMAGEN_EMPRESA,
  });

  // 🔁 Llamada al servicio
  this.empresaService
    .actualizarEmpresa(this.EMPRESA_SELECTED.id_empresa, formData)
    .subscribe({
      next: (resp) => {
        console.log('✅ Empresa actualizada:', resp);
        Swal.fire({
          icon: 'success',
          title: 'Actualizado',
          text: 'Empresa actualizada correctamente',
        }).then(() => {
          // 🔄 Recargar la empresa actualizada
          this.cargarEmpresa(this.EMPRESA_SELECTED.id_empresa);
        });
      },
      error: (err) => {
        console.error('❌ Error al actualizar empresa', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo actualizar la empresa',
        });
      }
    });
}







}
