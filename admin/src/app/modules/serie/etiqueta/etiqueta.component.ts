import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { SerieService } from '../service/serie.service';
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


  // Variables para almacenar la respuesta del servidor
  serie: any = null;
  seccion: any = null;
  empresa: any = null;
  usuario: any = null;
  baseUrl = URL_BACKEND;

  qrImagenUrl: string = '';
  barraImagenUrl: string = '';

  constructor(
    public activeModal: NgbActiveModal,
    public serieservice: SerieService,
    public toast: ToastrService
  ) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.id_empresa = user?.id_empresa ?? null;
    // 🔹 1. Extraemos el id del usuario (usa 'id_user' o 'id' según cómo esté guardado en tu sistema)
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

    this.serieservice.obtenerDatosParametro(payload).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.selectedQrItemsQR = res.qr || [];
          this.selectedQrItemsBarra = res.barra || [];
          this.generarGraficosCodigos();
        }
      },
      error: () => {
        this.toast.error('Hubo un error al obtener los datos de los parámetros.');
      }
    });
  }


  // 🔹 NUEVA FUNCIÓN: Traer datos globales
traerDatosGlobales() {
    const payload = {
      id_serie: this.id_serie,
      id_empresa: this.id_empresa,
      id_user: this.id_user
    };

    this.serieservice.obtenerDatosGlobales(payload).subscribe({
      next: (res: any) => {
        if (res.status === 'success' && res.data) {
          // Asignamos cada nodo del JSON a su respectiva variable declarada arriba
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
    if (this.selectedQrItemsQR && this.selectedQrItemsQR.length > 0) {
      const dataQR = {
        id_serie: this.id_serie ?? null,
        items: this.selectedQrItemsQR.map(i => ({ key: i.key, label: i.label, value: i.value }))
      };
      const enc = encodeURIComponent(JSON.stringify(dataQR));
      this.qrImagenUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${enc}`;
    } else {
      this.qrImagenUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=SERIE-${this.id_serie}`;
    }

    if (this.selectedQrItemsBarra && this.selectedQrItemsBarra.length > 0) {
      const textoBarra = this.selectedQrItemsBarra.map(item => item.value ?? '').join('-');
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
