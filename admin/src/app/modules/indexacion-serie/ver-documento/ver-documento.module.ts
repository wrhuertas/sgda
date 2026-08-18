import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { VerDocumentoComponent } from './ver-documento.component';

/**
 * Módulo compartido del visor de documentos.
 * Cualquier módulo que quiera usar el visor (via DocumentoViewerService o
 * directamente con NgbModal) solo tiene que importar este módulo.
 */
@NgModule({
  declarations: [
    VerDocumentoComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    VerDocumentoComponent
  ]
})
export class VerDocumentoModule { }
