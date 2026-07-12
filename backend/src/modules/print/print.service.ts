import escpos from "escpos";
import escposNetwork from "escpos-network";
import { env } from "../../config/env";

(escpos as any).Network = escposNetwork;

function padRight(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return str + " ".repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  if (str.length >= len) return str.substring(0, len);
  return " ".repeat(len - str.length) + str;
}

export class PrintService {
  static async imprimirPedido(pedido: {
    id: number;
    mesaNumero: number;
    userName: string;
    createdAt: Date | string;
    detalles: Array<{ cantidad: number; producto: { nombre: string } }>;
  }): Promise<boolean> {
    try {
      const device = new escposNetwork(env.PRINTER_IP, env.PRINTER_PORT) as any;
      const printer = new escpos(device, { encoding: "GB18030", width: 48 });

      return new Promise((resolve, reject) => {
        device.open((err: Error | null) => {
          if (err) {
            console.error("[Print] Error conectando impresora:", err.message);
            return reject(err);
          }

          const fecha = new Date(pedido.createdAt);
          const fechaStr = fecha.toLocaleDateString("es-CL");
          const horaStr = fecha.toLocaleTimeString("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const WIDTH = 48;

          // Header
          printer
            .align("center")
            .size(1, 1)
            .text("TOTEMCONNECT")
            .size(0, 0)
            .text(padRight("", WIDTH))
            .align("center")
            .size(1, 1)
            .text(`MESA ${pedido.mesaNumero}`)
            .size(0, 0);

          // Info
          printer
            .align("left")
            .text(`${fechaStr}  ${horaStr}`)
            .text(`Mesero: ${pedido.userName}`)
            .drawLine();

          // Items
          for (const item of pedido.detalles) {
            const qty = `${item.cantidad}x`;
            const name = item.producto.nombre;
            printer.text(`  ${padRight(qty, 5)}${name}`);
          }

          // Footer
          printer
            .drawLine()
            .align("center")
            .size(1, 1)
            .text(`PEDIDO #${pedido.id}`)
            .size(0, 0)
            .feed(3)
            .cut();

          printer.close((closeErr: Error | null) => {
            if (closeErr) {
              console.error("[Print] Error cerrando conexión:", closeErr.message);
              return reject(closeErr);
            }
            console.log(`[Print] Pedido #${pedido.id} impreso correctamente`);
            resolve(true);
          });
        });
      });
    } catch (err: any) {
      console.error("[Print] Error imprimiendo:", err.message);
      return false;
    }
  }
}
