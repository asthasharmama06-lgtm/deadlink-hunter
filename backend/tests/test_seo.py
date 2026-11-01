from app.seo import audit_page, add_site_checks


def test_audit_page_detects_missing_metadata_and_image_alt():
    audit = audit_page('<html><head><title>Short</title></head><body><h1>A</h1><img src="x.png"></body></html>', 'http://example.test/')
    checks = {item['key']: item for item in audit['checks']}
    assert checks['title']['status'] == 'issue'
    assert checks['meta_description']['status'] == 'issue'
    assert checks['h1']['status'] == 'passed'
    assert checks['image_alt']['status'] == 'issue'
    assert checks['https']['status'] == 'issue'
    assert 0 <= audit['score'] <= 100


def test_audit_page_passes_valid_metadata():
    html = '''<html lang="en"><head>
      <title>A descriptive page title with enough characters</title>
      <meta name="description" content="This is a useful description that explains the page content clearly for visitors and search engines alike.">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="canonical" href="https://example.test/page">
      </head><body><h1>Heading</h1><h2>Subheading</h2><img src="x.png" alt="Example"></body></html>'''
    audit = audit_page(html, 'https://example.test/page')
    assert audit['score'] == 100
    assert audit['issues'] == 0


def test_site_checks_are_included_in_root_audit():
    audit = audit_page('<html><head><title>Title long enough to pass the check</title></head><body><h1>Title</h1></body></html>', 'https://example.test/')
    audit = add_site_checks(audit, robots_ok=True, sitemap_ok=False)
    checks = {item['key']: item for item in audit['checks']}
    assert checks['robots_txt']['status'] == 'passed'
    assert checks['sitemap']['status'] == 'issue'
    assert audit['score'] <= 100


def test_empty_alt_is_allowed_for_decorative_images():
    audit = audit_page('<html><head><title>A descriptive title that is long enough</title></head><body><h1>Heading</h1><img src="decoration.png" alt=""></body></html>', 'https://example.test/')
    checks = {item['key']: item for item in audit['checks']}
    assert checks['image_alt']['status'] == 'passed'
