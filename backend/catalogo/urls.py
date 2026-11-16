from rest_framework.routers import SimpleRouter

from .views import CategoriaViewSet, MarcaViewSet, ProductoViewSet

router = SimpleRouter()
router.register('categorias', CategoriaViewSet, basename='categoria')
router.register('marcas', MarcaViewSet, basename='marca')
router.register('productos', ProductoViewSet, basename='producto')

urlpatterns = router.urls
