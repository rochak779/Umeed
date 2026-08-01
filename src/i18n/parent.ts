import { useMemo } from "react";
import { useUmeed } from "@/state/UmeedProvider";

/**
 * Parent-side language. The adult child picks "Language they read best" for each
 * parent during onboarding; that choice drives every string the parent sees.
 * The child's own screens always stay in English.
 */
export type ParentLocale = "en" | "hi";

export function localeFor(language: string | undefined): ParentLocale {
  if (!language) return "en";
  const l = language.trim().toLowerCase();
  if (l === "हिन्दी" || l === "हिंदी" || l === "hindi" || l === "hi") return "hi";
  return "en";
}

const en = {
  greeting: "Namaste",
  ji: "ji",
  todayDate: "Thursday, 30 July",
  family: "Family",
  timeForTablet: (time: string) => `Time for your ${time} tablet`,
  nothingLeft: "Nothing left to take today",
  allDone: "All done. Rest well.",
  taken: "Taken",
  notYet: "Not yet",
  askAgain: "We will ask you again in a little while.",
  noted: (child: string) => `Noted. ${child} can see it.`,
  readAloud: "Read this out loud",
  speak: "Speak",
  photo: "Photo",
  help: "Help",
  childCanSee: (child: string) => `${child} can see everything you do here.`,

  // login
  loginTitle: (name: string) => `Namaste, ${name} ji`,
  loginSubtitle: (child: string) =>
    `${child} has already made your space. Just confirm this is your phone.`,
  codeTitle: "Enter the six numbers",
  codeSubtitle: "We sent them by SMS. Type 1 2 3 4 5 6 for this demo.",
  yourPhone: "Your phone number",
  yesThisIsMine: "Yes, this is mine",
  askChildToCall: (child: string) => `Ask ${child} to call me`,
  sixNumbers: "Six numbers",
  goInside: "Go inside",
  goBack: "Go back",

  // welcome
  step: (i: number, n: number) => `Step ${i} of ${n}`,
  w1Title: "Say your reading",
  w1Body: (child: string) =>
    `Tap the green button and say it the way you would tell ${child}. Nothing to type.`,
  w2Title: "Or send a photo",
  w2Body: "Hold the phone over your machine or a paper. Umeed reads the numbers itself.",
  w3Title: "Ask for help",
  w3Body: (helper: string, child: string) =>
    `The orange button tells ${helper} next door and ${child} at the same moment.`,
  imReady: "I am ready",
  next: "Next",
  skipForNow: "Skip for now",

  // speak
  speakTitle: "Say your reading",
  speakHint: "Tap the button and say it simply: “one thirty eight over eighty six”.",
  startListening: "Start listening",
  ready: "Ready when you are.",
  listening: "Listening…",
  whatIHeard: "This is what I heard.",
  heardText: "One thirty eight over eighty six, pulse seventy four",
  willSave: "Umeed will save",
  pulseLine: "Pulse 74 beats a minute · this morning",
  yesCorrect: "Yes, that is right",
  sayAgain: "Let me say it again",
  savedVoice: (child: string) => `Saved. ${child} can see it now.`,

  // photo
  photoTitle: "Take a photo",
  photoHint: "Hold the phone flat over the screen of your machine. Good light helps.",
  readingNumbers: "Reading the numbers…",
  foundNumbers: "Found the numbers.",
  readFromPhoto: "Read from your photo",
  takeThePhoto: "Take the photo",
  takeAgain: "Take it again",
  savedPhoto: "Saved from your photo.",

  // help
  helpTitle: "Ask for help",
  helpIntro: (helper: string, child: string) =>
    `This tells ${helper} next door and ${child} at the same moment. Nobody else.`,
  pressForHelp: "Press for help",
  orCall: "Or just call someone",
  call: (name: string) => `Call ${name}`,
  tellingIn: (helper: string, child: string, s: number) =>
    `Telling ${helper} and ${child} in ${s} seconds.`,
  imFineStop: "I am fine, stop",
  helpIsComing: "Help is coming",
  hasBeenTold: (name: string) => `${name} has been told`,
  walkingOver: (helper: string) => `${helper} is walking over now.`,
  metresAway: (helper: string) => `${helper} is 200 metres away.`,
  imOkayNow: "I am okay now",

  // profile
  myDetails: "My details",
  fullName: "Full name",
  age: "Age",
  phone: "Phone number",
  email: "Email",
  readingLanguage: "Language I read best",
  saveChanges: "Save changes",
  nameNeeded: "Please keep your name here.",
  detailsSaved: "Saved. Your details are updated.",
  detailsPrivate: "Only your family plan can see these details.",
};

type Dict = typeof en;

const hi: Dict = {
  greeting: "नमस्ते",
  ji: "जी",
  todayDate: "गुरुवार, 30 जुलाई",
  family: "परिवार",
  timeForTablet: (time: string) => `${time} की दवा का समय हो गया है`,
  nothingLeft: "आज और कोई दवा नहीं बची है",
  allDone: "सब हो गया। आराम कीजिए।",
  taken: "ले ली",
  notYet: "अभी नहीं",
  askAgain: "हम आपसे थोड़ी देर में फिर पूछेंगे।",
  noted: (child: string) => `लिख लिया। ${child} को दिख जाएगा।`,
  readAloud: "इसे ज़ोर से पढ़कर सुनाइए",
  speak: "बोलिए",
  photo: "फ़ोटो",
  help: "मदद",
  childCanSee: (child: string) => `आप यहाँ जो करती हैं, ${child} को सब दिखता है।`,

  loginTitle: (name: string) => `नमस्ते, ${name} जी`,
  loginSubtitle: (child: string) =>
    `${child} ने आपकी जगह पहले से बना दी है। बस बताइए कि यह फ़ोन आपका है।`,
  codeTitle: "छह अंक भरिए",
  codeSubtitle: "हमने SMS से भेजे हैं। इस डेमो के लिए 1 2 3 4 5 6 लिखिए।",
  yourPhone: "आपका फ़ोन नंबर",
  yesThisIsMine: "हाँ, यह मेरा है",
  askChildToCall: (child: string) => `${child} से कहिए कि मुझे फ़ोन करें`,
  sixNumbers: "छह अंक",
  goInside: "अंदर चलिए",
  goBack: "वापस जाइए",

  step: (i: number, n: number) => `चरण ${i} / ${n}`,
  w1Title: "अपना रीडिंग बोलिए",
  w1Body: (child: string) =>
    `हरा बटन दबाइए और वैसे ही बोलिए जैसे ${child} को बताती हैं। कुछ लिखना नहीं है।`,
  w2Title: "या फ़ोटो भेजिए",
  w2Body: "फ़ोन को मशीन या काग़ज़ के ऊपर रखिए। उमीद ख़ुद नंबर पढ़ लेगी।",
  w3Title: "मदद मांगिए",
  w3Body: (helper: string, child: string) =>
    `नारंगी बटन पड़ोस की ${helper} और ${child} — दोनों को एक ही पल में बता देता है।`,
  imReady: "मैं तैयार हूँ",
  next: "आगे",
  skipForNow: "अभी छोड़ दीजिए",

  speakTitle: "अपना रीडिंग बोलिए",
  speakHint: "बटन दबाइए और आसान भाषा में बोलिए: “एक सौ अड़तीस बटा छियासी”।",
  startListening: "सुनना शुरू कीजिए",
  ready: "जब आप तैयार हों।",
  listening: "सुन रहे हैं…",
  whatIHeard: "मैंने यह सुना।",
  heardText: "एक सौ अड़तीस बटा छियासी, नाड़ी चौहत्तर",
  willSave: "उमीद यह सहेजेगी",
  pulseLine: "नाड़ी 74 प्रति मिनट · आज सुबह",
  yesCorrect: "हाँ, यही सही है",
  sayAgain: "मुझे फिर बोलने दीजिए",
  savedVoice: (child: string) => `सहेज लिया। ${child} को अब दिख रहा है।`,

  photoTitle: "फ़ोटो लीजिए",
  photoHint: "फ़ोन को मशीन की स्क्रीन के ऊपर सीधा रखिए। अच्छी रोशनी से मदद मिलती है।",
  readingNumbers: "नंबर पढ़ रहे हैं…",
  foundNumbers: "नंबर मिल गए।",
  readFromPhoto: "आपकी फ़ोटो से पढ़ा गया",
  takeThePhoto: "फ़ोटो लीजिए",
  takeAgain: "दोबारा लीजिए",
  savedPhoto: "आपकी फ़ोटो से सहेज लिया।",

  helpTitle: "मदद मांगिए",
  helpIntro: (helper: string, child: string) =>
    `यह पड़ोस की ${helper} और ${child} को एक ही पल में बता देगा। और किसी को नहीं।`,
  pressForHelp: "मदद के लिए दबाइए",
  orCall: "या किसी को फ़ोन कर लीजिए",
  call: (name: string) => `${name} को फ़ोन कीजिए`,
  tellingIn: (helper: string, child: string, s: number) =>
    `${helper} और ${child} को ${s} सेकंड में बता रहे हैं।`,
  imFineStop: "मैं ठीक हूँ, रोक दीजिए",
  helpIsComing: "मदद आ रही है",
  hasBeenTold: (name: string) => `${name} को बता दिया गया है`,
  walkingOver: (helper: string) => `${helper} अभी चलकर आ रही हैं।`,
  metresAway: (helper: string) => `${helper} 200 मीटर दूर हैं।`,
  imOkayNow: "मैं अब ठीक हूँ",

  myDetails: "मेरी जानकारी",
  fullName: "पूरा नाम",
  age: "उम्र",
  phone: "फ़ोन नंबर",
  email: "ईमेल",
  readingLanguage: "जो भाषा मैं सबसे अच्छी पढ़ती हूँ",
  saveChanges: "बदलाव सहेजिए",
  nameNeeded: "कृपया अपना नाम रहने दीजिए।",
  detailsSaved: "सहेज लिया। आपकी जानकारी बदल गई है।",
  detailsPrivate: "यह जानकारी सिर्फ़ आपके परिवार को दिखती है।",
};

const DICTS: Record<ParentLocale, Dict> = { en, hi };

export function useParentLang(parentId = "anuradha") {
  const { data } = useUmeed();
  const language = data.family.find((p) => p.id === parentId)?.language;
  const locale = localeFor(language);
  return useMemo(() => ({ locale, t: DICTS[locale], language }), [locale, language]);
}
