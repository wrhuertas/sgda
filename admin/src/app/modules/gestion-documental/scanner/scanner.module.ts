import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

import { ScannerRoutingModule } from './scanner-routing.module';
import { ScannerComponent } from './scanner.component';
import { ScanDocumentosComponent } from './scan-documentos/scan-documentos.component';


@NgModule({
  declarations: [
    ScannerComponent,
    ScanDocumentosComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgbModalModule,
    ScannerRoutingModule
  ]
})
export class ScannerModule { }
