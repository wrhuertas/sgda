import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ClienteService } from '../service/cliente.service';

@Component({
  selector: 'app-editar-cliente',
  templateUrl: './editar-cliente.component.html',
  styleUrls: ['./editar-cliente.component.scss']
})
export class EditarClienteComponent implements OnInit {
  
  @Input() Cliente_SELECTED: any;           // Cliente enviado desde el listado
  @Output() ClienteE: EventEmitter<any> = new EventEmitter();

  formCliente: FormGroup;
  isLoading: boolean = false;
  type_document: 'CEDULA' | 'RUC' | 'CEDULA_EXTRANJERA' = 'CEDULA';
  documentoValido: boolean | null = null;
  isConsultandoSri: boolean = false;
  private telefonoKeyHandler = (event: KeyboardEvent) => this.allowOnlyDigits(event);

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    public activeModal: NgbActiveModal
  ) {}

  ngOnInit(): void {
    // Inicializar el formulario con los datos del cliente
    this.formCliente = this.fb.group({
      
      nombre: [this.Cliente_SELECTED.nombre, [Validators.required, Validators.maxLength(150)]],
      cedula_ruc: [this.Cliente_SELECTED.cedula_ruc, [Validators.required, Validators.maxLength(20)]],
      telefono: [this.Cliente_SELECTED.telefono, [Validators.pattern(/^\d*$/)]],
      correo: [this.Cliente_SELECTED.correo, [Validators.email]],
      direccion: [this.Cliente_SELECTED.direccion, [Validators.required]],
      estado: [this.Cliente_SELECTED.estado, [Validators.required]],
    });

    const doc = String(this.Cliente_SELECTED?.cedula_ruc || '').trim();
    if (doc.length === 13 && /^\d+$/.test(doc)) {
      this.type_document = 'RUC';
    } else if (doc.length === 10 && /^\d+$/.test(doc)) {
      this.type_document = 'CEDULA';
    } else {
      this.type_document = 'CEDULA_EXTRANJERA';
    }
    this.documentoValido = this.validarDocumento(doc);
    this.formCliente.get('cedula_ruc')?.valueChanges.subscribe((val) => {
      const v = String(val || '').trim();
      if (v.length === 13 && /^\d+$/.test(v)) {
        this.type_document = 'RUC';
      } else if (v.length === 10 && /^\d+$/.test(v)) {
        this.type_document = 'CEDULA';
      } else {
        this.type_document = 'CEDULA_EXTRANJERA';
      }
      this.documentoValido = this.validarDocumento(v);
    });
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
    this.formCliente.patchValue({ telefono: digits });
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

    if (this.type_document === 'CEDULA') {
      if (doc.length !== 10) return false;
      return this.algoritmoModulo10(doc);
    }

    if (this.type_document === 'RUC') {
      if (doc.length !== 13) return false;
      const tercer = parseInt(doc.substring(2, 3), 10);
      const establecimiento = doc.substring(10, 13);
      if (establecimiento === '000') return false;

      if (tercer >= 0 && tercer <= 5) {
        return this.algoritmoModulo10(doc.substring(0, 10));
      }
      if (tercer === 6) {
        return this.algoritmoModulo11(doc.substring(0, 9), [3, 2, 7, 6, 5, 4, 3, 2], 8, true);
      }
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
    const doc = String(this.formCliente.get('cedula_ruc')?.value || '').trim();
    if (this.type_document !== 'RUC') return;
    if (!this.validarDocumento(doc)) return;

    this.isConsultandoSri = true;
    this.clienteService.consultarSri(doc).subscribe({
      next: (resp: any) => {
        const nombre = resp?.razon_social || resp?.nombre_comercial;
        const direccion = resp?.direccion;
        const patch: any = {};
        if (nombre && !this.formCliente.get('nombre')?.value) patch.nombre = nombre;
        if (direccion && !this.formCliente.get('direccion')?.value) patch.direccion = direccion;
        if (Object.keys(patch).length > 0) this.formCliente.patchValue(patch);
      },
      error: (err) => {
        if (err?.status === 422 && err?.error?.errors) {
          const mensajes = Object.values(err.error.errors).flat().join(' | ');
          console.error(mensajes);
          return;
        }
        console.error('Error consultando SRI', err);
      },
      complete: () => {
        this.isConsultandoSri = false;
      }
    });
  }

 // Función para actualizar cliente
  actualizarCliente() {
  if (this.formCliente.invalid) return;

  this.isLoading = true;

  const datos = this.formCliente.value;

  const formData = new FormData();
  formData.append('nombre', datos.nombre || '');
  formData.append('cedula_ruc', datos.cedula_ruc || '');
  formData.append('telefono', datos.telefono || '');
  formData.append('correo', datos.correo || '');
  formData.append('direccion', datos.direccion || '');
  formData.append('estado', datos.estado.toString());
  formData.append('type_document', this.type_document);

  // <-- QUITAMOS _method

  this.clienteService.updateCliente(this.Cliente_SELECTED.id_cliente, formData)
    .subscribe({
      next: (resp: any) => {
        this.isLoading = false;
        this.ClienteE.emit(resp.cliente);
        this.activeModal.close();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error al actualizar cliente', err);
      }
    });
}





}
