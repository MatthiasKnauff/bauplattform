"""Rechentests E-Rechnung (plattform/ava_erechnung.py) und Lesen von Firmenrechnungen (ava_lesen): XRechnung/ZUGFeRD in CII und UBL,
OZ des LV vorn in der Bezeichnung, Abzüge der Firma sind keine Positionen; Minus als weiches Trennzeichen; OZ-Kurzform 01.0020 ↔ 01.2.
Testdaten sind erfunden (keine echte Rechnung im Repo)."""
import io

import ava_erechnung as E
import ava_lesen as AL
from lib import gleich, pruefe

CII = b"""<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
 <rsm:ExchangedDocument><ram:ID>RE-0815</ram:ID><ram:IssueDateTime><udt:DateTimeString format="102">20261106</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
 <rsm:SupplyChainTradeTransaction>
  <ram:IncludedSupplyChainTradeLineItem><ram:SpecifiedTradeProduct><ram:Name>03.2 Wandanschluss herstellen</ram:Name><ram:Description>Diverse&lt;br /&gt;</ram:Description></ram:SpecifiedTradeProduct>
   <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>54.90</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
   <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="LM">31.97</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
   <ram:SpecifiedLineTradeSettlement><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>1755.15</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>
  <ram:IncludedSupplyChainTradeLineItem><ram:SpecifiedTradeProduct><ram:Name>Mehrpreis Trittschutz</ram:Name></ram:SpecifiedTradeProduct>
   <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>5.88</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
   <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="MTK">10</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
   <ram:SpecifiedLineTradeSettlement><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>58.80</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>
  <ram:IncludedSupplyChainTradeLineItem><ram:SpecifiedTradeProduct><ram:Name>Sicherheitseinbehalt (5%)</ram:Name></ram:SpecifiedTradeProduct>
   <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="H87">1</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
   <ram:SpecifiedLineTradeSettlement><ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>-90.70</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation></ram:SpecifiedLineTradeSettlement></ram:IncludedSupplyChainTradeLineItem>
  <ram:ApplicableHeaderTradeAgreement><ram:SellerTradeParty><ram:Name>Musterdach GmbH</ram:Name></ram:SellerTradeParty></ram:ApplicableHeaderTradeAgreement>
  <ram:ApplicableHeaderTradeSettlement><ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:TaxBasisTotalAmount>1723.25</ram:TaxBasisTotalAmount>
   <ram:TaxTotalAmount currencyID="EUR">327.42</ram:TaxTotalAmount><ram:GrandTotalAmount>2050.67</ram:GrandTotalAmount><ram:DuePayableAmount>2050.67</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation></ram:ApplicableHeaderTradeSettlement>
 </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>"""

UBL = b"""<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
 <cbc:ID>4711</cbc:ID><cbc:IssueDate>2026-11-02</cbc:IssueDate>
 <cac:LegalMonetaryTotal><cbc:TaxExclusiveAmount currencyID="EUR">200.00</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">238.00</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="EUR">238.00</cbc:PayableAmount></cac:LegalMonetaryTotal>
 <cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="MTK">20</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="EUR">200.00</cbc:LineExtensionAmount>
  <cac:Item><cbc:Name>01.0010 Estrich abbrechen</cbc:Name></cac:Item><cac:Price><cbc:PriceAmount currencyID="EUR">10.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>
</Invoice>"""


def test_cii():
    R = E.lesen(CII)
    k, Z = R["kopf"], R["zeilen"]
    gleich((k["re_nr"], k["datum"], k["brutto"], k["firma"]), ("RE-0815", "2026-11-06", 2050.67, "Musterdach GmbH"), "Kopf aus CII")
    gleich([(z["oz"], z["kurz"], z["menge"], z["einheit"], z["ep"], z["gp"]) for z in Z],
           [("03.2", "Wandanschluss herstellen", 31.97, "m", 54.9, 1755.15), ("", "Mehrpreis Trittschutz", 10.0, "m²", 5.88, 58.8)], "Positionen: OZ aus der Bezeichnung, Einheit übersetzt")
    gleich(Z[0]["lang"], "", "„Diverse“ ist kein Langtext")
    gleich((k["netto"], len(k["abzuege"]), k["abzuege"][0]["betrag"]), (1813.95, 1, -90.7), "Einbehalt ist keine Position, Leistungsstand = Summe der Positionen")


def test_ubl_und_xml_aus():
    R = E.lesen(UBL)
    gleich((R["kopf"]["re_nr"], R["kopf"]["datum"], R["zeilen"][0]["oz"], R["zeilen"][0]["einheit"], R["zeilen"][0]["gp"]), ("4711", "2026-11-02", "01.0010", "m²", 200.0), "UBL")
    pruefe(E.xml_aus(UBL) == UBL and E.xml_aus(b"%PDF-1.4 ohne Anhang") is None and E.xml_aus(b"irgendwas") is None, "XML erkennen, PDF ohne Anhang")
    import pypdf
    w = pypdf.PdfWriter(); w.add_blank_page(width=200, height=200); w.add_attachment("factur-x.xml", CII)
    b = io.BytesIO(); w.write(b)
    pruefe(E.xml_aus(b.getvalue()) == CII, "Factur-X: XML aus dem PDF-Anhang")
    X = {"bloecke": [{"titel": False, "oz": "3.002", "kurz": "Wandanschluss", "lang": "", "menge": 31.97, "ep": 54.9, "gp": 1755.15, "seite": 2, "box": [0.1, 0.2, 0.9, 0.25]}]}
    k = E.anwenden(b.getvalue(), X)
    gleich((k["re_nr"], len(X["bloecke"]), X["bloecke"][0]["oz"], X["bloecke"][0]["seite"], X["bloecke"][0]["box"]), ("RE-0815", 2, "03.2", 2, [0.1, 0.2, 0.9, 0.25]),
           "Blöcke aus der E-Rechnung, Stelle im PDF vom Textblock mit gleichem Betrag")


def test_lesen_firmenrechnung():
    gleich((AL.zahl("\xad885,10"), AL.zahl("–12.870,43"), AL.zahl("1.208,18")), (-885.1, -12870.43, 1208.18), "Minus als weiches Trennzeichen oder Strich")
    gleich((AL.ozn_kurz("01.0020"), AL.ozn_kurz("01.0100"), AL.ozn_kurz("01.2")), (("1", "2"), ("1", "10"), ("1", "2")), "OZ-Kurzform")
    items = [{"id": "a", "typ": "pos", "oz": "03.0020", "kurz": "Wandanschluss zu vorgenannter Abdichtung herstellen"},
             {"id": "b", "typ": "pos", "oz": "03.0030", "kurz": "Wandanschluss zu vorgenannter Abdichtung herstellen"}]
    B = [{"titel": False, "oz": "3.003", "kurz": "03.3 Wandanschluss zu vorgenannter Abdichtung herstellen", "lang": "", "menge": 31.97},
         {"titel": False, "oz": "3.002", "kurz": "03.2 Wandanschluss zu vorgenannter Abdichtung herstellen", "lang": "", "menge": 31.97}]
    z = AL.zuordnen(B, items)
    gleich((z["a"]["oz"], z["b"]["oz"]), ("3.002", "3.003"), "gleicher Text: die OZ des LV in der Bezeichnung entscheidet (03.2 ↔ 03.0020)")
