#!/usr/bin/env bash
# Falha se algum widget redimensionável tiver minHeight/minResizeHeight acima de 40dp.
# POCO/MIUI usam minHeight como piso: acima de 40dp o widget não reduz a 1 célula.
set -u
cd "$(dirname "$0")/../.."
erro=0
for f in widget_dialogue_info widget_alpaquinha_info widget_corvinho_info; do
  arq="android/app/src/main/res/xml/$f.xml"
  for attr in minHeight minResizeHeight; do
    v=$(grep -o "android:$attr=\"[0-9]*dp\"" "$arq" | grep -o '[0-9]*' | head -1)
    if [ -z "$v" ] || [ "$v" -gt 40 ]; then
      echo "ERRO: $arq: $attr=${v:-ausente} (máximo 40dp)"; erro=1
    fi
  done
done
[ $erro -eq 0 ] && echo "Tamanhos de widget OK"
exit $erro
