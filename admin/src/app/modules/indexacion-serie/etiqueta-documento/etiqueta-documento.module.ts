import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QRCodeModule } from 'angularx-qrcode';

import { EtiquetaDocumentoComponent } from './etiqueta-documento.component';
import { MostrarEtiquetaComponent } from '../mostrar-etiqueta/mostrar-etiqueta.component';

/**
 * Módulo compartido de etiquetas (código de barras / QR).
 * Cualquier módulo que quiera abrir EtiquetaDocumentoComponent con NgbModal
 * solo tiene que importar este módulo.
 */
@NgModule({
  declarations: [
    EtiquetaDocumentoComponent,
    MostrarEtiquetaComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    QRCodeModule
  ],
  exports: [
    EtiquetaDocumentoComponent,
    MostrarEtiquetaComponent
  ]
})
export class EtiquetaDocumentoModule { }
