# Usamos PyMySQL como conector de MySQL. Django espera el módulo MySQLdb (de mysqlclient),
# así que PyMySQL se registra con ese nombre y declara una versión compatible.
import pymysql

pymysql.version_info = (2, 2, 1, 'final', 0)
pymysql.install_as_MySQLdb()
