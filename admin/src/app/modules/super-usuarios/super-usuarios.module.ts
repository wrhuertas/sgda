import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule, NgbModalModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { InlineSVGModule } from 'ng-inline-svg-2';

import { SuperUsuariosRoutingModule } from './super-usuarios-routing.module';
import { SuperUsuariosComponent } from './super-usuarios.component';
import { ListSuperUsuariosComponent } from './list-super-usuarios/list-super-usuarios.component';
import { CreateSuperUsuarioComponent } from './create-super-usuario/create-super-usuario.component';
import { EditSuperUsuarioComponent } from './edit-super-usuario/edit-super-usuario.component';
import { DeleteSuperUsuarioComponent } from './delete-super-usuario/delete-super-usuario.component';

@NgModule({
  declarations: [
    SuperUsuariosComponent,
    ListSuperUsuariosComponent,
    CreateSuperUsuarioComponent,
    EditSuperUsuarioComponent,
    DeleteSuperUsuarioComponent
  ],
  imports: [
    CommonModule,
    SuperUsuariosRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModule,
    NgbModalModule,
    NgbPaginationModule,
    InlineSVGModule
  ]
})
export class SuperUsuariosModule {}
