import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { PdfService } from 'src/app/shared/services/pdf.service';
import { URL_BACKEND } from 'src/app/config/config';
import { RecepcionService } from '../service/recepcion.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-vista-masiva-previa',
  templateUrl: './vista-masiva-previa.component.html',
  styleUrls: ['./vista-masiva-previa.component.scss']
})
export class VistaMasivaPreviaComponent {



   @Input() data: any; 
    pdfUrl: SafeResourceUrl | null = null;
    usuario_id!: number;
    id_empresa!: number;
    empresaData: any = null;
    logoBase64: string | null = null;
    cabeceraBase64: string | null = null;
    pieBase64: string | null = null;


     usuarios_para: any[] = [];
  usuarios_de: any[] = [];
  usuarios_copia: any[] = [];
  numero_documento_input: string = '';
 private initPending: number = 0;
private initLoadingShown: boolean = false;


        private decInit() {
           this.initPending = Math.max(0, this.initPending - 1);
           if (this.initPending === 0 && this.initLoadingShown) {
             try { Swal.close(); } catch {}
             this.initLoadingShown = false;
           }
         }
  
    constructor(
      public activeModal: NgbActiveModal, 
      private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    public recepcionService: RecepcionService,
    private http: HttpClient,
    private pdfService: PdfService
    ) {}
  
    ngOnInit() {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.usuario_id = user.id ?? null; 
  
      console.log('VistaMasivaPrevia - data recibida en ngOnInit:', this.data);
      if (this.data && typeof this.data === 'object') {
        this.data.para = this.data.para ?? [];
        this.data.de = this.data.de ?? [];
        this.data.copia = this.data.copia ?? [];
        this.data.asunto = this.data.asunto ?? '';
        this.data.ciudad = this.data.ciudad ?? '';
        this.data.cuerpo = this.data.cuerpo ?? '';
      } else {
        this.data = { para: [], de: [], copia: [], asunto: '', ciudad: '', cuerpo: '' };
      }
  
      this.fijarDeUsuarioLogeado();
  
      if (user && user.id_empresa) {
          console.log('Imagen encontrada, convirtiendo...');
        this.id_empresa = user.id_empresa;
        this.cargarEmpresa(this.id_empresa);
      } else {
        this.generarPDF();
      }

      if (this.usuario_id) {
          this.DatosLogeado(this.usuario_id);
        }
    }
  
    cargarEmpresa(idEmpresa: number) {
      // Para evitar problemas CORS al descargar el logo, usamos el endpoint
      // específico que devuelve una URL que pasa por /api/getImagenesPDF/{filename}
      // y ya incluye los headers CORS en la respuesta.
      this.recepcionService.cargarempresaidVistaPrevia(idEmpresa).subscribe({
        next: (empresa: any) => {
          // 📝 Log para ver la estructura completa del objeto recibido
          console.log('Datos de la empresa cargados (vista previa):', empresa);
  
          this.empresaData = empresa;
  
          // Preferir base64 ya incluido en la respuesta para evitar CORS
          this.logoBase64 = empresa.imagen_empresa_base64 ?? null;
          this.cabeceraBase64 = empresa.imagen_cabecera_base64 ?? null;
          this.pieBase64 = empresa.imagen_pie_pagina_base64 ?? null;
  
          if (this.logoBase64) {
            // Ya tenemos la imagen en base64 -> generar PDF
            this.generarPDF();
          } else if (empresa.imagen_empresa) {
            // Fallback: descargar la imagen por URL y convertir a base64
            console.log('Imagen encontrada, convirtiendo...');
            this.convertirImagenBase64(empresa.imagen_empresa);
          } else {
            console.log('No hay imagen, generando PDF directamente.');
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
          // Si falla la descarga, generar el PDF sin logo
          this.generarPDF();
        }
      });
    }
  
    generarPDF() {
      // Usar el PdfService centralizado para crear el Blob del PDF a partir de los datos y las imágenes
      const opts: any = {
        logoBase64: this.logoBase64,
        cabeceraBase64: this.cabeceraBase64,
        pieBase64: this.pieBase64,
        empresaData: this.empresaData
      };

      this.pdfService.createPdfBlobFromData(this.data || {}, opts).then((blob: Blob) => {
        try {
          const win = (window as any);
          const url = win['URL']['createObjectURL'](blob);
          const urlWithZoom = url + '#zoom=70';
          this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(urlWithZoom);
          this.cdr.detectChanges();
        } catch (err) {
          console.error('Error creando URL para preview PDF:', err);
        }
      }).catch(err => {
        console.error('Error generando PDF mediante PdfService:', err);
      });
    }
  
    formatLista(usuarios: any[]) {
      if (!usuarios || usuarios.length === 0) return 'No asignado';
      return usuarios
        .map(u => {
          // Normalizar campos comunes que enviamos desde AsignarTramite
          const sigla = String(u?.sigla || u?.sigla_usuario || '').trim();
          const nombre = String(u?.nombre_completo || `${u?.nombre || ''} ${u?.apellido || ''}`.trim() || u?.full_name || u?.nombre || u?.name || '').trim();
          const titulo = String(u?.titulo || u?.titulo_usuario || '').trim();
          const puesto = String(u?.puesto || u?.area || u?.seccion || u?.subseccion || '').trim();
          const seccion = String(u?.seccion || u?.subseccion || '').trim();
  
          if (!nombre) return '';
  
          // Construir la representación: incluir sigla, nombre completo, título y puesto/sección si existen
          let parts: string[] = [];
          if (sigla) parts.push(sigla);
          parts.push(nombre);
  
          let main = parts.join(' ').trim();
  
          const extras: string[] = [];
          if (titulo) extras.push(titulo);
          const puestoSeccion = [puesto, seccion].filter(x => !!x).join(' / ');
          if (puestoSeccion) extras.push(puestoSeccion);
  
          let result = main;
          if (extras.length > 0) {
            // Poner título y puesto/sección en la línea siguiente
            result = `${main}\n${extras.join(' — ')}`;
          }
  
          return result;
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
      // Queremos mostrar exactamente lo que envía el componente padre (AsignarTramite).
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
  
      // Construir entrada mínima similar a la que enviamos desde AsignarTramite
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


     DatosLogeado(id_usuario: number): void {
      try {
        console.log('validarFirma - id_usuario (enviando al servicio):', id_usuario);
        this.recepcionService.datosLogeado(id_usuario).subscribe({
          next: (resp: any) => {
            console.log('Logeado:', resp);
            // Enriquecer la fila DE si existe
            if (Array.isArray(this.usuarios_de) && this.usuarios_de.length > 0 && resp) {
              const de = this.usuarios_de[0];
              // Mapear campos si existen en respuesta
              if (typeof resp.tiene_firma !== 'undefined') de.tiene_firma = !!resp.tiene_firma;
              if (resp.titulo_usuario) de.titulo = resp.titulo_usuario;
              // Usamos 'area' y 'subseccion' que la tabla ya muestra
              if (resp.proyecto_actual) de.area = resp.proyecto_actual; // sección actual
              if (resp.nombre_proyecto_raiz) de.subseccion = resp.nombre_proyecto_raiz; // subsección/raíz
              if (resp.empresa) de.institucion = resp.empresa;
              // Sigla opcional del usuario
              if (resp.sigla_usuario) de.sigla = resp.sigla_usuario;
              // Autogenerar Número de Documento con: SIGLA_EMPRESA-SIGLA_PROYECTO_RAIZ-SIGLA_PROYECTO_ACTUAL-AÑO-####-M
              const siglaEmp = String(resp.sigla || resp.sigla_empresa || '').trim();
              const siglaProyRaiz = String(resp.sigla_proyecto_raiz || '').trim();
              const siglaProyActual = String(resp.sigla_proyecto_actual || '').trim();
              const year = new Date().getFullYear();
              const idEmp = this.id_empresa ?? resp.id_empresa ?? null;
              if (idEmp) {
                this.recepcionService.getSecuencialMemorandumRecepcion(Number(idEmp)).subscribe({
                  next: (r: any) => {
                    const sec4 = String(r?.secuencial || '0001').padStart(4, '0');
                    const partes: string[] = [];
                    if (siglaEmp) partes.push(siglaEmp);
                    if (siglaProyRaiz) partes.push(siglaProyRaiz);
                    if (siglaProyActual) partes.push(siglaProyActual);
                    partes.push(String(year));
                    partes.push(sec4);
                    partes.push('M');
                    this.numero_documento_input = partes.join('-');
                    this.cdr.detectChanges();
                  },
                  error: () => {
                    const sec4 = '0001';
                    const partes: string[] = [];
                    if (siglaEmp) partes.push(siglaEmp);
                    if (siglaProyRaiz) partes.push(siglaProyRaiz);
                    if (siglaProyActual) partes.push(siglaProyActual);
                    partes.push(String(year));
                    partes.push(sec4);
                    partes.push('M');
                    this.numero_documento_input = partes.join('-');
                    this.cdr.detectChanges();
                  }
                });
              } else {
                const sec4 = '0001';
                    const partes: string[] = [];
                    if (siglaEmp) partes.push(siglaEmp);
                    if (siglaProyRaiz) partes.push(siglaProyRaiz);
                    if (siglaProyActual) partes.push(siglaProyActual);
                    partes.push(String(year));
                partes.push(sec4);
                partes.push('M');
                this.numero_documento_input = partes.join('-');
                this.cdr.detectChanges();
              }
            }
          },
          error: (err) => {
            console.error('validarFirma - error servicio:', err);
          },
          complete: () => this.decInit()
        });
      } catch (e) {
        console.error('DatosLogeado - error:', e);
        this.decInit();
      }
    }


}
