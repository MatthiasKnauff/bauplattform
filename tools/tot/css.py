"""Tote Stilregeln – Suchlauf (21.11.2026). Aufruf im Hauptordner:  python3 tools/tot/css.py [--weg]

Eine Klasse gilt als tot, wenn ihr Name außerhalb der Stilblätter nirgends vorkommt – auch nicht als Anfang eines zusammengesetzten Namens
(`'am-' + x`, `vs-${k}`) – und nicht auf eine Ziffer endet (`sp${n}`). Entfernt werden (mit --weg) nur Selektoren, die eine solche Klasse
außerhalb von Klammern tragen; was in :is(…)/:not(…) steht, bleibt. Regeln ohne übrigen Selektor fallen ganz weg, leere @media ebenso.
Vor dem Übernehmen die Liste durchsehen und die Oberflächentests laufen lassen. Toten Code prüft tools/tot/code.py."""
import re,subprocess,os,collections,sys
files=[p for p in subprocess.check_output(['git','ls-files']).decode().split() if os.path.exists(p) and p.endswith(('.js','.html','.py','.css','.mjs','.md','.json','.svg','.txt','.yml')) and 'vendor' not in p and 'pdfjs' not in p and os.path.getsize(p)<3e6]
T={p:open(p,errors='ignore').read() for p in files}
nc="\n".join(t for p,t in T.items() if not p.endswith('.css'))
W=collections.Counter(re.findall(r'[A-Za-z_][\w-]*',nc))
def tot(k):
    if W[k] or re.search(r'\d$',k): return False
    teile=k.split('-')
    for i in range(1,len(teile)):   # jeder Anfang „a-“, „a-b-“ … gefolgt von Zeichenkettenende/Einsetzung = zusammengesetzt
        if re.search(re.escape('-'.join(teile[:i])+'-')+r"['\"`$]",nc): return False
    if re.search(re.escape(k)+r"['\"`$]\s*\+|\+\s*['\"`]"+re.escape(k),nc): return False
    return True
ges=0
for p,t in T.items():
    if not p.endswith('.css'): continue
    out=[];i=0;n=0
    # Regeln: Selektor{…} ohne geschachtelte Klammern im Rumpf; @-Blöcke bleiben als Rahmen stehen
    pat=re.compile(r'([^{}@/]+?)\{([^{}]*)\}')
    def teilen(sel):   # an Kommas teilen, aber nicht in Klammern (:is(a,b), :not(a,b))
        out,t,cur=[],0,''
        for ch in sel:
            if ch=='(': t+=1
            elif ch==')': t-=1
            if ch==',' and t==0: out.append(cur); cur=''
            else: cur+=ch
        out.append(cur); return out
    def aussen(s):   # Selektor ohne alles, was in Klammern steht
        out,t='',0
        for ch in s:
            if ch=='(': t+=1
            elif ch==')': t-=1
            elif t==0: out+=ch
        return out
    def ers(m):
        global ges
        sel=m.group(1); vor=re.match(r'\s*',sel).group(0)
        S=teilen(sel.strip())
        bleib=[s for s in S if not any(tot(k) for k in re.findall(r'\.([A-Za-z_][\w-]*)',aussen(s)))]   # nur Klassen außerhalb von Klammern – in :is()/:not() bleibt alles stehen
        if len(bleib)==len(S): return m.group(0)
        ges+=len(S)-len(bleib)
        print('  -',p.split('/')[-1],[s.strip() for s in S if s not in bleib][:3])
        return (vor+','.join(bleib)+'{'+m.group(2)+'}') if bleib else vor.rstrip(' ')
    neu=pat.sub(ers,t)
    neu=re.sub(r'\n[ \t]*\n[ \t]*\n+','\n\n',neu)
    neu=re.sub(r'@media[^{}]*\{\s*\}\n?','',neu)
    if neu!=t and '--weg' in sys.argv: open(p,'w').write(neu)
print(ges,'Selektoren')
