import { Component } from '@angular/core';
import { MasivoService } from '../service/masivo.service';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';

interface ProgresoResponse {
  estado: string;
  total_paginas: number;
  paginas_procesadas: number;
  zip_path: string | null;
  error: string | null;
  zipUrl?: string;
}

@Component({
  selector: 'app-ver-masivo',
  templateUrl: './ver-masivo.component.html',
  styleUrls: ['./ver-masivo.component.scss']
})
export class VerMasivoComponent {
  selectedFile?: File;
  isLoading = false;
  progress = 0;
  jobId?: string;
  selectedFiles: File[] = [];
  isDragging = false;
  selectedFilesEgresos: File[] = [];

  public paginasProcesadas: any[] = []; 
  
  constructor(private masivoService: MasivoService, private toast: ToastrService) {}
  
  
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }
  
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }
  
  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files) {
      this.validarArchivos(Array.from(files));
    }
  }
  
  validarArchivos(files: File[]) {
    const filtrados = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.zip'));
    this.selectedFiles = [...this.selectedFiles, ...filtrados];
    if (filtrados.length < files.length) {
      this.toast.warning('Solo se aceptan archivos .pdf y .zip');
    }
  }
  // 1. Para cuando seleccionan archivos desde el botón de Egresos
onFileSelectedEgresos(event: any) {
  const files: FileList = event.target.files;
  for (let i = 0; i < files.length; i++) {
    this.selectedFilesEgresos.push(files[i]);
  }
}

// 2. Para cuando arrastran archivos a la zona de Egresos
onDropEgresos(event: DragEvent) {
  event.preventDefault();
  this.isDragging = false;
  if (event.dataTransfer?.files) {
    const files = event.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      this.selectedFilesEgresos.push(files[i]);
    }
  }
}

// 3. (Opcional) Función para quitar un archivo de la lista de egresos
quitarArchivoEgresos(index: number) {
  this.selectedFilesEgresos.splice(index, 1);
}
  
  quitarArchivo(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  onFileSelected(event: any) {
    this.selectedFiles = Array.from(event.target.files); // Guardamos todos los seleccionados
  }
  async subirVariosPdfs() {
    if (this.selectedFiles.length === 0) {
      this.toast.warning('Selecciona al menos un archivo.');
      return;
    }
  
    this.isLoading = true;
    this.paginasProcesadas = [];
    
    let totalPdfsProcesadosGeneral = 0;
    let totalArchivosSeleccionados = this.selectedFiles.length;
  
    Swal.fire({
      title: 'Iniciando Procesamiento',
      html: 'Preparando archivos y analizando contenido...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });
  
    for (let i = 0; i < totalArchivosSeleccionados; i++) {
      const file = this.selectedFiles[i];
  
      try {
        // Enviamos el archivo (sea ZIP o PDF)
        const response: any = await this.masivoService.iniciarProceso(file).toPromise();
        
        // El backend ahora nos dice cuántos documentos procesó en ese envío
        // (Asegúrate que tu controlador retorne 'documentos_procesados')
        const cantidadEnEsteEnvio = response.documentos_procesados || 1;
        totalPdfsProcesadosGeneral += cantidadEnEsteEnvio;
  
        // Actualizamos el Swal con el total acumulado
        Swal.update({
          title: 'Procesando Documentos',
          html: `
            <div class="mt-3">
              <p>Se han procesado: <b>${totalPdfsProcesadosGeneral}</b> PDF(s) en total</p>
              <i class="fas fa-cog fa-spin"></i> Documento actual: <br>
              <small class="text-primary">${file.name}</small>
            </div>
          `
        });
  
        if (response.paginas) {
          this.paginasProcesadas.push(...response.paginas);
        }
  
      } catch (err) {
        this.toast.error(`Error en: ${file.name}`);
      }
    }
  
    this.isLoading = false;
  
    Swal.fire({
      icon: 'success',
      title: '¡Finalizado!',
      text: `Total de PDFs extraídos y procesados: ${totalPdfsProcesadosGeneral}`,
      confirmButtonText: 'Descargar Excel',
      confirmButtonColor: '#28a745',
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.descargarExcel();
      }

      // 2. LIMPIEZA TOTAL DEL FRONTEND
      this.selectedFiles = [];      // Borra la lista de archivos seleccionados
      this.paginasProcesadas = [];  // Borra las imágenes de la vista previa
      this.isLoading = false;

      this.toast.info('Vista despejada y lista para nuevos archivos.');
    });
  }




  async subirVariosEgresos() {
    // 1. VALIDACIÓN: Verificamos la lista de EGRESOS
    if (this.selectedFilesEgresos.length === 0) {
      this.toast.warning('Selecciona al menos un archivo de egreso.');
      return;
    }
  
    this.isLoading = true;
    this.paginasProcesadas = []; // Limpiamos vista previa antes de empezar
    
    let totalPdfsProcesadosGeneral = 0;
    let totalArchivosSeleccionados = this.selectedFilesEgresos.length; // Referencia a Egresos
  
    // Mensaje de inicio con SweetAlert
    Swal.fire({
      title: 'Iniciando Procesamiento de Egresos',
      html: 'Preparando archivos y analizando facturas...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });
  
    // 2. BUCLE DE PROCESAMIENTO
    for (let i = 0; i < totalArchivosSeleccionados; i++) {
      const file = this.selectedFilesEgresos[i]; // Tomamos el archivo de la lista correcta
  
      try {
        // Llamada al servicio de egresos (Asegúrate que la ruta en Laravel sea /iniciarprocesoegresopdf)
        const response: any = await this.masivoService.iniciarProcesoEgreso(file).toPromise();
        
        // Sumamos la cantidad de documentos que el backend logró extraer (útil para ZIPs)
        const cantidadEnEsteEnvio = response.documentos_procesados || 1;
        totalPdfsProcesadosGeneral += cantidadEnEsteEnvio;
  
        // Actualización visual del progreso
        Swal.update({
          title: 'Procesando Egresos',
          html: `
            <div class="mt-3">
              <p>Se han procesado: <b>${totalPdfsProcesadosGeneral}</b> documento(s) de egreso</p>
              <i class="fas fa-cog fa-spin"></i> Procesando: <br>
              <small class="text-danger">${file.name}</small>
            </div>
          `
        });
  
        // Si el backend devuelve URLs de imágenes para la vista previa
        if (response.paginas) {
          this.paginasProcesadas.push(...response.paginas);
        }
  
      } catch (err) {
        console.error(err);
        this.toast.error(`Error en archivo de egreso: ${file.name}`);
      }
    }
  
    this.isLoading = false;
  
    // 3. FINALIZACIÓN Y DESCARGA
    Swal.fire({
      icon: 'success',
      title: '¡Egresos Finalizados!',
      text: `Total de documentos de egreso procesados: ${totalPdfsProcesadosGeneral}`,
      confirmButtonText: 'Descargar Excel',
      confirmButtonColor: '#dc3545', // Color rojo para identificar Egresos
      allowOutsideClick: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.descargarExcel(); // Llama a tu función existente de descarga
      }
  
      // 4. LIMPIEZA ESPECÍFICA
      this.selectedFilesEgresos = []; // Vaciamos la lista de Egresos seleccionados
      this.paginasProcesadas = [];    // Limpiamos las miniaturas de la pantalla
      this.isLoading = false;
  
      this.toast.info('Módulo de egresos listo para nuevos documentos.');
    });
  }





verificarProgreso() {
  console.log('verificarProgreso llamado, jobId:', this.jobId);

  if (!this.jobId) {
    console.log('No hay jobId, deteniendo proceso');
    this.isLoading = false;
    return;
  }

  this.masivoService.obtenerProgreso(this.jobId).subscribe({
    next: (res) => {
      console.log('Respuesta obtenerProgreso:', res);
      this.progress = (res.paginas_procesadas / res.total_paginas) * 100;

      if (res.estado === 'finalizado' && res.zipUrl) {
        this.isLoading = false;
        this.toast.success('Proceso terminado', 'PDF separado con éxito');

        // Aquí el ! para asegurar que jobId no es undefined
        this.masivoService.descargarZip(this.jobId!).subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'paginas_separadas.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            console.log('Descarga iniciada');
          },
          error: (err) => {
            console.error('Error al descargar zip:', err);
            this.toast.error('Error', 'No se pudo descargar el archivo zip');
          }
        });

      } else {
        console.log('Proceso no terminado, volver a consultar en 5 segundos');
        setTimeout(() => this.verificarProgreso(), 5000);
      }
    },
    error: (err) => {
      console.error('Error al consultar progreso:', err);
      this.isLoading = false;
      this.toast.error('Error', 'Error al consultar progreso');
    }
  });
}
descargarExcel() {
  this.masivoService.descargarExcelSeguro().subscribe({
    next: (blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_Final_${new Date().getTime()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.toast.success('Excel descargado');
    }
  });
}





}
