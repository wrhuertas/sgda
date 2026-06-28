import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ClienteService } from '../service/cliente.service';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/modules/auth';

@Component({
  selector: 'app-registrar-cliente',
  templateUrl: './registrar-cliente.component.html',
  styleUrls: ['./registrar-cliente.component.scss']
})
export class RegistrarClienteComponent implements OnInit {

  // 1. Variables que coinciden con el formulario HTML y el Modelo Laravel
  nombre: string = '';
  cedula_ruc: string = '';
  telefono: string = '';
  direccion: string = '';
  estado: number = 1; // 1 para Activo por defecto
  correo: string = '';

  type_document: 'CEDULA' | 'RUC' | 'CEDULA_EXTRANJERA' = 'CEDULA';
n_document: string = '';
documentoValido: boolean | null = null;
isConsultandoSri: boolean = false;
telefonoValido: boolean | null = null;
correoValido: boolean | null = null;
  touchedDocumento: boolean = false;
  touchedNombre: boolean = false;
  touchedTelefono: boolean = false;
  touchedCorreo: boolean = false;
  touchedDireccion: boolean = false;


password = '';
password_confirmation = '';


  user: any;
  isLoading: boolean = false;

  // Cambiamos el nombre del evento para que sea más claro
  @Output() ClienteC = new EventEmitter<any>();

  constructor(
    private authService: AuthService,
    public clienteService: ClienteService,
    public toast: ToastrService,
    public modal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    this.user = this.authService.user;
    this.onDocumentoChange();
    this.onTelefonoChange();
    this.onCorreoChange();
  }


  onTypeDocumentChange() {
  this.cedula_ruc = '';
  this.n_document = '';
  this.documentoValido = null;
  this.touchedDocumento = false;
}

onDocumentoChange() {
  this.documentoValido = this.cedula_ruc ? this.validarDocumento(this.cedula_ruc) : null;
}

validarDocumento(valor: any): boolean {
  const doc = String(valor).trim();
  if (!doc) return false;

  if (this.type_document === 'CEDULA_EXTRANJERA') {
    return /^[A-Za-z0-9]{5,20}$/.test(doc);
  }

  if (!/^\d+$/.test(doc)) return false;

  const provincia = parseInt(doc.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) return false;

  // CÉDULA
  if (this.type_document === 'CEDULA') {
    if (doc.length !== 10) return false;
    return this.algoritmoModulo10(doc);
  }

  // RUC (Ecuador)
  if (this.type_document === 'RUC') {
    if (doc.length !== 13) return false;
    const tercer = parseInt(doc.substring(2, 3), 10);
    const establecimiento = doc.substring(10, 13);
    if (establecimiento === '000') return false;

    // Persona natural
    if (tercer >= 0 && tercer <= 5) {
      return this.algoritmoModulo10(doc.substring(0, 10));
    }

    // Entidad pública (módulo 11, dv en posición 9)
    if (tercer === 6) {
      return this.algoritmoModulo11(doc.substring(0, 9), [3, 2, 7, 6, 5, 4, 3, 2], 8, true);
    }

    // Sociedad privada (módulo 11, dv en posición 10)
    if (tercer === 9) {
      return this.algoritmoModulo11(doc.substring(0, 10), [4, 3, 2, 7, 6, 5, 4, 3, 2], 9, false);
    }

    return false;
  }

  return false;
}

private algoritmoModulo10(cedula: string): boolean {
  const d = cedula.split('').map(Number);
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let p = d[i] * (i % 2 === 0 ? 2 : 1);
    suma += p > 9 ? p - 9 : p;
  }

  const dv = (10 - (suma % 10)) % 10;
  return dv === d[9];
}

private algoritmoModulo11(doc: string, coeficientes: number[], dvIndex: number, invalidDv10: boolean): boolean {
  const digits = doc.split('').map(Number);
  let suma = 0;
  for (let i = 0; i < coeficientes.length; i++) {
    suma += digits[i] * coeficientes[i];
  }
  const mod = suma % 11;
  let dv = (11 - mod) % 11;
  if (invalidDv10 && dv === 10) return false;
  if (!invalidDv10 && dv === 10) dv = 0;
  return dv === digits[dvIndex];
}

consultarSri() {
  if (this.type_document !== 'RUC') {
    this.toast.error('Seleccione tipo de documento RUC para consultar en el SRI');
    return;
  }

  if (!this.validarDocumento(this.cedula_ruc)) {
    this.toast.error('Ingrese un RUC válido (13 dígitos) antes de consultar');
    return;
  }

  this.isConsultandoSri = true;
  this.clienteService.consultarSri(this.cedula_ruc).subscribe({
    next: (resp: any) => {
      const nombre = resp?.razon_social || resp?.nombre_comercial;
      const direccion = resp?.direccion;
      // Requerimiento: NO rellenar campos ni mostrar toasts. Solo consultar.
      // Si necesitas usar los valores, están en 'nombre' y 'direccion'.
    },
    error: (err) => {
      // Silencioso: no mostrar mensajes de validación/errores aquí.
    },
    complete: () => {
      this.isConsultandoSri = false;
    }
  });
}

onTelefonoChange() {
  const cleaned = String(this.telefono || '').replace(/\D+/g, '');
  this.telefono = cleaned;
  this.telefonoValido = cleaned.length === 0 ? null : /^\d+$/.test(cleaned);
}

allowOnlyDigits(event: KeyboardEvent) {
  const allowedKeys = [
    'Backspace',
    'Delete',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
    'Tab',
  ];

  if (allowedKeys.includes(event.key)) return;
  if (event.ctrlKey || event.metaKey) return;
  if (/^\d$/.test(event.key)) return;

  event.preventDefault();
}

onTelefonoPaste(event: ClipboardEvent) {
  event.preventDefault();
  const text = event.clipboardData?.getData('text') ?? '';
  const digits = text.replace(/\D+/g, '');
  this.telefono = digits;
  this.onTelefonoChange();
}

validarCorreoFormato(valor: any): boolean {
  const email = String(valor || '').trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

onCorreoChange() {
  const email = String(this.correo || '').trim();
  this.correoValido = email.length === 0 ? null : this.validarCorreoFormato(email);
}

onBlurDocumento() {
  this.touchedDocumento = true;
  this.onDocumentoChange();
}

onBlurNombre() {
  this.touchedNombre = true;
}

onBlurTelefono() {
  this.touchedTelefono = true;
  this.onTelefonoChange();
}

onBlurCorreo() {
  this.touchedCorreo = true;
  this.onCorreoChange();
}

onBlurDireccion() {
  this.touchedDireccion = true;
}


store() {
  this.touchedDocumento = true;
  this.touchedNombre = true;
  this.touchedCorreo = true;
  this.touchedDireccion = true;
  this.touchedTelefono = true;

  // 🔐 1. Validación de sesión local
  if (!this.user?.id_empresa) {
    this.toast.error('Sesión inválida: No se detectó el ID de la empresa');
    return;
  }

  // 🧾 2. Validaciones de presencia (Frontend)
  if (!this.nombre || !this.cedula_ruc || !this.direccion || !this.correo) {
    this.toast.error('Por favor, complete los campos obligatorios');
    return;
  }

  if (!this.validarDocumento(this.cedula_ruc)) {
    if (this.type_document === 'RUC') {
      this.toast.error('El RUC ingresado no es válido');
    } else if (this.type_document === 'CEDULA') {
      this.toast.error('La cédula ingresada no es válida');
    } else {
      this.toast.error('El documento extranjero ingresado no es válido');
    }
    return;
  }

  if (this.telefono && !/^\d+$/.test(this.telefono)) {
    this.toast.error('El teléfono debe contener solo números');
    return;
  }

  if (!this.validarCorreoFormato(this.correo)) {
    this.toast.error('El correo electrónico no tiene un formato válido');
    return;
  }

  // 🔑 3. Validación de contraseñas
  if (!this.password || !this.password_confirmation) {
    this.toast.error('Debe ingresar la contraseña y su confirmación');
    return;
  }

  if (this.password !== this.password_confirmation) {
    this.toast.error('Las contraseñas no coinciden');
    return;
  }

  // 📦 4. Payload Sincronizado con Backend
  const data = {
    nombre: this.nombre,
    cedula_ruc: this.cedula_ruc,
    telefono: this.telefono, // Se envía como telefono
    direccion: this.direccion,
    correo: this.correo,
    estado: this.estado || 1, // Aseguramos un valor por defecto
    password: this.password,
    type_document: this.type_document,
    id_empresa: this.user.id_empresa
  };

  this.isLoading = true;

  this.clienteService.registerCliente(data).subscribe({
    next: (resp: any) => {
      this.toast.success('Cliente registrado con éxito');
      this.ClienteC.emit(resp.user); // El backend devuelve 'user' según tu código
      this.modal.close();
    },
    error: (err) => {
      this.isLoading = false;
      
      // 🚨 Captura de errores de validación de Laravel (422)
      if (err.status === 422 && err.error.errors) {
        const mensajes = Object.values(err.error.errors).flat().join(' | ');
        this.toast.error(mensajes);
      } else {
        this.toast.error(err?.error?.message || 'Error interno en el servidor');
      }
    },
    complete: () => {
      this.isLoading = false;
    }
  });
}


  cerrar() {
    this.modal.close();
  }
}
