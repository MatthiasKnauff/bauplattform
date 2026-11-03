def all(con):
    return {r["key"]: r["value"] for r in con.execute("SELECT key, value FROM settings")}


def put(con, key, value):
    con.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                (key, value))
