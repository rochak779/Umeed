export type PersonaKind = "child" | "parent";
export type StatusKind = "steady" | "watch" | "attention";

export type Person = {
  id: string;
  name: string;
  shortName: string;
  role: "child" | "parent" | "sibling" | "helper";
  relationship: string;
  age: number;
  city: string;
  phone: string;
  language?: string;
  conditions?: string[];
  occupation?: string;
  verified?: boolean;
  distance?: string;
  address?: string;
  access: string;
  initials: string;
};

export type Vital = {
  id: string;
  parentId: string;
  date: string; // ISO date
  time: string;
  systolic?: number | undefined;
  diastolic?: number | undefined;
  pulse?: number | undefined;
  sugar?: number | undefined;
  weight?: number | undefined;
  loggedBy: "voice" | "photo" | "family";
};

export type DocField = { label: string; value: string };
export type Doc = {
  id: string;
  parentId: string;
  title: string;
  date: string;
  type: "Prescription" | "Lipid profile" | "HbA1c report" | "Pharmacy bill";
  source: "WhatsApp" | "Camera" | "Gmail";
  fields: DocField[];
};

export type Reminder = {
  id: string;
  parentId: string;
  kind: "medicine" | "vital" | "appointment";
  label: string;
  time: string;
  frequency: string;
  days: ("done" | "missed" | "upcoming")[];
  missStreak: number;
};

export type TimelineEvent = {
  id: string;
  parentId: string;
  kind: "vital" | "document" | "reminder" | "alert" | "helper" | "call";
  title: string;
  detail?: string | undefined;
  date: string;
  time: string;
};

export type AlertState = "sent" | "seen" | "on-the-way" | "resolved";
export type Alert = {
  id: string;
  parentId: string;
  headline: string;
  body: string;
  time: string;
  told: string[];
  state: AlertState;
  level: 1 | 2 | 3 | 4 | "sos";
  acknowledged: boolean;
};

export type UmeedData = {
  family: Person[];
  vitals: Vital[];
  documents: Doc[];
  reminders: Reminder[];
  timeline: TimelineEvent[];
  alerts: Alert[];
  statuses: Record<string, StatusKind>;
  onboardingDone: boolean;
  parentOnboarded: boolean;
  joinedOn: string;
  clockOffsetDays: number;
};

const day = (back: number) => {
  const d = new Date(2026, 6, 30);
  d.setDate(d.getDate() - back);
  return d.toISOString().slice(0, 10);
};

export const family: Person[] = [
  {
    id: "aditi",
    name: "Aditi Rao",
    shortName: "Aditi",
    role: "child",
    relationship: "Daughter",
    age: 41,
    city: "Bengaluru",
    phone: "+91 98111 20034",
    occupation: "Runs her own business",
    access: "Sees everything. Pays for the family plan.",
    initials: "AR",
  },
  {
    id: "anuradha",
    name: "Anuradha Rao",
    shortName: "Mummy",
    role: "parent",
    relationship: "Mother",
    age: 68,
    city: "Kota, Rajasthan",
    phone: "+91 99280 41172",
    language: "English",
    occupation: "Homemaker",
    conditions: ["High blood pressure"],
    verified: true,
    address: "B-14, Vigyan Nagar, Kota",
    access: "Sees her own reminders and readings.",
    initials: "AN",
  },
  {
    id: "manoj",
    name: "Manoj Rao",
    shortName: "Papa",
    role: "parent",
    relationship: "Father",
    age: 72,
    city: "Kota, Rajasthan",
    phone: "+91 99280 41180",
    language: "English",
    occupation: "Retired bank officer",
    conditions: ["Type 2 diabetes", "High cholesterol"],
    verified: true,
    address: "B-14, Vigyan Nagar, Kota",
    access: "Sees his own reminders and readings.",
    initials: "MR",
  },
  {
    id: "rohan",
    name: "Rohan Rao",
    shortName: "Rohan",
    role: "sibling",
    relationship: "Brother",
    age: 37,
    city: "Pune",
    phone: "+91 98220 55019",
    access: "Sees everything you see. Gets alerts only after 30 minutes.",
    initials: "RR",
  },
  {
    id: "sunita",
    name: "Sunita Sharma",
    shortName: "Sunita",
    role: "helper",
    relationship: "Neighbour",
    age: 54,
    city: "Kota, Rajasthan",
    phone: "+91 94140 77321",
    distance: "200 metres away",
    access: "Gets the first alert. Does not see medical records.",
    initials: "SS",
  },
];

const anuradhaBp: Array<[number, number] | null> = [
  [124, 80],
  [126, 82],
  null,
  [122, 78],
  [128, 84],
  [125, 81],
  [127, 83],
  [129, 83],
  [128, 82],
  [132, 85],
  [136, 88],
  [139, 88],
  [142, 90],
  [146, 92],
];

function buildVitals(): Vital[] {
  const out: Vital[] = [];
  anuradhaBp.forEach((bp, i) => {
    const back = 13 - i;
    if (!bp) return;
    out.push({
      id: `v-an-${i}`,
      parentId: "anuradha",
      date: day(back),
      time: "08:20 am",
      systolic: bp[0],
      diastolic: bp[1],
      pulse: 74 + ((i * 3) % 9),
      weight: 62 + ((i % 4) * 0.2),
      loggedBy: i % 4 === 0 ? "photo" : "voice",
    });
  });
  for (let i = 0; i < 14; i++) {
    const back = 13 - i;
    if (i === 4 || i === 10) continue;
    out.push({
      id: `v-mn-${i}`,
      parentId: "manoj",
      date: day(back),
      time: "09:10 pm",
      systolic: 122 + ((i * 2) % 7),
      diastolic: 78 + (i % 5),
      pulse: 70 + (i % 6),
      sugar: 118 + ((i * 5) % 22),
      weight: 71 + ((i % 3) * 0.3),
      loggedBy: i % 3 === 0 ? "photo" : "voice",
    });
  }
  return out;
}

export const documents: Doc[] = [
  {
    id: "d1",
    parentId: "anuradha",
    title: "Prescription — Dr Mehta",
    date: day(138),
    type: "Prescription",
    source: "WhatsApp",
    fields: [
      { label: "Doctor", value: "Dr S. Mehta, Kota Heart Clinic" },
      { label: "Medicine", value: "Telmisartan 40 mg, morning" },
      { label: "Medicine", value: "Calcium + D3, night" },
      { label: "Review after", value: "3 months" },
    ],
  },
  {
    id: "d2",
    parentId: "manoj",
    title: "Prescription — Dr Bhargava",
    date: day(96),
    type: "Prescription",
    source: "Camera",
    fields: [
      { label: "Doctor", value: "Dr R. Bhargava, City Hospital" },
      { label: "Medicine", value: "Metformin 500 mg, after dinner" },
      { label: "Medicine", value: "Atorvastatin 10 mg, 10 pm" },
      { label: "Advice", value: "30 minute walk daily" },
    ],
  },
  {
    id: "d3",
    parentId: "manoj",
    title: "Lipid profile",
    date: day(41),
    type: "Lipid profile",
    source: "Gmail",
    fields: [
      { label: "Total cholesterol", value: "212 mg/dL" },
      { label: "LDL", value: "138 mg/dL" },
      { label: "HDL", value: "42 mg/dL" },
      { label: "Triglycerides", value: "164 mg/dL" },
      { label: "Lab", value: "Kota Diagnostics" },
    ],
  },
  {
    id: "d4",
    parentId: "manoj",
    title: "HbA1c report",
    date: day(24),
    type: "HbA1c report",
    source: "WhatsApp",
    fields: [
      { label: "HbA1c", value: "7.1 %" },
      { label: "Average sugar", value: "157 mg/dL" },
      { label: "Previous", value: "7.4 % in March" },
      { label: "Lab", value: "Kota Diagnostics" },
    ],
  },
  {
    id: "d5",
    parentId: "anuradha",
    title: "Pharmacy bill — Apollo",
    date: day(9),
    type: "Pharmacy bill",
    source: "Camera",
    fields: [
      { label: "Shop", value: "Apollo Pharmacy, Vigyan Nagar" },
      { label: "Items", value: "Telmisartan 40 mg × 30" },
      { label: "Amount", value: "₹ 248" },
      { label: "Paid by", value: "Cash" },
    ],
  },
];

export const reminders: Reminder[] = [
  {
    id: "r1",
    parentId: "anuradha",
    kind: "medicine",
    label: "Telmisartan 40 mg",
    time: "8:00 am",
    frequency: "Every day",
    days: ["done", "done", "done", "done", "missed", "missed", "upcoming"],
    missStreak: 2,
  },
  {
    id: "r2",
    parentId: "anuradha",
    kind: "medicine",
    label: "Calcium + D3",
    time: "9:00 pm",
    frequency: "Every day",
    days: ["done", "done", "missed", "done", "done", "done", "upcoming"],
    missStreak: 0,
  },
  {
    id: "r3",
    parentId: "anuradha",
    kind: "vital",
    label: "Morning blood pressure",
    time: "8:20 am",
    frequency: "Every day",
    days: ["done", "done", "done", "done", "done", "done", "upcoming"],
    missStreak: 0,
  },
  {
    id: "r4",
    parentId: "manoj",
    kind: "medicine",
    label: "Metformin 500 mg",
    time: "After dinner",
    frequency: "Every day",
    days: ["done", "done", "done", "done", "done", "done", "upcoming"],
    missStreak: 0,
  },
  {
    id: "r5",
    parentId: "manoj",
    kind: "medicine",
    label: "Atorvastatin 10 mg",
    time: "10:00 pm",
    frequency: "Every day",
    days: ["done", "done", "missed", "done", "done", "done", "upcoming"],
    missStreak: 0,
  },
  {
    id: "r6",
    parentId: "manoj",
    kind: "appointment",
    label: "Dr Bhargava review",
    time: "11:00 am",
    frequency: "12 August",
    days: ["upcoming", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming"],
    missStreak: 0,
  },
];

export const timeline: TimelineEvent[] = [
  {
    id: "t1",
    parentId: "anuradha",
    kind: "vital",
    title: "Mummy said her reading out loud",
    detail: "Blood pressure 146 over 92",
    date: day(0),
    time: "8:20 am",
  },
  {
    id: "t2",
    parentId: "anuradha",
    kind: "reminder",
    title: "Morning tablet not confirmed",
    detail: "Second time this week",
    date: day(0),
    time: "8:30 am",
  },
  {
    id: "t3",
    parentId: "manoj",
    kind: "vital",
    title: "Papa said his sugar reading",
    detail: "132 mg/dL after dinner",
    date: day(1),
    time: "9:10 pm",
  },
  {
    id: "t4",
    parentId: "anuradha",
    kind: "reminder",
    title: "Evening calcium taken",
    date: day(1),
    time: "9:05 pm",
  },
  {
    id: "t5",
    parentId: "anuradha",
    kind: "document",
    title: "Pharmacy bill filed by Umeed",
    detail: "Apollo Pharmacy, ₹ 248",
    date: day(9),
    time: "6:40 pm",
  },
  {
    id: "t6",
    parentId: "manoj",
    kind: "document",
    title: "HbA1c report filed by Umeed",
    detail: "7.1 %, down from 7.4 %",
    date: day(24),
    time: "11:15 am",
  },
  {
    id: "t7",
    parentId: "anuradha",
    kind: "call",
    title: "Aditi called Mummy",
    detail: "12 minutes",
    date: day(3),
    time: "7:30 pm",
  },
  {
    id: "t8",
    parentId: "manoj",
    kind: "reminder",
    title: "Metformin taken",
    date: day(2),
    time: "9:20 pm",
  },
  {
    id: "t9",
    parentId: "anuradha",
    kind: "helper",
    title: "Sunita dropped in",
    detail: "All well, shared tea",
    date: day(6),
    time: "5:00 pm",
  },
  {
    id: "t10",
    parentId: "manoj",
    kind: "vital",
    title: "Papa sent a photo of his sugar meter",
    date: day(5),
    time: "9:15 pm",
  },
];

export const seed: UmeedData = {
  family,
  vitals: buildVitals(),
  documents,
  reminders,
  timeline,
  alerts: [
    {
      id: "a1",
      parentId: "anuradha",
      headline: "We have noticed a few changes this week",
      body: "It may be a good time to check in with Mummy.",
      time: "Today, 8:45 am",
      told: ["Aditi"],
      state: "sent",
      level: 2,
      acknowledged: false,
    },
  ],
  statuses: { anuradha: "watch", manoj: "steady" },
  onboardingDone: false,
  parentOnboarded: false,
  joinedOn: "12 March",
  clockOffsetDays: 0,
};

export const todayLabel = "Thursday, 30 July";
export const dayISO = day;
