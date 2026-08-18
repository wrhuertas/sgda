import { Injectable } from '@angular/core';
import htmlToPdfmake from 'html-to-pdfmake';
import pdfMake from 'pdfmake';

@Injectable({ providedIn: 'root' })
export class PdfService {
  constructor() {}

  /**
   * Genera un Blob PDF a partir de HTML sin mostrar UI.
   * Retorna una Promise que resuelve con el Blob.
   */
  createPdfBlobFromHtml(html: string, opts: any = {}): Promise<Blob> {
    // Convert images referenced in HTML to data URLs so pdfMake can embed them.
    // html-to-pdfmake does not fetch external images, so remote images are lost unless
    // they are provided as data URIs. We attempt to fetch each <img src="..."> and
    // replace it with a data URL. On failure we leave the original src (image may be missing).
    return new Promise(async (resolve, reject) => {
      try {
        let processedHtml = String(html || '');

        // Find all img src occurrences
        const imgSrcs: string[] = [];
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
        let m: RegExpExecArray | null;
        while ((m = imgRegex.exec(processedHtml)) !== null) {
          try {
            const src = m[1];
            if (src && !src.startsWith('data:')) imgSrcs.push(src);
          } catch (e) { /* ignore */ }
        }

        // Helper to fetch and convert blob to data URL
        const blobToDataURL = (b: Blob) => new Promise<string>((res, rej) => {
          try {
            const reader = new FileReader();
            reader.onloadend = () => res(String(reader.result));
            reader.onerror = (err) => rej(err);
            reader.readAsDataURL(b);
          } catch (err) { rej(err); }
        });

        // Process each unique src sequentially to avoid many parallel fetches
        const uniqueSrcs = Array.from(new Set(imgSrcs));
        for (const srcRaw of uniqueSrcs) {
          try {
            // Resolve relative URLs against current location
            let src = String(srcRaw || '').trim();
            try { src = new URL(src, window.location.href).href; } catch (e) { /* keep srcRaw */ }

            // Try fetching the image
            const resp = await fetch(src);
            if (!resp.ok) throw new Error('Fetch failed: ' + resp.status);
            const blob = await resp.blob();
            const dataUrl = await blobToDataURL(blob);

            // Replace all occurrences of the original srcRaw in the HTML with the dataUrl
            const esc = srcRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(`(<img[^>]+src=["'])${esc}(["'][^>]*>)`, 'gi');
            processedHtml = processedHtml.replace(re, `$1${dataUrl}$2`);
          } catch (e) {
            // ignore failures for individual images
            console.warn('[PdfService] no se pudo convertir imagen a dataURL:', srcRaw, e);
          }
        }

        const content = (htmlToPdfmake as any)(processedHtml || '', { window: window });

        const docDefinition: any = {
          pageSize: 'A4',
          pageMargins: opts.pageMargins ?? [20, 60, 20, 60],
          content: content,
          styles: opts.styles ?? {}
        };

        const pdfDoc: any = (pdfMake as any).createPdf(docDefinition);
        pdfDoc.getBuffer((buffer: any) => {
          try {
            const blob = new Blob([buffer], { type: 'application/pdf' });
            resolve(blob);
          } catch (err) {
            reject(err);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera un Blob PDF a partir de la estructura de datos usada por VistaMasivaPreviaComponent.
   * data: objeto similar a { cuerpo, tramite, tramites, para, de, copia, asunto, ciudad, num_documento_interno, tipo_documento_nombre, anexos_nombres, anexos_count }
   * opts: { logoBase64, cabeceraBase64, pieBase64, empresaData }
   */
  createPdfBlobFromData(data: any, opts: any = {}): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        const logoBase64 = opts.logoBase64 ?? null;
        const cabeceraBase64 = opts.cabeceraBase64 ?? null;
        const pieBase64 = opts.pieBase64 ?? null;
        const empresaData = opts.empresaData ?? null;

        // Construir mainContent siguiendo la lógica de VistaMasivaPreviaComponent
        let mainContent: any = [];

        if (Array.isArray(data?.tramites) && data.tramites.length > 0) {
          const partes: any[] = [];
          (data.tramites || []).forEach((t: any, idx: number) => {
            const cuenta = Number(t.anexos_count ?? (Array.isArray(t.anexos_nombres) ? t.anexos_nombres.length : 0));
            const documentosTxt = cuenta === 1 ? '1 documento' : `${cuenta} documentos`;
            const cliente = String(t.cliente || '').trim();
            const asunto = String(t.asunto || '').trim();
            const texto = `Me permito entregar el documento original más ${documentosTxt} referente al Trámite Nº ${t.numero_tramite} ${cliente ? cliente : ''} ${asunto ? '- ' + asunto : ''}, para su respectiva gestión.`;
            partes.push({ text: texto, margin: [0, 6, 0, 6] });
            if (idx < data.tramites.length - 1) partes.push({ text: ' ', margin: [0, 4, 0, 4] });
          });
          mainContent = partes;
        } else if (data?.tramite && typeof data.tramite === 'object') {
          const t = data.tramite;
          const cuenta = Number(data?.anexos_count ?? (Array.isArray(data?.anexos_nombres) ? data.anexos_nombres.length : 0));
          const documentosTxt = cuenta === 1 ? '1 documento' : `${cuenta} documentos`;
          const cliente = String(t.cliente_nombre || t.cliente || t.nombre || '').trim();
          const asuntoT = String(data?.asunto || t.asunto || t.asunto_tramite || '').trim();

          const partes: any[] = [];
          partes.push({ text: 'De mi consideración:', style: 'label', margin: [0, 6, 0, 6] });
          const texto = `Me permito entregar el documento original más ${documentosTxt} referente al Trámite Nº ${t.numero_tramite || t.num_documento_interno || ''} ${cliente ? cliente : ''}${asuntoT ? ' - ' + asuntoT : ''}, para su respectiva gestión.`;
          partes.push({ text: texto, margin: [0, 6, 0, 6] });

          if (data?.cuerpo) {
            const htmlBody = (htmlToPdfmake as any)(data.cuerpo, { window: window });
            partes.push({ text: '\n' });
            partes.push(htmlBody);
          }
          partes.push({ text: '\n' });
          partes.push({ text: 'Con sentimientos de distinguida consideración.', margin: [0, 20, 0, 0] });
          mainContent = partes;
        } else {
          // fallback: usar cuerpo HTML si existe
          if (data?.cuerpo) {
            mainContent = (htmlToPdfmake as any)(data.cuerpo, { window: window });
          } else {
            mainContent = [];
          }
        }

        const tipoDocumento = String(data?.tipo_documento_nombre || data?.tipo_documento || 'DOCUMENTO');
        const numeroDocumento = String(data?.num_documento_interno || data?.numero_documento || data?.numero_tramite || data?.referencia || 'S/N');
        const fecha = new Date().toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' });
        const nombreEmpresa = String(empresaData?.nombre_empresa || '').trim();

        const pieImg = (pieBase64 && empresaData?.si_pie_pagina === 1) ? pieBase64 : null;
        const cabeceraImg = (cabeceraBase64 && empresaData?.si_cabecera === 1) ? cabeceraBase64 : null;

        const docDefinition: any = {
          pageSize: 'A4',
          pageMargins: [20, 100, 20, 100],
          watermark: { text: 'BORRADOR', color: '#e3342f', opacity: 0.08, bold: true, fontSize: 55 },
          content: [
            {
              columns: [
                { width: '*', text: '' },
                { width: 'auto', text: (empresaData?.texto_cabecera && empresaData?.si_cabecera === 0) ? String(empresaData.texto_cabecera || '') : '', alignment: 'center', style: 'empresa', margin: [0, 0, 0, 10] },
                { width: '*', text: '' }
              ]
            },
            {
              columns: [
                { width: '*', text: '' },
                logoBase64 ? { width: 'auto', stack: [{ image: logoBase64, width: 100, alignment: 'center' }] } : { width: 'auto', text: '' },
                { width: '*', text: '' }
              ]
            },
            {
              stack: [
                { text: nombreEmpresa || '', style: 'empresa', alignment: 'right', margin: [0, 0, 0, 2] },
                { text: `${tipoDocumento} Nro. ${numeroDocumento}`, style: 'docNumber', alignment: 'right', margin: [0, 0, 0, 2] },
                { text: `${String(data?.ciudad || 'Quito')}, ${fecha}`, style: 'docDate', alignment: 'right' }
              ]
            },
            { text: ' ', margin: [0, 10, 0, 0] },
            { text: ' ', margin: [0, 20, 0, 0] },
            { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: '#e5e7eb' }], margin: [0, 0, 0, 10] },
            {
              stack: [
                {
                  columns: [
                    { width: 55, text: 'Para:', style: 'label' },
                    { width: '*', text: this.formatListaForPdf(data?.para), style: 'value' }
                  ],
                  columnGap: 8
                },
                {
                  columns: [
                    { width: 55, text: 'De:', style: 'label' },
                    { width: '*', text: this.formatListaForPdf(data?.de), style: 'value' }
                  ],
                  columnGap: 8,
                  margin: [0, 4, 0, 0]
                },
                ...(Array.isArray(data?.copia) && data.copia.length > 0 ? [{ columns: [ { width: 55, text: 'Copia:', style: 'label' }, { width: '*', text: this.formatListaForPdf(data?.copia), style: 'value' } ], columnGap: 8, margin: [0, 4, 0, 0] }] : []),
                { text: '\n' },
                { columns: [ { width: 55, text: 'Asunto:', style: 'label' }, { width: '*', text: String(data?.asunto || 'Sin Asunto'), style: 'value' } ], columnGap: 8, margin: [0, 4, 0, 0] }
              ]
            },
            { text: '\n' },
            ...(Array.isArray(data?.tramites) && data.tramites.length > 0 ? [ { text: 'De mi consideración:', style: 'label', margin: [0, 6, 0, 6] }, ...mainContent, { text: '\n' }, { text: 'Con sentimientos de distinguida consideración.', margin: [0, 20, 0, 0] } ] : (Array.isArray(mainContent) ? mainContent : [mainContent])),
            { pageBreak: 'before', stack: [ { text: '\n\nAtentamente,\n\n', margin: [0, 30, 0, 30] }, { stack: [ { text: this.formatListaForPdf(data?.de), bold: true, margin: [0, 5, 0, 0] }, { text: nombreEmpresa, fontSize: 9, color: '#666' } ], alignment: 'left' }, ...( (() => {
              const listaAnexos: string[] = [];
              if (Array.isArray(data?.anexos_nombres) && data.anexos_nombres.length > 0) listaAnexos.push(...data.anexos_nombres.map((n: any) => String(n)));
              else if (Array.isArray(data?.tramites)) {
                for (const tt of data.tramites) {
                  if (Array.isArray(tt?.anexos_nombres) && tt.anexos_nombres.length > 0) listaAnexos.push(...tt.anexos_nombres.map((n: any) => String(n)));
                }
              }
              if (listaAnexos.length > 0) return [ { text: '\nAnexos:', style: 'label', margin: [0, 16, 0, 6] }, { ul: listaAnexos, fontSize: 9 } ];
              return [];
            })() ) ] },
          ],
          footer: (currentPage: any, pageCount: any) => {
            const pageNumberElem = { text: `pag. -${currentPage}-`, alignment: 'center', margin: [0, 6, 0, 0], fontSize: 9 };
            if (pieImg) {
              const imgElem = { columns: [ { width: '*', text: '' }, { image: pieImg, width: 515, height: 60, alignment: 'center' }, { width: '*', text: '' } ], margin: [0, 0, 0, 0] };
              return { stack: [imgElem, pageNumberElem] };
            }
            const direccion = String(empresaData?.direccion_empresa || empresaData?.direccion || '').trim();
            const telefono = String(empresaData?.telefono_empresa || empresaData?.telefono || '').trim();
            const textoPie = String(empresaData?.texto_pie_pagina || empresaData?.texto_pie || '').trim();
            const parts = [direccion, telefono, textoPie].filter(p => !!p);
            if (parts.length === 0) return pageNumberElem;
            const cols = { columns: [ { width: '*', text: '' }, { width: 'auto', stack: parts.map(p => ({ text: p, fontSize: 9, color: '#444', alignment: 'center' })) }, { width: '*', text: '' } ], margin: [0, 40, 0, 0] };
            return { stack: [cols, pageNumberElem] };
          },
          header: cabeceraImg ? (currentPage: any, pageCount: any) => ({ columns: [ { width: '*', text: '' }, { image: cabeceraImg, width: 555, height: 80, alignment: 'center' }, { width: '*', text: '' } ], margin: [0, 0, 0, 0] }) : undefined,
          styles: { empresa: { fontSize: 13, bold: true, color: '#111827' }, docNumber: { fontSize: 10.5, bold: true, color: '#111827' }, docDate: { fontSize: 9.5, color: '#374151' }, label: { fontSize: 10, bold: true, color: '#111827' }, value: { fontSize: 10, color: '#111827' } }
        };

        const pMake: any = pdfMake;
        const pdfDoc = pMake.createPdf(docDefinition);
        pdfDoc.getBuffer((buffer: any) => {
          try {
            const blob = new Blob([buffer], { type: 'application/pdf' });
            resolve(blob);
          } catch (err) { reject(err); }
        });
      } catch (err) { reject(err); }
    });
  }

  // Helper para formatear lista de usuarios dentro del servicio (similar a VistaMasivaPrevia.formatLista)
  private formatListaForPdf(usuarios: any[]) {
    if (!usuarios || usuarios.length === 0) return 'No asignado';
    return (usuarios || []).map((u: any) => {
      const sigla = String(u?.sigla || u?.sigla_usuario || '').trim();
      const nombre = String(u?.nombre_completo || `${u?.nombre || ''} ${u?.apellido || ''}`.trim() || u?.full_name || u?.nombre || u?.name || '').trim();
      const titulo = String(u?.titulo || u?.titulo_usuario || '').trim();
      const puesto = String(u?.puesto || u?.area || u?.seccion || u?.subseccion || '').trim();
      const seccion = String(u?.seccion || u?.subseccion || '').trim();
      if (!nombre) return '';
      let parts: string[] = []; if (sigla) parts.push(sigla); parts.push(nombre);
      let main = parts.join(' ').trim(); const extras: string[] = []; if (titulo) extras.push(titulo); const puestoSeccion = [puesto, seccion].filter(x => !!x).join(' / '); if (puestoSeccion) extras.push(puestoSeccion);
      let result = main; if (extras.length > 0) result = `${main}\n${extras.join(' — ')}`; return result;
    }).filter((v: any) => !!v).join('\n\n') || 'No asignado';
  }
}
