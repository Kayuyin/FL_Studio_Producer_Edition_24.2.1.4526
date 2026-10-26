import tensorflow as tf
import numpy as np
import matplotlib.pyplot as plt

#Datos de Entrenamiento

#Valores conocidos de °C
celsius = np.array([1,8,2,5,9,30,-4,28], dtype=float)
#Valores equivalentes conocidos de °F
fahrenhei = np.array([33.8, 46.4, 35.6, 41, 48.2, 86, 24.8, 82.4], dtype=float)

#Mostrar los datos para comprobar
print("Datos Celsius:")
print(celsius)
print("Datos Fahrenheit:")
print(fahrenhei)

#ahora quiero que pongas la n\ para hacer dos lineas de codigo para mostra los dato en ves de una
print("Datos Celsius:\n", celsius)
print("Datos Fahrenheit:\n", fahrenhei)



#2.#Creando el modelo de la red neuronal
#capa es la capa de salida, que es una capa densa con una sola neurona y una entrada de una dimensión
#tf.keras.layers.Dense es una clase que representa una capa densa (fully connected) en una red neuronal. La capa densa tiene un número de unidades (neuronas) y una forma de entrada especificada por input_shape. En este caso, la capa tiene 1 unidad y espera una entrada de una dimensión (un solo valor).
#unit es el número de neuronas en la capa, en este caso 1, ya que estamos prediciendo un solo valor (la temperatura en Fahrenheit) a partir de un solo valor de entrada (la temperatura en Celsius).
#input_shape es la forma de la entrada que la capa espera recibir. En este caso, input_shape=[1] indica que la capa espera recibir un solo valor de entrada (la temperatura en Celsius).
capa = tf.keras.layers.Dense(units=1, input_shape=[1])
modelo = tf.keras.Sequential([capa])

#3. Configurando el modelo
modelo.compile(
    optimizer=tf.keras.optimizers.Adam(0.1),
    loss='mean_squared_error'
    )

#4. Entrenando el modelo
historico = modelo.fit(celsius, fahrenhei, epochs=1000, verbose=False)
print("Modelo entrenado!")

#5. Graficando el proceso de aprendizaje
plt.xlabel("# Epocas")
plt.ylabel("Magnitud de la pérdida")
plt.plot(historico.history['loss'])
plt.title("Evolucion del aprendizaje del modelo")
plt.grid()
plt.show()

#6. Haciendo predicciones
# Probaremos una temperatura que el modelo no ha visto en el entrenamiento

temperatura_nueva = 100.0
prediccion = modelo.predict(np.array([temperatura_nueva]), verbose=0)
print(f"El modelo predice que {temperatura_nueva}°C es igual a {prediccion[0][0]}°F")
#los [0][0] son para acceder al primer elemento del array de predicciones, ya que el modelo devuelve un array de arrays.
# [0] accede al primer elemento del array de predicciones, y [0] accede al primer elemento del subarray.

#7. ver lo que el modelo ha aprendido
pesos = modelo.get_weights()
print(f"Pesos del modelo:{pesos}")


print(f"Pesos aprendidods: {pesos[0][0][0]}")
print(f"Sesgo aprendido: {pesos[1][0]}")


# Podemos comprar con relacion real
# Formula: fahrenheit = celsius * 1.8 + 32
# Resultado real: Fahrenheit = 1.8221590518951416 + 31.48790168762207