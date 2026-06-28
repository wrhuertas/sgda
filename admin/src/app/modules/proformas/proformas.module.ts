import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ProformasRoutingModule } from './proformas-routing.module';
import { ProformasComponent } from './proformas.component';
import { CreateProformaComponent } from './create-proforma/create-proforma.component';
import { EditProformaComponent } from './edit-proforma/edit-proforma.component';
import { ListProformasComponent } from './list-proformas/list-proformas.component';
import { DeleteProformaComponent } from './delete-proforma/delete-proforma.component';
import { SearchProductsComponent } from './componets/search-products/search-products.component';
import { SearchClientsComponent } from './componets/search-clients/search-clients.component';
import { AddPaymentsComponent } from './componets/add-payments/add-payments.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { EditProductDetailProformaComponent } from './componets/edit-product-detail-proforma/edit-product-detail-proforma.component';
import { DeleteProductDetailProformaComponent } from './componets/delete-product-detail-proforma/delete-product-detail-proforma.component';
import { OpenDetailProformaComponent } from './componets/open-detail-proforma/open-detail-proforma.component';


@NgModule({
  declarations: [
    ProformasComponent,
    CreateProformaComponent,
    EditProformaComponent,
    ListProformasComponent,
    DeleteProformaComponent,
    SearchProductsComponent,
    SearchClientsComponent,
    AddPaymentsComponent,
    EditProductDetailProformaComponent,
    DeleteProductDetailProformaComponent,
    OpenDetailProformaComponent
  ],
  imports: [
    CommonModule,
    ProformasRoutingModule,

    HttpClientModule,
    FormsModule,
    NgbModule,
    ReactiveFormsModule,
    InlineSVGModule,
    NgbModalModule,


    NgbPaginationModule,
  ]
})
export class ProformasModule { }
