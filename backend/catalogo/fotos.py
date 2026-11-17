"""
Fotos de los productos de demostración.

Son fotos libres de Wikimedia Commons (licencias Creative Commons, ver README).
Se guarda solo la dirección (URL) y no el archivo, porque el disco del servidor gratuito
de Render se borra en cada despliegue: una imagen subida se perdería.
"""

COMMONS = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/'


def _foto(ruta):
    """`ruta` es la parte de la URL de Commons después de /thumb/ (ya incluye el tamaño de 500 px)."""
    return COMMONS + ruta


# nombre del producto -> (url, autor, licencia)
FOTOS_DEMO = {
    'Maracuyá amarillo': (
        _foto('9/98/Passiflora_edulis_f._flavicarpa_Degener.jpg/500px-Passiflora_edulis_f._flavicarpa_Degener.jpg'),
        'John Ocampo', 'CC BY-SA 4.0'),
    'Papaya Tainung': (
        _foto('f/f2/Brassicales_-_Carica_papaya_-_5.jpg/500px-Brassicales_-_Carica_papaya_-_5.jpg'),
        'Emke Dénes', 'CC BY-SA 4.0'),
    'Lulo de Castilla': (
        _foto('5/54/Solanum_quitoense%2C_the_Naranjillo_%2811396994756%29.jpg/'
              '500px-Solanum_quitoense%2C_the_Naranjillo_%2811396994756%29.jpg'),
        'Dick Culbert', 'CC BY 2.0'),
    'Sandía Charleston Gray': (
        _foto('7/7b/Cutted_watermelon_in_steel_plate.jpg/500px-Cutted_watermelon_in_steel_plate.jpg'),
        'Suyash Dwivedi', 'CC BY-SA 4.0'),
    'Melón Cantaloupe': (
        _foto('0/0f/Cantaloupe_2.jpg/500px-Cantaloupe_2.jpg'),
        'Tiia Monto', 'CC BY-SA 3.0'),
    'Tomate chonto': (
        _foto('b/be/Grape_tomatoes_on_the_vine_at_Ljubljana_Central_Market.JPG/'
              '500px-Grape_tomatoes_on_the_vine_at_Ljubljana_Central_Market.JPG'),
        'domdomegg', 'CC BY 4.0'),
    'Lechuga Batavia': (
        _foto('8/81/Laitue_Batavia.jpg/500px-Laitue_Batavia.jpg'),
        'Ritzylaura', 'CC BY-SA 4.0'),
    'Cebolla larga': (
        _foto('9/98/HK_SYP_Best_of_Best_Vegetable_Peking_Welsh_onion_Allium_Aug-2012.JPG/'
              '500px-HK_SYP_Best_of_Best_Vegetable_Peking_Welsh_onion_Allium_Aug-2012.JPG'),
        'Genmewcaugsa', 'CC BY-SA 3.0'),
    'Pimentón California Wonder': (
        _foto('2/2b/Green_Bell_Pepper.jpg/500px-Green_Bell_Pepper.jpg'),
        'Gaurav Dhwaj Khadka', 'CC BY-SA 4.0'),
    'Cilantro': (
        _foto('4/40/Koriander_%28Coriandrum_sativum%29_Frische_B%C3%BCndel%2C_beim_T%C3%BCrken_in_MA--Josef_Schlaghecken.jpg/'
              '500px-Koriander_%28Coriandrum_sativum%29_Frische_B%C3%BCndel%2C_beim_T%C3%BCrken_in_MA--Josef_Schlaghecken.jpg'),
        'Josef Schlaghecken', 'CC BY-SA 4.0'),
    'Zanahoria Chantenay': (
        _foto('b/b8/Starr-210221-9070-Daucus_carota_subsp_sativus-harvested_from_veggie_garden_mostly_Chantenay_type-'
              'Hawea_Pl_Olinda-Maui_%2851074739266%29.jpg/500px-Starr-210221-9070-Daucus_carota_subsp_sativus-'
              'harvested_from_veggie_garden_mostly_Chantenay_type-Hawea_Pl_Olinda-Maui_%2851074739266%29.jpg'),
        'Forest y Kim Starr', 'CC BY 2.0'),
    'Pasto Brachiaria decumbens': (
        _foto('1/17/Urochloa_decumbens_plant9_%287429385348%29.jpg/500px-Urochloa_decumbens_plant9_%287429385348%29.jpg'),
        'Harry Rose', 'CC BY 2.0'),
    'Pasto Mombaza': (
        _foto('2/2a/Starr_030626-0021_Panicum_maximum.jpg/500px-Starr_030626-0021_Panicum_maximum.jpg'),
        'Forest y Kim Starr', 'CC BY 3.0'),
    'Sorgo forrajero': (
        _foto('8/84/Sorghum_bicolor03.jpg/500px-Sorghum_bicolor03.jpg'),
        'Pethan', 'CC BY-SA 3.0'),
    'Maíz forrajero': (
        _foto('6/65/ZeaMays.jpg/500px-ZeaMays.jpg'),
        'Christian Fischer', 'CC BY-SA 3.0'),
    'Sustrato para germinación': (
        _foto('a/a4/New_plant_sprouting_from_soil_in_black_pot_on_a_sunny_day_in_the_garden.jpg/'
              '500px-New_plant_sprouting_from_soil_in_black_pot_on_a_sunny_day_in_the_garden.jpg'),
        'Shixart1985', 'CC BY 2.0'),
    'Bandeja germinadora 72 cavidades': (
        _foto('0/09/Plants_in_seed_tray_2.jpg/500px-Plants_in_seed_tray_2.jpg'),
        'Pascal Kings', 'CC BY 4.0'),
}


def foto_demo(nombre):
    """URL de la foto de demostración de un producto, o '' si no tiene."""
    datos = FOTOS_DEMO.get(nombre)
    return datos[0] if datos else ''
