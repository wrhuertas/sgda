// Localization is based on '@ngx-translate/core';
// Please be familiar with official documentations first => https://github.com/ngx-translate/core

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { URL_SERVICIOS } from 'src/app/config/config';
import { AuthService } from '../auth';

export interface Locale {
  lang: string;
  data: any;
}

const LOCALIZATION_LOCAL_STORAGE_KEY = 'language';

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  [x: string]: any;
  // Private properties
  public isLoadingSubject: BehaviorSubject<boolean>;
  public isLoading$: Observable<boolean>;
  private langIds: any = [];

  constructor(
    private translate: TranslateService,
    private http: HttpClient,      // Inyectar HttpClient
    public authservice: AuthService // Inyectar AuthService
  ) {

    this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    this.isLoading$ = this.isLoadingSubject.asObservable();
    // add new langIds to the list
    this.translate.addLangs(['en']);

    // this language will be used as a fallback when a translation isn't found in the current language
    this.translate.setDefaultLang('en');
  }

  loadTranslations(...args: Locale[]): void {
    const locales = [...args];

    locales.forEach((locale) => {
      // use setTranslation() with the third argument set to true
      // to append translations instead of replacing them
      this.translate.setTranslation(locale.lang, locale.data, true);
      this.langIds.push(locale.lang);
    });

    // add new languages to the list
    this.translate.addLangs(this.langIds);
    this.translate.use(this.getSelectedLanguage());
  }

  setLanguage(lang: string) {
    if (lang) {
      this.translate.use(this.translate.getDefaultLang());
      this.translate.use(lang);
      localStorage.setItem(LOCALIZATION_LOCAL_STORAGE_KEY, lang);
    }
  }

  /**
   * Returns selected language
   */
  getSelectedLanguage(): any {
    return (
      localStorage.getItem(LOCALIZATION_LOCAL_STORAGE_KEY) ||
      this.translate.getDefaultLang()
    );
  }


  // 🔸 Actualizar firma electrónica del usuario
// 🔸 MÉTODO PARA LA FIRMA CORREGIDO
registerFirma(data: any) {
  // Ahora this.isLoadingSubject ya no es undefined
  this.isLoadingSubject.next(true);
  
  const headers = new HttpHeaders({
    'Authorization': 'Bearer ' + this.authservice.token
  });

  const URL = URL_SERVICIOS + "/usuarios/actualizarfirma";

  return this.http.post(URL, data, { headers }).pipe(
    finalize(() => this.isLoadingSubject.next(false))
  );
}
}
