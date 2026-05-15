"""Append one concise keyPoint to each ALL_SO entry in App.jsx."""
from __future__ import annotations

import re
from pathlib import Path

APP = Path(__file__).resolve().parent.parent / "src" / "App.jsx"
text = APP.read_text(encoding="utf-8")
start = text.index("const ALL_SO = [")
api = text.index("async function callClaude", start)
chunk = text[start:api]
end = start + chunk.rfind("];") + len("];")
head = text[:start]
block = text[start:end]
tail = text[end:]

pat = re.compile(
    r'(\{ num:(\d+),\s+title:"([^"]+)"[\s\S]*?keyPoints:\[)([\s\S]*?)(\]\s*\},)',
)


def extra_kp(num: int, title: str) -> str:
    t = title.lower()
    if num == 1:
        return "Sanctioned strength is a budget ceiling — unauthorised over-posting creates discipline and pay problems"
    if num == 2:
        return "Know the hierarchy: SO > DO > Divisional/Branch > Station — junior orders cannot contradict superior instruments"
    if "commendation" in t:
        return "Gifts vs duty: if in doubt, refuse and refer upward — PSR Regs 146-148 still apply alongside S.O. 3"
    if "personnel records" in t:
        return "Inset Sheet comments follow an officer for promotion — ensure facts, not personalities, are recorded"
    if "vacation leave" in t:
        return "Cross-check S.O. 5 narrative with PSR Part VIII timeframes — examiners expect consistency across instruments"
    if "attire" in t or "appearance" in t:
        return "Patrol Orders plus PSR Reg 143 together govern turn-out — cite both when answering dress-code essays"
    if "identification" in t:
        return "ID production protects the public from impersonation — failure to produce on lawful demand undermines legitimacy"
    if "compliment" in t:
        return "Compliments encode respect for command and symbols — they are discipline-neutral but morale-positive"
    if "handover" in t:
        return "Incomplete handover certificates = continuity gaps that courts and PCA investigations will exploit"
    if "criminal prosecution" in t or (num == 10 and "process" in t):
        return "Station bail is summary-lane only — never blur with indictable High Court bail regimes"
    if "beat" in t or "patrol" in t:
        return "RED ink night entries flag audit priority — supervisors must spot-check beats against diary entries"
    if "uniform and equipment" in t:
        return "Kit Book gaps surface at Board of Survey — reconcile issues before annual inspections"
    if "inspection" in t:
        return "Unsigned Visitors Book = no proof the FDO satisfied monthly visit duties"
    if "police buildings" in t:
        return "Sentry orders should align with S.O. 38 security — do not treat the sentry as ceremonial only"
    if "furniture" in t:
        return "Joint inventory on relief prevents 'missing stores' charges landing solely on the outgoing NCO"
    if "pocket diary" in t:
        return "Contemporaneous pocket diary notes can corroborate use-of-force timelines in PCA or civil suits"
    if "station diary" in t:
        return "SDO owns completeness — sergeants must chase subordinates for same-shift omissions before handover"
    if "wanted" in t:
        return "Daily Notice Board checks should be logged — 'I forgot to read the board' is never a defence"
    if "band" in t:
        return "Commissioner's permission gate exists because band appearances are political-optics sensitive"
    if "mounted" in t:
        return "Animal welfare failures are public-order and discipline issues — registers prove due diligence"
    if "canine" in t:
        return "Dog deployments must match certification — using a drug dog for crowd control without authorisation is a review risk"
    if "licensed premises" in t:
        return "Objections to liquor licences require factual community-impact grounds, not personal dislike of an owner"
    if "correspondence" in t:
        return "Minutes on dockets create an audit trail — lazy 'Noted' minutes invite supervisory bounce-back"
    if "cremation" in t:
        return "Suspicious-death nexus: coordinate with CID before AO signs off — premature permits destroy evidence"
    if num == 26 and "property" in t:
        return "Chain of custody from Charge Room to Property Room must mirror exhibit rules for court"
    if "lost and stolen" in t:
        return "Accurate property descriptions feed CRO circulars — vague entries rarely recover goods"
    if "classification" in t:
        return "Serious vs minor classification drives resource and legal pathway — misclassification delays specialist units"
    if "identification of suspects" in t:
        return "Defence counsel will attack parade integrity — document start/end times and everyone present"
    if "scientific" in t:
        return "Unauthorised fingerprinting is itself a legal risk — use only designated bureau staff"
    if "miscellaneous reports" in t:
        return "24-hour occurrence rule forces supervisors to chase late filings before the next parade"
    if "statements" in t:
        return "Caution wording must be verbatim — paraphrasing invalidates lengthy suspect interviews"
    if "mentally ill" in t:
        return "Humane handling + Mental Health Act interface — police assist, they do not replace clinicians"
    if "fires" in t:
        return "Scene preservation for arson competes with rescue — sergeant balances life-safety first, then cordon"
    if "drums" in t or "music" in t:
        return "Noise complaints often mix licencing with breach of peace — be ready to use both SO and common law"
    if "supervisee" in t:
        return "Monthly reporting is mandatory rhythm — missing months breach statutory supervision duties"
    if "promotion" in t:
        return "Merit list integrity depends on clean appraisal files — fix adverse entries before board season"
    if "charge room" in t:
        return "Warrantless arrest enquiries protect liberty — skip them and risk unlawful detention claims"
    if "telecommunication" in t:
        return "999 abandonment is a service-failure headline — roster slack to cover meal breaks on the console"
    if num == 40 and "firearms" in t and "police" not in t.lower():
        return "FUL investigations affect public safety licensing — sloppy recommendations can arm unsuitable persons"
    if "police firearms" in t:
        return "Every round accounted for — ammunition variances trigger automatic discipline reviews"
    if "industrial" in t:
        return "Notify specialist regulators early — joint scenes need unified command and evidence sharing"
    if "financial" in t:
        return "Petty cash shortcuts invite audit findings — voucher discipline is leadership, not bureaucracy"
    if "motor vehicle" in t or "road traffic" in t:
        return "Serious traffic death scenes engage both traffic homicide protocol and CRO death notifications"
    if "civilian employees" in t:
        return "Passes control building access — terminated civilians must surrender passes the same day"
    if "marshals" in t or "bailiffs" in t:
        return "Verify court papers before assisting — executing void process exposes the Service to liability"
    if "woman police" in t:
        return "Gender-sensitive investigations still need evidence law — empathy never replaces lawful procedure"
    if "disciplinary procedure" in t or ("complaints" in t and num == 48):
        return "Constitution s.123(1) delegation means superintendents' tribunals must still respect PSR fair-hearing steps"
    if "care of police vehicles" in t:
        return "Unauthorised private use of marked vehicles is a fast-track discredit charge — log pool-car sign-outs"
    if "medical benefit" in t or "sick leave" in t:
        return "Inconsistent sick-leave patterns should trigger welfare referral before they become conduct allegations"
    if "missing persons" in t:
        return "Early phone data and CCTV preservation beats reactive door-knocking days later"
    if "books" in t and "registers" in t:
        return "Retention schedules are legal duties — premature destruction can obstruct commissions of inquiry"
    if "domestic violence" in t:
        return "Risk assessment + safety planning should accompany every DV diary entry — templated referrals save lives"
    if "protests" in t:
        return "Proportionate force means last resort — document warnings, routes, and command decisions minute-by-minute"
    if "powder magazine" in t:
        return "Explosives security is zero-error — combine SO duties with national explosives regulations on joint sites"
    return "Tie operational answers to the numbered S.O. section your OC can produce in audit"


def repl(m: re.Match) -> str:
    pre, num_s, title, inner, post = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
    add = extra_kp(int(num_s), title)
    if add in inner:
        return m.group(0)
    inner_clean = inner.rstrip()
    if inner_clean and not inner_clean.endswith(","):
        inner_clean += ","
    inner_clean += '\n      "' + add + '"'
    return pre + inner_clean + post


new_block, n = pat.subn(repl, block)
if n < 50:
    print("Warning: expected ~54 replacements, got", n)
APP.write_text(head + new_block + tail, encoding="utf-8")
print("Updated", n, "Standing Order entries")
