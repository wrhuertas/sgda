import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 AQUI

import { BusquedaRoutingModule } from './busqueda-routing.module';
import { BusquedaComponent } from './busqueda.component';
import { BusquedaListComponent } from './busqueda-list/busqueda-list.component';
// El visor propio de este módulo quedó reemplazado por el visor completo del
// expediente (VerDocumentoModule). Los archivos se conservan por si acaso.
import { BusqueaAvanzadaComponent } from './busquea-avanzada/busquea-avanzada.component';
import { InfoDocumentoComponent } from './info-documento/info-documento.component';
import { NgbTooltipModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
// Visor completo del expediente (el mismo de indexación), para abrirlo desde la búsqueda
import { VerDocumentoModule } from '../indexacion-serie/ver-documento/ver-documento.module';
import { HighlightPipe } from 'src/app/shared/pipes/highlight.pipe';

@NgModule({
  declarations: [
    BusquedaComponent,
    BusquedaListComponent,
    BusqueaAvanzadaComponent,
    InfoDocumentoComponent,
    HighlightPipe,
  ],
  imports: [
    CommonModule,
    FormsModule,          // 👈 OBLIGATORIO PARA NGMODEL
    BusquedaRoutingModule,
    NgbTooltipModule,
    NgbNavModule,
    VerDocumentoModule
  ],
  exports: [
    HighlightPipe // <--- AÑADE ESTO para que el HTML pueda usarlo
  ]
})
export class BusquedaModule { }
