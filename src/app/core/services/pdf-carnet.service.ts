import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { JugadorCampeonato } from '../../modules/jugador-campeonatos/jugador-campeonato.model';

// Configurar fuentes
(pdfMake as any).vfs = pdfFonts;

@Injectable({
  providedIn: 'root'
})
export class PdfCarnetService {

  // =============================================
  // FONDOS DISPONIBLES PARA EL CARNET
  // Para cambiar el fondo, modificar fondoActivo
  // =============================================
  private readonly FONDO_1_ORIGINAL = 'https://res.cloudinary.com/dqmc8b9j5/image/upload/v1772380181/fondoCarnet_sbbhmh.jpg';
  private readonly FONDO_2_AZUL_ICONOS = 'https://res.cloudinary.com/dqmc8b9j5/image/upload/v1773373697/fondo-azul-del-f%C3%BAtbol-con-los-diversos-iconos-y-futbolistas-109474249_pmanty.jpg';
  private readonly FONDO_3_GEOMETRICO = 'https://res.cloudinary.com/dqmc8b9j5/image/upload/v1773373697/football-soccer-background-design-soccer-ball-illustration-lines-and-stripes-style-geometric-decoration-sport-background-with-soccer-ball-vector_tf9xla.jpg';

  // 👇 CAMBIAR AQUÍ para seleccionar el fondo activo
  private fondoActivo = this.FONDO_3_GEOMETRICO;
  // =============================================

  constructor() { }

  /**
   * Genera y descarga el carnet de un jugador
   * @param jugadorCampeonato Datos del jugador habilitado
   */
  async generarCarnetIndividual(jugadorCampeonato: JugadorCampeonato): Promise<void> {
    // Usar el formato de 2 carnets por página incluso para un solo carnet
    const docDefinition = await this.construirDocumentoCarnetsMultiples([jugadorCampeonato]);
    const nombreArchivo = `CARNET_${jugadorCampeonato.jugador?.apellido}_${jugadorCampeonato.jugador?.nombre}_${jugadorCampeonato.campeonato?.nombre}.pdf`;
    pdfMake.createPdf(docDefinition).download(nombreArchivo);
  }

  /**
   * Abre el carnet en una nueva pestaña
   * @param jugadorCampeonato Datos del jugador habilitado
   */
  async abrirCarnetIndividual(jugadorCampeonato: JugadorCampeonato): Promise<void> {
    // Usar el formato de 2 carnets por página incluso para un solo carnet
    const docDefinition = await this.construirDocumentoCarnetsMultiples([jugadorCampeonato]);
    pdfMake.createPdf(docDefinition).open();
  }

  /**
   * Genera carnets de todos los jugadores de un equipo
   * @param jugadoresCampeonato Lista de jugadores habilitados del equipo
   */
  async generarCarnetsPorEquipo(jugadoresCampeonato: JugadorCampeonato[]): Promise<void> {
    if (!jugadoresCampeonato || jugadoresCampeonato.length === 0) {
      console.warn('No hay jugadores para generar carnets');
      return;
    }

    const primerJugador = jugadoresCampeonato[0];
    const nombreArchivo = `CARNETS_${primerJugador.equipo?.nombre}_${primerJugador.campeonato?.nombre}.pdf`;

    // Generar documentos individuales y combinarlos
    const docDefinition = await this.construirDocumentoCarnetsMultiples(jugadoresCampeonato);
    pdfMake.createPdf(docDefinition).download(nombreArchivo);
  }

  /**
   * Convierte una URL de imagen (Cloudinary) a base64
   * @param imageUrl URL de la imagen
   * @returns Promise con el string base64 o null si falla
   */
  private async obtenerImagenBase64(imageUrl: string | undefined): Promise<string | null> {
    if (!imageUrl) {
      return null;
    }

    try {
      console.log('Cargando imagen:', imageUrl);
      const response = await fetch(imageUrl, {
        mode: 'cors',
        cache: 'no-cache'
      });
      if (!response.ok) {
        console.warn('No se pudo cargar la imagen:', imageUrl, 'Status:', response.status);
        return null;
      }

      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log('Imagen cargada exitosamente:', imageUrl);
          resolve(reader.result as string);
        };
        reader.onerror = (error) => {
          console.error('Error al leer imagen:', imageUrl, error);
          reject(error);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al convertir imagen a base64:', imageUrl, error);
      return null;
    }
  }

  /**
   * Construye el documento PDF para múltiples carnets (2 por página)
   * @param jugadoresCampeonato Lista de jugadores habilitados
   * @returns Definición del documento para pdfmake
   */
  private async construirDocumentoCarnetsMultiples(jugadoresCampeonato: JugadorCampeonato[]): Promise<any> {
    const contenidosCompletos: any[] = [];

    // Cargar imagen de fondo
    const imagenFondo = await this.obtenerImagenBase64(this.fondoActivo);

    // Pre-cargar todas las imágenes de todos los jugadores
    console.log('Cargando imágenes de', jugadoresCampeonato.length, 'jugadores...');
    const imagenesJugadores: Array<{
      logoLiga: string | null;
      fotoJugador: string | null;
      logoEquipo: string | null;
    }> = [];

    for (const jugador of jugadoresCampeonato) {
      const [logoLiga, fotoJugador, logoEquipo] = await Promise.all([
        this.obtenerImagenBase64(jugador.campeonato?.liga?.imagen),
        this.obtenerImagenBase64(jugador.jugador?.imagen),
        this.obtenerImagenBase64(jugador.equipo?.imagen)
      ]);

      imagenesJugadores.push({ logoLiga, fotoJugador, logoEquipo });
      console.log(`Jugador ${jugador.jugador?.nombre} ${jugador.jugador?.apellido} - Foto cargada:`, !!fotoJugador);
    }

    console.log('Todas las imágenes cargadas. Construyendo carnets...');

    // 2 carnets por página, centrados uno debajo del otro (igual que ejemplo del proveedor)
    for (let i = 0; i < jugadoresCampeonato.length; i += 2) {
      const jugador1 = jugadoresCampeonato[i];
      const imagenes1 = imagenesJugadores[i];
      const jugador2 = jugadoresCampeonato[i + 1]; // Puede ser undefined si es el último
      const imagenes2 = imagenesJugadores[i + 1];

      const contenido1 = this.construirContenidoCarnet(
        jugador1,
        imagenes1.logoLiga,
        imagenes1.fotoJugador,
        imagenes1.logoEquipo,
        imagenFondo
      );

      const bloqueContenido: any[] = [
        // Carnet 1: desplazado ~3cm a la izq, bajado 1mm
        {
          columns: [
            { width: 66.83, text: '' },
            { stack: [contenido1], width: 238.15 },
            { width: '*', text: '' }
          ],
          margin: [0, 2.83, 0, 0],
          unbreakable: true
        }
      ];

      if (jugador2 && imagenes2) {
        const contenido2 = this.construirContenidoCarnet(
          jugador2,
          imagenes2.logoLiga,
          imagenes2.fotoJugador,
          imagenes2.logoEquipo,
          imagenFondo
        );

        // Espacio entre los 2 carnets: reducido 1mm para subir el carnet 2
        bloqueContenido.push({ text: '', margin: [0, 17.17, 0, 0] });

        // Carnet 2: desplazado ~3cm a la izq, subido 1mm
        bloqueContenido.push({
          columns: [
            { width: 66.83, text: '' },
            { stack: [contenido2], width: 238.15 },
            { width: '*', text: '' }
          ],
          unbreakable: true
        });
      }

      contenidosCompletos.push({
        stack: bloqueContenido,
        // Salto de página después de cada grupo de 2, excepto el último
        pageBreak: i + 2 < jugadoresCampeonato.length ? 'after' : undefined
      });
    }

    return {
      pageSize: 'A4',              // 210 x 297 mm
      pageOrientation: 'portrait',
      pageMargins: [28, 29, 28, 40],  // top reducido 4mm (~11pts), carnets desplazados ~3cm a la izq
      content: contenidosCompletos
    };
  }

  /**
   * Retorna un tamaño de fuente adaptable según la longitud del texto.
   * Evita que nombres largos rompan el layout del carnet.
   * @param texto Texto a evaluar
   * @param tamanoBase Tamaño base cuando el texto es corto
   * @param tamanoMedio Tamaño cuando el texto es mediano (26-32 chars)
   * @param tamanoLargo Tamaño cuando el texto es largo (>32 chars)
   */
  private getFontSizeAdaptable(texto: string, tamanoBase: number, tamanoMedio: number, tamanoLargo: number): number {
    if (texto.length > 32) return tamanoLargo;
    if (texto.length > 25) return tamanoMedio;
    return tamanoBase;
  }

  /**
   * Construye el contenido visual del carnet
   * @param jugadorCampeonato Datos del jugador
   * @param logoLiga Logo de la liga en base64
   * @param fotoJugador Foto del jugador en base64
   * @param logoEquipo Logo del equipo en base64
   * @param imagenFondo Imagen de fondo en base64
   * @returns Objeto para pdfmake con el carnet
   */
  private construirContenidoCarnet(
    jugadorCampeonato: JugadorCampeonato,
    logoLiga: string | null,
    fotoJugador: string | null,
    logoEquipo: string | null,
    imagenFondo: string | null = null
  ): any {
    const nombreCompleto = `${jugadorCampeonato.jugador?.nombre || ''} ${jugadorCampeonato.jugador?.apellido || ''}`.trim();
    const cedula = jugadorCampeonato.jugador?.cedula || 'N/A';
    const numeroCancha = jugadorCampeonato.numeroCancha || 'N/A';
    const nombreLiga = jugadorCampeonato.campeonato?.liga?.nombre || '';
    const nombreCampeonato = jugadorCampeonato.campeonato?.nombre || '';
    const nombreEquipo = jugadorCampeonato.equipo?.nombre || '';

    const contenido: any[] = [];

    // ENCABEZADO: Nombre de la liga/campeonato (centrado) y Logo (derecha)
    const encabezado: any = {
      columns: [
        {
          stack: [
            { text: nombreLiga, fontSize: 12, bold: true, alignment: 'center', color: 'white' },
            { text: nombreCampeonato, fontSize: 10, bold: true, alignment: 'center', margin: [0, 0.5, 0, 0], color: 'white' }
          ],
          width: '*'
        }
      ],
      margin: [2, 1, 2, 1]
    };

    if (logoLiga) {
      encabezado.columns.push({
        image: logoLiga,
        width: 28,        // reducido de 32 → 28 para que no se salga del borde del carnet
        height: 28,       // reducido de 32 → 28 proporcional
        alignment: 'right',
        margin: [0, 2, 3, 0]  // [izq, top, der, bot]: 3px de separación del borde derecho, 2px del borde superior
      });
    }

    contenido.push(encabezado);

    // Línea separadora sutil
    contenido.push({
      canvas: [
        {
          type: 'line',
          x1: 0, y1: 0,
          x2: 230, y2: 0,
          lineWidth: 0.3,
          lineColor: 'white'
        }
      ],
      margin: [0, 1, 0, 1]
    });

    // SECCIÓN CENTRAL: Número, Foto y Cédula
    const seccionCentral: any = {
      columns: [
        // Columna izquierda: Número de camiseta (movido hacia la derecha con margin)
        {
          stack: [
            { text: numeroCancha, fontSize: 27, bold: true, color: 'white', alignment: 'center' }
          ],
          width: 42,
          margin: [8, 15, 0, 0]  // Margin izquierdo para mover a la derecha
        },
        // Columna central: Foto del jugador
        {
          stack: fotoJugador ? [
            {
              image: fotoJugador,
              width: 50,
              height: 50,
              alignment: 'center'
            }
          ] : [
            {
              text: '[FOTO]',
              fontSize: 8,
              alignment: 'center',
              color: 'white',
              margin: [0, 20, 0, 20]
            }
          ],
          width: '*',
          alignment: 'center',
          margin: [-4, 0, -4, 0]  // Ajuste para centrar mejor
        },
        // Columna derecha: Cédula (manteniendo width completo)
        {
          stack: [
            { text: 'Cédula:', fontSize: 8, alignment: 'center', margin: [0, 13, 0, 0], color: 'white' },
            { text: cedula, fontSize: 11, bold: true, alignment: 'center', margin: [0, 1, 0, 0], color: 'white' }
          ],
          width: 68,
          margin: [-8, 0, 0, 0]  // Margin izquierdo negativo para acercar al centro
        }
      ],
      margin: [2, 2, 2, 2]
    };

    contenido.push(seccionCentral);

    // NOMBRE DEL JUGADOR con fondo semitransparente para mejor legibilidad
    contenido.push({
      stack: [
        // Rectángulo de fondo negro semitransparente
        {
          canvas: [
            {
              type: 'rect',
              x: 0,
              y: 0,
              w: 230,
              h: 18,
              color: 'black',
              fillOpacity: 0.7
            }
          ],
          margin: [0, 2, 0, 0]
        },
        // Texto del nombre sobre el fondo (fontSize adaptable según longitud)
        {
          text: nombreCompleto.toUpperCase(),
          fontSize: this.getFontSizeAdaptable(nombreCompleto, 12, 10, 8),
          bold: true,
          alignment: 'center',
          margin: [0, -16, 0, 2],
          color: 'white'
        }
      ]
    });

    // Línea separadora sutil
    contenido.push({
      canvas: [
        {
          type: 'line',
          x1: 0, y1: 0,
          x2: 230, y2: 0,
          lineWidth: 0.3,
          lineColor: 'white'
        }
      ],
      margin: [0, 1, 0, 1]
    });

    // PIE: Logo y nombre del equipo (izquierda)
    const pie: any = {
      columns: [],
      margin: [2, 1, 0, 0]
    };

    if (logoEquipo) {
      pie.columns.push({
        image: logoEquipo,
        width: 28,
        height: 28
      });
    }

    pie.columns.push({
      text: nombreEquipo.toUpperCase(),
      fontSize: this.getFontSizeAdaptable(nombreEquipo, 13, 11, 9),  // adaptable según longitud
      bold: true,
      margin: [logoEquipo ? 2 : 0, 7, 0, 0],
      color: 'white'
    });

    contenido.push(pie);

    // Si hay imagen de fondo, retornar un objeto con el fondo y el contenido superpuesto
    if (imagenFondo) {
      return {
        stack: [
          {
            image: imagenFondo,
            width: 232.17,
            height: 147.33
          },
          {
            stack: contenido,
            margin: [0, -147.33, 0, 0]
          }
        ],
        // Forzar que todo el carnet ocupe exactamente 147.33 de altura
        margin: [0, 0, 0, 0],
        height: 147.33
      };
    }

    // Sin fondo, retornar el contenido simple
    return {
      stack: contenido
    };
  }
}
