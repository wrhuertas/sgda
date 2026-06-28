import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LayoutType } from '../../../core/configs/config';
import { LayoutInitService } from '../../../core/layout-init.service';
import { LayoutService } from '../../../core/layout.service';
import { Observable } from 'rxjs';
import { AuthService } from 'src/app/modules/auth';

@Component({
  selector: 'app-header-menu',
  templateUrl: './header-menu.component.html',
  styleUrls: ['./header-menu.component.scss'],
})
export class HeaderMenuComponent implements OnInit {
  userName: string = ''; // Para almacenar el nombre completo
  userRole: string = ''; // Para almacenar el rol
  constructor(
    private auth: AuthService,
    private router: Router,
    private layout: LayoutService,
    private layoutInit: LayoutInitService
  ) {}
  user$: Observable<any>;
  ngOnInit(): void {
    // Cargar los datos del usuario desde localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Usuario cargado manualmente:', user);

    if (user) {
      if (user.zonal_name && user.prestador_name && user.funcionario_name) {
        this.userName = user.zonal_name; // Si existe el nombre del zonal y el prestador, mostrar zonal
      } else if (user.zonal_name) {
        this.userName = user.zonal_name; // Si solo existe el nombre del zonal, mostrar zonal
      } else if (user.prestador_name) {
        this.userName = user.prestador_name; // Si solo existe el nombre del prestador, mostrar prestador
      }
    }
  }

  calculateMenuItemCssClass(url: string): string {
    return checkIsActive(this.router.url, url) ? 'active' : '';
  }

  setBaseLayoutType(layoutType: LayoutType) {
    this.layoutInit.setBaseLayoutType(layoutType);
  }

  setToolbar(
    toolbarLayout: 'classic' | 'accounting' | 'extended' | 'reports' | 'saas'
  ) {
    const currentConfig = { ...this.layout.layoutConfigSubject.value };
    if (currentConfig && currentConfig.app && currentConfig.app.toolbar) {
      currentConfig.app.toolbar.layout = toolbarLayout;
      this.layout.saveBaseConfig(currentConfig);
    }
  }
}

const getCurrentUrl = (pathname: string): string => {
  return pathname.split(/[?#]/)[0];
};

const checkIsActive = (pathname: string, url: string) => {
  const current = getCurrentUrl(pathname);
  if (!current || !url) {
    return false;
  }

  if (current === url) {
    return true;
  }

  if (current.indexOf(url) > -1) {
    return true;
  }

  return false;
};
