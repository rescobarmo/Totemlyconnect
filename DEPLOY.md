# MiniFood - Guía de Instalación en Hosting Compartido

## Requisitos del Hosting
- PHP 7.4 o superior
- MySQL 5.7+ o MariaDB 10.3+
- Mod_rewrite habilitado (Apache)
- Extensiones PHP: PDO, PDO_MySQL, JSON

## Método 1: Instalación Automática (Recomendado)

### Paso 1: Crear base de datos en cPanel
1. Accede a tu cPanel
2. Ve a **MySQL Databases**
3. Crea una nueva base de datos (ejemplo: `usuario_minifood`)
4. Crea un usuario y asígnalo a la base de datos
5. Anota: nombre BD, usuario y contraseña

### Paso 2: Subir archivos
Sube TODOS los archivos del proyecto a `public_html/` (o subdominio) vía FTP o File Manager

### Paso 3: Ejecutar instalador
1. Abre en navegador: `https://tudominio.com/install.php`
2. Ingresa las credenciales de la base de datos
3. Haz clic en "Instalar base de datos"
4. Actualiza `config.php` con los datos mostrados
5. **ELIMINA `install.php`** por seguridad

### Paso 4: Acceder a la aplicación
- URL: `https://tudominio.com`
- Usuario: `admin@minifood.com`
- Contraseña: `123456`

---

## Método 2: Instalación Manual

### Paso 1: Crear base de datos
Igual que en el método 1

### Paso 2: Importar SQL
1. Abre **phpMyAdmin** en cPanel
2. Selecciona tu base de datos
3. Ve a la pestaña **Importar**
4. Selecciona el archivo `install.sql`
5. Haz clic en **Importar**

### Paso 3: Configurar credenciales
Edita `config.php`:
```php
define("DB_HOST", "localhost");
define("DB_NAME", "usuario_minifood");
define("DB_USER", "usuario_admin");
define("DB_PASS", "tu_password_aqui");
```

### Paso 4: Subir archivos
Sube todos los archivos excepto:
- `.git/`
- `install.php` (si ya importaste el SQL)
- `install.sql` (si ya importaste el SQL)

---

## Solución de Problemas

### Error 500 - Internal Server Error
- Verifica que `.htaccess` esté subido
- Verifica que `mod_rewrite` esté habilitado en el hosting
- Revisa los permisos: archivos 644, carpetas 755

### Error de conexión a BD
- Verifica que el usuario tenga permisos sobre la base de datos
- Confirma que el host sea `localhost` (usual en hosting compartido)
- Revisa que la contraseña sea correcta

### Las rutas no funcionan
- Verifica que `AllowOverride All` esté configurado en Apache
- Contacta a soporte del hosting para habilitar mod_rewrite

---

## Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `config.php` | Credenciales de BD y configuración |
| `install.sql` | Script SQL para crear tablas |
| `install.php` | Instalador web automático |
| `.htaccess` | Configuración Apache y seguridad |

---

## Seguridad Post-Instalación

1. **ELIMINA** `install.php` e `install.sql` del servidor
2. Cambia la contraseña del usuario admin
3. Verifica que las carpetas `config/`, `models/`, `controllers/` estén protegidas
4. Activa HTTPS (SSL) en tu hosting

---

## Soporte

Si tienes problemas, verifica:
- [ ] PHP 7.4+ instalado
- [ ] Base de datos creada correctamente
- [ ] Credenciales correctas en config.php
- [ ] Archivos subidos completamente
- [ ] Permisos correctos (644/755)
