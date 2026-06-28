import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight'
})
export class HighlightPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string, search: string): SafeHtml {
    if (!value) return '';
    if (!search) return value;

    // 'gi' hace que busque globalmente e ignore mayúsculas/minúsculas
    const re = new RegExp(search, 'gi');
    const replacedValue = value.replace(re, match => 
      `<mark style="background-color: yellow; font-weight: bold; padding: 0 2px;">${match}</mark>`
    );

    return this.sanitizer.bypassSecurityTrustHtml(replacedValue);
  }
}