-- Crea la base de datos y el usuario de MySQL para Semillas del Valle.
-- Ejecútalo una sola vez como root (por ejemplo, en MySQL Workbench).
-- Antes, cambia ESCRIBE_UNA_CONTRASEÑA por una contraseña tuya y ponla
-- también en backend/.env (DB_PASSWORD).

CREATE DATABASE IF NOT EXISTS semillero
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'semillero'@'localhost' IDENTIFIED BY 'ESCRIBE_UNA_CONTRASEÑA';
CREATE USER IF NOT EXISTS 'semillero'@'127.0.0.1' IDENTIFIED BY 'ESCRIBE_UNA_CONTRASEÑA';

GRANT ALL PRIVILEGES ON semillero.* TO 'semillero'@'localhost';
GRANT ALL PRIVILEGES ON semillero.* TO 'semillero'@'127.0.0.1';

-- Permite que "python manage.py test" cree y borre su base de pruebas.
GRANT ALL PRIVILEGES ON test_semillero.* TO 'semillero'@'localhost';
GRANT ALL PRIVILEGES ON test_semillero.* TO 'semillero'@'127.0.0.1';

FLUSH PRIVILEGES;
