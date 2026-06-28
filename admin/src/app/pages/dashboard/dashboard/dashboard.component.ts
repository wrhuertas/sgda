import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  
  userRole: string = ''; 
  total_purchase: number = 45;
  total_clients: number = 128;

  // Variables de control de vista
  verGraficos: boolean = false;
  verGraficoBarras: boolean = false;
  verGraficoPastel: boolean = false;
  verGraficoLineal: boolean = false;
  verTarjetas: boolean = false;

  private intervalo: any;
  private charts: any[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.detectarCambiosDeRol();
    // Revisa el localStorage cada segundo por si el rol cambia en el header

  }

  ngOnDestroy(): void {
    if (this.intervalo) clearInterval(this.intervalo);
    this.destruirGraficos();
  }

detectarCambiosDeRol() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // Imprimimos el rol tal cual viene para confirmar
  console.log("este es el rol:", user.role_name);

  // Normalizamos el valor para que coincida con tus "if"
  // 1. Convertimos a Mayúsculas
  // 2. Cambiamos el guion '-' por un espacio ' '
  const rolLimpio = (user.role_name || 'GUEST')
   .toString()
    .toUpperCase()
    .replace('-', ' ') // Cambia el guion por espacio
    .replace(/\s+/g, ' ') // Quita espacios dobles si los hubiera
    .trim();

  // Solo si el rol cambió, aplicamos la seguridad
  if (this.userRole !== rolLimpio) {
    this.userRole = rolLimpio;
    this.aplicarSeguridadPorRol();
  }
}

aplicarSeguridadPorRol() {
  // Reset de banderas
  this.verTarjetas = false;
  this.verGraficoBarras = false;
  this.verGraficoPastel = false;
  this.verGraficoLineal = false;
  this.verGraficos = false;

  // 1. Caso Super Admin
  if (this.userRole === 'SUPER ADMIN') {
    this.verGraficoPastel = true;
  } 
  // 2. Caso cualquier tipo de Admin (Admin-Valencia, etc.)
  else if (this.userRole.startsWith('ADMIN')) {
    this.verGraficoBarras = true;
    this.verGraficos = true; 
  } 
  // 3. Caso cualquier tipo de Usuario (Usuario - JUAN CARLOS, etc.)
  else if (this.userRole.startsWith('USUARIO')) {
    this.verTarjetas = true;
    this.verGraficoLineal = true;
  }
  // 4. Caso por defecto (GUEST u otros)
  else {
    this.verTarjetas = true;
  }

  setTimeout(() => this.renderCharts(), 300);
}

  renderCharts() {
    this.destruirGraficos();

    // Gráfico de Barras (ADMIN) - Usando el ID del HTML 'graficoBarras2'
    if (this.verGraficoBarras) {
      const elBarras = document.getElementById('graficoBarras2') as HTMLCanvasElement;
      if (elBarras) {
        this.charts.push(new Chart(elBarras, {
          type: 'bar',
          data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr'],
            datasets: [{ label: 'Ventas', data: [1200, 1900, 3000, 5000], backgroundColor: '#009ef7' }]
          },
          options: { maintainAspectRatio: false }
        }));
      }
    }

    // Gráfico de Pastel (SUPER ADMIN) - Usando el ID del HTML 'graficoPastel2'
    if (this.verGraficoPastel) {
      const elPastel = document.getElementById('graficoPastel2') as HTMLCanvasElement;
      if (elPastel) {
        this.charts.push(new Chart(elPastel, {
          type: 'pie',
          data: {
            labels: ['Pagadas', 'Pendientes', 'Vencidas'],
            datasets: [{ data: [30, 15, 5], backgroundColor: ['#50cd89', '#ffc700', '#f1416c'] }]
          },
          options: { maintainAspectRatio: false }
        }));
      }
    }
if (this.verGraficoLineal) {
      const elLineal = document.getElementById('graficoLineal') as HTMLCanvasElement;
      if (elLineal) {
        new Chart(elLineal, {
          type: 'line',
          data: {
            labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'],
            datasets: [{ label: 'Actividad', data: [5, 12, 8, 15, 10], borderColor: '#50cd89' }]
          }
        });
      }
    }


  }
  

  destruirGraficos() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  ngAfterViewInit(): void {}
}