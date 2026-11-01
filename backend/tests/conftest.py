import pytest
from app import security


@pytest.fixture(autouse=True)
def fake_dns(monkeypatch):
    """No real DNS in tests. Names map to fixed IPs; unknown names don't resolve."""
    table = {"example.test": ["93.184.216.34"], "cdn.test": ["93.184.216.35"], "internal.test": ["10.0.0.5"],
             "rebind.test": ["93.184.216.34", "127.0.0.1"], "localhost": ["127.0.0.1"]}

    async def fake(host, port):
        if host in table:
            return table[host]
        raise security.DNSError(host)

    monkeypatch.setattr(security, "_resolve", fake)
