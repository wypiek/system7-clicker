#!/usr/bin/env python3
"""Build the bitmap-style web fonts in fonts/ from the glyph drawings in tools/fonts/*.txt.

Requires fontTools and brotli:  pip install fonttools brotli
Usage:  python3 tools/build-fonts.py
"""
import os
import sys

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
U = 100  # font units per pixel


def parse(path):
    meta, glyphs, cur = {}, {}, None
    with open(path, encoding='utf8') as f:
        for n, raw in enumerate(f, 1):
            line = raw.rstrip('\n')
            if not line or (line.startswith('#') and cur is None):
                continue
            if line.startswith('@ '):
                k, v = line[2:].split(' ', 1)
                meta[k] = v
            elif line.startswith('== '):
                tok = line[3:]
                ch = chr(int(tok[2:], 16)) if tok.startswith('U+') else tok
                cur = glyphs.setdefault(ch, [])
            elif cur is not None:
                cur.append(line)
    cap = int(meta['capRows'])
    for ch, rows in glyphs.items():
        widths = {len(r) for r in rows}
        if len(widths) != 1:
            sys.exit(f'{path}: glyph {ch!r} has uneven rows {widths}')
        if not cap <= len(rows) <= cap + int(meta['descent']):
            sys.exit(f'{path}: glyph {ch!r} has {len(rows)} rows (need {cap}..{cap + int(meta["descent"])})')
    return meta, glyphs


def embolden(rows):
    out = []
    for r in rows:
        r = r + '.'
        out.append(''.join('#' if r[i] == '#' or (i > 0 and r[i - 1] == '#') else '.' for i in range(len(r))))
    return out


def draw(rows, cap, pen):
    # Merge identical horizontal runs across consecutive rows into rectangles.
    runs_by_row = []
    for r in rows:
        runs, x = [], 0
        while x < len(r):
            if r[x] == '#':
                s = x
                while x < len(r) and r[x] == '#':
                    x += 1
                runs.append((s, x))
            else:
                x += 1
        runs_by_row.append(runs)
    open_rects = {}
    rects = []
    for ri, runs in enumerate(runs_by_row + [[]]):
        keys = set(runs)
        for k in list(open_rects):
            if k not in keys:
                rects.append((k[0], k[1], open_rects.pop(k), ri))
        for k in runs:
            open_rects.setdefault(k, ri)
    for x0, x1, r0, r1 in rects:
        top = (cap - r0) * U
        bottom = (cap - r1) * U
        pen.moveTo((x0 * U, bottom))
        pen.lineTo((x0 * U, top))
        pen.lineTo((x1 * U, top))
        pen.lineTo((x1 * U, bottom))
        pen.closePath()


def build(src, out, bold=False):
    meta, glyphs = parse(src)
    cap, em = int(meta['capRows']), int(meta['em'])
    asc, desc = int(meta['ascent']), int(meta['descent'])
    family = meta['name']
    order = ['.notdef', 'space']
    cmap = {32: 'space'}
    glyf, metrics = {}, {}

    pen = TTGlyphPen(None)
    pen.moveTo((U, 0)); pen.lineTo((U, cap * U)); pen.lineTo((5 * U, cap * U)); pen.lineTo((5 * U, 0)); pen.closePath()
    pen.moveTo((2 * U, U)); pen.lineTo((4 * U, U)); pen.lineTo((4 * U, (cap - 1) * U)); pen.lineTo((2 * U, (cap - 1) * U)); pen.closePath()
    glyf['.notdef'] = pen.glyph()
    metrics['.notdef'] = (7 * U, U)
    glyf['space'] = TTGlyphPen(None).glyph()
    space = int(meta['space']) + (1 if bold else 0)
    metrics['space'] = ((space + 1) * U, 0)

    for ch, rows in glyphs.items():
        if bold:
            rows = embolden(rows)
        name = 'uni%04X' % ord(ch)
        order.append(name)
        cmap[ord(ch)] = name
        pen = TTGlyphPen(None)
        draw(rows, cap, pen)
        glyf[name] = pen.glyph()
        metrics[name] = ((len(rows[0]) + 1) * U, 0)

    style = 'Bold' if bold else 'Regular'
    fb = FontBuilder(em * U, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyf)
    glyph_table = fb.font['glyf']
    fb.setupHorizontalMetrics({n: (adv, glyph_table[n].xMin if hasattr(glyph_table[n], 'xMin') else 0) for n, (adv, _) in metrics.items()})
    fb.setupHorizontalHeader(ascent=asc * U, descent=-desc * U, lineGap=0)
    fb.setupNameTable({
        'familyName': family, 'styleName': style,
        'uniqueFontIdentifier': f'{family} {style}', 'fullName': f'{family} {style}',
        'psName': f'{family.replace(" ", "")}-{style}', 'version': 'Version 1.000',
    })
    fb.setupOS2(
        sTypoAscender=asc * U, sTypoDescender=-desc * U, sTypoLineGap=0,
        usWinAscent=asc * U, usWinDescent=desc * U,
        sxHeight=(cap - 3) * U, sCapHeight=cap * U,
        usWeightClass=700 if bold else 400, fsSelection=0x20 if bold else 0x40,
    )
    fb.setupPost()
    fb.font['head'].macStyle = 1 if bold else 0
    fb.font.flavor = 'woff2'
    fb.save(out)
    print(f'wrote {os.path.relpath(out, ROOT)} ({len(glyphs)} glyphs)')


if __name__ == '__main__':
    fonts = os.path.join(ROOT, 'fonts')
    os.makedirs(fonts, exist_ok=True)
    build(os.path.join(ROOT, 'tools/fonts/system12.txt'), os.path.join(fonts, 's7-system.woff2'))
    build(os.path.join(ROOT, 'tools/fonts/small10.txt'), os.path.join(fonts, 's7-small.woff2'))
    build(os.path.join(ROOT, 'tools/fonts/small10.txt'), os.path.join(fonts, 's7-small-bold.woff2'), bold=True)
