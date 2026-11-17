"""
Pone las fotos a los productos de demostración que ya están en la base de datos
(por ejemplo, la del despliegue). Solo toca los productos que todavía no tienen foto.
"""

from django.db import migrations

# Copia fija de catalogo/fotos.py: una migración no debe depender de código que pueda cambiar.
FOTOS = {
    'Maracuyá amarillo': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/Passiflora_edulis_f._flavicarpa_Degener.jpg/500px-Passiflora_edulis_f._flavicarpa_Degener.jpg',
    'Papaya Tainung': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f2/Brassicales_-_Carica_papaya_-_5.jpg/500px-Brassicales_-_Carica_papaya_-_5.jpg',
    'Lulo de Castilla': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/54/Solanum_quitoense%2C_the_Naranjillo_%2811396994756%29.jpg/500px-Solanum_quitoense%2C_the_Naranjillo_%2811396994756%29.jpg',
    'Sandía Charleston Gray': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Cutted_watermelon_in_steel_plate.jpg/500px-Cutted_watermelon_in_steel_plate.jpg',
    'Melón Cantaloupe': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0f/Cantaloupe_2.jpg/500px-Cantaloupe_2.jpg',
    'Tomate chonto': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/be/Grape_tomatoes_on_the_vine_at_Ljubljana_Central_Market.JPG/500px-Grape_tomatoes_on_the_vine_at_Ljubljana_Central_Market.JPG',
    'Lechuga Batavia': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/81/Laitue_Batavia.jpg/500px-Laitue_Batavia.jpg',
    'Cebolla larga': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/98/HK_SYP_Best_of_Best_Vegetable_Peking_Welsh_onion_Allium_Aug-2012.JPG/500px-HK_SYP_Best_of_Best_Vegetable_Peking_Welsh_onion_Allium_Aug-2012.JPG',
    'Pimentón California Wonder': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2b/Green_Bell_Pepper.jpg/500px-Green_Bell_Pepper.jpg',
    'Cilantro': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/40/Koriander_%28Coriandrum_sativum%29_Frische_B%C3%BCndel%2C_beim_T%C3%BCrken_in_MA--Josef_Schlaghecken.jpg/500px-Koriander_%28Coriandrum_sativum%29_Frische_B%C3%BCndel%2C_beim_T%C3%BCrken_in_MA--Josef_Schlaghecken.jpg',
    'Zanahoria Chantenay': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Starr-210221-9070-Daucus_carota_subsp_sativus-harvested_from_veggie_garden_mostly_Chantenay_type-Hawea_Pl_Olinda-Maui_%2851074739266%29.jpg/500px-Starr-210221-9070-Daucus_carota_subsp_sativus-harvested_from_veggie_garden_mostly_Chantenay_type-Hawea_Pl_Olinda-Maui_%2851074739266%29.jpg',
    'Pasto Brachiaria decumbens': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/17/Urochloa_decumbens_plant9_%287429385348%29.jpg/500px-Urochloa_decumbens_plant9_%287429385348%29.jpg',
    'Pasto Mombaza': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2a/Starr_030626-0021_Panicum_maximum.jpg/500px-Starr_030626-0021_Panicum_maximum.jpg',
    'Sorgo forrajero': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/84/Sorghum_bicolor03.jpg/500px-Sorghum_bicolor03.jpg',
    'Maíz forrajero': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/ZeaMays.jpg/500px-ZeaMays.jpg',
    'Sustrato para germinación': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/New_plant_sprouting_from_soil_in_black_pot_on_a_sunny_day_in_the_garden.jpg/500px-New_plant_sprouting_from_soil_in_black_pot_on_a_sunny_day_in_the_garden.jpg',
    'Bandeja germinadora 72 cavidades': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/09/Plants_in_seed_tray_2.jpg/500px-Plants_in_seed_tray_2.jpg',
}


def poner_fotos(apps, schema_editor):
    Producto = apps.get_model('catalogo', 'Producto')
    for nombre, url in FOTOS.items():
        Producto.objects.filter(nombre=nombre, imagen_url='').update(imagen_url=url)


class Migration(migrations.Migration):

    dependencies = [
        ('catalogo', '0002_producto_imagen_url'),
    ]

    operations = [
        migrations.RunPython(poner_fotos, migrations.RunPython.noop),
    ]
