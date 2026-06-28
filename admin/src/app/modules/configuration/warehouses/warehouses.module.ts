import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WarehousesRoutingModule } from './warehouses-routing.module';
import { WarehousesComponent } from './warehouses.component';
import { CreateWherehouseComponent } from './create-wherehouse/create-wherehouse.component';
import { EditWherehouseComponent } from './edit-wherehouse/edit-wherehouse.component';
import { DeleteWherehouseComponent } from './delete-wherehouse/delete-wherehouse.component';
import { ListWherehouseComponent } from './list-wherehouse/list-wherehouse.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';


@NgModule({
  declarations: [
    WarehousesComponent,
    CreateWherehouseComponent,
    EditWherehouseComponent,
    DeleteWherehouseComponent,
    ListWherehouseComponent
  ],
  imports: [
    CommonModule,
    WarehousesRoutingModule,
    
    HttpClientModule,
    FormsModule,
    NgbModule,
    ReactiveFormsModule,
    InlineSVGModule,
    NgbModalModule,
    NgbPaginationModule,
  ]
})
export class WarehousesModule { }
