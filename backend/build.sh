#!/usr/bin/env bash
# Lo ejecuta Render en cada despliegue del backend.
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate --no-input

# Carga el catálogo y los pedidos de demostración solo si la base está vacía.
if [ "${CARGAR_DATOS_DEMO:-True}" = "True" ]; then
  if python manage.py shell -c "from catalogo.models import Producto; import sys; sys.exit(1 if Producto.objects.exists() else 0)"; then
    python manage.py cargar_datos_demo
  else
    echo "La base ya tiene datos: no se cargan los de demostración."
  fi
fi
