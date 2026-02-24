import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Transferencia } from '../../modules/transferencias/transferencia.model';

// Configurar fuentes
(pdfMake as any).vfs = pdfFonts;

@Injectable({
  providedIn: 'root'
})
export class PdfTransferenciaService {

  constructor() { }

  /**
   * Genera y descarga el PDF de una transferencia
   * @param transferencia Datos de la transferencia
   */
  async generarPdfTransferencia(transferencia: Transferencia): Promise<void> {
    const logoBase64 = await this.obtenerLogoBase64(transferencia.campeonato?.liga?.imagen);
    const docDefinition = this.construirDocumento(transferencia, logoBase64);
    pdfMake.createPdf(docDefinition).download(`PASE_${transferencia.jugador?.nombre}_${transferencia.jugador?.apellido}_${transferencia.id}.pdf`);
  }

  /**
   * Abre el PDF en una nueva pestaña
   * @param transferencia Datos de la transferencia
   */
  async abrirPdfTransferencia(transferencia: Transferencia): Promise<void> {
    const logoBase64 = await this.obtenerLogoBase64(transferencia.campeonato?.liga?.imagen);
    const docDefinition = this.construirDocumento(transferencia, logoBase64);
    pdfMake.createPdf(docDefinition).open();
  }

  /**
   * Convierte la URL del logo de Cloudinary a base64
   * @param logoUrl URL del logo en Cloudinary
   * @returns Promise con el string base64 o null si falla
   */
  private async obtenerLogoBase64(logoUrl: string | undefined): Promise<string | null> {
    if (!logoUrl) {
      return null;
    }

    try {
      const response = await fetch(logoUrl);
      if (!response.ok) {
        console.warn('No se pudo cargar el logo:', response.status);
        return null;
      }

      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Error al convertir logo a base64:', error);
      return null;
    }
  }

  /**
   * Construye la definición del documento PDF
   * @param transferencia Datos de la transferencia
   * @param logoBase64 Logo en formato base64 (opcional)
   * @returns Definición del documento para pdfmake
   */
  private construirDocumento(transferencia: Transferencia, logoBase64: string | null = null): any {
    const fechaSolicitud = new Date(transferencia.fechaSolicitud).toLocaleDateString('es-EC');
    const fechaAprobacionOrigen = transferencia.fechaAprobacionOrigen 
      ? new Date(transferencia.fechaAprobacionOrigen).toLocaleDateString('es-EC') 
      : 'Pendiente';
    const fechaAprobacionDirectivo = transferencia.fechaAprobacionDirectivo 
      ? new Date(transferencia.fechaAprobacionDirectivo).toLocaleDateString('es-EC') 
      : 'Pendiente';

    const liga = transferencia.campeonato?.liga;
    const fechaFundacion = liga?.fechaFundacion 
      ? new Date(liga.fechaFundacion).toLocaleDateString('es-EC')
      : '';

    return {
      pageSize: 'A4',
      pageMargins: [40, 100, 40, 70],
      
      // Encabezado del documento
      header: (currentPage: number) => {
        if (currentPage === 1) {
          const headerContent: any = {
            margin: [40, 20, 40, 0],
            stack: [
              {
                columns: [
                  logoBase64 ? {
                    // Logo real de la liga desde Cloudinary
                    image: logoBase64,
                    width: 50,
                    height: 50,
                    alignment: 'center'
                  } : {
                    // Fallback si no hay logo
                    text: '',
                    width: 50
                  },
                  {
                    stack: [
                      { text: liga?.nombre || 'Liga', fontSize: 16, bold: true, alignment: 'center' },
                      { text: fechaFundacion ? `Fundada: ${fechaFundacion}` : '', fontSize: 10, alignment: 'center', margin: [0, 2, 0, 0] }
                    ],
                    margin: [10, 5, 0, 0]
                  }
                ]
              },
              {
                canvas: [
                  { type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, color: '#3498db' }
                ],
                margin: [0, 10, 0, 0]
              }
            ]
          };
          return headerContent;
        }
        return {};
      },
      
      content: [
        // Título principal
        {
          text: 'PASE DE TRANSFERENCIA',
          style: 'header',
          alignment: 'center',
          margin: [0, 0, 0, 5]
        },
        {
          text: `N° ${transferencia.id}`,
          fontSize: 10,
          bold: true,
          color: '#e74c3c',
          alignment: 'center',
          margin: [0, 0, 0, 5]
        },
        {
          text: transferencia.campeonato?.nombre || 'Campeonato',
          fontSize: 11,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 15]
        },

        // Contenido en dos columnas para optimizar espacio
        {
          columns: [
            // Columna izquierda: Información del jugador
            {
              width: '48%',
              stack: [
                {
                  text: 'INFORMACIÓN DEL JUGADOR',
                  style: 'sectionHeader',
                  margin: [0, 0, 0, 8]
                },
                {
                  table: {
                    widths: ['40%', '60%'],
                    body: [
                      [
                        { text: 'Nombre:', bold: true, fontSize: 9, fillColor: '#f5f5f5' },
                        { text: `${transferencia.jugador?.nombre || ''} ${transferencia.jugador?.apellido || ''}`, fontSize: 9 }
                      ],
                      [
                        { text: 'Cédula:', bold: true, fontSize: 9, fillColor: '#f5f5f5' },
                        { text: transferencia.jugador?.cedula || 'N/A', fontSize: 9 }
                      ],
                      [
                        { text: 'F. Nacimiento:', bold: true, fontSize: 9, fillColor: '#f5f5f5' },
                        { text: transferencia.jugador?.fechaNacimiento 
                            ? new Date(transferencia.jugador.fechaNacimiento).toLocaleDateString('es-EC')
                            : 'N/A',
                          fontSize: 9 
                        }
                      ],
                      [
                        { text: 'Posición:', bold: true, fontSize: 9, fillColor: '#f5f5f5' },
                        { text: transferencia.jugador?.posicion || 'N/A', fontSize: 9 }
                      ]
                    ]
                  },
                  layout: 'lightHorizontalLines'
                }
              ]
            },
            // Espacio entre columnas
            { width: '4%', text: '' },
            // Columna derecha: Información de transferencia
            {
              width: '48%',
              stack: [
                {
                  text: 'INFORMACIÓN DE TRANSFERENCIA',
                  style: 'sectionHeader',
                  margin: [0, 0, 0, 8]
                },
                {
                  table: {
                    widths: ['45%', '55%'],
                    body: [
                      [
                        { text: 'Equipo Origen:', bold: true, fontSize: 9, fillColor: '#f5f5f5' },
                        { text: transferencia.equipoOrigen?.nombre || 'N/A', fontSize: 9 }
                      ],
                      [
                        { text: 'Equipo Destino:', bold: true, fontSize: 9, fillColor: '#f5f5f5' },
                        { text: transferencia.equipoDestino?.nombre || 'N/A', fontSize: 9 }
                      ],
                      [
                        { text: 'F. Solicitud:', bold: true, fontSize: 9, fillColor: '#f5f5f5' },
                        { text: fechaSolicitud, fontSize: 9 }
                      ]
                    ]
                  },
                  layout: 'lightHorizontalLines'
                }
              ]
            }
          ],
          margin: [0, 0, 0, 15]
        },

        // Estado de aprobaciones (ancho completo pero compacto)
        {
          text: 'ESTADO DE APROBACIONES',
          style: 'sectionHeader',
          margin: [0, 5, 0, 8]
        },
        {
          table: {
            widths: ['40%', '30%', '30%'],
            body: [
              [
                { text: 'Aprobación', bold: true, fontSize: 9, fillColor: '#f5f5f5', alignment: 'center' },
                { text: 'Estado', bold: true, fontSize: 9, fillColor: '#f5f5f5', alignment: 'center' },
                { text: 'Fecha', bold: true, fontSize: 9, fillColor: '#f5f5f5', alignment: 'center' }
              ],
              [
                { text: 'Equipo Origen', fontSize: 9 },
                { 
                  text: this.formatEstado(transferencia.estadoEquipoOrigen), 
                  fontSize: 9,
                  bold: true,
                  alignment: 'center',
                  color: this.getColorEstado(transferencia.estadoEquipoOrigen)
                },
                { text: fechaAprobacionOrigen, fontSize: 9, alignment: 'center' }
              ],
              [
                { text: 'Directivo de Liga', fontSize: 9 },
                { 
                  text: this.formatEstado(transferencia.estadoDirectivo), 
                  fontSize: 9,
                  bold: true,
                  alignment: 'center',
                  color: this.getColorEstado(transferencia.estadoDirectivo)
                },
                { text: fechaAprobacionDirectivo, fontSize: 9, alignment: 'center' }
              ]
            ]
          },
          layout: 'lightHorizontalLines',
          margin: [0, 0, 0, 15]
        },

        // Observaciones (siempre se muestra)
        {
          table: {
            widths: ['*'],
            body: [
              [{ text: 'OBSERVACIONES', fontSize: 11, bold: true, color: '#ffffff', fillColor: '#3498db', border: [false, false, false, false] }]
            ]
          },
          layout: 'noBorders',
          margin: [0, 8, 0, 3]
        },
        {
          text: transferencia.observaciones || 'Ninguna',
          fontSize: 10,
          margin: [0, 5, 0, 15]
        },

        // Firmas (solo si está pendiente, no si está aprobado)
        ...this.generarSeccionFirmas(transferencia, liga)
      ],

      // Estilos
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          color: '#2c3e50'
        },
        sectionHeader: {
          fontSize: 10,
          bold: true,
          color: '#ffffff',
          fillColor: '#3498db',
          margin: [0, 5, 0, 5]
        }
      },

      // Pie de página con información de contacto
      footer: (currentPage: number, pageCount: number) => {
        const contactInfo = [];
        
        if (liga?.correo || liga?.telefono) {
          const parts = [];
          if (liga?.correo) parts.push(`Correo: ${liga.correo}`);
          if (liga?.telefono) parts.push(`Tel: ${liga.telefono}`);
          contactInfo.push(parts.join('  |  '));
        }

        return {
          margin: [40, 10, 40, 0],
          stack: [
            {
              canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, color: '#cccccc' }],
              margin: [0, 0, 0, 5]
            },
            {
              columns: [
                { 
                  text: contactInfo.length > 0 ? contactInfo[0] : '', 
                  fontSize: 9, 
                  alignment: 'left',
                  color: '#666666'
                },
                { 
                  text: `Generado: ${new Date().toLocaleDateString('es-EC')} ${new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}`, 
                  fontSize: 8, 
                  alignment: 'right',
                  color: '#999999'
                }
              ]
            }
          ]
        };
      }
    };
  }

  /**
   * Genera la sección de firmas según el estado de la transferencia
   * @param transferencia Datos de la transferencia
   * @param liga Datos de la liga
   * @returns Array con elementos de firma o vacío si está aprobado
   */
  private generarSeccionFirmas(transferencia: Transferencia, liga: any): any[] {
    // Si ambos estados son aprobados, no mostrar firmas
    if (transferencia.estadoEquipoOrigen === 'aprobado' && transferencia.estadoDirectivo === 'aprobado') {
      return [];
    }

    // Si está pendiente o parcialmente aprobado, mostrar firmas
    return [
      {
        text: 'FIRMAS',
        style: 'sectionHeader',
        margin: [0, 10, 0, 10]
      },
      // Primera fila: Equipo Origen y Equipo Destino
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: '\n\n', margin: [0, 0, 0, 3] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1 }], margin: [0, 0, 20, 0] },
              { text: 'Equipo Origen', alignment: 'center', fontSize: 9, margin: [0, 3, 20, 0], bold: true },
              { text: transferencia.equipoOrigen?.nombre || '', alignment: 'center', fontSize: 8, margin: [0, 0, 20, 0], italics: true }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: '\n\n', margin: [0, 0, 0, 3] },
              { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 240, y2: 0, lineWidth: 1 }], margin: [20, 0, 0, 0] },
              { text: 'Equipo Destino', alignment: 'center', fontSize: 9, margin: [20, 3, 0, 0], bold: true },
              { text: transferencia.equipoDestino?.nombre || '', alignment: 'center', fontSize: 8, margin: [20, 0, 0, 0], italics: true }
            ]
          }
        ],
        margin: [0, 0, 0, 20]
      },
      // Segunda fila: Directivo Liga y Jugador
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: '\n\n', margin: [0, 0, 0, 3] },
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1 }], margin: [0, 0, 20, 0] },
              { text: 'Directivo Liga', alignment: 'center', fontSize: 9, margin: [0, 3, 20, 0], bold: true },
              { text: liga?.nombre || '', alignment: 'center', fontSize: 8, margin: [0, 0, 20, 0], italics: true }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: '\n\n', margin: [0, 0, 0, 3] },
              { canvas: [{ type: 'line', x1: 20, y1: 0, x2: 240, y2: 0, lineWidth: 1 }], margin: [20, 0, 0, 0] },
              { text: 'Jugador', alignment: 'center', fontSize: 9, margin: [20, 3, 0, 0], bold: true },
              { text: `${transferencia.jugador?.nombre || ''} ${transferencia.jugador?.apellido || ''}`, alignment: 'center', fontSize: 8, margin: [20, 0, 0, 0], italics: true }
            ]
          }
        ]
      }
    ];
  }

  /**
   * Formatea el estado para mostrar en el PDF
   */
  private formatEstado(estado: string): string {
    const estados: { [key: string]: string } = {
      'pendiente': 'PENDIENTE',
      'aprobado': 'APROBADO',
      'rechazado': 'RECHAZADO'
    };
    return estados[estado] || estado.toUpperCase();
  }

  /**
   * Retorna el color según el estado
   */
  private getColorEstado(estado: string): string {
    const colores: { [key: string]: string } = {
      'pendiente': '#f39c12',
      'aprobado': '#27ae60',
      'rechazado': '#e74c3c'
    };
    return colores[estado] || '#000000';
  }
}
