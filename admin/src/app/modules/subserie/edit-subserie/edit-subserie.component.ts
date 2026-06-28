import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../auth';
import Swal from 'sweetalert2';
import { SubserieService } from '../service/subserie.service';
import { EtiquetaComponent } from '../etiqueta/etiqueta.component';

@Component({
  selector: 'app-edit-subserie',
  templateUrl: './edit-subserie.component.html',
  styleUrls: ['./edit-subserie.component.scss']
})
export class EditSubserieComponent {


  @Input() SERIE_SELECTED: any;
  @Input() nombreSubseccion!: string;    
  @Output() serieActualizada = new EventEmitter<any>(); // 👈 ESTO FALTABA


  activeTab = 1;
isLoading = false;

// Datos principales
nombre: string = '';
descripcion: string = '';
origen: any = '';
acceso: any = '';
tipoDocumento: string = '';
idSubseccion: number | null = null;

// Plazos
plazoGestion: number | null = null;
plazoCentral: number | null = null;
plazoIntermedio: any = null;
plazoHistorico: any = null;

// Tabla plazos
baseLegal: string = '';
disposicionFinal: string = '';
tecnicaSeleccion: string = '';

// Parámetros
parametros: any[] = [];

// Ficha técnica
ficha = {
  numeroExpediente: null,
  detalleFisico: null,
  plazoConservacion: null,
  archivoGestion: null,
  archivoCentral: null,
  archivoHistorico: null,
  criterios: {
    criterio1: null,
    criterio2: null,
    criterio3: null,
    criterio4: null,
    criterio5: null,
  }
};


  // ✅ NUEVOS PARÁMETROS
  tiempoConservacion: number = 0;
  serieActiva: number = 1;
  prioridad: string = 'media';

  
  observacionesRespuesta: string = '';
  revisadoDigitadoPor: string = '';
  estado: string;

  // UI: acordeón de Información (solo uno abierto a la vez)
  activeInfoPanel: 'clasificacion' | 'plazos' | 'parametros' | 'ficha' = 'clasificacion';

  // Selecciones para la columna "Parámetros"
  selectedQrItemsQR: Array<{ key: string; label: string; value: any }>= [];
  selectedQrItemsBarra: Array<{ key: string; label: string; value: any }>= [];
  // QR preview
  qrUrl: string = '';
  // Barra preview
  barraUrl: string = '';
  // Panel activo en columna Parámetros: 'qr' | 'barra'
  activeParamPanel: 'qr' | 'barra' = 'qr';
usuario_id!: number;
  id_empresa!: number;

  constructor(
    public modalService: NgbModal,
    public modal: NgbActiveModal,
    public subserieservice: SubserieService,
    private router: Router,
    public toast: ToastrService,
    private auth: AuthService
  ) {}


  
  ngOnInit(): void {
    if (!this.SERIE_SELECTED) return;
  
    console.log('📦 Serie seleccionada:', this.SERIE_SELECTED);
  
    // Campos simples
    this.nombre = this.SERIE_SELECTED.nombre ?? '';
    this.descripcion = this.SERIE_SELECTED.descripcion ?? '';
    this.origen = this.SERIE_SELECTED.origen ?? '';
    this.acceso = this.SERIE_SELECTED.acceso ?? '';
    this.tipoDocumento = this.SERIE_SELECTED.tipo_documento ?? '';
    this.idSubseccion = this.SERIE_SELECTED.id_subseccion;
  
    this.plazoGestion = this.SERIE_SELECTED.plazo_gestion ?? null;
    this.plazoCentral = this.SERIE_SELECTED.plazo_central ?? null;
    this.plazoIntermedio = this.SERIE_SELECTED.plazo_intermedio ?? null;
    this.plazoHistorico = this.SERIE_SELECTED.plazo_historico ?? null;
  
    this.baseLegal = this.SERIE_SELECTED.base_legal ?? '';
    this.disposicionFinal = this.SERIE_SELECTED.disposicion_final ?? '';
    this.tecnicaSeleccion = this.SERIE_SELECTED.tecnica_seleccion ?? '';
  
    // Parámetros indexados
    try {
      const parsed = JSON.parse(this.SERIE_SELECTED.parametros_indexados ?? '[]');
      // Inicializa con soporte de descripción; si no existe en backend, queda en blanco
      this.parametros = Array.isArray(parsed) ? parsed.map((p: any) => ({ valor: p ?? '', descripcion: '' })) : [{ valor: '', descripcion: '' }];
    } catch {
      this.parametros = [{ valor: '', descripcion: '' }];
    }
  
    // Ficha técnica
    this.ficha = {
      numeroExpediente: this.SERIE_SELECTED.numero_expediente ?? '',
      detalleFisico: this.SERIE_SELECTED.detalle_fisico ?? '',
      plazoConservacion: this.SERIE_SELECTED.plazo_conservacion ?? null,
      archivoGestion: this.SERIE_SELECTED.archivo_gestion ?? '',
      archivoCentral: this.SERIE_SELECTED.archivo_central ?? '',
      archivoHistorico: this.SERIE_SELECTED.archivo_historico ?? '',
      criterios: this.SERIE_SELECTED.criterios ?? {}
    };
  
    // Estado
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.estado = String(this.SERIE_SELECTED.estado ?? 0);
    this.usuario_id = user?.id ?? null;
  this.id_empresa = user?.id_empresa ?? null;

  this.datosParametro();
  }
  


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

// ====== QR: selección de elementos desde la columna Información ======
toggleInfoPanel(panel: 'clasificacion'|'plazos'|'parametros'|'ficha') {
  this.activeInfoPanel = panel;
}

addQrItem(key: string, label: string, value: any) {
  if (this.activeParamPanel === 'qr') {
    if (this.selectedQrItemsQR.find(i => i.key === key)) return;
    this.selectedQrItemsQR.push({ key, label, value });
  } else {
    if (this.selectedQrItemsBarra.find(i => i.key === key)) return;
    this.selectedQrItemsBarra.push({ key, label, value });
  }
}
removeItem(key: string, panel: 'qr'|'barra') {
  if (panel === 'qr') {
    this.selectedQrItemsQR = this.selectedQrItemsQR.filter(i => i.key !== key);
  } else {
    this.selectedQrItemsBarra = this.selectedQrItemsBarra.filter(i => i.key !== key);
  }
}


datosParametro() {
  const payload = {
    id_serie: this.SERIE_SELECTED?.id_serie ?? null,
    id_empresa: this.id_empresa
  };

  this.subserieservice.obtenerDatosParametro(payload).subscribe({
    next: (res: any) => {
      if (res.status === 'success') {
        // Asignamos la respuesta limpia del backend a los arreglos que usa el HTML
        this.selectedQrItemsQR = res.qr || [];
        this.selectedQrItemsBarra = res.barra || [];
        
        this.toast.success('Datos de parámetros cargados correctamente.');
      }
    },
    error: () => {
      this.toast.error('Hubo un error al obtener los datos de los parámetros.');
    }
  });
}

setActiveParamPanel(panel: 'qr'|'barra') {
  this.activeParamPanel = panel;
}

// Generar y mostrar QR en modal
generarQR(modalTpl: any) {
  if (!this.selectedQrItemsQR || this.selectedQrItemsQR.length === 0) {
    Swal.fire('Atención', 'No hay elementos seleccionados para el QR', 'warning');
    return;
  }

  const data = {
    id_subseccion: this.SERIE_SELECTED?.id_subseccion ?? null,
    id_serie: this.SERIE_SELECTED?.id_serie ?? null,
    items: this.selectedQrItemsQR.map(i => ({ key: i.key, label: i.label, value: i.value }))
  };

  const enc = encodeURIComponent(JSON.stringify(data));
  // Servicio público de QR (mismo usado en otro componente)
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

// Generar y mostrar Código de Barras en modal
generarBarra(modalTpl: any) {
  if (!this.selectedQrItemsBarra || this.selectedQrItemsBarra.length === 0) {
    Swal.fire('Atención', 'No hay elementos seleccionados para la Barra', 'warning');
    return;
  }

  const data = {
    id_subseccion: this.SERIE_SELECTED?.id_subseccion ?? null,
    id_serie: this.SERIE_SELECTED?.id_serie ?? null,
    items: this.selectedQrItemsBarra.map(i => ({ key: i.key, label: i.label, value: i.value }))
  };

  const enc = encodeURIComponent(JSON.stringify(data));
  // Servicio público TEC-IT para Code128
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

actualizarSerie() {

  if (!this.nombre || this.nombre.trim() === '') {
    this.toast.error('Debes ingresar un nombre para la Serie', 'Validación');
    return;
  }

  this.isLoading = true;

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

  const payload = {
    idSubseccion: this.SERIE_SELECTED.id_subseccion,
    id_empresa: this.SERIE_SELECTED.id_empresa,

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
    parametrosDescripcion: this.parametros.map(p => p.descripcion || null),
    // Enviar selecciones locales de QR/Barra en la actualización
    parametrosQR: this.selectedQrItemsQR.map(i => ({ key: i.key, label: i.label, value: i.value, tipo: 1 })),
    parametrosBarra: this.selectedQrItemsBarra.map(i => ({ key: i.key, label: i.label, value: i.value, tipo: 2 })),

    tiempoConservacion: this.tiempoConservacion,
    serieActiva: this.serieActiva,
    prioridad: this.prioridad,

    estado: this.estado,
    observacionesRespuesta: this.observacionesRespuesta || null,
    revisadoDigitadoPor: this.revisadoDigitadoPor || null,

    fichaTecnica
  };

  
   // 🔹 Mostramos Swal de “Actualizando datos…”
   Swal.fire({
    title: 'Actualizando datos...',
    didOpen: () => {
      Swal.showLoading();
    },
    allowOutsideClick: false,
    allowEscapeKey: false
  });

  this.subserieservice
    .updateSubSerie(this.SERIE_SELECTED.id_serie, payload)
    .subscribe({
      next: (res) => {
        // Cerramos Swal de carga
        Swal.close();

        // 🔹 Mostramos mensaje de éxito
        this.toast.success('La Serie se actualizó correctamente', 'Éxito');

        // 🔹 Emitimos al padre para refrescar listado
        this.serieActualizada.emit();

        // 🔹 Cerramos el modal
        this.cerrar();
      },
      error: (err) => {
        // Cerramos Swal de carga
        Swal.close();

        this.isLoading = false;
        console.error('Error al actualizar la Serie:', err);
        this.toast.error(err.error?.message || 'Ocurrió un error', 'Error');
      },
      complete: () => {
        this.isLoading = false;
      }
    });

}


verEtiqueta(tipo: 'etiqueta1' | 'etiqueta2' | 'etiqueta3') {
  console.log('Visualizando:', tipo);

  const modalRef = this.modalService.open(EtiquetaComponent, {
    size: 'md',
    backdrop: 'static',
    keyboard: false,
    centered: true
  });

  // Enviamos SOLO el tipo y el ID de la serie
  modalRef.componentInstance.tipo = tipo;
  modalRef.componentInstance.id_serie = this.SERIE_SELECTED?.id_serie ?? null;
}
cerrar() {
  this.modalService.dismissAll();
}

}

// ====== Métodos de UI debajo para mantener el archivo ordenado ======
export interface QrItem { key: string; label: string; value: any }
