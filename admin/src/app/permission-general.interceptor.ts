import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class PermissionGeneralInterceptor implements HttpInterceptor {

  constructor(
    public router: Router,
    public toast: ToastrService,
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((response: HttpErrorResponse) => {
        console.log(response);
        if(response.status == 403){
          if(response.error.message == 'This action is unauthorized.' || response.error.message == 'THIS ACTION IS UNAUTHORIZED'){
            this.router.navigateByUrl("/");
            this.toast.error("NO PERMITIDO","NO ESTAS PERMITIDO INGRESAR A ESTA RUTA");
          }
        }
        return throwError(response);
      })
    );
  }
}
