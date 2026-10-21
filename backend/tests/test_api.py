def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_login_ok_and_wrong_password(client):
    ok = client.post("/api/auth/login", json={"email": "admin@salesia.com", "password": "admin123"})
    assert ok.status_code == 200 and ok.json()["user"]["role"] == "admin"
    bad = client.post("/api/auth/login", json={"email": "admin@salesia.com", "password": "mala"})
    assert bad.status_code == 401


def test_requires_auth(client):
    assert client.get("/api/customers").status_code == 401
    assert client.get("/api/dashboard/summary", headers={"Authorization": "Bearer falso"}).status_code == 401


def test_roles_are_enforced(client, vendedor, almacen):
    assert client.get("/api/analytics/datasets", headers=vendedor).status_code == 403
    assert client.post("/api/statistics/mean", json={"values": [1, 2]}, headers=vendedor).status_code == 403
    assert client.post("/api/products", headers=vendedor, json={
        "sku": "X-1", "name": "Nada", "category_id": 1, "price": 10}).status_code == 403
    assert client.get("/api/audit", headers=almacen).status_code == 403


def test_sale_updates_inventory_and_totals(client, vendedor, admin):
    product = next(p for p in client.get("/api/products?q=Resma", headers=vendedor).json())
    customer = client.get("/api/customers", headers=vendedor).json()[0]
    before = product["stock"]
    r = client.post("/api/sales", headers=vendedor, json={
        "customer_id": customer["id"], "payment_method": "tarjeta", "discount_pct": 10,
        "items": [{"product_id": product["id"], "quantity": 2}, {"product_id": product["id"], "quantity": 1}]})
    assert r.status_code == 201, r.text
    sale = r.json()
    # 3 resmas a 24 = 72; 10% desc = 7.20; base 64.80; IGV 18% = 11.66; total 76.46
    assert sale["subtotal"] == 72.0 and sale["discount"] == 7.2
    assert sale["tax"] == 11.66 and sale["total"] == 76.46
    assert len(sale["details"]) == 1 and sale["details"][0]["quantity"] == 3
    after = next(p for p in client.get("/api/products?q=Resma", headers=vendedor).json())
    assert after["stock"] == before - 3

    # Anular devuelve el stock
    assert client.post(f"/api/sales/{sale['id']}/cancel", headers=vendedor).status_code == 403
    assert client.post(f"/api/sales/{sale['id']}/cancel", headers=admin).status_code == 200
    restored = next(p for p in client.get("/api/products?q=Resma", headers=vendedor).json())
    assert restored["stock"] == before


def test_sale_rejects_insufficient_stock_and_bad_input(client, vendedor):
    product = client.get("/api/products", headers=vendedor).json()[0]
    customer = client.get("/api/customers", headers=vendedor).json()[0]
    too_many = client.post("/api/sales", headers=vendedor, json={
        "customer_id": customer["id"], "items": [{"product_id": product["id"], "quantity": 99999}]})
    assert too_many.status_code in (400, 422)
    empty = client.post("/api/sales", headers=vendedor, json={"customer_id": customer["id"], "items": []})
    assert empty.status_code == 422
    ghost = client.post("/api/sales", headers=vendedor, json={
        "customer_id": 99999, "items": [{"product_id": product["id"], "quantity": 1}]})
    assert ghost.status_code == 404


def test_dashboard_summary(client, admin):
    r = client.get("/api/dashboard/summary?days=90", headers=admin)
    assert r.status_code == 200
    kpis = r.json()["kpis"]
    assert kpis["sales_count"] > 100 and kpis["revenue"] > 0
    assert kpis["average_ticket"] > kpis["median_ticket"] > 0  # datos con sesgo positivo
    assert r.json()["top_products"] and r.json()["sales_by_day"]


def test_statistics_endpoints_and_history(client, analista):
    mean = client.post("/api/statistics/mean", headers=analista, json={"values": [10, 20, 30]})
    assert mean.status_code == 200 and mean.json()["mean"] == 20
    median = client.post("/api/statistics/median", headers=analista, json={"values": [1, 9, 5, 3]})
    assert median.json()["median"] == 4
    cmp_ = client.post("/api/statistics/compare", headers=analista, json={"values": [1, 2, 3, 100]})
    assert cmp_.json()["shape"] == "sesgo positivo"
    rv = client.post("/api/random-variables/analyze", headers=analista,
                     json={"values": [1, 2, 2, 3, 3, 3], "threshold": 2})
    assert rv.json()["probability_above"]["probability"] == 0.5
    bayes = client.post("/api/probability/bayes", headers=analista,
                        json={"p_a": 0.01, "p_b_given_a": 0.9, "p_b_given_not_a": 0.05})
    assert bayes.json()["posterior_pct"] == 15.38
    bad = client.post("/api/probability/bayes", headers=analista, json={"p_a": 2, "p_b_given_a": 0.5, "p_b": 0.5})
    assert bad.status_code == 422
    history = client.get("/api/analyses", headers=analista).json()
    assert {"mean", "median", "compare", "random_variable", "bayes"} <= {h["kind"] for h in history}


def test_dataset_analysis_from_sales(client, analista):
    r = client.get("/api/analytics/datasets/monto_venta?days=90&threshold=500", headers=analista)
    assert r.status_code == 200
    body = r.json()
    assert body["comparison"]["mean"] > body["comparison"]["median"]
    assert 0 < body["random_variable"]["probability_above"]["probability"] < 1
    assert client.get("/api/analytics/datasets/inventado", headers=analista).status_code == 404


def test_insights_show_evidence(client, analista):
    r = client.post("/api/insights/generate", headers=analista)
    assert r.status_code == 200
    rules = {i["rule"] for i in r.json()}
    assert "stock_bajo" in rules and "media_vs_mediana" in rules
    assert all(i["evidence"] for i in r.json())
    assert len(client.get("/api/insights", headers=analista).json()) >= len(r.json())


def test_reports_and_audit(client, analista, admin):
    for kind in ("ventas", "estadistico", "productos", "clientes", "vendedores"):
        r = client.get(f"/api/reports/{kind}?days=90", headers=analista)
        assert r.status_code == 200 and r.json()["rows"], kind
    assert client.get("/api/reports/inexistente", headers=analista).status_code == 404
    actions = {a["action"] for a in client.get("/api/audit?limit=300", headers=admin).json()}
    assert {"login", "registrar_venta", "anular_venta"} <= actions


def test_customer_duplicate_document_and_history(client, vendedor):
    first = client.post("/api/customers", headers=vendedor, json={"name": "Cliente Prueba", "document": "99887766"})
    assert first.status_code == 201
    dup = client.post("/api/customers", headers=vendedor, json={"name": "Otro", "document": "99887766"})
    assert dup.status_code == 409
    hist = client.get(f"/api/customers/{first.json()['id']}/history", headers=vendedor)
    assert hist.status_code == 200 and hist.json()["purchases"] == 0


def test_inventory_adjust(client, almacen):
    product = client.get("/api/products", headers=almacen).json()[0]
    up = client.post("/api/inventory/adjust", headers=almacen,
                     json={"product_id": product["id"], "kind": "entrada", "quantity": 10, "reference": "compra"})
    assert up.status_code == 200 and up.json()["stock"] == product["stock"] + 10
    neg = client.post("/api/inventory/adjust", headers=almacen,
                      json={"product_id": product["id"], "kind": "ajuste", "quantity": -100000})
    assert neg.status_code == 400


def test_profile_and_password_change(client, admin):
    me = client.put("/api/auth/me", headers=admin, json={"name": "Nombre Nuevo"})
    assert me.status_code == 200 and me.json()["name"] == "Nombre Nuevo"
    assert client.put("/api/auth/me", headers=admin, json={"name": "x"}).status_code == 422
    wrong = client.post("/api/auth/change-password", headers=admin,
                        json={"current_password": "incorrecta", "new_password": "NuevaClave123"})
    assert wrong.status_code == 400  # no 401: no debe cerrar la sesión
    short = client.post("/api/auth/change-password", headers=admin,
                        json={"current_password": "admin123", "new_password": "corta"})
    assert short.status_code == 422
    ok = client.post("/api/auth/change-password", headers=admin,
                     json={"current_password": "admin123", "new_password": "NuevaClave123"})
    assert ok.status_code == 204
    assert client.post("/api/auth/login", json={"email": "admin@salesia.com", "password": "NuevaClave123"}).status_code == 200
    assert client.post("/api/auth/login", json={"email": "admin@salesia.com", "password": "admin123"}).status_code == 401
    # Deja la contraseña como estaba para no afectar a otras pruebas
    back = client.post("/api/auth/change-password", headers=admin,
                       json={"current_password": "NuevaClave123", "new_password": "admin123"})
    assert back.status_code == 204


def test_user_creation_permissions(client, admin, vendedor):
    body = {"name": "Nuevo Vendedor", "email": "nuevo.vend@salesia.com", "password": "clave1234", "role": "vendedor"}
    assert client.post("/api/users", headers=vendedor, json=body).status_code == 403
    assert client.post("/api/users", headers=admin, json=body).status_code == 201
    assert client.post("/api/users", headers=admin, json=body).status_code == 409
    login = client.post("/api/auth/login", json={"email": body["email"], "password": body["password"]})
    assert login.status_code == 200 and login.json()["user"]["role"] == "vendedor"
    # Un gerente (no admin) solo puede crear roles operativos
    client.post("/api/users", headers=admin, json={"name": "Gerente Dos", "email": "gerente2@salesia.com",
                                                    "password": "clave1234", "role": "gerente"})
    g = client.post("/api/auth/login", json={"email": "gerente2@salesia.com", "password": "clave1234"}).json()
    gh = {"Authorization": f"Bearer {g['access_token']}"}
    assert client.post("/api/users", headers=gh, json={**body, "email": "otro@salesia.com", "role": "admin"}).status_code == 403
    assert client.post("/api/users", headers=gh, json={**body, "email": "otro@salesia.com", "role": "almacen"}).status_code == 201
