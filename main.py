import os
import io
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.lib.utils import ImageReader

DOWNLOADS_PATH = str(Path.home() / 'Downloads')

# CODE128 bar patterns (107 symbols: 103 data + 3 start + 1 stop)
# Ported from jsbarcode/src/barcodes/CODE128/constants.js
BARS = [
    '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
    '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
    '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
    '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
    '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
    '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
    '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
    '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
    '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
    '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
    '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
    '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
    '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
    '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
    '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
    '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
    '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
    '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
    '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
    '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
    '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
    '11010011100', '1100011101011',
]

START_C = 105
STOP = 106
MODULO = 103

MODULE_WIDTH = 2
BAR_HEIGHT = 100
FONT_SIZE = 20
TEXT_MARGIN = 2
SCALE_FACTOR = 0.4


def encode_code128c(digit_string):
    """Encode an even-length digit string using CODE128C. Returns binary pattern string."""
    values = [START_C]
    for i in range(0, len(digit_string), 2):
        pair = int(digit_string[i:i + 2])
        values.append(pair)

    checksum = values[0]
    for i in range(1, len(values)):
        checksum += values[i] * i
    checksum = checksum % MODULO
    values.append(checksum)
    values.append(STOP)

    return ''.join(BARS[v] for v in values)


def create_barcode_image(value):
    """Generate a CODE128C barcode PNG matching JsBarcode output. Returns PNG bytes."""
    binary = encode_code128c(value)

    img_width = len(binary) * MODULE_WIDTH
    img_height = BAR_HEIGHT + TEXT_MARGIN + FONT_SIZE

    img = Image.new('RGB', (img_width, img_height), 'white')
    draw = ImageDraw.Draw(img)

    # Draw bars
    for i, bit in enumerate(binary):
        if bit == '1':
            x = i * MODULE_WIDTH
            draw.rectangle([x, 0, x + MODULE_WIDTH - 1, BAR_HEIGHT - 1], fill='black')

    # Draw text centered below bars
    try:
        font = ImageFont.truetype('Courier', FONT_SIZE)
    except OSError:
        try:
            font = ImageFont.truetype('/System/Library/Fonts/Courier.dfont', FONT_SIZE)
        except OSError:
            font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), value, font=font)
    text_width = bbox[2] - bbox[0]
    text_x = (img_width - text_width) / 2
    text_y = BAR_HEIGHT + TEXT_MARGIN
    draw.text((text_x, text_y), value, fill='black', font=font)

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


def add_leading_zeroes(num, total_digits):
    return str(num).zfill(total_digits)


def create_overlay_pdf(page_width, page_height, images_config):
    """Create a single-page PDF overlay with barcode images at specified positions."""
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(page_width, page_height))

    for conf in images_config:
        c.saveState()
        c.translate(conf['x'], conf['y'])
        if conf.get('rotate', 0) != 0:
            c.rotate(conf['rotate'])
        c.drawImage(
            ImageReader(io.BytesIO(conf['image_bytes'])),
            0, 0,
            width=conf['width'],
            height=conf['height'],
            mask='auto',
        )
        c.restoreState()

    c.save()
    buf.seek(0)
    return buf


def process_remito_rosmino():
    all_files = os.listdir(DOWNLOADS_PATH)
    pdf_files = sorted([f for f in all_files if f.lower().endswith('.pdf') and '-barcode' not in f.lower()])
    print(f'Se encontraron {len(pdf_files)} archivos PDF')

    for idx, file in enumerate(pdf_files):
        try:
            print(f'[{idx + 1}/{len(pdf_files)}] Procesando {file}...')
            name_without_ext = file.rsplit('.', 1)[0]
            ext = file.rsplit('.', 1)[1]

            tokens = name_without_ext.split('-')
            token0 = int(tokens[0])
            token1 = int(tokens[1])

            reader = PdfReader(os.path.join(DOWNLOADS_PATH, file))
            writer = PdfWriter()

            for page in reader.pages:
                val0 = add_leading_zeroes(token0, 8)
                val1 = add_leading_zeroes(token1, 8)

                img_bytes0 = create_barcode_image(val0)
                img_bytes1 = create_barcode_image(val1)

                page_width = float(page.mediabox.width)
                page_height = float(page.mediabox.height)

                # Get barcode image dimensions for scaling
                img0 = Image.open(io.BytesIO(img_bytes0))
                img1 = Image.open(io.BytesIO(img_bytes1))
                w0, h0 = img0.size[0] * SCALE_FACTOR, img0.size[1] * SCALE_FACTOR
                w1, h1 = img1.size[0] * SCALE_FACTOR, img1.size[1] * SCALE_FACTOR

                overlay_buf = create_overlay_pdf(page_width, page_height, [
                    {
                        'image_bytes': img_bytes0,
                        'x': 565, 'y': 175,
                        'width': w0, 'height': h0,
                        'rotate': 90,
                    },
                    {
                        'image_bytes': img_bytes1,
                        'x': 565, 'y': 645,
                        'width': w1, 'height': h1,
                        'rotate': 90,
                    },
                ])

                overlay_reader = PdfReader(overlay_buf)
                page.merge_page(overlay_reader.pages[0])
                writer.add_page(page)

                token0 += 1
                token1 += 1

            output_name = f'{name_without_ext}-barcode.{ext}'
            with open(os.path.join(DOWNLOADS_PATH, output_name), 'wb') as f:
                writer.write(f)

            print(f'[{idx + 1}/{len(pdf_files)}] {file} -> {output_name}')
        except Exception as e:
            print(f'[{idx + 1}/{len(pdf_files)}] Error procesando {file}: {e}')


def process_nota_pedido_rosmino():
    all_files = os.listdir(DOWNLOADS_PATH)
    pdf_files = sorted([f for f in all_files if f.lower().endswith('.pdf') and '-barcode' not in f.lower()])
    print(f'Se encontraron {len(pdf_files)} archivos PDF')

    for idx, file in enumerate(pdf_files):
        try:
            print(f'[{idx + 1}/{len(pdf_files)}] Procesando {file}...')
            name_without_ext = file.rsplit('.', 1)[0]
            ext = file.rsplit('.', 1)[1]

            token = int(name_without_ext)

            reader = PdfReader(os.path.join(DOWNLOADS_PATH, file))
            writer = PdfWriter()

            for page in reader.pages:
                val = add_leading_zeroes(token, 8)

                img_bytes = create_barcode_image(val)

                page_width = float(page.mediabox.width)
                page_height = float(page.mediabox.height)

                img = Image.open(io.BytesIO(img_bytes))
                w, h = img.size[0] * SCALE_FACTOR, img.size[1] * SCALE_FACTOR

                overlay_buf = create_overlay_pdf(page_width, page_height, [
                    {
                        'image_bytes': img_bytes,
                        'x': 475, 'y': 746,
                        'width': w, 'height': h,
                        'rotate': 0,
                    },
                ])

                overlay_reader = PdfReader(overlay_buf)
                page.merge_page(overlay_reader.pages[0])
                writer.add_page(page)

                token += 1

            output_name = f'{name_without_ext}-barcode.{ext}'
            with open(os.path.join(DOWNLOADS_PATH, output_name), 'wb') as f:
                writer.write(f)

            print(f'[{idx + 1}/{len(pdf_files)}] {file} -> {output_name}')
        except Exception as e:
            print(f'[{idx + 1}/{len(pdf_files)}] Error procesando {file}: {e}')


def main():
    print('Seleccione el tipo de procesamiento:')
    print('1) Remito Rosmino')
    print('2) Nota de Pedido Rosmino')

    answer = input('Opcion: ')

    if answer == '1':
        process_remito_rosmino()
    elif answer == '2':
        process_nota_pedido_rosmino()
    else:
        print('Opcion invalida')
        sys.exit(1)

    print('Listo!')


if __name__ == '__main__':
    main()
