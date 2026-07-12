import { Router, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import XLSX from "xlsx";
import { ProductoService } from "./producto.service";
import { authMiddleware } from "../../common/middleware/auth.middleware";
import { adminMiddleware } from "../../common/middleware/admin.middleware";
import { AuthRequest } from "../../common/types";
import prisma from "../../config/database";

const router = Router();

const uploadDir = path.resolve(__dirname, "../../../../uploads/productos");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/", authMiddleware, async (_req, res: Response, next: NextFunction) => {
  try {
    const productos = await ProductoService.findAll(true);
    res.json({ success: true, data: productos });
  } catch (error) { next(error); }
});

router.get("/activos", authMiddleware, async (_req, res: Response, next: NextFunction) => {
  try {
    const productos = await ProductoService.findAll(false);
    res.json({ success: true, data: productos });
  } catch (error) { next(error); }
});

router.get("/agrupados", authMiddleware, async (_req, res: Response, next: NextFunction) => {
  try {
    const data = await ProductoService.findGrouped();
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.get("/:id", authMiddleware, async (req, res: Response, next: NextFunction) => {
  try {
    const prod = await ProductoService.findById(Number(req.params.id));
    res.json({ success: true, data: prod });
  } catch (error) { next(error); }
});

router.post("/", authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const prod = await ProductoService.create(req.body);
    res.status(201).json({ success: true, data: prod });
  } catch (error) { next(error); }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req, res: Response, next: NextFunction) => {
  try {
    const prod = await ProductoService.update(Number(req.params.id), req.body);
    res.json({ success: true, data: prod });
  } catch (error) { next(error); }
});

router.patch("/:id/toggle", authMiddleware, adminMiddleware, async (req, res: Response, next: NextFunction) => {
  try {
    const prod = await ProductoService.toggleActivo(Number(req.params.id));
    res.json({ success: true, data: prod });
  } catch (error) { next(error); }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res: Response, next: NextFunction) => {
  try {
    await ProductoService.remove(Number(req.params.id));
    res.json({ success: true, message: "Producto eliminado" });
  } catch (error) { next(error); }
});

router.post("/:id/imagen", authMiddleware, adminMiddleware, upload.single("imagen"), async (req, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No se envió archivo" });
      return;
    }
    const imageUrl = `/uploads/productos/${req.file.filename}`;
    const prod = await ProductoService.updateImage(Number(req.params.id), imageUrl);
    res.json({ success: true, data: prod });
  } catch (error) { next(error); }
});

router.post("/importar-excel", authMiddleware, adminMiddleware, upload.single("archivo"), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No se envió archivo" });
      return;
    }

    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    const resultados = { creados: 0, errores: 0, detalles: [] as any[] };

    for (const row of rows) {
      try {
        const nombre = (row["nombre"] || row["Nombre"] || "").toString().trim();
        const precio = parseFloat(row["precio"] || row["Precio"] || "0");
        const categoriaNombre = (row["categoria"] || row["Categoria"] || row["categoría"] || "").toString().trim();

        if (!nombre || !precio || !categoriaNombre) {
          resultados.errores++;
          resultados.detalles.push({ row, error: "Datos incompletos" });
          continue;
        }

        let categoria = await prisma.categoria.findFirst({ where: { nombre: categoriaNombre } });
        if (!categoria) {
          categoria = await prisma.categoria.create({ data: { nombre: categoriaNombre } });
        }

        await prisma.producto.create({
          data: {
            nombre,
            precio,
            categoriaId: categoria.id,
            activo: true,
          },
        });
        resultados.creados++;
      } catch (e: any) {
        resultados.errores++;
        resultados.detalles.push({ row, error: e.message });
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({ success: true, data: resultados });
  } catch (error) { next(error); }
});

export default router;
