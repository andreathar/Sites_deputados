#!/usr/bin/env python3
"""Recorta o fundo de uma imagem usando a API do rembg (sem depender do CLI, que
puxa gradio e quebra com httpx novo).

Uso: python rembg-cut.py <entrada> <saida.png>
"""
import sys
from pathlib import Path

def main():
    if len(sys.argv) != 3:
        print("Uso: rembg-cut.py <entrada> <saida.png>", file=sys.stderr)
        return 2

    src = Path(sys.argv[1])
    dst = Path(sys.argv[2])
    if not src.exists():
        print(f"Entrada nao existe: {src}", file=sys.stderr)
        return 1

    # Import tardio: evita custo de init quando o script so lista ajuda.
    from rembg import remove, new_session
    from PIL import Image

    print(f"Removendo fundo: {src}", file=sys.stderr)
    session = new_session("u2net")
    with Image.open(src) as img:
        out = remove(img, session=session)
        dst.parent.mkdir(parents=True, exist_ok=True)
        out.save(dst)
    print(f"OK -> {dst}", file=sys.stderr)
    return 0

if __name__ == "__main__":
    sys.exit(main())
