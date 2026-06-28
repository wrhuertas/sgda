import { ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { AuthService } from '../../auth';
import { SubserieService } from '../service/subserie.service';

@Component({
  selector: 'app-create-subserie',
  templateUrl: './create-subserie.component.html',
  styleUrls: ['./create-subserie.component.scss']
})
export class CreateSubserieComponent {

    @Input() idSerie!: number;
    @Input() nombreSerie!: string;    
    @Output() SubseccionC = new EventEmitter<any>();
    
    user$: Observable<any>;
  
    nombre: string = '';
    isLoading: boolean = false;
    usuario_id!: number;
    id_empresa!: number;
    descripcion: string = '';
    origen: string = '';
    acceso: string = '';
    tipoDocumento: string = '';


activeTab: number = 1;


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



descripcionLegal: string = '';
  // Disposición y Técnica



    

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
  this.parametros.push({ valor: '', descripcion: '' });
}

eliminarParametro(index: number) {
  this.parametros.splice(index, 1);
}

// ====== Estado y lógica para Parámetros de QR (similar a EditSubserie) ======
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



generarQR(modalTpl: any) {
  if (!this.selectedQrItemsQR || this.selectedQrItemsQR.length === 0) {
    this.toast.warning('No hay elementos seleccionados para el QR', 'Atención');
    return;
  }
  const data = {
    id_serie: this.idSerie ?? null,
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
    id_serie: this.idSerie ?? null,
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
      public subSubserieService: SubserieService,
      private router: Router,
      public toast: ToastrService,
      private auth: AuthService,
        private cdr: ChangeDetectorRef,
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
  
    console.log('ID del proyecto recibido en el modal:', this.idSerie);
  }
  
   addQrItem(key: string, label: string, value: any) {
  // Dejar de guardar automáticamente en backend; solo estado local.
  if (this.activeParamPanel === 'qr') {
    if (this.selectedQrItemsQR.find(i => i.key === key)) return;
    this.selectedQrItemsQR.push({ key, label, value });
  } else {
    if (this.selectedQrItemsBarra.find(i => i.key === key)) return;
    this.selectedQrItemsBarra.push({ key, label, value });
  }
}
 removeItem(key: string, panel: 'qr'|'barra') {
  // Dejar de eliminar automáticamente en backend; solo estado local.
  if (panel === 'qr') {
    this.selectedQrItemsQR = this.selectedQrItemsQR.filter(i => i.key !== key);
  } else {
    this.selectedQrItemsBarra = this.selectedQrItemsBarra.filter(i => i.key !== key);
  }
}
    
  
guardarSubSerie() {
  if (!this.nombre || this.nombre.trim() === '') {
    this.toast.error('Debes ingresar un nombre para la Sub Serie');
    return;
  }

  if (!this.idSerie) {
    this.toast.error('No se encontró el Serie padre seleccionado');
    return;
  }

  if (!this.id_empresa) {
    this.toast.error('No se pudo obtener la empresa del usuario');
    return;
  }

  this.isLoading = true;

  // Creamos el objeto completo con toda la info
  const nuevaSubSerie = {
    idPadre: this.idSerie,          // <-- ID del padre
    id_empresa: this.id_empresa,
    nombre: this.nombre,
    descripcion: this.descripcion || null,
    origen: this.origen || null,
    acceso: this.acceso || null,
    tipo_documento: this.tipoDocumento || null,

    // 📄 Tabla de Plazos
    plazos: {
      gestion: this.plazoGestion || null,
      central: this.plazoCentral || null,
      intermedio: this.plazoIntermedio || null,
      historico: this.plazoHistorico || null,
      baseLegal: this.baseLegal || null,
      disposicionFinal: this.disposicionFinal || null,
      tecnicaSeleccion: this.tecnicaSeleccion || null
    },

    // ⚙️ Parámetros a Indexar
    parametros: this.parametros.map(p => p.valor), // solo enviamos los valores
    parametrosDescripcion: this.parametros.map(p => p.descripcion || null),

    // ✅ Enviar también las selecciones hechas para QR y Barra
    parametrosQR: this.selectedQrItemsQR.map(i => ({ key: i.key, label: i.label, value: i.value, tipo: 1 })),
    parametrosBarra: this.selectedQrItemsBarra.map(i => ({ key: i.key, label: i.label, value: i.value, tipo: 2 })),

    // 📝 Ficha Técnica
    fichaTecnica: {
      numeroExpediente: this.ficha.numeroExpediente || null,
      detalleFisico: this.ficha.detalleFisico || null,
      plazoConservacion: this.ficha.plazoConservacion || null,
      archivoGestion: this.ficha.archivoGestion || null,
      archivoCentral: this.ficha.archivoCentral || null,
      archivoHistorico: this.ficha.archivoHistorico || null,
      criterios: this.ficha.criterios
    }
  };

  this.subSubserieService.guardarSubSerie(nuevaSubSerie).subscribe(
    (resp: any) => {
      this.isLoading = false;
  
      if (!resp.success) {
        this.toast.warning(resp.message, 'Validación');
        return;
      }
  
      this.toast.success(resp.message, 'Éxito');
      this.SubseccionC.emit(resp.data);
      this.cerrar();
    },
    (err) => {
      this.isLoading = false;
  
      // 🔴 ERROR DE VALIDACIÓN (422)
      if (err.status === 422) {
        this.toast.warning(
          err.error?.message || 'La Sub Serie ya existe',
          'Validación'
        );
        return;
      }
  
      // 🔴 ERROR GENERAL
      this.toast.error(
        err.error?.message || 'Ocurrió un error al guardar la Sub Serie',
        'Error'
      );
    }
  );
  
}







  
    cerrar() {
      this.modalService.dismissAll();
    }
}
