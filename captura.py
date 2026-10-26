import pandas as pd

datos = pd.read_csv("datos_sensores.csv")

print(datos.head())

# Después se seleccionarían las variables que serán utilizadas por el modelo:

variables = [
    "Temperatura",
    "Vibracion",
    "Consumo_electrico",
    "Presion",
    "Velocidad"
]
X = datos[variables]


from sklearn.ensemble import IsolationForest

#Luego se crea el modelo:

modelo = IsolationForest(
    contamination=0.05,
    random_state=42
)

modelo.fit(X)

predicciones = modelo.predict(X)


datos["Resultado"] = predicciones



anomalias = datos[datos["Resultado"] == -1]

print(anomalias)



if len(anomalias) > 0:
    print("ALERTA: Se detectaron posibles anomalías en la máquina.")
else:
    print("La máquina presenta un comportamiento normal.")

