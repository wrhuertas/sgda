import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { LayoutType } from '../../../core/configs/config';
import { LayoutService } from '../../../core/layout.service';
import { AuthService } from 'src/app/modules/auth';
import { EmpresaService } from 'src/app/modules/empresas/service/empresa.service';


@Component({
  selector: 'app-sidebar-logo',
  templateUrl: './sidebar-logo.component.html',
  styleUrls: ['./sidebar-logo.component.scss'],
})
export class SidebarLogoComponent implements OnInit, OnDestroy {
  private unsubscribe: Subscription[] = [];
  @Input() toggleButtonClass: string = '';
  @Input() toggleEnabled: boolean;
  @Input() toggleType: string = '';
  @Input() toggleState: string = '';
  currentLayoutType: LayoutType | null;
  usuarioActual: any;
  idEmpresa: number;
  empresa: any;
  toggleAttr: string;

  constructor(private layout: LayoutService,
    public authService: AuthService,
    private empresaService: EmpresaService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.usuarioActual = this.authService.user;
    console.log('Usuario logeado:', this.usuarioActual);
  
    // 1. Configuramos el atributo de toggle primero
    this.toggleAttr = `app-sidebar-${this.toggleType}`;
  
    // 2. Suscripción al layout
    const layoutSubscr = this.layout.currentLayoutTypeSubject
      .asObservable()
      .subscribe((layout) => {
        this.currentLayoutType = layout;
        this.cdr.detectChanges();
      });
    this.unsubscribe.push(layoutSubscr);
  
    // 3. Lógica del Logo: Validamos si hay empresa
    if (this.usuarioActual?.id_empresa) {
      this.idEmpresa = this.usuarioActual.id_empresa;
      console.log('ID Empresa detectado:', this.idEmpresa);
      this.enviarIdEmpresa();
    } else {
      // Si no tiene empresa, asignamos el logo por defecto manualmente
      console.warn('Usuario sin empresa, cargando logo local...');
      this.empresa = {
        imagen_empresa: './assets/media/logos/icono.jpeg'
      };
      this.cdr.detectChanges();
    }
  }


  enviarIdEmpresa() {
    if (!this.idEmpresa) {
      console.error('ID empresa no definido');
      return;
    }
  
    this.empresaService.getEmpresaLogo(this.idEmpresa).subscribe({
      next: (res: any) => {
        console.log('Info empresa:', res);
        this.empresa = {

          ...res,
          imagen: res.imagen_empresa // 👈 normalizamos
          
        };
        // ⚡ Forzamos que Angular detecte los cambios
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
      }
    });

  }
  
  

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }


  
}
