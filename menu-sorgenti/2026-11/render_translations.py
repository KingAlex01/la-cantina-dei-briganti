"""Render French and Spanish PDFs from the reviewed November menu data."""
from io import BytesIO
import json
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, NameObject
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import pypdfium2

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'menu-sorgenti/2026-11/en.pdf'
OUTPUT = ROOT / 'output/pdf/2026-11'
OUTPUT.mkdir(parents=True, exist_ok=True)
PREVIEW = ROOT / 'tmp/pdfs/novembre-2026'
PREVIEW.mkdir(parents=True, exist_ok=True)
MENU = json.loads((ROOT / 'menu-sorgenti/2026-11/menu.json').read_text(encoding='utf-8'))
pdfmetrics.registerFont(TTFont('MenuSerif', 'C:/Windows/Fonts/georgia.ttf'))
W, H = 595.5, 842.25


def background():
    reader = PdfReader(SOURCE)
    page = reader.pages[0]
    seen = set()

    def strip(stream, resources):
        content = ContentStream(stream, reader)
        result, block = [], None
        for operands, op in content.operations:
            if op == b'BT':
                block = [(operands, op)]
            elif block is not None:
                block.append((operands, op))
                if op == b'ET':
                    # Keep the original handwritten menu title; replace other text.
                    if any(o == b'Tf' and str(a[0]) == '/R45' for a, o in block):
                        result.extend(block)
                    block = None
            else:
                result.append((operands, op))
        content.operations = result
        for ref in resources.get('/XObject', {}).values():
            obj = ref.get_object()
            identity = id(obj)
            if obj.get('/Subtype') == '/Form' and identity not in seen:
                seen.add(identity)
                nested = strip(obj, obj.get('/Resources', resources))
                obj.set_data(nested.get_data())
        return content

    page[NameObject('/Contents')] = strip(page.get_contents(), page['/Resources'])
    return page


def wrap(text, size, width):
    result, line = [], ''
    words = text.split()
    if len(words) > 1 and words[-1].startswith('(') and words[-1].endswith(')') and words[-1][1:-1].replace(',', '').isdigit():
        words[-2:] = [' '.join(words[-2:])]
    for word in words:
        candidate = f'{line} {word}'.strip()
        if line and pdfmetrics.stringWidth(candidate, 'MenuSerif', size) > width:
            result.append(line)
            line = word
        else:
            line = candidate
    if line:
        result.append(line)
    return result


COPY = {
    'fr': {
        'other': ['AUTRES', 'LANGUES'],
        'meatballs': 'Boulettes de viande frites ou en sauce tomate',
        'cover': 'Couvert',
        'allergens': 'Allergènes : 1 Gluten · 2 Lait et produits laitiers · 3 Crustacés · 4 Fruits à coque · 5 Œufs · 6 Mollusques',
        'frozen': '* Les produits ou ingrédients signalés sont surgelés par le fournisseur ou congelés sur place selon les procédures de sécurité alimentaire.',
        'ask': 'Veuillez vous renseigner auprès du personnel sur les allergènes avant de commander, surtout pour les plats sans numéro.',
    },
    'es': {
        'other': ['OTROS', 'IDIOMAS'],
        'meatballs': 'Albóndigas de carne fritas o en salsa de tomate',
        'cover': 'Cubierto',
        'allergens': 'Alérgenos: 1 Gluten · 2 Leche y productos lácteos · 3 Crustáceos · 4 Frutos secos · 5 Huevos · 6 Moluscos',
        'frozen': '* Los productos o ingredientes señalados se congelan en origen o en el local según los procedimientos de seguridad alimentaria.',
        'ask': 'Consulta al personal sobre los alérgenos antes de pedir, especialmente para los platos sin número.',
    },
}
wifi = next(line for line in PdfReader(SOURCE).pages[0].extract_text().splitlines() if 'Wi-Fi:' in line)

for lang, copy in COPY.items():
    rows = []
    for category in MENU[:3]:
        dishes = []
        for item in category['items']:
            if category['position'] == 1 and item['position'] == 4:
                continue
            name = item['name'][lang]
            price = f"{item['price']:g}€"
            if category['position'] == 1 and item['position'] == 3:
                name, price = copy['meatballs'], '8/10€'
            allergens = ','.join(map(str, item['allergens']))
            if allergens:
                name += f' ({allergens})'
            note = item.get('description', {}).get(lang, '')
            dishes.append((name, price, note))
        rows.append((category['name'][lang].upper(), dishes))

    for size in [11.5, 11.25, 11.0, 10.75, 10.5]:
        leading = size + 2.3
        height = sum(33 + sum(len(wrap(name, size, 474)) * leading + (leading if note else 0) + 2 for name, _, note in dishes) for _, dishes in rows)
        if height <= 585:
            break
    assert height <= 585, (lang, height)
    overlay = BytesIO()
    c = canvas.Canvas(overlay, pagesize=(W, H))
    c.setFillColorRGB(0.14, 0.13, 0.13)
    c.setFont('MenuSerif', 10)
    for index, label in enumerate(copy['other']):
        c.drawCentredString(508, 824 - index * 13, label)
    y = 703
    for title, dishes in rows:
        c.saveState()
        text = c.beginText()
        text.setFont('MenuSerif', 16)
        text.setCharSpace(3.2)
        title_width = pdfmetrics.stringWidth(title, 'MenuSerif', 16) + max(len(title)-1, 0) * 3.2
        text.setTextOrigin((W-title_width)/2, y)
        text.textLine(title)
        c.drawText(text)
        c.restoreState()
        y -= 25
        for name, price, note in dishes:
            lines = wrap(name, size, 474)
            c.setFont('MenuSerif', size)
            c.drawRightString(571, y - (len(lines)-1)*leading/2, price)
            for line in lines:
                c.drawCentredString(290, y, line)
                y -= leading
            if note:
                c.setFont('MenuSerif', size-0.2)
                c.drawCentredString(290, y, f'({note.replace(" · ", "; ")})')
                y -= leading
            y -= 2
        y -= 8
    assert y > 110, (lang, y)
    c.setFont('MenuSerif', 12)
    c.drawCentredString(290, 98, MENU[3]['items'][0]['name'][lang])
    c.drawRightString(571, 98, '6€')
    c.drawCentredString(290, 80, copy['cover'])
    c.drawRightString(571, 80, '2€')
    c.setFont('Helvetica-Bold', 7.5)
    c.drawCentredString(W/2, 33, wifi)
    c.setFont('MenuSerif', 6.1)
    c.drawCentredString(W/2, 22, copy['allergens'])
    c.setFont('MenuSerif', 4.8)
    c.drawCentredString(W/2, 13, copy['frozen'])
    c.drawCentredString(W/2, 6, copy['ask'])
    c.save()
    overlay.seek(0)
    page = background()
    page.merge_page(PdfReader(overlay).pages[0])
    writer = PdfWriter()
    writer.add_page(page)
    writer.add_metadata({'/Title': f'La cantina dei briganti - Novembre 2026 - {lang.upper()}'})
    path = OUTPUT / f'menu-novembre-2026-{lang}.pdf'
    with path.open('wb') as f:
        writer.write(f)
    (ROOT / f'menu-sorgenti/2026-11/{lang}.pdf').write_bytes(path.read_bytes())
    doc = pypdfium2.PdfDocument(path)
    doc[0].render(scale=1.5).to_pil().save(PREVIEW / f'{lang}-1.png')
    print(f'{lang}: one page; body size {size}; final baseline {y:.1f}; {path}')
