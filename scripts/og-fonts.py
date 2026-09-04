"""Шрифтове за OG изображенията (src/assets/og-fonts/), генерирани от официалните TTF.

Satori (opentype.js) не прилага OpenType features, значи и `locl` за български — заглавията
в OG изображенията биха излезли с руски форми. Затова тук българските алтернативи от
GSUB cyrl/BGR се записват директно в cmap-а (кодовата точка сочи към .BGR глифа), после
шрифтът се subset-ва до latin + cyrillic.

    python scripts/og-fonts.py <SourceSerif4-Bold.ttf> <JetBrainsMono-Regular.ttf>
"""
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "og-fonts"
UNICODES = "U+0000-00FF,U+0100-024F,U+0400-045F,U+0490-0491,U+2013-2014,U+2018-201E,U+2026,U+20AC,U+2116"


def bake_bgr(font: TTFont) -> int:
    """Пренасочва cmap-а към BGR глифите. Връща броя заменени кодови точки."""
    if "GSUB" not in font:
        return 0
    gsub = font["GSUB"].table
    lookups = set()
    for script in gsub.ScriptList.ScriptRecord:
        if script.ScriptTag != "cyrl":
            continue
        for lang in script.Script.LangSysRecord:
            if lang.LangSysTag.strip() != "BGR":
                continue
            for i in lang.LangSys.FeatureIndex:
                feature = gsub.FeatureList.FeatureRecord[i]
                if feature.FeatureTag == "locl":
                    lookups.update(feature.Feature.LookupListIndex)
    mapping = {}
    for i in sorted(lookups):
        for st in gsub.LookupList.Lookup[i].SubTable:
            mapping.update(getattr(st, "mapping", {}))
    changed = 0
    for table in font["cmap"].tables:
        for code, glyph in list(table.cmap.items()):
            if glyph in mapping:
                table.cmap[code] = mapping[glyph]
                changed += 1
    return changed


def build(src: str, name: str) -> None:
    font = TTFont(src)
    baked = bake_bgr(font)
    options = subset.Options()
    options.layout_features = ["kern", "ccmp", "mark", "mkmk"]  # locl вече е в cmap-а
    options.name_IDs = ["*"]
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
    subsetter.subset(font)
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / name
    font.save(out)
    print(f"{out.name}: {out.stat().st_size} B, {baked} кодови точки → български форми")


if __name__ == "__main__":
    serif, mono = sys.argv[1:3]
    build(serif, "SourceSerif4-Bold.ttf")
    build(mono, "JetBrainsMono-Regular.ttf")
