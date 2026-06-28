import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ConsultaRoutingModule } from './consulta-routing.module';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { ConsultaComponent } from './consulta.component';
import { RegistroTramiteComponent } from './registro-tramite/registro-tramite.component';
import { SeguimientoTramiteComponent } from './seguimiento-tramite/seguimiento-tramite.component';

@NgModule({
  declarations: [ConsultaComponent, RegistroTramiteComponent, SeguimientoTramiteComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, ConsultaRoutingModule, CKEditorModule, NgbModule],
})
export class ConsultaModule {}
