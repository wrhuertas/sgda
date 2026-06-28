import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SubseccionRoutingModule } from './subseccion-routing.module';
import { SubseccionComponent } from './subseccion.component';
import { CreateSubseccionComponent } from './create-subseccion/create-subseccion.component';
import { EditSubseccionComponent } from './edit-subseccion/edit-subseccion.component';
import { DeleteSubseccionComponent } from './delete-subseccion/delete-subseccion.component';
import { ListSubseccionComponent } from './list-subseccion/list-subseccion.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';


@NgModule({
  declarations: [
    SubseccionComponent,
    CreateSubseccionComponent,
    EditSubseccionComponent,
    DeleteSubseccionComponent,
    ListSubseccionComponent,
    
    
  ],
  imports: [
    CommonModule,
    RouterModule,              // 👈 agregado
    SubseccionRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    NgbModalModule,
    NgbPaginationModule,
    InlineSVGModule
  ]
})
export class SubseccionModule { }
