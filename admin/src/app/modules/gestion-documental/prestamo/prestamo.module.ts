import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PrestamoRoutingModule } from './prestamo-routing.module';
import { ListPrestamoComponent } from './list-prestamo/list-prestamo.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbNavModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { CrearPrestamoComponent } from './crear-prestamo/crear-prestamo.component';
import { EditarPrestamoComponent } from './editar-prestamo/editar-prestamo.component';
import { EliminarPrestamoComponent } from './eliminar-prestamo/eliminar-prestamo.component';
import { VerPrestamoComponent } from './ver-prestamo/ver-prestamo.component';
import { FirmarPrestamoComponent } from './firmar-prestamo/firmar-prestamo.component';
import { EnviarcorreoPrestamoComponent } from './enviarcorreo-prestamo/enviarcorreo-prestamo.component';
import { VerpaginasPrestamoComponent } from './verpaginas-prestamo/verpaginas-prestamo.component';
import { DevolucionPrestamoComponent } from './devolucion-prestamo/devolucion-prestamo.component';


@NgModule({
  declarations: [
    ListPrestamoComponent,
    CrearPrestamoComponent,
    EditarPrestamoComponent,
    EliminarPrestamoComponent,
    VerPrestamoComponent,
    FirmarPrestamoComponent,
    EnviarcorreoPrestamoComponent,
    VerpaginasPrestamoComponent,
    DevolucionPrestamoComponent
  ],
  

  imports: [
          CommonModule,
          PrestamoRoutingModule,
          HttpClientModule,
          FormsModule,
          NgbModule,
          ReactiveFormsModule,
          InlineSVGModule,
          NgbModalModule,
          NgbNavModule, 
          NgbPaginationModule,
          // BrowserModule,  <-- Quitar de aquí también
          NgxExtendedPdfViewerModule
        ]
})
export class PrestamoModule { }
