## Uso

```
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 main.py
```

El script solicita elegir el tipo de procesamiento:

1. **Remito Rosmino** - Agrega dos códigos de barras por página (rotados 90°). El nombre del PDF debe tener el formato `{num1}-{num2}.pdf`.
2. **Nota de Pedido Rosmino** - Agrega un código de barras por página. El nombre del PDF debe tener el formato `{num1}-{num2}.pdf` (igual que Remito), donde `num2 - num1 + 1` debería coincidir con la cantidad de hojas del PDF; si no coincide, se imprime una advertencia pero se procesa igual.

Los PDFs se leen de `~/Downloads` y se guardan con el sufijo `-barcode` en el mismo directorio.
