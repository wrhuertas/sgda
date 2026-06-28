import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { SerieService } from '../service/serie.service';
import { AuthService } from '../../auth';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-create-serie',
  templateUrl: './create-serie.component.html',
  styleUrls: ['./create-serie.component.scss'],
})
export class CreateSerieComponent {
  @Input() idSubseccion!: number;
  @Input() idSerie?: number; // ID de la Serie si existe en el contexto
  @Input() nombreSubseccion!: string;    
  @Output() SubseccionC = new EventEmitter<any>();
  
  user$: Observable<any>;


  nombre: string = '';
descripcion: string = '';
origen: string = '';
  acceso: string = '';
  tipoDocumento: string = '';
descripcionLegal: string = '';

activeTab: number = 1;
  isLoading: boolean = false;
  usuario_id!: number;
  id_empresa!: number;

    // ✅ NUEVOS PARÁMETROS
  tiempoConservacion: number = 0;
  serieActiva: number = 1;
  prioridad: string = 'media';


  // Plazos de Conservación (Retención)
  plazoGestion: number | null = null;
  plazoCentral: number | null = null;
  plazoIntermedio: string = '';
  plazoHistorico: string = '';
  // Base Legal
  baseLegal: string = '';
  // Disposición y Técnica
  disposicionFinal: string = 'CONSERVACION'; // O 'ELIMINACION'
  tecnicaSeleccion: string = 'COMPLETA'; // O 'PARCIAL', 'N/A'


    observacionesRespuesta: string = '';
    revisadoDigitadoPor: string = '';


    

  parametros: any[] = [
  { valor: '', descripcion: '' } // input inicial con descripción
];



ficha = {
  numeroExpediente: '',
  detalleFisico: '',
  plazoConservacion: '',
  archivoGestion: '',
  archivoCentral: '',
  archivoHistorico: '',
  criterios: {
    criterio1: '',
    criterio2: '',
    criterio3: '',
    criterio4: '',
    criterio5: ''
  }
};



agregarParametro() {
  // Simplemente añade un nuevo objeto al array
  this.parametros.push({ valor: '', descripcion: '' });
}

  eliminarParametro(index: number) {
    // ⛔ REGLA DE NEGOCIO: Solo permite eliminar si el array tiene más de un elemento.
    if (this.parametros.length > 1) {
      this.parametros.splice(index, 1);
    } else {
      // Opcional: Mostrar una notificación al usuario (si tienes ToastrService)
      // this.toastr.warning('Debe existir al menos un Parámetro a Indexar.', 'Atención');
    }
  }

  // ====== Estado y lógica para Parámetros de QR/Barra ======
  activeInfoPanel: 'clasificacion' | 'plazos' | 'parametros' | 'ficha' = 'clasificacion';
  activeParamPanel: 'qr' | 'barra' = 'qr';
  selectedQrItemsQR: Array<{ key: string; label: string; value: any }>= [];
  selectedQrItemsBarra: Array<{ key: string; label: string; value: any }>= [];
  qrUrl: string = '';
  barraUrl: string = '';

  toggleInfoPanel(panel: 'clasificacion'|'plazos'|'parametros'|'ficha') {
    this.activeInfoPanel = panel;
  }

  setActiveParamPanel(panel: 'qr'|'barra') {
    this.activeParamPanel = panel;
  }

  addQrItem(key: string, label: string, value: any) {
    // Dejar de guardar automáticamente en backend.
    // Solo almacenamos la selección en memoria para enviarla al crear la Serie.
    if (this.activeParamPanel === 'qr') {
      if (this.selectedQrItemsQR.find(i => i.key === key)) return;
      this.selectedQrItemsQR.push({ key, label, value });
    } else {
      if (this.selectedQrItemsBarra.find(i => i.key === key)) return;
      this.selectedQrItemsBarra.push({ key, label, value });
    }
  }
  removeItem(key: string, panel: 'qr'|'barra') {
    // Dejar de eliminar automáticamente en backend.
    // Solo actualizamos el estado local.
    if (panel === 'qr') {
      this.selectedQrItemsQR = this.selectedQrItemsQR.filter(i => i.key !== key);
    } else {
      this.selectedQrItemsBarra = this.selectedQrItemsBarra.filter(i => i.key !== key);
    }
  }

  generarQR(modalTpl: any) {
    if (!this.selectedQrItemsQR || this.selectedQrItemsQR.length === 0) {
      this.toast.warning('No hay elementos seleccionados para el QR', 'Atención');
      return;
    }
    const data = {
      id_subseccion: this.idSubseccion ?? null,
      items: this.selectedQrItemsQR.map(i => ({ key: i.key, label: i.label, value: i.value }))
    };
    const enc = encodeURIComponent(JSON.stringify(data));
    this.qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${enc}`;
    this.modalService.open(modalTpl, { size: 'md', centered: true });
  }

  imprimirQRPreview() {
    if (!this.qrUrl) return;
    const w = window.open('', '_blank', 'width=400,height=500');
    if (!w) return;
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>QR Parámetros de Serie</title>
          <style>body{font-family: Arial, sans-serif; text-align:center; margin:20px;} .title{font-weight:600; margin-bottom:10px;}</style>
        </head>
        <body>
          <div class="title">QR Parámetros de Serie</div>
          <img src="${this.qrUrl}" alt="QR" />
          <script>window.onload=function(){ window.print(); setTimeout(()=>window.close(), 300); };</script>
        </body>
      </html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  generarBarra(modalTpl: any) {
    if (!this.selectedQrItemsBarra || this.selectedQrItemsBarra.length === 0) {
      this.toast.warning('No hay elementos seleccionados para la Barra', 'Atención');
      return;
    }
    const data = {
      id_subseccion: this.idSubseccion ?? null,
      items: this.selectedQrItemsBarra.map(i => ({ key: i.key, label: i.label, value: i.value }))
    };
    const enc = encodeURIComponent(JSON.stringify(data));
    this.barraUrl = `https://barcode.tec-it.com/barcode.ashx?data=${enc}&code=Code128&dpi=96`;
    this.modalService.open(modalTpl, { size: 'md', centered: true });
  }

  imprimirBarraPreview() {
    if (!this.barraUrl) return;
    const w = window.open('', '_blank', 'width=500,height=300');
    if (!w) return;
    const html = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Código de Barras - Parámetros de Serie</title>
          <style>body{font-family: Arial, sans-serif; text-align:center; margin:20px;} .title{font-weight:600; margin-bottom:10px;}</style>
        </head>
        <body>
          <div class="title">Código de Barras - Parámetros de Serie</div>
          <img src="${this.barraUrl}" alt="BARCODE" />
          <script>window.onload=function(){ window.print(); setTimeout(()=>window.close(), 300); };</script>
        </body>
      </html>`;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }
  
  constructor(
    public modalService: NgbModal,
    public modal: NgbActiveModal,
    public serieservice: SerieService,
    private router: Router,
    public toast: ToastrService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  console.log('Usuario cargado manualmente:', user);

  // ID del usuario (si existe)
  this.usuario_id = user.id ?? null; 
  console.log('Usuario logeado:', this.usuario_id);

  // ID de la empresa
  if (user && user.id_empresa != null) {
    this.id_empresa = user.id_empresa;
    console.log('ID Empresa del usuario logeado:', this.id_empresa);
  } else {
    console.error('No se pudo obtener el id_empresa del usuario.');
  }

  console.log('ID del proyecto recibido en el modal:', this.idSubseccion);
}


  

guardarSerie() {

  // 1️⃣ Validación básica frontend
  if (!this.nombre || this.nombre.trim() === '') {
    this.toast.error('Debes ingresar un nombre para la Serie', 'Validación');
    return;
  }

  this.isLoading = true;

  // 🔹 Mostrar Swal de “Creando datos…”
  Swal.fire({
    title: 'Creando datos...',
    didOpen: () => {
      Swal.showLoading();
    },
    allowOutsideClick: false,
    allowEscapeKey: false
  });

  const fichaTecnica = {
    numeroExpediente: this.ficha.numeroExpediente || null,
    detalleFisico: this.ficha.detalleFisico || null,
    plazoConservacion: this.ficha.plazoConservacion || null,
    archivoGestion: this.ficha.archivoGestion || null,
    archivoCentral: this.ficha.archivoCentral || null,
    archivoHistorico: this.ficha.archivoHistorico || null,
    criterios: {
      criterio1: this.ficha.criterios.criterio1 || null,
      criterio2: this.ficha.criterios.criterio2 || null,
      criterio3: this.ficha.criterios.criterio3 || null,
      criterio4: this.ficha.criterios.criterio4 || null,
      criterio5: this.ficha.criterios.criterio5 || null
    }
  };

  const nuevaSeriePayload = {
    idSubseccion: this.idSubseccion,
    id_empresa: this.id_empresa,
    nombre: this.nombre,

    descripcion: this.descripcion || null,
    origen: this.origen || null,
    acceso: this.acceso || null,
    tipo_documento: this.tipoDocumento || null,

    plazoGestion: this.plazoGestion,
    plazoCentral: this.plazoCentral,
    plazoIntermedio: this.plazoIntermedio || null,
    plazoHistorico: this.plazoHistorico || null,
    baseLegal: this.baseLegal || null,
    disposicionFinal: this.disposicionFinal,
    tecnicaSeleccion: this.tecnicaSeleccion,

    parametrosIndexados: this.parametros.map(p => p.valor),
    // Enviamos también las descripciones por parámetro
    parametrosDescripcion: this.parametros.map(p => p.descripcion || null),

    // Enviar también las selecciones hechas para QR y Barra
    parametrosQR: this.selectedQrItemsQR.map(i => ({ key: i.key, label: i.label, value: i.value, tipo: 1 })),
    parametrosBarra: this.selectedQrItemsBarra.map(i => ({ key: i.key, label: i.label, value: i.value, tipo: 2 })),

    tiempoConservacion: this.tiempoConservacion,
    serieActiva: this.serieActiva,
    prioridad: this.prioridad,

    observacionesRespuesta: this.observacionesRespuesta || null,
    revisadoDigitadoPor: this.revisadoDigitadoPor || null,

    fichaTecnica
  };

 
  
  this.serieservice.registerSerie(nuevaSeriePayload).subscribe({
    next: (resp: any) => {
      this.toast.success('La Serie se creó correctamente', 'Éxito');

      // 🔹 Emitimos al padre para que recargue listado
      this.SubseccionC.emit(resp);

      // 🔹 Cerramos el modal
      this.cerrar();

      // 🔹 Cerramos el Swal de carga
      Swal.close();
    },
    error: (err) => {
      this.isLoading = false;
      console.error('Error al registrar la Serie:', err);

      Swal.close(); // 🔹 Cerramos el Swal aunque haya error

      // 🔴 VALIDACIÓN LARAVEL (422)
      if (err.status === 422) {
        if (err.error?.message) {
          this.toast.error(err.error.message, 'Validación');
          return;
        }
        if (err.error?.errors?.nombre?.length) {
          this.toast.error(err.error.errors.nombre[0], 'Validación');
          return;
        }
      }

      // 🔴 ERROR GENERAL
      this.toast.error(
        err.error?.message || 'Ocurrió un error en el servidor.',
        'Error'
      );
    },
    complete: () => {
      this.isLoading = false;
    }
  });
}




  cerrar() {
    this.modalService.dismissAll();
  }
}
