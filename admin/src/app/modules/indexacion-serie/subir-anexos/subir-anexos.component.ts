import { HttpEventType } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { IndexacionSerieService } from '../service/indexacion-serie.service';
import { DocumentoViewerService } from '../ver-documento/documento-viewer.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-subir-anexos',
  templateUrl: './subir-anexos.component.html'
})
export class SubirAnexosComponent {
  @Input() idDocumento: any;
  @Input() ID_EMPRESA: any;
  @Input() idSerieSubserie: any;
  @Input() rutaDocumento: string = '';
  @Input() nombreDocumento: string = '';


  progress: number = 0;
  archivos: any[] = [];
  usuario_id: any = null;

  anexosExistentes: any[] = [];

  // Definimos las extensiones de PROGRAMAS prohibidos
  private extensionesProhibidas = [
    'exe', 'bat', 'msi', 'sh', 'com', 'cmd', 'vbs', 'scr', 'js', 'jar'
  ];

  constructor(
    public activeModal: NgbActiveModal,
    private toast: ToastrService,
    private seccionesService: IndexacionSerieService,
    private documentoViewer: DocumentoViewerService,
  ) {}



  ngOnInit() {
    // Capturamos el usuario del localStorage como mostraste
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.usuario_id = user.id ?? null;
    
    console.log('Usuario que sube anexos:', this.usuario_id);

    this.cargarAnexosExistentes();
  }

  cargarAnexosExistentes() {
    this.seccionesService.listarAnexos(this.idDocumento).subscribe({
        next: (res: any) => {
            this.anexosExistentes = res.anexos;
        }
    });
}


  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.validarYProcesar(files);
    }
  }

  validarYProcesar(files: FileList) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const extension = file.name.split('.').pop()?.toLowerCase();

      // 🛡️ VALIDACIÓN: Si la extensión está en la lista negra, no pasa
      if (this.extensionesProhibidas.includes(extension || '')) {
        this.toast.error(
          `El archivo "${file.name}" es un programa o ejecutable. No se permite por seguridad.`,
          'Acceso Denegado'
        );
        continue;
      }

      // Si pasa la validación, lo agregamos
      this.archivos.push({
        file: file,
        nombre: file.name,
        tamano: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        extension: extension
      });
    }
  }

  eliminarArchivo(index: number) {
    this.archivos.splice(index, 1);
  }

  guardarAnexos() {
    if (this.archivos.length === 0) {
      this.toast.warning('Debe seleccionar al menos un archivo.');
      return;
    }

    // 1. Preparamos el FormData (El sobre que contiene los archivos y datos)
    const formData = new FormData();
    
    // Agregamos cada archivo del arreglo al FormData
    // Usamos 'archivos[]' para que Laravel lo reciba como un array
    this.archivos.forEach((item: any) => {
      formData.append('archivos[]', item.file);
    });

    // Agregamos los datos adicionales que requiere tu lógica
    formData.append('id_documento', this.idDocumento);
    formData.append('id_empresa', this.ID_EMPRESA);
    formData.append('id_serie_subserie', this.idSerieSubserie);
    formData.append('ruta_almacenamiento', this.rutaDocumento);
    formData.append('usuario_id', this.usuario_id);
    formData.append('nombre_documento', this.nombreDocumento);

    // 2. LLAMADA AL SERVICIO
    // Usamos la función que tú definiste: subirDocumentosSerie
    this.seccionesService.subirAnexosExpediente(formData).subscribe({
      next: (event: any) => {
        // Manejamos el progreso de carga
        if (event.type === HttpEventType.UploadProgress) {
          this.progress = Math.round((100 * event.loaded) / event.total);
        } 
        
        // Cuando el servidor responde con éxito (Tipo 4: Response)
        if (event.type === HttpEventType.Response) {
          this.toast.success('¡Archivos del flash subidos con éxito!');
          this.activeModal.close(true); // Se cierra y recarga la tabla principal
        }
      },
      error: (err) => {
        this.toast.error('Hubo un error al subir los anexos');
        console.error(err);
      }
    });
}


// Formatos que el backend rasteriza a imagen (Imagick directo, o pasando
// antes por PDF en el caso de las hojas de cálculo)
private extensionesImagen = [
    'tif', 'tiff', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp',
    'xlsx', 'xls', 'xlsm', 'csv', 'ods'
];

private getExtension(anexo: any): string {
    const ext = (anexo?.extension || '').toString().toLowerCase();
    if (ext) return ext;
    return (anexo?.nombre_original || '').toString().split('.').pop()?.toLowerCase() || '';
}

esPdf(anexo: any): boolean {
    return this.getExtension(anexo) === 'pdf';
}

esImagen(anexo: any): boolean {
    return this.extensionesImagen.includes(this.getExtension(anexo));
}

// Ver un anexo en el visor predeterminado (DocumentoViewerService).
// El backend devuelve una imagen por página (como una vista de impresión);
// los PDF los renderiza pdf.js.
verAnexo(anexo: any) {
    // El visor pide cada página al backend por id_anexo
    if (this.esImagen(anexo)) {
        this.documentoViewer.abrirVer({
            idAnexo: anexo?.id_anexo,
            nombreArchivo: anexo?.nombre_original
        });
        return;
    }

    if (!this.esPdf(anexo)) {
        Swal.fire(
            'Formato no soportado',
            `El visor no previsualiza archivos ${this.getExtension(anexo).toUpperCase()}. "${anexo?.nombre_original}" debe descargarse para abrirlo.`,
            'info'
        );
        return;
    }

    const ruta = (anexo?.ruta || '').toString().trim();
    if (!ruta) {
        this.toast.warning('No se encontró la ruta del anexo');
        return;
    }

    Swal.fire({ title: 'Cargando anexo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    this.seccionesService.verAnexoBase64(ruta).subscribe({
        next: (resp: any) => {
            try { Swal.close(); } catch {}
            if (resp?.success && resp?.base64) {
                this.documentoViewer.abrirVer({
                    pdfBase64: resp.base64,
                    nombreArchivo: anexo?.nombre_original
                });
            } else {
                this.toast.error(resp?.message || 'No se pudo obtener el anexo');
            }
        },
        error: (err) => {
            try { Swal.close(); } catch {}
            console.error('Error trayendo anexo:', err);
            this.toast.error('No se pudo cargar el anexo');
        }
    });
}


eliminarAnexo(anexo: any) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: `Vas a eliminar el anexo: ${anexo.nombre_original}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f1416c',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            this.seccionesService.deleteAnexo(anexo.id_anexo).subscribe({
                next: (resp) => {
                    // Filtramos el array local para que desaparezca de la vista de inmediato
                    this.anexosExistentes = this.anexosExistentes.filter(a => a.id_anexo !== anexo.id_anexo);
                    Swal.fire('Eliminado', 'El archivo ha sido borrado.', 'success');
                },
                error: (err) => Swal.fire('Error', 'No se pudo eliminar el archivo.', 'error')
            });
        }
    });
}
}