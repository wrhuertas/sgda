import { Component, Input, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import * as pdfMake from "pdfmake/build/pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts";
import * as htmlToPdfmake from "html-to-pdfmake";

import { AsignartramiteService } from '../service/asignartramite.service';
import { URL_BACKEND } from 'src/app/config/config';

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
  cabeceraBase64: string | null = null;
  pieBase64: string | null = null;

  constructor(
    public activeModal: NgbActiveModal,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    public AsignartramiteService: AsignartramiteService,
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
    // Para evitar problemas CORS al descargar el logo, usamos el endpoint
    // específico que ya devuelve las imágenes en base64.
    this.AsignartramiteService.cargarempresaidVistaPrevia(idEmpresa).subscribe({
      next: (empresa: any) => {
        console.log('Datos de la empresa cargados (vista previa):', empresa);

        this.empresaData = empresa;

        // Preferir base64 ya incluido en la respuesta para evitar CORS
        this.logoBase64 = empresa.imagen_empresa_base64 ?? null;
        this.cabeceraBase64 = empresa.imagen_cabecera_base64 ?? null;
        this.pieBase64 = empresa.imagen_pie_pagina_base64 ?? null;

        if (this.logoBase64) {
          this.generarPDF();
        } else if (empresa.imagen_empresa) {
          // Fallback: descargar la imagen por URL y convertir a base64
          this.convertirImagenBase64(empresa.imagen_empresa);
        } else {
          this.generarPDF();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar la empresa para vista previa:', err);
        this.generarPDF();
      }
    });
  }

  private convertirImagenBase64(url: string) {
    // Asegurar que la URL sea absoluta; si viene relativa, anteponer el backend
    let finalUrl = String(url || '').trim();
    if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
      const base = String(URL_BACKEND || '').replace(/\/+$/, '');
      finalUrl = `${base}/${finalUrl.replace(/^\/+/, '')}`;
    }

    this.http.get(finalUrl, { responseType: 'blob' }).subscribe({
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
        console.error('❌ Error descargando el logo desde URL:', finalUrl, err);
        this.generarPDF();
      }
    });
  }

  generarPDF() {
    const htmlContent = (htmlToPdfmake as any)(this.data?.cuerpo || '', {
      window: window
    });

    const tipoDocumento = String(this.data?.tipo_documento_nombre || this.data?.tipo_documento || 'DOCUMENTO');
    // Mostrar explícitamente el Nº de Documento (no Nº Trámite ni Referencia)
    const numeroDocumento = String(
      this.data?.num_documento_interno ||
      this.data?.numero_documento ||
      this.data?.numero_tramite ||
      this.data?.referencia || 'S/N'
    );
    const fecha = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
    const nombreEmpresa = String(this.empresaData?.nombre_empresa || '').trim();
    // La ciudad viene de la empresa (igual que el logo y la cabecera)
    const ciudadEmpresa = String(this.empresaData?.ciudad || '').trim();
    const ciudadFecha = ciudadEmpresa ? `${ciudadEmpresa}, ${fecha}` : fecha;

    const pieImg = (this.pieBase64 && this.empresaData?.si_pie_pagina === 1) ? this.pieBase64 : null;
    const cabeceraImg = (this.cabeceraBase64 && this.empresaData?.si_cabecera === 1) ? this.cabeceraBase64 : null;

    // Anexos: se listan agrupados por el documento (oficio / memorándum) al que
    // pertenecen. Si no llegan agrupados, se usa la lista suelta de antes.
    const bloquesAnexos: any[] = [];
    const gruposAnexos = Array.isArray(this.data?.grupos_anexos) ? this.data.grupos_anexos : [];

    if (gruposAnexos.length > 0) {
      gruposAnexos.forEach((grupo: any) => {
        const nombres = Array.isArray(grupo?.nombres) ? grupo.nombres : [];
        if (nombres.length === 0) return;
        bloquesAnexos.push({ text: `\n${grupo?.titulo || 'Anexos'}`, style: 'label', margin: [0, 12, 0, 6] });
        bloquesAnexos.push({ ul: nombres.map((n: any) => String(n)), fontSize: 9 });
      });
    } else if (Array.isArray(this.data?.anexos_nombres) && this.data.anexos_nombres.length > 0) {
      bloquesAnexos.push({ text: '\nAnexos:', style: 'label', margin: [0, 16, 0, 6] });
      bloquesAnexos.push({ ul: this.data.anexos_nombres.map((n: any) => String(n)), fontSize: 9 });
    }

    const docDefinition: any = {
      pageSize: 'A4',
      // dejar margen superior e inferior suficiente para cabecera/pie de página
      // reducir ligeramente los márgenes laterales para permitir una cabecera más ancha
      pageMargins: [20, 100, 20, 100],
      watermark: { text: 'BORRADOR', color: '#e3342f', opacity: 0.08, bold: true, fontSize: 55 },
      content: [
        // Nota: la cabecera se renderiza mediante la propiedad `header` para que
        // se repita en cada página.
        {
          // Mostrar texto de cabecera (si aplica) centrado en toda la anchura
          columns: [
            { width: '*', text: '' },
            { width: 'auto', text: (this.empresaData?.texto_cabecera && this.empresaData?.si_cabecera === 0) ? String(this.empresaData.texto_cabecera || '') : '', alignment: 'center', style: 'empresa', margin: [0, 0, 0, 10] },
            { width: '*', text: '' }
          ]
        },
        // Fila separada: logo centrado en toda la página.
        {
          columns: [
            { width: '*', text: '' },
            this.logoBase64
              ? { width: 'auto', stack: [{ image: this.logoBase64, width: 100, alignment: 'center' }] }
              : { width: 'auto', text: '' },
            { width: '*', text: '' }
          ]
        },
        // Empresa, número de documento y ciudad/fecha alineados a la derecha
        {
          stack: [
            {
              text: nombreEmpresa || '',
              style: 'empresa',
              alignment: 'right',
              margin: [0, 0, 0, 2]
            },
            {
              text: `${tipoDocumento} Nro. ${numeroDocumento}`,
              style: 'docNumber',
              alignment: 'right',
              margin: [0, 0, 0, 2]
            },
            {
              text: ciudadFecha,
              style: 'docDate',
              alignment: 'right'
            }
          ]
        },
        // Spacer para bajar el contenido respecto al encabezado (logo)
        { text: ' ', margin: [0, 10, 0, 0] },

        // Salto de línea adicional de 20 puntos
        { text: ' ', margin: [0, 20, 0, 0] },
        { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 10] },

        {
          stack: [
            {
              columns: [
                { width: 55, text: 'Para:', style: 'label' },
                { width: '*', text: this.formatListaRich(this.data?.para), style: 'value' }
              ],
              columnGap: 8
            },
            {
              columns: [
                { width: 55, text: 'De:', style: 'label' },
                { width: '*', text: this.formatListaRich(this.data?.de), style: 'value' }
              ],
              columnGap: 8,
              margin: [0, 4, 0, 0]
            },
            ...(Array.isArray(this.data?.copia) && this.data.copia.length > 0 ? [
              {
                columns: [
                  { width: 55, text: 'Copia:', style: 'label' },
                  { width: '*', text: this.formatListaRich(this.data?.copia), style: 'value' }
                ],
                columnGap: 8,
                margin: [0, 4, 0, 0]
              }
            ] : []),
            // Espacio en blanco antes de Asunto
            { text: '\n' },
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

        // Agrupar "Atentamente" y la firma en una celda de tabla con dontBreakRows
        // para evitar que se dividan entre páginas.
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: '\n\nAtentamente,\n\n', margin: [0, 100, 0, 0] },
                    {
                      stack: [
                        { text: this.formatLista(this.data?.de), bold: true, margin: [0, 40, 0, 0] },
                        { text: nombreEmpresa, fontSize: 9, color: '#666', margin: [0, 12, 0, 0] }
                      ],
                      alignment: 'left'
                    }
                  ]
                }
              ]
            ],
            dontBreakRows: true
          },
          layout: 'noBorders'
        },

        // Listado de anexos (después de "Atentamente"), agrupados por el
        // documento al que pertenece cada uno.
        ...bloquesAnexos,
        // (Pie de página renderizado en footer)
      ],
      // Footer: si existe una imagen de pie, mostrarla; si no, información textual
      footer: () => {
        if (pieImg) {
          return {
            columns: [
              { width: '*', text: '' },
              { image: pieImg, width: 515, height: 60, alignment: 'center' },
              { width: '*', text: '' }
            ],
            margin: [0, 0, 0, 0]
          };
        }

        const direccion = String(this.empresaData?.direccion_empresa || this.empresaData?.direccion || '').trim();
        const telefono = String(this.empresaData?.telefono_empresa || this.empresaData?.telefono || '').trim();
        const textoPie = String(this.empresaData?.texto_pie_pagina || this.empresaData?.texto_pie || '').trim();

        const parts = [direccion, telefono, textoPie].filter(p => !!p);
        if (parts.length === 0) {
          return null; // sin footer si no hay datos
        }

        return {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              stack: parts.map(p => ({ text: p, fontSize: 9, color: '#444', alignment: 'center' }))
            },
            { width: '*', text: '' }
          ],
          margin: [0, 40, 0, 0]
        };
      },
      // Header: imagen de cabecera centrada en la parte superior de cada página
      header: cabeceraImg
        ? () => ({
            columns: [
              { width: '*', text: '' },
              { image: cabeceraImg, width: 555, height: 80, alignment: 'center' },
              { width: '*', text: '' }
            ],
            margin: [0, 0, 0, 0]
          })
        : undefined,
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
        // Pedir al visor que abra al 70% (depende del navegador)
        const urlWithZoom = url + '#zoom=70';
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(urlWithZoom);
        this.cdr.detectChanges();
      });
    } catch (err) {
      console.error("Error en PDF:", err);
    }
  }

  // 'N/A' y 'Sin Proyecto' son rellenos del backend: para el PDF son vacío
  private limpiar(valor: any): string {
    const texto = String(valor ?? '').trim();
    if (!texto) return '';
    const comparable = texto.toUpperCase();
    return (comparable === 'N/A' || comparable === 'SIN PROYECTO') ? '' : texto;
  }

  // Descompone un usuario en su nombre y la línea de título / puesto / sección
  private partesUsuario(u: any): { main: string; extras: string } {
    const sigla = String(u?.sigla || u?.sigla_usuario || '').trim();
    const nombre = String(u?.nombre_completo || `${u?.nombre || ''} ${u?.apellido || ''}`.trim() || u?.full_name || u?.nombre || u?.name || '').trim();
    const titulo = this.limpiar(u?.titulo) || this.limpiar(u?.titulo_usuario);
    const puesto = this.limpiar(u?.puesto) || this.limpiar(u?.area) || this.limpiar(u?.proyecto) || this.limpiar(u?.seccion) || this.limpiar(u?.subseccion);
    const seccionCruda = this.limpiar(u?.seccion) || this.limpiar(u?.subseccion);
    const seccion = seccionCruda === puesto ? '' : seccionCruda;

    if (!nombre) return { main: '', extras: '' };

    const main = [sigla, nombre].filter(x => !!x).join(' ').trim();

    const partes: string[] = [];
    if (titulo) partes.push(titulo);
    const puestoSeccion = [puesto, seccion].filter(x => !!x).join(' / ');
    if (puestoSeccion) partes.push(puestoSeccion);

    return { main, extras: partes.join(' — ') };
  }

  // Versión para pdfMake: el título y la sección/subsección van en negrilla
  formatListaRich(usuarios: any[]): any {
    if (!usuarios || usuarios.length === 0) return 'No asignado';

    const runs: any[] = [];
    usuarios.forEach(u => {
      const { main, extras } = this.partesUsuario(u);
      if (!main) return;

      // Separar cada usuario con una línea en blanco
      if (runs.length > 0) runs.push({ text: '\n\n' });

      runs.push({ text: main });
      if (extras) runs.push({ text: `\n${extras}`, bold: true });
    });

    return runs.length > 0 ? runs : 'No asignado';
  }

  formatLista(usuarios: any[]) {
    if (!usuarios || usuarios.length === 0) return 'No asignado';
    return usuarios
      .map(u => {
        const { main, extras } = this.partesUsuario(u);
        if (!main) return '';
        // Poner título y puesto/sección en la línea siguiente
        return extras ? `${main}\n${extras}` : main;
      })
      .filter(v => !!v)
      // Separar usuarios con una línea en blanco para mejorar legibilidad
      .join('\n\n') || 'No asignado';
  }

  private fijarDeUsuarioLogeado(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const id = user?.id ?? null;
    if (!id) return;

    // Si ya vienen destinatarios en `this.data.de`, respetarlos (no sobrescribir).
    // Queremos mostrar exactamente lo que envía el componente padre.
    if (Array.isArray(this.data?.de) && this.data.de.length > 0) {
      return;
    }

    const nombre = String(
      user?.nombre_completo ||
        user?.full_name ||
        `${user?.name ?? ''} ${user?.surname ?? ''}`.trim() ||
        `${user?.nombre ?? ''} ${user?.apellido ?? ''}`.trim() ||
        `${user?.nombres ?? ''} ${user?.apellidos ?? ''}`.trim()
    ).trim() || 'Usuario';

    const titulo = String(user?.titulo || user?.title || user?.cargo || '').trim();
    const subseccion = String(
      user?.subseccion || user?.subseccion_nombre || user?.area_nombre || user?.nombre_area || user?.departamento || user?.seccion || ''
    ).trim() || '';

    // Construir entrada mínima similar a la que envía el componente padre
    const entry: any = {
      id,
      nombre_completo: nombre,
      titulo: titulo || null,
      puesto: subseccion || null,
      rol_envio: 'DE',
      lockedRole: true,
      tiene_firma: !!user?.archivo_firma,
      sigla: String(user?.sigla || user?.sigla_usuario || '').trim()
    };

    this.data.de = [entry];
  }
}
