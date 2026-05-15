import { useState, useEffect, useMemo } from "react";
import externalCorpusSummary from "./data/external-corpus-summary.json";
import pastQuestions from "./data/past-questions.json";
import deptOrdersIndex from "./data/dept-orders-index.json";
import modelHints from "./data/sergeant-model-hints.json";
import questionBankModelAnswers from "./data/question-bank-model-answers.json";
import questionChunks from "./data/question-chunks.json";

/* ══════════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════════ */
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Syne:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #07090f; }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shimmer { from { background-position:-200% center; } to { background-position:200% center; } }
  @keyframes glow    { 0%,100% { opacity:.4; } 50% { opacity:1; } }
  .lift { transition: transform .18s, box-shadow .18s; cursor: pointer; }
  .lift:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,.4) !important; }
  textarea { resize: vertical; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: #1e2d45; border-radius: 3px; }
`;
 
/* ══════════════════════════════════════════════════════════════
   PSR DATA — All 16 Parts with deep notes from official text
══════════════════════════════════════════════════════════════ */
const PSR_PARTS = [
  { id:"recruit", num:"Part I", title:"Recruitment & Appointment", regs:"Regs 3–10", color:"#4A90D9", icon:"📝",
    summary:"Governs entry into the TTPS. A candidate for appointment as a trainee must: (a) be a citizen of Trinidad and Tobago; (b) pass a medical examination by a Government Medical Officer; (c) undergo a polygraph test, psychological test, and drug test at the cost of the Service; (d) hold a police certificate of good character; (e) be at least 18 and not more than 35 years of age on 1st January of the year of appointment; (f) males must be at least 167cm in height; females at least 150cm; (g) possess passes in five CXC/GCE subjects including English Language; (h) hold a T&T driver's permit with a Class 3 endorsement; (i) pass a physical examination and agility test; and (j) pass a written examination. Successful candidates must submit a non-intimate DNA sample and undergo training at the Police Academy. Applications are submitted to the officer in charge of the Police Station nearest to where the applicant resides. Applications are valid for one year. The OC Station must fingerprint and trace each applicant, make inquiries into their suitability, and submit a report to the Recruiting Officer at the Police Academy. Sergeants should expect examination questions linking these objective criteria to the OC Station's gatekeeping role and the one-year validity rule.",
    keyPoints:[
      "Age: at least 18, not more than 35 on 1st January of the year of appointment",
      "Height: males at least 167cm; females at least 150cm",
      "Must hold 5 CXC/GCE passes including English Language",
      "Must hold a T&T driver's permit with Class 3 endorsement",
      "Must pass: medical examination, polygraph, psychological test, drug test, physical/agility test, and written examination",
      "Successful candidates must submit a DNA sample and complete training at the Police Academy",
      "Applications submitted to OC of nearest Police Station — valid for one year",
      "OC Station must fingerprint, trace, and investigate each applicant before forwarding to the Recruiting Officer",
      "Service number assigned on appointment and retained throughout entire career",
      "First Division appointments made by the President on the advice of the Police Service Commission",
      "Trainee allowance vs salary distinction (Part VI) begins only after substantive appointment — do not confuse recruitment medical with in-service sick leave rules"
    ]
  },
 
  { id:"probation", num:"Part II", title:"Probation & Promotion", regs:"Regs 11–26", color:"#38C172", icon:"⬆️",
    summary:"The probationary period for a constable on first appointment is TWO years. During probation the constable must be: (a) given every opportunity to learn their work and be tested; (b) accorded all possible facilities to acquire experience; and (c) subjected to sympathetic supervision. The senior officer must furnish TWO assessments to the Commissioner: a FIRST assessment after Year 1 (submitted not later than one month after the 12th month), and a FINAL assessment not earlier than six weeks nor later than two weeks before probation expires. Where the Commissioner decides to dismiss a constable during probation, the Commissioner must first give written notice specifying the reasons and requesting the constable to respond in writing within FOURTEEN days. An officer of the rank of Constable through to Sergeant may apply on the prescribed form to take the qualifying examination for promotion to the next rank. A constable must have completed THREE years of service and passed their Probationer's Examination before being eligible. Promotion within the Second Division is based on merit (examination results and performance appraisal), seniority, conduct, and the recommendation of the Promotion Advisory Board. An officer may be required to serve a probationary period after promotion. Annual performance appraisal reports are completed and officers must be informed of any adverse report before it is finalized. For Sergeants, the practical hook is that daily supervision notes feed the same appraisal trail the Commissioner relies on at confirmation and promotion boards.",
    keyPoints:[
      "Probationary period = 2 years for a constable on first appointment",
      "1st probationary assessment: submitted not later than 1 month after the 12th month of service",
      "Final probationary assessment: not earlier than 6 weeks, not later than 2 weeks before probation ends",
      "Dismissal during probation: Commissioner gives written notice — constable has 14 days to respond in writing",
      "Constable eligible for promotion after 3 years of service + passing the Probationer's Examination",
      "All Second Division promotion examinations are set and marked by the Examination Board appointed by the Commissioner",
      "Constables through to Sergeants may apply on the prescribed form to sit the qualifying examination",
      "Promotion within Second Division based on: merit, seniority, conduct, and Advisory Board recommendation",
      "Officer serves a probationary period after promotion and may be reverted if they fail to meet requirements",
      "Officers must be informed in writing of any adverse performance appraisal report before it is submitted",
      "Probation after promotion: failure can mean reversion — treat post-promotion probation with the same documentation rigour as a constable's first two years"
    ]
  },
 
  { id:"secondment", num:"Part III", title:"Secondment", regs:"Reg 27", color:"#9B72CF", icon:"🔄",
    summary:"Secondment is the temporary assignment of an officer to serve in another organisation or Government department while retaining their substantive office in the Service. Key rules: (1) An officer seconded within the Public Service is paid the salary of that office and is eligible for increments in that office. (2) Remuneration for secondment outside the Service is paid by the receiving organisation. (3) During secondment, the officer retains their substantive rank and remains eligible for promotion. (4) The period of secondment counts towards pension where the secondment is to another Government service or where the receiving body makes appropriate arrangements. (5) On return from secondment outside the Service, the officer reverts to the salary point in their substantive office they would have reached had they not been seconded. (6) A period of secondment shall not exceed TWO years. Exam questions often contrast secondment with transfer: secondment is temporary and rank is preserved; transfer changes posting under the Commissioner.",
    keyPoints:[
      "Officer retains substantive rank and remains eligible for promotion during secondment",
      "Secondment within the Public Service: officer paid the salary of the seconded office including increments",
      "Secondment outside the Service: remuneration paid by the receiving organisation",
      "Period of secondment counts towards pension where appropriate arrangements are made",
      "On return from external secondment: officer reverts to the salary point they would have reached",
      "Maximum period of secondment: 2 years",
      "Officer remains subject to Police Service Regulations for disciplinary matters while on secondment",
      "External secondment pay is not automatically on police scales — confirm funding source before advising an officer on household budgeting"
    ]
  },
 
  { id:"resign", num:"Part IV", title:"Resignation, Retirement & Termination", regs:"Regs 28–34", color:"#E05555", icon:"🚪",
    summary:"Resignation (Reg 28): An officer who intends to resign must send by registered mail or deliver a written notice to the Commissioner's office at least ONE MONTH before the date they wish to relinquish their appointment. The Commissioner may waive the notice requirement. An officer who fails to give proper notice without reasonable cause may forfeit all leave benefits. An officer may not withdraw their notice of resignation without the Commissioner's permission. Abandonment (Reg 29): An officer absent from duty without leave for SEVEN consecutive days, during which they have failed to notify their senior officer of the cause, may be declared to have abandoned their office. The office becomes vacant and the officer is treated as discreditably discharged. Termination (Reg 30): Services may be terminated for: dismissal after disciplinary proceedings, abolition of office, expiry of a temporary appointment, medical unfitness, or conviction for a criminal offence carrying 6+ months imprisonment. Retirement in the public interest (Reg 31): The Commissioner may require an officer to retire where it is in the public interest on grounds not suitable for disciplinary proceedings — the officer must be given the opportunity to make representations. An unfit officer may be granted up to 6 months sick leave on full pay; if still unfit after sick leave and vacation leave, their services are terminated with applicable benefits. Sergeants should document AWOL patterns early — seven straight days without explanation feeds abandonment, which is harsher than ordinary absence charges.",
    keyPoints:[
      "Resignation: at least 1 month's written notice sent by registered mail or delivered to the Commissioner's office",
      "Failure to give proper notice without reasonable cause: officer may forfeit all leave benefits",
      "Officer may not withdraw notice of resignation without Commissioner's permission",
      "Abandonment: absent without leave for 7 consecutive days without notifying senior officer of the cause",
      "Abandonment = office becomes vacant; officer treated as discreditably discharged",
      "Termination grounds include: disciplinary dismissal, abolition of office, medical unfitness, or criminal conviction carrying 6+ months imprisonment",
      "Retirement in public interest: Commissioner may require retirement on grounds not suitable for discipline — officer given opportunity to make representations",
      "Unfit officer: up to 6 months sick leave on full pay; if still unfit after sick and vacation leave, services are terminated with applicable benefits",
      "Commissioner must consider officer's 5-year record (or full service if less than 5 years) before requiring retirement in public interest",
      "Retirement in the public interest is administrative, not a disciplinary finding — different procedural safeguards from Reg 151 charges"
    ]
  },
 
  { id:"division", num:"Part V", title:"Police Division, District & Station", regs:"Regs 35–37", color:"#4A90D9", icon:"🏢",
    summary:"The structure of the Police Service is determined by the Minister. There shall be such Divisions and Branches as the Minister determines (Reg 35). Each Division shall be sub-divided into Police Districts, with one or more Police Stations in each District. The Commissioner shall publish the boundaries of Police Divisions and Police Districts in the Gazette. The Commissioner may establish Administrative or Operational Units as approved by the Minister. Assignment of officers (Reg 36): The Commissioner may assign any number of officers to Divisions, Branches, Stations, or other Units as he considers necessary for the efficient functioning of the Service. Buildings (Reg 37): The Minister may assign buildings for the use of the Service. The Minister of Health must approve any building used for hospitalisation. This Part establishes the geographic framework within which every police officer operates — understanding the structure of Divisions, Districts, and Stations is essential for any sergeant. Gazette publication fixes jurisdiction for beats, crime stats, and mutual aid — cite it when explaining why an officer cannot unilaterally redefine district lines.",
    keyPoints:[
      "Divisions and Branches determined by the Minister",
      "Each Division sub-divided into Districts; each District has one or more Stations",
      "Commissioner publishes boundaries of Divisions and Districts in the Gazette",
      "Commissioner may establish Administrative or Operational Units with Ministerial approval",
      "Commissioner assigns officers to Divisions, Branches, Stations, or Units as necessary",
      "Buildings for the Service assigned by the Minister",
      "Minister of Health must approve any building used for hospitalisation",
      "The geographic structure is the foundation for understanding jurisdiction, posting, and transfer rules",
      "Minister sets structure; Commissioner assigns manpower within it — sergeants execute assignments, they do not create new units"
    ]
  },
 
  { id:"salary", num:"Part VI", title:"Salaries, Allowances & Increments", regs:"Regs 38–65", color:"#E8A838", icon:"💰",
    summary:"Trainees receive a trainee allowance (not a salary) at a rate approved by the Minister of Finance (Reg 38). An officer's salary on first appointment is computed from the date they assume duties (Reg 39). On promotion, an officer receives the salary of the new office from the effective date of promotion or from the date they assume duties as specified in the promotion letter (Reg 40). Salaries are paid on the day immediately preceding the last business day of the month (Reg 41). Deductions (Reg 43): No deduction may be made from salary without at least ONE MONTH's prior written notice. The Commissioner may, however, immediately deduct: fines and penalties from disciplinary action, and overpayments of salary. An officer acquiring shares or interests in any commercial undertaking must inform the Commissioner in writing within 30 days. Increments (Reg 44): On promotion, the officer receives the salary at the point nearest to — but not less than — their current salary, plus one increment where possible. Overtime (Reg 66): Officers working in excess of 40 hours per week shall receive commuted overtime pay, compensatory time off, or overtime pay. Overtime claims submitted more than 6 months after the work was done shall not normally be allowed. Key allowances include: Acting Allowance (Reg 52) — for performing duties of a higher rank; Funeral Grant (Reg 53); Hardship Allowance (Reg 54); Housing Allowance (Reg 55); Plain Clothes Allowance (Reg 56); Proficiency Allowance (Reg 57); Temporary Separation Allowance (Regs 58–60) — for officers separated from family on transfer; Subsistence and Meal Allowances (Reg 62); Attorney Allowance (Reg 64). Sergeants briefing subordinates should stress that immediate deduction powers are narrow — only fines from discipline and proven overpayments.",
    keyPoints:[
      "Trainees receive a trainee allowance — not a full salary",
      "Salary on first appointment: computed from the date duties are assumed",
      "Salary on promotion: from the effective date of promotion or the date duties are assumed — as specified in promotion letter",
      "Salary paid on the day immediately preceding the last business day of the month",
      "Deductions from salary: at least 1 month's prior written notice required",
      "Exception: Commissioner may immediately deduct fines from disciplinary action and salary overpayments",
      "Officer acquiring shares/commercial interests: must inform Commissioner in writing within 30 days",
      "On promotion: officer receives salary nearest to (but not less than) current salary, plus one increment where possible",
      "Overtime in excess of 40 hours per week: compensatory time off, commuted overtime, or overtime pay",
      "Overtime claims not normally allowed if submitted more than 6 months after the work was done",
      "10 types of allowances: Acting, Funeral Grant, Hardship, Housing, Plain Clothes, Proficiency, Temporary Separation, Subsistence/Meal, Travelling Abroad, Attorney",
      "Commercial shareholding disclosure (30 days) aligns with Reg 133 conduct — failure to disclose can engage both finance and discipline tracks"
    ]
  },
 
  { id:"hours", num:"Part VII", title:"Hours of Work & Personnel Records", regs:"Regs 66–73", color:"#E05555", icon:"⏰",
    summary:"Work week (Reg 66): A week consists of 7 days; normal working hours are 40 hours. The normal daily period of duty for a Second Division officer shall not exceed 8 hours, performed in one tour. An officer shall not normally be on duty for more than 4 hours without a break of at least 1 hour. Every Second Division officer is entitled to 2 full weekly rest days (in lieu of Saturdays and Sundays). An officer may be required to report for duty at any time (Reg 67) — the exigencies of the Service override prescribed hours. Transfer (Reg 68): The Commissioner must give at least 14 days' written notice of a proposed transfer. In considering a transfer, the Commissioner must take into account any hardship it may occasion. However, where the exigencies of the Service require, the Commissioner may transfer an officer WITHOUT NOTICE. Personal Records (Reg 69): The Commissioner keeps a personal record of each officer containing a full description, service history, record of qualifications, promotions, disciplinary matters, and all other prescribed information. Certificate of Service (Reg 70): Every officer is entitled to a Certificate of Service on leaving. Performance Appraisal (Regs 71–73): Annual performance appraisal reports are completed. An officer MUST be informed of any adverse report and given an opportunity to respond before it is submitted. Annual increments are linked to satisfactory appraisal results. Operational reality: major events suspend the 'normal' 8-hour model — document extensions so appraisals and overtime claims stay coherent.",
    keyPoints:[
      "Normal working week: 40 hours; normal daily duty: not more than 8 hours",
      "No officer should be on duty for more than 4 hours without a break of at least 1 hour",
      "Every Second Division officer entitled to 2 weekly rest days",
      "Officers may be required to report for duty at any time — exigencies of the Service override prescribed hours",
      "Transfer: Commissioner must give at least 14 days' written notice",
      "Commissioner must consider hardship when proposing a transfer",
      "Transfer WITHOUT NOTICE permitted where exigencies of the Service require it",
      "Commissioner keeps a personal record for every officer containing full service history",
      "Every officer entitled to a Certificate of Service on leaving",
      "Adverse appraisal report: officer MUST be informed in writing and given opportunity to respond before submission",
      "Annual increments are linked to satisfactory performance appraisal results",
      "Transfer without notice is lawful only on true Service exigency — keep contemporaneous notes for post-event review and welfare follow-up"
    ]
  },
 
  { id:"leave", num:"Part VIII", title:"Vacation Leave & Medical Benefits", regs:"Regs 74–98", color:"#4A90D9", icon:"🏖️",
    summary:"Leave entitlement (Reg 76): Officers in Grades 1–9 with 1–10 years of service are entitled to 28 working days of vacation leave per year; with over 10 years of service, 35 working days. Saturdays, Sundays, and public holidays are not counted in computing leave. No more than 15% of officers assigned to any Division or Branch may be granted leave at the same time. Eligibility: An officer is eligible for vacation leave only after completing 1 year of service (Reg 75). Leave cannot be earned while on vacation leave or extended sick leave (Reg 77). An officer recalled from vacation leave must be reimbursed for any reasonable out-of-pocket expenses (Reg 75). Deferred leave (Reg 79): Where leave is deferred due to the exigencies of the Service, the deferred leave plus the next year's leave must be granted in the following year. Casual absences (Reg 80): With prior written approval of the Commissioner, an officer may be absent casually; such absences are deducted from the vacation leave balance. Court attendance while on leave (Reg 86): Days spent attending court while on vacation leave are restored to the leave balance. Sick leave (Reg 89): Absence for more than 2 consecutive days is not treated as sick leave unless supported by a medical certificate from a qualified practitioner. Extended sick leave (Regs 90–91): Extended sick leave beyond the standard entitlement requires Commissioner's approval. An officer abroad who has exhausted sick leave must return to T&T for a Medical Board examination. Medical certificate (Reg 92): Required for any sick absence exceeding 2 consecutive days. Medical History Book (Reg 93): Kept to record every illness, random drug test result, and injury sustained during service. Medical benefits (Reg 98): Officers are entitled to free medical attention and hospitalization at government expense. The 15% cap is the usual examination trap — it forces staggered leave rosters at station level.",
    keyPoints:[
      "Vacation leave: 28 working days (1–10 years of service); 35 working days (over 10 years)",
      "Saturdays, Sundays, and public holidays are NOT counted in computing leave",
      "No more than 15% of officers in a Division or Branch may be on leave at the same time",
      "Eligible for vacation leave only after completing 1 year of service",
      "Leave cannot be earned while on vacation leave or extended sick leave",
      "Officer recalled from leave: must be reimbursed for reasonable out-of-pocket expenses",
      "Deferred leave: must be granted in the following year together with that year's leave entitlement",
      "Casual absences deducted from vacation leave balance — require prior written approval",
      "Court attendance while on leave: those days are restored to the leave balance",
      "Sick leave: medical certificate required for absence exceeding 2 consecutive days",
      "Extended sick leave: Commissioner's approval required",
      "Medical History Book kept for every officer — records all illnesses, drug tests, and injuries",
      "Officers entitled to FREE medical attention and hospitalization at government expense",
      "Court days on vacation leave are credited back — ensure Station Diary and leave warrants agree or audits will fail"
    ]
  },
 
  { id:"custody", num:"Part IX", title:"Custody & Care of Prisoners", regs:"Regs 99–113", color:"#E8A838", icon:"🔒",
    summary:"Female cells (Reg 99): The female prisoner cell must have TWO locks with DIFFERENT keys — one key held by the officer-in-charge of the Charge Room; the other by a female officer. A duplicate of the female officer's key is kept in the Charge Room under the station seal. Except in an emergency, no female cell shall be opened except by or in the presence of a female officer. Opening cells (Reg 100): A cell with prisoners must be opened by NOT LESS THAN TWO officers. Searching (Reg 101): A prisoner must be searched: on arrest; on arrival at the station; immediately before being placed in a cell; and again on being taken from the cell. Male prisoners searched by two male officers; female prisoners by a female officer. Prisoner's property (Reg 102): All property found on a prisoner must be recorded in the charge book — this entry is read to the prisoner who must verify and sign. If the prisoner disputes the record, a note is made immediately and the OC is notified for investigation. Property required as a court exhibit is retained and handed to the General Property Keeper. On release, property is returned to the prisoner who must sign a receipt. Property held for more than 48 hours must be handed to the General Property Keeper. A prisoner's property may be handed to a third party on the prisoner's direction with a receipt (Reg 103). Visits (Reg 104): The officer-in-charge of the Reception Area shall visit a prisoner at least ONCE EVERY HOUR. Children of prisoners (Reg 105): Children of a prisoner with no relatives to care for them may be taken to a place of safety by a female officer. Feeding (Reg 106): Prisoners must be fed at prescribed times at government expense. Legal adviser (Reg 107): The officer-in-charge of the Charge Room must facilitate a prisoner's right to retain and instruct a legal adviser without delay. Sick prisoner (Reg 108): A sick prisoner must be seen by a medical practitioner immediately — they cannot be denied medical attention. Escort strength (Reg 109): Determined by the officer-in-charge based on the nature and risk of the prisoner. Handcuffs (Reg 112): Used for dangerous prisoners as authorized. Armed escort (Reg 113): Provided for especially dangerous prisoners. These safeguards exist to prevent escapes, self-harm, and civil claims — if the log does not reflect hourly visits, the defence will argue systemic neglect.",
    keyPoints:[
      "Female cell: 2 locks with DIFFERENT keys — Charge Room officer holds one; female officer holds the other",
      "Duplicate of female officer's key kept in Charge Room under the station seal",
      "Female cell: cannot be opened except by or in the presence of a female officer (except emergency)",
      "Cells with prisoners: opened by NOT LESS THAN 2 officers",
      "Prisoner searched: on arrest, on arrival at station, before placed in cell, AND on removal from cell",
      "Male prisoners searched by 2 male officers; female prisoners by a female officer",
      "Property record in charge book: read to prisoner, prisoner must verify and sign",
      "Disputed property entry: senior officer notes the dispute immediately and reports to OC for investigation",
      "Property held 48+ hours: handed to General Property Keeper and entered in General Property Register",
      "If prisoner handed to a gaoler: prisoner's property also handed to gaoler with a receipt",
      "Officer-in-charge of Reception Area must visit prisoners at least once every hour",
      "Children of prisoner with no relatives: taken to a place of safety by a female officer",
      "Prisoners entitled to: food at prescribed times, free medical attention, access to legal adviser",
      "Sick prisoner: must see a medical practitioner immediately — cannot be denied medical attention",
      "Reg 107 mirrors Constitution s.5 and S.O. 38 — delays in legal access can taint prosecutions and trigger PCA interest"
    ]
  },
 
  { id:"buildings", num:"Part X", title:"Buildings, Furniture & Facilities", regs:"Regs 114–120", color:"#38C172", icon:"🏢",
    summary:"Quarters (Reg 114): An officer may reside in official quarters provided or approved by the Minister. First Division officers occupy official quarters furnished and rent-free. Second Division officers occupy official quarters rent-free. Furniture (Reg 115): All government furniture in Police Stations, buildings, offices, and quarters must be maintained in good order — the responsibility rests with the senior officer in charge or the occupant of quarters. Repairs or replacements (Reg 116): When government furniture requires repair or replacement, the appropriate officer of the relevant Ministry must be notified so that inspection, repair, or replacement may be effected. Notice board (Reg 117): All proclamations, Government notices, notices of rewards, and official advertisements must be posted on notice boards at each Police Station. Reception Area (Reg 118): A Reception Area shall be attached to each Police Station — all books and records of the Station are kept and maintained there. Cells (Reg 119): At least TWO prisoners' cells must be provided at each Police Station — one for adult males and one for adult females. Hospital (Reg 120): A hospital for the treatment of officers is established at a place approved by the Minister of Health. It must have appropriate staff including medical officers, nurses, pharmacists, and trained attendants. Reception Areas concentrate accountability — sergeants supervising multiple registers should treat furniture defects as operational risk, not housekeeping trivia.",
    keyPoints:[
      "First Division officers: occupy official quarters furnished AND rent-free",
      "Second Division officers: occupy official quarters rent-free (unfurnished)",
      "All government furniture: maintained in good order — responsibility of senior officer in charge or occupant",
      "Furniture repairs or replacement: notify the appropriate officer of the relevant Ministry",
      "Notice board: all official proclamations, notices of rewards, and advertisements must be posted at every Station",
      "Reception Area attached to every Police Station — all Station books and records kept and maintained there",
      "At least 2 cells required at every Police Station — one for adult males, one for adult females",
      "Police hospital established at a place approved by the Minister of Health",
      "Hospital must have: medical officers, nurses, pharmacists, and trained attendants for custody of drugs and equipment",
      "Notice boards are legal notice to officers — failure to post updates can mean individuals miss binding policy changes"
    ]
  },
 
  { id:"uniform", num:"Part XI", title:"Uniform, Equipment & Arms", regs:"Regs 121–130", color:"#9B72CF", icon:"👮",
    summary:"Uniform and orders of dress (Reg 121): The description of all items of uniform and the orders of dress to be worn by officers are set out in Appendices C and D of the Regulations, as prescribed by the Commissioner with the approval of the Minister, and published in the Gazette. No unauthorized badge or decoration (Reg 122): An officer shall not whilst on duty in uniform wear any badge, emblem, or other decoration other than those officially approved. Issue of arms and ammunition (Reg 123): The Commissioner decides the quantity of arms and ammunition issued to an officer, Division, Branch, Section, or Station. The Commissioner may withdraw any arms and ammunition without assigning a reason. No arms or ammunition shall be issued except on the written authority of the Commissioner or a Deputy Commissioner. Control of ammunition (Reg 124): Ammunition not in use must be kept in sealed boxes — opened only for inspection or emergency. The type, quantity, and date of issue must be endorsed on each box. Any ammunition discharged or lost must be reported immediately to the Commissioner stating the quantity and circumstances. The Commissioner must keep a detailed account of all arms and ammunition received and issued. Issue of uniform (Reg 125): Issued in such quantities and at such periods as the Commissioner may direct. Wearing of plain clothes (Reg 126): An officer shall not wear plain clothes whilst on duty unless authorized by the Commissioner. In special circumstances, the Commissioner may require an officer to wear uniform when off duty. Stores and bedding (Regs 127–128): Issued to Divisions, Branches, and Stations at intervals and in quantities directed by the Commissioner. Requisition (Reg 129): Uniform, equipment, and stores supplied only on a proper requisition; a delivery and receipt voucher must be signed by both the issuing and receiving officers. Gazette-published dress rules are the antidote to 'unit customs' that creep in without lawful authority.",
    keyPoints:[
      "Uniform and orders of dress: prescribed by Commissioner with Ministerial approval, published in the Gazette",
      "No unauthorized badge, emblem, or decoration while on duty in uniform — disciplinary offence",
      "Commissioner decides quantity of arms and ammunition issued; may withdraw without assigning a reason",
      "No arms or ammunition issued except on the WRITTEN AUTHORITY of the Commissioner or a Deputy Commissioner",
      "Unused ammunition kept in SEALED BOXES — opened only for inspection or emergency",
      "Type, quantity, and date of issue must be endorsed on each ammunition box",
      "Ammunition discharged or lost: IMMEDIATE report to Commissioner stating quantity and circumstances",
      "Commissioner must keep a detailed account of all arms and ammunition received and issued",
      "Plain clothes: officer must be specifically authorized by the Commissioner to wear plain clothes on duty",
      "Requisition required for all uniform, equipment, and stores — delivery and receipt voucher signed by both officers",
      "Dual-signed vouchers protect both armoury and receiving NCO if ammunition counts later disagree with audit"
    ]
  },
 
  { id:"conduct", num:"Part XII", title:"Conduct", regs:"Regs 131–150", color:"#E8A838", icon:"⚖️",
    summary:"DUTIES OF AN OFFICER (Reg 131): The whole time of an officer is at the disposal of the Government. An FDO in charge of a Division or Branch is responsible for the state of his command, his district, and the conduct and efficiency of ALL officers under his command. A Second Division officer in charge of a Station is responsible for that Station, its district and the conduct and efficiency of all officers under his charge. In the absence of an OC, that authority and responsibility devolves on the next in seniority unless the Commissioner specifically directs otherwise. ABSENCE WITHOUT LEAVE / LEAVING THE COUNTRY (Reg 132): An officer shall not leave the country without the WRITTEN permission of the Commissioner. An officer granted permission to go abroad must supply BOTH a local AND foreign address — correspondence sent to either is deemed received. In an emergency a First Division officer may grant such permission to a Second Division officer (or a senior FDO to a junior FDO), but MUST immediately report it in writing to the Commissioner. ACTIVITIES OUTSIDE THE SERVICE (Reg 133): An officer shall not (a) engage in any activity that impairs their usefulness or conflicts with Service interests; (b) accept paid employment or engage in any trade, profession, commercial, agricultural or industrial undertaking without the Commissioner's consent; (c) on acquiring shares or any interest in any commercial undertaking, must inform the Commissioner in writing WITHIN 30 DAYS. POLITICAL AND PUBLIC SPEECH RESTRICTIONS (Regs 134–141): Reg 134 — shall not call, actively participate in, or procure signatures for any public meeting or petition considering Government action (does NOT prohibit participation in PSA-organised meetings on Service matters). Reg 135 — shall not institute or take part in any procession, demonstration or public meeting other than religious functions without the Commissioner's prior permission. Reg 136 — shall not communicate to the press or any person, or copy, official documents/papers/information unless duties require — contravention is a SEPARATE disciplinary offence even if also charged under another law. Reg 137 — shall not allow themselves to be interviewed on questions of public policy or matters affecting national defence or military resources. Reg 138 — shall not, without Commissioner's WRITTEN permission, broadcast (radio, TV, internet, any other means) or publish any personal comment on a national or local political or administrative matter. Reg 139 (Partisanship) — shall make NO public expression of political or sectarian opinion and shall bear themselves with strict impartiality. Reg 140 — shall not act as editor of a newspaper, take part directly or indirectly in its management, or contribute any statement that may reasonably be regarded as commentary on the politics or administration of any Government. Reg 141 — Rules for lectures/presentations: no payment to officer or Service may arise where the lecture/presentation is necessary to the Service's recognised duties; for non-departmental lectures by an officer who is an expert in a subject (whether specialised in that field officially or not), if the subject relates to Service work or policy or the officer is to be announced by departmental title, PRIOR WRITTEN permission of the Commissioner is required. Where permission is given, preparation and delivery must be done OUTSIDE official hours. REPRIMAND OF OFFICERS (Reg 142): A SENIOR OFFICER SHALL NOT BERATE AN OFFICER JUNIOR IN RANK in the presence or hearing of an officer junior to the officer being berated, OR in the presence or hearing of any member of the public. (This is a duty placed on the SENIOR officer, not a power to punish.) APPEARANCE AND TURN-OUT (Reg 143): An officer shall always appear in public properly dressed, cleanly and smartly turned out, smart in movements, and respectful in bearing. On duty: NO jewellery or trinkets except a wristwatch, an allergy-alert bracelet, and no more than TWO rings. MALE on duty — hair on head kept short; chin and under lip shaven; whiskers shall NOT be worn; shaving of the upper lip is OPTIONAL. FEMALE on duty — hair shall not be worn lower than the nape of the neck; unnatural hair colours and decorations shall NOT be worn; fingernails kept short with only natural nail polish; make-up simple and minimal. Where exempted from regulation shoes/stockings on medical grounds, prescribed footwear or DARK BLUE socks must be worn. INDEBTEDNESS (Reg 144): An officer shall NOT incur a debt he knows or ought to know he cannot discharge or which is likely to impair his efficiency or bring the Service into disrepute. The Commissioner may require the officer to authorise pay deductions for debts to the Government. An officer unable to discharge a debt MUST inform the Commissioner using the form in APPENDIX E. BANKRUPTCY (Reg 145): An officer who is declared bankrupt, against whom bankruptcy proceedings are taken, or who becomes insolvent, MUST report the fact in writing to the Commissioner WITHIN 7 DAYS. GIFT OR REWARD (Reg 146): Except with the Commissioner's WRITTEN permission, an officer shall NOT accept a gift or reward from a member of the public or any organisation. EXCEPTIONS (Reg 147): Notwithstanding Regs 146 and 148, an officer MAY accept a gift offered by — (a) a representative of a foreign government on the occasion of an official visit; (b) a community organisation on a social occasion where the gift represents appreciation for the officer's contribution to the organisation's work or achievement; (c) any person on a CELEBRATORY occasion. PRESENTS FROM SUBORDINATES (Reg 148): An officer shall NOT receive a gift or reward from a subordinate except with the Commissioner's WRITTEN permission. LEGAL PROCEEDINGS (Reg 149): An officer who (a) desires to initiate legal proceedings against any person, OR (b) is charged with a criminal offence and brought before a court, shall PROMPTLY inform the Commissioner in WRITING. OFFENCES (Reg 150): An officer who contravenes any regulation commits a disciplinary offence. The SEVENTEEN specific disciplinary offences listed at Reg 150(2) are: (a) Discreditable conduct; (b) Insubordinate or oppressive conduct (insubordination by word/act/demeanour; oppression of a junior; obscene/abusive/insulting language to another officer; assault on another officer); (c) Disobedience to orders; (d) Neglect of duty (failure to attend/carry out duty; withholding a report against another officer; not alert on duty; leaving beat without permission; permitting a prisoner to escape; failing to report a matter or evidence; omitting necessary entries; ignoring Police Medical Officer's instructions or retarding return to duty); (e) Falsehood or prevarication (false official statement; wilful or negligent misleading statement; destroying/mutilating/altering official records); (f) Breach of confidence (divulging secret matter; tipping off a person against whom a warrant is issued; unauthorised communication to public/press; showing Service property to outsiders; ANONYMOUS communications to the Commission/Commissioner/senior office; signing/circulating petitions outside the proper channel; calling or attending unauthorised meetings on Service matters); (g) Corrupt practice (failing to account for money or property received in official capacity; soliciting any gratuity/gift/subscription/testimonial without consent; placing oneself under pecuniary obligation to a person whose licence the Police may have to report on; improperly using position for private advantage); (h) Unlawful or unnecessary exercise of authority (unlawful or unnecessary arrest; unnecessary violence to a prisoner or other person; uncivil conduct toward a member of the public); (i) Malingering (feigning or exaggerating sickness or injury to evade duty); (j) Absence without leave or being late for duty; (k) Loss or damage to clothing or other property supplied (wilful or careless loss/damage; failing to report loss); (l) Drunkenness or drug-taking on or required for duty; (m) Drinking on duty or soliciting drink (drinking while on duty; persuading another to provide liquor; reporting for duty under the influence or with the odour of liquor on the breath); (n) Entering licensed premises (without permission or reasonable excuse, while on duty, entering any premises licensed under any written law or any other premises where intoxicating liquor is stored or distributed); (o) Lending, borrowing or accepting money where it compromises ability to discharge responsibility; (p) Being an accessory to a disciplinary offence (conniving at or knowingly being an accessory); (q) Using any property or facility of the Service without the Commissioner's written consent for a non-official purpose. Reg 150(3): An officer suspected of being under the influence of dangerous drugs or intoxicating liquor IS REQUIRED to submit to a breath test, analysis or laboratory analysis to determine blood alcohol concentration in accordance with the Motor Vehicles and Road Traffic Act, Chap. 48:50.",
    keyPoints:[
      "Reg 131: An officer's WHOLE TIME is at the disposal of the Government — no part-time mindset; FDO in charge of Division responsible for ALL officers under his command; in absence of OC, authority devolves on next in seniority unless Commissioner directs otherwise",
      "Reg 132: NEVER leave the country without the Commissioner's WRITTEN permission; if abroad must supply BOTH local AND foreign address; emergency permission may be granted by senior officer but must be reported in writing immediately",
      "Reg 133: NO paid employment, trade, profession, commercial/agricultural/industrial undertaking without Commissioner's consent; on acquiring shares or commercial interest must inform Commissioner in writing WITHIN 30 DAYS",
      "Reg 134-141 (Public speech): no public meetings/petitions on Government action (PSA meetings excepted); no demonstrations except religious functions without Commissioner's permission; no media interviews on public policy; no broadcasting/publishing personal comment on national matters without Commissioner's WRITTEN permission; STRICT impartiality (Reg 139); shall NOT edit, manage or write commentary for any newspaper (Reg 140); lectures/presentations require prior WRITTEN permission if subject relates to Service work or officer is announced by departmental title (Reg 141)",
      "Reg 142 — CRITICAL EXAM POINT: a SENIOR officer shall NOT berate a junior in the presence of any officer junior to that junior, OR any member of the public. The duty is on the SENIOR officer; this is NOT a power to punish unbecoming conduct",
      "Reg 143: on duty — only a wristwatch, allergy-alert bracelet, and a maximum of 2 rings; males — hair short, clean shaven chin and under lip, NO whiskers, upper lip optional; females — hair not below nape, no unnatural colour or decorations, short fingernails with natural polish only, minimal make-up; where exempted from regulation shoes/stockings (medical), wear prescribed footwear or DARK BLUE socks",
      "Reg 144: must NOT incur debt the officer knows they cannot discharge; if unable to pay a debt, MUST inform Commissioner using the form in APPENDIX E; Commissioner may require pay deductions for Government debts",
      "Reg 145: BANKRUPTCY or insolvency or bankruptcy proceedings — officer must report in writing to Commissioner WITHIN 7 DAYS",
      "Reg 146: NO gift or reward from public or organisation except with Commissioner's WRITTEN permission",
      "Reg 147 (Exceptions): may accept gifts from (a) foreign government representative on official visit; (b) community organisation on social occasion as appreciation; (c) any person on a CELEBRATORY occasion",
      "Reg 148: NO present from a subordinate except with Commissioner's WRITTEN permission",
      "Reg 149: officer initiating civil proceedings, OR charged with a criminal offence and brought before a court, must PROMPTLY inform the Commissioner in WRITING",
      "Reg 150 — KNOW THE 17 SPECIFIC OFFENCES (a–q): (a) discreditable conduct; (b) insubordinate/oppressive (incl. assault on another officer); (c) disobedience to orders; (d) neglect of duty (incl. permitting a prisoner to escape, leaving beat); (e) falsehood/prevarication; (f) breach of confidence (incl. ANONYMOUS communications to seniors); (g) corrupt practice; (h) unlawful/unnecessary exercise of authority (incl. unnecessary violence, incivility); (i) malingering; (j) absence without leave / being late; (k) loss or damage to Service property; (l) drunkenness/drug-taking on or required for duty; (m) drinking on duty / soliciting drink (incl. odour of liquor on breath when reporting for duty); (n) entering licensed premises on duty; (o) lending/borrowing/accepting money compromising responsibility; (p) being accessory to a disciplinary offence; (q) using Service property/facility for non-official purpose without written consent",
      "Reg 150(3): officer suspected of being under the influence of drugs or alcohol MUST submit to breath/blood test under the Motor Vehicles and Road Traffic Act, Chap. 48:50",
      "Part XII offences often pair with Part XIII charges — facts may support both Reg 150 and separate criminal proceedings; keep disclosures aligned with Reg 149"
    ]
  },
 
  { id:"discipline", num:"Part XIII", title:"Disciplinary Procedure", regs:"Regs 151–174", color:"#E05555", icon:"⚖️",
    summary:"Disciplinary offence (Reg 151): Any officer who fails to comply with the Regulations or any order or directive in force commits a disciplinary offence. Suspension (Reg 152): When a report or allegation suggests an officer may have committed an offence, and the Commissioner is of the opinion that the public interest or repute of the Service requires it, the Commissioner may in writing direct the officer to CEASE REPORTING FOR DUTY. A suspended officer continues to receive FULL PAY until the date specified by the Commissioner. Interdiction (Reg 153): Where disciplinary or criminal proceedings for dismissal are instituted, the Commissioner may interdict the officer — but MUST first inform the officer in writing of the intention to interdict and give them an opportunity to be heard. An interdicted officer receives not less than ONE HALF of their pay. If proceedings are determined in the officer's favour, the officer is entitled to the FULL AMOUNT of remuneration withheld. If proceedings result in punishment other than dismissal, the Commissioner determines what pay is allowed. The Commissioner may quash an interdiction order at any time. Reporting in person (Reg 154): A suspended or interdicted officer may be required to report to a designated officer at prescribed times. Disciplinary tribunal (Reg 155): A tribunal is established to hear charges. Procedure at hearing (Reg 160): The charge is read; the accused officer may plead. The accused has the right to: be present during all evidence, cross-examine witnesses, call witnesses, and be represented by a fellow officer of their choice. Standard of proof: BEYOND REASONABLE DOUBT. Penalties (Reg 173): Include reprimand, severe reprimand, forfeiture of pay, reduction in rank, and dismissal. The officer must be informed of the decision and their RIGHT OF REVIEW (Reg 171). Commissioner's power to remove (Reg 172): The Commissioner may remove an officer in the public interest even without a disciplinary finding — provided the officer is given an opportunity to make representations. Sergeants may be Reporting Officers — know the difference between suspension (full pay, reputational risk) and interdiction (half pay, dismissal pathway).",
    keyPoints:[
      "Disciplinary offence: any failure to comply with the Regulations or any order in force",
      "Suspension: Commissioner directs officer in writing to cease reporting — officer receives FULL PAY",
      "Interdiction: applies where disciplinary/criminal proceedings for DISMISSAL are instituted",
      "Before interdiction: Commissioner MUST inform officer in writing and give opportunity to be heard",
      "Interdicted officer receives NOT LESS THAN ONE HALF of pay",
      "Proceedings determined in officer's favour: officer entitled to the FULL amount of withheld remuneration",
      "Commissioner may quash an interdiction order at any time",
      "Suspended/interdicted officer may be required to report to a designated officer at prescribed times",
      "Disciplinary tribunal: proceedings held in PRIVATE",
      "Accused officer's rights at tribunal: present during all evidence, cross-examine witnesses, call witnesses, be represented by a fellow officer",
      "Standard of proof at tribunal: BEYOND REASONABLE DOUBT",
      "Penalties range from reprimand to dismissal",
      "Officer must be informed of the decision AND their right of review",
      "Commissioner may remove officer in the public interest without a disciplinary finding — officer given opportunity to make representations",
      "Beyond reasonable doubt is HIGHER than civil balance of probabilities — examiners love contrasting tribunal vs civil suit standards"
    ]
  },
 
  { id:"psa", num:"Part XIV", title:"Police Service Association", regs:"Regs 175–182", color:"#38C172", icon:"🤝",
    summary:"This Part governs the recognition of the Police Service Association (PSA) and the rights of officers to be represented by the Association. An association seeking recognition as an appropriate association must apply in writing to the Minister of Finance (Reg 176). The application must be accompanied by: (a) a document from the Registrar General certifying that the rules have been filed; (b) a copy of the rules; (c) a list of members; and (d) an affidavit confirming no member is in another association and that membership comprises more than 50% of the class the association purports to represent. The Minister must publish notice of the application in the Gazette within 7 days (Reg 177) — allowing 14 days for any objection. An objecting association may challenge the application on the grounds that: more than 50% of the class is already represented by the objecting association, or that members of the applicant association are members of the objecting association (Reg 178). The Minister may examine the records of both associations (Reg 179). Special duty leave (Reg 182): Officers who are elected representatives of the PSA may be granted special duty leave and time off during working hours to attend to Association business. Recognition fights are rare in daily duty but high-yield for essay questions on labour relations within a disciplined force.",
    keyPoints:[
      "PSA must apply in writing to the Minister of Finance for recognition",
      "Application must include: rules filed with Registrar General, copy of rules, member list, and affidavit",
      "Affidavit must confirm: no member in another association AND membership exceeds 50% of the represented class",
      "Minister publishes application in the Gazette within 7 days",
      "Objection period: 14 days from date of Gazette publication",
      "Grounds for objection: more than 50% of class already represented by objecting association, or members are in common",
      "Minister may examine records of both associations before deciding",
      "PSA represents the interests of officers in negotiations on terms and conditions of service",
      "Elected PSA representatives may be granted special duty leave and time off to attend to Association business",
      "50% membership threshold is the statutory battleground — exam answers should cite Regs 176–178 precisely"
    ]
  },
 
  { id:"pensions", num:"Part XV", title:"Gratuities & Pensions", regs:"Regs 183–190", color:"#4A90D9", icon:"🎖️",
    summary:"Computation (Reg 183): The computation and authorisation of pensions and gratuities for officers whose retirement is known to be impending shall be treated as matters of HIGH PRIORITY. The Commissioner must ensure that particulars of service and pay are furnished accurately to the Comptroller of Accounts NOT LESS THAN 3 MONTHS before the officer's retirement date, to enable computation, checking, and authorisation to be completed before retirement. Superannuation contributions (Reg 184): A deduction is made from every officer's pay as a contribution towards superannuation allowances — at a yearly rate directed by the President, not exceeding 1.25%. This is paid to the Comptroller of Accounts on or before the 8th day of every month. If an officer leaves the Service by dismissal without being eligible for pension or gratuity, they are entitled to a full refund of all contributions made. Arrears of contributions must be paid where required and may be deducted in equal monthly instalments over 3 years or deducted from the gratuity as a lump sum. Injury pension (Reg 189): An officer who is permanently injured on duty is entitled to a pension regardless of their length of service. Pension to dependants (Reg 190): Dependants of an officer KILLED ON DUTY are entitled to a pension. A gratuity is payable to the widow or other dependants of an officer who DIES IN THE SERVICE. Broken service (Reg 188): Broken service — resignation and re-appointment — affects pension computation. Only the later period of service counts unless the prior service is specifically restored. Late submissions to the Comptroller delay pay-outs — treat Reg 183 timelines as hard deadlines, not courtesy targets.",
    keyPoints:[
      "Computation of pension is a matter of HIGH PRIORITY",
      "Commissioner must furnish service and pay particulars to Comptroller of Accounts at least 3 MONTHS before retirement",
      "Superannuation contribution: deducted from every officer's pay at a rate not exceeding 1.25% per year",
      "Contribution paid to Comptroller of Accounts on or before the 8th day of every month",
      "Officer dismissed without pension or gratuity: entitled to FULL REFUND of all contributions",
      "Contribution arrears: deducted in equal monthly instalments over 3 years, or as lump sum from gratuity",
      "Less than 10 years of service: gratuity only — NO pension",
      "10 or more years of service: entitled to pension AND gratuity",
      "Permanently injured on duty: entitled to injury pension regardless of length of service",
      "Killed on duty: dependants entitled to a pension",
      "Died in service: widow/dependants entitled to a gratuity",
      "Broken service affects pension — only the later period counts unless prior service specifically restored",
      "Injury-on-duty and death-on-duty benefits are statutory entitlements — distinguish them from discretionary ex-gratia payments"
    ]
  },
 
  { id:"misc", num:"Part XVI", title:"Miscellaneous Provisions", regs:"Regs 191–200", color:"#38C172", icon:"📋",
    summary:"Communications (Reg 191): Any communication an officer wishes to address to the Commissioner must be forwarded through the senior officer under whom the officer is serving. The senior officer is expected to comment and give advice on the matters raised. Official communications to Government officials or departments must also go through the Commissioner via the chain of command (Reg 192). Orders (Reg 193): Orders may be issued as: (a) Standing Orders — by the Commissioner; (b) Service Orders — by the Commissioner; (c) Divisional or Branch Orders — by officers-in-charge of Divisions or Branches. The Commissioner may appoint a committee to advise on the issue of Standing Orders, and must invite the appropriate recognised association to nominate representatives to serve on that committee. Standing Orders with respect to books (Reg 194): The Commissioner may issue Standing Orders setting out the books and records to be kept at Divisions, Branches, Stations, and other Units, and the manner in which they are to be kept and disposed of. Corrections (Reg 195): No erasures shall be made in any official book or document — mistakes must be crossed out and initialled. Exception: corrections in a Station Diary are made by recording a new entry correcting the original (not by crossing out). Circulation of orders (Reg 196): The Commissioner must bring all orders, regulations, and official publications to the attention of all officers and must circulate the Gazette. Pocket diary (Reg 197): An officer must have their pocket diary in their possession at all times and may record only duty-related entries. Legal aid (Reg 198): Where an officer charged with a criminal offence arising from their duty seeks legal aid, the Commissioner — if satisfied the officer acted in good faith — shall report to the Attorney General who decides whether to grant legal aid. Change of name (Reg 199): Officers must inform the Commissioner in writing when they change their name and submit documentary evidence. Saluting (Reg 200): First Division officers salute their seniors in rank; Second Division officers salute First Division officers. Reg 191 is the daily friction point for eager constables — bypassing the chain is misconduct even if the underlying idea was good.",
    keyPoints:[
      "All communications to Commissioner: forwarded THROUGH the senior officer in the chain of command",
      "Senior officer forwarding a communication must comment and give advice on the matters raised",
      "Official communications to Government officials/departments: also through Commissioner via chain of command",
      "3 types of orders: Standing Orders (Commissioner), Service Orders (Commissioner), Divisional/Branch Orders (OC Division)",
      "Commissioner appoints a committee to advise on Standing Orders — recognised association must be invited to nominate representatives",
      "Corrections in official books: NO erasures — mistakes must be CROSSED OUT and initialled",
      "Exception: Station Diary corrections made by recording a NEW ENTRY correcting the original (not crossed out)",
      "Commissioner must circulate all orders, regulations, and the Gazette to all officers",
      "Pocket diary: carried at all times — only duty-related entries permitted",
      "Legal aid: Commissioner reports to Attorney General if officer acted in good faith — Attorney General decides",
      "Change of name: officer must inform Commissioner in writing with documentary evidence",
      "Saluting: Second Division officers salute First Division officers",
      "Station Diary correction method is unique — crossing out lines is wrong; narrate the correction in a fresh entry"
    ]
  },
];
 
/* ══════════════════════════════════════════════════════════════
   ALL 54 STANDING ORDERS
══════════════════════════════════════════════════════════════ */
const ALL_SO = [
  { num:1,  title:"Distribution of Personnel",         color:"#4A90D9", icon:"👤",
    summary:"The Commissioner of Police is responsible for the distribution of the Sanctioned Strength of the TTPS. The Sanctioned Strength is published annually in Departmental Orders. All postings and transfers are published in Departmental Orders before taking effect.",
    keyPoints:["Commissioner responsible for all distribution of personnel","Sanctioned Strength published annually in Departmental Orders","All postings and transfers published before taking effect","Officers must report to new posting within the prescribed time",
      "Sanctioned strength is a budget ceiling — unauthorised over-posting creates discipline and pay problems"] },
  { num:2,  title:"Police Service Orders",              color:"#9B72CF", icon:"📋",
    summary:"Police Service Orders consist of 8 types: Standing Orders, Departmental Orders, Divisional/Branch Orders, Operational Orders, Circulars, Notices, Station Orders, and Service Orders. Standing Orders are issued by the Commissioner and apply Service-wide. Departmental Orders are published daily. Station Orders are issued by the OC of a Station for local matters.",
    keyPoints:["8 types of Police Service Orders","Standing Orders issued by Commissioner — apply Service-wide","Departmental Orders published daily for general information","Station Orders issued by OC Station for local matters only","Divisional/Branch Orders issued by OC Division for their area",
      "Know the hierarchy: SO > DO > Divisional/Branch > Station — junior orders cannot contradict superior instruments"] },
  { num:3,  title:"Commendations, Awards, Gifts & Rewards", color:"#E8A838", icon:"🏅",
    summary:"Commendations are granted by the Commissioner for meritorious conduct. Officers must not accept gifts or rewards from the public for performing their duties. Exceptions include nominal tokens at official functions. Commendation entries on the Conduct Sheet are made in red ink. Medals are worn on the left breast according to strict rules.",
    keyPoints:["Commissioner grants commendations for meritorious conduct","Officers must NOT accept gifts or rewards for performing duty","Exception: nominal tokens at official functions","Commendation entries on Conduct Sheet in RED ink","Medals worn on left breast — strict wearing rules apply",
      "Gifts vs duty: if in doubt, refuse and refer upward — PSR Regs 146-148 still apply alongside S.O. 3"] },
  { num:4,  title:"Personnel Records",                  color:"#38C172", icon:"📁",
    summary:"Three types of records: Personal File (kept by Commissioner), Divisional Personal File (kept at Division/Branch), and Medical History Records. The Inset Sheet records an officer's assessments and suitability for promotion. The Conduct Sheet records personal data, promotions, punishments, and commendations. Commendations/awards entered in red ink; punishments in blue/black ink. On promotion to Sergeant, the triplicate Conduct Sheet is sent to the Division/Branch.",
    keyPoints:["Three records: Personal File, Divisional Personal File, Medical History Records","Inset Sheet records assessments and suitability for promotion","Conduct Sheet: personal data, promotions, punishments, commendations","Commendations/awards = RED ink; punishments = blue/black ink","On promotion to Sergeant, triplicate Conduct Sheet sent to Division/Branch",
      "Inset Sheet comments follow an officer for promotion — ensure facts, not personalities, are recorded"] },
  { num:5,  title:"Vacation Leave",                     color:"#4A90D9", icon:"🏖️",
    summary:"12 types of leave exist in the TTPS including Vacation Leave, Casual Leave (up to 3 days at OC's discretion), Sick Leave (medical certificate required after 3 days), Bereavement Leave (for immediate family), and Study Leave (requires Commissioner's approval).",
    keyPoints:["12 types of leave in the TTPS","Vacation Leave granted annually based on years of service","Casual Leave: up to 3 days at OC's discretion for urgent matters","Sick Leave: medical certificate required after 3 consecutive days","Bereavement Leave for immediate family deaths","Study Leave requires Commissioner's approval",
      "Cross-check S.O. 5 narrative with PSR Part VIII timeframes — examiners expect consistency across instruments"] },
  { num:6,  title:"Attire and Appearance",              color:"#9B72CF", icon:"👮",
    summary:"Officers must be properly dressed in prescribed uniform at all times on duty. Patrol Orders 1–4 define dress requirements. Patrol Order No. 1 is highest/ceremonial; No. 4 is for night duty. Officers in plainclothes must carry their ID card at all times. No unauthorized badges or emblems permitted.",
    keyPoints:["Patrol Orders 1–4 define dress requirements","No. 1 = highest/ceremonial; No. 4 = night duty","Plainclothes officers must carry ID card at all times","No unauthorized badges or emblems permitted","Specific court dress required for court attendance",
      "Patrol Orders plus PSR Reg 143 together govern turn-out — cite both when answering dress-code essays"] },
  { num:7,  title:"Identification Cards",               color:"#38C172", icon:"🪪",
    summary:"Every officer is issued an ID card by the Commissioner. It must be carried at all times on duty and produced on demand when exercising police functions. Misuse is a disciplinary offence. A lost ID card must be reported immediately. Officers leaving the Service must surrender their ID card.",
    keyPoints:["Every officer issued ID card by Commissioner","Must be carried at all times on duty","Must be produced on demand when exercising police functions","Misuse of ID card = disciplinary offence","Lost ID card: reported immediately","ID card surrendered immediately on leaving the Service",
      "ID production protects the public from impersonation — failure to produce on lawful demand undermines legitimacy"] },
  { num:8,  title:"Paying of Compliments",              color:"#E8A838", icon:"🫡",
    summary:"Saluting is the method of paying compliments. Uniformed officers must salute First Division Officers and Inspectors. In vehicles, salute only when the vehicle is stationary. Charge Room orderly calls room to attention when FDO or Inspector enters. Officers salute the National Anthem, the National Flag, and the Police Colours.",
    keyPoints:["Saluting = method of paying compliments in the TTPS","Salute FDOs and Inspectors","In vehicles: salute only when vehicle is stationary","Charge Room orderly calls room to attention for FDO/Inspector","Officers salute National Anthem, National Flag, Police Colours",
      "Compliments encode respect for command and symbols — they are discipline-neutral but morale-positive"] },
  { num:9,  title:"Handover",                           color:"#4A90D9", icon:"🤝",
    summary:"Two types of handover: General Handover (transfer of command by FDOs and SDOs responsible for Stations) and Daily Handover (between SDOs relieving each other daily). FDO Handover Certificate is prepared in QUADRUPLICATE. Must include: state of Division/Branch, major works, serious crimes outstanding, community outreach, and any other necessary information. The Charge Room must also be formally handed over at each change of shift.",
    keyPoints:["Two types: General Handover and Daily Handover","General = transfer of command; Daily = between relieving SDOs","FDO Handover Certificate prepared in QUADRUPLICATE","Must include: state of Division, crimes outstanding, community programmes","Charge Room must be formally handed over at each change of shift",
      "Incomplete handover certificates = continuity gaps that courts and PCA investigations will exploit"] },
  { num:10, title:"Criminal Prosecution & Process",     color:"#E05555", icon:"⚖️",
    summary:"A Sergeant or above may grant bail at the Station for summary offences. Bail may be opposed where the accused is likely to abscond, interfere with witnesses, or commit further offences. Summons must be served not less than 48 hours before hearing. Proof of service is an affidavit returned to court not less than 24 hours before hearing. 7 types of warrants. High Court Process takes precedence over all other process. Habeas Corpus application submitted at least 4 clear days before hearing.",
    keyPoints:["Sergeant or above may grant bail at Station for summary offences","Bail opposed: likely to abscond, interfere with witnesses, commit further offences","Summons served NOT LESS than 48 hours before hearing","Proof of service — affidavit returned 24 hours before hearing","7 warrant types: FI, TAC, Search, Affiliation/Maintenance, Remand, Distress, Ejectment","High Court Process takes precedence over all other process","Habeas Corpus: application at least 4 clear days before hearing",
      "Station bail is summary-lane only — never blur with indictable High Court bail regimes"] },
  { num:11, title:"Beat and Patrol",                    color:"#38C172", icon:"🚶",
    summary:"Beat = designated area for patrol during tour of duty. Patrol = movement within that area to protect citizens and detect offences. 7 modes: Foot, Mobile, Horseback, Canine, Helicopter, Motor Cycle, Bicycle. Day = 6am–6pm; Night = 6pm–6am. Night patrol entries in Patrol Register are made in RED ink.",
    keyPoints:["Beat = designated area for patrol during tour of duty","7 modes of patrol: Foot, Mobile, Horseback, Canine, Helicopter, Motor Cycle, Bicycle","Day = 6am–6pm; Night = 6pm–6am","Night patrol entries in Patrol Register = RED ink","Duties: protect life/property, detect/prevent crime, maintain order","SDO Charge Room: ensure adequate patrols, brief officers, check Patrol Register",
      "RED ink night entries flag audit priority — supervisors must spot-check beats against diary entries"] },
  { num:12, title:"Uniform and Equipment",              color:"#9B72CF", icon:"👔",
    summary:"A Kit Book is issued to every officer recording all uniform and equipment issued. Officers are responsible for the care, maintenance, and security of their kit. Lost or damaged kit may result in a surcharge. All kit must be returned on leaving the Service.",
    keyPoints:["Kit Book issued to every officer — records all uniform and equipment","Officers responsible for care, maintenance and security of kit","Lost or damaged kit may result in surcharge","All kit returned on leaving the Service","Kit Inspections conducted by OC or delegated officer",
      "Kit Book gaps surface at Board of Survey — reconcile issues before annual inspections"] },
  { num:13, title:"Inspections and Visits",             color:"#E8A838", icon:"🔎",
    summary:"Inspections are formal, scheduled examinations; Visits are informal checks. A Visitors and Inspection Book is kept at every Station and signed by every visiting officer. FDOs must visit each station at least once per month during the day and once per month at night.",
    keyPoints:["Inspections = formal/scheduled; Visits = informal checks","Both Day and Night visits are required","Visitors and Inspection Book kept at every Station — signed by visiting officer","OC prepares minutes and submits report after every inspection","FDO must visit each station at least once per month (day AND night)",
      "Unsigned Visitors Book = no proof the FDO satisfied monthly visit duties"] },
  { num:14, title:"Police Buildings and Quarters",      color:"#4A90D9", icon:"🏢",
    summary:"A Sentry is posted at all Police Stations to control entry and maintain security. No loitering or gossiping permitted in Police Buildings. Animals are not permitted in Police Buildings. Interdicted or Suspended Officers may not enter Police Buildings without OC's permission.",
    keyPoints:["Sentry posted at all Police Stations — controls entry","No loitering in Police Buildings","No gossiping in Charge Room or while on duty","Animals not permitted in Police Buildings","Interdicted/Suspended officers cannot enter without OC permission",
      "Sentry orders should align with S.O. 38 security — do not treat the sentry as ceremonial only"] },
  { num:15, title:"Furniture and Stores",               color:"#38C172", icon:"🗄️",
    summary:"All Government furniture and stores are the OC's responsibility. Inventory Books are kept for all items. Disposal of unserviceable stores requires a Board of Survey chaired by a First Division Officer. Negligent loss or damage may result in a surcharge. Inventory must be jointly verified on handover.",
    keyPoints:["OC responsible for all furniture and stores","Inventory Books kept for all furniture and stores","Board of Survey required to dispose of unserviceable stores — chaired by FDO","Negligent loss/damage may result in surcharge","Inventory jointly verified by outgoing and incoming officer on handover",
      "Joint inventory on relief prevents 'missing stores' charges landing solely on the outgoing NCO"] },
  { num:16, title:"Pocket Diary",                       color:"#9B72CF", icon:"📔",
    summary:"Every officer is issued a Pocket Diary — it is a legal document. It records all daily occurrences and actions during the tour of duty. Entries must be made at or near the time of occurrence. It must be initialled by the OC or supervisor. It may be produced in court or at a disciplinary tribunal. A lost diary must be reported immediately.",
    keyPoints:["Every officer issued a Pocket Diary — a LEGAL DOCUMENT","Records daily occurrences and actions during tour of duty","Entries made at or near the time of occurrence","Must be initialled by OC or supervisor","May be produced in court or at disciplinary tribunal","Lost diary must be reported immediately",
      "Contemporaneous pocket diary notes can corroborate use-of-force timelines in PCA or civil suits"] },
  { num:17, title:"Station Diary",                      color:"#E05555", icon:"📖",
    summary:"The Station Diary is the official record of ALL occurrences at a Station. Every report received must be entered. Entries are numbered consecutively. The SDO-in-Charge ensures all entries are made. RED ink entries: night hours, Superior Officer entries, and entries specified by Standing Orders. It is a legal document that may be produced in court. It must be formally handed over at each change of duty.",
    keyPoints:["Official record of ALL occurrences at the Station","Every report received MUST be entered in the Station Diary","Entries numbered consecutively","RED ink: night hours, Superior Officer entries, and SO-specified entries","Legal document — may be produced in court","Formally handed over at each change of duty",
      "SDO owns completeness — sergeants must chase subordinates for same-shift omissions before handover"] },
  { num:18, title:"Wanted Persons",                     color:"#38C172", icon:"🔍",
    summary:"A Wanted Persons Notice Board is maintained at every Station. The Criminal Records Office (CRO) circulates descriptions and photographs of wanted persons to all stations. Officers must check the Notice Board daily. On arrest, CRO must be notified immediately to update records.",
    keyPoints:["Wanted Persons Notice Board maintained at every Station","CRO circulates descriptions and photographs to all stations","Officers must check the Notice Board daily","Interpol Section handles international wanted persons","On arrest: CRO notified immediately to update records",
      "Daily Notice Board checks should be logged — 'I forgot to read the board' is never a defence"] },
  { num:19, title:"Police Band",                        color:"#4A90D9", icon:"🎺",
    summary:"The Band is commanded by a Commissioner-appointed officer. Entry requires musical ability and fitness. Commissioner's permission required for all public and private performances. Officers must not play with private orchestras in a manner that discredits the Service.",
    keyPoints:["Band commanded by Commissioner-appointed officer","Entry: musical ability and fitness required","Commissioner's permission required for all performances","Officers must not play with private orchestras in discrediting manner","Band instruments are Government property",
      "Commissioner's permission gate exists because band appearances are political-optics sensitive"] },
  { num:20, title:"Mounted Branch",                     color:"#9B72CF", icon:"🐴",
    summary:"Horses are Government property acquired by the Commissioner. Six registers are maintained: Register of Horses, Farrier Register, Feeding Book, Sick Horse Register, Pharmacy Register, and Saddler's Repair Book. A History Sheet/File is maintained for each horse.",
    keyPoints:["Horses are Government property","6 registers: Horses, Farrier, Feeding, Sick Horse, Pharmacy, Saddler's Repair","History Sheet maintained for each horse","Officers apply for transfer through their OC","Horses inspected before and after each duty",
      "Animal welfare failures are public-order and discipline issues — registers prove due diligence"] },
  { num:21, title:"Canine Branch (K-9)",                color:"#E8A838", icon:"🐕",
    summary:"4 categories of police dogs: Basic (search, tracking, crowd control, guard), Multi-Handled (same duties, multiple handlers), Explosive/Bomb Detection (exclusively for bomb detection), and Drug Detection (exclusively for drug detection). Dogs are Government property. A History Sheet/File is maintained for each dog. Dogs must be kept secured at all times.",
    keyPoints:["4 dog categories: Basic, Multi-Handled, Explosive/Bomb Detection, Drug Detection","Dogs are Government property — History Sheet maintained for each","Dogs must be kept SECURED at all times","Dog bite/injury to public: reported immediately to SDO-in-Charge Canine","Disposal of dogs requires Commissioner's approval","Dogs for crowd control patrol in FRONT — must NOT mingle with crowd",
      "Dog deployments must match certification — using a drug dog for crowd control without authorisation is a review risk"] },
  { num:22, title:"Licensed Premises",                  color:"#4A90D9", icon:"🏪",
    summary:"11 types of licences are monitored by the TTPS including Liquor, Clubs, Cinematograph, Gambling, Pool Rooms, Pawn Brokers, Precious Metal, Old Metal, Firearms, Sale of Produce, and Theatre/Dance Hall. A Licensed Premises Register is maintained at each Station. Officers must visit licensed premises regularly and record visits.",
    keyPoints:["11 types of licences monitored by the TTPS","Licensed Premises Register maintained at each Station","Officers must visit licensed premises regularly — visits recorded","Officers can object to the grant of a liquor licence","Inspecting officer checks compliance with conditions of licence",
      "Objections to liquor licences require factual community-impact grounds, not personal dislike of an owner"] },
  { num:23, title:"Correspondence",                     color:"#38C172", icon:"✉️",
    summary:"All official correspondence is handled through proper channels. Three correspondence registers are maintained: Incoming, Outgoing, and Filing. A Minute is a brief note written on official correspondence. A File is related correspondence kept together. The OC is responsible for prompt and proper handling of all correspondence.",
    keyPoints:["3 correspondence registers: Incoming, Outgoing, Filing","Minute = brief note written on official correspondence","File = related correspondence kept together","OC responsible for prompt and proper handling","Confidential correspondence requires appropriate security handling",
      "Minutes on dockets create an audit trail — lazy 'Noted' minutes invite supervisory bounce-back"] },
  { num:25, title:"Cremation",                          color:"#9B72CF", icon:"🕯️",
    summary:"The Commissioner appoints Authorised Officers to grant cremation permits. The AO must be satisfied the death was not due to suspicious or criminal circumstances. A Post Mortem Examination may be requested before granting the permit. Grounds for refusal include suspicious circumstances, incomplete documentation, or outstanding coroner's inquiry.",
    keyPoints:["Commissioner appoints Authorised Officers for cremation permits","AO must be satisfied death not due to suspicious/criminal circumstances","Post Mortem may be requested before granting permit","Grounds for refusal: suspicious circumstances, incomplete docs, outstanding coroner's inquiry","Permits may be withdrawn or cancelled if new information comes to light",
      "Suspicious-death nexus: coordinate with CID before AO signs off — premature permits destroy evidence"] },
  { num:26, title:"Property",                           color:"#E8A838", icon:"📦",
    summary:"4 categories of property: Found Property, Prisoner's Property, Dangerous Drugs, and General Property. Separate registers are maintained for each category. The Property Room is secured — keys controlled by the OC. Only the Property Manager or authorized officers may enter the Property Room. Dangerous drugs stored separately under special security.",
    keyPoints:["4 categories: Found Property, Prisoner's Property, Dangerous Drugs, General Property","Separate registers for each category of property","Property Room secured — keys controlled by OC","Only Property Manager or authorized officers enter Property Room","Dangerous drugs stored separately under special security","Property for court formally handed over with documentation",
      "Chain of custody from Charge Room to Property Room must mirror exhibit rules for court"] },
  { num:27, title:"Lost and Stolen Property",           color:"#4A90D9", icon:"🔑",
    summary:"Lost and Stolen Property Register maintained at every station. CRO Circular circulates descriptions of lost and stolen property to all stations. The officer taking a report must obtain full details and enter them in the register. On recovery, CRO must be notified immediately.",
    keyPoints:["Lost Property = misplaced; Stolen Property = taken without consent","Lost and Stolen Property Register at every station","CRO Circular circulates descriptions to all stations","Officer must obtain FULL details and enter in register","Recovery of property: CRO notified immediately","Property stored securely until returned or produced in court",
      "Accurate property descriptions feed CRO circulars — vague entries rarely recover goods"] },
  { num:28, title:"Classification & Recording of Crimes", color:"#38C172", icon:"🗂️",
    summary:"Crimes are classified as Serious or Minor. Serious Crimes must be reported immediately to the OC of the Division and to CRO. An Occurrence Register is maintained at every station. Crime statistics are compiled monthly and submitted to the Commissioner.",
    keyPoints:["Crimes classified as Serious or Minor","Serious Crimes reported immediately to OC Division and CRO","Occurrence Register maintained at every station","Investigator conducts thorough investigation and reports findings to OC","Crime statistics compiled monthly and submitted to Commissioner","OC must review all crime reports and ensure proper investigation",
      "Serious vs minor classification drives resource and legal pathway — misclassification delays specialist units"] },
  { num:29, title:"Identification of Suspects",         color:"#9B72CF", icon:"👁️",
    summary:"3 methods of identification: ID Parade, Confrontation, and Photographic Identification. An ID Parade is conducted by an Identification Officer who was NOT involved in the investigation. A Representative (JP or solicitor) must be present. At least 8 persons of similar appearance required. Suspect may choose their position in the lineup. Suspect's solicitor may attend. The entire procedure must be documented.",
    keyPoints:["3 methods: ID Parade, Confrontation, Photographic Identification","ID Parade conducted by officer NOT involved in the investigation","Representative (JP or solicitor) must be present","At least 8 persons of similar appearance required","Suspect may choose their position in the lineup","Entire procedure must be fully documented",
      "ID production protects the public from impersonation — failure to produce on lawful demand undermines legitimacy"] },
  { num:30, title:"Scientific Agencies — Crime Detection", color:"#E05555", icon:"🔬",
    summary:"Scientific Agencies include Internal Agencies (Fingerprint Bureau, Chemistry Division, Ballistics, Photography) and External Agencies (hospitals, forensic labs). Fingerprints may only be taken by authorized officers. Fingerprints and records are destroyed after the prescribed period if the person is not convicted.",
    keyPoints:["Internal Agencies: Fingerprint Bureau, Chemistry Division, Ballistics, Photography","Fingerprints taken only by AUTHORIZED officers","Certificate of Character signed by authorized officer","Fingerprints destroyed after prescribed period if no conviction","External agencies used for specialist analysis",
      "Unauthorised fingerprinting is itself a legal risk — use only designated bureau staff"] },
  { num:31, title:"Miscellaneous Reports",              color:"#4A90D9", icon:"📝",
    summary:"An Occurrence Register is maintained for miscellaneous reports. The Investigator must investigate all assigned occurrences and report findings to the OC. The OC decides whether to close or escalate each occurrence. Judges' Rules and Administrative Directions apply to all investigations.",
    keyPoints:["Occurrence Register maintained for miscellaneous reports","Investigator must investigate all assigned occurrences and report to OC","OC decides to close or escalate each occurrence","Judges' Rules and Administrative Directions apply to all investigations","Occurrence reports submitted within 24 hours of occurrence",
      "24-hour occurrence rule forces supervisors to chase late filings before the next parade"] },
  { num:32, title:"Statements",                         color:"#E8A838", icon:"📄",
    summary:"3 types of statements: Witness Statement (Supporting or Negative), Dying Declaration, and Statement Under Caution. Standard Caution: 'You are not obliged to say anything unless you wish to do so, but whatever you say will be taken down in writing and may be given in evidence.' Judges' Rules govern all statements under caution. Dying Declaration requires a settled hopeless expectation of death relating to the cause of that death. For children — parent/guardian present; for mentally handicapped — social worker; for foreign speakers — competent interpreter, details recorded.",
    keyPoints:["3 types: Witness Statement, Dying Declaration, Statement Under Caution","Standard Caution: must be administered before questioning a suspect","Judges' Rules govern all statements under caution","Dying Declaration: settled hopeless expectation of death — relates to cause of death","Children: parent/guardian must be present","Mentally handicapped: social worker must be present","Foreign language speakers: competent interpreter required — details recorded",
      "Caution wording must be verbatim — paraphrasing invalidates lengthy suspect interviews"] },
  { num:33, title:"Mentally Ill Persons",               color:"#9B72CF", icon:"🧠",
    summary:"Mental Health Officers have primary authority to detain mentally ill persons. Police Officers may assist Mental Health Officers. Where a mentally ill person commits a breach of the peace, the officer may detain them. A written statement from a responsible person is required before obtaining a Remand Warrant. Officer must submit a report to the Commissioner on committal.",
    keyPoints:["Mental Health Officer has primary authority to detain","Police Officers may assist Mental Health Officers","Breach of peace: officer may detain mentally ill person","Written statement required before Remand Warrant obtained","Officer must submit report to Commissioner on committal","OC responsible for humane treatment of mentally ill persons in custody",
      "Humane handling + Mental Health Act interface — police assist, they do not replace clinicians"] },
  { num:34, title:"Fires",                              color:"#E05555", icon:"🔥",
    summary:"On receiving a report of fire, immediately notify the Fire Service and senior officers. Do NOT enter burning buildings except to save life. The Senior Officer at the scene is responsible for crowd control and scene preservation. If arson is suspected, preserve the scene and notify CID immediately.",
    keyPoints:["On report of fire: immediately notify Fire Service and senior officers","Do NOT enter burning buildings except to save life","Senior Officer at scene: crowd control and scene preservation","Document origin, spread, and suspicious circumstances","Suspected arson: preserve scene and notify CID immediately","Report submitted to OC promptly after attending scene",
      "Scene preservation for arson competes with rescue — sergeant balances life-safety first, then cordon"] },
  { num:35, title:"Drums and Control of Music",         color:"#38C172", icon:"🥁",
    summary:"A licence is required to play drums or amplified music in a public place. A Second Division Officer investigates the application and reports findings and recommendations to the OC. The OC decides whether to grant or refuse. Officers can stop unlicensed playing of drums or music in public places.",
    keyPoints:["Licence required to play drums or amplified music in a public place","SDO investigates application and reports findings and recommendations to OC","OC grants or refuses the licence","Factors: nature of event, location, noise levels, community impact","Officers can stop unlicensed playing in public places","Public Place = any place to which the public has access",
      "Noise complaints often mix licencing with breach of peace — be ready to use both SO and common law"] },
  { num:36, title:"Police Supervisee",                  color:"#4A90D9", icon:"👁️",
    summary:"A Police Supervisee is a person placed under police supervision on discharge from prison, having been convicted on indictment for any crime, and who prior to that conviction had also been convicted on an indictable offence. The Authorised Officer is the SDO-in-charge of the Station. Supervisees must report on discharge and monthly thereafter. Monthly returns submitted to Commissioner.",
    keyPoints:["Supervisee = convicted on indictment + prior indictable conviction","Must report on discharge AND monthly thereafter","Authorised officer = SDO-in-charge of Station","Police Supervisees' Register maintained at each Station","CRO notifies relevant Station on supervisee's discharge","Monthly returns submitted to Commissioner",
      "Monthly reporting is mandatory rhythm — missing months breach statutory supervision duties"] },
  { num:37, title:"Promotion",                          color:"#E8A838", icon:"⬆️",
    summary:"Promotion = elevation from one rank to another. Constable must have 3 years service and pass the Probationer's Examination. GCE/CXC English exemption may be applied for. Applications submitted through OC Division to Deputy Commissioner. Promotion Advisory Board interviews candidates and prepares the Merit List. Pass and Referral List published in Departmental Orders. Commissioner recommends promotions to the Police Service Commission.",
    keyPoints:["Promotion = elevation from one rank to another","Constable must have 3 years service + pass Probationer's Exam","GCE/CXC English exemption published in Departmental Orders","Applications through OC Division to Deputy Commissioner","Promotion Advisory Board prepares Merit List","Pass and Referral List published in Departmental Orders","Commissioner recommends promotions to the Police Service Commission",
      "Merit list integrity depends on clean appraisal files — fix adverse entries before board season"] },
  { num:38, title:"Charge Room",                        color:"#E05555", icon:"🏛️",
    summary:"The Charge Room is where officer movements are recorded, prisoners are processed, books and records are kept, and the public makes enquiries. The SDO-in-Charge of the Charge Room is the custody officer for their tour of duty. Officers dress: Patrol Order No. 3 (Day), No. 4 (Night). Duties include: verify handover, detail sentries, ensure all reports entered in Station Diary, enquire into bona fide of every warrantless arrest. If arrest is unlawful: release the person, record in Station Diary, inform the FDO. Ensure prisoners are informed of rights. Forbidden: leave without permission, sleep on duty, consume alcohol.",
    keyPoints:["SDO-in-Charge = custody officer for their tour of duty","Patrol Order No. 3 (Day) / No. 4 (Night)","Must enquire into bona fide of every warrantless arrest","Unlawful arrest: release person, record in Station Diary, inform FDO","Prisoner must be informed of right to legal advice and to communicate with relatives","Forbidden: leave without permission, sleep on duty, consume alcohol","All reports received must be entered in Station Diary same day",
      "Warrantless arrest enquiries protect liberty — skip them and risk unlawful detention claims"] },
  { num:39, title:"Telecommunications",                 color:"#38C172", icon:"📡",
    summary:"The 999 Emergency line must be answered promptly at all times. Registers are maintained for all telecommunications usage. No unauthorized personal calls on police telephone systems. OC responsible for security and proper use of all equipment. Faults must be reported immediately.",
    keyPoints:["999 Emergency line must be answered promptly at all times","Registers maintained for all telecommunications usage","No unauthorized personal calls on police telephone systems","OC responsible for security and proper use of all telecommunications equipment","Faults reported immediately","Radio communications follow prescribed protocols",
      "999 abandonment is a service-failure headline — roster slack to cover meal breaks on the console"] },
  { num:40, title:"Firearms and Ammunition",            color:"#9B72CF", icon:"🔫",
    summary:"Police investigate applications for Firearm User's Licences. The OC of the Division receives applications and forwards them with recommendations to the Commissioner. Firearms Registers are maintained at every station. Only authorized persons may possess licensed firearms.",
    keyPoints:["Police investigate applications for Firearm User's Licences","OC Division forwards applications with recommendations to Commissioner","Firearms Registers maintained at every station","Only authorized persons may possess licensed firearms","All firearms incidents must be reported immediately",
      "FUL investigations affect public safety licensing — sloppy recommendations can arm unsuitable persons"] },
  { num:41, title:"Police Firearms and Ammunition",     color:"#E05555", icon:"🔫",
    summary:"Police firearms and ammunition are Government property. An Armourer is responsible for care, maintenance, and issue. Every officer must sign for all arms and ammunition issued. Firearms must be inspected before and after each duty. Any defect, damage, loss, or discharge must be reported immediately. A full report is required for any discharge.",
    keyPoints:["All police firearms are Government property","Armourer responsible for care, maintenance and issue","Officers MUST sign for all arms and ammunition on issue","Firearms inspected before and after each duty","Defect, damage, loss or discharge: reported immediately","Full report required for any discharge of a police firearm",
      "Every round accounted for — ammunition variances trigger automatic discipline reviews"] },
  { num:42, title:"Industrial Accidents",               color:"#38C172", icon:"⚠️",
    summary:"On receiving a report of an industrial accident, notify the OC immediately. The Investigating Officer must attend the scene and document thoroughly. The Labour Inspectorate must be notified for industrial accidents. For aircraft accidents, the Civil Aviation Authority must be notified. The scene must be preserved pending investigation. Fatalities require notification of the coroner.",
    keyPoints:["Industrial Accidents = workplace accidents causing injury or death","On receiving report: notify OC immediately","Investigating officer attends scene and documents thoroughly","Labour Inspectorate notified for industrial accidents","Aircraft accidents: Civil Aviation Authority notified","Fatalities require notification of the coroner",
      "Notify specialist regulators early — joint scenes need unified command and evidence sharing"] },
  { num:43, title:"Financial Administration",           color:"#4A90D9", icon:"💰",
    summary:"The OC of Finance Branch is responsible for all financial administration. Emoluments are paid on prescribed dates. Overpayments must be recovered. An Imprest Account (petty cash) is maintained at each Division/Branch. All expenditure requires proper authorization and vouchers. Financial records are subject to regular audit.",
    keyPoints:["OC Finance Branch responsible for all financial administration","Emoluments paid on prescribed dates","Overpayments and unauthorized payments must be recovered","Imprest Account (petty cash) maintained at each Division/Branch","All expenditure requires proper authorization and vouchers","Financial records subject to regular audit",
      "Petty cash shortcuts invite audit findings — voucher discipline is leadership, not bureaucracy"] },
  { num:44, title:"Motor Vehicle & Road Traffic",       color:"#9B72CF", icon:"🚗",
    summary:"Fixed Penalty Notices may be issued for minor traffic offences. All traffic accidents must be documented. Hit and run accidents require immediate investigation and CRO notification. Breathalyzer tests are administered by authorized officers only. All traffic offences are recorded in the Occurrence Register.",
    keyPoints:["Fixed Penalty Notices for minor traffic offences","All traffic accidents must be documented","Hit and run: immediate investigation and CRO notification","Breathalyzer tests by authorized officers only","All traffic offences recorded in Occurrence Register","CRO notified of all serious traffic accidents",
      "Serious traffic death scenes engage both traffic homicide protocol and CRO death notifications"] },
  { num:45, title:"Civilian Employees",                 color:"#E8A838", icon:"👷",
    summary:"Civilian employees are subject to administrative control by the OC of the Division/Branch. A register of civilian employees is maintained. Each is issued an Identification Pass which must be surrendered on completion of attachment or on leaving the Service. Misconduct must be reported to the Commissioner.",
    keyPoints:["Civilian employees subject to administrative control by OC Division/Branch","Register of civilian employees maintained","Each civilian employee issued an Identification Pass","Pass surrendered on completion of attachment or leaving","Misconduct reported to Commissioner","Leave follows normal public service procedures",
      "Passes control building access — terminated civilians must surrender passes the same day"] },
  { num:46, title:"Marshals, Bailiffs & JPs",          color:"#4A90D9", icon:"⚖️",
    summary:"Marshals of the High Court and Bailiffs may request police assistance to execute court process. The SDO-in-charge must detail an officer to assist when a proper request is received. The detailed officer ensures lawful execution and reports back. Justices of the Peace may administer oaths and witness statements.",
    keyPoints:["Marshals and Bailiffs may request police assistance to execute court process","SDO must detail an officer to assist on proper request","Detailed officer ensures lawful execution and reports back","JPs may administer oaths and witness statements","Documentation must be in order when dealing with JPs","Officers must treat JPs with appropriate courtesy",
      "Verify court papers before assisting — executing void process exposes the Service to liability"] },
  { num:47, title:"Woman Police Bureau",                color:"#E05555", icon:"👩‍✈️",
    summary:"The Woman Police Bureau addresses matters affecting women and children. Women Police Officers have all the powers of male officers. The Bureau handles: sexual offences, domestic violence, missing women and children, female prisoners, and complaints by female members of the public. Separate rest rooms and toilet facilities must be provided for female officers at all stations.",
    keyPoints:["Bureau addresses matters affecting women and children","Women Police Officers have all powers of male officers","Bureau handles: sexual offences, domestic violence, missing women/children, female prisoners","Separate rest rooms and toilet facilities must be provided for female officers","Bureau Supervisor administers the Bureau","Women Police Affairs Desk exists at Divisional level",
      "Gender-sensitive investigations still need evidence law — empathy never replaces lawful procedure"] },
  { num:48, title:"Disciplinary Procedure & Complaints", color:"#38C172", icon:"⚖️",
    summary:"Authority derives from Section 123(1) of the T&T Constitution — delegated to Commissioner and Superintendents. Key definitions: Defaulter = officer charged; Reporting Officer = officer who prefers charge; Disciplinary Officer = presides over tribunal; Tribunal Prosecutor = presents the case. Rights of Defaulter: informed in writing, time to prepare, call/cross-examine witnesses, representation by fellow officer, right of appeal. Tribunal held in PRIVATE. Suspension/Interdiction may be ordered by Commissioner or Superintendent. All public complaints are SECRET and CONFIDENTIAL. Frivolous complaints dismissed — complainant may be liable to prosecution.",
    keyPoints:["Authority: Section 123(1) T&T Constitution — delegated to Commissioner and Superintendents","Defaulter rights: informed in writing, time to prepare, call witnesses, representation, appeal","Tribunal proceedings held in PRIVATE","Suspension/Interdiction ordered by Commissioner or Superintendent","All public complaints: SECRET and CONFIDENTIAL","Frivolous complaints dismissed — complainant liable to prosecution","Obstructing an investigator = disciplinary offence",
      "Constitution s.123(1) delegation means superintendents' tribunals must still respect PSR fair-hearing steps"] },
  { num:49, title:"Care of Police Vehicles",            color:"#9B72CF", icon:"🚔",
    summary:"Police vehicles are Government property. The driver is responsible for care and maintenance of the assigned vehicle. A Vehicle History Sheet, Job Sheet, and Vehicle Log Book are maintained for each vehicle. The OC of Transport Branch is responsible for all police vehicles. Vehicles must be inspected before and after each duty. Marked police vehicles must not be used for unauthorized purposes.",
    keyPoints:["Police vehicles are Government property","Driver responsible for care and maintenance of assigned vehicle","Vehicle History Sheet, Job Sheet and Log Book maintained for each vehicle","OC Transport Branch responsible for all police vehicles","Vehicles inspected before and after each duty","Marked police vehicles must not be used for unauthorized purposes",
      "Unauthorised private use of marked vehicles is a fast-track discredit charge — log pool-car sign-outs"] },
  { num:50, title:"Medical Benefit & Sick Leave",       color:"#E8A838", icon:"🏥",
    summary:"Sick Leave requires a medical certificate from an approved Registered Medical Practitioner. Extended Sick Leave requires Medical Board approval. Hospitalization must be reported to the OC. Officers on sick leave must not perform duties or engage in activities inconsistent with their reported illness. Maternity and Paternity Leave are granted per prescribed entitlements.",
    keyPoints:["Medical certificate required for sick leave from approved practitioner","Extended Sick Leave requires Medical Board approval","Hospitalization must be reported to OC","Officers on sick leave must not perform duties or engage in inconsistent activities","Maternity and Paternity Leave granted per prescribed entitlements","Medical Benefit applies to illnesses/injuries sustained in course of duty",
      "Inconsistent sick-leave patterns should trigger welfare referral before they become conduct allegations"] },
  { num:51, title:"Missing Persons",                    color:"#4A90D9", icon:"🔦",
    summary:"A Missing Persons Register is maintained at every Station. On receiving a report, record full details and immediately notify the SDO-in-charge. The SDO ensures appropriate investigation is initiated. CRO must be notified of all missing persons reports. Missing children/vulnerable adults: investigation begins immediately.",
    keyPoints:["Missing Persons Register maintained at every Station","On receiving report: record full details and immediately notify SDO-in-charge","SDO ensures appropriate investigation is initiated","CRO notified of ALL missing persons reports","Missing children/vulnerable adults: investigation begins IMMEDIATELY","Photographs and descriptions circulated to all stations",
      "Early phone data and CCTV preservation beats reactive door-knocking days later"] },
  { num:52, title:"Books, Registers & Records",         color:"#E05555", icon:"📚",
    summary:"Specific books and registers prescribed by the Commissioner must be kept at every Station. Records are classified as Permanent or retained for a specific period. Destruction of records requires authorization. A Station Information File is maintained at every Station. All records must be kept in a serviceable and legible condition.",
    keyPoints:["Specific books/registers prescribed by Commissioner at every Station","Records classified as Permanent or retained for specific period","Destruction of records requires authorization","Station Information File maintained at every Station","All records kept in serviceable and legible condition","Financial Records retained for minimum prescribed period",
      "Retention schedules are legal duties — premature destruction can obstruct commissions of inquiry"] },
  { num:53, title:"Domestic Violence",                  color:"#38C172", icon:"🏠",
    summary:"Officers have a duty to respond to ALL reports of domestic violence. A Domestic Violence Register is maintained at every Station. The SDO-in-charge ensures all reports are recorded in the Station Diary and investigated promptly. Officers must provide victims with information about their rights and available services.",
    keyPoints:["Officers have duty to respond to ALL reports of domestic violence","Domestic Violence Register maintained at every Station","SDO-in-charge ensures all reports recorded in Station Diary and investigated promptly","Officers must inform victims of rights and available services","Head of Division responsible for ensuring proper handling","Records maintained by SDO-in-charge Modus Operandi and Records Bureau",
      "Risk assessment + safety planning should accompany every DV diary entry — templated referrals save lives"] },
  { num:54, title:"Police Actions at Protests",         color:"#4A90D9", icon:"📣",
    summary:"Regional Assistant Commissioners are responsible for policing of protests and demonstrations. A Protest/Demonstration Register is maintained. The Senior SDO must assess the situation and notify the Area FDO before any police response. Force must be necessary and proportionate. All protests/demonstrations must be documented in the Register.",
    keyPoints:["Regional ACs responsible for policing of protests/demonstrations","Protest/Demonstration Register maintained","Senior SDO must assess situation and notify Area FDO","Force must be NECESSARY and PROPORTIONATE","All protests/demonstrations documented in the Register","Officers must respect citizens' rights to peaceful protest",
      "Proportionate force means last resort — document warnings, routes, and command decisions minute-by-minute"] },
  { num:55, title:"Government Powder Magazine",         color:"#9B72CF", icon:"💥",
    summary:"The Head of Division is responsible for the security and management of the Powder Magazine. A Magazine Keeper is appointed by the Commissioner. Strict safety procedures are mandatory. Business hours are prescribed — no access outside those hours. Access is strictly controlled and all entries are recorded.",
    keyPoints:["Head of Division responsible for security and management","Magazine Keeper appointed by Commissioner","Strict safety procedures mandatory — no exceptions","Business hours prescribed — no access outside hours","Access strictly controlled and all entries recorded","Explosive materials stored per prescribed safety standards",
      "Explosives security is zero-error — combine SO duties with national explosives regulations on joint sites"] },
];
 
/* ══════════════════════════════════════════════════════════════
   API
══════════════════════════════════════════════════════════════ */
async function callClaude(system, user, maxTokens = 1800) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens,
      system, messages: [{ role: "user", content: user }] }),
  });
  const data = await res.json();
  return (data.content?.map(i => i.text || "").join("") || "").replace(/```json|```/g, "").trim();
}
 
 
const SO_SYS = (so) => {
  const d = ALL_SO.find(s => s.num === so.num);
  const ctx = d ? d.summary + "\n\nKey Points: " + d.keyPoints.join("; ") : so.title;
  return "You are a senior TTPS Sergeant Promotion Examination examiner.\n"
       + "Using ONLY the official text of S.O." + so.num + " — " + so.title + " from the Standing Orders 2001:\n\n"
       + ctx
       + "\n\nGenerate 5 short-answer questions testing: exact section numbers, specific procedures, defined terms, responsibilities, and timeframes."
       + "\nEach model answer MUST cite the specific section number."
       + "\nReturn ONLY valid JSON: [{\"question\":\"...\",\"modelAnswer\":\"...\",\"keyPoints\":[\"...\",\"...\",\"...\"],\"marks\":5}]";
};
const PSR_SYS = (part) => {
  const d = PSR_PARTS.find(p => p.id === part.id);
  const ctx = d ? d.summary + "\n\nKey Points: " + d.keyPoints.join("; ") : part.title;
  return "You are a senior TTPS Sergeant Promotion Examination examiner.\n"
       + "Using ONLY the official text of " + part.num + " — " + part.title + " (" + part.regs + ") from the PSR 2007:\n\n"
       + ctx
       + "\n\nGenerate 5 short-answer questions testing: exact regulation numbers, specific timeframes, precise procedures, and legal requirements."
       + "\nEach model answer MUST cite the specific regulation number."
       + "\nReturn ONLY valid JSON: [{\"question\":\"...\",\"modelAnswer\":\"...\",\"keyPoints\":[\"...\",\"...\",\"...\"],\"marks\":5}]";
};
const MGMT_SYS = (topic) => {
  const chunks = topic.units.map(function(u) {
    return "[" + u.uid + "] " + u.topic
      + "\nSOURCE: " + u.raw
      + "\nKEY ELEMENTS: " + u.elements.join("; ");
  }).join("\n\n");
  return "You are a senior TTPS Sergeant Promotion Examination examiner, Management section.\n"
       + "Topic: " + topic.title + "\n\n"
       + topic.overview + "\n\n"
       + chunks
       + "\n\nGenerate 5 short-answer questions testing theory names, theorist names and years, key elements, policing applications, and comparisons."
       + "\nEach answer MUST name the theorist and year where applicable."
       + "\nReturn ONLY valid JSON: [{\"question\":\"...\",\"modelAnswer\":\"...\",\"keyPoints\":[\"...\",\"...\",\"...\"],\"marks\":5}]";
};
const LEG_SYS = (act, unit) => {
  return "You are a senior TTPS Sergeant Promotion Examination examiner, Legal Frameworks section.\n"
       + "Act: " + act.title + " — Section: " + unit.topic + "\n\n"
       + "STATUTORY TEXT: " + unit.raw + "\n"
       + "KEY ELEMENTS: " + unit.elements.join("; ") + "\n"
       + "CROSS-REFERENCES: " + (unit.cross_refs ? unit.cross_refs.join("; ") : "") + "\n\n"
       + "Generate 5 exam-quality short-answer questions. Each answer must cite the specific section number and cross-reference the relevant Standing Order or PSR regulation where applicable."
       + "\nReturn ONLY valid JSON: [{\"question\":\"...\",\"modelAnswer\":\"...\",\"keyPoints\":[\"...\",\"...\",\"...\"],\"marks\":5}]";
};
const GRADE_SYS = (src) =>
  "You are a marking examiner for the TTPS Sergeant Promotion Examination. Source: " + src + ".\n"
+ "Grade strictly — penalise vague answers; reward specific citations of section numbers, regulation numbers, or theorist names with years."
+ "\nReturn ONLY valid JSON: {\"score\":0,\"outOf\":5,\"percentage\":0,\"grade\":\"Distinction/Pass/Fail\",\"strengths\":[\"...\"],\"improvements\":[\"...\"],\"feedback\":\"2-3 sentences citing specific section, regulation, or theory\"}";
 
 
/* ══════════════════════════════════════════════════════════════
   MANAGEMENT & LEGISLATION DATA
   54 chunks · 23 MGMT units · 31 LEG units
   Schema: uid · topic · raw (source) · elements · cross_refs
══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   SUPERVISORY MANAGEMENT — CPL/SGT Exam Section 1
   Schema per unit: uid · topic · raw (source) · elements · plain_english · test_question
══════════════════════════════════════════════════════════════ */
const MGMT_TOPICS = [
  { id:"functions", icon:"⚙️", color:"#4A90D9", title:"Functions of Police Management",
    overview:"Police management involves directing human and material resources toward organisational goals. POSDCORB (Gulick, 1937), Fayol's 14 Principles, and Mintzberg's Roles (1973) form the foundational framework tested in the sergeant examination. Examiners reward answers that name the theorist and year, then immediately translate the theory into a concrete station or patrol scenario.",
    units:[
      { uid:"FUNC_001", topic:"POSDCORB — The 7 Functions of Management (Gulick, 1937)",
        raw:"Luther Gulick (1937) identified 7 functions of the chief executive: Planning — setting objectives and determining how to achieve them; Organising — arranging resources and tasks; Staffing — recruiting, selecting, training and developing personnel; Directing — guiding, leading and supervising personnel toward goals; Coordinating — ensuring all units work together harmoniously; Reporting — keeping superiors informed through records, research and inspections; Budgeting — fiscal planning, accounting and control of expenditure.",
        elements:["Planning: setting objectives and determining how to achieve them","Organising: arranging resources and tasks to accomplish goals","Staffing: recruiting, selecting, training and developing personnel","Directing: guiding, leading and supervising personnel toward goals","Coordinating: ensuring all units and functions work together harmoniously","Reporting: keeping superiors informed through records, research and inspections","Budgeting: fiscal planning, accounting and control of expenditure","POSDCORB is a memory scaffold — examiners expect each letter illustrated with a policing duty, not a dictionary definition"],
        plain_english:"A sergeant uses all 7 daily — planning patrols (Planning), organising shift duties (Organising), directing officers on the ground (Directing), and reporting incidents to the OC through the chain of command (Reporting).",
        test_question:"Name the 7 functions of management under POSDCORB. State the theorist and year. Give a policing example of each." },
      { uid:"FUNC_002", topic:"Fayol's 14 Principles of Management",
        raw:"Henri Fayol identified 14 principles: Division of Work, Authority and Responsibility, Discipline, Unity of Command, Unity of Direction, Subordination of Individual Interest to the General Interest, Remuneration, Centralisation, Scalar Chain, Order, Equity, Stability of Tenure, Initiative, Esprit de Corps. Unity of Command states each officer receives orders from ONE superior only. Scalar Chain is the unbroken line of authority from top to bottom.",
        elements:["Unity of Command: each officer receives orders from ONE superior only","Scalar Chain: unbroken line of authority from top to bottom of organisation","Unity of Direction: one head, one plan for activities with the same objective","Esprit de Corps: team spirit and harmony build organisational strength","Division of Work: specialisation increases efficiency and output","Authority and Responsibility: authority must equal responsibility","Discipline: obedience and respect between officers and management","In TTPS, Unity of Command interacts with lawful operational orders — a sergeant cannot receive conflicting lawful orders from two superiors without escalating immediately"],
        plain_english:"Unity of Command means a constable takes orders from their Sergeant only — not multiple supervisors at once. The scalar chain explains the TTPS rank structure from Commissioner down to Constable.",
        test_question:"Explain Fayol's principles of Unity of Command and Scalar Chain. Why is Unity of Command important in a police organisation?" },
      { uid:"FUNC_003", topic:"Mintzberg's Managerial Roles (1973)",
        raw:"Henry Mintzberg (1973) identified three broad categories of managerial roles. INTERPERSONAL: Figurehead (ceremonial duties), Leader (motivating and directing the team), Liaison (maintaining external contacts). INFORMATIONAL: Monitor (gathering information from environment), Disseminator (sharing information within the organisation), Spokesperson (representing the organisation externally). DECISIONAL: Entrepreneur (initiating change), Disturbance Handler (resolving crises), Resource Allocator (deciding who gets what resources), Negotiator (bargaining with other parties).",
        elements:["INTERPERSONAL: Figurehead — ceremonial duties; Leader — motivating team; Liaison — external contacts","INFORMATIONAL: Monitor — gathering information; Disseminator — sharing internally; Spokesperson — representing externally","DECISIONAL: Entrepreneur — initiating change; Disturbance Handler — resolving crises; Resource Allocator — deploying resources; Negotiator — bargaining","Mintzberg complements POSDCORB: same sergeant shifts hats hourly — name the hat when you analyse a scenario"],
        plain_english:"When briefing officers a sergeant is a Leader; writing reports they are a Disseminator; allocating patrol duties they are a Resource Allocator; responding to a public order incident they are a Disturbance Handler.",
        test_question:"According to Mintzberg, what are the three broad categories of managerial roles? Name all specific roles within each category and give a policing example of each." }
    ]
  },
  { id:"motivation", icon:"🔥", color:"#38C172", title:"Motivational Theory and Police Operational Development",
    overview:"Motivation theories explain what drives behaviour and performance. The three key theories for the sergeant examination are Maslow's Hierarchy of Needs (1943), McGregor's Theory X and Theory Y (1960), and Herzberg's Two-Factor Theory (1959). Link each theory to both discipline cases (what went wrong) and high-performing teams (what was reinforced).",
    units:[
      { uid:"MOT_001", topic:"Maslow's Hierarchy of Needs (1943)",
        raw:"Abraham Maslow (1943) proposed that human needs are arranged in a 5-level hierarchy. Lower needs must be substantially satisfied before higher needs motivate behaviour. Level 1 — PHYSIOLOGICAL: food, water, shelter, rest. Level 2 — SAFETY AND SECURITY: security, stability, freedom from fear. Level 3 — SOCIAL/LOVE AND BELONGING: friendship, acceptance, belonging. Level 4 — ESTEEM: recognition, status, achievement, respect from others. Level 5 — SELF-ACTUALISATION: reaching one's full potential, growth, achievement.",
        elements:["Level 1 — PHYSIOLOGICAL: food, water, shelter, rest — policing: salary, meal allowances, rest days","Level 2 — SAFETY AND SECURITY: job security, freedom from fear — policing: safe working conditions, adequate equipment","Level 3 — SOCIAL/BELONGING: friendship, acceptance — policing: team cohesion, camaraderie, esprit de corps","Level 4 — ESTEEM: recognition, status — policing: commendations, promotion, awards, public respect","Level 5 — SELF-ACTUALISATION: reaching full potential — policing: specialist training, leadership roles, complex investigations","Lower needs must be substantially satisfied before higher needs motivate behaviour","Maslow is not a checklist for gifts — unmet Level 1–2 needs usually explain sudden performance collapse better than 'bad attitude'"],
        plain_english:"A new constable is motivated primarily by salary and job security (Levels 1 and 2). Once settled, they seek belonging within their team (Level 3). Commendations and promotion address Level 4. A sergeant who understands this can motivate by addressing whichever level is currently unsatisfied.",
        test_question:"Draw and explain Maslow's Hierarchy of Needs. How can a sergeant use this theory to motivate officers? Give a specific policing example for each level." },
      { uid:"MOT_002", topic:"McGregor's Theory X and Theory Y (1960)",
        raw:"Douglas McGregor (1960) identified two contrasting sets of assumptions about human nature. THEORY X: people inherently dislike work; they avoid responsibility; they prefer to be directed; they must be coerced, controlled and threatened to perform; they are motivated primarily by security. THEORY Y: work is as natural as rest or play; people are self-directed when committed to objectives; they seek responsibility; they are creative and capable of exercising imagination; they are motivated by achievement, recognition and growth.",
        elements:["THEORY X assumptions: people dislike work; avoid responsibility; prefer to be directed; must be coerced; motivated by security","THEORY X management style: autocratic; close supervision; rigid rules; top-down decision-making; little delegation","THEORY Y assumptions: work is natural; people are self-directed; seek responsibility; capable of creativity; motivated by achievement","THEORY Y management style: participative; delegation; empowerment; consultation; development of officers","In policing a blend of both is necessary — Theory X in emergencies, Theory Y in community policing and professional development"],
        plain_english:"A Theory X sergeant micro-manages every officer and motivates through the threat of discipline. A Theory Y sergeant delegates, consults, and motivates through recognition and trust. Effective police leaders blend both — autocratic in a tactical emergency, participative in planning.",
        test_question:"Compare and contrast McGregor's Theory X and Theory Y. Which assumptions would you adopt as a sergeant? Are there situations where each is appropriate?" },
      { uid:"MOT_003", topic:"Herzberg's Two-Factor Theory (1959)",
        raw:"Frederick Herzberg (1959) identified two types of workplace factors. HYGIENE FACTORS: their absence causes dissatisfaction; their presence only prevents dissatisfaction — they do NOT motivate. Examples: salary, job security, working conditions, quality of supervision, organisational policies, relationship with peers. MOTIVATORS: their presence actively creates job satisfaction and motivation. Examples: achievement, recognition for achievement, the work itself, responsibility, advancement and growth. Key insight: salary is a hygiene factor, NOT a motivator.",
        elements:["HYGIENE FACTORS (prevent dissatisfaction, do not motivate): salary, job security, working conditions, quality of supervision, organisational policies, peer relationships","MOTIVATORS (actively create motivation and satisfaction): achievement, recognition, the work itself, responsibility, advancement and growth","Absence of hygiene factors = dissatisfaction; presence of hygiene factors = only prevents dissatisfaction","Presence of motivators = positive motivation and genuine job satisfaction","Salary is a HYGIENE FACTOR — its absence causes dissatisfaction but its presence does not strongly motivate long-term"],
        plain_english:"A sergeant who only ensures officers receive their pay and have adequate facilities has removed dissatisfaction — but has NOT created motivation. Real motivation comes from giving officers meaningful work, public recognition for good performance, and opportunities for advancement.",
        test_question:"Explain Herzberg's Two-Factor Theory. Clearly distinguish between hygiene factors and motivators. Give two policing examples of each category." }
    ]
  },
  { id:"leadership", icon:"👑", color:"#E8A838", title:"Leadership and Decision Making",
    overview:"Leadership is the ability to influence others toward the achievement of goals. The examination tests: classical leadership styles, contingency theory (Fiedler 1967; Hersey and Blanchard), proactive leadership, the 7-step decision-making process, leadership competencies, and interpersonal skills. Always state WHY a chosen style fits the risk level, time pressure, and officer experience in your scenario.",
    units:[
      { uid:"LEAD_001", topic:"The Three Classical Leadership Styles",
        raw:"Three classical leadership styles: AUTOCRATIC/AUTHORITARIAN — leader makes all decisions alone; gives direct orders without consultation; maintains close control; relies on authority and discipline. Best in emergencies. Risk: low morale if overused. DEMOCRATIC/PARTICIPATIVE — leader consults team members; involves them in decision-making; delegates authority; builds commitment. Better for complex planning. Risk: slower decisions. LAISSEZ-FAIRE/FREE-REIN — leader delegates most decision-making to the group with minimal guidance; maximum autonomy. Effective ONLY with highly skilled, experienced, self-motivated officers. Ineffective in emergencies.",
        elements:["AUTOCRATIC: leader decides alone; direct orders; close control; best in emergencies and crises; risk: low morale if overused","DEMOCRATIC: consults team; involves in decisions; delegates; better morale; good for planning; risk: slower decisions","LAISSEZ-FAIRE: delegates to group; maximum autonomy; effective only with highly skilled, self-motivated officers; ineffective in emergencies","Best leaders adapt their style to the situation and the maturity of the officer"],
        plain_english:"At a crime scene a sergeant must be autocratic — clear, immediate orders. In a community policing strategy meeting, democratic works better. With an experienced detective on a complex investigation, laissez-faire allows professional discretion. Effective sergeants match the style to the situation.",
        test_question:"Describe the three classical leadership styles. In what policing situations would each style be most appropriate? Why is flexibility between styles important?" },
      { uid:"LEAD_002", topic:"Contingency Theory of Leadership (Fiedler 1967; Hersey and Blanchard)",
        raw:"Contingency Theory: there is NO single best leadership style — effectiveness depends on the situation. FIEDLER'S CONTINGENCY MODEL (1967): effectiveness depends on the match between leadership style and situational favourableness, determined by: leader-member relations, task structure, and position power. Task-oriented leaders are most effective in very favourable or very unfavourable situations; relationship-oriented leaders in moderately favourable situations. HERSEY AND BLANCHARD'S SITUATIONAL LEADERSHIP: style should match follower readiness (ability + willingness). Four styles: S1 Telling (low readiness), S2 Selling (low-moderate readiness), S3 Participating (moderate-high readiness), S4 Delegating (high readiness).",
        elements:["Core principle: NO single best leadership style — effectiveness depends on the situation","FIEDLER (1967): effectiveness depends on match between leadership style and situational favourableness","Situational favourableness determined by: leader-member relations, task structure, position power","HERSEY AND BLANCHARD: 4 styles matched to follower readiness (ability + willingness)","S1 TELLING: low readiness — specific instructions, close supervision","S2 SELLING: low-moderate readiness — explain decisions, encourage questions","S3 PARTICIPATING: moderate-high readiness — share decision-making, encourage","S4 DELEGATING: high readiness — delegate with minimal supervision"],
        plain_english:"A new constable on first patrol needs S1 Telling — specific step-by-step instructions with close supervision. An experienced constable lacking confidence needs S3 Participating. A seasoned detective needs S4 Delegating. The sergeant reads the officer, then selects the appropriate style.",
        test_question:"What is Contingency Theory of Leadership? Explain Hersey and Blanchard's four leadership styles and state when each should be used in a policing context." },
      { uid:"LEAD_003", topic:"Proactive Leadership in Policing",
        raw:"Proactive leadership means anticipating problems and taking pre-emptive action rather than simply reacting to incidents after they occur. Characteristics: strategic thinking; environmental scanning; intelligence-led resource deployment; building community relationships before problems arise; preventive patrol; hot-spot policing; forward planning. Contrast with REACTIVE leadership: responds only after an incident occurs; no crime pattern analysis; resources deployed only in response to calls for service.",
        elements:["Anticipation: identifying and addressing problems before they escalate into incidents","Hot-spot policing: deploying resources based on crime pattern analysis to predicted locations","Intelligence-led deployment: using analysed data to anticipate rather than react","Community building before problems arise: proactive engagement prevents crime and builds trust","Preventive patrol: strategic visible presence to deter offending","Contrast with REACTIVE: responds after the fact; no forward planning; resources follow calls"],
        plain_english:"A reactive sergeant only responds to the radio. A proactive sergeant analyses last week's crime report before the briefing, identifies the two streets where robberies are clustering, deploys officers there on foot patrol, and briefs them on the suspect vehicle description — before any call comes in.",
        test_question:"Define proactive leadership in a policing context. How does it differ from reactive policing? What practical steps can a sergeant take to lead proactively on a daily basis?" },
      { uid:"LEAD_004", topic:"Basic Steps of Decision Making — The 7-Step Process",
        raw:"The rational decision-making process: Step 1 — IDENTIFY AND DEFINE THE PROBLEM clearly (what exactly is the issue and its boundaries?). Step 2 — GATHER RELEVANT INFORMATION AND FACTS (what do we know? what is missing? what are the constraints?). Step 3 — IDENTIFY POSSIBLE ALTERNATIVES (generate ALL possible courses of action without evaluating them yet). Step 4 — EVALUATE THE ALTERNATIVES (what are the pros, cons, risks, and consequences of each option?). Step 5 — SELECT THE BEST ALTERNATIVE (which option best achieves the objective within the constraints?). Step 6 — IMPLEMENT THE DECISION (put it into action with clear instructions and assigned responsibilities). Step 7 — EVALUATE THE OUTCOME (did the decision achieve the desired result? what can be learned?)",
        elements:["Step 1 — IDENTIFY THE PROBLEM: define clearly, understand the boundaries","Step 2 — GATHER FACTS: what is known? what is missing? what are the constraints?","Step 3 — IDENTIFY ALTERNATIVES: generate ALL possible courses of action without evaluating yet","Step 4 — EVALUATE ALTERNATIVES: pros, cons, risks, and consequences of each option","Step 5 — SELECT BEST ALTERNATIVE: which option best achieves the objective within constraints?","Step 6 — IMPLEMENT: put into action with clear instructions and assigned responsibilities","Step 7 — EVALUATE OUTCOME: did it work? what lessons can be applied next time?"],
        plain_english:"When a sergeant receives a report of a developing public order situation, they must: define what is happening (Step 1), gather facts from the scene (Step 2), consider all options — call for backup, disperse the crowd, arrest ringleaders, establish a perimeter (Step 3), weigh each option (Step 4), select the best (Step 5), deploy resources (Step 6), and review in the debriefing what worked and what did not (Step 7).",
        test_question:"List and explain the 7 basic steps of the decision-making process. Apply this process in full to a specific policing scenario of your choice." },
      { uid:"LEAD_005", topic:"Leadership Competencies for Police Supervisors",
        raw:"Core leadership competencies required of police supervisors: Integrity and Ethics — adhering to ethical standards; leading by example; doing what is right even when no one is watching. Communication — clear, accurate, timely transmission of information up and down the chain of command. Decision Making Under Pressure — sound judgements under time pressure and incomplete information. Team Building — creating cohesion, trust, and shared purpose. Conflict Resolution — managing disputes fairly and professionally. Emotional Intelligence — self-awareness, self-regulation, empathy, and social skills. Strategic Thinking — seeing beyond immediate incidents to patterns and long-term solutions. Community Orientation — building relationships with the public and community organisations. Accountability and Transparency — taking responsibility for decisions and their outcomes.",
        elements:["Integrity and Ethics: adhering to ethical standards; leading by example; doing right even when unobserved","Communication: clear, accurate, timely information flow up and down the chain of command","Decision Making Under Pressure: sound judgements under time pressure and uncertainty","Team Building: creating cohesion, trust, and shared purpose among officers","Conflict Resolution: managing disputes fairly and professionally","Emotional Intelligence: self-awareness, empathy, self-regulation, social skills","Accountability: taking responsibility for decisions and outcomes — not deflecting blame","Community Orientation: building relationships with the public and community organisations"],
        plain_english:"The current TTPS Strategic Plan 2025-2027 identifies P.R.I.D.E. (Professionalism, Respect, Integrity, Dignity, Excellence) as the shared core values underpinning all leadership in the Service — a change from the older IPART acronym used in earlier plans. A sergeant must embody P.R.I.D.E. in every interaction with officers, with the public, and with the chain of command.",
        test_question:"Identify and explain FIVE core leadership competencies required of a police supervisor. Why is integrity considered the most fundamental of all leadership competencies?" },
      { uid:"LEAD_006", topic:"Interpersonal Skills of a Police Leader",
        raw:"Interpersonal skills are the abilities used to interact effectively with others. Key interpersonal skills for police leaders: Active Listening — giving full attention, reflecting back, asking clarifying questions. Empathy — understanding and acknowledging others' feelings without necessarily agreeing. Assertiveness — expressing views, needs, and boundaries confidently and directly without aggression. Conflict Management — identifying the root cause; facilitating resolution; maintaining impartiality. Cultural Sensitivity — respecting diversity in the Service and the community. Giving Constructive Feedback — specific, timely, factual, behaviour-focused feedback. Receiving Feedback — openness to criticism; using feedback for self-improvement. Non-Verbal Communication — awareness of body language, tone of voice, and personal space.",
        elements:["Active Listening: full attention; reflecting back; clarifying questions; not interrupting","Empathy: understanding and acknowledging others' feelings without necessarily agreeing","Assertiveness: expressing views confidently and directly without aggression or passivity","Conflict Management: identify root cause; facilitate resolution; maintain impartiality","Cultural Sensitivity: respecting diversity in Service and community","Giving Feedback: specific, timely, factual, behaviour-focused — not personal attacks","Receiving Feedback: openness to criticism; using it for self-improvement","Non-Verbal Communication: body language, tone, eye contact, personal space"],
        plain_english:"When a constable approaches a sergeant with a personal problem, the sergeant's interpersonal skills determine whether the officer feels heard and supported or dismissed and demoralised. Good interpersonal skills also directly improve community relations — a sergeant who communicates with empathy and cultural sensitivity builds far more trust with the public.",
        test_question:"What are interpersonal skills? Identify FOUR interpersonal skills essential for an effective police leader. Explain how each contributes to effective supervision with a specific policing example." }
    ]
  },
  { id:"communication", icon:"📡", color:"#9B72CF", title:"Communication within Supervisory Processes",
    overview:"Communication is the lifeblood of police management. The examination focuses on the three directions of communication in a police organisation, the seven obstacles to effective communication, and strategies for overcoming those obstacles. PSR Reg 191 governs formal communication channels. In answers, pair each direction with a documentary example (Station Diary, DO, memorandum) to show you understand formal evidence, not just theory.",
    units:[
      { uid:"COM_001", topic:"Directions of Communication in a Police Organisation",
        raw:"Communication in a police organisation flows in three directions. DOWNWARD (Superior to Subordinate): orders, instructions, policies, feedback, Standing Orders, Departmental Orders, duty rosters, shift briefings. UPWARD (Subordinate to Superior): occurrence reports, situation reports, Station Diary entries, complaints, grievances, suggestions. PSR Reg 191 requires ALL communications to the Commissioner to go through the chain of command — no officer may contact the Commissioner directly without going through their senior officer. HORIZONTAL/LATERAL (Peer to Peer): inter-divisional coordination, joint operations, information sharing between officers of equal rank or different units at the same level.",
        elements:["DOWNWARD: orders, instructions, policies, feedback, Standing Orders, Departmental Orders, duty rosters, shift briefings","UPWARD: occurrence reports, situation reports, Station Diary entries, complaints, grievances — PSR Reg 191 requires all communications to Commissioner through chain of command","HORIZONTAL/LATERAL: inter-divisional coordination, joint operations, information sharing between equal ranks","FORMAL CHANNELS: written reports and official correspondence through chain of command — required by PSR and Standing Orders","INFORMAL CHANNELS: verbal updates and casual briefings — may supplement but must never replace formal channels for official matters"],
        plain_english:"PSR Reg 191 is clear: no officer may contact the Commissioner directly. All communications must go through the senior officer in the chain of command. This is why the Station Diary, occurrence reports, and formal correspondence are so critical — they are the official upward communication channels.",
        test_question:"Describe the three directions of communication in a police organisation. Why is upward communication particularly important for a sergeant? Which PSR regulation governs formal communication channels?" },
      { uid:"COM_002", topic:"Obstacles to Communication and Strategies to Overcome Them",
        raw:"Seven obstacles to effective communication in a police organisation: 1. SEMANTIC BARRIERS: different understanding of words or police jargon; unclear instructions. 2. PHYSICAL BARRIERS: distance between stations; radio dead zones; noisy incident scenes. 3. PSYCHOLOGICAL BARRIERS: stress and anxiety; fear of reprisal for reporting mistakes; poor supervisor-officer relationship; lack of trust. 4. STATUS BARRIERS: rank differences inhibit upward communication; junior officers reluctant to challenge or correct a senior officer even when wrong. 5. INFORMATION OVERLOAD: too much information arriving simultaneously during major incidents. 6. FILTERING: information is summarised, altered, or omitted as it passes through multiple levels of the hierarchy. 7. CULTURAL BARRIERS: differences in background, language, or communication style.",
        elements:["SEMANTIC: jargon and unclear language misunderstood by new officers or the public","PHYSICAL: distance, radio dead zones, noisy environments at incident scenes","PSYCHOLOGICAL: stress, fear of reprisal, poor trust between officer and supervisor","STATUS: rank differences inhibit upward communication; junior officers reluctant to correct seniors","INFORMATION OVERLOAD: too much simultaneous information during major incidents","FILTERING: key details lost or altered as information passes through multiple hierarchy levels","CULTURAL: differences in background, language, or communication style"],
        plain_english:"A sergeant who is unapproachable creates psychological and status barriers — officers will not report problems upward, and information critical to good decision-making never reaches the OC. An open-door, approachable sergeant gets better information, makes better decisions, and runs a more effective station.",
        test_question:"Identify and explain FIVE obstacles to effective communication in a police organisation. What specific steps can a sergeant take to overcome each obstacle you have identified?" }
    ]
  },
  { id:"crime_control", icon:"🔒", color:"#E05555", title:"Crime Control Strategies and Law Enforcement Models",
    overview:"The examination tests three modern policing strategies: Evidence-Based Policing (Sherman, 1998), Intelligence-Led Policing (Ratcliffe, 2008), and Community-Oriented Policing. It also tests the Traditional/Professional Model and Weber's three types of legitimate authority. Contrast models using measurable outcomes (response time vs harm reduction) to show critical thinking, not slogans.",
    units:[
      { uid:"CC_001", topic:"Evidence-Based Policing — EBP (Sherman, 1998)",
        raw:"Lawrence Sherman (1998) defined Evidence-Based Policing as the use of the best available research evidence to decide what practices and strategies police should use. Core principle: decisions must be based on systematic research and empirical data rather than tradition, intuition, or anecdote. EBP requires practitioner-researcher partnerships where police and academics collaborate to test what actually works. Evidence hierarchy: randomised controlled trials are at the top; expert opinion is at the bottom. EBP informs but does NOT replace officer discretion and professional judgement.",
        elements:["Definition: using best available research evidence to decide police practices and strategies (Sherman, 1998)","Core principle: systematic research and data, NOT tradition, intuition, or anecdote","Practitioner-researcher partnerships: police and academics collaborate to test what works","Evidence hierarchy: randomised controlled trials at top; expert opinion at bottom","EBP informs but does NOT replace officer discretion and professional judgement","Applications: patrol deployment, offender management, domestic violence response, stop-and-search effectiveness"],
        plain_english:"Instead of patrolling the same beats because 'we always have', EBP asks: what does the research evidence show about where and when crimes actually occur? Resources are then deployed based on that evidence — not habit, tradition, or guesswork.",
        test_question:"Define Evidence-Based Policing. Who developed this concept and in what year? What is its core principle and how does it differ from traditional policing practice?" },
      { uid:"CC_002", topic:"Intelligence-Led Policing — ILP and the 3-i Model (Ratcliffe, 2008)",
        raw:"Jerry Ratcliffe (2008) defined Intelligence-Led Policing as a business model and managerial philosophy where data analysis and criminal intelligence are pivotal to an objective, decision-making framework that facilitates crime and terrorist reduction, disruption and prevention. The 3-i MODEL: (1) INTERPRET the criminal environment through systematic analysis of crime data and intelligence; (2) INFLUENCE decision-makers with clear, actionable intelligence products; (3) IMPACT the criminal environment through targeted enforcement and prevention activities. COMPSTAT: regular crime data review meetings where commanders are held accountable for crime statistics and resource deployment results.",
        elements:["Definition: business model where data analysis and criminal intelligence are pivotal to decision-making (Ratcliffe, 2008)","THE 3-i MODEL: (1) INTERPRET criminal environment through analysis; (2) INFLUENCE decision-makers with actionable intelligence; (3) IMPACT criminal environment through targeted action","COMPSTAT: regular crime data meetings holding commanders accountable for crime results","Hot-spot analysis: identifying geographic concentrations of crime for targeted patrol deployment","Criminal network disruption: identifying and targeting key offenders within criminal networks","Distinguishes information (raw data) from intelligence (analysed, assessed, actionable product)"],
        plain_english:"An ILP sergeant holds weekly crime analysis briefings. They know their top three offenders by name, know the two streets where robberies are clustering, and direct patrols based on that intelligence. Resources follow the evidence, not random deployment or tradition.",
        test_question:"Explain Intelligence-Led Policing. What is the 3-i model? State the theorist and year. How would a sergeant apply ILP principles at the station level on a day-to-day basis?" },
      { uid:"CC_003", topic:"Community-Oriented Policing — COP and the SARA Model",
        raw:"Community-Oriented Policing is a philosophy promoting the systematic use of partnerships and problem-solving techniques to proactively address the immediate conditions giving rise to public safety issues such as crime, social disorder, and fear of crime. THREE CORE COMPONENTS: (1) Community Partnerships — building trust with citizens, community groups, NGOs, schools, businesses; (2) Organisational Transformation — decentralising decision-making to front-line officers; empowering officers to identify and solve local problems; (3) Problem-Solving using the SARA model. SARA MODEL: Scanning (identify the problem), Analysis (understand causes and contributing factors), Response (develop and implement a targeted solution), Assessment (evaluate whether the response worked and adjust).",
        elements:["Core component 1 — COMMUNITY PARTNERSHIPS: building trust with citizens, NGOs, schools, businesses, community groups","Core component 2 — ORGANISATIONAL TRANSFORMATION: decentralising decision-making; empowering front-line officers to solve problems","Core component 3 — PROBLEM-SOLVING using the SARA model","SARA — SCANNING: identify and define the specific problem precisely","SARA — ANALYSIS: understand the causes, contributing factors, and context of the problem","SARA — RESPONSE: develop and implement a targeted, evidence-informed solution","SARA — ASSESSMENT: evaluate whether the response worked; adjust as needed","COP is a philosophy, NOT a single programme — it must be embedded organisation-wide"],
        plain_english:"A COP sergeant attends community meetings, builds relationships with school principals and community leaders, and uses the SARA model to turn community concerns into structured police responses. When a community reports that illegal dumping is generating disorder and fear of crime, SARA helps move from problem identification to an evidence-based solution.",
        test_question:"Define Community-Oriented Policing. What are its three core components? Explain the SARA problem-solving model and apply it to a specific policing problem." },
      { uid:"CC_004", topic:"Traditional Policing Model and Weber's Legitimate Authority",
        raw:"TRADITIONAL/PROFESSIONAL MODEL (O.W. Wilson, 1950s): rapid motorised patrol; fast response to emergency calls; detective follow-up investigation; use of technology; centralised command; standardised procedures; minimal community involvement. Performance measured by response times and arrest rates. Limitation: the Kansas City Preventive Patrol Study (1972) demonstrated that random motorised patrol has little measurable impact on crime rates. MAX WEBER'S THREE TYPES OF LEGITIMATE AUTHORITY: (1) Traditional Authority — based on customs, traditions, and historical precedent (e.g. hereditary monarchy); (2) Charismatic Authority — based on the personal qualities and magnetism of a leader; (3) Rational-Legal Authority — based on established rules, laws and procedures. Police authority in T&T derives from RATIONAL-LEGAL AUTHORITY — the Police Service Act, the Constitution, and the PSR provide the legal basis for all police powers.",
        elements:["TRADITIONAL MODEL (Wilson, 1950s): rapid motorised patrol; fast response; detective investigation; centralised command; standardised procedures; minimal community involvement","Performance measured by: response times, arrest rates, crime statistics","Limitation: Kansas City Patrol Study (1972) showed random motorised patrol has little measurable impact on crime","WEBER — TRADITIONAL AUTHORITY: based on customs, traditions, and historical precedent","WEBER — CHARISMATIC AUTHORITY: based on personal qualities and magnetism of a leader","WEBER — RATIONAL-LEGAL AUTHORITY: based on established rules, laws, and procedures","T&T police authority = RATIONAL-LEGAL: grounded in Police Service Act, Constitution, and PSR"],
        plain_english:"When a police officer arrests someone, they do so because the law grants that power — not personal authority or the Commissioner's personal instruction. This is rational-legal authority. Weber's framework explains why police must follow prescribed legal procedures — their authority exists only within those legal limits.",
        test_question:"Describe the Traditional/Professional Model of policing and state ONE research-backed limitation. Explain Weber's three types of legitimate authority. Which type underpins police authority in Trinidad and Tobago and why?" }
    ]
  },
  { id:"strategic_plan", icon:"📋", color:"#4A90D9", title:"TTPS Strategic Plan 2025-2027 and Operating Plan 2026, Planning and Governance",
    overview:"The TTPS Strategic Plan 2025-2027 (themed 'Protecting our Future through Professionalism, Passion and Partnership') is the current official roadmap guiding the organisation. The TTPS Operating Plan 2026 is the one-year tactical plan that converts the strategic plan into measurable annual targets. Every sergeant must know the Vision, Mission, Motto, Mandate, P.R.I.D.E. core values, the four strategic pillars, planning types, and inter-agency collaboration. Quote the four pillars verbatim — mixing in the old five-pillar plan is a common way to lose marks.",
    units:[
      { uid:"SP_001", topic:"TTPS Vision, Mission, Motto, Mandate and P.R.I.D.E. Core Values (2025-2027 Plan)",
        raw:"VISION: To make every place in Trinidad and Tobago safe. MISSION: In partnership with the citizens of Trinidad and Tobago, we provide for safe and secure communities and other places through professional policing, focused leadership and consistent, high quality service. MOTTO: To protect and serve with P.R.I.D.E. MANDATE (six statutory responsibilities): (i) Maintain law and order; (ii) Preserve peace; (iii) Protect life and property; (iv) Prevent and detect crime; (v) Apprehend offenders; (vi) Enforce all laws and regulations with which the Service is charged. CORE VALUES — P.R.I.D.E.: Professionalism (efficient, diligent, thorough, informed performance of duties; humble, kind, empathetic and considerate when interacting with customers); Respect (courtesy, tolerance and sensitivity to everyone); Integrity (highest ethical standards, honest, objective, equitable, doing what is right because it is right); Dignity (protect human dignity and uphold the rights of all persons); Excellence (commitment, communication, learning, mentoring, teamwork and effective strategies in every service).",
        elements:["VISION: To make every place in Trinidad and Tobago safe","MISSION: In partnership with the citizens of Trinidad and Tobago, we provide for safe and secure communities and other places through professional policing, focused leadership and consistent, high quality service","MOTTO: To protect and serve with P.R.I.D.E.","MANDATE — six responsibilities: maintain law and order; preserve peace; protect life and property; prevent and detect crime; apprehend offenders; enforce laws and regulations","P — PROFESSIONALISM: efficient, diligent, thorough and informed performance of duties","R — RESPECT: courtesy, tolerance and sensitivity to everyone","I — INTEGRITY: highest ethical standards; doing what is right because it is right","D — DIGNITY: protect human dignity and uphold the rights of all persons","E — EXCELLENCE: commitment, learning, mentoring, teamwork and effective strategies","NOTE: P.R.I.D.E. is the current core values acronym (2025-2027 Plan) — it replaced the older IPART set used in the 2020-2022 Plan"],
        plain_english:"Every sergeant must be able to state the Vision, Mission, Motto, Mandate and the five P.R.I.D.E. core values from memory — these are commonly tested. When briefing your team, dealing with the public, and making operational decisions, P.R.I.D.E. should guide your conduct. These are not aspirational slogans; they are the measured standards against which supervisor conduct is evaluated.",
        test_question:"State the current TTPS Vision, Mission and Motto in full. List the six elements of the TTPS Mandate. What does the acronym P.R.I.D.E. represent in the 2025-2027 Strategic Plan? Why are these core values important for a sergeant?" },
      { uid:"SP_002", topic:"The Four Strategic Pillars (2025-2027) and Types of Planning",
        raw:"The TTPS Strategic Plan 2025-2027 is built on FOUR strategic pillars (also called strategic priorities or strategic interdependent goals): PILLAR 1 — COMMUNITY PARTNERSHIPS: building mutual trust and respect; co-production of public safety with citizens, NGOs, schools and businesses. PILLAR 2 — ORGANISATIONAL DEVELOPMENT: improving systems, structures, processes, training and institutional capacity of the TTPS. PILLAR 3 — OPERATIONAL EXCELLENCE: improving the efficiency, effectiveness and overall performance of policing operations. PILLAR 4 — PUBLIC SAFETY: protecting persons and property and reducing crime, fear of crime and disorder. The Plan delivers 18 outcomes across these four pillars and is themed 'Protecting our Future through Professionalism, Passion and Partnership'. NOTE FOR EXAMINATIONS: the previous (2020-2022) plan had FIVE pillars — Community Partnerships, Public Safety, Operational Excellence, ICT, and Occupational Health and Safety. The current plan has FOUR. TYPES OF PLANNING: STRATEGIC PLANNING — long-term direction, typically 3-5 years (e.g. the TTPS Strategic Plan 2025-2027 itself); TACTICAL PLANNING — medium-term, approximately 1 year, aligned to the strategic plan (e.g. the TTPS Operating Plan 2026 or an annual divisional crime reduction plan); OPERATIONAL PLANNING — short-term, daily or weekly (e.g. shift briefings, patrol plans, crime scene management plans, event management plans).",
        elements:["FOUR strategic pillars (2025-2027), 18 outcomes total","PILLAR 1 — COMMUNITY PARTNERSHIPS: build trust; co-produce public safety with citizens, NGOs, schools and businesses","PILLAR 2 — ORGANISATIONAL DEVELOPMENT: improve systems, structures, processes, training and institutional capacity","PILLAR 3 — OPERATIONAL EXCELLENCE: improve efficiency, effectiveness and overall performance of policing operations","PILLAR 4 — PUBLIC SAFETY: protect persons and property; reduce crime, fear of crime and disorder","Theme: 'Protecting our Future through Professionalism, Passion and Partnership'","Previous (2020-2022) plan had FIVE pillars — Community Partnerships, Public Safety, Operational Excellence, ICT, Occupational Health & Safety","STRATEGIC PLANNING: long-term direction 3-5 years (e.g. TTPS Strategic Plan 2025-2027)","TACTICAL PLANNING: medium-term ~1 year aligned to strategic plan (e.g. TTPS Operating Plan 2026, annual divisional plan)","OPERATIONAL PLANNING: short-term daily/weekly (e.g. shift briefings, patrol plans, event management)"],
        plain_english:"A sergeant contributes to the Strategic Plan every day: building trust at community meetings (Pillar 1 — Community Partnerships), supporting officer training and development (Pillar 2 — Organisational Development), running tight, evidence-led briefings and accurate reporting (Pillar 3 — Operational Excellence), and deploying patrols on hot-spots to reduce crime and fear of crime (Pillar 4 — Public Safety). If asked to name FIVE pillars in 2025+, you'll be marked wrong — the current plan has FOUR.",
        test_question:"Identify and explain the FOUR strategic pillars of the TTPS Strategic Plan 2025-2027 and state its theme. Distinguish clearly between strategic, tactical and operational planning, and give a current TTPS example of each level." },
      { uid:"SP_003", topic:"Inter-Agency Collaboration in Policing",
        raw:"Inter-Agency Collaboration refers to the cooperative working relationships between the TTPS and other government agencies and community organisations to address complex social problems that cannot be solved by police action alone. KEY PARTNER AGENCIES: Ministry of Social Development and Family Services; Children's Authority of Trinidad and Tobago; Office of Disaster Preparedness and Management (ODPM); T&T Fire Service; Immigration Division; Customs and Excise Division; NGOs; schools; community organisations. MECHANISMS: joint operations; information sharing protocols (with confidentiality safeguards); referral pathways to appropriate social services; Memoranda of Understanding (MoUs) formalising relationships; Community Safety Partnerships. ESSAY TOPIC: inter-agency collaboration is a key essay topic for the sergeant examination.",
        elements:["Definition: cooperative working between TTPS and other agencies to address complex social problems police cannot solve alone","Key agencies: Ministry of Social Development, Children's Authority, ODPM, T&T Fire Service, Immigration, Customs, NGOs, schools","Mechanisms: joint operations; information sharing protocols; referral pathways; MoUs; Community Safety Partnerships","Issues requiring collaboration: domestic violence, child abuse, mental health crises, drug addiction, missing persons, natural disasters","Collaboration does NOT mean police abdicate primary responsibility for public safety","Key examination topic — likely to appear as an essay question"],
        plain_english:"Some of the most complex problems police face — domestic violence, child abuse, mental health crises, drug addiction — cannot be solved by arrest alone. A sergeant who knows how to refer cases to the Children's Authority, work alongside social workers, and coordinate with ODPM during disasters creates far better outcomes for the community than one who only knows how to charge offenders.",
        test_question:"Define inter-agency collaboration in policing. Name THREE agencies the TTPS collaborates with. State the nature of each collaboration and explain why inter-agency collaboration is essential for effective policing." },
      { uid:"SP_004", topic:"TTPS Operating Plan 2026 — Tactical Implementation of the Strategic Plan",
        raw:"The TTPS Operating Plan 2026 expands on the action items outlined in the TTPS Strategic Plan 2025-2027 by clearly defining OPERATIONAL TARGETS for a one-year period and identifying those charged with FUNCTIONAL RESPONSIBILITY for achieving them. It is the second-year tactical plan of the three-year strategic planning cycle. The Operating Plan 2026 is structured around the same FOUR Strategic Priority Areas as the parent Strategic Plan: (i) Community Partnership; (ii) Organisational Development; (iii) Operational Excellence; (iv) Public Safety. For EACH priority area the Operating Plan sets: specific OUTCOMES, KEY PERFORMANCE INDICATORS (KPIs) for 2026, PRIORITY ACTION ITEMS, RESPONSIBLE OFFICERS, and TARGET DATES. RELATIONSHIP TO STRATEGIC PLAN: the Strategic Plan 2025-2027 sets the long-term direction (3 years); the Operating Plan 2026 converts that direction into measurable annual targets (1 year); divisional and station plans then convert annual targets into shift-level operational plans (daily/weekly). This is the textbook strategic→tactical→operational planning cascade.",
        elements:["The Operating Plan 2026 is the SECOND-YEAR tactical plan of the 2025-2027 Strategic Plan cycle","It expands strategic action items into 1-year operational targets with named responsible officers and target dates","Structured around the SAME four Strategic Priority Areas as the parent plan (Community Partnership, Organisational Development, Operational Excellence, Public Safety)","Each priority has: outcomes; Key Performance Indicators (KPIs) for 2026; priority action items; responsible officers; target dates","Demonstrates the strategic (3-yr) → tactical (1-yr Operating Plan) → operational (daily/weekly station and shift plans) cascade","KPIs allow Executive and Parliament to hold the TTPS publicly accountable for measurable annual results","Sergeants implement Operating Plan targets at station and section level through shift briefings and patrol planning"],
        plain_english:"Think of the cascade like this: the Strategic Plan 2025-2027 says 'we will reduce serious crime'. The Operating Plan 2026 turns that into 'reduce serious crime by X% in 2026, with the Director of Operations responsible, measured monthly'. The Divisional Commander then turns that into 'reduce robberies in the Northern Division by Y% this quarter'. The sergeant turns that into 'two foot patrols on Charlotte Street between 18:00–22:00 every night this week'. That whole chain is the planning cascade — and the sergeant is the bottom link that actually makes it happen.",
        test_question:"What is the TTPS Operating Plan 2026 and how does it relate to the TTPS Strategic Plan 2025-2027? Explain the strategic → tactical → operational planning cascade with TTPS examples at each level. Why are KPIs and named responsible officers important?" }
    ]
  },
  { id:"performance", icon:"📊", color:"#38C172", title:"Performance, Work-Life Balance and Organisational Dynamics",
    overview:"This module covers evaluating police performance, change management, work-life balance for police officers, and understanding how individuals and groups function within the police organisation. Stress signals in a team (silence, cynicism, attendance spikes) are as examinable as textbook definitions.",
    units:[
      { uid:"PERF_001", topic:"Work-Life Balance in Policing",
        raw:"Work-life balance is the equilibrium between an individual's professional responsibilities and their personal and family life. Specific challenges for police officers: irregular and rotating shift patterns disrupting family life and sleep; exposure to traumatic incidents (violent crime, accidents, sudden death) creating psychological stress; the 'always on' duty culture creating pressure never to fully disengage; limited downtime during peak operational periods such as Carnival and major crime spikes; public criticism and media scrutiny. Consequences of chronic poor work-life balance: physical illness, burnout, poor judgement, absenteeism, increased disciplinary issues, and high personnel turnover. SUPERVISORY RESPONSIBILITIES: sergeants must monitor their team for early signs of stress and burnout; create a psychologically safe environment where officers feel comfortable disclosing difficulties; ensure officers take their legally entitled leave; facilitate access to Employee Assistance Programmes (EAPs) and professional counselling.",
        elements:["Specific policing challenges: irregular shifts, trauma exposure, always-on culture, limited downtime during Carnival/crime spikes, public scrutiny","Consequences of chronic poor balance: physical illness, burnout, poor judgement, absenteeism, disciplinary issues, high turnover","Protective strategies: regular exercise; adequate sleep; maintaining family and social relationships; psychological debriefing after traumatic incidents","Supervisory responsibilities: monitor team for signs of stress and burnout; create psychologically safe environment; ensure entitled leave is taken","EAPs: Employee Assistance Programmes — sergeants must know how to facilitate access to professional counselling","A burnt-out officer makes poor decisions and is a risk to the public, the Service, and themselves"],
        plain_english:"A burnt-out officer makes poor decisions, uses excessive force, and is a liability to the Service. A sergeant who ensures their team takes their rest days, monitors for signs of stress, and creates an environment where officers feel safe to admit they are struggling is investing in operational effectiveness — not just personal welfare.",
        test_question:"Why is work-life balance particularly challenging for police officers? What specific responsibilities does a sergeant have in supporting the psychological well-being and work-life balance of officers under their command?" },
      { uid:"PERF_002", topic:"Individuals and Groups in the Police Organisation",
        raw:"FORMAL GROUPS: officially established by the organisation with defined roles, responsibilities, and official reporting lines. Examples: patrol sections, detective units, specialist branches. INFORMAL GROUPS: emerge naturally from social interaction based on shared interests, common background, or friendship. They have no official standing but can significantly support or undermine formal authority and organisational culture. GROUP DYNAMICS: group norms (unwritten rules of behaviour that members are expected to follow); group cohesion (strength of bonds within the group); groupthink (pressure to conform and suppress dissenting views — particularly dangerous in policing as it can lead to poor decisions and misconduct going unchallenged). ORGANISATIONAL CULTURE: the shared values, beliefs, and practices that characterise the organisation — 'the way things are done here'. Culture can be a significant barrier to reform or a powerful driver of excellence.",
        elements:["FORMAL GROUPS: officially established with defined roles and reporting lines — patrol sections, detective units, specialist branches","INFORMAL GROUPS: emerge naturally from social interaction — can support or undermine formal authority and culture","GROUP NORMS: unwritten rules of behaviour that members are expected to follow within a group","GROUP COHESION: strength of bonds within the group — high cohesion can be positive or negative","GROUPTHINK: pressure to conform; suppressing dissenting views — particularly dangerous in policing; can lead to poor decisions and unchallenged misconduct","ORGANISATIONAL CULTURE: shared values, beliefs, and practices — the way things are done here; can enable or impede reform"],
        plain_english:"Every station has informal groups — officers who eat together, socialise together, and share information with each other before it reaches the sergeant. A skilled sergeant understands these informal networks and uses them constructively rather than trying to suppress them. Groupthink is the dangerous side: where officers cover for each other and bad practices go unchallenged.",
        test_question:"Distinguish between formal and informal groups in a police organisation. What is 'groupthink' and why is it particularly dangerous in a policing context? What can a sergeant do to prevent groupthink in their team?" }
    ]
  }
];
 
const EXAM_TIPS = {
  mcq:{ title:"Multiple Choice (MCQ)", icon:"☑️", color:"#4A90D9",
    tips:["Read the entire question carefully before looking at the answer options — do not assume you know the question","Eliminate the TWO most obviously wrong answers first — this improves your probability significantly","Focus on exactly what is being asked — not what you think the general topic is about","ABSOLUTE qualifier words (all, always, never, only, must, every) in a statement are rarely correct","RELATIVE qualifier words (usually, generally, sometimes, often, seldom) in a statement are more likely to be correct","If two options look very similar, one of them is likely the correct answer — read carefully","Your first instinct is usually right — only change an answer if you have a definite, specific reason to do so","Never leave a MCQ blank — eliminate options and make your best selection","When stems quote S.O. or PSR numbers, re-read the exact subsection — distractors often swap time limits or ranks"] },
  tf:{ title:"True or False", icon:"✅", color:"#38C172",
    tips:["ABSOLUTE terms (Never, Always, Only, Must, Every, All) → the statement is almost certainly FALSE","RELATIVE terms (Often, Seldom, Sometimes, Generally, Usually) → the statement is more likely TRUE","A statement is FALSE if ANY part of it is incorrect — even one wrong word makes the whole statement false","Look for hidden qualifier words buried deep in a long statement before deciding","Statements that closely and precisely match the exact wording of Standing Orders or Regulations are often TRUE","If a statement sounds extreme, sweeping, or absolute in its claim, it is probably FALSE","Underline the operative verb (shall/may/must not) — changing one modal word flips the legal meaning"] },
  essay:{ title:"Essay Questions", icon:"✍️", color:"#E8A838",
    tips:["ANALYSE the question carefully before you write a single word — identify exactly what is being asked","STRUCTURE every essay: Introduction, Body paragraphs, Conclusion — never skip the introduction","Introduction: briefly state what the essay will cover and define key terms used","Body: develop your answer logically — one main idea per paragraph with supporting detail","Conclusion: summarise your main points concisely and explicitly link back to the question","QUOTE AUTHORITY: cite specific Acts, Standing Orders, PSR regulations, and section numbers — examiners reward this","For management topics: always name the theorist and the year (e.g. Maslow, 1943; McGregor, 1960; Herzberg, 1959)","Use specific TTPS policing examples to ground your answer in operational context","Write clearly and legibly — examiners cannot award marks for what they cannot read or decipher","Leave time at the end to re-read, correct, and improve your work","Allocate marks to paragraphs — a 25-mark question expects roughly 25 distinct points or analytical steps"] }
};
 
function mgmtContext(topic) {
  const units = topic.units.map(function(u) {
    return "[" + u.uid + "] " + u.topic + "\nSOURCE: " + u.raw + "\nKEY ELEMENTS: " + u.elements.join("; ");
  }).join("\n\n");
  return topic.title + "\n\n" + topic.overview + "\n\n" + units;
}
 
/* ══════════════════════════════════════════════════════════════
   LEGISLATION — Schema per unit: uid · topic · raw (statutory text)
                 · elements · cross_refs
   Acts: Bail Act Chap.4:60 · Judges Rules 1964 · SOA Chap.11:02
         (incl. Act No.13 of 2025) · Criminal Procedure Rules 2023
         · Larceny Act Chap.11:12
══════════════════════════════════════════════════════════════ */
const LEGISLATION = [
  { id:"bail", icon:"⚖️", color:"#E05555", title:"Bail Act — Chap. 4:60", subtitle:"Act 18 of 1994 as amended by Act No. 11 of 2024",
    overview:"The Bail Act governs the release of accused persons from custody pending trial. It defines who is eligible for bail, the circumstances in which bail may be denied, conditions that may be attached, and the consequences of breaching bail. The Bail Amendment Act 2024 (Act No. 11 of 2024) removed the absolute bar on bail for murder. Station-level bail under S.O. 10 must still align with these statutory restrictions — a Sergeant cannot invent wider powers than the Act gives.",
    units:[
      { uid:"BAIL_S3", topic:"s.3 — Key Definitions",
        raw:"bail in criminal proceedings: bail grantable in or in connection with proceedings for an offence to a person accused or convicted of the offence, or to a person under arrest for whose arrest a warrant has been issued. child: a person under the age of 14 years. young person: a person who has attained 14 years and is under 16 years. Court: includes a Judge, Magistrate, Justice of the Peace or Coroner. surrender to custody: surrendering into the custody of the Court or police officer in accordance with bail conditions at the time and place appointed.",
        elements:["Child: UNDER 14 years — not under 18 as in some other Acts","Young person: 14 years and UNDER 16 years","Court: broadly defined — includes Justice of the Peace (which is why a Sergeant can process bail at the station for summary offences)","Bail covers: accused persons awaiting trial; convicted persons awaiting appeal; and persons under arrest"],
        cross_refs:["S.O. 10 — Criminal Prosecution and Process: Sergeant or above may grant bail at the station for summary offences","S.O. 38 — Charge Room: SDO enquires into the bona fide of every warrantless arrest and processes bail"] },
      { uid:"BAIL_S5", topic:"s.5 — Eligibility for Bail and the Schedule",
        raw:"s.5(1): Subject to s.5(2), a Court MAY grant bail to any person charged with any offence OTHER than an offence listed in Part I of the First Schedule. PART I offences (no bail historically): murder, treason, piracy, hijacking, offences carrying the death penalty. POST-2024 (Bail Amendment Act No. 11 of 2024 and Akili Charles v State [2022] UKPC 31): a Judge or Master MAY now grant bail even for murder where exceptional circumstances are demonstrated. s.5(2): For PART II offences — a Court SHALL NOT grant bail where the person has been convicted on THREE or more separate occasions of any such offence, unless on application to a Judge who is satisfied there is sufficient cause. PART II offences include: drug trafficking, firearms offences, rape, robbery, burglary, housebreaking, arson, receiving stolen goods, larceny of motor vehicle, perverting the course of justice, kidnapping for ransom. s.5(3): Only convictions within the last TEN years count for the three-conviction rule. 120-DAY RULE: if no evidence has been taken within 120 days of the charge being read, the person may apply to a Judge for bail even for restricted offences.",
        elements:["General rule: Court MAY grant bail for any offence subject to the exceptions in s.5(2) and the First Schedule","PART I — historically no bail: murder, treason, piracy, hijacking, death-penalty offences","POST-2024: murder no longer has an absolute no-bail rule — a Judge or Master may grant bail on exceptional circumstances (Act No. 11 of 2024; Akili Charles v State [2022] UKPC 31)","PART II offences: drug trafficking, firearms, rape, robbery, burglary, housebreaking, arson, receiving stolen goods, larceny of motor vehicle, perverting justice, kidnapping for ransom","THREE-CONVICTION RULE: 3 or more prior Part II convictions = Court SHALL NOT grant bail; only a Judge can grant on sufficient cause","10-YEAR LOOKBACK: only convictions within the last 10 years count for the three-conviction rule","120-DAY RULE: no evidence within 120 days of charge = person may apply to a Judge for bail even for restricted offences"],
        cross_refs:["S.O. 10 — Bail at station: types of bail available to Sergeant or above","S.O. 38 — Charge Room: SDO bail processing duties"] },
      { uid:"BAIL_S6", topic:"s.6 — Grounds for Refusing Bail",
        raw:"s.6(2): Where the offence is punishable with imprisonment, the Court has DISCRETION to REFUSE BAIL where the Court is satisfied that: (a)(i) the person will FAIL TO SURRENDER to custody; (ii) will COMMIT AN OFFENCE while on bail; (iii) will INTERFERE WITH WITNESSES or obstruct the course of justice; (b) should be kept in custody for OWN PROTECTION or welfare (for child or young person); (c) the accused is in custody pursuant to a COURT SENTENCE; (d) INSUFFICIENT INFORMATION to make a bail decision; (e) has been arrested under s.15 (breach of existing bail); (f) charged with an offence ALLEGED TO HAVE BEEN COMMITTED WHILE ON BAIL; (g) the case has been ADJOURNED FOR INQUIRIES OR A REPORT and it would be impracticable to complete the inquiry without keeping the accused in custody. s.6(3): Factors the Court MUST CONSIDER: (a) nature and seriousness of the offence and probable method of dealing with the defendant; (b) character, antecedents, associations, and community ties of the defendant; (c) defendant's record with respect to previous grants of bail; (d) strength of the evidence; (e) any other relevant factor.",
        elements:["7 GROUNDS FOR REFUSAL under s.6(2): flight risk; likely offending on bail; interfering with witnesses; own protection; serving sentence; insufficient information; prior bail breach; offending while on bail; inquiry adjournment","5 MANDATORY FACTORS under s.6(3): seriousness of offence and probable disposal; character, antecedents and community ties; previous bail record; strength of evidence; any other relevant matter"],
        cross_refs:["S.O. 10 — Bail may be opposed where accused is likely to abscond, interfere with witnesses, or commit further offences","S.O. 38 — SDO ensures proper grounds for bail refusal are documented"] },
      { uid:"BAIL_S7", topic:"s.7 — Restrictions on Conditions of Bail",
        raw:"s.7(1): Where a defendant is GRANTED BAIL, bail conditions SHALL NOT be imposed unless it appears NECESSARY to do so: (a) for the purpose of preventing the occurrence of any of the events in s.6(2); OR (b) to enable inquiries or a report to be made into the defendant's physical or mental condition. Principle: conditions must be specifically tailored to the identified risk — they may not be imposed as a matter of routine.",
        elements:["PRINCIPLE OF NECESSITY: conditions may ONLY be imposed if necessary — they must not be imposed as a matter of routine","Two lawful purposes for conditions: (a) preventing s.6(2) events; OR (b) enabling medical or psychiatric inquiry","Applies to: initial grant of bail; varying existing conditions; imposing conditions on previously unconditional bail","Conditions must be proportionate and tailored to the specific identified risk"],
        cross_refs:["S.O. 10 — Common bail conditions: reporting to police station; surrender of passport; curfew; no contact with named persons; surety"] },
      { uid:"BAIL_S8", topic:"s.8 — Record of Bail Decision",
        raw:"s.8(1): Where a Court or police officer grants bail, refuses bail, appoints a time or place for surrender, or varies conditions — that Court or police officer SHALL MAKE A RECORD of the decision. Where requested by the person, a COPY of the record SHALL be given to them as soon as practicable. s.13(2): Failure to provide a copy of the record does NOT constitute reasonable cause for failing to surrender to custody.",
        elements:["Record is MANDATORY for every bail decision — grant, refusal, conditions imposed, time/place appointed, conditions varied","Copy of the record: must be given to the accused on request, as soon as practicable","Failure to receive a copy does NOT justify failing to surrender — s.13(2)","Both the charge book and Station Diary entry together satisfy this recording requirement"],
        cross_refs:["S.O. 17 — Station Diary: all occurrences including bail decisions must be recorded","S.O. 38 — Charge Room: all bail decisions recorded in the charge book"] },
      { uid:"BAIL_S9", topic:"s.9 — Reasons for Bail Decision (Magistrate's Court)",
        raw:"s.9(1): Where a Magistrate's Court: (a) grants bail over the objection of a police officer; (b) refuses bail; (c) imposes conditions on bail; or (d) varies the conditions of bail — the Magistrate SHALL STATE REASONS for the decision. s.9(2): The reasons must be included in the record of the decision. A copy of the reasons must be given to BOTH the police AND the accused.",
        elements:["Reasons are MANDATORY in 4 situations: granting bail over police objection; refusing bail; imposing conditions; varying conditions","Reasons must be recorded in the decision record","Copy given to: (1) the POLICE and (2) the ACCUSED — enabling both parties to assess whether to apply to the High Court","Police receiving the reasons allows them to assess whether to appeal a grant of bail"],
        cross_refs:["S.O. 38 — SDO must ensure accused is informed of their right to apply to the High Court for bail","Criminal Procedure Rules 2023 Rule 6.4 — accused's application to High Court after Summary Court bail decision"] },
      { uid:"BAIL_S12", topic:"s.12 — Conditions of Bail",
        raw:"s.12(1): A person granted bail SHALL SURRENDER TO CUSTODY at the time and place appointed. s.12(3): The Court may FURTHER REQUIRE: (a) surrender of passport or travel document; (b) inform the Court of any intention to leave the State; (c) report at specified times to any police station. s.12(4): Where it appears that the applicant is unlikely to remain in Trinidad and Tobago, security in the form of cash or property may be required before release. s.12(5): A parent or guardian may be required as surety for a child or young person.",
        elements:["Primary obligation: person granted bail MUST surrender to custody at the appointed time and place","Three standard conditions under s.12(3): (a) surrender of passport/travel documents; (b) notify Court of travel plans; (c) report to named police station at specified times","Security — cash or property — may be required where person unlikely to remain in T&T","Parent/guardian surety available and appropriate for children and young persons"],
        cross_refs:["S.O. 10 — Common bail conditions including reporting to police station","S.O. 17 — Station Diary: recording of bail compliance visits","S.O. 36 — Police supervisees also have mandatory reporting requirements at police stations"] },
      { uid:"BAIL_S15", topic:"s.15 — Arrest for Breach of Bail or Failure to Surrender",
        raw:"s.15(1): Where a person fails to surrender to custody at the appointed time, the Court may issue an ARREST WARRANT. s.15(3): A police officer may ARREST WITHOUT WARRANT where the officer has reasonable grounds to believe: (a) that the person is NOT LIKELY TO SURRENDER to custody; (b) that the person has COMMITTED or is about to COMMIT AN OFFENCE while on bail; (c) that the person has BROKEN or is LIKELY TO BREAK a bail condition; (d) a SURETY has notified a police officer IN WRITING that the person is unlikely to surrender to custody and the surety wishes to be relieved of their obligation. s.15(4): A person arrested under s.15 must be brought before a Magistrate WITHIN 24 HOURS or at the NEXT SITTING of the Court.",
        elements:["WARRANT ROUTE: Court issues arrest warrant where person fails to surrender to custody","WARRANTLESS ARREST — 4 grounds: (a) not likely to surrender; (b) committed/about to commit offence on bail; (c) broken/likely to break a bail condition; (d) written surety notification","Surety notification MUST be IN WRITING — an oral notification is insufficient to trigger this power","TIME LIMIT: person arrested under s.15 must be brought before a Magistrate within 24 HOURS or at the next Court sitting"],
        cross_refs:["S.O. 17 — Station Diary: all warrantless arrests must be recorded with grounds","S.O. 38 — SDO must enquire into the bona fide of every warrantless arrest and record the result"] },
      { uid:"BAIL_S16", topic:"s.16 — Bail with Surety",
        raw:"s.16(2): The Court SHALL consider the suitability of a proposed surety having regard to: (i) the surety's profession, occupation, trade or business; (ii) the surety's character and previous convictions, if any; (iii) the surety's proximity of kinship, place of residence, or other connection to the accused. The Court SHALL require the surety to make a STATUTORY DECLARATION in the form set out in the Second Schedule. s.16(3): Where no suitable surety is immediately available, the Court may fix the amount and the recognisance may be entered later before a Magistrate or Clerk of the Peace.",
        elements:["3 FACTORS FOR SURETY SUITABILITY: (i) profession/occupation/trade/business; (ii) character and previous convictions; (iii) proximity of kinship, residence, or connection to accused","Statutory declaration: mandatory — the surety must declare their assets and absence of disqualifying factors","Recognisance may be entered later before a Magistrate or Clerk of the Peace if no surety immediately available"],
        cross_refs:["S.O. 38 — Charge Room: processing persons released on surety; recording statutory declarations"] },
      { uid:"BAIL_SCH1", topic:"First Schedule — Specified Offences and the 120-Day Rule",
        raw:"PART I OF THE FIRST SCHEDULE (no bail historically; judicial discretion post-2024): murder, treason, piracy, hijacking, offences carrying the death penalty. PART II OF THE FIRST SCHEDULE (three-conviction rule applies): drug trafficking; trafficking in firearms or ammunition; rape and serious sexual offences; robbery with aggravation; burglary; housebreaking; arson; receiving stolen goods; larceny of a motor vehicle; perverting the course of justice; kidnapping for ransom. THE 120-DAY RULE: where a person is charged with a scheduled offence and no evidence has been taken within 120 days of the charge being read in Court, that person may apply to a JUDGE IN CHAMBERS for bail — even for a Part I or Part II offence. This rule requires the prosecution to diligently progress the case.",
        elements:["PART I: murder, treason, piracy, hijacking, death-penalty offences — judicial discretion post-Bail Amendment Act 2024","PART II: serious offences including drug trafficking, firearms, rape, robbery, burglary, housebreaking, arson, receiving, larceny of MV, perverting justice, kidnapping for ransom","THREE-CONVICTION RULE (Part II): Court SHALL NOT grant bail where person has 3+ prior Part II convictions — only a Judge can grant on sufficient cause","120-DAY RULE: no evidence within 120 days of charge = person may apply to a Judge for bail even for restricted offences","120-day clock: prosecution must diligently progress the case to prevent bail applications under this rule"],
        cross_refs:["s.5 Bail Act — Three-conviction rule and eligibility","s.15 Bail Act — Warrantless arrest for breach of bail"] }
    ]
  },
  { id:"judges_rules", icon:"📋", color:"#38C172", title:"Judges Rules and Administrative Directions", subtitle:"Adopted in T&T — Rules 1-7 and Children's Rules",
    overview:"The Judges' Rules are administrative directions (not rules of law) governing police officers' conduct when questioning persons and recording statements. First issued in England in 1912 and reissued in 1964. They are adopted in T&T through S.O. 32 and the PSR. Statements obtained in breach of the Rules may be excluded at the Court's discretion. In examinations, distinguish 'breach of Judges Rules' (admissibility fight) from 'breach of constitutional caution' (broader rights narrative).",
    units:[
      { uid:"JR_R1", topic:"Rule 1 — General Questioning at the Discovery Stage",
        raw:"When a police officer is trying to DISCOVER whether, or by whom, an offence has been committed, he is entitled to question ANY PERSON, whether suspected or not, from whom he thinks that useful information may be obtained. This is so whether or not the person in question has been taken into custody, so long as he has NOT been CHARGED with the offence and has NOT been INFORMED that he may be prosecuted for it.",
        elements:["Officers may question ANY person — suspected or not — at the investigative discovery stage","NO caution is required at this stage","Applies even if the person is in custody — provided they have NOT been charged and NOT been told they may be prosecuted","Purpose: general information-gathering at the investigative stage — NOT accusatory questioning","Once a person is charged or told they may be prosecuted, Rule 1 no longer applies — Rules 2 and 3 take over"],
        cross_refs:["S.O. 32 — Statement Recording: distinction between witness statements and statements under caution","S.O. 31 — Miscellaneous Reports: investigators must investigate all occurrences and report to OC"] },
      { uid:"JR_R2", topic:"Rule 2 — First Caution at the Suspicion Stage",
        raw:"Whenever a police officer has EVIDENCE WHICH WOULD AFFORD REASONABLE GROUNDS FOR SUSPECTING that a person has committed an offence, he shall CAUTION THAT PERSON or cause him to be cautioned BEFORE PUTTING TO HIM ANY QUESTIONS, or further questions, relating to that offence. The CAUTION shall be in the following words: 'You are not obliged to say anything unless you wish to do so, but what you say may be put into writing and given in evidence.'",
        elements:["TRIGGER: when officer has EVIDENCE affording REASONABLE GROUNDS FOR SUSPICION — not mere curiosity or hunch","Caution MUST be given BEFORE any further questioning on the offence","EXACT WORDING OF FIRST CAUTION: You are not obliged to say anything unless you wish to do so, but what you say may be put into writing and given in evidence","After caution, a written record must be kept of: time questioning began and ended; place; persons present"],
        cross_refs:["S.O. 32 — Statements Under Caution: exact wording of the caution must be administered, recorded, and signed","S.O. 16 — Pocket Diary: note the exact time caution was administered"] },
      { uid:"JR_R3", topic:"Rule 3 — Second Caution at the Charging Stage",
        raw:"Rule 3(a): Where a person is CHARGED WITH or INFORMED THAT HE MAY BE PROSECUTED for an offence, he shall be cautioned in the following words: 'Do you wish to say anything? You are not obliged to say anything unless you wish to do so, but whatever you say will be taken down in writing and may be given in evidence.' Rule 3(b): After the second caution, QUESTIONS relating to the offence SHALL NOT be put to the accused EXCEPT in the following circumstances: (i) where necessary to prevent or minimise harm or loss to any person or to the public; (ii) for the purpose of clearing up an ambiguity in a previous answer or statement; (iii) where it is in the interests of the accused person.",
        elements:["TRIGGER: person is CHARGED or told they MAY BE PROSECUTED","EXACT WORDING OF SECOND CAUTION: Do you wish to say anything? You are not obliged to say anything unless you wish to do so, but whatever you say will be taken down in writing and may be given in evidence","POST-CHARGE QUESTIONING: PROHIBITED as a general rule","THREE NARROW EXCEPTIONS: (i) prevent or minimise harm to any person or the public; (ii) clear up an ambiguity in something already said; (iii) in the interests of the accused"],
        cross_refs:["S.O. 32 — Standard Caution at the charge room matches Rule 3(a) wording exactly","S.O. 38 — Charge Room: charged persons must be cautioned immediately upon being formally charged"] },
      { uid:"JR_R4", topic:"Rule 4 — Written Statements After Caution",
        raw:"Rule 4(a): If the person WRITES THE STATEMENT THEMSELVES — the police officer shall invite them to do so but shall NOT at any stage SUGGEST WHAT TO WRITE, and before the person starts writing, the officer shall ask them to read the caution and sign it as true. Rule 4(b): If the person CANNOT READ OR WRITE or DOES NOT WISH TO WRITE — the police officer shall write the statement taking it down in the EXACT WORDS spoken by that person; shall read the statement over to that person; shall invite them to make any corrections, additions, or alterations; and shall ask them to sign or make their mark. The officer shall also certify in writing that the statement has been read to the person and that the person had the opportunity to make corrections, additions, or alterations.",
        elements:["TWO METHODS: person writes themselves OR officer writes from dictation","If PERSON WRITES: officer does NOT suggest content; officer asks person to read and sign the caution before starting","If OFFICER WRITES: EXACT WORDS of the person — no paraphrasing, tidying up, or grammatical corrections","Officer reads back the complete statement; offers corrections; person signs or makes their mark","Officer CERTIFIES in writing that statement was read back and corrections were offered — crucial for admissibility","Amendments must be initialled by the maker of the statement"],
        cross_refs:["S.O. 32 — Statement Recording: must record in exact words; read back; certify","S.O. 16 — Pocket Diary: entries made at or near the time of occurrence"] },
      { uid:"JR_R5", topic:"Rule 5 — Showing Statements or Documents to Persons in Custody",
        raw:"If at any time after a person has been taken into custody a police officer wishes to BRING TO THE NOTICE of that person any written statement made by another person, or the content of an exhibit or document, the officer shall hand it to that person or read it to him, but SHALL NOT question him about it. If the person wishes to MAKE A STATEMENT IN REPLY, the procedure set out in Rule 4 shall be followed.",
        elements:["Officer MAY show or read another person's statement or document to a suspect in custody","Officer MAY NOT question the suspect about it — showing is permitted; questioning about it is not","If the suspect voluntarily wishes to make a statement in reply — follow Rule 4 procedure to record their response properly","Purpose: fairness — accused must know what is alleged but cannot be subjected to further questioning about it"],
        cross_refs:["S.O. 32 — Types of Statements: the distinction between voluntary statements and formal statements under caution"] },
      { uid:"JR_R6", topic:"Rule 6 — Questioning Persons in Custody Not Yet Charged",
        raw:"Persons who are IN CUSTODY in connection with an offence but who have NOT been CHARGED with an offence may be questioned about the offence, provided that BEFORE any such questioning begins, the person must be CAUTIONED in accordance with Rule 2.",
        elements:["Applies to: persons detained at the station — in custody but NOT yet formally charged with the offence","Pre-charge questioning IS permitted — but ONLY after the Rule 2 caution is first administered","This is the most common pre-charge interview scenario — the detained, uncharged suspect being interviewed under Rule 2 caution","Once the person is charged, Rule 3(b) restrictions immediately apply"],
        cross_refs:["PSR Reg 107 — prisoner is entitled to retain and instruct a legal adviser without delay","S.O. 38 — accused must be informed of right to retain a legal adviser on arrival at the station"] },
      { uid:"JR_R7", topic:"Rule 7 — Questioning Persons Attending on Police Bail",
        raw:"A prisoner who is at a police station in answer to BAIL GRANTED BY THE POLICE, or in answer to a NOTICE to report, who is still under investigation and has NOT yet been charged or told he may be prosecuted, may be questioned about the matter under investigation, provided he has been CAUTIONED in accordance with Rule 2. A WRITTEN RECORD must be kept of the TIME at which and the PLACE at which questioning began and ended, and of the PERSONS PRESENT during the questioning.",
        elements:["Applies to: persons attending the station on police bail or a notice to report — still under investigation","Rule 2 caution MUST be administered before any questioning begins","Person must NOT yet have been charged or told they may be prosecuted for this rule to apply","WRITTEN RECORD REQUIRED: time questioning began; time questioning ended; place of questioning; all persons present","This record is admissible evidence and must be accurate and contemporaneous"],
        cross_refs:["S.O. 17 — Station Diary: all occurrences including interview details must be recorded","S.O. 16 — Pocket Diary: entries made at or near the time of occurrence"] },
      { uid:"JR_CHILDREN", topic:"Children's Judges Rules — Questioning Persons Under 17",
        raw:"Administrative Direction: Where a person under 17 years of age is cautioned, charged, or questioned regarding an offence, the questioning shall NOT take place and no statement shall be taken from that person unless a PARENT OR GUARDIAN is present, or in their absence, some person who is NOT a police officer and who is of the SAME SEX as the minor. EXCEPTIONS allowing questioning without parent or guardian: (a) the delay would be likely to CAUSE INTERFERENCE WITH EVIDENCE or the alerting of other persons suspected of having committed the offence; (b) the delay is likely to involve an UNJUSTIFIABLE RISK TO PUBLIC SAFETY; (c) it is IMPRACTICABLE to secure the attendance of such a person. In ALL cases where the exception is used, the REASON FOR THE ABSENCE of the parent or guardian must be recorded.",
        elements:["RULE: parent or guardian MUST be present when questioning any person under 17","ALTERNATIVE if parent unavailable: a responsible adult of the SAME SEX who is NOT a police officer","THREE NARROW EXCEPTIONS: (a) delay would interfere with evidence or alert accomplices; (b) delay causes unjustifiable risk to public safety; (c) impracticable to secure their attendance","RECORDING REQUIREMENT: whenever an exception is used, the REASON FOR THE ABSENCE of the parent/guardian MUST be recorded — failure to record this undermines admissibility","The exception must be genuine — it cannot be used to avoid the inconvenience of locating a parent"],
        cross_refs:["S.O. 32 — Statements: children — parent or guardian must be present; exceptional circumstances documented","S.O. 47 — Woman Police Bureau: matters affecting children and young persons","PSR Reg 105 — Children of a prisoner in custody"] }
    ]
  },
  { id:"soa_2025", icon:"📜", color:"#E8A838", title:"Summary Offences Act — Chap. 11:02 (incl. Amendment 2025)", subtitle:"Act 31 of 1921 as amended, including Act No. 13 of 2025",
    overview:"The Summary Offences Act covers minor criminal offences dealt with summarily in the Magistrate's Court. Proceedings must be commenced within 6 months of the alleged offence. The Act was significantly amended by Act No. 13 of 2025 (assented 16 December 2025) to overhaul the fireworks regime (ss. 99-101I) and amend the Evidence Act regarding digital video evidence. Sergeants should flag that 2025 fireworks provisions may appear in 'current law' questions — cross-check consolidated text before the exam.",
    units:[
      { uid:"SOA_CATS", topic:"ss.45-47 — Idle and Disorderly, Rogues and Vagabonds, Incorrigible Rogues",
        raw:"s.45 IDLE AND DISORDERLY PERSONS include: persons who beg in a public place; persons who sleep in a public place; persons who tell fortunes or purport to tell fortunes for reward; persons who fail to maintain a wife or child when capable of doing so. s.46 ROGUES AND VAGABONDS include: persons who beg by false pretence; persons found in possession of housebreaking implements without lawful excuse; persons who carry weapons for the purpose of committing an indictable offence (s.62 deems such persons rogues and vagabonds); persons who enter any enclosed area for an unlawful purpose; persons who commit an act of obscene exposure; persons engaged in unlawful gaming. s.47 INCORRIGIBLE ROGUES: a person previously convicted as a rogue and vagabond who is subsequently convicted again of any rogue and vagabond offence; OR a person convicted as a rogue and vagabond who VIOLENTLY RESISTS ARREST at the time of the rogue and vagabond offence.",
        elements:["THREE ASCENDING CATEGORIES: Idle and Disorderly (s.45) — Rogues and Vagabonds (s.46) — Incorrigible Rogues (s.47)","IDLE AND DISORDERLY (s.45): begging in a public place; sleeping rough; fortune telling for reward; non-maintenance of family","ROGUES AND VAGABONDS (s.46): housebreaking implements without excuse; weapons for criminal purpose (s.62); entering enclosed place unlawfully; obscene exposure; unlawful gaming","INCORRIGIBLE ROGUES (s.47): repeat rogue and vagabond conviction; OR violent resistance to arrest at time of rogue and vagabond offence","s.62: possession of any weapon with intent to commit an indictable offence = person is deemed a rogue and vagabond"],
        cross_refs:["S.O. 11 — Beat and Patrol: patrol officers deal with idle and disorderly persons on the beat","S.O. 38 — Charge Room: processing persons arrested for summary offences"] },
      { uid:"SOA_MEETINGS", topic:"ss.109-125 — Public Meetings and Public Marches",
        raw:"s.109: Any person wishing to hold a PUBLIC MEETING must give WRITTEN NOTICE to the Commissioner of Police AT LEAST 48 HOURS before the meeting. The notice must be SIGNED and must state: (a) the address of each person giving the notice; (b) the nature of the meeting; (c) the time, date, and place of the meeting. The Commissioner may PROHIBIT the meeting by giving written notice stating the reasons; the notice must be served on the organisers personally or at the address given. s.112: NO person may organise, lead, or take part in any PUBLIC MARCH unless a PERMIT has been issued by the Commissioner of Police. s.113: Application for a march permit must be submitted to the Commissioner stating the proposed route and time. s.114: Commissioner may GRANT the permit specifying the route, permitted times, and conditions; Commissioner may PROHIBIT a march where it would occasion a BREACH OF THE PEACE or PUBLIC DISORDER — reasons must be stated in writing. s.117: EXEMPTIONS — political meetings during election periods; and certain processions (religious, cultural, funeral) are exempt from s.109. s.123: Any person who carries an OFFENSIVE WEAPON at a public meeting or march without lawful authority is guilty of an offence. s.125: Leading, organising, or inciting others to take part in an UNAUTHORISED MARCH: fine of $4,000 AND imprisonment for 18 months.",
        elements:["PUBLIC MEETING: written notice to Commissioner at least 48 HOURS before — must state: organisers' addresses, nature of meeting, time, date, place","Commissioner may PROHIBIT the meeting — written reasons required — notice served personally or at given address","PUBLIC MARCH: PERMIT required from Commissioner — no permit = march is unlawful","Permit specifies: route, permitted times, and conditions; Commissioner may prohibit only where breach of peace or public disorder apprehended","Reasons for prohibition must be stated in writing in every case","s.117 EXEMPTIONS: political meetings during elections; religious, cultural, and funeral processions","s.123 OFFENSIVE WEAPONS at meetings: offence without lawful authority — arrest without warrant","s.125 LEADING/ORGANISING UNAUTHORISED MARCH: fine $4,000 AND 18 months imprisonment"],
        cross_refs:["S.O. 54 — Police Actions at Protests, Demonstrations, and Public Meetings","S.O. 11 — Beat and Patrol: crowd control is a mode of patrol duty"] },
      { uid:"SOA_LICENSED", topic:"ss.92-95 — Licensed Premises and the Role of Police",
        raw:"s.92(1): Any person who within the limits of any TOWN carries on any of the following specified trades or businesses WITHOUT A LICENCE commits an offence. Trades requiring a licence include: certain food and drink vendors, pawnbrokers, second-hand goods dealers, junk dealers, guides, dealers in animals, and other specified occupations. s.92(3): ONE MONTH's notice by public advertisement shall be given by the Magistrate of any application for a licence, stating the applicant's name and proposed location. s.94(1): A copy of EVERY APPLICATION for a licence under s.92 shall be sent to the Commissioner of Police, who shall cause an INVESTIGATION to be made. A police officer NOT BELOW THE RANK OF SERGEANT shall submit a REPORT to the Magistrate. The Commissioner MAY OPPOSE the grant of the licence at the hearing on any day within the period of the public advertisement.",
        elements:["Licence required: various trades in towns — vendors, pawnbrokers, second-hand dealers, junk dealers, guides, animal dealers, and other specified occupations","ONE MONTH public advertisement: Magistrate advertises every application — applicant's name and proposed location stated","Police investigation: EVERY application is investigated by the TTPS","REPORTING RANK: officer submitting report to Magistrate must be NOT BELOW THE RANK OF SERGEANT","Commissioner may oppose at the hearing on any day within the advertisement period","Grounds for police opposition: character of applicant, unsuitable location, public interest, prior offending, unfitness"],
        cross_refs:["S.O. 22 — Licensed Premises: 11 types of licences monitored by TTPS; Licensed Premises Register must be maintained at every station"] },
      { uid:"SOA_FIREWORKS", topic:"ss.99-101I — Fireworks Regime (Act No. 13 of 2025, assented 16 December 2025)",
        raw:"s.99: No person shall DISCHARGE any fireworks unless they hold a VALID PERMIT issued by the Commissioner of Police. An online permit application system may be established. s.100: A permit shall NOT be issued to a person under 18 years; must specify the type, amount, location, date, and time; is valid for those specifics ONLY; subject to other prescribed conditions. s.101: Permit holder must notify — AT LEAST 14 DAYS BEFORE the intended discharge — the following four bodies: (1) Fire Service; (2) Environmental Management Authority; (3) Civil Aviation Authority; (4) Municipal Corporation of the area. Notification must state: date/time; type; amount; location. s.101A: Permitted locations — own land OR private land with WRITTEN PERMISSION of the owner; prohibited in/on/onto any house, vehicle, or street; unsafe discharge prohibited; children may only discharge TOY FIREWORKS under direct adult supervision and control. s.101B: Discharge of fireworks PROHIBITED within HALF-MILE RADIUS of: (a) public hospital; (b) private hospital; (c) airport; (d) zoo; (e) registered animal shelter; (f) farm where animals are reared; (g) Forest Reserve; (h) National Park. s.101C: NO PERMIT NEEDED on: (a) a PUBLIC HOLIDAY — between 8:00pm and 9:00pm of that day only; (b) 31st DECEMBER — between 11:30pm and 12:30am of the next day only. s.101D: Police officer may issue a FIXED PENALTY NOTICE (FPN) for offences under ss.99-101C. FPN must be signed by the officer and must specify: date/time/place issued; offence section and particulars; time to pay; amount; Clerk's address; Court address; right to contest. s.101E: FPN payable within 28 DAYS; payment to the Clerk or electronically; payment discharges liability. s.101G: Where FPN is NOT paid, proceedings cannot be listed for hearing until 2 MONTHS after the last day the penalty was payable. s.6 of Act No. 13 of 2025 — EVIDENCE ACT AMENDMENT: video recordings made by means of a mobile phone, tablet, iPad, or other similar smart device are now ADMISSIBLE AS EVIDENCE.",
        elements:["GENERAL RULE: valid permit from Commissioner of Police required to discharge fireworks","PERMIT CONDITIONS: minimum age 18; specifies type, amount, location, date, time — valid for those specifics ONLY","14-DAY NOTIFICATION: permit holder must notify Fire Service, EMA, Civil Aviation Authority, and Municipal Corporation at least 14 days before","PERMITTED LOCATIONS: own land OR private land with WRITTEN owner permission","PROHIBITED: in/on/onto houses, vehicles, streets; unsafe discharge; children may use TOY FIREWORKS only under direct adult supervision","HALF-MILE EXCLUSION ZONE (8 locations): public hospital, private hospital, airport, zoo, registered animal shelter, farm with animals, Forest Reserve, National Park","NO PERMIT NEEDED: public holidays 8pm-9pm only; 31 December 11:30pm-12:30am only","FPN: signed by officer; payable within 28 DAYS; if unpaid, proceedings not listed until 2 MONTHS after payment deadline","EVIDENCE ACT s.12AG(2): mobile phone, tablet, iPad, smart device video recordings are now admissible as evidence"],
        cross_refs:["S.O. 55 — Government Powder Magazine: regulations governing the storage of explosive materials","Criminal Procedure Rules 2023 Rule 4.5 — requirements for summons; FPN procedure"] }
    ]
  },
  { id:"cpr2023", icon:"📑", color:"#4A90D9", title:"Criminal Procedure Rules 2023", subtitle:"Legal Notice No. 377 of 2023 — in force 12 December 2023",
    overview:"The Criminal Procedure Rules 2023 govern procedure for all criminal matters in both the Summary Court and the High Court. They came into force on 12 December 2023, revoking the 2016 Rules. The overriding objective is to deal with criminal matters JUSTLY. Key provisions for a sergeant: starting prosecutions, the 6-month limitation, bail, service of documents, and trial conduct. Case management directions now bite earlier — late disclosure from the station file can collapse a prosecution.",
    units:[
      { uid:"CPR_OBJ", topic:"Part 3 — The Overriding Objective (Rules 3.1-3.5)",
        raw:"Rule 3.1: The OVERRIDING OBJECTIVE is to deal with criminal matters JUSTLY. Rule 3.2: It is the duty of the Court and ALL parties and participants, at every stage of proceedings, to further the overriding objective. Rule 3.3: DEALING WITH A CRIMINAL MATTER JUSTLY includes: (a) dealing with the prosecution and the defence fairly; (b) ensuring the protection of all the rights of an accused person; (c) considering the interests of the accused, witnesses, victims and jurors; (d) dealing with the matter efficiently and expeditiously; (e) ensuring that appropriate information is available to the Court, particularly when bail or sentence is under consideration; (f) dealing with the matter in ways that take account of the gravity of the offence, the complexity of the issues, the consequences for the accused, and the needs of other matters. Rule 3.5: Each party shall ACTIVELY ASSIST the Court in fulfilling its duty — whether or not the Court has made a direction. Participants must immediately inform the Court of any significant failure to comply with the Rules.",
        elements:["OVERRIDING OBJECTIVE: deal with criminal matters JUSTLY","6 COMPONENTS OF DEALING JUSTLY: (a) fairness to prosecution and defence; (b) protecting accused's rights; (c) considering interests of all participants; (d) efficiency and expedition; (e) appropriate information for Court, especially for bail/sentence; (f) proportionate resource allocation considering gravity, complexity, and consequences","ACTIVE DUTY: every party and participant must actively assist the Court — whether or not directed to do so","IMMEDIATE DISCLOSURE: participants must immediately inform the Court of any significant failure to comply"],
        cross_refs:["S.O. 10 — Criminal Prosecution and Process: police responsibilities in prosecuting matters","PSR Reg 193 — Types of police orders and their binding scope"] },
      { uid:"CPR_SUM", topic:"Part 4 — Summary Court Procedure (Rules 4.3-4.7)",
        raw:"Rule 4.3(4): For a summary-only offence, a complainant must file a complaint or information in the Court office NOT MORE THAN 6 MONTHS after the date of the alleged offence. Rule 4.4: A complaint or information must contain: (a) a STATEMENT OF THE OFFENCE in ordinary language that describes the offence and identifies any written law that creates it; (b) PARTICULARS OF THE CONDUCT constituting the commission of the offence. Rule 4.5: A SUMMONS must contain: (a) notice of when and where the accused is required to attend Court; (b) each offence in respect of which it is issued; (c) the Court and Court office that issued it. Rule 4.6: In exercising the power to remand for bail, the District Court Judge may grant a SINGLE ADJOURNMENT not exceeding TWO DAYS. Rule 4.7: The complainant must file and provide to the accused INITIAL DETAILS OF THE PROSECUTION CASE no later than the COMMENCEMENT OF THE FIRST HEARING.",
        elements:["6-MONTH LIMITATION: complaint for a summary-only offence must be filed within 6 MONTHS — after this the prosecution is time-barred","COMPLAINT/INFORMATION CONTENTS: ordinary language description of the offence + the written law identified + particulars of the conduct","SUMMONS CONTENTS: date/time/place accused must attend + each offence + Court that issued it","BAIL ADJOURNMENT: maximum ONE adjournment of up to 2 DAYS by District Court Judge","PROSECUTION DISCLOSURE: initial case details must be filed and served no later than commencement of the first hearing — no turning up to first hearing unprepared"],
        cross_refs:["S.O. 10 — Summons: must be served not less than 48 hours before the hearing; proof of service by affidavit returned to Court 24 hours before hearing"] },
      { uid:"CPR_SERVICE", topic:"Part 16 — Service of Documents (Rules 16.1-16.12)",
        raw:"Rule 16.1: PERSONAL SERVICE on an individual: handing the document to, or leaving it with, the person to be served. Service is deemed to be effected on the day it is handed to or left with the person. Rule 16.2: SERVICE ON A COMPANY: handing to a director, officer, receiver, or liquidator; OR by PREPAID POST to the registered office — deemed effected on the 14TH DAY from the date of posting. Rule 16.3: SERVICE ON A PERSON IN CUSTODY: handing to the KEEPER or a person designated by the Keeper — who must endorse with time and date of receipt, record it, and forward it promptly to the addressee. Rule 16.5: SERVICE BY ELECTRONIC MEANS: where person has given an electronic address and agreed to accept service electronically — deemed effected on the NEXT BUSINESS DAY after transmission. Rule 16.8: Documents that must be served by PERSONAL SERVICE ONLY: (a) complaints, summonses, or indictments; (b) Writs of Subpoena ad testificandum or duces tecum; (c) applications alleging contempt of Court; (d) notices requiring personal service by any enactment.",
        elements:["PERSONAL SERVICE: handing to OR leaving with the person — effective on that day","COMPANY BY POST: prepaid post to registered office — effective on the 14TH DAY from posting","PERSON IN CUSTODY: via Keeper — Keeper must endorse with time/date, record, and forward promptly to addressee","ELECTRONIC SERVICE: effective the NEXT BUSINESS DAY after transmission — only where person has agreed","FOUR CATEGORIES REQUIRING PERSONAL SERVICE ONLY: complaints/summonses/indictments; subpoenas; contempt applications; statutory notices"],
        cross_refs:["S.O. 10 — Summons: must be served not less than 48 hours before the hearing; proof of service = sworn affidavit returned to Court 24 hours before hearing"] }
    ]
  },
  { id:"larceny", icon:"🔓", color:"#9B72CF", title:"Larceny Act — Chap. 11:12", subtitle:"Act 10 of 1919 as amended",
    overview:"The Larceny Act governs theft and related property offences triable on indictment. It defines the essential elements of stealing, and creates specific offences for motor vehicle larceny, robbery, burglary, housebreaking, and receiving stolen goods. Petty larceny (property valued under $2,000) is handled under the Summary Offences Act. Essay answers should separate completed theft from inchoate stages and tie charges to Bail Act schedules where relevant.",
    units:[
      { uid:"LAR_S3", topic:"s.3 — Definition of Stealing (The 5 Elements)",
        raw:"A person STEALS who, without the consent of the owner, FRAUDULENTLY and WITHOUT A CLAIM OF RIGHT made in good faith, TAKES AND CARRIES AWAY anything capable of being stolen with intent at the time of the taking PERMANENTLY TO DEPRIVE the owner thereof. 'TAKES' includes obtaining possession: (i) by any TRICK; (ii) by INTIMIDATION; (iii) under a MISTAKE on the part of the owner with the taker's knowledge; (iv) by FINDING where the owner can be discovered by taking reasonable steps. 'CARRIES AWAY' includes any removal from the place it occupies — in the case of a thing attached to land, it must be completely detached. A bailee who converts bailed property to their own use with intent to permanently deprive is deemed to have stolen it.",
        elements:["FIVE ESSENTIAL ELEMENTS: (1) Taking; (2) Carrying away; (3) Without the owner's consent; (4) Fraudulently and without a claim of right made in good faith; (5) Intent to PERMANENTLY DEPRIVE the owner at the time of the taking","'TAKES' includes: by trick; by intimidation; under owner's mistake with taker's knowledge; by finding where owner discoverable","'CARRIES AWAY': any removal from original position — for attached items, must be COMPLETELY detached","Intent to permanently deprive MUST exist AT THE TIME OF TAKING — an intent formed after taking may not satisfy this element","A bailee who converts bailed property is deemed to have stolen it — the bailee's taking was with consent, but conversion without consent = theft"],
        cross_refs:["S.O. 28 — Classification of Crimes: larceny is a serious crime requiring CRO notification and full documentation","Bail Act First Schedule Part II — larceny of a motor vehicle is a specified Part II offence"] },
      { uid:"LAR_S4A", topic:"s.4A — Larceny of a Motor Vehicle",
        raw:"s.4A(1): Any person who: (a) STEALS a motor vehicle; (b) with intent to steal, REMOVES, OBLITERATES, DEFACES, TAMPERS WITH, or renders ILLEGIBLE or ALTERS the engine number or chassis number of a motor vehicle; (c) WITHOUT THE CONSENT of the owner, REPAINTS or ALTERS IN ANY WAY the appearance of a motor vehicle; (d) RECEIVES or is in POSSESSION of a motor vehicle KNOWING it to have been stolen — is liable: on SUMMARY CONVICTION: imprisonment for up to 10 YEARS; on CONVICTION ON INDICTMENT: imprisonment for up to 15 YEARS. These penalties override the normal summary court sentencing limits.",
        elements:["4 DISTINCT OFFENCES: (a) stealing a motor vehicle; (b) tampering with ID numbers with intent to steal; (c) repainting or altering appearance without consent; (d) receiving/possessing a stolen motor vehicle","SUMMARY CONVICTION: up to 10 YEARS imprisonment","CONVICTION ON INDICTMENT: up to 15 YEARS imprisonment","These penalties expressly override the normal summary court sentencing caps"],
        cross_refs:["S.O. 44 — Motor Vehicle and Road Traffic: all MV incidents documented; CRO notified of stolen vehicles","Bail Act First Schedule Part II — larceny of a motor vehicle is a specified Part II offence"] },
      { uid:"LAR_S24", topic:"s.24 — Robbery",
        raw:"s.24(1) AGGRAVATED ROBBERY: any person who, being ARMED WITH ANY OFFENSIVE WEAPON or instrument, OR being TOGETHER WITH ONE OR MORE OTHER PERSONS, ROBS or ASSAULTS WITH INTENT TO ROB any person; OR any person who ROBS any person and at the time or immediately BEFORE or AFTER uses PERSONAL VIOLENCE upon any person. Penalty: SUMMARY: up to 10 years; INDICTMENT: up to 15 years. s.24(2) SIMPLE ROBBERY: any person who robs another person without weapon, accomplices, or personal violence. Penalty: SUMMARY: up to 6 years; INDICTMENT: up to 10 years. s.24(3) ASSAULT WITH INTENT TO ROB: any person who assaults another with intent to rob but does not complete the robbery. Penalty: SUMMARY: up to 3 years; INDICTMENT: up to 5 years.",
        elements:["ROBBERY = larceny + personal force or threat of force applied to the person","AGGRAVATED ROBBERY s.24(1): armed with offensive weapon OR in company of others OR uses personal violence — up to 15 years on indictment","SIMPLE ROBBERY s.24(2): robs without weapon, accomplices, or personal violence — up to 10 years on indictment","ASSAULT WITH INTENT TO ROB s.24(3): assault without completing the robbery — up to 5 years on indictment","The distinction between aggravated and simple robbery determines the appropriate charge and maximum sentence available"],
        cross_refs:["Bail Act First Schedule Part III — robbery with aggravation is a specified violent offence","S.O. 28 — Robbery: serious crime requiring immediate reporting to OC and notification of CRO"] },
      { uid:"LAR_S27", topic:"s.27 — Burglary",
        raw:"s.27: Any person who IN THE NIGHT: (a) BREAKS AND ENTERS the DWELLING HOUSE of another with intent to commit any ARRESTABLE OFFENCE therein; OR (b) having entered a dwelling house, BREAKS OUT having committed or attempted to commit an arrestable offence therein — is guilty of BURGLARY and liable to imprisonment for FIFTEEN YEARS. 'NIGHT' under the Larceny Act means the period between 8:00pm and 5:00am.",
        elements:["BURGLARY requires ALL of these elements: (1) NIGHT-TIME (8pm-5am); (2) BREAKING AND ENTERING; (3) DWELLING HOUSE; (4) Intent to commit an arrestable offence therein","Also covers: breaking OUT after having committed or attempted to commit an arrestable offence inside a dwelling house","NIGHT = 8:00pm to 5:00am under the Larceny Act — this time definition is the CRITICAL distinction from housebreaking","DWELLING HOUSE: must be residential in nature — not a shop or warehouse alone","Maximum penalty: 15 YEARS imprisonment"],
        cross_refs:["s.28 Larceny Act — Housebreaking (no time restriction, much wider range of premises, lower maximum penalty)","S.O. 28 — Serious crime: immediate reporting to OC, notification of CRO, scene preservation"] },
      { uid:"LAR_S28", topic:"s.28 — Housebreaking",
        raw:"s.28: Any person who BREAKS AND ENTERS any dwelling house, schoolhouse, shop, warehouse, counting-house, office, store, garage, pavilion, factory, workshop, or any building belonging to the State or a local authority, AND COMMITS any ARRESTABLE OFFENCE therein; OR any person who BREAKS OUT of such premises having committed an arrestable offence therein — is liable to imprisonment for TEN YEARS. There is NO night-time requirement for housebreaking.",
        elements:["HOUSEBREAKING: breaking and entering + any of the listed premises + committing an arrestable offence inside","PREMISES COVERED (wider than burglary): dwelling house, schoolhouse, shop, warehouse, counting-house, office, store, garage, pavilion, factory, workshop, State/local authority buildings","NO TIME RESTRICTION: housebreaking can occur at any time of day or night","Maximum penalty: 10 YEARS imprisonment","KEY DIFFERENCES FROM BURGLARY: no night-time requirement; much wider range of premises covered; lower maximum penalty (10 vs 15 years)"],
        cross_refs:["s.27 Larceny Act — Burglary (requires night-time 8pm-5am; restricted to dwelling houses; higher maximum 15 years)","S.O. 28 — Serious crime requiring CRO notification and full scene documentation"] },
      { uid:"LAR_S35", topic:"s.35 — Receiving Stolen Property",
        raw:"s.35(1): Any person who RECEIVES any property KNOWING THE SAME TO HAVE BEEN STOLEN or obtained in any way whatsoever under circumstances which amount to an INDICTABLE OFFENCE is liable to imprisonment for TEN YEARS. s.35(3): A person may be INDICTED and CONVICTED of receiving whether or not the PRINCIPAL OFFENDER has been previously convicted, or is amenable to justice.",
        elements:["TWO ELEMENTS: (1) receiving property; (2) KNOWING it was stolen or obtained by an indictable offence","KNOWLEDGE is essential — mere suspicion, carelessness, or wilful blindness alone may not satisfy the element without more","Can be convicted even if the principal thief is never identified, arrested, charged, or convicted — s.35(3)","Maximum penalty: 10 YEARS imprisonment","RECENT POSSESSION DOCTRINE: recent unexplained possession of stolen property raises an inference of knowledge that the accused must rebut"],
        cross_refs:["Bail Act First Schedule Part II — receiving stolen goods is a specified Part II offence","S.O. 27 — Lost and Stolen Property: every station must maintain a Lost and Stolen Property Register"] }
    ]
  },

  /* ─────────────────────────  PARENT / CONSTITUTIONAL  ───────────────────────── */

  { id:"psa", icon:"🏛️", color:"#4A90D9", title:"Police Service Act — Chap. 15:01", subtitle:"As amended by Act No. 6 of 2006 and subsequent amendments",
    overview:"The Police Service Act is the PARENT STATUTE of the TTPS. It establishes the Service, defines its composition (First and Second Division), sets out the functions and powers of the Commissioner of Police, provides the legal basis for the Police Service Regulations 2007, and creates the framework for discipline, ranks, and operational command. Every Standing Order and every PSR regulation derives its authority from this Act read with sections 122 and 123 of the Constitution. For exam answers that must track the law as it stands today, always verify wording and amendments against the official Digital Legislative Library at laws.gov.tt (consolidated Acts and subsidiary legislation).",
    units:[
      { uid:"PSA_S4", topic:"s.4 — Establishment and Composition of the Service",
        raw:"There shall continue to be a Police Service for Trinidad and Tobago which shall be styled the Trinidad and Tobago Police Service. The Service consists of a FIRST DIVISION (officers from the rank of Assistant Superintendent and above, including the Commissioner and Deputy Commissioners) and a SECOND DIVISION (officers from the rank of Constable up to and including Inspector, plus Cadets and Trainees). The Service is a single, unified, hierarchical body operating under the command of the Commissioner of Police.",
        elements:["TTPS is established as a single Service by statute — not by tradition","FIRST DIVISION: ASP and above (ASP, Snr ASP, ACP, DCP, Commissioner)","SECOND DIVISION: Constable, Corporal, Sergeant, Inspector — plus Cadets and Trainees","Sergeant is the SENIOR NCO rank in the Second Division — the bridge between front-line and First Division","First Division appointments: by the President on the advice of the Police Service Commission","Second Division appointments and promotions: by the Commissioner of Police"],
        cross_refs:["Constitution s.122 — establishment of the Police Service Commission","Constitution s.123 — appointment of Commissioner and powers over Second Division","PSR Part I (Recruitment & Appointment) — derives authority from this Act"] },
      { uid:"PSA_COP", topic:"Powers and Functions of the Commissioner of Police",
        raw:"By force of section 123 of the Constitution and the Police Service Act, the Commissioner of Police has the COMPLETE POWER to manage the Service and is responsible for: (a) the efficient administration and operation of the Service; (b) the appointment, promotion, transfer, and discipline of officers in the Second Division; (c) the issuing of Standing Orders, Departmental Orders, and other Service instructions; (d) the deployment of personnel and resources; (e) the maintenance of public order and the prevention and detection of crime. The Commissioner reports to the Minister on policy matters but is INDEPENDENT in operational decision-making.",
        elements:["Source of power: Constitution s.123 + Police Service Act","COMPLETE POWER to manage the Service — no political direction in operational matters","Powers include: appointment, promotion, transfer, discipline of all Second Division officers","Issues Standing Orders, Departmental Orders, and Service instructions","Independent of the Minister in operational decisions; reports on policy only","May delegate functions in writing to senior officers — but ultimate responsibility remains"],
        cross_refs:["S.O. 2 — Police Service Orders: types and authority","PSR Reg 191 — communications to the Commissioner through the chain of command","Constitution s.123 — appointment by President on advice of Prime Minister after consultation with Leader of the Opposition"] },
      { uid:"PSA_FUNCTIONS", topic:"Functions of the Police Service",
        raw:"The general functions of the Service are: (a) the maintenance of LAW AND ORDER; (b) the PRESERVATION OF THE PEACE; (c) the PROTECTION OF LIFE AND PROPERTY; (d) the PREVENTION AND DETECTION OF CRIME; (e) the APPREHENSION OF OFFENDERS; (f) the ENFORCEMENT OF ALL LAWS AND REGULATIONS with which the Service is charged. Every officer takes an oath to discharge these functions impartially and in accordance with the law.",
        elements:["SIX core functions: maintain law and order; preserve the peace; protect life and property; prevent and detect crime; apprehend offenders; enforce the laws","'IMPARTIALLY and in accordance with the law' — the oath constraint","These functions ground every operational decision a sergeant makes","Functions are STATUTORY — they cannot be added to or limited by a Standing Order","Officer's authority is limited by the functions: acting outside them risks tort, criminal liability, and discipline"],
        cross_refs:["TTPS Strategic Plan 2025-2027 — the four pillars (Community Partnerships, Organisational Development, Operational Excellence, Public Safety) align to these statutory functions","TTPS Operating Plan 2026 — converts the four pillars into measurable annual targets","S.O. 11 — Beat and Patrol: operationalises preservation of the peace","S.O. 28 — Classification of Crimes: operationalises prevention and detection"] },
      { uid:"PSA_RANKS", topic:"Ranks and Chain of Command",
        raw:"The ranks within the Service in descending order are: Commissioner of Police; Deputy Commissioner of Police; Assistant Commissioner of Police; Senior Assistant Superintendent of Police; Assistant Superintendent of Police; Inspector; Sergeant; Corporal; Constable. Cadets and Trainees are admitted to the Service prior to substantive appointment as a Constable. Each rank has defined supervisory and command responsibilities. The chain of command is the route through which all official communication flows (PSR Reg 191).",
        elements:["First Division (ASP and above): CoP, DCP, ACP, Snr ASP, ASP","Second Division: Inspector, Sergeant, Corporal, Constable","SERGEANT: senior NCO; supervises Constables and Corporals; reports to Inspector","Pre-substantive: Cadets and Trainees","CHAIN OF COMMAND is statutory — not optional","Skipping the chain (e.g. directly contacting CoP) is a disciplinary matter under PSR Reg 191"],
        cross_refs:["PSR Reg 191 — communications to the Commissioner through the chain of command","S.O. 8 — Paying of Compliments: salute First Division Officers and Inspectors","S.O. 38 — Charge Room: SDO supervises Charge Room operations"] },
      { uid:"PSA_REGS", topic:"Power to Make Regulations — Source of the PSR 2007",
        raw:"The President, on the advice of the Police Service Commission, may make REGULATIONS for the good administration of the Service. Such regulations may provide for: recruitment and appointment; conditions of service; salary, allowances and increments; leave and medical benefits; uniform, equipment and arms; conduct and discipline; and any other matter necessary for the efficient functioning of the Service. The current regulations made under this power are the POLICE SERVICE REGULATIONS 2007 (Legal Notice 220 of 2007).",
        elements:["Regulations made by the PRESIDENT on the advice of the Police Service Commission","CURRENT regulations: Police Service Regulations 2007 (LN 220 of 2007) — 16 Parts, 200 regs","All Standing Orders must be CONSISTENT with these Regulations and with the Act","Regulations may be amended; Standing Orders may not contradict them","If a Standing Order is inconsistent with a Regulation, the Regulation prevails","If a Regulation is inconsistent with the Act, the Act prevails"],
        cross_refs:["PSR 2007 (in full) — made under this power","PSR Reg 193 — types of police orders and their binding scope","Constitution s.122-123 — establishes the Police Service Commission whose advice is required"] }
    ]
  },

  { id:"constitution", icon:"📜", color:"#E8A838", title:"Constitution of T&T — ss. 4 & 5", subtitle:"Constitution of the Republic of Trinidad and Tobago, 1976",
    overview:"The Constitution is the SUPREME LAW of Trinidad and Tobago. Sections 4 and 5 set out the fundamental human rights and freedoms recognised by the State, and the procedural protections that constrain how those rights may be limited. Every police power — to stop, search, arrest, detain, question, enter premises — is constrained by these provisions. A police officer who breaches s.4 or s.5 may render evidence inadmissible, expose the State to constitutional motion damages, and incur personal disciplinary or criminal liability. Mentioning ss.4–5 alone without the remedial route in s.14 is an incomplete answer.",
    units:[
      { uid:"CON_S4", topic:"s.4 — Recognition of Fundamental Human Rights and Freedoms",
        raw:"It is recognised and declared that in Trinidad and Tobago there have existed and shall continue to exist the following human rights and fundamental freedoms: (a) the right of the individual to LIFE, LIBERTY, SECURITY OF THE PERSON and ENJOYMENT OF PROPERTY, and the right not to be deprived thereof except by DUE PROCESS OF LAW; (b) the right to EQUALITY BEFORE THE LAW and the protection of the law; (c) the right to RESPECT FOR PRIVATE AND FAMILY LIFE; (d) the right of the individual to EQUALITY OF TREATMENT from any public authority in the exercise of any function; (e) the right to JOIN POLITICAL PARTIES and express political views; (f) the right of a parent to provide a school of his own choice for the education of his child; (g) FREEDOM OF MOVEMENT; (h) FREEDOM OF CONSCIENCE AND RELIGIOUS BELIEF; (i) FREEDOM OF THOUGHT AND EXPRESSION; (j) FREEDOM OF ASSOCIATION AND ASSEMBLY; (k) FREEDOM OF THE PRESS.",
        elements:["s.4(a): life, liberty, security, property — protected by DUE PROCESS","s.4(b): equality before the law and protection of the law","s.4(c): respect for private and family life — limits intrusive searches","s.4(d): equality of treatment from public authorities — anti-discrimination in policing","s.4(g): freedom of movement — limits arbitrary stops","s.4(i): freedom of expression — limits powers at protests","s.4(j): freedom of association and assembly — limits dispersal powers; ties to S.O. 54 / SOA ss.109-125"],
        cross_refs:["S.O. 54 — Police Actions at Protests, Demonstrations, and Public Meetings","Summary Offences Act ss.109-125 — meetings and marches","S.O. 38 — Charge Room: rights of arrested persons must be respected"] },
      { uid:"CON_S5", topic:"s.5 — Protection of Rights: Procedural Safeguards",
        raw:"Without prejudice to s.4, Parliament may not authorise or effect: (a) the arbitrary detention, imprisonment, or exile of any person; (b) the imposition of cruel and unusual treatment or punishment; (c) the deprivation of a person of the right to a FAIR HEARING in accordance with the principles of fundamental justice. Parliament may not deprive a person who has been ARRESTED OR DETAINED of: (i) the right to be INFORMED PROMPTLY and with sufficient particularity of the REASON for his arrest or detention; (ii) the right to RETAIN AND INSTRUCT a legal adviser without delay and to be informed of that right; (iii) the right to be brought PROMPTLY before an appropriate judicial authority; (iv) the right to APPLY for HABEAS CORPUS; (v) the right to the PRESUMPTION OF INNOCENCE until proved guilty; (vi) the right to REASONABLE BAIL without just cause; (vii) the right to AN INTERPRETER in proceedings.",
        elements:["s.5(2)(a): no arbitrary detention — every detention must have lawful authority","s.5(2)(b): no cruel and unusual treatment — limits use of force in custody","s.5(2)(c): right to fair hearing in accordance with fundamental justice","s.5(2)(h)(i): RIGHT TO BE INFORMED PROMPTLY of the reason for arrest","s.5(2)(h)(ii): RIGHT TO RETAIN AND INSTRUCT counsel WITHOUT DELAY — and to be told of this right","s.5(2)(h)(iii): right to be brought PROMPTLY before a judicial authority","s.5(2)(h)(iv): RIGHT TO HABEAS CORPUS","s.5(2)(h)(v): PRESUMPTION OF INNOCENCE","s.5(2)(h)(vi): right to REASONABLE BAIL without just cause","Failure to inform of these rights = breach of constitutional right; evidence may be excluded; State liable in damages"],
        cross_refs:["S.O. 38 — Charge Room: accused informed of right to retain a legal adviser on arrival","PSR Reg 107 — prisoner entitled to retain and instruct a legal adviser without delay","Bail Act s.5 + s.6 — operational implementation of the constitutional bail right","Judges Rules — caution requirement reflects the right to remain silent and presumption of innocence"] },
      { uid:"CON_S14", topic:"s.14 — Constitutional Motion for Redress",
        raw:"Where a person alleges that any of the provisions of sections 4 and 5 has been, is being, or is likely to be CONTRAVENED in relation to him, then, without prejudice to any other action with respect to the same matter that is lawfully available, that person may APPLY TO THE HIGH COURT for redress by way of originating motion. The High Court may make such ORDERS, ISSUE SUCH WRITS, and GIVE SUCH DIRECTIONS as it considers appropriate for enforcing or securing the enforcement of any of those provisions.",
        elements:["Any person alleging breach of s.4 or s.5 may apply DIRECTLY to the HIGH COURT","Application is by ORIGINATING MOTION","High Court may issue any orders, writs, or directions to enforce the right — including DAMAGES","'Without prejudice to any other action' — constitutional motion is in addition to civil/criminal remedies, not a substitute","An officer's unlawful conduct may expose the State to constitutional motion damages","Examples: unlawful arrest; unreasonable use of force; failure to inform of rights; unlawful entry/search"],
        cross_refs:["S.O. 38 — Charge Room duties exist to ensure constitutional rights are protected and recorded","PSR Reg 191 — formal communications and grievances","Police Complaints Authority Act — parallel oversight regime for misconduct"] }
    ]
  },

  { id:"pca", icon:"🛡️", color:"#E05555", title:"Police Complaints Authority Act — Chap. 15:05", subtitle:"Act No. 8 of 2006 establishing the Police Complaints Authority",
    overview:"The Police Complaints Authority (PCA) is the INDEPENDENT statutory body responsible for investigating criminal offences involving police officers, serious police misconduct, and corruption. It is structurally separate from the TTPS and reports to Parliament. The PCA does NOT replace internal discipline (which remains with the Commissioner under the PSR) but provides external civilian oversight where the Service itself is the subject-matter of the complaint. Every sergeant must understand the PCA's jurisdiction, the duty to cooperate, and the interaction with internal Professional Standards Bureau (PSB) investigations. Parallel PCA + PSB tracks can run — never advise officers to withhold cooperation pending 'internal only' clearance.",
    units:[
      { uid:"PCA_ESTAB", topic:"Establishment and Independence of the PCA",
        raw:"The Police Complaints Authority is established as a body corporate with PERPETUAL SUCCESSION and an OFFICIAL SEAL. The Authority consists of a Director and Deputy Director, both appointed by the President after consultation with the Prime Minister and the Leader of the Opposition. The Authority is INDEPENDENT in the performance of its functions and is not subject to the direction or control of any person or authority. The Authority reports annually to Parliament and may report on specific investigations as the Director considers necessary in the public interest.",
        elements:["Statutory body corporate — separate legal personality","Director and Deputy Director appointed by President after consultation with PM and Leader of the Opposition","INDEPENDENT — not subject to direction or control of any person or authority","Reports annually to Parliament — not to a Minister","Civilian-led — must operate at arm's length from the TTPS","Headquartered at facilities separate from any police station"],
        cross_refs:["S.O. 48 — Disciplinary Procedure & Complaints: complaints flow","PSR Reg 191 — communications to Commissioner; complaints route in parallel through PCA","Constitution s.4(d) — equality of treatment from public authorities"] },
      { uid:"PCA_JURIS", topic:"Jurisdiction — What the PCA Investigates",
        raw:"The PCA has jurisdiction to investigate: (a) CRIMINAL OFFENCES involving a police officer; (b) POLICE CORRUPTION; (c) SERIOUS POLICE MISCONDUCT; (d) any incident in which a person has been KILLED OR SERIOUSLY INJURED as a result of police action or while in police custody. The PCA may investigate of its own initiative or on a complaint by any member of the public. A complaint may be lodged directly with the PCA or with any police officer who must FORWARD IT to the PCA without delay. The PCA may direct the Commissioner to investigate a matter and report back, or it may conduct its own investigation.",
        elements:["FOUR jurisdictional grounds: (a) criminal offences by police; (b) corruption; (c) serious misconduct; (d) deaths or serious injuries from police action or in custody","PCA may act on complaint OR on its own initiative","Complaints may be lodged DIRECTLY with PCA OR with any police officer","Police officer receiving such a complaint MUST forward it to PCA without delay — failure is itself misconduct","PCA may CONDUCT its own investigation OR DIRECT the Commissioner to investigate and report back","Death or serious injury in custody triggers MANDATORY notification to PCA"],
        cross_refs:["S.O. 48 — Disciplinary Procedure & Complaints: every public complaint logged","S.O. 38 — Charge Room: any death or serious injury in custody must be reported up the chain AND to PCA","PSR Reg 99-113 — custody and care of prisoners; breaches may engage PCA jurisdiction"] },
      { uid:"PCA_DUTY", topic:"Duty of Police Officers to Cooperate",
        raw:"Every police officer has a STATUTORY DUTY to cooperate with a PCA investigation. This includes: (a) attending interviews when summoned; (b) producing documents, notebooks, occurrence reports, and any other records requested; (c) providing truthful answers; (d) preserving any scene or evidence relevant to a PCA investigation. Failure to cooperate is a DISCIPLINARY OFFENCE under the PSR and may also be an offence under the PCA Act. Obstruction of, or making a false statement to, a PCA investigator is a SEPARATE OFFENCE punishable on conviction by a fine and imprisonment.",
        elements:["STATUTORY DUTY of every officer to cooperate — not optional","Duty includes: attending interviews, producing records, providing truthful answers, preserving evidence","FAILURE TO COOPERATE = disciplinary offence under the PSR","OBSTRUCTION or false statement to PCA = separate criminal offence","Sergeants must ensure subordinates understand and comply with the duty","Records most often requested: Pocket Diary (S.O. 16), Station Diary (S.O. 17), Charge Book (S.O. 38), occurrence reports (S.O. 31)"],
        cross_refs:["S.O. 16 — Pocket Diary: contemporaneous record of every officer's activities","S.O. 17 — Station Diary: occurrence record","S.O. 31 — Miscellaneous Reports","S.O. 32 — Statements","S.O. 38 — Charge Room records"] },
      { uid:"PCA_OUTCOME", topic:"Outcomes of a PCA Investigation",
        raw:"At the conclusion of an investigation, the PCA may: (a) refer the matter to the DIRECTOR OF PUBLIC PROSECUTIONS for criminal prosecution where the evidence discloses an offence; (b) refer the matter to the COMMISSIONER OF POLICE for disciplinary action where the evidence discloses misconduct but not a criminal offence; (c) refer to any other appropriate authority (e.g. the Integrity Commission for matters of corruption); (d) make policy or systemic recommendations to the Commissioner aimed at preventing recurrence; (e) close the matter where the complaint is unsubstantiated. The PCA itself does NOT prosecute and does NOT impose discipline — it INVESTIGATES and REFERS.",
        elements:["PCA does NOT prosecute and does NOT discipline — its role is INVESTIGATE and REFER","FIVE possible outcomes: refer to DPP for prosecution; refer to CoP for discipline; refer to other authority; make systemic recommendations; close the matter","Referral to DPP triggers criminal prosecution under the relevant offence","Referral to CoP triggers PSR disciplinary procedure (Regs 151-174)","Systemic recommendations may result in revised Standing Orders or training requirements","PCA may publish reports on systemic issues — public accountability function"],
        cross_refs:["S.O. 48 — Disciplinary Procedure & Complaints","PSR Regs 151-174 — Disciplinary Procedure","Bail Act s.6 — bail considerations where officer is the accused"] }
    ]
  },

  /* ─────────────────────────  SUBSTANTIVE OFFENCE LAW  ───────────────────────── */

  { id:"dva", icon:"🏠", color:"#9B72CF", title:"Domestic Violence Act — Chap. 45:56", subtitle:"Act No. 27 of 1999 as amended by Act No. 6 of 2020",
    overview:"The Domestic Violence Act provides civil and criminal remedies for victims of domestic violence and confers SPECIAL POWERS on the police. The 2020 amendment significantly broadened the Act: it expanded covered relationships (including dating relationships and visiting relationships), expanded the definition of 'domestic violence' to include controlling and coercive behaviour, and strengthened police duties. Standing Order 53 (Domestic Violence) operationalises this Act for the TTPS. Sergeants are routinely called to incidents and must understand who is protected, what conduct is captured, the police powers of entry and arrest, the Protection Order regime, and the mandatory reporting obligations. Scene safety + evidence capture still must respect s.4 privacy rights when seizing phones or diaries.",
    units:[
      { uid:"DVA_DEFS", topic:"Key Definitions — Who is Protected and What is Domestic Violence",
        raw:"DOMESTIC VIOLENCE means: PHYSICAL ABUSE; SEXUAL ABUSE; EMOTIONAL OR PSYCHOLOGICAL ABUSE; FINANCIAL OR ECONOMIC ABUSE; INTIMIDATION; HARASSMENT; STALKING; MALICIOUS DAMAGE TO PROPERTY; THREATS; CONTROLLING OR COERCIVE BEHAVIOUR (added 2020); and any other behaviour that endangers the safety, health, or wellbeing of a person in a domestic relationship. A DOMESTIC RELATIONSHIP includes: spouses (married); cohabitants (living together); former spouses or former cohabitants; persons in a DATING or VISITING relationship; parent and child; siblings; persons related by blood, adoption, or affinity; persons sharing a household; and any person dependent on another in a domestic context.",
        elements:["DOMESTIC VIOLENCE captures FAR MORE than physical violence — includes emotional, financial, and coercive control","2020 amendment expressly added CONTROLLING AND COERCIVE BEHAVIOUR","DOMESTIC RELATIONSHIP includes DATING and VISITING relationships (not only marriage/cohabitation) — 2020 expansion","Includes: current and FORMER spouses/cohabitants","Includes parent/child, siblings, blood/adoption/affinity relations, and household members","Single incident is sufficient — no requirement of a 'pattern' for many forms","Officer's first task: identify whether the relationship and conduct fall within the Act"],
        cross_refs:["S.O. 53 — Domestic Violence: TTPS protocol for response, recording, and referral","Children Act 2012 — overlapping protection for children","S.O. 47 — Woman Police Bureau: matters affecting women and children"] },
      { uid:"DVA_POLICE_POWERS", topic:"Police Powers — Entry, Arrest, and Investigation",
        raw:"A police officer who has REASONABLE GROUNDS to believe that a person is engaging in or has engaged in domestic violence may, WITHOUT WARRANT: (a) ENTER any premises if there are reasonable grounds to believe that an act of domestic violence is being committed, has just been committed, or is about to be committed; (b) ARREST the person believed to have committed the act; (c) seize any item used, or suspected of having been used, in the commission of the act including any firearm or weapon. The officer must, AS SOON AS PRACTICABLE: take the victim to a place of safety; provide information about Protection Orders, shelters, and counselling services; record the incident in the Station Diary; complete a Domestic Violence Report.",
        elements:["WARRANTLESS ENTRY power: where officer has reasonable grounds to believe DV is being committed, has just been, or is about to be","WARRANTLESS ARREST power: same threshold — reasonable grounds","SEIZURE power: items used or suspected to have been used, including firearms and weapons","MANDATORY actions: take victim to place of safety; provide information on Protection Orders and shelters; record in Station Diary; complete DV Report","'Reasonable grounds' = objective standard; officer must be able to articulate the basis","Failure to act on a reasonable suspicion may itself be misconduct — DV cases attract heightened scrutiny"],
        cross_refs:["S.O. 53 — Domestic Violence: detailed TTPS response protocol","S.O. 17 — Station Diary: every DV occurrence recorded","S.O. 38 — Charge Room: arrest and bail processing","Firearms Act — additional powers in respect of firearms involved","Bail Act s.5(2) and s.6 — bail considerations where DV offences are alleged"] },
      { uid:"DVA_PO", topic:"Protection Orders — Application, Conditions, and Duration",
        raw:"A victim of domestic violence (or a parent, guardian, social worker, police officer, or other authorised person on the victim's behalf) may APPLY to the Magistrate's Court for a PROTECTION ORDER. The Court may make: (a) an INTERIM PROTECTION ORDER ex parte where there is a serious and immediate risk; (b) a FINAL PROTECTION ORDER after hearing both parties. Conditions may include: prohibition on contacting, approaching, or communicating with the victim; prohibition from entering the victim's residence, workplace, or child's school; surrender of firearms; counselling attendance; financial support. A Protection Order may be made for such period as the Court considers just but does not generally exceed THREE YEARS. BREACH of a Protection Order is a criminal offence punishable on summary conviction by fine and imprisonment.",
        elements:["WHO may apply: victim OR a parent, guardian, social worker, POLICE OFFICER, or other authorised person on the victim's behalf","INTERIM Protection Order: ex parte, where serious and immediate risk","FINAL Protection Order: after hearing both parties","Common conditions: no-contact; exclusion from residence/workplace/school; surrender of firearms; counselling; financial support","Maximum duration: typically up to 3 years (Court's discretion)","BREACH is a criminal offence — police arrest without warrant on reasonable belief of breach","Sergeants frequently become applicants on a victim's behalf where the victim is unable or unwilling to apply"],
        cross_refs:["S.O. 53 — Domestic Violence","Bail Act s.6(2)(a)(iii) — interfering with witnesses; relevant to bail of DV accused","Firearms Act — firearm surrender provisions reinforce Protection Order conditions","Sexual Offences Act — overlapping offences may be charged in addition"] },
      { uid:"DVA_DUTY", topic:"Duties of the Investigating Officer",
        raw:"The investigating officer must: (a) take the COMPLAINT FORMALLY whether or not the victim wishes to press charges; (b) RECORD the incident in the Station Diary and complete the prescribed Domestic Violence Report Form; (c) provide INFORMATION to the victim regarding Protection Orders, shelters, counselling, and victim support services; (d) take the victim to a PLACE OF SAFETY where necessary; (e) ENSURE THE WELFARE OF ANY CHILDREN at the scene; (f) refer the matter to the appropriate UNIT for follow-up (Gender-Based Violence Unit, Child Protection Unit); (g) appear in court when required. An officer must NOT decline to take a complaint on the basis that it is 'a domestic matter'.",
        elements:["COMPLAINT MUST BE TAKEN even if victim is reluctant or 'doesn't want to press charges'","DV REPORT FORM: prescribed form must be completed","STATION DIARY entry mandatory","Information to victim: Protection Orders, shelters, counselling, victim support services","Children's welfare: ensured at every DV scene; referral to Child Protection Unit if at risk","Referral to specialised unit: Gender-Based Violence Unit / Child Protection Unit","An officer who refuses to take a DV complaint commits a disciplinary offence","Sergeants must SUPERVISE that subordinates discharge these duties — failure of a junior is the supervisor's failure"],
        cross_refs:["S.O. 53 — Domestic Violence","S.O. 47 — Woman Police Bureau","Children Act 2012 — Child Protection Unit referral framework","PSR Reg 105 — children of a person in custody"] }
    ]
  },

  { id:"soa_sex", icon:"⚠️", color:"#E05555", title:"Sexual Offences Act — Chap. 11:28", subtitle:"Act No. 27 of 1986 as amended (incl. Act No. 31 of 2000 and subsequent)",
    overview:"The Sexual Offences Act consolidates the law relating to sexual offences, defines key terms (including consent and the age of consent), creates the offences of rape, grievous sexual assault, sexual touching, incest and others, and regulates evidentiary matters in sexual cases. It works alongside the Children Act 2012 and the Domestic Violence Act. Sexual offences are heavily tested at the Sergeant examination — both for substantive law and for the special procedural and victim-care duties of the investigating officer. Specialist interviewing rules and timely medical/evidence referrals separate pass-level answers from generic crime essays.",
    units:[
      { uid:"SX_RAPE", topic:"s.4 — Rape",
        raw:"A person commits the offence of RAPE who has SEXUAL INTERCOURSE with another person WITHOUT THE CONSENT of that other person, where the accused KNOWS that the other person does not consent or is RECKLESS as to whether the other person consents. Sexual intercourse is defined as penetration, however slight, of the vagina by a penis. Consent is not validly given where it is obtained by FORCE, THREAT, FEAR, FRAUD, or where the person is INCAPABLE OF CONSENTING (e.g. by reason of unconsciousness, mental disorder, intoxication, or being under the age of consent). MARITAL RAPE is an offence — the marital exemption has been abolished. Rape is triable on indictment and carries a maximum penalty of LIFE IMPRISONMENT.",
        elements:["RAPE: sexual intercourse + without consent + knowledge of or recklessness as to non-consent","Sexual intercourse: penetration of the vagina by a penis (any degree of penetration sufficient)","Consent VITIATED by: force; threats; fear; fraud; incapacity (unconscious, mentally disordered, intoxicated, under-age)","MARITAL RAPE is an offence — no spousal exemption","Maximum penalty: LIFE IMPRISONMENT","Triable on indictment in the High Court","Bail Act First Schedule Part II offence — three-conviction rule applies"],
        cross_refs:["s.4A Sexual Offences Act — Grievous Sexual Assault (other forms of penetration)","Bail Act First Schedule Part II — rape is a specified Part II offence","S.O. 47 — Woman Police Bureau","Domestic Violence Act — overlap where offender and victim are in domestic relationship"] },
      { uid:"SX_GSA", topic:"s.4A — Grievous Sexual Assault",
        raw:"A person commits the offence of GRIEVOUS SEXUAL ASSAULT who, without the consent of the other person, penetrates the VAGINA, ANUS, or MOUTH of that other person with a part of the body other than the penis, OR with any object. The same consent and mens rea principles applicable to rape apply. The offence covers acts that are not 'rape' under s.4 (which is restricted to penile-vaginal penetration) but are equally serious. Grievous Sexual Assault is triable on indictment and carries the same maximum penalty as rape.",
        elements:["GRIEVOUS SEXUAL ASSAULT covers: penetration of vagina, anus, or mouth WITHOUT a penis (e.g. with hand, finger, object, or other body part)","Created to capture serious sexual violations not technically 'rape' under the narrow s.4 definition","Same consent rules as rape: vitiated by force, threats, fear, fraud, incapacity","Same mens rea: knowledge or recklessness as to non-consent","Triable on indictment with maximum penalty equivalent to rape","Bail Act First Schedule Part II — three-conviction rule"],
        cross_refs:["s.4 Sexual Offences Act — Rape","S.O. 47 — Woman Police Bureau","S.O. 28 — Classification of Crimes: serious sexual offences require CRO notification"] },
      { uid:"SX_AGE", topic:"Age of Consent and Offences Involving Minors",
        raw:"The AGE OF CONSENT to sexual activity is 16 YEARS. Sexual intercourse with a person UNDER 14 YEARS is a separate and more serious offence and carries enhanced penalties (up to life imprisonment). Sexual intercourse with a person AT LEAST 14 BUT UNDER 16 is also an offence. Even where the minor purports to consent, that consent is NOT a defence — minors are legally incapable of consenting to sexual intercourse. SEXUAL TOUCHING of a minor (any part of the body for a sexual purpose) is a separate offence. PERSONS IN POSITIONS OF TRUST (teachers, parents, guardians, religious leaders, coaches) face enhanced penalties for sexual offences against minors in their care. INCEST (s.13) — sexual intercourse between persons within prohibited degrees of relationship — is a separate offence regardless of consent.",
        elements:["AGE OF CONSENT: 16 years","Sexual intercourse with person UNDER 14: most serious offence; up to life imprisonment","Sexual intercourse with person 14–under 16: separate offence; serious penalty","CONSENT of a minor is NOT a defence — minors legally incapable of consent","Sexual touching of a minor: separate offence","POSITION OF TRUST (teacher, parent, guardian, religious leader, coach): enhanced penalties","INCEST (s.13): sexual intercourse between persons within prohibited degrees — offence regardless of consent","Mandatory reporting under Children Act for sexual offences against children"],
        cross_refs:["Children Act 2012 — mandatory reporting; Children's Authority involvement","S.O. 47 — Woman Police Bureau: matters affecting children and young persons","S.O. 53 — Domestic Violence: overlapping where offender is family member","Children's Judges Rules — questioning persons under 17"] },
      { uid:"SX_PROC", topic:"Special Procedural and Victim-Care Duties",
        raw:"Sexual offence investigations engage SPECIAL DUTIES on the police: (a) the complainant should where practicable be interviewed by an officer of the SAME SEX, ideally with specialist training; (b) the complainant must be informed of available SUPPORT SERVICES (counselling, victim support, medical care) and given the opportunity to access them; (c) MEDICAL EXAMINATION should be arranged promptly with the complainant's informed consent and conducted by an appropriately trained medical practitioner; (d) the SCENE must be preserved and FORENSIC EVIDENCE secured (clothing, swabs, photographs); (e) the IDENTITY of the complainant is protected — publication of identifying information is an offence; (f) a MINOR complainant must have a parent, guardian, or appropriate adult present (Children's Judges Rules); (g) records and statements are kept SECURE with restricted access. Sergeants must ensure these duties are discharged — failure can compromise prosecution and re-traumatise the complainant.",
        elements:["Complainant interviewed where practicable by an officer of the SAME SEX, ideally specialist","Information on support services: counselling, victim support, medical care","MEDICAL EXAMINATION: arranged promptly with informed consent","SCENE preservation; FORENSIC EVIDENCE secured (clothing, swabs, photographs)","IDENTITY OF COMPLAINANT IS PROTECTED — publication of identifying information is an offence","Minor complainant: parent/guardian/appropriate adult present (Children's Judges Rules)","Records kept secure with restricted access","Sergeants supervise to ensure these are done — failure can wreck the prosecution"],
        cross_refs:["S.O. 47 — Woman Police Bureau","S.O. 30 — Scientific Agencies — Crime Detection: forensic evidence","S.O. 32 — Statements: special considerations for vulnerable witnesses","Children's Judges Rules — questioning persons under 17"] }
    ]
  },

  { id:"dda", icon:"💊", color:"#38C172", title:"Dangerous Drugs Act — Chap. 11:25", subtitle:"As amended including the Cannabis Control Act 2019 (decriminalisation of small quantities)",
    overview:"The Dangerous Drugs Act creates the principal drug offences in T&T: possession of a controlled drug, possession for the purpose of trafficking, trafficking, and possession of trafficking equipment. Drugs are listed in Schedules (cannabis and cannabis resin in one Schedule; cocaine, heroin and other Class A in another). The Cannabis Control Act 2019 substantially decriminalised possession of small quantities of cannabis for personal use by adults. Drug trafficking is a Bail Act First Schedule Part II offence. Sergeants must understand the difference between possession and trafficking, statutory presumptions, and the post-2019 cannabis regime. Weight thresholds and packaging facts usually decide trafficking inferences on charge.",
    units:[
      { uid:"DDA_S5", topic:"s.5 — Possession of a Controlled Drug",
        raw:"A person who has in his possession a CONTROLLED DRUG commits an offence. The mens rea is KNOWLEDGE that the substance is in his possession; knowledge of the precise nature of the drug is not required where the accused knows it is a controlled drug. Possession may be ACTUAL (on the person) or CONSTRUCTIVE (in premises or a vehicle within the accused's control). Joint possession is recognised. The offence is triable summarily or on indictment depending on the drug and quantity. Defence: the accused proves that he did not know and could not reasonably have known the substance was in his possession.",
        elements:["Two elements: (1) POSSESSION of the substance; (2) KNOWLEDGE that it is in his possession","Possession may be ACTUAL (on person) or CONSTRUCTIVE (in premises/vehicle within his control)","Joint possession recognised — multiple persons may simultaneously possess the same drug","Knowledge of the precise drug not required — knowledge that it is a controlled drug suffices","Triable summarily or on indictment depending on drug and quantity","DEFENCE: accused proves no knowledge and could not reasonably have known","Schedule classifies the drug — cannabis/cannabis resin separate from cocaine, heroin, other Class A"],
        cross_refs:["S.O. 28 — Classification of Crimes: drug offences require CRO notification for serious matters","S.O. 30 — Scientific Agencies: forensic analysis by Forensic Science Centre","Bail Act First Schedule Part II — drug trafficking is a specified Part II offence"] },
      { uid:"DDA_TRAFFIC", topic:"Possession for the Purpose of Trafficking and Trafficking",
        raw:"A person who has a controlled drug in his possession for the PURPOSE OF TRAFFICKING commits a serious offence punishable by substantial imprisonment and/or fine. 'TRAFFICKING' includes selling, giving, administering, transporting, sending, delivering, or distributing — and includes offering to do any of these. Possession of a quantity of a drug ABOVE A PRESCRIBED THRESHOLD raises a STATUTORY PRESUMPTION of possession for the purpose of trafficking; the accused must then prove on the balance of probabilities that the drug was for personal use only. Possession of TRAFFICKING EQUIPMENT (scales, packaging, cutting agents, large quantities of cash) is a separate offence and corroborative evidence of trafficking.",
        elements:["TRAFFICKING includes: selling, giving, administering, transporting, sending, delivering, distributing — and offering to do any","STATUTORY PRESUMPTION: quantity above prescribed threshold = presumed for trafficking; accused must rebut on balance of probabilities","Possession of TRAFFICKING EQUIPMENT (scales, packaging, cutting agents) — separate offence and corroborative","Substantially heavier penalties than simple possession","Triable on indictment in the High Court","Bail Act First Schedule Part II offence — three-conviction rule applies"],
        cross_refs:["Bail Act First Schedule Part II — drug trafficking specified offence","S.O. 28 — Classification of Crimes: trafficking is a serious crime","S.O. 30 — Scientific Agencies: weight and chemical composition determined by Forensic Science Centre","Proceeds of Crime Act — restraint and confiscation of trafficking proceeds"] },
      { uid:"DDA_CANNABIS", topic:"Cannabis Control Act 2019 — Decriminalisation of Personal Use",
        raw:"The Cannabis Control Act 2019 substantially amended the regime in respect of cannabis. An ADULT (18 years or over) may possess up to 30 GRAMS of cannabis or 5 GRAMS of cannabis resin for PERSONAL USE without committing a criminal offence. Cultivation of up to FOUR PLANTS in a private dwelling is permitted. Smoking cannabis in a PUBLIC PLACE remains an offence punishable by a fixed penalty. Supply, sale, or trafficking of cannabis remains a serious criminal offence regardless of quantity. Cannabis remains prohibited for persons UNDER 18 in any quantity. Driving under the influence of cannabis is an offence under the Motor Vehicles and Road Traffic Act.",
        elements:["ADULTS (18+): may possess up to 30g cannabis or 5g cannabis resin for personal use without offence","Cultivation: up to 4 plants in a PRIVATE dwelling permitted for adults","Smoking in a PUBLIC PLACE: remains an offence (fixed penalty)","SUPPLY, SALE, TRAFFICKING: criminal offence regardless of quantity","UNDER 18: cannabis remains entirely prohibited","DRIVING under influence of cannabis: offence under Motor Vehicles and Road Traffic Act","Cannabis Licensing Authority issues licences for medicinal/research/commercial cultivation"],
        cross_refs:["Motor Vehicles and Road Traffic Act — driving under influence of drugs","S.O. 28 — Classification of Crimes: offences involving children/young persons separate","S.O. 11 — Beat and Patrol: officers exercise discretion in line with the 2019 framework"] },
      { uid:"DDA_POWERS", topic:"Police Powers — Search, Seizure, and Forfeiture",
        raw:"Where a police officer has REASONABLE GROUNDS to suspect that a person is in possession of a controlled drug, the officer may: (a) STOP, DETAIN, AND SEARCH the person, any vehicle in his control, and any premises he occupies (the latter typically requires a warrant unless under hot pursuit or DV powers); (b) SEIZE any controlled drug, trafficking equipment, document, or thing connected to a drug offence; (c) ARREST the person without warrant where the suspected offence is indictable. Drug offences trigger PROCEEDS OF CRIME applications — restraint orders, confiscation of trafficking proceeds, and forfeiture of seized assets are available. All seized drugs must be properly bagged, labelled, sealed, and lodged in the General Property Register pending forensic analysis. Chain of custody is critical — any break may render the evidence inadmissible.",
        elements:["STOP, DETAIN, AND SEARCH on REASONABLE GROUNDS — person, vehicle, premises (usually warrant for premises)","SEIZURE: drugs, trafficking equipment, documents, anything connected to the offence","WARRANTLESS ARREST: where suspected offence is indictable","PROCEEDS OF CRIME applications: restraint, confiscation, forfeiture of trafficking assets","CHAIN OF CUSTODY: bagging, labelling, sealing, General Property Register lodgement","Forensic analysis: weight and composition determined by Forensic Science Centre","Break in chain of custody = evidence may be inadmissible — this is a frequent cause of acquittals"],
        cross_refs:["S.O. 26 — Property: handling of seized property","S.O. 30 — Scientific Agencies — Crime Detection: forensic evidence","Proceeds of Crime Act — restraint and confiscation","Bail Act First Schedule Part II — bail considerations for drug trafficking"] }
    ]
  },

  { id:"firearms", icon:"🔫", color:"#E05555", title:"Firearms Act — Chap. 16:01", subtitle:"As amended (penalties significantly increased by recent amendments)",
    overview:"The Firearms Act regulates the lawful possession, use, and trade in firearms and ammunition in Trinidad and Tobago. Lawful possession requires a FIREARM USER'S LICENCE (FUL) granted by the Commissioner of Police. Illegal possession of a firearm or ammunition is a serious indictable offence carrying substantial mandatory minimum penalties. The Act distinguishes between ordinary firearms, restricted firearms (automatic and certain semi-automatic), and prohibited weapons. Standing Orders 40 and 41 govern police firearms. Firearms offences are Bail Act First Schedule Part II offences. FUL vetting touches neighbours and mental-health history — document why recommendations are made.",
    units:[
      { uid:"FA_FUL", topic:"Firearm User's Licence (FUL) — Lawful Possession",
        raw:"No person may possess a firearm or ammunition unless he holds a valid FIREARM USER'S LICENCE issued by the COMMISSIONER OF POLICE. The Commissioner may grant or refuse a licence in his discretion having regard to: the applicant's character; the applicant's reason for requiring a firearm; the applicant's competence to handle a firearm safely; and the public interest. A licence specifies the type of firearm, the place at which it may be kept, and any conditions. The Commissioner may at any time REVOKE a licence. A revoked licensee must immediately surrender the firearm and ammunition to the police. A licensee must report any LOSS OR THEFT of the firearm to the police IMMEDIATELY.",
        elements:["FUL granted (or refused) by COMMISSIONER OF POLICE in his discretion","Considerations: character; reason; competence; public interest","Licence specifies type, place of keeping, and conditions","Commissioner may REVOKE at any time","Revoked licensee must IMMEDIATELY surrender firearm and ammunition","LOSS OR THEFT of a licensed firearm: must be reported to police IMMEDIATELY","Storage requirements typically include a safe and secure storage in a locked container"],
        cross_refs:["S.O. 40 — Firearms and Ammunition (general)","S.O. 41 — Police Firearms and Ammunition","Domestic Violence Act — surrender of firearms under Protection Order conditions"] },
      { uid:"FA_ILLEGAL", topic:"Illegal Possession of Firearms and Ammunition",
        raw:"A person who has in his possession a FIREARM without a Firearm User's Licence commits an offence punishable on summary conviction by substantial imprisonment, and on conviction on indictment by significantly heavier imprisonment (recent amendments have increased the upper limits substantially). A person who has in his possession AMMUNITION without a Firearm User's Licence commits a separate offence. The mens rea is knowledge of possession of the item — knowledge that the law requires a licence is not required (ignorance of the law is no defence). Constructive possession (in a vehicle or premises within the accused's control) suffices. Joint possession is recognised. Firearm offences are Bail Act First Schedule Part II offences.",
        elements:["POSSESSION OF FIREARM without FUL: serious indictable offence; substantial imprisonment","POSSESSION OF AMMUNITION without FUL: separate offence","Mens rea: knowledge of possession of the item","Ignorance of the law is no defence","Constructive possession (vehicle, premises within control) suffices","Joint possession recognised","Bail Act First Schedule Part II offence — three-conviction rule applies","Recent amendments have significantly increased penalties — sergeants must check current penalty levels"],
        cross_refs:["Bail Act First Schedule Part II — firearms trafficking specified offence","S.O. 28 — Classification of Crimes","S.O. 38 — Charge Room: charging procedure and bail considerations","S.O. 40 — Firearms and Ammunition: handling and storage of seized firearms"] },
      { uid:"FA_RESTRICTED", topic:"Restricted Firearms and Prohibited Weapons",
        raw:"The Act distinguishes ORDINARY firearms (lawfully licensable for self-defence, sporting, and similar purposes) from RESTRICTED firearms (typically AUTOMATIC and certain SEMI-AUTOMATIC weapons) and PROHIBITED WEAPONS (e.g. machine guns, sawn-off shotguns, weapons disguised as other objects). Possession of a restricted firearm without specific authorisation is a SEPARATE and more serious offence carrying enhanced penalties. Possession of a prohibited weapon is similarly a stand-alone serious offence. The classification depends on the technical specifications of the weapon — sergeants should rely on the Forensic Science Centre or armoury for definitive classification before charging.",
        elements:["THREE categories: ORDINARY (licensable), RESTRICTED (automatic / certain semi-automatic), PROHIBITED (machine guns, sawn-off shotguns, disguised weapons)","Restricted firearm offence: separate and more serious than ordinary illegal possession","Prohibited weapon offence: stand-alone serious offence","Classification is technical — rely on Forensic Science Centre or armoury before charging","Enhanced penalties apply across the board for restricted/prohibited categories"],
        cross_refs:["S.O. 30 — Scientific Agencies: Forensic Science Centre classification","S.O. 40 — Firearms and Ammunition: handling and storage","Bail Act First Schedule — firearms trafficking is Part II"] },
      { uid:"FA_POLICE", topic:"Police Firearms — Issue, Use, and Accountability",
        raw:"Police firearms and ammunition are issued under STRICT controls (PSR Reg 123, S.O. 41). Issue requires the WRITTEN AUTHORITY of the Commissioner or a Deputy Commissioner. Each officer issued a firearm must sign for it and is personally responsible for its safekeeping. Any DISCHARGE of a police firearm — whether accidental, in training, or operationally — must be reported IMMEDIATELY to the Commissioner stating the quantity, circumstances, and outcome. Any LOSS of a police firearm or ammunition is a disciplinary matter. Use of force with a firearm must be JUSTIFIED, PROPORTIONATE, and IN ACCORDANCE WITH LAW — typically only where there is an imminent threat of death or grievous bodily harm. Every operational discharge triggers a PCA notification.",
        elements:["Issue: WRITTEN AUTHORITY of Commissioner or Deputy Commissioner (PSR Reg 123)","Each officer signs for issued firearm — personally responsible for safekeeping","Any DISCHARGE: report IMMEDIATELY to Commissioner — accidental, training, or operational","Any LOSS: disciplinary matter","Use of force: justified, proportionate, and in accordance with law — typically imminent threat of death/GBH only","Operational discharge: triggers PCA notification","Officer must record details in Pocket Diary at or near the time"],
        cross_refs:["PSR Reg 123 — Issue of arms and ammunition","PSR Reg 124 — Control of ammunition","S.O. 40 — Firearms and Ammunition","S.O. 41 — Police Firearms and Ammunition","Police Complaints Authority Act — PCA jurisdiction over discharges causing death/serious injury"] }
    ]
  },

  { id:"oapa", icon:"🩸", color:"#9B72CF", title:"Offences Against the Person Act — Chap. 11:08", subtitle:"As amended",
    overview:"The Offences Against the Person Act consolidates the principal common-law offences of violence against the person: murder, manslaughter, wounding with intent, wounding, assault occasioning actual bodily harm, and common assault. It also creates statutory offences such as kidnapping and threats to kill. These are core charges sergeants will see daily — understanding the elements, the hierarchy of offences, and the correct charge to lay is essential. Murder and manslaughter are tried in the High Court; lesser assaults are summary or either-way matters. Charging too low on serious wounding can fail victims; charging too high without evidence invites dismissal.",
    units:[
      { uid:"OAPA_MURDER", topic:"s.4 — Murder",
        raw:"MURDER is the unlawful killing of a human being with MALICE AFORETHOUGHT (the intention to kill or to cause grievous bodily harm). The actus reus requires: (1) a positive act or culpable omission (2) that causes (3) the death (4) of a human being (5) under the Queen's peace. The mens rea — malice aforethought — is satisfied by either: (a) the INTENTION TO KILL; or (b) the INTENTION TO CAUSE GRIEVOUS BODILY HARM. Murder is triable in the HIGH COURT. Historically the death penalty was mandatory; following constitutional and Privy Council jurisprudence (Pratt and Morgan; Reyes and Hughes; Roodal), the position has been the subject of significant litigation. Bail for murder was historically prohibited; since the Bail Amendment Act No. 11 of 2024 (and Akili Charles v The State [2022] UKPC 31) a Judge or Master may now grant bail for murder in exceptional circumstances.",
        elements:["FIVE actus reus elements: (1) positive act or culpable omission; (2) causes; (3) death; (4) of a human being; (5) under the Queen's peace","Mens rea — MALICE AFORETHOUGHT: intention to kill OR intention to cause grievous bodily harm","Triable in the HIGH COURT","Historically: mandatory death penalty (subject to extensive constitutional litigation)","BAIL: historically prohibited; post-Bail Amendment Act 2024 a Judge/Master may grant in exceptional circumstances","Causation: 'but for' the act, the death would not have occurred — and the act is a substantial and operating cause","Reduces to manslaughter where partial defences (provocation, diminished responsibility) succeed"],
        cross_refs:["s.5 — Manslaughter (where intention to kill/GBH absent or partial defence succeeds)","Bail Act s.5 + First Schedule Part I","Constitution s.4(a) — right to life","Akili Charles v The State [2022] UKPC 31"] },
      { uid:"OAPA_MANSLAUGHTER", topic:"s.5 — Manslaughter",
        raw:"MANSLAUGHTER is the unlawful killing of a human being WITHOUT malice aforethought. There are two principal categories: (1) VOLUNTARY MANSLAUGHTER — where the killing would have been murder but a partial defence succeeds (PROVOCATION; DIMINISHED RESPONSIBILITY; suicide pact); the verdict is reduced from murder to manslaughter. (2) INVOLUNTARY MANSLAUGHTER — where the accused did not intend to kill or cause GBH but death resulted from: (a) AN UNLAWFUL AND DANGEROUS ACT (constructive manslaughter); or (b) GROSS NEGLIGENCE (Adomako test). Triable in the High Court. The penalty is at large up to LIFE IMPRISONMENT — there is no mandatory sentence.",
        elements:["UNLAWFUL killing WITHOUT malice aforethought","VOLUNTARY MANSLAUGHTER: would have been murder but a partial defence succeeds — provocation, diminished responsibility, suicide pact","INVOLUNTARY MANSLAUGHTER: no intention to kill/GBH but death from (a) unlawful and dangerous act OR (b) gross negligence (Adomako)","Triable in the HIGH COURT","Penalty at large — up to life imprisonment; NO mandatory sentence","Bail not within Bail Act First Schedule Part I — Court may grant bail under general principles"],
        cross_refs:["s.4 — Murder (the more serious offence; manslaughter is the partial-defence outcome)","Bail Act s.6 — bail discretion factors","S.O. 28 — Classification of Crimes: murder/manslaughter require immediate CRO notification"] },
      { uid:"OAPA_WOUND_INTENT", topic:"Wounding with Intent — Grievous Bodily Harm",
        raw:"A person who unlawfully and maliciously WOUNDS or causes GRIEVOUS BODILY HARM to another with INTENT to cause grievous bodily harm, or with intent to resist the lawful apprehension or detainer of any person, commits an offence triable on indictment carrying a substantial term of imprisonment. The actus reus is a wounding (a break in the continuity of the skin) or causing of grievous bodily harm (really serious bodily harm). The mens rea is INTENTION to cause grievous bodily harm (or to resist arrest); recklessness is not sufficient for this offence. Wounding/GBH cases turn on medical evidence — the Medical Officer's report is critical.",
        elements:["WOUNDING = a break in the continuity of the skin (both layers — epidermis and dermis)","GRIEVOUS BODILY HARM = really serious bodily harm","Mens rea: INTENTION to cause GBH (or to resist arrest) — recklessness alone NOT sufficient","Triable on indictment — substantial imprisonment","Medical Officer's report critical — sergeants must ensure medical examination is arranged and report is in evidence","Distinguish from the lesser offence of unlawful wounding (recklessness sufficient)"],
        cross_refs:["Lesser offence: unlawful wounding (recklessness mens rea)","Even lesser: assault occasioning ABH","S.O. 30 — Scientific Agencies: Medical Officer's report","S.O. 28 — Classification of Crimes"] },
      { uid:"OAPA_ABH_ASSAULT", topic:"Assault Occasioning ABH and Common Assault",
        raw:"ASSAULT OCCASIONING ACTUAL BODILY HARM (ABH): a person commits an offence who commits an assault that causes actual bodily harm to another. ACTUAL BODILY HARM = any hurt or injury that interferes with the health or comfort of the victim — need not be permanent but must be more than transient or trifling. Includes psychiatric harm where supported by medical evidence. Triable summarily or on indictment. COMMON ASSAULT (assault and battery): assault is any act causing the victim to apprehend immediate unlawful violence; battery is the actual application of unlawful force, however slight. Both are summary offences. CONSENT may be a defence to common assault and to ABH for socially-accepted activities (sport, surgery, body modification within limits), but is not a defence to GBH save in narrow exceptions.",
        elements:["ASSAULT OCCASIONING ABH: assault + actual bodily harm","ABH = hurt or injury more than transient or trifling — includes psychiatric harm with medical evidence","Triable summarily or on indictment","COMMON ASSAULT (s.16 or equivalent): assault (apprehension of force) OR battery (application of force)","CONSENT: a defence to common assault and ABH for accepted activities (sport, surgery); not a defence to GBH save narrow exceptions","Mens rea for assault: intention to cause apprehension or recklessness as to it","Mens rea for battery: intention to apply force or recklessness as to it"],
        cross_refs:["s.4 — Murder; s.5 — Manslaughter (where assault results in death)","Wounding with intent / wounding (more serious)","Domestic Violence Act — overlap where assault is in domestic relationship","S.O. 28 — Classification of Crimes"] }
    ]
  }
];
 
 
/* ══════════════════════════════════════════════════════════════
   ATOMS
══════════════════════════════════════════════════════════════ */
const Shell = ({ children }) => (
  <div style={{ minHeight:"100vh", background:"#07090f", color:"#dde3ef", fontFamily:"'Syne',sans-serif" }}>
    <style>{CSS}</style>
    {children}
  </div>
);
 
const Chip = ({ label, color, sm }) => (
  <span style={{ background:`${color}18`, color, border:`1px solid ${color}40`, borderRadius:4,
    padding:sm?"2px 7px":"3px 10px", fontSize:sm?9:11, fontWeight:700, letterSpacing:"0.07em",
    textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace", whiteSpace:"nowrap" }}>
    {label}
  </span>
);
 
const Spinner = ({ msg="Generating questions…" }) => (
  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, padding:"72px 24px" }}>
    <div style={{ width:38, height:38, border:"3px solid #0f1520", borderTop:"3px solid #E8A838",
      borderRadius:"50%", animation:"spin .75s linear infinite" }}/>
    <p style={{ color:"#334155", fontFamily:"'JetBrains Mono',monospace", fontSize:11,
      animation:"glow 1.6s ease infinite", textAlign:"center", maxWidth:280 }}>{msg}</p>
  </div>
);
 
const ScoreRing = ({ pct, size=72, stroke=4, color="#E8A838" }) => {
  const r = (size-stroke)/2, circ = 2*Math.PI*r;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#0f1520" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ*(1-pct/100)} strokeLinecap="round"
        style={{ transition:"stroke-dashoffset 1.1s ease" }}/>
    </svg>
  );
};
 
/* ══════════════════════════════════════════════════════════════
   NAV BAR — clean 5-tab layout with SO dropdown grid
══════════════════════════════════════════════════════════════ */
function NavBar({ screen, onNav }) {
  const [soOpen, setSoOpen] = useState(false);
 
  const tabs = [
    { id:"home",    label:"Home",         icon:"🏠" },
    { id:"so",      label:"Standing Orders", icon:"📜", hasDropdown:true },
    { id:"psr",     label:"PSR 2007",     icon:"📘" },
    { id:"notes",   label:"Study Notes",  icon:"📚" },
    { id:"mgmt",    label:"Management",   icon:"🎓" },
    { id:"leg",     label:"Legislation",  icon:"📚" },
    { id:"ext-lib", label:"Library",      icon:"📂" },
    { id:"papers",  label:"Papers",       icon:"📰" },
    { id:"dept",    label:"Dept",       icon:"📋" },
    { id:"practice",label:"Practice",     icon:"✏️" },
  ];
 
  function handleTabClick(tab) {
    if (tab.hasDropdown) { setSoOpen(v => !v); return; }
    setSoOpen(false);
    onNav(tab.id);
  }
 
  const isActive = (id) => {
    if (id === "so") return soOpen || screen === "so-detail";
    return screen === id;
  };
 
  return (
    <div style={{ position:"sticky", top:0, zIndex:100, background:"#0a0e1af8",
      backdropFilter:"blur(20px)", borderBottom:"1px solid #141e30" }}>
 
      {/* Tab row */}
      <div style={{ display:"flex", alignItems:"center", maxWidth:800, margin:"0 auto", padding:"0 16px" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"13px 0", marginRight:8, flexShrink:0 }}>
          <span style={{ fontSize:18 }}>🎖️</span>
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            color:"#E8A838", letterSpacing:"0.14em", fontWeight:700, whiteSpace:"nowrap" }}>TTPS</span>
        </div>
 
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => handleTabClick(tab)}
            style={{ background: isActive(tab.id) ? "#E8A83812" : "transparent",
              border:"none",
              borderBottom: isActive(tab.id) ? "2px solid #E8A838" : "2px solid transparent",
              color: isActive(tab.id) ? "#E8A838" : "#475569",
              padding:"13px 10px", cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace", fontSize:9,
              letterSpacing:"0.09em", textTransform:"uppercase",
              transition:"all .18s", display:"flex", alignItems:"center", gap:4,
              whiteSpace:"nowrap", flex:1, justifyContent:"center" }}>
            <span style={{ fontSize:13 }}>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.hasDropdown && (
              <span style={{ fontSize:8, marginLeft:2,
                transform: soOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition:"transform .2s" }}>▼</span>
            )}
          </button>
        ))}
      </div>
 
      {/* SO dropdown grid — all 54 as buttons */}
      {soOpen && (
        <div onClick={() => setSoOpen(false)}
          style={{ background:"#0a0e1a", borderTop:"1px solid #141e30",
            borderBottom:"1px solid #141e30", maxHeight:"55vh", overflowY:"auto" }}>
          <div style={{ maxWidth:800, margin:"0 auto", padding:"14px 16px" }}>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
              color:"#1e2d45", letterSpacing:"0.16em", textTransform:"uppercase",
              marginBottom:10 }}>Select a Standing Order</p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:6 }}>
              {ALL_SO.map(so => (
                <button key={so.num}
                  onClick={(e) => { e.stopPropagation(); setSoOpen(false); onNav("so-detail", so); }}
                  style={{ background:"#0f1520", border:`1px solid ${so.color}22`,
                    borderRadius:8, padding:"8px 11px", cursor:"pointer",
                    textAlign:"left", display:"flex", alignItems:"center", gap:8,
                    transition:"all .15s", width:"100%" }}
                  onMouseEnter={e => { e.currentTarget.style.background=`${so.color}14`; e.currentTarget.style.borderColor=`${so.color}55`; }}
                  onMouseLeave={e => { e.currentTarget.style.background="#0f1520"; e.currentTarget.style.borderColor=`${so.color}22`; }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                    color:so.color, fontWeight:700, minWidth:30, flexShrink:0 }}>S.O.{so.num}</span>
                  <span style={{ fontSize:14, flexShrink:0 }}>{so.icon}</span>
                  <span style={{ color:"#64748b", fontSize:11, lineHeight:1.3, flex:1 }}>{so.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   HOME SCREEN
══════════════════════════════════════════════════════════════ */
function HomeScreen({ onNav }) {
  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"28px 20px 56px" }}>
      {/* Hero */}
      <div style={{ textAlign:"center", padding:"28px 0 28px", position:"relative" }}>
        {[100,200,300].map((s,i) => (
          <div key={i} style={{ position:"absolute", top:"50%", left:"50%",
            transform:"translate(-50%,-50%)", width:s, height:s, borderRadius:"50%",
            border:"1px solid #E8A83807", pointerEvents:"none" }}/>
        ))}
        <div style={{ position:"relative" }}>
          <div style={{ fontSize:48, marginBottom:12, filter:"drop-shadow(0 0 24px #E8A83866)" }}>🎖️</div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700,
            fontSize:"clamp(26px,5.5vw,40px)", lineHeight:1.05,
            background:"linear-gradient(130deg,#E8A838 0%,#ffd07a 50%,#c8841a 100%)",
            backgroundSize:"200%", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"shimmer 4s linear infinite", marginBottom:8 }}>
            TTPS Sergeant Exam
          </h1>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
            letterSpacing:"0.2em", color:"#4A90D9", textTransform:"uppercase", marginBottom:14 }}>
            Trinidad & Tobago Police Service
          </p>
          <div style={{ display:"flex", justifyContent:"center", gap:8, flexWrap:"wrap" }}>
            <Chip label={`${ALL_SO.length} Standing Orders`} color="#E8A838" sm/>
            <Chip label={`PSR 2007 · ${PSR_PARTS.length} Parts`} color="#4A90D9" sm/>
            <Chip label={`${LEGISLATION.length} Legislation Acts`} color="#E05555" sm/>
            {externalCorpusSummary.indexed && (
              <Chip label={`${externalCorpusSummary.totalFiles} files · D: library`} color="#64748b" sm/>
            )}
            <Chip label={`${pastQuestions.question_count} past paper questions`} color="#38b2a1" sm/>
            <Chip label={`${pastQuestions.mcq_count} MCQs`} color="#38b2a1" sm/>
            <Chip label="AI-Graded Practice" color="#38C172" sm/>
          </div>
        </div>
      </div>
 
      {/* Action cards */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:28 }}>
        {[
          { id:"so",      icon:"📜", label:"Standing Orders", desc:`All ${ALL_SO.length} S.O.s — tap the nav menu`, color:"#E8A838" },
          { id:"psr",     icon:"📘", label:"PSR 2007",        desc:`${PSR_PARTS.length} Parts with key points`,    color:"#4A90D9" },
          { id:"notes",   icon:"📚", label:"Study Notes",     desc:"S.O. + PSR notes side by side",                 color:"#9B72CF" },
          { id:"mgmt",    icon:"🎓", label:"Management",      desc:"Leadership · Motivation · Strategy",            color:"#4A90D9" },
          { id:"leg",     icon:"⚖️", label:"Legislation",     desc:`${LEGISLATION.length} Acts · Statutory text · Cross-refs`, color:"#E05555" },
          { id:"ext-lib", icon:"📂", label:"Law library (D:)", desc: externalCorpusSummary.indexed ? `${externalCorpusSummary.totalFiles} indexed files + official sources` : "Index your T&T laws folder", color:"#94a3b8" },
          { id:"papers",  icon:"📰", label:"Past papers",     desc:`${pastQuestions.paper_count} papers · filter + hints`, color:"#38b2a1" },
          { id:"dept",    icon:"📋", label:"Dept orders",     desc:`${deptOrdersIndex.count} DOs · search + OCR preview`, color:"#c9a227" },
          { id:"practice",icon:"✏️", label:"Practice",        desc:"Short answers, AI-graded",                      color:"#38C172" },
        ].map((card, i) => (
          <div key={card.id} onClick={() => onNav(card.id)} className="lift"
            style={{ background:"#0a0e1a", border:`1px solid ${card.color}28`,
              borderRadius:14, padding:"20px 16px", textAlign:"center",
              animation:`fadeUp ${.3+i*.07}s ease both` }}>
            <div style={{ fontSize:26, marginBottom:8 }}>{card.icon}</div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
              fontSize:14, color:"#e2e8f0", marginBottom:4 }}>{card.label}</p>
            <p style={{ color:"#334155", fontSize:11, lineHeight:1.4 }}>{card.desc}</p>
          </div>
        ))}
      </div>
 
      {/* Coverage stats */}
      <div style={{ background:"#0a0e1a", border:"1px solid #141e30", borderRadius:14,
        padding:"18px 20px", display:"grid", gridTemplateColumns:"repeat(4,1fr)",
        gap:12, textAlign:"center" }}>
        {[
          [String(ALL_SO.length),     "Standing Orders"],
          [String(PSR_PARTS.length),  "PSR 2007 Parts"],
          [String(LEGISLATION.length),"Legislation Acts"],
          [String(MGMT_TOPICS.length),"Mgmt Topics"],
        ].map(([n,l]) => (
          <div key={l}>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700,
              fontSize:28, color:"#E8A838", lineHeight:1 }}>{n}</p>
            <p style={{ color:"#334155", fontSize:11, marginTop:4 }}>{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   SO DETAIL — individual Standing Order notes page
══════════════════════════════════════════════════════════════ */
function SODetail({ so, onBack, onPractice }) {
  return (
    <div style={{ maxWidth:680, margin:"0 auto", padding:"20px 20px 56px" }}>
      <button onClick={onBack}
        style={{ background:"#0a0e1a", border:"1px solid #1a2638", color:"#64748b",
          borderRadius:7, padding:"7px 13px", cursor:"pointer", marginBottom:18,
          fontFamily:"'JetBrains Mono',monospace", fontSize:11 }}>← Back</button>
 
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18 }}>
        <div style={{ width:48, height:48, borderRadius:10,
          background:`${so.color}12`, border:`1px solid ${so.color}28`,
          display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>
          {so.icon}
        </div>
        <div>
          <Chip label={`S.O.${so.num}`} color={so.color} sm/>
          <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700,
            fontSize:22, color:"#e2e8f0", marginTop:4, lineHeight:1.2 }}>{so.title}</h2>
        </div>
      </div>
 
      {/* Summary */}
      <div style={{ background:`${so.color}08`, border:`1px solid ${so.color}22`,
        borderRadius:12, padding:"16px", marginBottom:16 }}>
        <p style={{ color:"#94a3b8", fontSize:14, lineHeight:1.75, fontFamily:"'Syne',sans-serif" }}>
          {so.summary}
        </p>
      </div>
 
      {/* Key Exam Points */}
      <div style={{ background:"#0a0e1a", border:"1px solid #141e30",
        borderRadius:12, padding:"16px", marginBottom:16 }}>
        <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
          color:so.color, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12 }}>
          🔑 Key Exam Points
        </p>
        {so.keyPoints.map((pt, i) => (
          <div key={i} style={{ display:"flex", gap:10, marginBottom:9, alignItems:"flex-start" }}>
            <div style={{ background:`${so.color}20`, border:`1px solid ${so.color}40`,
              borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center",
              justifyContent:"center", flexShrink:0, marginTop:1 }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                color:so.color, fontWeight:700 }}>{i+1}</span>
            </div>
            <span style={{ color:"#64748b", fontSize:13, lineHeight:1.6, paddingTop:3 }}>{pt}</span>
          </div>
        ))}
      </div>
 
      {/* Practice button */}
      <button onClick={() => onPractice({ type:"so", item:so })}
        style={{ width:"100%", padding:"14px", borderRadius:11,
          background:`linear-gradient(135deg,${so.color},${so.color}bb)`,
          color:"#07090f", border:"none", cursor:"pointer",
          fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700,
          letterSpacing:"0.07em" }}>
        ✏️ PRACTICE SHORT ANSWERS FOR S.O.{so.num} →
      </button>
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   PSR BROWSER
══════════════════════════════════════════════════════════════ */
function PSRBrowser({ onPractice }) {
  const [open, setOpen] = useState(null);
 
  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"20px 20px 56px" }}>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700,
          fontSize:24, color:"#e2e8f0", marginBottom:4 }}>Police Service Regulations 2007</h2>
        <p style={{ color:"#334155", fontSize:12 }}>
          Chap. 15:01 · 200 Regulations · {PSR_PARTS.length} Parts · Tap any Part to expand notes and key points
        </p>
      </div>
 
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {PSR_PARTS.map((part, i) => (
          <div key={part.id} style={{ background:"#0a0e1a",
            border:`1px solid ${open===part.id ? part.color+"55" : "#141e30"}`,
            borderRadius:12, overflow:"hidden", transition:"border-color .2s",
            animation:`fadeUp ${.05+i*.04}s ease both` }}>
 
            <div onClick={() => setOpen(open===part.id ? null : part.id)}
              style={{ padding:"14px 16px", display:"flex", alignItems:"center",
                gap:12, cursor:"pointer" }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{part.icon}</span>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                    color:part.color, fontWeight:700 }}>{part.num}</span>
                  <Chip label={part.regs} color={part.color} sm/>
                </div>
                <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                  fontSize:14, color:"#cbd5e1" }}>{part.title}</p>
              </div>
              <span style={{ color:part.color, fontSize:16, transition:"transform .2s", flexShrink:0,
                transform:open===part.id ? "rotate(90deg)" : "none" }}>›</span>
            </div>
 
            {open===part.id && (
              <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${part.color}18` }}>
                <p style={{ color:"#64748b", fontFamily:"'Syne',sans-serif",
                  fontSize:13, lineHeight:1.75, paddingTop:14, marginBottom:16 }}>{part.summary}</p>
 
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                  color:part.color, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>
                  🔑 Key Exam Points
                </p>
                <div style={{ marginBottom:16 }}>
                  {part.keyPoints.map((pt, j) => (
                    <div key={j} style={{ display:"flex", gap:10, marginBottom:9, alignItems:"flex-start" }}>
                      <div style={{ background:`${part.color}20`, border:`1px solid ${part.color}40`,
                        borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center",
                        justifyContent:"center", flexShrink:0, marginTop:1 }}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                          color:part.color, fontWeight:700 }}>{j+1}</span>
                      </div>
                      <span style={{ color:"#64748b", fontSize:12, lineHeight:1.65, paddingTop:3 }}>{pt}</span>
                    </div>
                  ))}
                </div>
 
                <button onClick={() => onPractice({ type:"psr", item:part })}
                  style={{ width:"100%", padding:"10px", borderRadius:9,
                    background:`${part.color}18`, border:`1px solid ${part.color}33`,
                    color:part.color, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
                    fontSize:10, fontWeight:700, letterSpacing:"0.08em" }}>
                  ✏️ PRACTICE SHORT ANSWERS FOR {part.num.toUpperCase()} →
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   STUDY NOTES — combined SO + PSR reference with search
══════════════════════════════════════════════════════════════ */
function StudyNotes({ onPractice }) {
  const [tab, setTab] = useState("so");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);
 
  const soFiltered = ALL_SO.filter(so =>
    so.title.toLowerCase().includes(search.toLowerCase()) || String(so.num).includes(search));
  const psrFiltered = PSR_PARTS.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.num.toLowerCase().includes(search.toLowerCase()));
 
  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"20px 20px 56px" }}>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700,
          fontSize:24, color:"#e2e8f0", marginBottom:4 }}>Study Notes</h2>
        <p style={{ color:"#334155", fontSize:12 }}>
          Summaries and key exam points for every Standing Order and PSR Part
        </p>
      </div>
 
      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {[
          { id:"so",  label:`📜 Standing Orders (${ALL_SO.length})` },
          { id:"psr", label:`📘 PSR 2007 (${PSR_PARTS.length} Parts)` },
        ].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); setOpen(null); }}
            style={{ padding:"8px 16px", borderRadius:8, cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace", fontSize:10,
              background: tab===t.id ? "#E8A838" : "#0a0e1a",
              color: tab===t.id ? "#07090f" : "#475569",
              border: tab===t.id ? "none" : "1px solid #1a2638",
              fontWeight: tab===t.id ? 700 : 400, transition:"all .18s" }}>{t.label}</button>
        ))}
      </div>
 
      {/* Search */}
      <div style={{ position:"relative", marginBottom:14 }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setOpen(null); }}
          placeholder="Search by number or title…"
          style={{ width:"100%", background:"#0a0e1a", border:"1px solid #1a2638",
            borderRadius:10, padding:"10px 16px 10px 38px", color:"#dde3ef",
            fontFamily:"'Syne',sans-serif", fontSize:13, outline:"none" }}
          onFocus={e=>e.target.style.borderColor="#E8A838"}
          onBlur={e=>e.target.style.borderColor="#1a2638"}/>
        <span style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)",
          color:"#334155", fontSize:14 }}>🔍</span>
      </div>
      <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
        color:"#1e2d45", marginBottom:12 }}>
        {tab==="so" ? `${soFiltered.length} of ${ALL_SO.length}` : `${psrFiltered.length} of ${PSR_PARTS.length}`} shown
      </p>
 
      {/* SO list */}
      {tab==="so" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {soFiltered.map((so, i) => (
            <div key={so.num} style={{ background:"#0a0e1a",
              border:`1px solid ${open===so.num ? so.color+"55" : "#141e30"}`,
              borderRadius:12, overflow:"hidden", transition:"border-color .2s",
              animation:`fadeUp ${.05+i*.015}s ease both` }}>
              <div onClick={() => setOpen(open===so.num ? null : so.num)}
                style={{ padding:"13px 16px", display:"flex", alignItems:"center",
                  gap:12, cursor:"pointer" }}>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                  color:so.color, fontWeight:700, minWidth:40 }}>S.O.{so.num}</span>
                <span style={{ fontSize:16 }}>{so.icon}</span>
                <span style={{ flex:1, fontFamily:"'Syne',sans-serif", fontSize:13,
                  fontWeight:600, color:"#cbd5e1" }}>{so.title}</span>
                <span style={{ color:so.color, fontSize:15, transition:"transform .2s",
                  transform:open===so.num ? "rotate(90deg)" : "none" }}>›</span>
              </div>
              {open===so.num && (
                <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${so.color}18` }}>
                  <p style={{ color:"#64748b", fontFamily:"'Syne',sans-serif",
                    fontSize:13, lineHeight:1.75, paddingTop:12, marginBottom:14 }}>{so.summary}</p>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                    color:so.color, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>
                    🔑 Key Exam Points
                  </p>
                  {so.keyPoints.map((pt, j) => (
                    <div key={j} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start" }}>
                      <div style={{ background:`${so.color}20`, border:`1px solid ${so.color}40`,
                        borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center",
                        justifyContent:"center", flexShrink:0, marginTop:2 }}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8,
                          color:so.color, fontWeight:700 }}>{j+1}</span>
                      </div>
                      <span style={{ color:"#64748b", fontSize:12, lineHeight:1.6, paddingTop:2 }}>{pt}</span>
                    </div>
                  ))}
                  <button onClick={() => onPractice({ type:"so", item:so })}
                    style={{ width:"100%", marginTop:12, padding:"9px", borderRadius:8,
                      background:`${so.color}18`, border:`1px solid ${so.color}33`,
                      color:so.color, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
                      fontSize:9, fontWeight:700, letterSpacing:"0.08em" }}>
                    ✏️ PRACTICE S.O.{so.num} →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
 
      {/* PSR list */}
      {tab==="psr" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {psrFiltered.map((part, i) => (
            <div key={part.id} style={{ background:"#0a0e1a",
              border:`1px solid ${open===part.id ? part.color+"55" : "#141e30"}`,
              borderRadius:12, overflow:"hidden", transition:"border-color .2s",
              animation:`fadeUp ${.05+i*.04}s ease both` }}>
              <div onClick={() => setOpen(open===part.id ? null : part.id)}
                style={{ padding:"13px 16px", display:"flex", alignItems:"center",
                  gap:12, cursor:"pointer" }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{part.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:3 }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                      color:part.color, fontWeight:700 }}>{part.num}</span>
                    <Chip label={part.regs} color={part.color} sm/>
                  </div>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700,
                    fontSize:13, color:"#cbd5e1" }}>{part.title}</p>
                </div>
                <span style={{ color:part.color, fontSize:15, transition:"transform .2s", flexShrink:0,
                  transform:open===part.id ? "rotate(90deg)" : "none" }}>›</span>
              </div>
              {open===part.id && (
                <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${part.color}18` }}>
                  <p style={{ color:"#64748b", fontFamily:"'Syne',sans-serif",
                    fontSize:13, lineHeight:1.75, paddingTop:12, marginBottom:14 }}>{part.summary}</p>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
                    color:part.color, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>
                    🔑 Key Exam Points
                  </p>
                  {part.keyPoints.map((pt, j) => (
                    <div key={j} style={{ display:"flex", gap:10, marginBottom:8, alignItems:"flex-start" }}>
                      <div style={{ background:`${part.color}20`, border:`1px solid ${part.color}40`,
                        borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center",
                        justifyContent:"center", flexShrink:0, marginTop:2 }}>
                        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8,
                          color:part.color, fontWeight:700 }}>{j+1}</span>
                      </div>
                      <span style={{ color:"#64748b", fontSize:12, lineHeight:1.6, paddingTop:2 }}>{pt}</span>
                    </div>
                  ))}
                  <button onClick={() => onPractice({ type:"psr", item:part })}
                    style={{ width:"100%", marginTop:12, padding:"9px", borderRadius:8,
                      background:`${part.color}18`, border:`1px solid ${part.color}33`,
                      color:part.color, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
                      fontSize:9, fontWeight:700, letterSpacing:"0.08em" }}>
                    ✏️ PRACTICE {part.num.toUpperCase()} →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   MANAGEMENT SCREEN
══════════════════════════════════════════════════════════════ */
function ManagementScreen({ onPractice }) {
  const [open, setOpen] = useState(null);
  const [openUnit, setOpenUnit] = useState(null);
  const [examTab, setExamTab] = useState(null);
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"20px 20px 56px" }}>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:24, color:"#e2e8f0", marginBottom:4 }}>Supervisory Management</h2>
        <p style={{ color:"#334155", fontSize:12 }}>CPL/SGT Exam Section 1 · {MGMT_TOPICS.reduce((s,t)=>s+t.units.length,0)} chunked units across {MGMT_TOPICS.length} topics · Theorist names and years</p>
      </div>
      <div style={{ background:"#0a0e1a", border:"1px solid #E8A83828", borderRadius:13, marginBottom:20, overflow:"hidden" }}>
        <div onClick={() => setExamTab(examTab ? null : "open")} style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
          <span style={{ fontSize:20 }}>🎯</span>
          <div style={{ flex:1 }}>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#E8A838", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>Exam Strategy</p>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:"#cbd5e1" }}>MCQ · True/False · Essay Tips</p>
          </div>
          <span style={{ color:"#E8A838", fontSize:16, transform:examTab ? "rotate(90deg)" : "none" }}>›</span>
        </div>
        {examTab && (
          <div style={{ padding:"0 16px 16px", borderTop:"1px solid #E8A83818" }}>
            <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
              {Object.values(EXAM_TIPS).map(t => (
                <button key={t.title} onClick={() => setExamTab(examTab===t.title ? "open" : t.title)} style={{ padding:"7px 14px", borderRadius:8, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:700, background:examTab===t.title ? t.color : "#0f1520", color:examTab===t.title ? "#07090f" : t.color, border:`1px solid ${t.color}33` }}>{t.icon} {t.title.split(" ")[0]}</button>
              ))}
            </div>
            {Object.values(EXAM_TIPS).map(t => examTab===t.title && (
              <div key={t.title}>{t.tips.map((tip, i) => (
                <div key={i} style={{ display:"flex", gap:10, marginBottom:9, alignItems:"flex-start" }}>
                  <div style={{ background:`${t.color}20`, border:`1px solid ${t.color}40`, borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
                    <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:t.color, fontWeight:700 }}>{i+1}</span>
                  </div>
                  <span style={{ color:"#64748b", fontSize:12, lineHeight:1.65, paddingTop:3 }}>{tip}</span>
                </div>
              ))}</div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {MGMT_TOPICS.map((topic, ti) => (
          <div key={topic.id} style={{ background:"#0a0e1a", border:`1px solid ${open===topic.id ? topic.color+"55" : "#141e30"}`, borderRadius:13, overflow:"hidden", transition:"border-color .2s", animation:`fadeUp ${.05+ti*.04}s ease both` }}>
            <div onClick={() => { setOpen(open===topic.id ? null : topic.id); setOpenUnit(null); }} style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{topic.icon}</span>
              <div style={{ flex:1 }}><Chip label={topic.units.length + " units"} color={topic.color} sm/><p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:"#cbd5e1", marginTop:4 }}>{topic.title}</p></div>
              <span style={{ color:topic.color, fontSize:16, transition:"transform .2s", flexShrink:0, transform:open===topic.id ? "rotate(90deg)" : "none" }}>›</span>
            </div>
            {open===topic.id && (
              <div style={{ padding:"0 16px 16px", borderTop:`1px solid ${topic.color}18` }}>
                <div style={{ background:`${topic.color}08`, border:`1px solid ${topic.color}18`, borderRadius:10, padding:"12px 14px", margin:"14px 0" }}>
                  <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.75 }}>{topic.overview}</p>
                </div>
                {topic.units.map((unit, j) => (
                  <div key={unit.uid} style={{ marginBottom:10, background:"#0f1520", border:`1px solid ${openUnit===unit.uid ? topic.color+"44" : "#1a2638"}`, borderRadius:10, overflow:"hidden" }}>
                    <div onClick={() => setOpenUnit(openUnit===unit.uid ? null : unit.uid)} style={{ padding:"11px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:topic.color, fontWeight:700, minWidth:24 }}>{j+1}.</span>
                      <p style={{ flex:1, color:"#94a3b8", fontSize:13, fontWeight:600 }}>{unit.topic}</p>
                      <span style={{ color:topic.color, fontSize:13, transition:"transform .2s", flexShrink:0, transform:openUnit===unit.uid ? "rotate(90deg)" : "none" }}>›</span>
                    </div>
                    {openUnit===unit.uid && (
                      <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${topic.color}15` }}>
                        <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#334155", letterSpacing:"0.12em", textTransform:"uppercase", marginTop:10, marginBottom:6 }}>📄 Source / Theoretical Basis</p>
                        <p style={{ color:"#475569", fontSize:12, lineHeight:1.75, background:"#07090f", padding:"10px 12px", borderRadius:7, borderLeft:`2px solid ${topic.color}`, marginBottom:12 }}>{unit.raw}</p>
                        <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:topic.color, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:7 }}>🔑 Key Elements</p>
                        {unit.elements.map((el, k) => (
                          <div key={k} style={{ display:"flex", gap:8, marginBottom:7, alignItems:"flex-start" }}><span style={{ color:topic.color, fontSize:9, paddingTop:3, fontFamily:"'JetBrains Mono',monospace", flexShrink:0 }}>▸</span><span style={{ color:"#64748b", fontSize:12, lineHeight:1.65 }}>{el}</span></div>
                        ))}
                        <div style={{ background:"#0a0e1a", border:`1px solid ${topic.color}22`, borderRadius:8, padding:"10px 12px", marginTop:12, marginBottom:10 }}>
                          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#38C172", letterSpacing:"0.1em", marginBottom:6 }}>💡 PLAIN ENGLISH</p>
                          <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.7 }}>{unit.plain_english}</p>
                        </div>
                        <div style={{ background:"#0a0e1a", border:"1px solid #E8A83822", borderRadius:8, padding:"10px 12px", marginBottom:10 }}>
                          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#E8A838", letterSpacing:"0.1em", marginBottom:6 }}>🧠 EXAM QUESTION</p>
                          <p style={{ color:"#cbd5e1", fontSize:13, lineHeight:1.65, fontFamily:"'Cormorant Garamond',serif" }}>{unit.test_question}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => onPractice({ type:"mgmt", item:topic })} style={{ width:"100%", padding:"11px", borderRadius:9, marginTop:4, background:`${topic.color}18`, border:`1px solid ${topic.color}33`, color:topic.color, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:700, letterSpacing:"0.08em" }}>✏️ PRACTICE — {topic.title.toUpperCase()} →</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   LEGISLATION SCREEN
══════════════════════════════════════════════════════════════ */
function LegislationScreen({ onPractice }) {
  const [openAct, setOpenAct] = useState(null);
  const [openUnit, setOpenUnit] = useState(null);
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"20px 20px 56px" }}>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:24, color:"#e2e8f0", marginBottom:4 }}>Legislation</h2>
        <p style={{ color:"#334155", fontSize:12 }}>{LEGISLATION.length} Acts · {LEGISLATION.reduce((s,a)=>s+a.units.length,0)} statutory sections · Cross-referenced with S.O. and PSR</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {LEGISLATION.map((act, i) => (
          <div key={act.id} style={{ background:"#0a0e1a", border:`1px solid ${openAct===act.id ? act.color+"55" : "#141e30"}`, borderRadius:13, overflow:"hidden", transition:"border-color .2s", animation:`fadeUp ${.05+i*.03}s ease both` }}>
            <div onClick={() => { setOpenAct(openAct===act.id ? null : act.id); setOpenUnit(null); }} style={{ padding:"14px 16px", display:"flex", alignItems:"center", gap:12, cursor:"pointer" }}>
              <span style={{ fontSize:20, flexShrink:0 }}>{act.icon}</span>
              <div style={{ flex:1 }}>
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:act.color, letterSpacing:"0.08em", marginBottom:2 }}>{act.subtitle}</p>
                <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:"#cbd5e1" }}>{act.title}</p>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}><Chip label={act.units.length + " sections"} color={act.color} sm/><span style={{ color:act.color, fontSize:16, transform:openAct===act.id ? "rotate(90deg)" : "none" }}>›</span></div>
            </div>
            {openAct===act.id && (
              <div style={{ padding:"0 16px 18px", borderTop:`1px solid ${act.color}18` }}>
                <div style={{ background:`${act.color}08`, border:`1px solid ${act.color}18`, borderRadius:10, padding:"12px 14px", margin:"14px 0" }}>
                  <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.75 }}>{act.overview}</p>
                </div>
                {act.units.map((unit, j) => (
                  <div key={unit.uid} style={{ marginBottom:8, background:"#0f1520", border:`1px solid ${openUnit===unit.uid ? act.color+"44" : "#1a2638"}`, borderRadius:10, overflow:"hidden" }}>
                    <div onClick={() => setOpenUnit(openUnit===unit.uid ? null : unit.uid)} style={{ padding:"11px 14px", display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}>
                      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:act.color, fontWeight:700, minWidth:24, flexShrink:0 }}>{j+1}.</span>
                      <p style={{ flex:1, color:"#94a3b8", fontSize:13, fontWeight:600 }}>{unit.topic}</p>
                      <span style={{ color:act.color, fontSize:13, transition:"transform .2s", flexShrink:0, transform:openUnit===unit.uid ? "rotate(90deg)" : "none" }}>›</span>
                    </div>
                    {openUnit===unit.uid && (
                      <div style={{ padding:"0 14px 14px", borderTop:`1px solid ${act.color}15` }}>
                        <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#334155", letterSpacing:"0.12em", textTransform:"uppercase", marginTop:10, marginBottom:6 }}>📄 Statutory Text</p>
                        <p style={{ color:"#475569", fontSize:12, lineHeight:1.75, background:"#07090f", padding:"10px 12px", borderRadius:7, borderLeft:`2px solid ${act.color}`, marginBottom:12 }}>{unit.raw}</p>
                        <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:act.color, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:7 }}>🔑 Key Elements</p>
                        {unit.elements.map((el, k) => (
                          <div key={k} style={{ display:"flex", gap:8, marginBottom:7, alignItems:"flex-start" }}><span style={{ color:act.color, fontSize:9, paddingTop:3, fontFamily:"'JetBrains Mono',monospace", flexShrink:0 }}>▸</span><span style={{ color:"#64748b", fontSize:12, lineHeight:1.6 }}>{el}</span></div>
                        ))}
                        {unit.cross_refs && unit.cross_refs.length > 0 && (
                          <div style={{ background:"#0a0e1a", border:"1px solid #4A90D922", borderRadius:8, padding:"10px 12px", marginTop:10, marginBottom:10 }}>
                            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#4A90D9", letterSpacing:"0.1em", marginBottom:7 }}>🔗 CROSS-REFERENCES</p>
                            {unit.cross_refs.map((ref, k) => (
                              <div key={k} style={{ display:"flex", gap:8, marginBottom:5, alignItems:"flex-start" }}><span style={{ color:"#4A90D9", fontSize:9, paddingTop:2, flexShrink:0 }}>↗</span><span style={{ color:"#475569", fontSize:11, lineHeight:1.55 }}>{ref}</span></div>
                            ))}
                          </div>
                        )}
                        <button onClick={() => onPractice({ type:"leg", item:act, unit:unit })} style={{ width:"100%", padding:"9px", borderRadius:8, marginTop:4, background:`${act.color}18`, border:`1px solid ${act.color}33`, color:act.color, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontSize:9, fontWeight:700, letterSpacing:"0.08em" }}>✏️ PRACTICE — {unit.topic.split("—")[0].trim().toUpperCase()} →</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   PAST PAPERS — extracted bank + keyword study hints
══════════════════════════════════════════════════════════════ */
function paperExamTrack(paper) {
  const s = paper?.subject || "";
  const pid = String(paper?.paper_id || "").toLowerCase();
  if (s === "Law") return "law";
  if (s === "Police Supervision/Management" || s === "Business Communication") return "management";
  if (s === "Police Duties") return "duties";
  if (pid.includes("law")) return "law";
  if (pid.includes("management") || pid.includes("supervision")) return "management";
  if (pid.includes("duties") || pid.includes("police-duties")) return "duties";
  return "duties";
}

const MODEL_BY_CHUNK = (() => {
  const m = {};
  const t = questionBankModelAnswers?.tracks || {};
  for (const key of ["duties", "law", "management"]) {
    for (const row of t[key] || []) {
      if (row?.qid) m[row.qid] = row;
    }
  }
  return m;
})();

function AnswerLine({ line }) {
  if (!line) return null;
  const parts = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let k = 0;
  let match;
  while ((match = re.exec(line)) !== null) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    parts.push(<strong key={`b${k++}`} style={{ color:"#e2e8f0", fontWeight:600 }}>{match[1]}</strong>);
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return <>{parts}</>;
}

function AnswerBody({ text }) {
  if (!text) return null;
  const lines = String(text).split("\n");
  return lines.map((line, idx) => (
    <p key={idx} style={{ marginBottom: line ? 6 : 2, fontSize:12, lineHeight:1.55, color:"#cbd5e1" }}>
      <AnswerLine line={line} />
    </p>
  ));
}

function findModelHintsForQuestion(text, tags) {
  const hay = ((text || "") + " " + (Array.isArray(tags) ? tags.join(" ") : "")).toLowerCase();
  const hits = [];
  for (const block of modelHints.by_keyword || []) {
    if (!block.keywords || !block.bullets) continue;
    if (block.keywords.some(kw => hay.includes(String(kw).toLowerCase()))) hits.push(block);
    if (hits.length >= 2) break;
  }
  return hits;
}
 
function PastPapersScreen({ onBack }) {
  const [paperId, setPaperId] = useState("");
  const [subj, setSubj]       = useState("");
  const [rank, setRank]      = useState("");
  const [year, setYear]     = useState("");
  const [kind, setKind]     = useState("all");
  const [examTrack, setExamTrack] = useState("");
  const [search, setSearch] = useState("");
  const [reveal, setReveal]   = useState({});
  const [showN, setShowN]   = useState(80);
 
  const paperById = useMemo(() => {
    const m = {};
    for (const p of pastQuestions.papers || []) m[p.paper_id] = p;
    return m;
  }, []);

  const rows = useMemo(() => {
    return (questionChunks.chunks || []).map(ch => ({
      ch,
      paper: paperById[ch.paper_id],
      kind: ch.kind,
    })).filter(r => r.paper);
  }, [paperById]);
 
  const papers = pastQuestions.papers || [];
  const subjects = useMemo(() => [...new Set(papers.map(p => p.subject).filter(Boolean))].sort(), [papers]);
  const ranks    = useMemo(() => [...new Set(papers.map(p => p.rank).filter(Boolean))].sort(), [papers]);
  const years    = useMemo(() => [...new Set(papers.map(p => p.year).filter(y => y != null))].sort((a,b)=>b-a), [papers]);
 
  const sq = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (paperId && r.paper.paper_id !== paperId) return false;
      if (subj && r.paper.subject !== subj) return false;
      if (rank && r.paper.rank !== rank) return false;
      if (year && String(r.paper.year) !== year) return false;
      if (kind === "long" && r.kind !== "long") return false;
      if (kind === "mcq" && r.kind !== "mcq") return false;
      if (examTrack && r.ch.track !== examTrack) return false;
      if (sq) {
        const blob = (r.ch.question_text || "") + " " + (r.ch.topic_tags || []).join(" ") + " " + (r.paper.filename || "");
        if (!blob.toLowerCase().includes(sq)) return false;
      }
      return true;
    });
  }, [rows, paperId, subj, rank, year, kind, examTrack, sq]);
 
  const slice = filtered.slice(0, showN);
 
  function toggleReveal(id) {
    setReveal(v => ({ ...v, [id]: !v[id] }));
  }
 
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"20px 20px 56px" }}>
      <button type="button" onClick={onBack}
        style={{ background:"transparent", border:"1px solid #1a2638", color:"#64748b",
          padding:"6px 12px", borderRadius:8, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
          fontSize:9, marginBottom:16, letterSpacing:"0.06em" }}>← BACK</button>
      <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:24, color:"#e2e8f0", marginBottom:4 }}>Past papers & question bank</h2>
      <p style={{ color:"#334155", fontSize:12, marginBottom:14 }}>
        {pastQuestions.paper_count} papers · {pastQuestions.question_count} long-form + {pastQuestions.mcq_count} MCQs in bank · <strong style={{ color:"#94a3b8" }}>{questionChunks.total_chunks || 0} study chunks</strong> (compound OCR split). Reveal: outlines, <strong style={{ color:"#94a3b8" }}>repo sources & gaps</strong>, and draft model answers — confirm in official law/S.O. texts.
      </p>
 
      <div style={{ display:"grid", gap:10, marginBottom:16,
        gridTemplateColumns:"repeat(auto-fill, minmax(140px, 1fr))" }}>
        <select value={paperId} onChange={e => { setPaperId(e.target.value); setShowN(80); }}
          style={{ background:"#0a0e1a", border:"1px solid #1a2638", borderRadius:8, padding:"8px", color:"#cbd5e1", fontSize:12 }}>
          <option value="">All papers</option>
          {papers.map(p => (
            <option key={p.paper_id} value={p.paper_id}>{p.rank} {p.subject} {p.year}</option>
          ))}
        </select>
        <select value={subj} onChange={e => { setSubj(e.target.value); setShowN(80); }} style={{ background:"#0a0e1a", border:"1px solid #1a2638", borderRadius:8, padding:"8px", color:"#cbd5e1", fontSize:12 }}>
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={rank} onChange={e => { setRank(e.target.value); setShowN(80); }} style={{ background:"#0a0e1a", border:"1px solid #1a2638", borderRadius:8, padding:"8px", color:"#cbd5e1", fontSize:12 }}>
          <option value="">All ranks</option>
          {ranks.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={year} onChange={e => { setYear(e.target.value); setShowN(80); }} style={{ background:"#0a0e1a", border:"1px solid #1a2638", borderRadius:8, padding:"8px", color:"#cbd5e1", fontSize:12 }}>
          <option value="">All years</option>
          {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select value={kind} onChange={e => { setKind(e.target.value); setShowN(80); }} style={{ background:"#0a0e1a", border:"1px solid #1a2638", borderRadius:8, padding:"8px", color:"#cbd5e1", fontSize:12 }}>
          <option value="all">All types</option>
          <option value="long">Long-form only</option>
          <option value="mcq">MCQ only</option>
        </select>
        <select value={examTrack} onChange={e => { setExamTrack(e.target.value); setShowN(80); }} style={{ background:"#0a0e1a", border:"1px solid #1a2638", borderRadius:8, padding:"8px", color:"#cbd5e1", fontSize:12 }}>
          <option value="">All exam tracks</option>
          <option value="duties">Duties (Police Duties)</option>
          <option value="law">Law</option>
          <option value="management">Management / Supervision</option>
        </select>
      </div>
      <input value={search} onChange={e => { setSearch(e.target.value); setShowN(80); }} placeholder="Search question text or tags…"
        style={{ width:"100%", background:"#0a0e1a", border:"1px solid #1a2638", borderRadius:10, padding:"10px 14px",
          color:"#dde3ef", fontSize:13, marginBottom:12, outline:"none" }}/>
      <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#475569", marginBottom:10 }}>
        Showing {slice.length} of {filtered.length} matches
      </p>
 
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {slice.map(({ kind, paper, ch }) => {
          const hints = findModelHintsForQuestion(ch.question_text, ch.topic_tags);
          const rid = ch.chunk_id;
          const open = !!reveal[rid];
          const track = ch.track || paperExamTrack(paper);
          const bankRow = MODEL_BY_CHUNK[ch.chunk_id];
          const refs = ch.material_refs || [];
          const gaps = ch.material_gaps || [];
          const partLabel = (ch.part_count || 1) > 1 ? `Part ${(ch.part_index || 0) + 1}/${ch.part_count}` : null;
          return (
            <div key={rid} style={{ background:"#0a0e1a", border:"1px solid #38b2a133", borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8, alignItems:"center" }}>
                <Chip label={`${paper.rank} · ${paper.subject} · ${paper.year}`} color="#38b2a1" sm/>
                <Chip label={track === "law" ? "Law" : track === "management" ? "Management" : "Duties"} color={track === "law" ? "#7c3aed" : track === "management" ? "#c9a227" : "#2d8a78"} sm/>
                {ch.number != null && <Chip label={`Q${ch.number}`} color="#334155" sm/>}
                {partLabel && <Chip label={partLabel} color="#64748b" sm/>}
                {ch.marks != null && <Chip label={`${ch.marks} marks`} color="#64748b" sm/>}
                <Chip label={kind === "mcq" ? "MCQ" : (ch.type || "Question")} color="#4A90D9" sm/>
                {(ch.topic_tags || []).slice(0, 3).map(t => (
                  <Chip key={t} label={t} color="#334155" sm/>
                ))}
              </div>
              <p style={{ color:"#64748b", fontSize:10, fontFamily:"'JetBrains Mono',monospace", marginBottom:6 }}>{ch.parent_qid}</p>
              <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.55, whiteSpace:"pre-wrap" }}>{ch.question_text}</p>
              {kind === "mcq" && ch.options && (
                <div style={{ marginTop:10, padding:"10px", background:"#07090f", borderRadius:8, border:"1px solid #1a2638" }}>
                  {["A","B","C","D"].map(k => ch.options[k] && (
                    <p key={k} style={{ fontSize:12, color:"#64748b", marginBottom:4 }}><span style={{ color:"#E8A838", fontFamily:"'JetBrains Mono',monospace" }}>{k}.</span> {ch.options[k]}</p>
                  ))}
                  <p style={{ fontSize:11, color:"#475569", marginTop:8 }}>Correct key not stored in this bank — eliminate wrong options using your notes, then verify against the paper source if available.</p>
                </div>
              )}
              <button type="button" onClick={() => toggleReveal(rid)}
                style={{ marginTop:10, padding:"8px 14px", borderRadius:8, cursor:"pointer", border:"1px solid #38b2a155",
                  background: open ? "#38b2a122" : "transparent", color:"#38b2a1",
                  fontFamily:"'JetBrains Mono',monospace", fontSize:10, fontWeight:700 }}>
                {open ? "▲ Hide hints & model answer" : "▼ Reveal hints & model answer"}
              </button>
              {open && (
                <div style={{ marginTop:10, padding:"12px", background:"#0f1520", borderRadius:10, border:"1px solid #38b2a128" }}>
                  {(refs.length > 0 || gaps.length > 0) && (
                    <div style={{ marginBottom:14 }}>
                      {refs.length > 0 && (
                        <div style={{ marginBottom:10 }}>
                          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#22c55e", letterSpacing:"0.06em", marginBottom:6 }}>Material in this repo (open in Cursor)</p>
                          <ul style={{ margin:0, paddingLeft:18, color:"#94a3b8", fontSize:11, lineHeight:1.5 }}>
                            {refs.map((ref, i) => (
                              <li key={i} style={{ marginBottom:4 }}>
                                <span style={{ color:"#cbd5e1" }}>{ref.category}</span>
                                {ref.source_path && <span style={{ color:"#64748b" }}> — {ref.source_path}</span>}
                                {ref.note && <span style={{ color:"#475569" }}> ({ref.note})</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {gaps.length > 0 && (
                        <div>
                          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#f97316", letterSpacing:"0.06em", marginBottom:6 }}>Missing — add or mount so answers can cite primary text</p>
                          <ul style={{ margin:0, paddingLeft:18, color:"#fca5a5", fontSize:11, lineHeight:1.5 }}>
                            {gaps.map((g, i) => (
                              <li key={i} style={{ marginBottom:4 }}>
                                <strong style={{ color:"#fdba74" }}>[{g.category}]</strong> {g.need}
                                {g.reason && <span style={{ color:"#94a3b8" }}> — {g.reason}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#64748b", letterSpacing:"0.06em", marginBottom:10 }}>Keyword outlines</p>
                  {hints.length === 0 && (
                    <p style={{ color:"#64748b", fontSize:12, lineHeight:1.6 }}>
                      No keyword outline matched. Use Study Notes / Legislation / PSR screens and cite authority (S.O. no., Reg no., Act section) in your own model answer.
                    </p>
                  )}
                  {hints.map((h, i) => (
                    <div key={i} style={{ marginBottom: hints.length - 1 === i ? 0 : 14 }}>
                      <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#38b2a1", letterSpacing:"0.08em", marginBottom:6 }}>{h.title}</p>
                      <ul style={{ margin:0, paddingLeft:18, color:"#94a3b8", fontSize:12, lineHeight:1.55 }}>
                        {h.bullets.map((b, j) => <li key={j} style={{ marginBottom:4 }}>{b}</li>)}
                      </ul>
                    </div>
                  ))}
                  {bankRow?.model_answer && (
                    <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid #1a2638" }}>
                      <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#94a3b8", letterSpacing:"0.06em", marginBottom:8 }}>Model answer (draft) · {bankRow.track}</p>
                      <AnswerBody text={bankRow.model_answer} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filtered.length > showN && (
        <button type="button" onClick={() => setShowN(n => n + 80)}
          style={{ width:"100%", marginTop:14, padding:"12px", borderRadius:10, border:"1px solid #38b2a144",
            background:"#0a0e1a", color:"#38b2a1", cursor:"pointer", fontFamily:"'JetBrains Mono',monospace", fontSize:10 }}>
          Load more ({filtered.length - showN} remaining)
        </button>
      )}
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   DEPARTMENTAL ORDERS — compact OCR previews
══════════════════════════════════════════════════════════════ */
function DeptOrdersScreen({ onBack }) {
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState(null);
  const orders = deptOrdersIndex.orders || [];
  const cq = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!cq) return orders;
    return orders.filter(o =>
      String(o.title).toLowerCase().includes(cq) ||
      String(o.id).toLowerCase().includes(cq) ||
      String(o.year).includes(cq) ||
      String(o.do_num).includes(cq)
    );
  }, [orders, cq]);
 
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"20px 20px 56px" }}>
      <button type="button" onClick={onBack}
        style={{ background:"transparent", border:"1px solid #1a2638", color:"#64748b",
          padding:"6px 12px", borderRadius:8, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
          fontSize:9, marginBottom:16, letterSpacing:"0.06em" }}>← BACK</button>
      <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:24, color:"#e2e8f0", marginBottom:4 }}>Departmental Orders</h2>
      <p style={{ color:"#334155", fontSize:12, marginBottom:14 }}>
        {deptOrdersIndex.count} orders indexed from OCR/text extracts. Full text lives under <span style={{ color:"#94a3b8" }}>source-docs/dept-orders/</span> in the project — this view is for quick lookup and revision.
      </p>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search title or DO number…"
        style={{ width:"100%", background:"#0a0e1a", border:"1px solid #1a2638", borderRadius:10, padding:"10px 14px",
          color:"#dde3ef", fontSize:13, marginBottom:12, outline:"none" }}/>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {filtered.map(o => {
          const exp = openId === o.id;
          return (
            <div key={o.id} style={{ background:"#0a0e1a", border:"1px solid #c9a22733", borderRadius:12, overflow:"hidden" }}>
              <button type="button" onClick={() => setOpenId(exp ? null : o.id)}
                style={{ width:"100%", textAlign:"left", padding:"12px 14px", background:"transparent", border:"none",
                  cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:10 }}>
                <div>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#c9a227", marginBottom:4 }}>DO {o.do_num} · {o.year}</p>
                  <p style={{ color:"#cbd5e1", fontSize:14, fontWeight:600 }}>{o.title}</p>
                  <p style={{ fontSize:10, color:"#475569", marginTop:4 }}>{o.pages} pp · {o.verdict || "?"} · {o.chars_total != null ? `${o.chars_total} chars` : ""}</p>
                </div>
                <span style={{ color:"#c9a227", fontSize:14 }}>{exp ? "▲" : "▼"}</span>
              </button>
              {exp && (
                <div style={{ padding:"0 14px 14px", borderTop:"1px solid #c9a22718" }}>
                  <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#64748b", marginBottom:6 }}>OCR preview</p>
                  <p style={{ color:"#64748b", fontSize:12, lineHeight:1.55, whiteSpace:"pre-wrap" }}>{o.preview || "—"}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   EXTERNAL LAW LIBRARY — indexed D:\\T&T LAWS AND PROMOTION EXAMS
══════════════════════════════════════════════════════════════ */
function ExternalLibraryScreen({ onBack }) {
  const s = externalCorpusSummary;
  const [q, setQ] = useState("");
  const cq = q.trim().toLowerCase();
  const paths = s.paths || [];
  const hits = useMemo(() => {
    if (!cq) return [];
    return paths.filter(p => p.toLowerCase().includes(cq)).slice(0, 120);
  }, [cq, paths]);
  const when = s.generatedAt
    ? new Date(s.generatedAt).toLocaleString(undefined, { dateStyle:"medium", timeStyle:"short" })
    : "";
  return (
    <div style={{ maxWidth:720, margin:"0 auto", padding:"20px 20px 56px" }}>
      <button type="button" onClick={onBack}
        style={{ background:"transparent", border:"1px solid #1a2638", color:"#64748b",
          padding:"6px 12px", borderRadius:8, cursor:"pointer", fontFamily:"'JetBrains Mono',monospace",
          fontSize:9, marginBottom:16, letterSpacing:"0.06em" }}>← BACK</button>
      <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700, fontSize:24, color:"#e2e8f0", marginBottom:6 }}>Personal law library</h2>
      <p style={{ color:"#334155", fontSize:12, lineHeight:1.5, marginBottom:14 }}>
        Indexed catalogue of your study folder (cases, laws, criminal law notes, standing orders, promotion materials). The app bundles the index only — files stay on your PC. Re-run <span style={{ color:"#94a3b8" }}>python tools/index_external_corpus.py</span> after you add or rename documents.
      </p>
      <div style={{ background:"#0a0e1a", border:"1px solid #141e30", borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
        <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#64748b", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:6 }}>Folder path</p>
        <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:"#94a3b8", wordBreak:"break-all", lineHeight:1.45 }}>{s.rootPath}</p>
        <p style={{ marginTop:10, fontSize:11, color:"#475569" }}>
          {s.indexed ? (
            <><strong style={{ color:"#cbd5e1" }}>{s.totalFiles}</strong> files indexed{when ? <> · updated {when}</> : null}</>
          ) : (
            <span style={{ color:"#c8841a" }}>{s.error || "Folder not available on this machine."}</span>
          )}
        </p>
      </div>
      <div style={{ background:"#0a0e1a", border:"1px solid #4A90D922", borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
        <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#4A90D9", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Authoritative current law (verify amendments)</p>
        {(s.officialSources || []).map((o, i) => (
          <div key={i} style={{ marginBottom:8 }}>
            <a href={o.url} target="_blank" rel="noopener noreferrer"
              style={{ color:"#4A90D9", fontSize:13, textDecoration:"underline" }}>{o.label}</a>
          </div>
        ))}
      </div>
      {s.stalenessNotes && s.stalenessNotes.length > 0 && (
        <div style={{ background:"#0f1520", border:"1px solid #E8A83833", borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#E8A838", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Keeping material current</p>
          {s.stalenessNotes.map((t, i) => (
            <p key={i} style={{ color:"#64748b", fontSize:12, lineHeight:1.55, marginBottom:i < s.stalenessNotes.length - 1 ? 8 : 0 }}>• {t}</p>
          ))}
        </div>
      )}
      {s.byExtension && Object.keys(s.byExtension).length > 0 && (
        <div style={{ marginBottom:16 }}>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#64748b", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>File types</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {Object.entries(s.byExtension).slice(0, 14).map(([ext, n]) => (
              <span key={ext} style={{ background:"#0f1520", border:"1px solid #1a2638", borderRadius:7,
                padding:"4px 10px", fontFamily:"'JetBrains Mono',monospace", fontSize:9, color:"#94a3b8" }}>
                {ext} <span style={{ color:"#E8A838" }}>{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {s.topFolders && s.topFolders.length > 0 && (
        <div style={{ marginBottom:18 }}>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#64748b", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Top folders</p>
          <div style={{ display:"grid", gap:6 }}>
            {s.topFolders.slice(0, 12).map((f, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", background:"#0f1520",
                border:"1px solid #141e30", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
                <span style={{ color:"#94a3b8" }}>{f.name}</span>
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#E8A838" }}>{f.files}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {paths.length > 0 && (
        <>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8, color:"#64748b", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:8 }}>Search filenames (first 120 matches)</p>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. bail, firearm, sergeant…"
            style={{ width:"100%", background:"#0a0e1a", border:"1px solid #1a2638", borderRadius:10,
              padding:"10px 14px", color:"#dde3ef", fontFamily:"'Syne',sans-serif", fontSize:13, outline:"none", marginBottom:10 }}/>
          <div style={{ maxHeight:280, overflowY:"auto", background:"#07090f", border:"1px solid #141e30", borderRadius:10, padding:"8px 0" }}>
            {(cq ? hits : []).length === 0 && cq && (
              <p style={{ padding:"12px 14px", color:"#475569", fontSize:12 }}>No matches.</p>
            )}
            {!cq && (
              <p style={{ padding:"12px 14px", color:"#475569", fontSize:12 }}>Type a keyword to search {paths.length.toLocaleString()} paths.</p>
            )}
            {hits.map((p, i) => (
              <div key={i} style={{ padding:"5px 14px", fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:"#64748b", lineHeight:1.4 }}>{p}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   PRACTICE PICKER
══════════════════════════════════════════════════════════════ */
function PracticePicker({ onStart }) {
  const [tab, setTab] = useState("so");
  const [search, setSearch] = useState("");
 
  const q = search.toLowerCase();
  const soF   = ALL_SO.filter(s => s.title.toLowerCase().includes(q) || String(s.num).includes(search));
  const psrF  = PSR_PARTS.filter(p => p.title.toLowerCase().includes(q));
  const mgmtF = MGMT_TOPICS.filter(t => t.title.toLowerCase().includes(q) || t.overview.toLowerCase().includes(q));
  const legF  = LEGISLATION.filter(a => a.title.toLowerCase().includes(q) || (a.subtitle||"").toLowerCase().includes(q));
 
  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"20px 20px 56px" }}>
      <div style={{ marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:700,
          fontSize:24, color:"#e2e8f0", marginBottom:4 }}>Short Answer Practice</h2>
        <p style={{ color:"#334155", fontSize:12 }}>
          Select any S.O. or PSR Part — get 5 AI-generated questions, marked instantly
        </p>
      </div>
 
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        {[{id:"so",label:`📜 S.O.`},{id:"psr",label:`📘 PSR`},{id:"mgmt",label:`🎓 Mgmt`},{id:"leg",label:`📚 Leg`}].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(""); }}
            style={{ padding:"8px 16px", borderRadius:8, cursor:"pointer",
              fontFamily:"'JetBrains Mono',monospace", fontSize:10,
              background: tab===t.id ? "#E8A838" : "#0a0e1a",
              color: tab===t.id ? "#07090f" : "#475569",
              border: tab===t.id ? "none" : "1px solid #1a2638",
              fontWeight: tab===t.id ? 700 : 400, transition:"all .18s" }}>{t.label}</button>
        ))}
      </div>
 
      <div style={{ position:"relative", marginBottom:12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
          style={{ width:"100%", background:"#0a0e1a", border:"1px solid #1a2638",
            borderRadius:10, padding:"10px 16px 10px 38px", color:"#dde3ef",
            fontFamily:"'Syne',sans-serif", fontSize:13, outline:"none" }}/>
        <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)",
          color:"#334155", fontSize:14 }}>🔍</span>
      </div>
 
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {tab==="so" ? soF.map((so, i) => (
          <div key={so.num} onClick={() => onStart({ type:"so", item:so })} className="lift"
            style={{ background:"#0a0e1a", border:`1px solid ${so.color}22`,
              borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center",
              gap:12, animation:`fadeUp ${.05+i*.015}s ease both` }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
              color:so.color, minWidth:40, fontWeight:700 }}>S.O.{so.num}</span>
            <span style={{ fontSize:16 }}>{so.icon}</span>
            <div style={{ flex:1 }}>
              <p style={{ color:"#cbd5e1", fontSize:13, fontWeight:500 }}>{so.title}</p>
              <p style={{ color:"#334155", fontSize:10, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>
                5 questions · AI-graded · Standing Orders 2001
              </p>
            </div>
            <span style={{ color:so.color, fontSize:16 }}>→</span>
          </div>
        )) : tab==="psr" ? psrF.map((part, i) => (
          <div key={part.id} onClick={() => onStart({ type:"psr", item:part })} className="lift"
            style={{ background:"#0a0e1a", border:`1px solid ${part.color}22`,
              borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center",
              gap:12, animation:`fadeUp ${.05+i*.04}s ease both` }}>
            <span style={{ fontSize:18 }}>{part.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", gap:7, marginBottom:3 }}>
                <Chip label={part.num} color={part.color} sm/>
                <Chip label={part.regs} color={part.color} sm/>
              </div>
              <p style={{ color:"#cbd5e1", fontSize:13, fontWeight:500 }}>{part.title}</p>
              <p style={{ color:"#334155", fontSize:10, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>
                5 questions · AI-graded · PSR 2007
              </p>
            </div>
            <span style={{ color:part.color, fontSize:16 }}>→</span>
          </div>
        )) : tab==="mgmt" ? mgmtF.map((topic, i) => (
          <div key={topic.id} onClick={() => onStart({ type:"mgmt", item:topic })} className="lift"
            style={{ background:"#0a0e1a", border:`1px solid ${topic.color}22`,
              borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center",
              gap:12, animation:`fadeUp ${.05+i*.04}s ease both` }}>
            <span style={{ fontSize:18 }}>{topic.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", gap:7, marginBottom:3 }}>
                <Chip label={`${topic.units.length} unit${topic.units.length===1?"":"s"}`} color={topic.color} sm/>
              </div>
              <p style={{ color:"#cbd5e1", fontSize:13, fontWeight:500 }}>{topic.title}</p>
              <p style={{ color:"#334155", fontSize:10, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>
                5 questions · AI-graded · Supervisory Management
              </p>
            </div>
            <span style={{ color:topic.color, fontSize:16 }}>→</span>
          </div>
        )) : tab==="leg" ? legF.map((act, i) => (
          <div key={act.id} onClick={() => onStart({ type:"leg", item:act })} className="lift"
            style={{ background:"#0a0e1a", border:`1px solid ${act.color}22`,
              borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center",
              gap:12, animation:`fadeUp ${.05+i*.04}s ease both` }}>
            <span style={{ fontSize:18 }}>{act.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", gap:7, marginBottom:3, flexWrap:"wrap" }}>
                <Chip label={`${act.units.length} section${act.units.length===1?"":"s"}`} color={act.color} sm/>
                {act.subtitle && <Chip label={act.subtitle} color={act.color} sm/>}
              </div>
              <p style={{ color:"#cbd5e1", fontSize:13, fontWeight:500 }}>{act.title}</p>
              <p style={{ color:"#334155", fontSize:10, fontFamily:"'JetBrains Mono',monospace", marginTop:2 }}>
                5 questions · AI-graded · Legislation
              </p>
            </div>
            <span style={{ color:act.color, fontSize:16 }}>→</span>
          </div>
        )) : null}
      </div>
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   PRACTICE SESSION
══════════════════════════════════════════════════════════════ */
function PracticeSession({ config, onFinish }) {
  const { type, item } = config;
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [idx, setIdx]             = useState(0);
  const [text, setText]           = useState("");
  const [grading, setGrading]     = useState(false);
  const [results, setResults]     = useState([]);
  const color = item.color;
  const label = type==="so" ? `S.O.${item.num} — ${item.title}` : type==="mgmt" ? item.title : type==="leg" ? item.title : `${item.num} — ${item.title}`;
 
  useEffect(() => {
    (async () => {
      try {
        const sys = type==="so" ? SO_SYS(item) : type==="mgmt" ? MGMT_SYS(item) : type==="leg" ? LEG_SYS(item, config.unit||item.units[0]) : PSR_SYS(item);
        const json = await callClaude(sys, `Generate 5 questions for ${label}`);
        setQuestions(JSON.parse(json));
      } catch { setError("Failed to generate questions. Please try again."); }
      setLoading(false);
    })();
  }, []);
 
  async function submit() {
    if (!text.trim()) return;
    setGrading(true);
    const q = questions[idx];
    const src = type==="so" ? `TTPS Standing Orders S.O.${item.num}` : type==="mgmt" ? "Supervisory Management — " + item.title : type==="leg" ? item.title : `Police Service Regulations 2007 ${item.num}`;
    try {
      const raw = await callClaude(GRADE_SYS(src),
        `Question: ${q.question}\nModel Answer: ${q.modelAnswer}\nKey Points: ${q.keyPoints.join("; ")}\nCandidate Answer: ${text}`, 800);
      const grade = JSON.parse(raw);
      const nr = [...results, { question:q, userAnswer:text, grade }];
      setResults(nr);
      if (idx+1 < questions.length) { setIdx(i => i+1); setText(""); }
      else {
        const total = nr.reduce((s,r) => s+r.grade.outOf, 0);
        const got   = nr.reduce((s,r) => s+r.grade.score,  0);
        onFinish({ config, results:nr, score:{ got, total, pct:Math.round(got/total*100) } });
      }
    } catch { setError("Grading failed. Please try again."); }
    setGrading(false);
  }
 
  if (loading) return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"18px 20px" }}>
      <Spinner msg={`Generating 5 questions for ${label}…`}/>
    </div>
  );
  if (error) return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"48px 20px", textAlign:"center" }}>
      <p style={{ color:"#E05555", fontFamily:"'JetBrains Mono',monospace", fontSize:12 }}>{error}</p>
    </div>
  );
  if (!questions.length) return <Spinner/>;
 
  const q = questions[idx];
  const isGraded = results.length > 0 && results[results.length-1].question === q;
  const last = isGraded ? results[results.length-1] : null;
 
  return (
    <div style={{ maxWidth:660, margin:"0 auto", padding:"18px 20px 56px" }}>
      {/* Header strip */}
      <div style={{ display:"flex", alignItems:"center", gap:10, background:"#0a0e1a",
        border:`1px solid ${color}22`, borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
        <span style={{ fontSize:18 }}>{item.icon}</span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
          color, fontWeight:700 }}>{type==="so" ? `S.O.${item.num}` : item.num}</span>
        <span style={{ color:"#64748b", fontSize:12, flex:1 }}>{item.title}</span>
        <Chip label={`${idx+1}/5`} color={color} sm/>
      </div>
 
      {/* Progress bar */}
      <div style={{ background:"#0f1520", borderRadius:4, height:3, marginBottom:18, overflow:"hidden" }}>
        <div style={{ width:`${(idx/5)*100}%`, height:"100%",
          background:color, borderRadius:4, transition:"width .5s ease" }}/>
      </div>
 
      {/* Question */}
      <div style={{ background:"#0a0e1a", border:"1px solid #141e30",
        borderRadius:13, padding:"20px", marginBottom:14 }}>
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <Chip label={`${q.marks} marks`} color={color} sm/>
          <Chip label="Short Answer" color={color} sm/>
        </div>
        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:19,
          lineHeight:1.68, color:"#dde3ef" }}>{q.question}</p>
      </div>
 
      {isGraded ? (
        <>
          {/* Your answer */}
          <div style={{ background:"#0a0e1a", border:"1px solid #1a2638",
            borderRadius:10, padding:"12px", marginBottom:12 }}>
            <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
              color:"#334155", letterSpacing:"0.1em", marginBottom:6 }}>YOUR ANSWER</p>
            <p style={{ color:"#64748b", fontSize:13, lineHeight:1.65 }}>{last.userAnswer}</p>
          </div>
 
          {/* Grade */}
          <GradePanel result={last} color={color}/>
 
          {/* Model answer */}
          <details style={{ marginTop:12 }}>
            <summary style={{ background:"#0a0e1a", border:`1px solid ${color}22`,
              borderRadius:9, padding:"10px 14px", fontFamily:"'JetBrains Mono',monospace",
              fontSize:10, color, letterSpacing:"0.08em", cursor:"pointer", display:"block" }}>
              ▸ MODEL ANSWER
            </summary>
            <div style={{ background:"#0a0e1a", border:`1px solid ${color}18`,
              borderRadius:"0 0 9px 9px", padding:"14px", marginTop:-1 }}>
              <p style={{ color:"#475569", fontSize:13, lineHeight:1.75, marginBottom:12 }}>
                {q.modelAnswer}
              </p>
              {q.keyPoints.map((pt, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:5 }}>
                  <span style={{ color, fontSize:10, fontFamily:"'JetBrains Mono',monospace",
                    paddingTop:2 }}>{i+1}.</span>
                  <span style={{ color:"#334155", fontSize:12, lineHeight:1.5 }}>{pt}</span>
                </div>
              ))}
            </div>
          </details>
 
          {idx+1 < questions.length && (
            <button onClick={() => { setIdx(i => i+1); setText(""); }}
              style={{ width:"100%", marginTop:12, padding:"13px", borderRadius:10,
                background:`linear-gradient(135deg,${color},${color}bb)`,
                color:"#07090f", border:"none", cursor:"pointer",
                fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700 }}>
              NEXT QUESTION →
            </button>
          )}
        </>
      ) : (
        <>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder="Write your answer here (2–4 sentences)…" rows={6}
            style={{ width:"100%", background:"#0a0e1a", border:"1px solid #1a2638",
              borderRadius:11, padding:"14px", color:"#dde3ef",
              fontFamily:"'Syne',sans-serif", fontSize:13, lineHeight:1.7,
              outline:"none", marginBottom:10, transition:"border-color .2s" }}
            onFocus={e => e.target.style.borderColor=color}
            onBlur={e => e.target.style.borderColor="#1a2638"}/>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
              color:"#1e2d45" }}>{text.length} chars</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10,
              color:"#1e2d45" }}>2–4 sentences</span>
          </div>
          <button onClick={submit} disabled={!text.trim() || grading}
            style={{ width:"100%", padding:"13px", borderRadius:10,
              background: grading||!text.trim() ? "#0f1520" : `linear-gradient(135deg,${color},${color}bb)`,
              color: grading||!text.trim() ? "#334155" : "#07090f",
              border:"none", cursor: grading||!text.trim() ? "not-allowed" : "pointer",
              fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700,
              transition:"all .2s" }}>
            {grading ? "MARKING…" : "SUBMIT FOR MARKING →"}
          </button>
        </>
      )}
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   GRADE PANEL
══════════════════════════════════════════════════════════════ */
function GradePanel({ result, color }) {
  const g = result.grade;
  const gc = g.percentage>=80 ? "#E8A838" : g.percentage>=65 ? "#38C172" : "#E05555";
  return (
    <div style={{ background:"#0a0e1a", border:`1px solid ${gc}28`, borderRadius:13, padding:"16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
        <div style={{ position:"relative", width:68, height:68, flexShrink:0 }}>
          <ScoreRing pct={g.percentage} size={68} stroke={4} color={gc}/>
          <div style={{ position:"absolute", inset:0, display:"flex",
            alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:14,
              fontWeight:700, color:gc }}>{g.score}/{g.outOf}</span>
          </div>
        </div>
        <div style={{ flex:1 }}>
          <Chip label={g.grade} color={gc}/>
          <p style={{ color:"#64748b", fontSize:12, marginTop:6, lineHeight:1.6 }}>{g.feedback}</p>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        <div style={{ background:"#0c1a0f", border:"1px solid #38C17218", borderRadius:8, padding:"10px" }}>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8,
            color:"#38C172", letterSpacing:"0.1em", marginBottom:6 }}>✓ STRENGTHS</p>
          {(g.strengths||[]).map((s,i) => (
            <p key={i} style={{ color:"#475569", fontSize:11, marginBottom:3, lineHeight:1.5 }}>· {s}</p>))}
        </div>
        <div style={{ background:"#1a0c0c", border:"1px solid #E0555518", borderRadius:8, padding:"10px" }}>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:8,
            color:"#E05555", letterSpacing:"0.1em", marginBottom:6 }}>↑ IMPROVE</p>
          {(g.improvements||[]).map((s,i) => (
            <p key={i} style={{ color:"#475569", fontSize:11, marginBottom:3, lineHeight:1.5 }}>· {s}</p>))}
        </div>
      </div>
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   RESULTS SCREEN
══════════════════════════════════════════════════════════════ */
function ResultsScreen({ data, onHome, onRetry }) {
  const { config, results, score } = data;
  const { type, item } = config;
  const gc = score.pct>=80 ? "#E8A838" : score.pct>=65 ? "#38C172" : "#E05555";
  const grade = score.pct>=80 ? "DISTINCTION" : score.pct>=65 ? "PASS" : "NEEDS WORK";
  const label = type==="so" ? `S.O.${item.num}` : item.num;
 
  return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"22px 20px 56px" }}>
      <div style={{ background:"#0a0e1a", border:`1px solid ${gc}28`,
        borderRadius:16, padding:"28px 24px", textAlign:"center", marginBottom:22 }}>
        <div style={{ position:"relative", width:80, height:80, margin:"0 auto 14px" }}>
          <ScoreRing pct={score.pct} size={80} stroke={5} color={gc}/>
          <div style={{ position:"absolute", inset:0, display:"flex",
            flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:17,
              fontWeight:700, color:gc }}>{score.pct}%</span>
          </div>
        </div>
        <Chip label={grade} color={gc}/>
        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20,
          color:"#dde3ef", margin:"12px 0 6px" }}>{score.got} / {score.total} marks</p>
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:8, alignItems:"center" }}>
          <span style={{ fontSize:18 }}>{item.icon}</span>
          <Chip label={`${label} — ${item.title}`} color={item.color} sm/>
        </div>
      </div>
 
      <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:9,
        letterSpacing:"0.16em", color:"#1e2d45", textTransform:"uppercase", marginBottom:12 }}>
        Question Review
      </p>
 
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
        {results.map((r, i) => {
          const rc = r.grade.percentage>=80 ? "#E8A838" : r.grade.percentage>=65 ? "#38C172" : "#E05555";
          return (
            <div key={i} style={{ background:"#0a0e1a", border:`1px solid ${rc}22`,
              borderRadius:11, padding:"13px" }}>
              <div style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6 }}>
                <span style={{ color:rc, fontFamily:"'JetBrains Mono',monospace",
                  fontSize:10, paddingTop:2 }}>Q{i+1}.</span>
                <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.5,
                  fontFamily:"'Cormorant Garamond',serif", flex:1 }}>{r.question.question}</p>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                <Chip label={`${r.grade.score}/${r.grade.outOf}`} color={rc} sm/>
                <Chip label={r.grade.grade} color={rc} sm/>
                <span style={{ color:"#334155", fontSize:11, flex:1, marginLeft:4 }}>{r.grade.feedback}</span>
              </div>
            </div>
          );
        })}
      </div>
 
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={onRetry}
          style={{ flex:1, padding:"12px", background:"#0a0e1a", border:"1px solid #1a2638",
            color:"#64748b", borderRadius:10, cursor:"pointer",
            fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700 }}>
          RETRY {label}
        </button>
        <button onClick={onHome}
          style={{ flex:2, padding:"12px",
            background:"linear-gradient(135deg,#E8A838,#c8841a)",
            color:"#07090f", border:"none", borderRadius:10, cursor:"pointer",
            fontFamily:"'JetBrains Mono',monospace", fontSize:11, fontWeight:700 }}>
          ← HOME
        </button>
      </div>
    </div>
  );
}
 
/* ══════════════════════════════════════════════════════════════
   ROOT APP
══════════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen]             = useState("home");
  const [soDetail, setSoDetail]         = useState(null);
  const [practiceConfig, setPractice]   = useState(null);
  const [sessionResult, setResult]      = useState(null);
 
  function goTo(id, payload) {
    setResult(null);
    if (id === "so-detail") { setSoDetail(payload); setScreen("so-detail"); return; }
    if (id === "practice-start") { setPractice(payload); setScreen("session"); return; }
    setScreen(id);
  }
 
  function startPractice(cfg) { setPractice(cfg); setScreen("session"); }
 
  const navScreen = ["home","psr","notes","mgmt","leg","ext-lib","papers","dept","practice"].includes(screen) ? screen
    : screen === "so-detail" ? "so" : screen;
 
  return (
    <Shell>
      <NavBar screen={navScreen} onNav={goTo}/>
 
      <div style={{ maxWidth:800, margin:"0 auto" }}>
        {screen==="home" && <HomeScreen onNav={goTo}/>}
 
        {screen==="so-detail" && soDetail && (
          <SODetail so={soDetail}
            onBack={() => setScreen("home")}
            onPractice={startPractice}/>
        )}
 
        {screen==="psr" && <PSRBrowser onPractice={startPractice}/>}
 
        {screen==="notes" && <StudyNotes onPractice={startPractice}/>}
 
        {screen==="mgmt" && <ManagementScreen onPractice={startPractice}/>}
 
        {screen==="leg" && <LegislationScreen onPractice={startPractice}/>}

        {screen==="ext-lib" && <ExternalLibraryScreen onBack={() => setScreen("home")}/>}

        {screen==="papers" && <PastPapersScreen onBack={() => setScreen("home")}/>}

        {screen==="dept" && <DeptOrdersScreen onBack={() => setScreen("home")}/>}

        {screen==="practice" && <PracticePicker onStart={startPractice}/>}
 
        {screen==="session" && practiceConfig && !sessionResult && (
          <PracticeSession config={practiceConfig}
            onFinish={data => { setResult(data); setScreen("results"); }}/>
        )}
 
        {screen==="results" && sessionResult && (
          <ResultsScreen data={sessionResult}
            onHome={() => { setResult(null); setScreen("home"); }}
            onRetry={() => { setResult(null); setScreen("session"); }}/>
        )}
      </div>
    </Shell>
  );
}
 