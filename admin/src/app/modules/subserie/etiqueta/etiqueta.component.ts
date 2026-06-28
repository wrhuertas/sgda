import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { SubserieService } from '../service/subserie.service';
import { SerieService } from '../../serie/service/serie.service';
import { URL_BACKEND } from 'src/app/config/config';

@Component({
  selector: 'app-etiqueta',
  templateUrl: './etiqueta.component.html',
  styleUrls: ['./etiqueta.component.scss']
})
export class EtiquetaComponent implements OnInit {
  @Input() tipo!: 'etiqueta1' | 'etiqueta2' | 'etiqueta3';
  @Input() id_serie!: number | null;

  selectedQrItemsQR: any[] = [];
  selectedQrItemsBarra: any[] = [];
  id_empresa!: number | null;
  id_user: any;

  // Datos globales
  serie: any = null;
  seccion: any = null;
  empresa: any = null;
  usuario: any = null;

  baseUrl = URL_BACKEND;

  qrImagenUrl: string = '';
  barraImagenUrl: string = '';

  constructor(
    public activeModal: NgbActiveModal,
    public subserieservice: SubserieService,
    public serieservice: SerieService,
    public toast: ToastrService
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.id_empresa = user?.id_empresa ?? null;
    this.id_user = user?.id_user ?? user?.id ?? null;

    if (this.id_serie) {
      this.datosParametro();
      this.traerDatosGlobales();
    }
  }

  datosParametro() {
    const payload = {
      id_serie: this.id_serie,
      id_empresa: this.id_empresa
    };

    this.subserieservice.obtenerDatosParametro(payload).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.selectedQrItemsQR = res.qr || [];
          this.selectedQrItemsBarra = res.barra || [];
          
          // Generamos ambos gráficos al mismo tiempo con la data recibida
          this.generarGraficosCodigos();
        }
      },
      error: () => {
        this.toast.error('Hubo un error al obtener los datos de los parámetros.');
      }
    });
  }

  // Datos globales (empresa, serie, seccion, usuario) igual que Serie
  traerDatosGlobales() {
    const payload = {
      id_serie: this.id_serie,
      id_empresa: this.id_empresa,
      id_user: this.id_user
    };

    this.serieservice.obtenerDatosGlobales(payload).subscribe({
      next: (res: any) => {
        if (res.status === 'success' && res.data) {
          this.serie = res.data.serie;
          this.seccion = res.data.seccion;
          this.empresa = res.data.empresa;
          this.usuario = res.data.usuario;
        }
      },
      error: () => {
        this.toast.error('Hubo un error al obtener los datos globales.');
      }
    });
  }

 generarGraficosCodigos() {
  // 1. Generar el QR usando la misma estructura JSON que tu ejemplo funcional
  if (this.selectedQrItemsQR && this.selectedQrItemsQR.length > 0) {
    const dataQR = {
      id_serie: this.id_serie ?? null,
      items: this.selectedQrItemsQR.map(i => ({ 
        key: i.key, 
        label: i.label, 
        value: i.value 
      }))
    };

    // Parseamos a JSON y codificamos para la URL del API de qrserver
    const enc = encodeURIComponent(JSON.stringify(dataQR));
    this.qrImagenUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${enc}`;
  } else {
    // Fallback plano por si la petición no trae parámetros de QR aún
    this.qrImagenUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=SERIE-${this.id_serie}`;
  }

  // 2. Generar el Código de Barras (Mantiene la estructura Code128 de bwip-js)
  if (this.selectedQrItemsBarra && this.selectedQrItemsBarra.length > 0) {
    const textoBarra = this.selectedQrItemsBarra
      .map(item => item.value ?? '')
      .join('-');

    const textoLimpio = textoBarra.replace(/[^a-zA-Z0-9-]/g, "");
    this.barraImagenUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(textoLimpio || 'SERIE-'+this.id_serie)}&scale=2&height=12&textxalign=center`;
  } else {
    this.barraImagenUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=SERIE-${this.id_serie}&scale=2&height=12&textxalign=center`;
  }
  }

  imprimir() {
    window.print();
  }

  // Construye URL segura sin dobles slashes
  buildUrl(path: string | null | undefined): string {
    const base = (this.baseUrl || '').replace(/\/+$/, '');
    const p = (path || '').replace(/^\/+/, '');
    return `${base}/${p}`;
  }
}
