from app.extractor import extract, normalize, parse_srcset, same_origin

HTML = """
<html><head><base href="https://example.test/docs/"></head><body>
<a href="intro.html#top">Intro</a> <a href="/about">About</a> <a href="https://other.test/x">Ext</a>
<a href="mailto:a@b.c">m</a> <a href="tel:123">t</a> <a href="javascript:void(0)">j</a> <a href="#frag">f</a>
<a href="intro.html">Dup</a> <a href="/logo-link"><img src="logo.png" alt="Logo"></a>
<img src="a.jpg" srcset="a-1x.jpg 1x, a-2x.jpg 2x" alt="A"> <img src="data:image/png;base64,AAAA">
<picture><source srcset="/hero.webp 800w, /hero-s.webp 400w" type="image/webp"><img src="/hero.jpg"></picture>
<video><source src="/movie.mp4"></video>
</body></html>
"""


def by_kind(found, kind):
    return sorted(f.url for f in found if f.kind == kind)


def test_links_resolved_deduped_and_filtered():
    found = extract(HTML, "https://example.test/page")
    assert by_kind(found, "link") == ["https://example.test/about", "https://example.test/docs/intro.html", "https://example.test/logo-link", "https://other.test/x"]


def test_images_src_srcset_and_picture_source():
    imgs = by_kind(extract(HTML, "https://example.test/page"), "image")
    assert imgs == sorted(["https://example.test/docs/logo.png", "https://example.test/docs/a.jpg", "https://example.test/docs/a-1x.jpg",
                           "https://example.test/docs/a-2x.jpg", "https://example.test/hero.webp", "https://example.test/hero-s.webp", "https://example.test/hero.jpg"])
    assert "movie.mp4" not in " ".join(imgs)


def test_anchor_text():
    f = {x.url: x for x in extract(HTML, "https://example.test/page")}
    assert f["https://example.test/about"].anchor == "About"
    assert f["https://example.test/logo-link"].anchor == "Logo"  # falls back to img alt


def test_parse_srcset_variants():
    assert parse_srcset("a.jpg 1x, b.jpg 2x") == ["a.jpg", "b.jpg"]
    assert parse_srcset("a.jpg") == ["a.jpg"]
    assert parse_srcset("data:image/gif;base64,R0lGOD 1x") == []


def test_normalize_and_same_origin():
    assert normalize("../x#y", "https://example.test/a/b/") == "https://example.test/a/x"
    assert normalize("ftp://x.test/f", "https://example.test/") is None
    assert same_origin("https://example.test/a", "http://example.test/b")
    assert not same_origin("https://example.test/a", "https://www.example.test/a")
    assert not same_origin("https://example.test:8443/a", "https://example.test/a")
