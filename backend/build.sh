#!/usr/bin/env bash
# Lo ejecuta Render en cada despliegue del backend.
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input

# Carga el catálogo y los pedidos de demostración solo si la base está vacía.
if [ "${CARGAR_DATOS_DEMO:-True}" = "True" ]; then
  python manage.py cargar_datos_demo
fi
