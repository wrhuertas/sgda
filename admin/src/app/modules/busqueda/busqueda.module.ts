import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 AQUI

import { BusquedaRoutingModule } from './busqueda-routing.module';
import { BusquedaComponent } from './busqueda.component';
import { BusquedaListComponent } from './busqueda-list/busqueda-list.component';
import { VerDocumentoComponent } from './ver-documento/ver-documento.component';
import { BusqueaAvanzadaComponent } from './busquea-avanzada/busquea-avanzada.component';
import { InfoDocumentoComponent } from './info-documento/info-documento.component';
import { NgbTooltipModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { HighlightPipe } from 'src/app/shared/pipes/highlight.pipe';

@NgModule({
  declarations: [
    BusquedaComponent,
    BusquedaListComponent,
    VerDocumentoComponent,
    BusqueaAvanzadaComponent,
    InfoDocumentoComponent,
    HighlightPipe,
  ],
  imports: [
    CommonModule,
    FormsModule,          // 👈 OBLIGATORIO PARA NGMODEL
    BusquedaRoutingModule,
    NgbTooltipModule,
    NgbNavModule
  ],
  exports: [
    HighlightPipe // <--- AÑADE ESTO para que el HTML pueda usarlo
  ]
})
export class BusquedaModule { }
