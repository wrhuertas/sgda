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
   
    this.verGraficoLineal = true;
   
  }
  // 4. Caso por defecto (GUEST u otros)
  else {
    this.verGraficoLineal = true;
  }

  setTimeout(() => this.renderCharts(), 300);
}

  renderCharts() {
    this.destruirGraficos();

    // Gráfico de Barras (ADMIN) - Usando el ID del HTML 'graficoBarras2'
   if (this.verGraficoBarras) {
    // 1. Gráfico de Ciclo de Vida (Áreas Apiladas)
    const ctxVida = document.getElementById('graficoVidaDocumental') as HTMLCanvasElement;
    if (ctxVida) {
      this.charts.push(new Chart(ctxVida, {
        type: 'line',
        data: {
          labels: ['Feb', 'Mar'],
          datasets: [
            { label: 'Gestión', data: [500, 480], backgroundColor: 'rgba(0, 158, 247, 0.5)', fill: true, tension: 0.4 },
            { label: 'Central', data: [300, 320], backgroundColor: 'rgba(80, 205, 137, 0.5)', fill: true, tension: 0.4 },
            { label: 'Histórico', data: [100, 110], backgroundColor: 'rgba(255, 199, 0, 0.5)', fill: true, tension: 0.4 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { stacked: true } } }
      }));
    }

    // 2. Gráfico de Auditoría (Barras modernas)
    const ctxAuditoria = document.getElementById('graficoAuditoria') as HTMLCanvasElement;
    if (ctxAuditoria) {
      this.charts.push(new Chart(ctxAuditoria, {
        type: 'bar',
        data: {
          labels: ['Finanzas', 'Jurídico', 'T. Humano', 'Operaciones'],
          datasets: [{
            label: 'Cumplimiento %',
            data: [92, 45, 88, 76],
            backgroundColor: (ctx) => (ctx.raw as number < 50 ? '#f1416c' : '#009ef7'),
            borderRadius: 6,
            barThickness: 30
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      }));
    }
  }

    // Gráfico de Pastel (SUPER ADMIN) - Usando el ID del HTML 'graficoPastel2'
   if (this.verGraficoPastel) {
  // Reemplazamos $nextTick por un setTimeout de 0ms
  setTimeout(() => {
    
    // 1. GRÁFICO DE INFRAESTRUCTURA
    const ctxConsumo = document.getElementById('chartConsumo') as HTMLCanvasElement;
    if (ctxConsumo) {
      this.charts.push(new Chart(ctxConsumo, {
        type: 'doughnut',
        data: {
          labels: ['GAD Valencia', 'Consejo Comunicación', 'Empresa 3'],
          datasets: [{
            data: [450, 320, 180],
            backgroundColor: ['#009EF7', '#50CD89', '#F1416C'],
            borderWidth: 0
          }]
        },
        options: { cutout: '70%', maintainAspectRatio: false }
      }));
    }

    // 2. GRÁFICO DE ADOPCIÓN (Feb vs Mar)
    const ctxTransacciones = document.getElementById('chartTransacciones') as HTMLCanvasElement;
    if (ctxTransacciones) {
      this.charts.push(new Chart(ctxTransacciones, {
        type: 'bar',
        data: {
          labels: ['GAD Valencia', 'Consejo Comunicación', 'Empresa 3'],
          datasets: [
            { label: 'Febrero', data: [12500, 8400, 3200], backgroundColor: '#E4E6EF' },
            { label: 'Marzo', data: [15800, 9200, 4100], backgroundColor: '#009EF7' }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      }));
    }

    // 3. GRÁFICO DE SEGURIDAD
    const ctxSeguridad = document.getElementById('chartSeguridad') as HTMLCanvasElement;
    if (ctxSeguridad) {
      this.charts.push(new Chart(ctxSeguridad, {
        type: 'polarArea',
        data: {
          labels: ['Accesos Fallidos', 'Firmas por Caducar', 'Alertas de IP'],
          datasets: [{
            data: [12, 5, 3],
            backgroundColor: ['#f1416c', '#ffc700', '#7239ea']
          }]
        },
        options: { maintainAspectRatio: false }
      }));
    }
  }, 0);
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
      const elPastel = document.getElementById('graficoPastel') as HTMLCanvasElement;
  if (elPastel) {
    new Chart(elPastel, {
      type: 'pie',
      data: {
        labels: ['Ventas', 'Soporte', 'Logística'],
        datasets: [{
          data: [300, 50, 100],
          backgroundColor: ['#009ef7', '#f1416c', '#ffc700']
        }]
      }
    });
  }

  // --- 3. CONTROL DE EXPEDIENTES (BARRAS) ---
  const elExpedientes = document.getElementById('graficoExpedientes') as HTMLCanvasElement;
  if (elExpedientes) {
    new Chart(elExpedientes, {
      type: 'bar',
      data: {
        labels: ['Abiertos', 'En Revisión', 'Cerrados', 'Archivados'],
        datasets: [{
          label: 'Total de Expedientes',
          data: [15, 25, 40, 10],
          backgroundColor: '#7239ea'
        }]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
  }

  // --- 4. ESTADO DE INVENTARIOS (DONA) ---
  const elInventarios = document.getElementById('graficoInventarios') as HTMLCanvasElement;
  if (elInventarios) {
    new Chart(elInventarios, {
      type: 'doughnut',
      data: {
        labels: ['Stock Bajo', 'Stock Óptimo', 'Exceso'],
        datasets: [{
          data: [5, 85, 10],
          backgroundColor: ['#f1416c', '#50cd89', '#3f4254']
        }]
      },
      options: { cutout: '70%' } // Hace el centro más grande
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