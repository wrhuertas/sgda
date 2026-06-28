import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SucursalDeliveriesRoutingModule } from './sucursal-deliveries-routing.module';
import { CreateSucursalDeliverieComponent } from './create-sucursal-deliverie/create-sucursal-deliverie.component';
import { EditSucursalDeliverieComponent } from './edit-sucursal-deliverie/edit-sucursal-deliverie.component';
import { ListSucursalDeliverieComponent } from './list-sucursal-deliverie/list-sucursal-deliverie.component';
import { DeleteSucursalDeliverieComponent } from './delete-sucursal-deliverie/delete-sucursal-deliverie.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { SucursalDeliveriesComponent } from './sucursal-deliveries.component';

@NgModule({
  declarations: [
    SucursalDeliveriesComponent,
    CreateSucursalDeliverieComponent,
    EditSucursalDeliverieComponent,
    ListSucursalDeliverieComponent,
    DeleteSucursalDeliverieComponent
  ],
  imports: [
    CommonModule,
    SucursalDeliveriesRoutingModule,

    HttpClientModule,
    FormsModule,
    NgbModule,
    ReactiveFormsModule,
    InlineSVGModule,
    NgbModalModule,
    NgbPaginationModule,
  ]
})
export class SucursalDeliveriesModule { }
