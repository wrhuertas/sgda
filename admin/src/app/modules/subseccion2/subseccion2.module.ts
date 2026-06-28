import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Subseccion2RoutingModule } from './subseccion2-routing.module';
import { Subseccion2Component } from './subseccion2.component';
import { DeleteSubseccion2Component } from './delete-subseccion2/delete-subseccion2.component';
import { ListSubseccion2Component } from './list-subseccion2/list-subseccion2.component';
import { CreateSubseccion2Component } from './create-subseccion2/create-subseccion2.component';
import { EditSubseccion2Component } from './edit-subseccion2/edit-subseccion2.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';


@NgModule({
  declarations: [
    Subseccion2Component,
    DeleteSubseccion2Component,
    ListSubseccion2Component,
    CreateSubseccion2Component,
    EditSubseccion2Component
  ],
  imports: [
        CommonModule,
        RouterModule,              // 👈 agregado
        Subseccion2RoutingModule,
        HttpClientModule,
        FormsModule,
        ReactiveFormsModule,
        NgbModule,
        NgbModalModule,
        NgbPaginationModule,
        InlineSVGModule
      ]
})
export class Subseccion2Module { }
