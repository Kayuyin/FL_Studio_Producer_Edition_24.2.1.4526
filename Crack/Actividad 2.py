#ACCTIVIDAD DE APRENDIZAJE NO SUPERVISADO
#SEGMENTACION DE CLIENTES USANDO K-MEANS

import numpy as np
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans

#1. Datos de los clientes
# Cada fila reperesenta un cliente
# Primera columna: Edad
# Segunda columna: Gasto mensual

clientes = np.array([[20, 100], [22, 120], [25, 150], [23, 130], [40, 400], [42, 450], [45, 420], [43,480], [60,800], [62, 850], [65, 900], [63,870]], dtype=float)

#Mostrar Datos
print(f"Datos de los clientes:\n{clientes}")



# 2. Visualizacion de los datos
plt.scatter(clientes[:, 0], clientes[:, 1])
plt.xlabel("Edad")
plt.ylabel("Gasto mensual")
plt.title("Clientes antes del agrupamiento")
plt.show()


# 3. Crear el modelo K-Means
modelo = KMeans(n_clusters=3, random_state=42, n_init=10)

# 4. Entrenar el modelo / Agrupamiento en Clusters
modelo.fit(clientes)

# 5. Grupos Descubiertos
grupos = modelo.labels_
print(f"Grupos descubiertos:\n{grupos}")

# 6. Visualizacion de los Clusters
plt.scatter(clientes[:, 0], clientes[:, 1], c=grupos)
plt.xlabel("Edad")
plt.ylabel("Gasto mensual")
plt.title("Clientes después del agrupamiento")
plt.grid()
plt.show()

# 7. Centroides de los Clusters
centroides = modelo.cluster_centers_
print(f"Centroides de los clusters:\n{centroides}")

# 8. Graficar Clusters y Centroides
plt.scatter(clientes[:, 0], clientes[:, 1], c=grupos, s=100, label='Clientes')
plt.scatter(centroides[:, 0], centroides[:, 1], c='red', marker='X', s=300, label='Centroides')
plt.xlabel("Edad")
plt.ylabel("Gasto mensual")
plt.title("Segmentacion de clientes usando K-Means")
plt.grid()
plt.legend()
plt.show()

# 9. Clasificación de un nuevo cliente
nuevo_cliente = np.array([[61, 930]])
grupo_nuevo_cliente = modelo.predict(nuevo_cliente)
print(f"El nuevo cliente pertenece al grupo: {grupo_nuevo_cliente[0]}")
