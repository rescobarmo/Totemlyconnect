declare module "escpos" {
  import { EventEmitter } from "events";

  class Printer extends EventEmitter {
    constructor(adapter: any, options?: { encoding?: string; width?: number });
    model(model: string): this;
    text(content: string, encoding?: string): this;
    println(content: string): this;
    pureText(content: string, encoding?: string): this;
    drawLine(): this;
    align(align: "left" | "center" | "right"): this;
    style(type: string): this;
    size(width: number, height: number): this;
    feed(n?: number): this;
    cut(part?: boolean, feed?: number): this;
    flush(callback?: (err: Error) => void): this;
    close(callback?: (err: Error) => void, options?: any): any;
    cashdraw(pin?: number): this;
    beep(n: number, t: number): this;
    encode(encoding: string): this;
    font(family: string): this;
    newLine(): this;
    table(data: string[], encoding?: string): this;
    tableCustom(
      data: Array<{ text: string; align?: string; width?: number; style?: string }>,
      options?: { size?: number[]; encoding?: string }
    ): this;
    raw(data: Buffer | string): this;
    color(color: number): this;
    setReverseColors(bool: boolean): this;
  }

  interface PrinterModule {
    new (adapter: any, options?: any): Printer;
    Network: any;
  }

  const Printer: PrinterModule;
  export = Printer;
}

declare module "escpos-network" {
  class Network extends require("events") {
    constructor(address: string, port?: number);
    open(callback: (err: Error | null, device: any) => void): this;
    write(data: Buffer, callback?: (err: Error | null) => void): this;
    close(callback?: (err: Error | null) => void): this;
  }

  export = Network;
}
