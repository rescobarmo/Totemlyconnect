-- ============================================================
-- MiniFood - PostgreSQL Migration
-- Migrado desde MySQL - Julio 2026
-- ============================================================

-- Eliminar tablas en orden inverso de dependencias (si existen)
DROP TABLE IF EXISTS pagos_parciales CASCADE;
DROP TABLE IF EXISTS detalle_pedidos CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS mesas CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Eliminar tipos ENUM previos (si existen)
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS mesa_estado CASCADE;
DROP TYPE IF EXISTS pedido_estado CASCADE;
DROP TYPE IF EXISTS pago_metodo CASCADE;
DROP TYPE IF EXISTS pago_tipo_division CASCADE;
DROP TYPE IF EXISTS pago_estado CASCADE;

-- ============================================================
-- TIPOS ENUM
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'mesero');
CREATE TYPE mesa_estado AS ENUM ('libre', 'ocupada', 'cuenta_cerrada');
CREATE TYPE pedido_estado AS ENUM ('abierto', 'entregado', 'cerrado', 'cancelado');
CREATE TYPE pago_metodo AS ENUM ('efectivo', 'tarjeta', 'transferencia');
CREATE TYPE pago_tipo_division AS ENUM ('equitativa', 'por_items', 'personalizada');
CREATE TYPE pago_estado AS ENUM ('pendiente', 'aprobado', 'rechazado');

-- ============================================================
-- USUARIOS (meseros y admin)
-- ============================================================

CREATE TABLE users (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  role        user_role DEFAULT 'mesero',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email ON users (email);

-- ============================================================
-- CATEGORÍAS de productos
-- ============================================================

CREATE TABLE categorias (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  icono       VARCHAR(50) DEFAULT NULL,
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTOS
-- ============================================================

CREATE TABLE productos (
  id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  categoria_id  INTEGER NOT NULL,
  nombre        VARCHAR(200) NOT NULL,
  precio        NUMERIC(10,2) NOT NULL,
  imagen        VARCHAR(255) DEFAULT NULL,
  activo        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_producto_categoria
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_productos_categoria ON productos (categoria_id);
CREATE INDEX idx_productos_activo ON productos (activo) WHERE activo = TRUE;

-- ============================================================
-- MESAS
-- ============================================================

CREATE TABLE mesas (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero      INTEGER NOT NULL,
  estado      mesa_estado DEFAULT 'libre',
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_mesas_numero UNIQUE (numero)
);

CREATE INDEX idx_mesas_estado ON mesas (estado);

-- ============================================================
-- PEDIDOS
-- ============================================================

CREATE TABLE pedidos (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mesa_id     INTEGER NOT NULL,
  user_id     INTEGER NOT NULL,
  estado      pedido_estado DEFAULT 'abierto',
  total       NUMERIC(10,2) DEFAULT 0.00,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_pedido_mesa
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_pedido_usuario
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_pedidos_mesa ON pedidos (mesa_id);
CREATE INDEX idx_pedidos_estado ON pedidos (estado);
CREATE INDEX idx_pedidos_user ON pedidos (user_id);
CREATE INDEX idx_pedidos_abiertos ON pedidos (mesa_id, estado) WHERE estado = 'abierto';

-- ============================================================
-- DETALLE DEL PEDIDO (ítems individuales)
-- ============================================================

CREATE TABLE detalle_pedidos (
  id                INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id         INTEGER NOT NULL,
  producto_id       INTEGER NOT NULL,
  cantidad          INTEGER NOT NULL DEFAULT 1,
  precio_unitario   NUMERIC(10,2) NOT NULL,
  subtotal          NUMERIC(10,2) NOT NULL,
  entregado         BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_detalle_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_detalle_producto
    FOREIGN KEY (producto_id) REFERENCES productos(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_detalle_pedido ON detalle_pedidos (pedido_id);
CREATE INDEX idx_detalle_producto ON detalle_pedidos (producto_id);

-- ============================================================
-- PAGOS PARCIALES (cuentas divididas)
-- ============================================================

CREATE TABLE pagos_parciales (
  id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id           INTEGER NOT NULL,
  monto               NUMERIC(10,2) NOT NULL,
  metodo              pago_metodo DEFAULT 'tarjeta',
  tipo_division       pago_tipo_division DEFAULT 'equitativa',
  items_ids           JSONB DEFAULT NULL,
  estado              pago_estado DEFAULT 'pendiente',
  transaccion_id      VARCHAR(100) DEFAULT NULL,
  mensaje_respuesta   VARCHAR(255) DEFAULT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_pago_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_pagos_pedido ON pagos_parciales (pedido_id);
CREATE INDEX idx_pagos_estado ON pagos_parciales (estado);
CREATE INDEX idx_pagos_items_gin ON pagos_parciales USING GIN (items_ids) WHERE items_ids IS NOT NULL;
CREATE INDEX idx_pagos_created ON pagos_parciales (created_at DESC);

-- ============================================================
-- HISTORIAL DE PEDIDOS (cambios de estado en tiempo real)
-- ============================================================

CREATE TABLE historial_pedido (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pedido_id       INTEGER NOT NULL,
  user_id         INTEGER NOT NULL,
  estado_anterior pedido_estado,
  estado_nuevo    pedido_estado NOT NULL,
  observacion     VARCHAR(500) DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_historial_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_historial_usuario
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_historial_pedido ON historial_pedido (pedido_id);
CREATE INDEX idx_historial_created ON historial_pedido (created_at DESC);
CREATE INDEX idx_historial_estado ON historial_pedido (estado_nuevo);

-- ============================================================
-- HISTORIAL DE MESAS (cambios de estado de mesa)
-- ============================================================

CREATE TABLE historial_mesa (
  id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  mesa_id         INTEGER NOT NULL,
  user_id         INTEGER DEFAULT NULL,
  estado_anterior mesa_estado,
  estado_nuevo    mesa_estado NOT NULL,
  pedido_id       INTEGER DEFAULT NULL,
  observacion     VARCHAR(500) DEFAULT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_historial_mesa
    FOREIGN KEY (mesa_id) REFERENCES mesas(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_historial_mesa_usuario
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_historial_mesa_pedido
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX idx_historial_mesa ON historial_mesa (mesa_id);
CREATE INDEX idx_historial_mesa_created ON historial_mesa (created_at DESC);

-- ============================================================
-- ÍNDICES EXTRA PARA DASHBOARDS / HISTORIAL
-- ============================================================

CREATE INDEX idx_pedidos_created ON pedidos (created_at DESC);

-- ============================================================
-- TRIGGER: Auto-update updated_at en todas las tablas que lo necesitan
-- ============================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_pedidos_updated
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_pagos_updated
  BEFORE UPDATE ON pagos_parciales
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================
-- FUNCIÓN: Recalcular total del pedido al modificar detalles
-- ============================================================

CREATE OR REPLACE FUNCTION recalcular_total_pedido()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE pedidos
  SET total = COALESCE((
    SELECT SUM(subtotal)
    FROM detalle_pedidos
    WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
  ), 0)
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalcular_total_insert
  AFTER INSERT ON detalle_pedidos
  FOR EACH ROW EXECUTE FUNCTION recalcular_total_pedido();

CREATE TRIGGER trg_recalcular_total_update
  AFTER UPDATE ON detalle_pedidos
  FOR EACH ROW EXECUTE FUNCTION recalcular_total_pedido();

CREATE TRIGGER trg_recalcular_total_delete
  AFTER DELETE ON detalle_pedidos
  FOR EACH ROW EXECUTE FUNCTION recalcular_total_pedido();

-- ============================================================
-- FUNCIÓN: Actualizar estado de mesa al crear/cerrar pedido
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_estado_mesa()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'abierto' AND (OLD IS NULL OR OLD.estado IS DISTINCT FROM 'abierto') THEN
    UPDATE mesas SET estado = 'ocupada' WHERE id = NEW.mesa_id;
  ELSIF NEW.estado IN ('cerrado', 'cancelado') THEN
    -- Solo poner libre si no hay otros pedidos abiertos en la misma mesa
    UPDATE mesas
    SET estado = 'libre'
    WHERE id = NEW.mesa_id
      AND NOT EXISTS (
        SELECT 1 FROM pedidos
        WHERE mesa_id = NEW.mesa_id
          AND estado = 'abierto'
          AND id != NEW.id
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estado_mesa
  AFTER INSERT OR UPDATE OF estado ON pedidos
  FOR EACH ROW EXECUTE FUNCTION actualizar_estado_mesa();

-- ============================================================
-- FUNCIÓN: Registrar cambios de estado de pedidos en historial
-- ============================================================

CREATE OR REPLACE FUNCTION log_cambio_estado_pedido()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD IS NULL OR NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO historial_pedido (pedido_id, user_id, estado_anterior, estado_nuevo)
    VALUES (
      NEW.id,
      NEW.user_id,
      CASE WHEN OLD IS NULL THEN NULL ELSE OLD.estado END,
      NEW.estado
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_estado_pedido
  AFTER INSERT OR UPDATE OF estado ON pedidos
  FOR EACH ROW EXECUTE FUNCTION log_cambio_estado_pedido();

-- ============================================================
-- FUNCIÓN: Registrar cambios de estado de mesas en historial
-- ============================================================

CREATE OR REPLACE FUNCTION log_cambio_estado_mesa()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD IS NULL OR NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO historial_mesa (mesa_id, estado_anterior, estado_nuevo)
    VALUES (
      NEW.id,
      CASE WHEN OLD IS NULL THEN NULL ELSE OLD.estado END,
      NEW.estado
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_estado_mesa
  AFTER INSERT OR UPDATE OF estado ON mesas
  FOR EACH ROW EXECUTE FUNCTION log_cambio_estado_mesa();

-- ============================================================
-- DATOS DE PRUEBA
-- ============================================================

INSERT INTO categorias (nombre, icono) VALUES
  ('Café', '☕'),
  ('Bebidas', '🥤'),
  ('Sándwiches', '🥪'),
  ('Postres', '🍰'),
  ('Jugos Naturales', '🧃');

INSERT INTO productos (categoria_id, nombre, precio) VALUES
  (1, 'Espresso', 2500),
  (1, 'Cappuccino', 3500),
  (1, 'Latte', 3500),
  (1, 'Mocaccino', 4000),
  (1, 'Americano', 2800),
  (1, 'Café Helado', 3800),
  (2, 'Coca-Cola', 2000),
  (2, 'Sprite', 2000),
  (2, 'Agua Mineral', 1500),
  (2, 'Cerveza Artesanal', 5000),
  (2, 'Té Helado', 2500),
  (3, 'Sándwich Jamón Queso', 5500),
  (3, 'Sándwich Churrasco', 6500),
  (3, 'Sándwich Vegetariano', 5800),
  (3, 'Club House', 7200),
  (3, 'Sándwich Pollo', 6200),
  (4, 'Cheesecake', 4500),
  (4, 'Brownie', 3500),
  (4, 'Tiramisú', 5200),
  (4, 'Helado (2 bolas)', 3800),
  (4, 'Flan Casero', 4000),
  (5, 'Jugo Naranja Natural', 3000),
  (5, 'Jugo de Frutilla', 3200),
  (5, 'Jugo Verde', 3500),
  (5, 'Limonada Natural', 2800);

INSERT INTO mesas (numero) VALUES
  (1),(2),(3),(4),(5),(6),(7),(8),(9),(10);

INSERT INTO users (name, email, password, role) VALUES
  ('Admin', 'admin@minifood.com', '$2a$12$Ga71fPEuaD3f0PY3S9HQzuyh2OTcvDH4lvJ/3dqeQV2doqY87q.VG', 'admin');
