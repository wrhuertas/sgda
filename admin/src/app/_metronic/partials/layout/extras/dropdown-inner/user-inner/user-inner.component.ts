import { Component, HostBinding, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { TranslationService } from '../../../../../../modules/i18n';
import { AuthService, UserType } from '../../../../../../modules/auth';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FirmaComponent } from '../firma/firma.component';
import Swal from 'sweetalert2';
import { ToastrService } from 'ngx-toastr';
import { URL_SERVICIOS } from 'src/app/config/config';

@Component({
  selector: 'app-user-inner',
  templateUrl: './user-inner.component.html',
})
export class UserInnerComponent implements OnInit, OnDestroy {
  @HostBinding('class')
  class = `menu menu-sub menu-sub-dropdown menu-column menu-rounded menu-gray-600 menu-state-bg menu-state-primary fw-bold py-4 fs-6 w-275px`;
  @HostBinding('attr.data-kt-menu') dataKtMenu = 'true';

  language: LanguageFlag;
  user$: Observable<any>;

  /** Se prende si la foto guardada no se puede cargar */
  sinFoto = false;

  langs = languages;
  private unsubscribe: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private translationService: TranslationService,
    private modalService: NgbModal,
    private http: HttpClient,
    private toast: ToastrService,
  ) {}

  ngOnInit(): void {
    this.user$ = this.auth.currentUserSubject.asObservable();

    // El backend manda una URL de flaticon cuando el usuario no tiene foto:
    // en ese caso se muestra la inicial en vez de esa imagen genérica.
    this.user$.subscribe(user => {
      this.sinFoto = !user?.avatar || String(user.avatar).includes('cdn-icons-png.flaticon.com');
    });

    this.setLanguage(this.translationService.getSelectedLanguage());
  }

  // 3. Crea la función para abrir el modal
  abrirModalFirma() {
    const modalRef = this.modalService.open(FirmaComponent, {
      centered: true,
      size: 'lg',
      backdrop: 'static'
    });
  
    this.user$.subscribe(user => {
      if (user) {
        console.log('--- ENVIANDO DATOS AL MODAL ---');
        console.log('ID Usuario:', user.id);
        console.log('ID Empresa:', user.id_empresa);
        
        // Pasamos los datos a la instancia del modal
        modalRef.componentInstance.usuario_actual = user;
        modalRef.componentInstance.usuario_id = user.id;
        modalRef.componentInstance.id_empresa = user.id_empresa;
      } else {
        console.warn('No se encontró un usuario logueado en user$');
      }
    });
  }

  logout() {
    this.auth.logout();
    
    // Limpiar localStorage y sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    // Forzar recarga sin caché
    window.location.href = '/auth/login';
  }

  // Helpers para mostrar color según caducidad de firma
  firmaColor(fechaStr?: string | null): string {
    if (!fechaStr) return '#6c757d'; // muted
    const hoy = new Date();
    const vence = new Date(fechaStr);
    if (isNaN(vence.getTime())) return '#6c757d';
    const diffMs = vence.getTime() - hoy.getTime();
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    // 3 meses ~ 90 días
    return diffDias <= 90 ? 'tomato' : '#28a745'; // tomato si <= 3 meses, verde si > 3 meses
  }

  formatFecha(fechaStr?: string | null): string {
    if (!fechaStr) return '';
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return fechaStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Abrir modal para guardar clave de ChatGPT del usuario
  async abrirModalClaveChatGPT() {
    const user = this.auth.user || JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.id) {
      this.toast.error('No se pudo identificar el usuario logueado');
      return;
    }

    const { value: clave, isConfirmed } = await Swal.fire({
      title: 'Configurar Clave de ChatGPT',
      input: 'password',
      inputLabel: 'Ingrese su clave personal',
      inputPlaceholder: 'sk-...'
        ,
      inputAttributes: {
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      preConfirm: (val) => {
        const v = String(val || '').trim();
        if (!v) {
          Swal.showValidationMessage('La clave no puede estar vacía');
          return false;
        }
        return v;
      }
    });

    if (!isConfirmed || !clave) return;

    try {
      const headers = new HttpHeaders({
        Authorization: 'Bearer ' + this.auth.token
      });
      const body: any = {
        email: user.email, // requerido por la validación del backend
        clave_chatGPT: String(clave).trim()
      };
      await this.http.post(`${URL_SERVICIOS}/users/${user.id}`, body, { headers }).toPromise();
      this.toast.success('Clave de ChatGPT actualizada');
      // Opcional: actualizar en memoria/localStorage
      try {
        const uRaw = localStorage.getItem('user');
        const u = uRaw ? JSON.parse(uRaw) : null;
        if (u) {
          u.clave_chatGPT = String(clave).trim();
          localStorage.setItem('user', JSON.stringify(u));
        }
      } catch {}
    } catch (err: any) {
      const msg = err?.error?.message || 'No se pudo guardar la clave';
      this.toast.error(msg);
    }
  }

  selectLanguage(lang: string) {
    this.translationService.setLanguage(lang);
    this.setLanguage(lang);
    // document.location.reload();
  }

  setLanguage(lang: string) {
    this.langs.forEach((language: LanguageFlag) => {
      if (language.lang === lang) {
        language.active = true;
        this.language = language;
      } else {
        language.active = false;
      }
    });
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}

interface LanguageFlag {
  lang: string;
  name: string;
  flag: string;
  active?: boolean;
}

const languages = [
  {
    lang: 'en',
    name: 'English',
    flag: './assets/media/flags/united-states.svg',
  },
  {
    lang: 'zh',
    name: 'Mandarin',
    flag: './assets/media/flags/china.svg',
  },
  {
    lang: 'es',
    name: 'Spanish',
    flag: './assets/media/flags/spain.svg',
  },
  {
    lang: 'ja',
    name: 'Japanese',
    flag: './assets/media/flags/japan.svg',
  },
  {
    lang: 'de',
    name: 'German',
    flag: './assets/media/flags/germany.svg',
  },
  {
    lang: 'fr',
    name: 'French',
    flag: './assets/media/flags/france.svg',
  },
];
