# Checklist de Despliegue - MiniFood

## Antes de subir

- [ ] Actualizar `config.php` con credenciales del hosting
- [ ] Verificar que `install.sql` esté actualizado
- [ ] Probar la aplicación localmente una última vez
- [ ] Hacer backup de la base de datos local (si tiene datos importantes)

## En el hosting

### 1. Crear base de datos
- [ ] Acceder a cPanel
- [ ] Ir a MySQL Databases
- [ ] Crear base de datos (ej: `usuario_minifood`)
- [ ] Crear usuario con contraseña segura
- [ ] Asignar usuario a la base de datos con todos los privilegios
- [ ] Anotar: nombre BD, usuario, contraseña

### 2. Subir archivos
- [ ] Conectar por FTP o usar File Manager
- [ ] Subir todos los archivos a `public_html/`
- [ ] Verificar estructura de carpetas
- [ ] NO subir: `.git/`, `node_modules/`, archivos temporales

### 3. Instalar base de datos (Opción A - Automática)
- [ ] Acceder a `https://tudominio.com/install.php`
- [ ] Ingresar credenciales de la BD
- [ ] Ejecutar instalación
- [ ] Verificar mensaje de éxito
- [ ] **ELIMINAR `install.php` e `install.sql`**

### 3. Instalar base de datos (Opción B - Manual)
- [ ] Abrir phpMyAdmin en cPanel
- [ ] Seleccionar la base de datos creada
- [ ] Ir a pestaña Importar
- [ ] Seleccionar archivo `install.sql`
- [ ] Ejecutar importación
- [ ] Verificar que se crearon todas las tablas

### 4. Configurar aplicación
- [ ] Editar `config.php` con credenciales correctas
- [ ] Guardar cambios
- [ ] Verificar permisos: archivos 644, carpetas 755

### 5. Verificar instalación
- [ ] Acceder a `https://tudominio.com`
- [ ] Probar login con `admin@minifood.com` / `123456`
- [ ] Verificar que se cargan las mesas
- [ ] Crear un pedido de prueba
- [ ] Agregar productos
- [ ] Verificar que funciona el flujo completo

## Post-instalación

### Seguridad
- [ ] **ELIMINAR `install.php`** del servidor
- [ ] **ELIMINAR `install.sql`** del servidor
- [ ] **ELIMINAR `config.example.php`** del servidor
- [ ] Cambiar contraseña del usuario admin
- [ ] Activar HTTPS/SSL en el hosting
- [ ] Verificar que `.htaccess` protege carpetas sensibles

### Optimización
- [ ] Configurar caché en `.htaccess` (ya incluido)
- [ ] Activar compresión GZIP (ya incluido)
- [ ] Verificar que mod_rewrite está activo

### Pruebas finales
- [ ] Probar flujo completo: mesas → pedidos → pago
- [ ] Verificar que los items entregados no se pueden eliminar
- [ ] Probar división de cuenta
- [ ] Verificar que la mesa se libera correctamente

## Solución de problemas

### Error 500
- [ ] Verificar `.htaccess` existe
- [ ] Verificar permisos de archivos (644) y carpetas (755)
- [ ] Revisar logs de error en cPanel

### Error de conexión BD
- [ ] Verificar credenciales en `config.php`
- [ ] Confirmar que el usuario tiene permisos sobre la BD
- [ ] Verificar que el host sea `localhost`

### Rutas no funcionan
- [ ] Verificar que `mod_rewrite` está habilitado
- [ ] Confirmar que `AllowOverride All` está configurado
- [ ] Contactar soporte del hosting

### Sesiones no funcionan
- [ ] Verificar que `session_start()` se ejecuta
- [ ] Revisar permisos de la carpeta de sesiones de PHP
- [ ] Verificar configuración de PHP en el hosting

## Credenciales por defecto

- **Usuario**: admin@minifood.com
- **Contraseña**: 123456

⚠️ **IMPORTANTE**: Cambiar inmediatamente después de instalar
