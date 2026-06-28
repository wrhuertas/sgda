import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common'; // <--- IMPORTA ESTO AQUÍ
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { IndexacionSerieService } from '../service/indexacion-serie.service';
import { HttpEventType } from '@angular/common/http';

@Component({
  selector: 'app-subir-excel-masivo',
  standalone: true, // <--- 1. AGREGA ESTO
  imports: [CommonModule, NgbModule], // <--- 2. AGREGA ESTO
  templateUrl: './subir-excel-masivo.component.html',
  styleUrls: ['./subir-excel-masivo.component.scss']
})
export class SubirExcelMasivoComponent implements OnInit {
  // ... (todo el resto de tu código igual que antes)
  selectedFile: File | null = null;
  previewData: any[] = [];
  isUploading: boolean = false;
  progress: number = 0;

  constructor(public activeModal: NgbActiveModal, private cd: ChangeDetectorRef, private _serieService: IndexacionSerieService) {}

  ngOnInit(): void {}

  onFileChange(event: any) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.leerExcel(this.selectedFile);
      this.cd.detectChanges();
    }
  }

  leerExcel(file: File) {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];
      this.previewData = XLSX.utils.sheet_to_json(ws);
      this.cd.detectChanges();
    };
    reader.readAsBinaryString(file);
  }

  procesarArchivo() {
    if (!this.selectedFile) return;
  
    this.isUploading = true;
    this.progress = 0;
  
    // Enviamos solo el archivo, ya que el Excel trae toda la data
    this._serieService.subirExcelMasivo(this.selectedFile).subscribe({
      next: (event: any) => {
        // Control de la barra de progreso real
        if (event.type === HttpEventType.UploadProgress) {
          if (event.total) {
            this.progress = Math.round((100 * event.loaded) / event.total);
          }
          this.cd.detectChanges();
        } 
        
        // Respuesta final del servidor
        else if (event.type === HttpEventType.Response) {
          this.isUploading = false;
          Swal.fire({
            icon: 'success',
            title: '¡Importación Finalizada!',
            text: event.body.message || 'El archivo se procesó correctamente.',
            confirmButtonColor: '#28a745'
          }).then(() => {
            this.activeModal.close(true); // Retorna true para refrescar la lista de expedientes
          });
        }
      },
      error: (err) => {
        this.isUploading = false;
        this.progress = 0;
        console.error('Error en el servidor:', err);
        
        Swal.fire({
          icon: 'error',
          title: 'Error en la carga',
          text: err.error?.message || 'Hubo un problema al procesar el Excel.'
        });
        this.cd.detectChanges();
      }
    });
  }

  objectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}