import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { DocumentosService } from '../service/docuemntos.service';
import { CreateDocumentoComponent } from '../create-documento/create-documento.component';
import { PermisoDocumentosComponent } from '../permiso-documentos/permiso-documentos.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

// PDF.js
import * as pdfjsLib from 'pdfjs-dist';
import { pdfjsWorker } from 'pdfjs-dist/build/pdf.worker.entry';
// Configurar el worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

@Component({
  selector: 'app-list-documentos',
  templateUrl: './list-documentos.component.html',
  styleUrls: ['./list-documentos.component.scss']
})
export class ListDocumentosComponent implements OnInit {

  proyectos: any[] = [];
  permisos: any[] = [];

  isLoading = false;

   // 👇 Nueva propiedad para guardar al usuario actual
  usuarioActual: any = null;

  constructor(
    private documentosService: DocumentosService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private modalService: NgbModal 
  ) {}

  ngOnInit(): void {
    // Cargar los datos del usuario desde localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
     const userData = localStorage.getItem('user');

    if (userData) {
      try {
        this.usuarioActual = JSON.parse(userData);
        console.log('✅ Usuario cargado manualmente:', this.usuarioActual);
      } catch (error) {
        console.error('❌ Error al parsear el usuario de localStorage:', error);
      }
    } else {
      console.warn('⚠️ No hay usuario guardado en localStorage.');
    }

    this.cargarProyectos();

    this.documentosService.isLoading$.subscribe(loading => {
      this.ngZone.run(() => {
        this.isLoading = loading;
        this.cdr.detectChanges();
      });
    });
  }

cargarProyectos(): void {
  if (!this.usuarioActual || !this.usuarioActual.id) {
    console.error('❌ No se encontró el usuario actual.');
    return;
  }

  this.documentosService.getProyectosEscalera().subscribe(
    proyectos => {

      // 🧩 Si el usuario es ADMIN → tiene acceso total
      if (this.usuarioActual.role_name === 'Admin') {
        console.log('👑 Usuario ADMIN — acceso total a todas las carpetas');
        this.proyectos = proyectos;
        this.permisos = proyectos.map((p: any) => ({
          id_carpeta: p.id,
          puede_ver: 1,
          puede_subir: 1,
          puede_editar: 1,
          puede_eliminar: 1
        }));

        this.cdr.detectChanges();
        return; // ⛔ no sigue al getPermisosPorUsuario
      }

      // 🚫 Si no es admin, consulta permisos desde el backend
      this.documentosService.getPermisosPorUsuario(this.usuarioActual.id).subscribe(
        permisos => {
          console.log('✅ Permisos obtenidos:', permisos);

          this.permisos = permisos;

          const idsPermitidos = permisos
            .filter(p => p.puede_ver === 1)
            .map(p => p.id_carpeta);

          this.proyectos = this.filtrarProyectosPorPermisos(proyectos, idsPermitidos);

          this.cdr.detectChanges();
        },
        err => console.error('❌ Error al obtener permisos:', err)
      );
    },
    err => console.error('❌ Error al cargar proyectos:', err)
  );
}




private filtrarProyectosPorPermisos(items: any[], idsPermitidos: number[]): any[] {
  if (!items || items.length === 0) return [];

  return items
    .map(item => {
      if (!idsPermitidos.includes(item.id_proyecto || item.id_serie)) return null;

      // Filtrar subniveles recursivamente
      if (item.subsecciones?.length) {
        item.subsecciones = this.filtrarProyectosPorPermisos(item.subsecciones, idsPermitidos);
      }
      if (item.series?.length) {
        item.series = this.filtrarProyectosPorPermisos(item.series, idsPermitidos);
      }
      if (item.hijos_recursivos?.length) {
        item.hijos_recursivos = this.filtrarProyectosPorPermisos(item.hijos_recursivos, idsPermitidos);
      }

      return item;
    })
    .filter(item => !!item);
}



  getArchivoUrl(archivo_url: string): string {
    try {
      const parsed = JSON.parse(archivo_url);
      return Array.isArray(parsed) ? parsed[0] : archivo_url;
    } catch {
      return archivo_url;
    }
  }

  getArchivoNombre(archivo_url: string): string {
    const url = this.getArchivoUrl(archivo_url);
    return url.split('/').pop() || 'Documento.pdf';
  }

indexarDocumento(doc: any) {
  // Abrir modal directamente con el documento recibido
  const modalRef = this.modalService.open(CreateDocumentoComponent, {
    centered: true,
    size: 'xl',
    windowClass: 'modal-xxl-custom'
  });

  modalRef.componentInstance.docData = doc; // pasamos solo el doc
}


// Función para renderizar PDF a imagen
private async renderPdfPageAsImage(pdfUrl: string): Promise<string> {
  const loadingTask = pdfjsLib.getDocument(pdfUrl);
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1); // primera página
  const viewport = page.getViewport({ scale: 1.5 }); // escala para mejorar calidad

  // Crear canvas temporal
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  await page.render({ canvasContext: context, viewport }).promise;

  // Convertir a dataURL
  return canvas.toDataURL('image/png');
}

  // ==================== 🔐 PERMISOS ====================
abrirPermisos(item: any) {
  // Abrir modal Angular
  const modalRef = this.modalService.open(PermisoDocumentosComponent, {
    size: 'lg',
    centered: true
  });

  // Enviar solo el ID y tipo del elemento al modal
  modalRef.componentInstance.id = item.id_proyecto || item.id_serie; // usa id_proyecto o id_serie según corresponda
  modalRef.componentInstance.tipo = item.id_proyecto ? 'proyecto' : 'serie/subseccion';
}



// ==================== 🔥 ELIMINAR DOCUMENTO 🔥 ====================
eliminarDocumento(doc: any) {
  if (!confirm(`¿Estás seguro de eliminar el documento "${this.getArchivoNombre(doc.archivo_url)}"?`)) {
    return;
  }

  // Llamada al servicio para eliminar en backend
  this.documentosService.eliminarDocumento(doc.id).subscribe({
    next: () => {
      // Actualizamos la lista localmente
     // this.removeDocumentoRecursivo(this.proyectos, doc.id);
      alert('Documento eliminado correctamente.');
    },
    error: (err) => {
      console.error('Error al eliminar documento:', err);
      alert('No se pudo eliminar el documento.');
    }
  });
}

// Función recursiva para eliminar documento en todos los niveles
/*private removeDocumentoRecursivo(items: any[], docId: number) {
  items.forEach(item => {
    if (item.indexaciones) {
      item.indexaciones = item.indexaciones.filter(d => d.id !== docId);
    }
    if (item.subsecciones) {
      this.removeDocumentoRecursivo(item.subsecciones, docId);
    }
    if (item.series) {
      this.removeDocumentoRecursivo(item.series, docId);
    }
    if (item.hijos_recursivos) {
      this.removeDocumentoRecursivo(item.hijos_recursivos, docId);
    }
  });
}*/



}
