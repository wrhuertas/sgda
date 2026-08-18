import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { QRCodeModule } from 'angularx-qrcode';

import { EtiquetaRoutingModule } from './etiqueta-routing.module';
import { EtiquetaComponent } from './etiqueta.component';
import { EtiquetaDocumentoModule } from '../../indexacion-serie/etiqueta-documento/etiqueta-documento.module';
import { RutaetiquetaComponent } from './rutaetiqueta/rutaetiqueta.component';
import { ListaEtiquetaComponent } from './lista-etiqueta/lista-etiqueta.component';
import { EditarEtiquetaComponent } from './editar-etiqueta/editar-etiqueta.component';
import { GenerarEtiquetaComponent } from './generar-etiqueta/generar-etiqueta.component';
import { GenerarBarrasComponent } from './generar-barras/generar-barras.component';


@NgModule({
  declarations: [
    EtiquetaComponent,
    RutaetiquetaComponent,
    ListaEtiquetaComponent,
    EditarEtiquetaComponent,
    GenerarEtiquetaComponent,
    GenerarBarrasComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbModalModule,
    QRCodeModule,
    EtiquetaRoutingModule,
    EtiquetaDocumentoModule
  ]
})
export class EtiquetaModule { }
