export type Gender = 'm' | 'f' | 'pl' | 'n' | 'v' | 'adj';

export interface CardData {
  fr: string;
  ar: string;
  g: Gender;
  cat: string;
  kw: string;
  lang?: string;
  exFr?: string;
  exAr?: string;
}

const SPECIFIC_EXAMPLES: Record<string, { exFr: string; exAr: string }> = {
  "le badminton": { exFr: "J'aime jouer au badminton le week-end.", exAr: "أحب لعب كرة الريشة في عطلة نهاية الأسبوع." },
  "le billard": { exFr: "Nous jouons au billard avec mes amis.", exAr: "نحن نلعب البلياردو مع أصدقائي." },
  "le canyoning": { exFr: "Le canyoning est un sport d'aventure.", exAr: "السير بين الممرات الصخرية رياضة مغامرة." },
  "le cyclisme": { exFr: "Le cyclisme est très populaire en France.", exAr: "سباق الدراجات مشهور جداً في فرنسا." },
  "le deltaplane": { exFr: "Il vole dans le ciel en deltaplane.", exAr: "هو يطير في السماء بالطيران الشراعي." },
  "les échecs": { exFr: "Mon frère joue très bien aux échecs.", exAr: "أخي يلعب الشطرنج بشكل جيد جداً." },
  "le parapente": { exFr: "Je voudrais essayer le parapente à la montagne.", exAr: "أود تجربة الطيران الشراعي في الجبل." },
  "le parachutisme": { exFr: "Le parachutisme demande beaucoup de courage.", exAr: "القفز بالمظلة يتطلب الكثير من الشجاعة." },
  "le hockey": { exFr: "Le hockey sur glace est un sport rapide.", exAr: "الهوكي على الجليد رياضة سريعة." },
  "le rugby": { exFr: "Ils regardent un match de rugby au stade.", exAr: "هم يشاهدون مباراة ركبي في الاستاد." },
  "le rafting": { exFr: "Nous faisons du rafting dans la rivière.", exAr: "نحن نمارس التجديف في النهر." },
  "le squash": { exFr: "Elle pratique le squash deux fois par semaine.", exAr: "هي تمارس السكواش مرتين في الأسبوع." },
  "le surf / kitesurf": { exFr: "L'été, je fais du surf sur les vagues.", exAr: "في الصيف، أمارس التزلج على الأمواج." },
  "le tennis": { exFr: "Je joue au tennis sur le court.", exAr: "أنا ألعب التنس في الملعب." },
  "le tennis de table": { exFr: "Nous avons une table pour le tennis de table.", exAr: "لدينا طاولة للعب تنس الطاولة." },
  "le tir à l'arc": { exFr: "Le tir à l'arc demande de la précision.", exAr: "الرماية بالقوس تتطلب الدقة." },
  "le VTT": { exFr: "Je fais du VTT dans la forêt.", exAr: "أمارس ركوب دراجات الأماكن الوعرة في الغابة." },
  "le skate": { exFr: "Les jeunes font du skate au parc.", exAr: "الشباب يمارسون التزلج في الحديقة." },
  "la course": { exFr: "La course à pied est bonne pour la santé.", exAr: "رياضة الجري مفيدة للصحة." },
  "la danse": { exFr: "Ma sœur adore la danse classique.", exAr: "أختي تعشق الرقص الكلاسيكي." },
  "l'équitation": { exFr: "Elle fait de l'équitation à la campagne.", exAr: "هي تمارس الفروسية في الريف." },
  "l'escalade": { exFr: "Nous faisons de l'escalade sur les rochers.", exAr: "نحن نمارس التسلق على الصخور." },
  "la formule 1": { exFr: "La formule 1 est une course très rapide.", exAr: "سباق السيارات (فورمولا 1) سريع جداً." },
  "la gymnastique": { exFr: "Je fais de la gymnastique tous les matins.", exAr: "أمارس الجمباز كل صباح." },
  "la lutte libre": { exFr: "Il a gagné une médaille en lutte libre.", exAr: "لقد فاز بميدالية في المصارعة الحرة." },
  "la natation / la nage": { exFr: "Je pratique la natation à la piscine.", exAr: "أمارس السباحة في حمام السباحة." },
  "la plonge": { exFr: "J'aime la plonge dans la mer Rouge.", exAr: "أحب الغطس في البحر الأحمر." },
  "la pétanque": { exFr: "En France, on joue souvent à la pétanque.", exAr: "في فرنسا، نلعب كرة الحديد كثيراً." },
  "la voile": { exFr: "Ils font de la voile quand il y a du vent.", exAr: "يمارسون رياضة الشراع عندما تكون هناك رياح." },
  "une randonnée": { exFr: "Nous organisons une randonnée à la montagne.", exAr: "نحن ننظم نزهة سير في الجبل." },
  "un tir": { exFr: "C'est un tir magnifique vers le but !", exAr: "إنها تصويبة رائعة نحو المرمى!" },
  "un entraînement": { exFr: "J'ai un entraînement de football à 17h.", exAr: "لدي تدريب كرة قدم في الساعة الخامسة." },
  "un mi-temps": { exFr: "Les joueurs se reposent pendant la mi-temps.", exAr: "يستريح اللاعبون خلال الشوط." },
  "un but": { exFr: "L'attaquant a marqué un beau but.", exAr: "سجل المهاجم هدفاً جميلاً." },
  "un vestiaire": { exFr: "Les joueurs sont dans le vestiaire.", exAr: "اللاعبون في غرفة الملابس." },
  "un conseil": { exFr: "L'entraîneur donne un conseil aux joueurs.", exAr: "يعطي المدرب نصيحة للاعبين." },
  "un concours": { exFr: "Je participe à un concours sportif.", exAr: "أشارك في مسابقة رياضية." },
  "les jeux olympiques": { exFr: "Les jeux olympiques ont lieu tous les quatre ans.", exAr: "تقام الألعاب الأولمبية كل أربع سنوات." },
  "un championnat": { exFr: "Notre équipe a gagné le championnat.", exAr: "فاز فريقنا بالبطولة." },
  "un tournoi": { exFr: "Le club organise un tournoi de tennis.", exAr: "ينظم النادي بطولة تنس." },
  "un adversaire": { exFr: "Il faut toujours respecter son adversaire.", exAr: "يجب دائماً احترام خصمك." },
  "un carton": { exFr: "L'arbitre a donné un carton rouge.", exAr: "أعطى الحكم بطاقة حمراء." },
  "une équipe": { exFr: "Nous avons une très bonne équipe.", exAr: "لدينا فريق جيد جداً." },
  "une stratégie": { exFr: "Le coach prépare une nouvelle stratégie.", exAr: "يجهز المدرب خطة جديدة." },
  "une défaite": { exFr: "On apprend beaucoup après une défaite.", exAr: "نتعلم الكثير بعد الهزيمة." },
  "une compétition": { exFr: "Elle se prépare pour une grande compétition.", exAr: "هي تستعد لمسابقة كبيرة." },
  "une victoire": { exFr: "Les supporters célèbrent une belle victoire.", exAr: "يحتفل المشجعون بفوز جميل." },
  "une tenue": { exFr: "Je porte une tenue de sport confortable.", exAr: "أرتدي زياً رياضياً مريحاً." },
  "une activité": { exFr: "Le sport est une activité essentielle.", exAr: "الرياضة نشاط أساسي." },
  "une mission": { exFr: "Notre mission est de gagner ce match.", exAr: "مهمتنا هي الفوز بهذه المباراة." },
  "un sondage": { exFr: "Le journal a fait un sondage sur le sport.", exAr: "أجرت الجريدة استطلاع رأي عن الرياضة." },
  "un niveau": { exFr: "Il a un excellent niveau en français.", exAr: "لديه مستوى ممتاز في اللغة الفرنسية." },
  "un extrait": { exFr: "Nous lisons un extrait de cet article.", exAr: "نحن نقرأ مقتطفاً (نبذة) من هذا المقال." },
  "un slogan": { exFr: "Ce club a choisi un beau slogan.", exAr: "اختار هذا النادي شعاراً جميلاً." },
  "un équipement": { exFr: "Il faut acheter un équipement complet.", exAr: "يجب شراء معدات كاملة." },
  "un jeu": { exFr: "Le football est un jeu collectif.", exAr: "كرة القدم هي لعبة جماعية." },
  "un début": { exFr: "C'est un très bon début de saison.", exAr: "إنها بداية جيدة جداً للموسم." },
  "un avis": { exFr: "Quel est ton avis sur ce match ?", exAr: "ما هو رأيك في هذه المباراة؟" },
  "un genre": { exFr: "Quel genre de sport préfères-tu ?", exAr: "أي نوع من الرياضة تفضل؟" },
  "un forum": { exFr: "J'ai posé ma question sur un forum.", exAr: "طرحت سؤالي في منتدى للنقاش." },
  "un risque": { exFr: "Ce sport extrême comporte un risque.", exAr: "هذه الرياضة الخطرة تنطوي على خطر." },
  "une opinion": { exFr: "Chacun peut exprimer son opinion.", exAr: "يمكن لكل شخص التعبير عن رأيه." },
  "une foule": { exFr: "Il y a une grande foule devant le stade.", exAr: "يوجد حشد كبير أمام الاستاد." },
  "une enquête": { exFr: "Ils réalisent une enquête auprès des jeunes.", exAr: "إنهم يجرون استبياناً بين الشباب." },
  "une fois": { exFr: "Je vais au club une fois par semaine.", exAr: "أذهب إلى النادي مرة في الأسبوع." },
  "une adrénaline": { exFr: "Les sports extrêmes donnent de l'adrénaline.", exAr: "الرياضات الخطرة تمنح شعور الأدرينالين." },
  "une passion": { exFr: "La musique est ma grande passion.", exAr: "الموسيقى هي هوايتي وشغفي الكبير." },
  "une caractéristique": { exFr: "La vitesse est une caractéristique de ce joueur.", exAr: "السرعة هي سمة مميزة لهذا اللاعب." },
  "une énergie": { exFr: "Ce sportif a beaucoup d'énergie.", exAr: "هذا الرياضي لديه الكثير من الطاقة." },
  "une autorisation": { exFr: "Il faut une autorisation des parents.", exAr: "يلزم الحصول على إذن من الوالدين." },
  "l'eau": { exFr: "Quand j'ai soif, je bois un grand verre d'eau fraîche.", exAr: "عندما أشعر بالعطش، أشرب كوباً كبيراً من الماء البارد." },
  "eau": { exFr: "Quand j'ai soif, je bois un grand verre d'eau fraîche.", exAr: "عندما أشعر بالعطش، أشرب كوباً كبيراً من الماء البارد." },
  "water": { exFr: "When I am thirsty, I drink a cold glass of water.", exAr: "عندما أشعر بالعطش، أشرب كوباً بارداً من الماء." },
  "le pain": { exFr: "J'achète du pain chaud à la boulangerie chaque matin.", exAr: "أشتري الخبز الساخن من المخبز كل صباح." },
  "bread": { exFr: "I buy fresh bread from the bakery every morning.", exAr: "أشتري الخبز الطازج من المخبز كل صباح." },
  "le fromage": { exFr: "La France est célèbre pour son délicieux fromage.", exAr: "تشتهر فرنسا بجبنها اللذيذ." },
  "cheese": { exFr: "I like to put cheese on my sandwich.", exAr: "أحب وضع الجبن في الساندويتش." },
  "la pomme": { exFr: "Je mange une pomme rouge tous les jours.", exAr: "آكل تفاحة حمراء كل يوم." },
  "apple": { exFr: "An apple a day keeps the doctor away.", exAr: "تفاحة في اليوم تبقيك بعيداً عن الطبيب." },
  "le lait": { exFr: "Les enfants boivent du lait chaud le matin.", exAr: "يشرب الأطفال الحليب الدافئ في الصباح." },
  "milk": { exFr: "I pour warm milk into my morning cereal.", exAr: "أصب الحليب الدافئ على حبوب الإفطار." },
  "le poisson": { exFr: "Nous mangeons du poisson frais au bord de la mer.", exAr: "نأكل السمك الطازج على شاطئ البحر." },
  "fish": { exFr: "Fish swim together in the deep blue sea.", exAr: "يسبح السمك معاً في البحر الأزرق العميق." },
  "la viande": { exFr: "Le boucher coupe la viande avec un couteau.", exAr: "يقطع الجزار اللحم بالسكين." },
  "meat": { exFr: "We grilled fresh meat for dinner last night.", exAr: "شوينا اللحم الطازج للعشاء الليلة الماضية." },
  "le café": { exFr: "Mon père boit une tasse de café noir chaque matin.", exAr: "يشرب أبي فنجاناً من القهوة السوداء كل صباح." },
  "coffee": { exFr: "She drinks a hot cup of coffee every morning.", exAr: "هي تشرب فنجاناً ساخناً من القهوة كل صباح." },
  "le thé": { exFr: "J'aime boire du thé vert avec de la menthe.", exAr: "أحب شرب الشاي الأخضر بالنعناع." },
  "tea": { exFr: "Would you like a cup of hot tea with lemon?", exAr: "هل تود كوباً من الشاي الساخن بالليمون؟" },
  "l'école": { exFr: "Les élèves vont à l'école à huit heures du matin.", exAr: "يذهب التلاميذ إلى المدرسة في الساعة الثامنة صباحاً." },
  "school": { exFr: "Children go to school every morning to learn.", exAr: "يذهب الأطفال إلى المدرسة كل صباح للتعلم." },
  "le livre": { exFr: "Je lis un livre très intéressant avant de dormir.", exAr: "أقرأ كتاباً شيقاً جداً قبل النوم." },
  "book": { exFr: "I am reading an interesting book before going to sleep.", exAr: "أقرأ كتاباً شيقاً قبل الذهاب للنوم." },
  "la classe": { exFr: "Les étudiants écoutent attentivement dans la classe.", exAr: "يستمع الطلاب بانتباه داخل الفصل الدراسي." },
  "le cahier": { exFr: "J'écris la leçon dans mon cahier avec soin.", exAr: "أكتب الدرس في كراستي بعناية." },
  "le stylo": { exFr: "J'utilise un stylo bleu pour signer le document.", exAr: "أستخدم قلماً أزرق لتوقيع الوثيقة." },
  "pen": { exFr: "Please write your name with a blue pen.", exAr: "من فضلك اكتب اسمك بقلم جاف أزرق." },
  "le professeur": { exFr: "Le professeur explique la règle aux élèves.", exAr: "يشرح المعلم القاعدة للطلاب." },
  "teacher": { exFr: "The teacher explains the lesson clearly on the board.", exAr: "يشرح المعلم الدرس بوضوح على السبورة." },
  "l'élève": { exFr: "L'élève répond correctement à la question.", exAr: "يجيب التلميذ بشكل صحيح على السؤال." },
  "student": { exFr: "Every student studied hard for the final exam.", exAr: "ذاكر كل طالب بجد من أجل الامتحان النهائي." },
  "l'examen": { exFr: "J'ai réussi mon examen avec une excellente note.", exAr: "نجحت في امتحاني بدرجة ممتازة." },
  "exam": { exFr: "She studied all week to pass the final exam.", exAr: "ذاكرت طوال الأسبوع لتجتاز الامتحان النهائي." },
  "la bibliothèque": { exFr: "Nous empruntons des romans à la bibliothèque.", exAr: "نستعير الروايات من المكتبة." },
  "library": { exFr: "It is very quiet inside the public library.", exAr: "الهدوء تام داخل المكتبة العامة." },
  "flight": { exFr: "Our flight to Paris leaves from gate twelve.", exAr: "رحلة الطيران إلى باريس تغادر من البوابة ١٢." },
  "passport": { exFr: "You must show your passport at the airport border.", exAr: "يجب إظهار جواز السفر عند حدود المطار." },
  "luggage": { exFr: "We picked up our heavy luggage at the airport.", exAr: "استلمنا أمتعتنا الثقيلة في المطار." },
  "boarding pass": { exFr: "Please keep your boarding pass ready before entering the plane.", exAr: "يرجى تجهيز بطاقة صعود الطائرة قبل ركوب الطائرة." },
  "customs": { exFr: "All international travelers must pass through customs.", exAr: "يجب على جميع المسافرين الدوليين المرور عبر الجمارك." },
  "departure": { exFr: "Please check the screen for the departure time.", exAr: "يرجى مراجعة الشاشة لمعرفة موعد المغادرة." },
  "arrival": { exFr: "We waited at the arrival gate for our family.", exAr: "انتظرنا عند بوابة الوصول لاستقبال عائلتنا." },
  "reservation": { exFr: "I called the hotel to confirm my room reservation.", exAr: "اتصلت بالفندق لتأكيد حجز الغرفة." },
  "destination": { exFr: "After a long journey, we finally reached our destination.", exAr: "بعد رحلة طويلة، وصلنا أخيراً إلى وجهة السفر." },
  "passenger": { exFr: "Every passenger must fasten their seatbelt during takeoff.", exAr: "يجب على كل مسافر ربط حزام الأمان أثناء الإقلاع." },
  "house": { exFr: "They live in a beautiful house with a green garden.", exAr: "يعيشون في منزل جميل به حديقة خضراء." },
  "home": { exFr: "After work, I always go straight home to rest.", exAr: "بعد العمل، أعود دائماً إلى البيت للراحة." },
  "car": { exFr: "He drives his car to work every morning.", exAr: "يقود سيارته إلى العمل كل صباح." },
  "food": { exFr: "This restaurant serves delicious hot food every day.", exAr: "يقدم هذا المطعم طعاماً ساخناً ولذيذاً كل يوم." },
  "money": { exFr: "He saved enough money to buy a new laptop.", exAr: "ادخر مالاً كافياً لشراء حاسوب محمول جديد." },
  "time": { exFr: "Look at the clock, we do not have much time left.", exAr: "انظر إلى الساعة، لم يتبق لدينا الكثير من الوقت." },
  "friend": { exFr: "A true friend always helps you in difficult times.", exAr: "الصديق الحقيقي يساعدك دائماً في الأوقات الصعبة." },
  "family": { exFr: "I spend every weekend with my parents and family.", exAr: "أقضي كل عطلة نهاية أسبوع مع والديّ وعائلتي." },
  "doctor": { exFr: "When you feel sick, you should visit a doctor.", exAr: "عندما تشعر بالمرض، يجب عليك زيارة الطبيب." },
  "hospital": { exFr: "The ambulance took the patient to the nearest hospital.", exAr: "نقلت سيارة الإسعاف المريض إلى أقرب مستشفى." },
  "sun": { exFr: "The sun rises in the east and gives us light and warmth.", exAr: "تشرق الشمس من الشرق وتمنحنا الضوء والدفء." },
  "rain": { exFr: "Take your umbrella because the rain is falling heavily outside.", exAr: "خذ مظلتك لأن المطر يهطل بغزارة في الخارج." }
};

export function getCardExample(d: CardData): { exFr: string; exAr: string } {
  if (d.exFr && d.exAr && !d.exFr.includes('This is an example with') && !d.exFr.includes("J'utilise le mot")) {
    return { exFr: d.exFr, exAr: d.exAr };
  }
  const cleanFr = d.fr.trim().toLowerCase();
  const bareFr = cleanFr.replace(/^(le |la |les |l'|un |une |des |du |de la |the |a |an |to )/i, '').trim();
  const exact = SPECIFIC_EXAMPLES[d.fr.trim()] || SPECIFIC_EXAMPLES[cleanFr] || SPECIFIC_EXAMPLES[bareFr];
  if (exact) return exact;

  const isFrench =
    (d.lang && d.lang.startsWith('fr')) ||
    /^(le |la |les |l'|un |une |des |du )/i.test(d.fr) ||
    /[éèêëàâùûçîïôœ]/i.test(d.fr);

  const ar = (d.ar || '').trim();
  if (ar.includes('ماء') || ar.includes('مياه')) {
    return isFrench
      ? { exFr: `Quand j'ai très soif, je bois un verre de ${d.fr} fraîche.`, exAr: `عندما أشعر بالعطش الشديد، أشرب كوباً من ${d.ar} البارد.` }
      : { exFr: `When I am thirsty after running, I drink a cold glass of ${d.fr}.`, exAr: `عندما أشعر بالعطش بعد الجري، أشرب كوباً بارداً من ${d.ar}.` };
  }

  if (isFrench) {
    return {
      exFr: `Dans cette situation, on utilise « ${d.fr} » tous les jours.`,
      exAr: `في هذا الموقف نستخدم "${d.ar}" كل يوم.`,
    };
  }

  return {
    exFr: `In daily conversation, "${d.fr}" is a very useful word.`,
    exAr: `في المحادثة اليومية، كلمة "${d.ar}" مفيدة جداً.`,
  };
}

export const allData: CardData[] = [
  {fr:"le badminton",ar:"كرة الريشة",g:"m",cat:"🏅 رياضات", kw:"/images/sport_badminton_1789592048378.jpg"},
  {fr:"le billard",ar:"البلياردو",g:"m",cat:"🏅 رياضات", kw:"/images/sport_billard_1789592059512.jpg"},
  {fr:"le canyoning",ar:"السير بين الممرات الصخرية",g:"m",cat:"🏅 رياضات", kw:"/images/sport_canyoning_1789592072001.jpg"},
  {fr:"le cyclisme",ar:"سباق الدراجات",g:"m",cat:"🏅 رياضات", kw:"/images/sport_cyclisme_1789592083517.jpg"},
  {fr:"le deltaplane",ar:"الطيران الشراعي",g:"m",cat:"🏅 رياضات", kw:"/images/sport_deltaplane_1789592093233.jpg"},
  {fr:"les échecs",ar:"الشطرنج",g:"pl",cat:"🏅 رياضات", kw:"/images/sport_echecs_1789592106173.jpg"},
  {fr:"le parapente",ar:"الطيران الشراعي",g:"m",cat:"🏅 رياضات", kw:"/images/sport_parapente_1789592115694.jpg"},
  {fr:"le parachutisme",ar:"القفز بالمظلة",g:"m",cat:"🏅 رياضات", kw:"/images/sport_parachutisme_1789592127388.jpg"},
  {fr:"le hockey",ar:"الهوكي",g:"m",cat:"🏅 رياضات", kw:"/images/sport_hockey_1789592145215.jpg"},
  {fr:"le rugby",ar:"الركبي",g:"m",cat:"🏅 رياضات", kw:"/images/sport_rugby_1789592155254.jpg"},
  {fr:"le rafting",ar:"التجديف",g:"m",cat:"🏅 رياضات", kw:"/images/sport_rafting_1789592166189.jpg"},
  {fr:"le squash",ar:"السكواش",g:"m",cat:"🏅 رياضات", kw:"/images/sport_squash_1789592176620.jpg"},
  {fr:"le surf / kitesurf",ar:"التزلج على الأمواج",g:"m",cat:"🏅 رياضات", kw:"/images/sport_surf_1789592186561.jpg"},
  {fr:"le tennis",ar:"التنس",g:"m",cat:"🏅 رياضات", kw:"/images/sport_tennis_1789592197231.jpg"},
  {fr:"le tennis de table",ar:"تنس الطاولة",g:"m",cat:"🏅 رياضات", kw:"/images/sport_tennis_de_table_1789592208917.jpg"},
  {fr:"le tir à l'arc",ar:"القوس",g:"m",cat:"🏅 رياضات", kw:"/images/sport_tir_a_larc_1789592220194.jpg"},
  {fr:"le VTT",ar:"دراجات الأماكن الوعرة",g:"m",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/1/1e/VTT_logo_reverse_orange.png?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"le skate",ar:"التزلج",g:"m",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/2/21/Tony_Hawk_skating_the_Ann_Arbor_skatepark_at_Veteran%27s_Memorial_Park_%28cropped%29.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"la course",ar:"الجري",g:"f",cat:"🏅 رياضات", kw:"/images/sport_course_1789592251162.jpg"},
  {fr:"la danse",ar:"الرقص",g:"f",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/9/99/William-Adolphe_Bouguereau_%281825-1905%29_-_The_Dance_%281856%29.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"l'équitation",ar:"الفروسية",g:"f",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/1/10/4%C3%A8me_manche_du_championnat_suisse_de_Pony_games_2013_-_25082013_-_Laconnex_51.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"l'escalade",ar:"التسلق",g:"f",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/3/33/Climbing_pictogram.svg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"la formule 1",ar:"سباق السيارات",g:"f",cat:"🏅 رياضات", kw:"/images/sport_formule_1_1789592262110.jpg"},
  {fr:"la gymnastique",ar:"الجمباز",g:"f",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/1/1c/Utah_gymnastics_meet.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"la lutte libre",ar:"مصارعة حرة",g:"f",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/3/3b/FreestyleWrestling2.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"la natation / la nage",ar:"السباحة",g:"f",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/5/51/Barnbarn.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"la plonge",ar:"الغطس",g:"f",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/a/ac/Little_Angel_%26_Dish.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"la pétanque",ar:"كرة الحديد",g:"f",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/e/e6/Jeux_de_P%C3%A9tanque_%C3%A0_Valbonne.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"la voile",ar:"الشراع",g:"f",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/c/ca/Tonnerres_de_Brest_2012-Cancalaise_Eulalie.JPG?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"une randonnée",ar:"التنزه",g:"f",cat:"🏅 رياضات", kw:"https://upload.wikimedia.org/wikipedia/commons/5/5b/Alta_via_meranese_2005-05.JPG?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  
  {fr:"un tir",ar:"تصويبة",g:"m",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/commons/8/8e/Archery_pictogram.svg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"un entraînement",ar:"تدريب",g:"m",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/commons/8/87/%C3%89ric_Bruneau_%282024%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"un mi-temps",ar:"شوط",g:"m",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/fr/d/d6/The_Longest_Yard_%282005%29_logo.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"un but",ar:"هدف",g:"m",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/commons/d/d3/Soccer_goalkeeper.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"un vestiaire",ar:"غرفة الملابس",g:"m",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/commons/c/c5/Vesttextlog.png?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"un conseil",ar:"نصيحة",g:"m",cat:"⚽ مصطلحات رياضية", kw:"/images/sport_conseil_1789592274787.jpg"},
  {fr:"un concours",ar:"مسابقة",g:"m",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/commons/e/e9/Ar%C3%A8nes_de_Morlanne_lors_du_concours_landais_2019.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"les jeux olympiques",ar:"الألعاب الأولمبية",g:"pl",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/commons/5/5c/Olympic_rings_without_rims.svg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"un championnat",ar:"بطولة",g:"m",cat:"⚽ مصطلحات رياضية", kw:"/images/sport_championnat_1789592285603.jpg"},
  {fr:"un tournoi",ar:"دوري / بطولة",g:"m",cat:"⚽ مصطلحات رياضية", kw:"/images/sport_tournoi_1789592295624.jpg"},
  {fr:"un adversaire",ar:"خصم",g:"m",cat:"⚽ مصطلحات رياضية", kw:"/images/sport_adversaire_1789592305222.jpg"},
  {fr:"un carton",ar:"بطاقة / كارت",g:"m",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/commons/6/62/Several_Cartons.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"une équipe",ar:"فريق",g:"f",cat:"⚽ مصطلحات رياضية", kw:"/images/sport_equipe_1789592315536.jpg"},
  {fr:"une stratégie",ar:"خطة",g:"f",cat:"⚽ مصطلحات رياضية", kw:"/images/sport_strategie_1789592326869.jpg"},
  {fr:"une défaite",ar:"هزيمة",g:"f",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/commons/6/61/Marc_Bloch_-_L%27%C3%89trange_D%C3%A9faite_%281946%29.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"une compétition",ar:"مسابقة",g:"f",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/commons/a/ad/Heat_1_of_the_Womens_100m_Semi-Final.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"une victoire",ar:"فوز",g:"f",cat:"⚽ مصطلحات رياضية", kw:"/images/sport_victoire_1789592342461.jpg"},
  {fr:"une tenue",ar:"زي",g:"f",cat:"⚽ مصطلحات رياضية", kw:"https://upload.wikimedia.org/wikipedia/commons/d/d4/Tractus_intestinalis_intestinum_tenue.svg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"une activité",ar:"نشاط",g:"f",cat:"⚽ مصطلحات رياضية", kw:"/images/sport_activite_1789592357797.jpg"},
  {fr:"une mission",ar:"مهمة",g:"f",cat:"⚽ مصطلحات رياضية", kw:"/images/sport_mission_1789592370869.jpg"},
  
  {fr:"un sondage",ar:"استطلاع رأي",g:"m",cat:"📝 مفردات عامة", kw:"/images/sport_sondage_1789592381915.jpg"},
  {fr:"un niveau",ar:"مستوى",g:"m",cat:"📝 مفردات عامة", kw:"https://upload.wikimedia.org/wikipedia/commons/8/8d/Sand_filtration_tanks.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"un extrait",ar:"موجز / نبذة",g:"m",cat:"📝 مفردات عامة", kw:"https://upload.wikimedia.org/wikipedia/commons/a/af/Vanilla_extract.JPG?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"un slogan",ar:"شعار",g:"m",cat:"📝 مفردات عامة", kw:"https://upload.wikimedia.org/wikipedia/commons/b/bc/%22Keep_FDA_Off_The_Farm%22_%28FDA_140%29_%288205957369%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"un équipement",ar:"أداة / معدة",g:"m",cat:"📝 مفردات عامة", kw:"https://upload.wikimedia.org/wikipedia/commons/4/4b/La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%2C_Paris_ao%C3%BBt_2014_%282%29.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"un jeu",ar:"لعبة",g:"m",cat:"📝 مفردات عامة", kw:"/images/sport_jeu_1789592394083.jpg"},
  {fr:"un début",ar:"بداية",g:"m",cat:"📝 مفردات عامة", kw:"/images/sport_debut_1789592404932.jpg"},
  {fr:"un avis",ar:"رأي",g:"m",cat:"📝 مفردات عامة", kw:"/images/fallback_review.jpg"},
  {fr:"un genre",ar:"نوع",g:"m",cat:"📝 مفردات عامة", kw:"/images/fallback_category.jpg"},
  {fr:"un forum",ar:"ندوة / منتدى",g:"m",cat:"📝 مفردات عامة", kw:"/images/fallback_discussion.jpg"},
  {fr:"un risque",ar:"خطر",g:"m",cat:"📝 مفردات عامة", kw:"https://upload.wikimedia.org/wikipedia/commons/3/39/3_Alarm_Building_Fire.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"une opinion",ar:"رأي",g:"f",cat:"📝 مفردات عامة", kw:"https://upload.wikimedia.org/wikipedia/commons/2/2c/SF_Chinatown_soapboxing_p1060705.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"une foule",ar:"حشد / جمهور",g:"f",cat:"📝 مفردات عامة", kw:"https://upload.wikimedia.org/wikipedia/commons/a/aa/The_Porteous_Mob_James_Drummond.jpg?utm_source=fr.wikipedia.org&utm_campaign=api&utm_content=original"},
  {fr:"une enquête",ar:"استبيان",g:"f",cat:"📝 مفردات عامة", kw:"/images/fallback_survey.jpg"},
  {fr:"une fois",ar:"مرة",g:"f",cat:"📝 مفردات عامة", kw:"/images/fallback_time.jpg"},
  {fr:"une adrénaline",ar:"هرمون الأدرينالين",g:"f",cat:"📝 مفردات عامة", kw:"/images/fallback_extreme.jpg"},
  {fr:"une passion",ar:"هواية",g:"f",cat:"📝 مفردات عامة", kw:"/images/fallback_love.jpg"},
  {fr:"une caractéristique",ar:"سمة / ميزة",g:"f",cat:"📝 مفردات عامة", kw:"/images/fallback_feature.jpg"},
  {fr:"une énergie",ar:"طاقة",g:"f",cat:"📝 مفردات عامة", kw:"/images/fallback_energy.jpg"},
  {fr:"une autorisation",ar:"إذن / ترخيص",g:"f",cat:"📝 مفردات عامة", kw:"/images/fallback_permit.jpg"}
];
