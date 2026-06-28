import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { HttpClientInMemoryWebApiModule } from 'angular-in-memory-web-api';
import { ClipboardModule } from 'ngx-clipboard';
import { TranslateModule } from '@ngx-translate/core';
import { InlineSVGModule } from 'ng-inline-svg-2';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AuthService } from './modules/auth/services/auth.service';
import { environment } from 'src/environments/environment';
import { SweetAlert2Module } from '@sweetalert2/ngx-sweetalert2';
// #fake-start#
import { FakeAPIService } from './_fake/fake-api.service';
import { ToastrModule } from 'ngx-toastr';
// #fake-end#
import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { PermissionGeneralInterceptor } from './permission-general.interceptor';

import { TipoDocumentoComponent } from './modules/Tramites/TipoDocumento/tipo-documento.component';
import { ListadoTramiteComponent } from './modules/Tramites/historial-tramite/listado-tramite/listado-tramite.component';
import { HistorialTramiteComponent } from './modules/Tramites/historial-tramite/historial-tramite.component';
import { ArchivosDescargarComponent } from './modules/Administracion/archivos-descargar/archivos-descargar.component';
import { TipoTramitesComponent } from './modules/Tramites/tipo-tramites/tipo-tramites.component';
import { PrestamoComponent } from './modules/gestion-documental/prestamo/prestamo.component';
import { CertificadoComponent } from './modules/gestion-documental/certificado/certificado.component';




function appInitializer(authService: AuthService) {
  return () => {
    return new Promise((resolve) => {
      //@ts-ignore
      authService.getUserByToken().subscribe().add(resolve);
    });
  };
}
//RegistrarTramiteComponent, 
@NgModule({
  declarations: [AppComponent, 
    TipoDocumentoComponent, ArchivosDescargarComponent, TipoTramitesComponent,  PrestamoComponent, CertificadoComponent,    ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    TranslateModule.forRoot(),
    HttpClientModule,
    ClipboardModule,
    // #fake-start#
    environment.isMockEnabled
      ? HttpClientInMemoryWebApiModule.forRoot(FakeAPIService, {
        passThruUnknownUrl: true,
        dataEncapsulation: false,
      })
      : [],
    // #fake-end#
    AppRoutingModule,
    InlineSVGModule.forRoot(),
    NgbModule,
    SweetAlert2Module.forRoot(),
    ToastrModule.forRoot(),
    NgbPaginationModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      multi: true,
      deps: [AuthService],
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: PermissionGeneralInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
