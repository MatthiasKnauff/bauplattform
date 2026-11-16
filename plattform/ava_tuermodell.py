"""Fenster- & Türliste aus dem Gebäudemodell (GO 16.11.2026, Frage 8): Das Modell ist die Quelle. Die Liste „1“ der Ausschreibung zeigt,
was im Modell neu oder anders ist, und übernimmt Nummer, Geschoss, Raum, Art, Maße und Brüstung (Kern: bpcore/elemente.py); die
Ausschreibungsfelder bleiben. Bei der Linie „automatisch“ (Karte der Verknüpfungen) übernimmt die Liste beim Öffnen selbst.

GET  /api/projekt/<pid>/tueren/modell?liste=1&nur= → {neu, geaendert, elemente}   (nur = fenster | tueren)
POST /api/projekt/<pid>/tueren/modell?liste=1&nur= → übernehmen; automatisch nur in Liste „1“
"""
from flask import g, jsonify, request

from ava import _sees, app
from bpcore import bauteilliste as B, db, elemente, modell


@app.route("/api/projekt/<int:pid>/tueren/modell", methods=["GET", "POST"])
def tueren_modell(pid):
    with db.tx() as c:
        if not _sees(c, pid):
            return jsonify(error="Projekt nicht gefunden"), 404
        M = modell.lesen(c, pid)
        L = B.sauber(M["modell"].get("bauteilliste"))
        linie = next((x for x in modell.links(c, pid) if x.get("app") == "ausschreibung"), {})
        if not L.get("elemente"):
            return jsonify(neu=0, geaendert=0, elemente=0)
        if linie.get("zustand") == "getrennt" or linie.get("richtung") == "zum_modell":
            return jsonify(neu=0, geaendert=0, elemente=len(L["elemente"]), getrennt=True)
        liste = "".join(ch for ch in (request.args.get("liste") or "1") if ch.isalnum() or ch in "-_")[:20] or "1"
        nur = request.args.get("nur") if request.args.get("nur") in ("fenster", "tueren") else ""
        if request.method == "POST" or (linie.get("uebernahme") == "auto" and liste == "1" and not nur):
            A = elemente.tuerliste_uebernehmen(c, pid, L, g.user["name"], liste, nur)
            return jsonify(neu=0, geaendert=0, uebernommen=A["neu"] + A["geaendert"], elemente=len(L["elemente"]))
        A = elemente.tuerliste_abgleich(c, pid, L, liste, nur)
        return jsonify(neu=A["neu"], geaendert=A["geaendert"], elemente=len(L["elemente"]))
