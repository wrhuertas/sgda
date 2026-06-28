import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import * as htmlToPdfmake from "html-to-pdfmake";
import Swal from 'sweetalert2';
import { HistorialtramiteService as RecepcionService } from '../service/historialtramite.service';

(pdfMake as any).vfs = (pdfFonts as any).pdfMake ? (pdfFonts as any).pdfMake.vfs : (pdfFonts as any).vfs;



@Component({
  selector: 'app-vista-previa',
  templateUrl: './vista-previa.component.html'
})
export class VistaPreviaComponent implements OnInit {
  @Input() data: any; 
  pdfUrl: SafeResourceUrl | null = null;
  usuario_id!: number;
  id_empresa!: number;
  empresaData: any = null;
  logoBase64: string | null = null;

  constructor(
    public activeModal: NgbActiveModal, 
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    public recepcionService: RecepcionService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.usuario_id = user.id ?? null; 

    if (this.data && typeof this.data === 'object') {
      this.data.para = this.data.para ?? [];
      this.data.de = this.data.de ?? [];
      this.data.copia = this.data.copia ?? [];
      this.data.asunto = this.data.asunto ?? '';
      this.data.cuerpo = this.data.cuerpo ?? '';
    } else {
      this.data = { para: [], de: [], copia: [], asunto: '', cuerpo: '' };
    }

    this.fijarDeUsuarioLogeado();

    if (user && user.id_empresa) {
      this.id_empresa = user.id_empresa;
      this.cargarEmpresa(this.id_empresa);
    } else {
      this.generarPDF();
    }
  }

  cargarEmpresa(idEmpresa: number) {
    this.recepcionService.cargarempresaid(idEmpresa).subscribe({
      next: (empresa: any) => {
        this.empresaData = empresa;
        
        if (empresa.imagen_empresa) {
          this.convertirImagenBase64(empresa.imagen_empresa);
        } else {
          this.generarPDF();
        }
        this.cdr.detectChanges();
      },
      error: () => this.generarPDF()
    });
  }

  private convertirImagenBase64(url: string) {
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          this.logoBase64 = reader.result as string;
          
          setTimeout(() => {
            this.generarPDF();
          }, 0);
        };
        reader.readAsDataURL(blob);
      },
      error: (err) => {
        console.error('❌ Error descargando el logo:', err);
        this.generarPDF();
      }
    });
  }

  generarPDF() {
    const htmlContent = (htmlToPdfmake as any)(this.data?.cuerpo || '', {
      window: window 
    });

    const tipoDocumento = String(this.data?.tipo_documento_nombre || this.data?.tipo_documento || 'DOCUMENTO');
    const numeroTramite = String(this.data?.numero_tramite || this.data?.referencia || 'S/N');
    const fecha = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    const nombreEmpresa = String(this.empresaData?.nombre_empresa || '').trim();
  
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 60],
      watermark: { text: 'BORRADOR', color: '#e3342f', opacity: 0.08, bold: true, fontSize: 55 },
      content: [
        {
          columns: [
            {
              width: 80,
              stack: [
                this.logoBase64 ? { image: this.logoBase64, width: 70 } : { text: '' },
              ]
            },
            {
              width: '*',
              stack: [
                nombreEmpresa ? { text: nombreEmpresa, style: 'empresa' } : { text: '' },
              ],
              margin: [0, 6, 0, 0]
            },
            {
              width: 170,
              stack: [
                { text: `${tipoDocumento} Nro. ${numeroTramite}`, style: 'docNumber', alignment: 'right' },
                { text: fecha, style: 'docDate', alignment: 'right', margin: [0, 2, 0, 0] },
              ],
              margin: [0, 4, 0, 0]
            }
          ]
        },
        { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 6, 0, 10] },

        {
          stack: [
            {
              columns: [
                { width: 55, text: 'Para:', style: 'label' },
                { width: '*', text: this.formatLista(this.data?.para), style: 'value' }
              ],
              columnGap: 8
            },
            {
              columns: [
                { width: 55, text: 'De:', style: 'label' },
                { width: '*', text: this.formatLista(this.data?.de), style: 'value' }
              ],
              columnGap: 8,
              margin: [0, 4, 0, 0]
            },
            {
              columns: [
                { width: 55, text: 'Copia:', style: 'label' },
                { width: '*', text: this.formatLista(this.data?.copia), style: 'value' }
              ],
              columnGap: 8,
              margin: [0, 4, 0, 0]
            },
            {
              columns: [
                { width: 55, text: 'Asunto:', style: 'label' },
                { width: '*', text: String(this.data?.asunto || 'Sin Asunto'), style: 'value' }
              ],
              columnGap: 8,
              margin: [0, 4, 0, 0]
            }
          ]
        },

        { text: '\n' },

        htmlContent,

        { text: '\n\nAtentamente,\n\n', margin: [0, 30, 0, 0] },
        { 
          stack: [
            { text: 'Firmado electrónicamente', italics: true, color: '#004a99', fontSize: 9 },
            { text: this.formatLista(this.data?.de), bold: true, margin: [0, 5, 0, 0] },
            { text: nombreEmpresa, fontSize: 9, color: '#666' }
          ],
          alignment: 'left'
        }
      ],
      styles: {
        empresa: { fontSize: 13, bold: true, color: '#111827' },
        docNumber: { fontSize: 10.5, bold: true, color: '#111827' },
        docDate: { fontSize: 9.5, color: '#374151' },
        label: { fontSize: 10, bold: true, color: '#111827' },
        value: { fontSize: 10, color: '#111827' }
      }
    };
  
    try {
      const pMake: any = pdfMake;
      const pdfDoc = pMake.createPdf(docDefinition);
      
      pdfDoc.getBuffer((buffer: any) => {
        const win = (window as any);
        const blob = new win['Blob']([buffer], { type: 'application/pdf' });
        const url = win['URL']['createObjectURL'](blob);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        this.cdr.detectChanges(); 
      });
    } catch (err) {
      console.error("Error en PDF:", err);
    }
  }

  formatLista(usuarios: any[]) {
    if (!usuarios || usuarios.length === 0) return 'No asignado';
    return usuarios
      .map(u => String(u?.nombre_completo || u?.full_name || u?.nombre || u?.name || '').trim())
      .filter(v => !!v)
      .join(', ') || 'No asignado';
  }

  private fijarDeUsuarioLogeado(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const id = user?.id ?? null;
    if (!id) return;

    const nombre = String(
      user?.nombre_completo ||
        user?.full_name ||
        `${user?.name ?? ''} ${user?.surname ?? ''}`.trim() ||
        `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim() ||
        `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`.trim()
    ).trim() || 'Usuario';

    this.data.de = [
      {
        id,
        nombre_completo: nombre,
        rol_envio: 'DE',
        lockedRole: true,
        tiene_firma: !!user?.archivo_firma,
      }
    ];
  }
}
