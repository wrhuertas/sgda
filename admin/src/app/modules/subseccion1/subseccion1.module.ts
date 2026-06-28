import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Subseccion1RoutingModule } from './subseccion1-routing.module';
import { Subseccion1Component } from './subseccion1.component';
import { ListSubseccion1Component } from './list-subseccion1/list-subseccion1.component';
import { CreateSubseccion1Component } from './create-subseccion1/create-subseccion1.component';
import { EditSubseccion1Component } from './edit-subseccion1/edit-subseccion1.component';
import { DeleteSubseccion1Component } from './delete-subseccion1/delete-subseccion1.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SubseccionRoutingModule } from '../subseccion/subseccion-routing.module';


@NgModule({
  declarations: [
    Subseccion1Component,
    ListSubseccion1Component,
    CreateSubseccion1Component,
    EditSubseccion1Component,
    DeleteSubseccion1Component
  ],
  imports: [
      CommonModule,
      RouterModule,              // 👈 agregado
      Subseccion1RoutingModule,
      HttpClientModule,
      FormsModule,
      ReactiveFormsModule,
      NgbModule,
      NgbModalModule,
      NgbPaginationModule,
      InlineSVGModule
    ]
})
export class Subseccion1Module { }
