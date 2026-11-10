"""Adresssuche und Koordinaten: liegt im Kern (bpcore.geo) – hier nur unter dem gewohnten Namen des Bautagebuchs."""
import sys

from bpcore import geo

sys.modules[__name__] = geo
