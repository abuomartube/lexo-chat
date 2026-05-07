export type Lang = "en" | "ar";

type Entry = { en: string; ar: string };

export const translations = {
  // ───────────────────────── COMMON ─────────────────────────
  "common.poweredByAi": {
    en: "Powered by EduLexo AI",
    ar: "Powered by EduLexo AI",
  },
  "common.exploreCourses": { en: "Explore Courses", ar: "استكشف الدورات" },
  "common.seeFeatures": { en: "See Features", ar: "اطّلع على المزايا" },
  "common.viewDetails": { en: "View Details", ar: "عرض التفاصيل" },
  "common.enrollNow": { en: "Enroll Now", ar: "سجّل الآن" },
  "common.backToHome": { en: "Back to home", ar: "العودة للرئيسية" },
  "common.createAccount": { en: "Create an account", ar: "إنشاء حساب" },
  "common.privacy": { en: "Privacy", ar: "الخصوصية" },
  "common.terms": { en: "Terms", ar: "الشروط" },
  "common.contact": { en: "Contact", ar: "تواصل معنا" },
  "common.copyright": {
    en: "Abu Omar EduLexo · Powered by EduLexo AI",
    ar: "Abu Omar EduLexo · Powered by EduLexo AI",
  },
  "common.tagline": {
    en: "Learn · Practice · Achieve",
    ar: "Learn · Practice · Achieve",
  },
  "common.brandPrefix": { en: "Abu Omar ", ar: "Abu Omar " },
  "common.brandSuffix": { en: "EduLexo", ar: "EduLexo" },

  // ───────────────────────── HEADER ─────────────────────────
  "nav.courses": { en: "Courses", ar: "الدورات" },
  "nav.features": { en: "Features", ar: "المزايا" },
  "nav.freeLessons": { en: "Free Lessons", ar: "دروس مجانية" },
  "nav.assessment": { en: "Level Assessment", ar: "تحديد المستوى" },
  "nav.affiliate": { en: "Become an Affiliate", ar: "كن شريكاً" },
  "header.login": { en: "Log In", ar: "تسجيل الدخول" },
  "header.signup": { en: "Sign Up", ar: "إنشاء حساب" },
  "header.dashboard": { en: "My Dashboard", ar: "لوحة التحكم" },
  "header.publicProfile": { en: "View public profile", ar: "عرض الملف العام" },
  "header.settings": { en: "Account settings", ar: "إعدادات الحساب" },
  "header.admin": { en: "Admin Panel", ar: "لوحة الإدارة" },
  "header.logout": { en: "Log Out", ar: "تسجيل الخروج" },
  "header.themeLight": {
    en: "Switch to light mode",
    ar: "التبديل للوضع الفاتح",
  },
  "header.themeDark": { en: "Switch to dark mode", ar: "التبديل للوضع الداكن" },
  "header.toggleMenu": { en: "Toggle menu", ar: "إظهار القائمة" },
  "header.accountMenu": { en: "Account menu", ar: "قائمة الحساب" },
  "header.langSwitchToEn": {
    en: "Switch to English",
    ar: "التبديل إلى الإنجليزية",
  },
  "header.langSwitchToAr": {
    en: "Switch to Arabic",
    ar: "التبديل إلى العربية",
  },

  // ───────────────────── PLATFORM LANDING (HOMEPAGE) ─────────────────────
  "platform.hero.alt": {
    en: "Abu Omar EduLexo — Learn · Practice · Achieve · Powered by EduLexo AI",
    ar: "Abu Omar EduLexo — Learn · Practice · Achieve · Powered by EduLexo AI",
  },
  "platform.hero.headline1": {
    en: "Two powerful courses.",
    ar: "مساران قويان…",
  },
  "platform.hero.headline2": {
    en: "One smart platform.",
    ar: "منصة ذكية واحدة.",
  },
  "platform.hero.subtitle": {
    en: "Whether you're starting your journey from your first English words or aiming for an IELTS band 8 — Abu Omar EduLexo gives you AI-powered practice, native audio, bilingual support, and a real teacher beside you.",
    ar: "سواء كنت تبدأ من أولى خطواتك في تعلّم الإنجليزية، أو تسعى لتحقيق درجة 8 في اختبار IELTS — تقدّم لك منصة Abu Omar EduLexo تجربة متكاملة تجمع بين دروس أبو عمر المرئية، وتقنيات الذكاء الاصطناعي، والنطق الأصلي، والدعم الثنائي اللغة، مع إشراف مباشر يرافقك في كل خطوة حتى تحقق هدفك.",
  },
  "platform.products.eyebrow": { en: "Our Courses", ar: "دوراتنا" },
  "platform.products.title": {
    en: "Choose the right path for you",
    ar: "اختر المسار المناسب لك",
  },
  "platform.products.subtitle": {
    en: "Two complete courses, both built with the same AI-powered platform.",
    ar: "دورتان متكاملتان، كلتاهما مبنيّتان على المنصّة نفسها المدعومة بالذكاء الاصطناعي.",
  },
  "platform.products.courseOne": { en: "Course One", ar: "الدورة الأولى" },
  "platform.products.courseTwo": { en: "Course Two", ar: "الدورة الثانية" },
  "platform.products.courseThree": { en: "Course Three", ar: "الدورة الثالثة" },
  "platform.products.englishName": {
    en: "LEXO for English",
    ar: "LEXO for English",
  },
  "platform.products.ieltsName": { en: "LEXO for IELTS", ar: "LEXO for IELTS" },
  "platform.products.introName": { en: "LEXO Intro", ar: "LEXO Intro" },
  "platform.products.englishDesc": {
    en: "Master everyday English from the ground up — built on the Oxford 3000 wordlist with native British audio, bilingual translations, and progressive packages from A1 to C1.",
    ar: "أتقن الإنجليزية اليوميّة من الصفر — مبنية على قائمة أكسفورد 3000 بصوت بريطاني أصلي وترجمات ثنائية اللغة وباقات متدرّجة من A1 إلى C1.",
  },
  "platform.products.ieltsDesc": {
    en: "Your AI-powered companion for IELTS success. Master vocabulary, ace your speaking and writing with Churchill & Orwell AI, and prepare with full mock tests for Listening and Reading.",
    ar: "رفيقك الذكي للنجاح في الأيلتس. أتقن المفردات، طوّر مهارات المحادثة والكتابة مع تشرشل وأورويل AI، واستعد باختبارات تجريبية كاملة للاستماع والقراءة.",
  },
  "platform.products.introDesc": {
    en: "The perfect starting point for IELTS beginners — build A2 + B1 vocabulary, listening, reading, speaking, and writing foundations before moving up to the full IELTS prep track.",
    ar: "نقطة الانطلاق المثاليّة لمبتدئي الأيلتس — ابنِ مفردات A2 و B1 ومهارات الاستماع والقراءة والمحادثة والكتابة قبل الانتقال إلى مسار الإعداد الكامل للأيلتس.",
  },
  "platform.products.mostAdvanced": {
    en: "Most Advanced",
    ar: "الأكثر تطوّراً",
  },
  "platform.products.startHere": { en: "Start Here", ar: "ابدأ هنا" },
  "platform.eng.h1": {
    en: "2,988 Oxford 3000 words",
    ar: "2,988 كلمة من أكسفورد 3000",
  },
  "platform.eng.h2": { en: "Native British audio", ar: "صوت بريطاني أصلي" },
  "platform.eng.h3": {
    en: "AI Speaking practice",
    ar: "تدريب على المحادثة بالذكاء الاصطناعي",
  },
  "platform.eng.h4": { en: "From A1 to C1", ar: "من A1 إلى C1" },
  "platform.ielts.h1": {
    en: "Churchill AI Speaking coach",
    ar: "مدرّب المحادثة تشرشل AI",
  },
  "platform.ielts.h2": {
    en: "Orwell AI essay checker",
    ar: "مدقّق المقالات أورويل AI",
  },
  "platform.ielts.h3": {
    en: "Listening + Reading tests",
    ar: "اختبارات استماع وقراءة",
  },
  "platform.ielts.h4": {
    en: "Full IELTS Mock Tests",
    ar: "اختبارات أيلتس تجريبية كاملة",
  },
  "platform.intro.h1": {
    en: "A2 + B1 vocabulary (~1,400 words)",
    ar: "مفردات A2 + B1 (~1,400 كلمة)",
  },
  "platform.intro.h2": {
    en: "Lessons, study, quiz & browse modes",
    ar: "دروس، دراسة، اختبارات وتصفّح",
  },
  "platform.intro.h3": {
    en: "Stories · Listening · Reading practice",
    ar: "قصص · تدريب استماع وقراءة",
  },
  "platform.intro.h4": {
    en: "Churchill Speaking + Orwell Writing",
    ar: "تشرشل للمحادثة + أورويل للكتابة",
  },

  "platform.features.eyebrow": { en: "Why EduLexo", ar: "لماذا EduLexo" },
  "platform.features.title": {
    en: "Not just another platform…",
    ar: "مو مجرد منصة…",
  },
  "platform.features.tagline": {
    en: "What makes our platform different",
    ar: "ما الذي يميّز منصّتنا",
  },
  "platform.features.subtitle": {
    en: "Abu Omar teaches you, and EduLexo trains you — the result: real progress from the start all the way to mastery.",
    ar: "أبو عمر يعلّمك، وEduLexo يدرّبك — والنتيجة: تقدّم حقيقي من البداية إلى الاحتراف",
  },
  "platform.feat1.title": {
    en: "AI-Powered Practice",
    ar: "تدريب بالذكاء الاصطناعي",
  },
  "platform.feat1.desc": {
    en: "Personal AI coaches for speaking and writing. Instant, detailed feedback.",
    ar: "مدرّبون شخصيّون بالذكاء الاصطناعي للمحادثة والكتابة، مع ملاحظات فوريّة ومفصّلة.",
  },
  "platform.feat2.title": { en: "Native Audio", ar: "صوت أصلي" },
  "platform.feat2.desc": {
    en: "Hear every word in clear native English — train your ear from day one.",
    ar: "اسمع كل كلمة بنطق إنجليزي أصلي وواضح، ودرّب أذنك من اليوم الأول.",
  },
  "platform.feat3.title": {
    en: "Bilingual EN ↔ AR",
    ar: "ثنائي اللغة EN ↔ AR",
  },
  "platform.feat3.desc": {
    en: "Every lesson, definition, and example available in both English and Arabic.",
    ar: "كل درس وتعريف ومثال متوفّر بالإنجليزيّة والعربيّة.",
  },
  "platform.feat4.title": {
    en: "Live Teacher Support",
    ar: "دعم من معلّم مباشر",
  },
  "platform.feat4.desc": {
    en: "Real teachers, not just bots. Get help from Abu Omar and the team.",
    ar: "معلّمون حقيقيّون لا روبوتات فقط — احصل على دعم من Abu Omar والفريق.",
  },
  "platform.feat5.title": { en: "Track Your Progress", ar: "تابع تقدّمك" },
  "platform.feat5.desc": {
    en: "Daily streaks, XP, weak-word decks, and clear path from A1 to C1 mastery.",
    ar: "سلاسل يوميّة، نقاط خبرة، كلمات الضعف، ومسار واضح من A1 إلى الإتقان C1.",
  },
  "platform.feat6.title": {
    en: "Built for Real Exams",
    ar: "مصمّم للامتحانات الحقيقيّة",
  },
  "platform.feat6.desc": {
    en: "Mock tests, exam-style questions, and grading that mirror the real IELTS.",
    ar: "اختبارات تجريبيّة وأسئلة على نمط الامتحان وتصحيح مطابق للأيلتس الحقيقي.",
  },

  "platform.cta.title": {
    en: "Ready to start your journey?",
    ar: "هل أنت مستعد لبدء رحلتك؟",
  },
  "platform.cta.subtitle": {
    en: "Pick the course that fits your goals. Both come with the full power of EduLexo.",
    ar: "اختر الدورة التي تناسب أهدافك. كلتاهما بكامل قدرات منصّة EduLexo.",
  },

  // ─────────────────── ENGLISH COURSE LANDING ───────────────────
  "english.eyebrow": { en: "EduLexo", ar: "EduLexo" },
  "english.hero.headline1": { en: "Master English", ar: "أتقن الإنجليزيّة" },
  "english.hero.headline2": { en: "the smart way.", ar: "بالطريقة الذكيّة." },
  "english.hero.subtitle": {
    en: "Your smart journey to learning English — built on the Oxford 3000, with native British audio and AI-powered practice. Video lessons with Abu Omar. Smart interactive exercises. Progress tracking that follows your level. From your first words to complete fluency, all in one place.",
    ar: "رحلتك الذكيّة لتعلّم الإنجليزيّة — مبنيّة على مفردات أكسفورد 3000، بصوت بريطاني أصلي، وتدريب بالذكاء الاصطناعي. دروس مرئيّة مع Abu Omar. تمارين تفاعليّة ذكيّة. متابعة لمستوى تقدّمك. من أولى الكلمات إلى الطلاقة الكاملة، كل ذلك في مكان واحد.",
  },
  "english.hero.cta1": { en: "Start Learning Free", ar: "ابدأ التعلّم مجاناً" },
  "english.hero.cta2": { en: "Try the Flashcards", ar: "جرّب البطاقات" },
  "english.highlight.audio": {
    en: "Native British Audio",
    ar: "صوت بريطاني أصلي",
  },
  "english.highlight.bilingual": {
    en: "Bilingual EN ↔ AR",
    ar: "ثنائي اللغة EN ↔ AR",
  },
  "english.highlight.cefr": { en: "CEFR Aligned", ar: "وفق إطار CEFR" },
  "english.highlight.teacher": { en: "Teacher Approved", ar: "بإشراف معلّم" },
  "english.brandAlt": {
    en: "LEXO for English — Master English the smart way",
    ar: "LEXO for English — أتقن الإنجليزية بالطريقة الذكية",
  },
  "english.preview.today": { en: "Today", ar: "اليوم" },
  "english.preview.british": { en: "British", ar: "بريطاني" },
  "english.preview.words": {
    en: "2,988 Oxford words",
    ar: "2,988 كلمة من أكسفورد",
  },
  "english.preview.families": { en: "75 families", ar: "75 مجموعة كلمات" },

  "english.packages.eyebrow": { en: "Three Programs", ar: "ثلاث باقات" },
  "english.packages.title": {
    en: "Pick the path for your level",
    ar: "اختر المسار المناسب لمستواك",
  },
  "english.packages.subtitle": {
    en: "Three carefully designed packages, one platform.",
    ar: "ثلاث باقات مصمّمة بعناية على منصّة واحدة.",
  },
  "english.packages.bestValue": { en: "BEST VALUE", ar: "الأفضل قيمةً" },
  "english.pkg1.scope": { en: "Books 1–3", ar: "الكتب 1–3" },
  "english.pkg2.scope": { en: "Books 4–6", ar: "الكتب 4–6" },
  "english.pkg3.scope": { en: "Books 1–6", ar: "الكتب 1–6" },
  "english.pkg1.label": { en: "CEFR A1 → B1", ar: "CEFR A1 → B1" },
  "english.pkg1.name": {
    en: "From Beginner to Intermediate",
    ar: "من المبتدئ حتى المتوسط",
  },
  "english.pkg1.desc": {
    en: "From your first words to confident everyday conversation — the foundation track that takes you from A1 all the way through B1.",
    ar: "من أولى الكلمات إلى محادثات يوميّة بثقة — مسار التأسيس الذي ينقلك من A1 وصولاً إلى B1.",
  },
  "english.pkg2.label": { en: "CEFR B1 → C1", ar: "CEFR B1 → C1" },
  "english.pkg2.name": {
    en: "From Intermediate to Advanced",
    ar: "من المتوسط حتى المتقدم",
  },
  "english.pkg2.desc": {
    en: "Polish, precision, and the vocabulary to express any idea — go from B1 confidence to C1 mastery.",
    ar: "إتقان ودقّة ومفردات تعبّر بها عن أي فكرة — انتقل من ثقة B1 إلى إتقان C1.",
  },

  "english.pkg3.label": { en: "CEFR A1 → C1", ar: "CEFR A1 → C1" },
  "english.pkg3.name": {
    en: "From Beginner to Advanced",
    ar: "من المبتدئ حتى المتقدم",
  },
  "english.pkg3.desc": {
    en: "The complete journey — from your very first words to full professional fluency, all in one package.",
    ar: "الرحلة الكاملة — من أولى كلماتك حتى الطلاقة المهنيّة الكاملة، في باقة واحدة.",
  },

  "english.course.tier.complete.name": {
    en: "From Beginner to Advanced",
    ar: "من المبتدئ حتى المتقدم",
  },
  "english.course.tier.complete.range": { en: "A1 → C1", ar: "A1 → C1" },
  "english.course.tier.complete.level": {
    en: "Beginner → Advanced",
    ar: "مبتدئ → متقدم",
  },
  "english.course.tier.complete.blurb": {
    en: "Everything you need in one package — build from zero to confident professional English, covering all CEFR levels from A1 through C1.",
    ar: "كلّ ما تحتاجه في باقة واحدة — ابنِ إنجليزيّتك من الصفر حتى الطلاقة المهنيّة، بتغطية جميع مستويات CEFR من A1 حتى C1.",
  },
  "english.course.tier.complete.f1": {
    en: "All A1 → B1 foundation lessons + B2 → C1 advanced content",
    ar: "جميع دروس التأسيس A1 → B1 + المحتوى المتقدّم B2 → C1",
  },
  "english.course.tier.complete.f2": {
    en: "Full vocabulary library: 3,000+ words across all levels",
    ar: "مكتبة مفردات كاملة: أكثر من 3,000 كلمة عبر جميع المستويات",
  },
  "english.course.tier.complete.f3": {
    en: "Speaking, writing, listening & reading practice at every stage",
    ar: "تدريب على المحادثة والكتابة والاستماع والقراءة في كلّ مرحلة",
  },
  "english.course.tier.complete.f4": {
    en: "Best value — save compared to purchasing tiers separately",
    ar: "أفضل قيمة — وفّر مقارنة بشراء كلّ مستوى على حدة",
  },

  "english.modules.eyebrow": { en: "What's Inside", ar: "ماذا يوجد بالداخل" },
  "english.modules.title": {
    en: "Everything you need, in one place",
    ar: "كل ما تحتاجه في مكان واحد",
  },
  "english.modules.subtitle": {
    en: "Vocabulary, lessons, speaking, writing, listening, reading & assessment.",
    ar: "مفردات ودروس ومحادثة وكتابة واستماع وقراءة وتقييم.",
  },
  "english.modules.live": { en: "Live", ar: "متاح الآن" },
  "english.modules.soon": { en: "Coming Soon", ar: "قريباً" },
  "english.modules.open": { en: "Open", ar: "افتح" },
  "english.mod.vocab.title": { en: "Vocabulary", ar: "المفردات" },
  "english.mod.vocab.desc": {
    en: "Oxford 3000 flashcards with native British audio, Arabic translations, and 75 themed Word Families.",
    ar: "بطاقات أكسفورد 3000 بصوت بريطاني أصلي وترجمات عربيّة و75 مجموعة كلمات مترابطة.",
  },
  "english.mod.lessons.title": { en: "Lessons", ar: "الدروس" },
  "english.mod.lessons.desc": {
    en: "Structured video lessons curated by your teacher, organized by package and level.",
    ar: "دروس فيديو منظّمة من إعداد معلّمك، مرتّبة حسب الباقة والمستوى.",
  },
  "english.mod.speaking.title": { en: "Speaking", ar: "المحادثة" },
  "english.mod.speaking.desc": {
    en: "Conversation practice with an AI partner — by voice or text. Build fluency at your own pace.",
    ar: "تدرّب على المحادثة مع مساعد ذكي بالصوت أو بالكتابة، وطوّر طلاقتك بإيقاعك.",
  },
  "english.mod.writing.title": { en: "Writing", ar: "الكتابة" },
  "english.mod.writing.desc": {
    en: "Submit writing homework and receive detailed AI feedback on grammar, structure, and style.",
    ar: "ارفع واجبات الكتابة واحصل على تقييم تفصيلي للقواعد والبنية والأسلوب.",
  },
  "english.mod.listening.title": { en: "Listening", ar: "الاستماع" },
  "english.mod.listening.desc": {
    en: "Audio lessons and homework to sharpen your ear for natural English.",
    ar: "دروس صوتيّة وواجبات لتطوير الاستماع للإنجليزيّة الطبيعيّة.",
  },
  "english.mod.reading.title": { en: "Reading", ar: "القراءة" },
  "english.mod.reading.desc": {
    en: "Short stories with multiple-choice questions to build comprehension and vocabulary in context.",
    ar: "قصص قصيرة مع أسئلة اختيار من متعدّد لتعزيز الفهم والمفردات في سياقها.",
  },
  "english.mod.test.title": { en: "Final Test", ar: "الاختبار النهائي" },
  "english.mod.test.desc": {
    en: "Comprehensive assessment to measure your progress and certify your level.",
    ar: "تقييم شامل لقياس تقدّمك واعتماد مستواك.",
  },

  "english.cta.title": {
    en: "Ready to start your journey?",
    ar: "هل أنت مستعد لبدء رحلتك؟",
  },
  "english.cta.subtitle": {
    en: "Try the Vocabulary module right now — no signup required.",
    ar: "جرّب وحدة المفردات الآن — دون الحاجة للتسجيل.",
  },
  "english.cta.button": { en: "Try the Demo", ar: "جرّب العرض التجريبي" },
  "english.footer.copyright": {
    en: "LEXO for English · Oxford 3000™ · Native British Audio",
    ar: "LEXO for English · Oxford 3000™ · صوت بريطاني أصلي",
  },
  "english.footer.brand": { en: "for English", ar: "for English" },

  // ─────────────────── IELTS COURSE ───────────────────
  "ielts.hero.headline1": { en: "Your AI companion", ar: "رفيقك الذكي" },
  "ielts.hero.headline2": {
    en: "for IELTS success.",
    ar: "للنجاح في الأيلتس.",
  },
  "ielts.hero.subtitle": {
    en: "Master IELTS vocabulary, practice speaking with Churchill AI, get your essays graded by Orwell AI, and sit full mock tests for Listening and Reading — all in one platform.",
    ar: "أتقن مفردات الأيلتس، تدرّب على المحادثة مع تشرشل AI، احصل على تقييم مقالاتك من أورويل AI، واجلس لاختبارات تجريبية كاملة للاستماع والقراءة — كل ذلك في منصّة واحدة.",
  },
  "ielts.hero.cta1": { en: "Enroll Now", ar: "سجّل الآن" },
  "ielts.hero.cta2": { en: "See What's Inside", ar: "اطّلع على المحتوى" },
  "ielts.value.vocab": {
    en: "2,198 IELTS-tuned words",
    ar: "2,198 كلمة مخصّصة للأيلتس",
  },
  "ielts.value.coaches": {
    en: "AI Speaking + Writing coaches",
    ar: "مدرّبا محادثة وكتابة بالذكاء الاصطناعي",
  },
  "ielts.value.tests": {
    en: "Full Listening + Reading mock tests",
    ar: "اختبارات استماع وقراءة تجريبيّة كاملة",
  },
  "ielts.value.bilingual": {
    en: "Bilingual EN ↔ AR",
    ar: "ثنائي اللغة EN ↔ AR",
  },
  "ielts.brandAlt": {
    en: "LEXO for IELTS — AI-powered IELTS preparation",
    ar: "LEXO for IELTS — تحضير للأيلتس Powered by EduLexo AI",
  },
  "ielts.preview.vocab": { en: "Vocab", ar: "مفردات" },
  "ielts.preview.tests": { en: "Tests", ar: "اختبارات" },
  "ielts.preview.ai": { en: "AI", ar: "ذكاء" },
  "ielts.preview.coaches": { en: "2 Coaches", ar: "مدرّبان" },

  "ielts.modules.eyebrow": { en: "What's Inside", ar: "ماذا يوجد بالداخل" },
  "ielts.modules.title": {
    en: "Everything you need to ace IELTS",
    ar: "كل ما تحتاجه للنجاح في الأيلتس",
  },
  "ielts.modules.subtitle": {
    en: "Twelve integrated tools, two AI coaches, and full mock-test simulation.",
    ar: "اثنتا عشرة أداة متكاملة، ومدرّبان بالذكاء الاصطناعي، ومحاكاة كاملة للاختبار التجريبي.",
  },
  "ielts.modules.included": { en: "Included", ar: "مُضمَّن" },
  "ielts.mod.vocab.title": { en: "Vocabulary", ar: "المفردات" },
  "ielts.mod.vocab.desc": {
    en: "2,198 CEFR-corrected IELTS-tuned flashcards with Arabic translations and bilingual examples.",
    ar: "2,198 بطاقة مفردات مضبوطة على إطار CEFR ومخصّصة للأيلتس مع ترجمات عربية وأمثلة ثنائية اللغة.",
  },
  "ielts.mod.churchill.title": {
    en: "Churchill AI · Speaking",
    ar: "تشرشل AI · المحادثة",
  },
  "ielts.mod.churchill.desc": {
    en: "AI speaking coach with topic banks for IELTS Parts 1, 2 & 3. Practice anytime, get instant feedback.",
    ar: "مدرّب محادثة بالذكاء الاصطناعي مع بنوك أسئلة لأجزاء الأيلتس 1 و2 و3. تدرّب في أي وقت واحصل على ملاحظات فوريّة.",
  },
  "ielts.mod.orwell.title": {
    en: "Orwell AI · Writing",
    ar: "أورويل AI · الكتابة",
  },
  "ielts.mod.orwell.desc": {
    en: "Submit IELTS Task 1 & 2 essays — get a detailed band-score evaluation and improvement plan.",
    ar: "أرسل مقالات الأيلتس Task 1 و2 — واحصل على تقييم تفصيلي لدرجة Band مع خطة تحسين.",
  },
  "ielts.mod.listening.title": { en: "Listening Test", ar: "اختبار الاستماع" },
  "ielts.mod.listening.desc": {
    en: "Full IELTS-format listening sections with native audio and auto-grading.",
    ar: "أقسام استماع كاملة بصيغة الأيلتس بصوت أصلي وتصحيح تلقائي.",
  },
  "ielts.mod.reading.title": { en: "Reading Test", ar: "اختبار القراءة" },
  "ielts.mod.reading.desc": {
    en: "Authentic-style reading passages with timed practice and detailed answer explanations.",
    ar: "نصوص قراءة بنمط الامتحان مع تدريب مؤقّت وشرح تفصيلي للإجابات.",
  },
  "ielts.mod.mock.title": {
    en: "Full Mock Tests",
    ar: "اختبارات تجريبيّة كاملة",
  },
  "ielts.mod.mock.desc": {
    en: "Sit complete IELTS mock tests under exam conditions, with band-level grading.",
    ar: "اجلس لاختبارات أيلتس تجريبيّة كاملة بظروف الامتحان مع تصحيح بمستوى Band.",
  },
  "ielts.mod.chat.title": { en: "LEXO AI Chat", ar: "محادثة LEXO AI" },
  "ielts.mod.chat.desc": {
    en: "Ask anything IELTS-related: grammar, strategy, exam tips. Powered by Claude Sonnet.",
    ar: "اسأل أي شيء عن الأيلتس: قواعد، استراتيجية، نصائح للامتحان. مدعوم بـ Claude Sonnet.",
  },
  "ielts.mod.stories.title": { en: "Stories & Exercises", ar: "قصص وتمارين" },
  "ielts.mod.stories.desc": {
    en: "Reading-comprehension stories with AI-generated exercises to reinforce vocabulary in context.",
    ar: "قصص للفهم القرائي مع تمارين مولّدة بالذكاء الاصطناعي لتعزيز المفردات في سياقها.",
  },
  "ielts.mod.spell.title": { en: "Spell It Game", ar: "لعبة التهجئة" },
  "ielts.mod.spell.desc": {
    en: "Timed spelling challenges with text-to-speech to lock in spelling and pronunciation.",
    ar: "تحديات تهجئة مؤقّتة مع تحويل النص إلى كلام لتثبيت التهجئة والنطق.",
  },
  "ielts.mod.spaced.title": { en: "Spaced Repetition", ar: "التكرار المتباعد" },
  "ielts.mod.spaced.desc": {
    en: "SM-2 algorithm schedules reviews exactly when you're about to forget — proven memory science.",
    ar: "خوارزمية SM-2 تجدول المراجعة في الوقت الذي توشك فيه على النسيان — علم ذاكرة مُثبت.",
  },
  "ielts.mod.grammar.title": {
    en: "Grammar & Phrasal Verbs",
    ar: "القواعد والأفعال المركّبة",
  },
  "ielts.mod.grammar.desc": {
    en: "Topic-based grammar lessons, synonyms, antonyms, and a deep phrasal-verbs library.",
    ar: "دروس قواعد منظّمة بالمواضيع، مرادفات، أضداد، ومكتبة عميقة للأفعال المركّبة.",
  },
  "ielts.mod.streaks.title": {
    en: "Daily Streaks & Plans",
    ar: "السلاسل اليوميّة والخطط",
  },
  "ielts.mod.streaks.desc": {
    en: "Daily learning plans, XP, streak tracking, and a downloadable bilingual study plan PDF.",
    ar: "خطط تعلّم يوميّة ونقاط خبرة وسلاسل وملف PDF ثنائي اللغة قابل للتحميل.",
  },

  "ielts.cta.eyebrow": {
    en: "Enroll in LEXO for IELTS",
    ar: "سجّل في LEXO for IELTS",
  },
  "ielts.cta.title": {
    en: "Start your path to your target band",
    ar: "ابدأ مسارك نحو الدرجة المستهدفة",
  },
  "ielts.cta.subtitle": {
    en: "Sign up, choose your payment plan, and get instant access to the full IELTS course.",
    ar: "سجّل، اختر طريقة الدفع المناسبة، واحصل على وصول فوري لكامل دورة الأيلتس.",
  },
  "ielts.cta.button": { en: "Enroll Now", ar: "سجّل الآن" },
  "ielts.cta.back": { en: "Back to Platform", ar: "العودة للمنصّة" },
  "ielts.cta.note": {
    en: "Payment processing launches soon — sign up now to be the first to enroll.",
    ar: "خدمة الدفع ستُطلق قريباً — سجّل الآن لتكون من الأوائل.",
  },
  "ielts.footer.brand": { en: "LEXO for IELTS", ar: "LEXO for IELTS" },

  // ─────────────────── AUTH ───────────────────
  "auth.signup.title": { en: "Create your account", ar: "أنشئ حسابك" },
  "auth.signup.subtitle": {
    en: "Start learning with Abu Omar — it's free to sign up.",
    ar: "ابدأ التعلّم مع Abu Omar — التسجيل مجاني.",
  },
  "auth.signup.haveAccount": {
    en: "Already have an account?",
    ar: "لديك حساب بالفعل؟",
  },
  "auth.signup.fullName": { en: "Full name", ar: "الاسم الكامل" },
  "auth.signup.fullNamePh": { en: "Your full name", ar: "اسمك الكامل" },
  "auth.signup.email": { en: "Email", ar: "البريد الإلكتروني" },
  "auth.signup.emailPh": { en: "you@example.com", ar: "you@example.com" },
  "auth.signup.phone": { en: "Phone (optional)", ar: "الهاتف (اختياري)" },
  "auth.signup.phonePh": { en: "+971 50 123 4567", ar: "+971 50 123 4567" },
  "auth.signup.password": { en: "Password", ar: "كلمة المرور" },
  "auth.signup.passwordPh": {
    en: "At least 8 characters",
    ar: "8 أحرف على الأقل",
  },
  "auth.signup.confirm": { en: "Confirm password", ar: "تأكيد كلمة المرور" },
  "auth.signup.submit": { en: "Create account", ar: "إنشاء الحساب" },
  "auth.signup.errPasswordShort": {
    en: "Password must be at least 8 characters.",
    ar: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
  },
  "auth.signup.errPasswordMismatch": {
    en: "Passwords do not match.",
    ar: "كلمتا المرور غير متطابقتين.",
  },
  "auth.signup.errFailed": { en: "Signup failed", ar: "فشل التسجيل" },

  "auth.login.title": { en: "Welcome back", ar: "مرحباً بعودتك" },
  "auth.login.subtitle": {
    en: "Log in to continue your learning journey.",
    ar: "سجّل دخولك لمتابعة رحلة التعلّم.",
  },
  "auth.login.newHere": { en: "New here?", ar: "جديد هنا؟" },
  "auth.login.email": { en: "Email", ar: "البريد الإلكتروني" },
  "auth.login.password": { en: "Password", ar: "كلمة المرور" },
  "auth.login.forgot": { en: "Forgot?", ar: "نسيت؟" },
  "auth.login.submit": { en: "Log in", ar: "تسجيل الدخول" },
  "auth.login.errFailed": { en: "Login failed", ar: "فشل تسجيل الدخول" },

  "auth.forgot.title": { en: "Forgot your password?", ar: "نسيت كلمة المرور؟" },
  "auth.forgot.subtitle": {
    en: "Enter your email and we'll send you a link to choose a new one.",
    ar: "أدخل بريدك الإلكتروني وسنرسل لك رابطاً لاختيار كلمة مرور جديدة.",
  },
  "auth.forgot.remembered": { en: "Remembered it?", ar: "تذكّرتها؟" },
  "auth.forgot.email": { en: "Email", ar: "البريد الإلكتروني" },
  "auth.forgot.submit": { en: "Send reset link", ar: "إرسال رابط الاستعادة" },
  "auth.forgot.errFailed": { en: "Something went wrong", ar: "حدث خطأ ما" },
  "auth.forgot.doneTitle": { en: "Check your inbox", ar: "تحقّق من بريدك" },
  "auth.forgot.doneBodyPrefix": {
    en: "If",
    ar: "إذا كان",
  },
  "auth.forgot.doneBodySuffix": {
    en: "is registered, we just sent a password-reset link to that address. The link expires in 60 minutes.",
    ar: "مُسجَّلاً، فقد أرسلنا رابطاً لإعادة تعيين كلمة المرور إلى ذلك العنوان. تنتهي صلاحية الرابط بعد 60 دقيقة.",
  },
  "auth.forgot.backToLogin": {
    en: "Back to log in",
    ar: "العودة لتسجيل الدخول",
  },

  "auth.reset.title": {
    en: "Choose a new password",
    ar: "اختر كلمة مرور جديدة",
  },
  "auth.reset.newPassword": { en: "New password", ar: "كلمة المرور الجديدة" },
  "auth.reset.newPasswordPh": {
    en: "At least 8 characters",
    ar: "8 أحرف على الأقل",
  },
  "auth.reset.confirm": {
    en: "Confirm new password",
    ar: "تأكيد كلمة المرور الجديدة",
  },
  "auth.reset.submit": { en: "Update password", ar: "تحديث كلمة المرور" },
  "auth.reset.errMissingToken": {
    en: "Missing reset token. Please use the link from your email.",
    ar: "رمز إعادة التعيين مفقود. يرجى استخدام الرابط من بريدك الإلكتروني.",
  },
  "auth.reset.errPasswordShort": {
    en: "Password must be at least 8 characters.",
    ar: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
  },
  "auth.reset.errPasswordMismatch": {
    en: "Passwords do not match.",
    ar: "كلمتا المرور غير متطابقتين.",
  },
  "auth.reset.errFailed": { en: "Reset failed", ar: "فشل إعادة التعيين" },
  "auth.reset.doneTitle": {
    en: "Password updated",
    ar: "تم تحديث كلمة المرور",
  },
  "auth.reset.doneBody": {
    en: "Your password has been reset. You can now log in with your new password.",
    ar: "تمّت إعادة تعيين كلمة المرور. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.",
  },
  "auth.reset.goLogin": { en: "Go to log in", ar: "الذهاب لتسجيل الدخول" },

  "auth.verify.title": {
    en: "Verifying your email…",
    ar: "جاري التحقق من بريدك الإلكتروني…",
  },
  "auth.verify.successTitle": {
    en: "Email verified",
    ar: "تم التحقق من البريد الإلكتروني",
  },
  "auth.verify.successBody": {
    en: "Thanks! Your email is now verified.",
    ar: "شكراً لك! تم التحقق من بريدك الإلكتروني.",
  },
  "auth.verify.errMissingToken": {
    en: "Missing verification token. Please use the link from your email.",
    ar: "رمز التحقق مفقود. يرجى استخدام الرابط من بريدك الإلكتروني.",
  },
  "auth.verify.errFailed": {
    en: "Verification failed. The link may be invalid or expired.",
    ar: "فشل التحقق. قد يكون الرابط غير صالح أو منتهي الصلاحية.",
  },
  "auth.verify.goDashboard": {
    en: "Go to dashboard",
    ar: "الذهاب للوحة التحكم",
  },
  "auth.verify.goLogin": {
    en: "Log in to continue",
    ar: "سجّل الدخول للمتابعة",
  },
  "auth.verify.tryAgain": { en: "Request a new link", ar: "طلب رابط جديد" },

  "auth.unverified.title": {
    en: "Please verify your email",
    ar: "يرجى التحقق من بريدك الإلكتروني",
  },
  "auth.unverified.body": {
    en: "We sent a verification link to your email. Click it to confirm your address.",
    ar: "أرسلنا رابط تحقق إلى بريدك الإلكتروني. اضغط عليه لتأكيد عنوانك.",
  },
  "auth.unverified.resend": {
    en: "Resend verification email",
    ar: "إعادة إرسال رابط التحقق",
  },
  "auth.unverified.sending": { en: "Sending…", ar: "جارٍ الإرسال…" },
  "auth.unverified.sent": {
    en: "Sent! Please check your inbox (and spam folder).",
    ar: "تم الإرسال! يرجى التحقق من البريد الوارد (ومجلد الرسائل غير المرغوب فيها).",
  },

  // ─────────────────── DASHBOARD ───────────────────
  "dashboard.eyebrow": { en: "My Dashboard", ar: "لوحة التحكم" },
  "dashboard.welcome": { en: "Welcome back,", ar: "مرحباً بعودتك،" },
  "dashboard.subtitle": {
    en: "Pick up where you left off, browse free lessons, or take the level assessment to find your starting point.",
    ar: "تابع من حيث توقّفت، تصفّح الدروس المجانية، أو اخضع لاختبار تحديد المستوى لمعرفة نقطة الانطلاق.",
  },
  "dashboard.action.ielts.title": {
    en: "LEXO for IELTS",
    ar: "LEXO for IELTS",
  },
  "dashboard.action.ielts.desc": {
    en: "Band 7+ in 12 weeks with AI-powered practice.",
    ar: "Band 7+ خلال 12 أسبوعاً مع تدريب بالذكاء الاصطناعي.",
  },
  "dashboard.action.english.title": {
    en: "LEXO for English",
    ar: "LEXO for English",
  },
  "dashboard.action.english.desc": {
    en: "Master Oxford 3000 and build everyday fluency.",
    ar: "أتقن مفردات أكسفورد 3000 وابنِ طلاقتك اليوميّة.",
  },
  "dashboard.action.assessment.title": {
    en: "Level Assessment",
    ar: "تحديد المستوى",
  },
  "dashboard.action.assessment.desc": {
    en: "Find out exactly where to begin — A1 to C2.",
    ar: "اعرف بدقّة من أين تبدأ — من A1 إلى C2.",
  },
  "dashboard.enrollments.title": { en: "My enrollments", ar: "تسجيلاتي" },
  "dashboard.enrollments.empty": {
    en: "You haven't enrolled in a course yet.",
    ar: "لم تسجّل في أي دورة بعد.",
  },
  "dashboard.enrollments.browseIelts": {
    en: "Browse LEXO for IELTS",
    ar: "تصفّح LEXO for IELTS",
  },
  "dashboard.enrollments.browseEnglish": {
    en: "Browse LEXO for English",
    ar: "تصفّح LEXO for English",
  },
  "dashboard.profile.title": { en: "My profile", ar: "ملفّي الشخصي" },
  "dashboard.profile.email": { en: "Email", ar: "البريد الإلكتروني" },
  "dashboard.profile.phone": { en: "Phone", ar: "الهاتف" },
  "dashboard.profile.accountType": { en: "Account type", ar: "نوع الحساب" },
  "dashboard.profile.admin": { en: "Administrator", ar: "مدير" },
  "dashboard.profile.student": { en: "Student", ar: "طالب" },
  "dashboard.profile.memberSince": { en: "Member since", ar: "عضو منذ" },
  "dashboard.profile.bio": { en: "About me", ar: "نبذة عنّي" },
  "dashboard.profile.bioPlaceholder": {
    en: "Add a short bio so other learners know a bit about you…",
    ar: "أضف نبذة قصيرة ليتعرّف عليك زملاؤك…",
  },
  "dashboard.profile.editBtn": { en: "Edit profile", ar: "تعديل الملف الشخصي" },
  "dashboard.profile.accountSettings": {
    en: "Account settings",
    ar: "إعدادات الحساب",
  },
  "dashboard.profile.viewPublic": {
    en: "View public profile",
    ar: "عرض ملفي العام",
  },
  "dashboard.profile.changePhoto": { en: "Change photo", ar: "تغيير الصورة" },
  "dashboard.profile.uploadHint": {
    en: "JPG, PNG or WebP. Up to 5 MB.",
    ar: "JPG أو PNG أو WebP. حتى ٥ ميغابايت.",
  },
  "dashboard.profile.removePhoto": { en: "Remove photo", ar: "إزالة الصورة" },
  "dashboard.profile.uploading": { en: "Uploading…", ar: "جارٍ الرفع…" },
  "dashboard.profile.uploadFailed": {
    en: "Upload failed. Please try again.",
    ar: "فشل الرفع. حاول مرّة أخرى.",
  },
  "dashboard.profile.fileTooLarge": {
    en: "Image is too large (max 5 MB).",
    ar: "الصورة كبيرة جدًا (حتى ٥ ميغابايت).",
  },
  "dashboard.profile.invalidType": {
    en: "Please choose a JPG, PNG or WebP image.",
    ar: "اختر صورة JPG أو PNG أو WebP.",
  },
  "dashboard.profile.editTitle": {
    en: "Edit profile",
    ar: "تعديل الملف الشخصي",
  },
  "dashboard.profile.fieldName": { en: "Full name", ar: "الاسم الكامل" },
  "dashboard.profile.fieldPhone": {
    en: "Phone (optional)",
    ar: "الهاتف (اختياري)",
  },
  "dashboard.profile.fieldBio": { en: "About me", ar: "نبذة عنّي" },
  "dashboard.profile.bioCounter": {
    en: "{n}/500 characters",
    ar: "{n}/٥٠٠ حرف",
  },
  "dashboard.profile.cancel": { en: "Cancel", ar: "إلغاء" },
  "dashboard.profile.save": { en: "Save changes", ar: "حفظ التغييرات" },
  "dashboard.profile.saving": { en: "Saving…", ar: "جارٍ الحفظ…" },
  "dashboard.profile.saved": { en: "Profile updated.", ar: "تم تحديث الملف." },
  "dashboard.profile.saveFailed": {
    en: "Could not save changes.",
    ar: "تعذّر حفظ التغييرات.",
  },
  "dashboard.summary.title": {
    en: "Subscription overview",
    ar: "نظرة على الاشتراك",
  },
  "dashboard.summary.activeCourses": {
    en: "Active courses",
    ar: "الدورات النشطة",
  },
  "dashboard.summary.activeCoursesNote": {
    en: "of {total} owned",
    ar: "من أصل {total}",
  },
  "dashboard.summary.certificates": {
    en: "Certificates earned",
    ar: "الشهادات المُكتسبة",
  },
  "dashboard.summary.certificatesNote": {
    en: "Across both courses",
    ar: "في كلتا الدورتين",
  },
  "dashboard.summary.nextExpiry": { en: "Next expiry", ar: "أقرب انتهاء" },
  "dashboard.summary.nextExpiryNone": {
    en: "No active subscription",
    ar: "لا يوجد اشتراك نشط",
  },
  "dashboard.summary.daysShort": { en: "{n} days", ar: "{n} يومًا" },
  "dashboard.summary.dayShort": { en: "1 day", ar: "يوم واحد" },
  "dashboard.summary.expiringSoon": { en: "Expiring soon", ar: "ينتهي قريبًا" },

  // ─────────────────── ACCOUNT SETTINGS ───────────────────
  "settings.title": { en: "Account settings", ar: "إعدادات الحساب" },
  "settings.subtitle": {
    en: "Manage your password, language, and email preferences.",
    ar: "أدِر كلمة المرور واللغة وتفضيلات البريد الإلكتروني.",
  },
  "settings.backToDashboard": {
    en: "Back to dashboard",
    ar: "العودة للوحة التحكم",
  },

  "settings.password.title": { en: "Change password", ar: "تغيير كلمة المرور" },
  "settings.password.subtitle": {
    en: "Use at least 8 characters. You'll stay signed in on this device.",
    ar: "استخدم 8 أحرف على الأقل. ستبقى مسجَّل الدخول على هذا الجهاز.",
  },
  "settings.password.current": {
    en: "Current password",
    ar: "كلمة المرور الحالية",
  },
  "settings.password.new": { en: "New password", ar: "كلمة المرور الجديدة" },
  "settings.password.confirm": {
    en: "Confirm new password",
    ar: "تأكيد كلمة المرور الجديدة",
  },
  "settings.password.hint": {
    en: "At least 8 characters.",
    ar: "على الأقل 8 أحرف.",
  },
  "settings.password.submit": {
    en: "Update password",
    ar: "تحديث كلمة المرور",
  },
  "settings.password.saving": { en: "Updating…", ar: "جارٍ التحديث…" },
  "settings.password.saved": {
    en: "Password updated.",
    ar: "تم تحديث كلمة المرور.",
  },
  "settings.password.errShort": {
    en: "New password must be at least 8 characters.",
    ar: "يجب ألّا تقل كلمة المرور الجديدة عن 8 أحرف.",
  },
  "settings.password.errMismatch": {
    en: "New password and confirmation do not match.",
    ar: "كلمة المرور الجديدة وتأكيدها غير متطابقَين.",
  },
  "settings.password.errSame": {
    en: "New password must be different from your current one.",
    ar: "يجب أن تختلف كلمة المرور الجديدة عن الحالية.",
  },
  "settings.password.errFailed": {
    en: "Could not update password. Please check your current password and try again.",
    ar: "تعذّر تحديث كلمة المرور. تحقّق من كلمة المرور الحالية وحاول مرّة أخرى.",
  },

  "settings.language.title": { en: "Default language", ar: "اللغة الافتراضية" },
  "settings.language.subtitle": {
    en: "We'll use this for your dashboard and email reminders.",
    ar: "سنستخدم هذه اللغة للوحة التحكم ورسائل التذكير.",
  },
  "settings.language.en": { en: "English", ar: "الإنجليزية" },
  "settings.language.ar": { en: "Arabic", ar: "العربية" },
  "settings.language.current": { en: "Current", ar: "الحالية" },
  "settings.language.saved": {
    en: "Language preference saved.",
    ar: "تم حفظ تفضيل اللغة.",
  },
  "settings.language.errFailed": {
    en: "Could not save language preference.",
    ar: "تعذّر حفظ تفضيل اللغة.",
  },

  "settings.emails.title": {
    en: "Email preferences",
    ar: "تفضيلات البريد الإلكتروني",
  },
  "settings.emails.subtitle": {
    en: "Choose which emails you'd like to receive.",
    ar: "اختر الرسائل التي تودّ تلقّيها.",
  },
  "settings.emails.expiryLabel": {
    en: "Subscription expiry reminders",
    ar: "تذكيرات انتهاء الاشتراك",
  },
  "settings.emails.expiryDesc": {
    en: "Get a heads-up before your access ends so you can renew on time.",
    ar: "احصل على تنبيه قبل انتهاء وصولك لتُجدِّد في الوقت المناسب.",
  },
  "settings.emails.marketingLabel": {
    en: "Tips & product updates",
    ar: "نصائح وتحديثات",
  },
  "settings.emails.marketingDesc": {
    en: "Occasional study tips, new features and special offers.",
    ar: "نصائح دراسية ومزايا جديدة وعروض خاصة من حين لآخر.",
  },
  "settings.emails.saved": {
    en: "Preferences saved.",
    ar: "تم حفظ التفضيلات.",
  },
  "settings.emails.errFailed": {
    en: "Could not save preferences.",
    ar: "تعذّر حفظ التفضيلات.",
  },

  // ─────────────────── PUBLIC PROFILE ───────────────────
  "publicProfile.errTitle": {
    en: "Profile not available",
    ar: "الملف غير متاح",
  },
  "publicProfile.errBody": {
    en: "We couldn't load this profile. It may have been removed or you may need to sign in again.",
    ar: "تعذّر تحميل هذا الملف. ربّما تمّت إزالته أو عليك تسجيل الدخول مجددًا.",
  },
  "publicProfile.memberSince": { en: "Member since", ar: "عضو منذ" },
  "publicProfile.bioEmptySelf": {
    en: "You haven't added a bio yet. Head to your dashboard to introduce yourself.",
    ar: "لم تُضف نبذة بعد. اذهب إلى لوحتك لتُعرّف بنفسك.",
  },
  "publicProfile.bioEmptyOther": {
    en: "This learner hasn't shared a bio yet.",
    ar: "لم يُشارك هذا المتعلّم نبذةً بعد.",
  },
  "publicProfile.editOnDashboard": {
    en: "Edit on your dashboard →",
    ar: "تعديل من لوحتك →",
  },
  "publicProfile.certsTitle": {
    en: "Certificates earned",
    ar: "الشهادات المُكتسبة",
  },
  "publicProfile.certsEmpty": {
    en: "No certificates yet — keep going!",
    ar: "لا توجد شهادات بعد — واصل التقدّم!",
  },
  "publicProfile.completedOn": { en: "Completed on", ar: "اكتُمل في" },

  // ─────────────────── COMING SOON ───────────────────
  "comingSoon.eyebrow": { en: "Coming soon", ar: "قريباً" },
  "comingSoon.freeLessons.title": {
    en: "Free Lessons",
    ar: "الدروس المجانيّة",
  },
  "comingSoon.freeLessons.desc": {
    en: "Sample lessons from LEXO for English and LEXO for IELTS — coming soon.",
    ar: "دروس نموذجيّة من LEXO for English وLEXO for IELTS — قريباً.",
  },
  "comingSoon.assessment.title": {
    en: "Level Assessment",
    ar: "تحديد المستوى",
  },
  "comingSoon.assessment.desc": {
    en: "Take a quick test and we'll place you on the right CEFR level — coming soon.",
    ar: "اخضع لاختبار سريع وسنحدّد مستواك على إطار CEFR — قريباً.",
  },
  "comingSoon.affiliate.title": {
    en: "Affiliate Program",
    ar: "برنامج الشراكة",
  },
  "comingSoon.affiliate.desc": {
    en: "Refer students and earn — full affiliate dashboard launching soon.",
    ar: "أحِل طلاباً واربح — لوحة الشراكة الكاملة ستُطلق قريباً.",
  },
  "comingSoon.admin.title": { en: "Admin Dashboard", ar: "لوحة الإدارة" },
  "comingSoon.admin.desc": {
    en: "Full admin tools — students, enrollments, FAQs, free lessons, affiliates, analytics — are coming in Iteration 4.",
    ar: "أدوات الإدارة الكاملة — الطلاب، التسجيلات، الأسئلة الشائعة، الدروس المجانية، الشركاء، التحليلات — قادمة في المرحلة الرابعة.",
  },

  // ───────────────────────── IELTS — 3 TIERS ─────────────────────────
  "ielts.tiers.eyebrow": { en: "Choose Your Track", ar: "اختر مسارك" },
  "ielts.tiers.title": {
    en: "Three IELTS programs — one for every level",
    ar: "ثلاثة برامج للأيلتس — لكل مستوى ما يناسبه",
  },
  "ielts.tiers.subtitle": {
    en: "Start where you are. Same coaches, same AI, same path to your target band.",
    ar: "ابدأ من حيث أنت. نفس المدرّبين، نفس الذكاء الاصطناعي، ونفس المسار نحو هدفك.",
  },
  "ielts.tiers.popular": { en: "Most Popular", ar: "الأكثر طلباً" },
  "ielts.tiers.comingSoon": { en: "Coming Soon", ar: "قريباً" },
  "ielts.tiers.cta.open": { en: "Open Course", ar: "افتح الدورة" },
  "ielts.tiers.cta.notify": { en: "Notify Me", ar: "أخطِرني" },
  "ielts.tiers.bandLabel": { en: "Target Band", ar: "النطاق المستهدف" },

  // Intro tier (A2 → B1)
  "ielts.tier.intro.name": { en: "IELTS Intro", ar: "مقدّمة الأيلتس" },
  "ielts.tier.intro.range": { en: "A2 → B1", ar: "A2 → B1" },
  "ielts.tier.intro.band": { en: "Band 4.0 – 5.5", ar: "النطاق 4.0 – 5.5" },
  "ielts.tier.intro.blurb": {
    en: "For beginners building IELTS-ready vocabulary and core skills before the full prep journey.",
    ar: "للمبتدئين الذين يبنون مفردات الأيلتس ومهاراتها الأساسية قبل الانطلاق في الإعداد الكامل.",
  },
  "ielts.tier.intro.f1": {
    en: "A2 + B1 vocabulary (~1,400 words)",
    ar: "مفردات A2 + B1 (~1,400 كلمة)",
  },
  "ielts.tier.intro.f2": {
    en: "Lessons, study, quiz, browse modes",
    ar: "دروس، دراسة، اختبارات، تصفّح",
  },
  "ielts.tier.intro.f3": {
    en: "Stories · Listening · Reading practice",
    ar: "قصص · تدريب استماع وقراءة",
  },
  "ielts.tier.intro.f4": {
    en: "Churchill (Speaking) + Orwell (Writing)",
    ar: "تشرشل (محادثة) + أورويل (كتابة)",
  },

  // Mid tier (B1 → C1)
  "ielts.tier.mid.name": { en: "IELTS Advance", ar: "أيلتس المتقدّم" },
  "ielts.tier.mid.range": { en: "B1 → C1", ar: "B1 → C1" },
  "ielts.tier.mid.band": { en: "Band 5.5 – 7.5", ar: "النطاق 5.5 – 7.5" },
  "ielts.tier.mid.blurb": {
    en: "For students with a working command of English aiming for a strong band score.",
    ar: "للطلاب ذوي الإلمام العملي بالإنجليزية الذين يستهدفون درجة قوية في الأيلتس.",
  },
  "ielts.tier.mid.f1": {
    en: "B1 + B2 + C1 vocabulary (~1,800 words)",
    ar: "مفردات B1 + B2 + C1 (~1,800 كلمة)",
  },
  "ielts.tier.mid.f2": {
    en: "Synonyms, antonyms, phrasal verbs, grammar",
    ar: "مرادفات، أضداد، أفعال مركّبة، قواعد",
  },
  "ielts.tier.mid.f3": {
    en: "Full Listening + Reading mock tests",
    ar: "اختبارات استماع وقراءة تجريبيّة كاملة",
  },
  "ielts.tier.mid.f4": {
    en: "Churchill + Orwell + Writing Templates",
    ar: "تشرشل + أورويل + قوالب الكتابة",
  },

  // Complete tier (A2 → C1)
  "ielts.tier.complete.name": { en: "IELTS Complete", ar: "أيلتس الشامل" },
  "ielts.tier.complete.range": { en: "A2 → C1", ar: "A2 → C1" },
  "ielts.tier.complete.band": { en: "Band 4.0 – 8.0", ar: "النطاق 4.0 – 8.0" },
  "ielts.tier.complete.blurb": {
    en: "The full journey — every level, every module, every coach. Best value for total prep.",
    ar: "الرحلة الكاملة — جميع المستويات، جميع الوحدات، جميع المدرّبين. أفضل قيمة للإعداد الشامل.",
  },
  "ielts.tier.complete.f1": {
    en: "Full A2 → C1 vocabulary (3,000+ words)",
    ar: "مفردات كاملة A2 → C1 (3,000+ كلمة)",
  },
  "ielts.tier.complete.f2": {
    en: "Every page: vocab, grammar, synonyms, phrasals",
    ar: "كل الصفحات: مفردات، قواعد، مرادفات، أفعال مركّبة",
  },
  "ielts.tier.complete.f3": {
    en: "All mock tests + Spell-it + Stories",
    ar: "كل الاختبارات التجريبيّة + Spell-it + القصص",
  },
  "ielts.tier.complete.f4": {
    en: "Priority access to new modules",
    ar: "وصول مبكر للوحدات الجديدة",
  },

  // ───────────────────────── COURSES (student dashboard) ─────────────────────────
  "common.loading": { en: "Loading…", ar: "جارٍ التحميل…" },
  "courses.title": { en: "My Courses", ar: "دوراتي" },
  "courses.empty": {
    en: "You don't have any active courses yet. Redeem an access code below or browse our tiers.",
    ar: "ليس لديك دورات مفعّلة بعد. استخدم رمز الوصول أدناه أو تصفّح مستوياتنا.",
  },
  "courses.launch": { en: "Launch course", ar: "ابدأ الدورة" },
  "courses.expiresOn": { en: "Expires on", ar: "تنتهي في" },
  "courses.enrolledOn": { en: "Enrolled on", ar: "تاريخ الالتحاق" },
  "courses.status.active": { en: "Active", ar: "مفعّل" },
  "courses.status.expired": { en: "Expired", ar: "منتهٍ" },
  "courses.daysRemaining": {
    en: "{n} days remaining",
    ar: "متبقٍ {n} يوم",
  },
  "courses.dayRemaining": {
    en: "1 day remaining",
    ar: "متبقٍ يوم واحد",
  },
  "courses.expiredMessage": {
    en: "Your subscription has expired.",
    ar: "اشتراكك انتهى.",
  },
  "courses.renew": { en: "Renew now", ar: "جدّد الاشتراك" },
  "courses.upsell.notEnrolled": { en: "Not enrolled", ar: "غير مسجّل" },
  "courses.upsell.priceLabel": {
    en: "150 SAR · One-time payment",
    ar: "150 ر.س · دفعة واحدة",
  },
  "courses.upsell.accessNote": {
    en: "Includes 1 year of access",
    ar: "يشمل صلاحية لمدة سنة",
  },
  "courses.upsell.cta": { en: "Enroll for 150 SAR", ar: "اشترك بـ 150 ر.س" },
  "courses.tier.intro": {
    en: "LEXO for IELTS — Intro",
    ar: "LEXO for IELTS — تمهيدي",
  },
  "courses.tier.advance": {
    en: "LEXO for IELTS — Advance",
    ar: "LEXO for IELTS — متقدّم",
  },
  "courses.tier.complete": {
    en: "LEXO for IELTS — Complete",
    ar: "LEXO for IELTS — شامل",
  },
  "courses.redeem.title": { en: "Redeem access code", ar: "استخدم رمز الوصول" },
  "courses.redeem.button": { en: "Redeem", ar: "استخدم" },
  "courses.redeem.success": {
    en: "✓ Access granted to {tier}",
    ar: "✓ تم منح الوصول إلى {tier}",
  },

  // English course (separate enrollments section in dashboard)
  "courses.section.ielts": { en: "LEXO for IELTS", ar: "LEXO for IELTS" },
  "courses.section.english": { en: "LEXO for English", ar: "LEXO for English" },
  "courses.english.empty": {
    en: "You don't have any active English packages yet. Redeem an English access code below or browse the packages.",
    ar: "ليس لديك أي باقة إنجليزية مفعّلة بعد. استخدم رمز وصول للإنجليزيّة أدناه أو تصفّح الباقات.",
  },
  "courses.english.tier.beginner": {
    en: "LEXO for English — Beginner",
    ar: "LEXO for English — مبتدئ",
  },
  "courses.english.tier.intermediate": {
    en: "LEXO for English — Intermediate",
    ar: "LEXO for English — متوسط",
  },
  "courses.english.tier.advanced": {
    en: "LEXO for English — Complete Course",
    ar: "LEXO for English — كورس شامل",
  },
  "courses.tier.featured": {
    en: "Most Complete",
    ar: "الأكثر شمولاً",
  },
  "courses.english.redeem.title": {
    en: "Redeem English access code",
    ar: "استخدم رمز وصول للإنجليزيّة",
  },
  "courses.english.browse": {
    en: "Browse English packages",
    ar: "تصفّح باقات الإنجليزيّة",
  },
  "english.tier.beginner.short": { en: "Beginner", ar: "مبتدئ" },
  "english.tier.intermediate.short": { en: "Intermediate", ar: "متوسط" },
  "english.tier.advanced.short": { en: "Advanced", ar: "متقدّم" },
  "english.tier.signInToOpen": {
    en: "Sign in to open",
    ar: "سجّل الدخول لفتحه",
  },
  "english.tier.openCourse": { en: "Open course", ar: "افتح الدورة" },

  // ───────────────────────── ADMIN ─────────────────────────
  "admin.title": { en: "Admin Dashboard", ar: "لوحة الإدارة" },
  "admin.subtitle": {
    en: "Manage students, enrollments, and access codes",
    ar: "إدارة الطلاب والتسجيلات ورموز الوصول",
  },
  "admin.tab.students": { en: "Students", ar: "الطلاب" },
  "admin.tab.codes": { en: "Access Codes", ar: "رموز الوصول" },
  "admin.students.search": {
    en: "Search by name or email…",
    ar: "ابحث بالاسم أو البريد…",
  },
  "admin.students.col.name": { en: "Name", ar: "الاسم" },
  "admin.students.col.email": { en: "Email", ar: "البريد" },
  "admin.students.col.role": { en: "Role", ar: "الدور" },
  "admin.students.col.tiers": { en: "Tiers", ar: "المستويات" },
  "admin.students.col.joined": { en: "Joined", ar: "انضم" },
  "admin.students.col.actions": { en: "Actions", ar: "الإجراءات" },
  "admin.students.grant": { en: "Grant tier", ar: "منح مستوى" },
  "admin.students.grantTitle": { en: "Grant access", ar: "منح الوصول" },
  "admin.students.grantTier": { en: "Tier", ar: "المستوى" },
  "admin.students.grantNote": { en: "Note (optional)", ar: "ملاحظة (اختياري)" },
  "admin.students.grantSubmit": { en: "Grant", ar: "منح" },
  "admin.students.cancel": { en: "Cancel", ar: "إلغاء" },
  "admin.students.revoke": { en: "Revoke", ar: "إلغاء الوصول" },
  "admin.students.confirmRevoke": {
    en: "Revoke access to this tier?",
    ar: "إلغاء الوصول إلى هذا المستوى؟",
  },
  "admin.codes.col.code": { en: "Code", ar: "الرمز" },
  "admin.codes.col.tier": { en: "Tier", ar: "المستوى" },
  "admin.codes.col.status": { en: "Status", ar: "الحالة" },
  "admin.codes.col.uses": { en: "Uses", ar: "الاستخدامات" },
  "admin.codes.col.redeemer": { en: "Redeemed by", ar: "استخدمه" },
  "admin.codes.col.created": { en: "Created", ar: "تم الإنشاء" },
  "admin.codes.col.note": { en: "Note", ar: "ملاحظة" },
  "admin.codes.generate.title": {
    en: "Generate access codes",
    ar: "إنشاء رموز وصول",
  },
  "admin.codes.generate.tier": { en: "Tier", ar: "المستوى" },
  "admin.codes.generate.count": { en: "Number of codes", ar: "عدد الرموز" },
  "admin.codes.generate.maxUses": {
    en: "Max uses per code",
    ar: "الحد الأقصى لكل رمز",
  },
  "admin.codes.generate.note": {
    en: "Note (optional)",
    ar: "ملاحظة (اختياري)",
  },
  "admin.codes.generate.submit": { en: "Generate", ar: "إنشاء" },
  "admin.codes.copied": { en: "Copied!", ar: "تم النسخ!" },
  "admin.codes.copy": { en: "Copy", ar: "نسخ" },
  "admin.codes.confirmRevoke": {
    en: "Revoke this code?",
    ar: "إلغاء هذا الرمز؟",
  },
  "admin.error.loadFailed": {
    en: "Failed to load. Please refresh.",
    ar: "تعذّر التحميل. يُرجى التحديث.",
  },

  // Phase 4 P2 — Admin content management
  "admin.tab.enrollments": { en: "Enrollments", ar: "التسجيلات" },
  "admin.tab.faqs": { en: "FAQ", ar: "الأسئلة الشائعة" },
  "admin.tab.courses": { en: "Courses", ar: "الدورات" },

  "admin.students.edit": { en: "Edit", ar: "تعديل" },
  "admin.students.delete": { en: "Delete", ar: "حذف" },
  "admin.students.confirmDelete": {
    en: "Delete {name}? This will permanently remove the student and all their enrollments.",
    ar: "حذف {name}؟ سيتم حذف الطالب وجميع تسجيلاته نهائيًا.",
  },
  "admin.students.editTitle": { en: "Edit student", ar: "تعديل الطالب" },
  "admin.students.editName": { en: "Name", ar: "الاسم" },
  "admin.students.editRole": { en: "Role", ar: "الدور" },
  "admin.students.editSubmit": { en: "Save changes", ar: "حفظ التغييرات" },
  "admin.students.editSelfNote": {
    en: "You can't change your own role.",
    ar: "لا يمكنك تغيير دورك الخاص.",
  },

  "admin.enrollments.filter.allStatus": {
    en: "All statuses",
    ar: "كل الحالات",
  },
  "admin.enrollments.filter.allTiers": { en: "All tiers", ar: "كل المستويات" },
  "admin.enrollments.filter.allCourses": {
    en: "All courses",
    ar: "كل الدورات",
  },
  "admin.enrollments.count": { en: "enrollments", ar: "تسجيلات" },
  "admin.enrollments.col.student": { en: "Student", ar: "الطالب" },
  "admin.enrollments.col.course": { en: "Course", ar: "الدورة" },
  "admin.enrollments.col.tier": { en: "Tier", ar: "المستوى" },
  "admin.enrollments.col.status": { en: "Status", ar: "الحالة" },
  "admin.enrollments.col.source": { en: "Source", ar: "المصدر" },
  "admin.enrollments.col.granted": { en: "Granted", ar: "مُنح" },
  "admin.enrollments.col.expires": { en: "Expires", ar: "ينتهي" },
  "admin.enrollments.col.actions": { en: "Actions", ar: "الإجراءات" },
  "admin.enrollments.edit": { en: "Edit enrollment", ar: "تعديل التسجيل" },
  "admin.enrollments.editTitle": { en: "Edit enrollment", ar: "تعديل التسجيل" },
  "admin.enrollments.expiresHint": {
    en: "Leave blank for no expiry.",
    ar: "اتركه فارغًا لعدم وجود تاريخ انتهاء.",
  },
  "admin.enrollments.approve": { en: "Approve", ar: "اعتماد" },
  "admin.enrollments.reject": { en: "Reject", ar: "رفض" },
  "admin.enrollments.delete": { en: "Delete enrollment", ar: "حذف التسجيل" },
  "admin.enrollments.confirmDelete": {
    en: "Delete this enrollment? This cannot be undone.",
    ar: "حذف هذا التسجيل؟ لا يمكن التراجع.",
  },

  "admin.tab.overview": { en: "Overview", ar: "نظرة عامة" },
  "admin.tab.landingPages": { en: "Landing Pages", ar: "صفحات الهبوط" },
  "admin.tab.englishCards": { en: "English Cards", ar: "بطاقات الإنجليزية" },
  "admin.tab.ieltsCards": { en: "IELTS Cards", ar: "بطاقات IELTS" },
  "admin.tab.roles": { en: "Roles & Permissions", ar: "الأدوار والصلاحيات" },
  "admin.tab.communication": { en: "Communication", ar: "التواصل" },

  "admin.group.main": { en: "Main", ar: "الرئيسية" },
  "admin.group.content": { en: "Content", ar: "المحتوى" },
  "admin.group.users": { en: "Users", ar: "المستخدمون" },
  "admin.group.finance": { en: "Finance", ar: "المالية" },
  "admin.group.engagement": { en: "Engagement", ar: "التواصل" },
  "admin.group.system": { en: "System", ar: "النظام" },
  "admin.sidebar.collapse": { en: "Collapse", ar: "طيّ" },
  "admin.backToSite": { en: "Back to site", ar: "العودة للموقع" },

  "admin.lp.title": { en: "Course Landing Pages", ar: "صفحات هبوط الدورات" },
  "admin.lp.subtitle": { en: "Manage public sales pages for each course", ar: "إدارة صفحات البيع لكل دورة" },
  "admin.lp.pageTitle": { en: "Page Title", ar: "عنوان الصفحة" },
  "admin.lp.pageSubtitle": { en: "Subtitle", ar: "العنوان الفرعي" },
  "admin.lp.heroImage": { en: "Hero Image URL", ar: "رابط صورة الغلاف" },
  "admin.lp.heroVideo": { en: "Hero Video Link", ar: "رابط فيديو الغلاف" },
  "admin.lp.introVideo": { en: "Intro Video Link", ar: "رابط فيديو تعريفي" },
  "admin.lp.description": { en: "Description", ar: "الوصف" },
  "admin.lp.benefits": { en: "Benefits", ar: "المزايا" },
  "admin.lp.targetStudent": { en: "Target Student", ar: "الطالب المستهدف" },
  "admin.lp.whatLearn": { en: "What Students Will Learn", ar: "ماذا سيتعلم الطلاب" },
  "admin.lp.ctaText": { en: "CTA Button Text", ar: "نص زر الإجراء" },
  "admin.lp.ctaLink": { en: "CTA Button Link", ar: "رابط زر الإجراء" },
  "admin.lp.status": { en: "Status", ar: "الحالة" },
  "admin.lp.published": { en: "Published", ar: "منشور" },
  "admin.lp.draft": { en: "Draft", ar: "مسودة" },
  "admin.lp.save": { en: "Save Changes", ar: "حفظ التغييرات" },
  "admin.lp.saved": { en: "Saved successfully", ar: "تم الحفظ بنجاح" },
  "admin.lp.course.english": { en: "LEXO for English", ar: "LEXO للإنجليزية" },
  "admin.lp.course.ielts": { en: "LEXO for IELTS", ar: "LEXO لـ IELTS" },
  "admin.lp.course.intro": { en: "LEXO Intro", ar: "LEXO مقدّمة" },
  "admin.lp.editPage": { en: "Edit Page", ar: "تعديل الصفحة" },
  "admin.lp.en": { en: "English", ar: "إنجليزي" },
  "admin.lp.ar": { en: "Arabic", ar: "عربي" },
  "admin.lp.benefitsHint": { en: "One per line", ar: "واحدة لكل سطر" },

  "admin.cards.title.en": { en: "English Course Cards", ar: "بطاقات دورة الإنجليزية" },
  "admin.cards.title.ielts": { en: "IELTS Course Cards", ar: "بطاقات دورة IELTS" },
  "admin.cards.subtitle.en": { en: "Manage homepage package cards for LEXO for English", ar: "إدارة بطاقات الباقات لدورة LEXO للإنجليزية" },
  "admin.cards.subtitle.ielts": { en: "Manage homepage package cards for LEXO for IELTS", ar: "إدارة بطاقات الباقات لدورة LEXO لـ IELTS" },
  "admin.cards.cardTitle": { en: "Title", ar: "العنوان" },
  "admin.cards.level": { en: "Level", ar: "المستوى" },
  "admin.cards.desc": { en: "Description", ar: "الوصف" },
  "admin.cards.price": { en: "Price (SAR)", ar: "السعر (ريال)" },
  "admin.cards.discount": { en: "Discount (%)", ar: "الخصم (%)" },
  "admin.cards.badge": { en: "Badge", ar: "الشارة" },
  "admin.cards.btnText": { en: "Button Text", ar: "نص الزر" },
  "admin.cards.btnLink": { en: "Button Link", ar: "رابط الزر" },
  "admin.cards.image": { en: "Image/Icon URL", ar: "رابط الصورة/الأيقونة" },
  "admin.cards.active": { en: "Active", ar: "نشط" },
  "admin.cards.hidden": { en: "Hidden", ar: "مخفي" },
  "admin.cards.order": { en: "Display Order", ar: "ترتيب العرض" },
  "admin.cards.save": { en: "Save Card", ar: "حفظ البطاقة" },
  "admin.cards.saved": { en: "Card saved", ar: "تم حفظ البطاقة" },
  "admin.cards.add": { en: "Add Card", ar: "إضافة بطاقة" },
  "admin.cards.edit": { en: "Edit", ar: "تعديل" },
  "admin.cards.delete": { en: "Delete", ar: "حذف" },
  "admin.cards.confirmDelete": { en: "Delete this card?", ar: "حذف هذه البطاقة؟" },
  "admin.cards.empty": { en: "No cards yet", ar: "لا توجد بطاقات بعد" },
  "admin.cards.originalPrice": { en: "Original Price", ar: "السعر الأصلي" },
  "admin.cards.finalPrice": { en: "Final Price", ar: "السعر النهائي" },
  "admin.cards.targetBand": { en: "Target Band", ar: "النطاق المستهدف" },

  "admin.roles.title": { en: "Admin Roles & Permissions", ar: "الأدوار والصلاحيات" },
  "admin.roles.subtitle": { en: "Manage admin access and permissions", ar: "إدارة صلاحيات المشرفين" },
  "admin.roles.admins": { en: "Admin Users", ar: "المشرفون" },
  "admin.roles.addAdmin": { en: "Add Admin", ar: "إضافة مشرف" },
  "admin.roles.removeAdmin": { en: "Remove Admin", ar: "إزالة مشرف" },
  "admin.roles.role": { en: "Role", ar: "الدور" },
  "admin.roles.permissions": { en: "Permissions", ar: "الصلاحيات" },
  "admin.roles.superAdmin": { en: "Super Admin", ar: "مشرف أعلى" },
  "admin.roles.courseManager": { en: "Course Page Manager", ar: "مدير صفحات الدورات" },
  "admin.roles.supportAgent": { en: "Support Agent", ar: "وكيل الدعم" },
  "admin.roles.chatMod": { en: "Chat Moderator", ar: "مشرف الدردشة" },
  "admin.roles.financeManager": { en: "Finance Manager", ar: "المدير المالي" },
  "admin.roles.editRole": { en: "Edit Role", ar: "تعديل الدور" },
  "admin.roles.confirmRemove": { en: "Remove admin access for this user?", ar: "هل تريد إزالة صلاحيات المشرف لهذا المستخدم؟" },
  "admin.roles.noAdmins": { en: "No admin users yet", ar: "لا يوجد مشرفون بعد" },
  "admin.roles.selectUser": { en: "Select a user", ar: "اختر مستخدمًا" },
  "admin.roles.search": { en: "Search users...", ar: "بحث عن مستخدمين..." },
  "admin.roles.currentRole": { en: "Current Role", ar: "الدور الحالي" },
  "admin.roles.saved": { en: "Role updated", ar: "تم تحديث الدور" },

  "admin.overview.newSignups": { en: "New Signups (30d)", ar: "تسجيلات جديدة (30 يوم)" },
  "admin.overview.courseViews": { en: "Course Page Views", ar: "مشاهدات صفحات الدورات" },
  "admin.overview.chatActivity": { en: "Chat Activity", ar: "نشاط الدردشة" },
  "admin.overview.voiceMinutes": { en: "Voice Minutes", ar: "دقائق المحادثة" },
  "admin.overview.dailyChallenges": { en: "Daily Challenges", ar: "التحديات اليومية" },
  "admin.overview.enrollmentsByTier": { en: "Enrollments by Tier", ar: "التسجيلات حسب الباقة" },
  "admin.overview.enrollmentsByCourse": { en: "Enrollments by Course", ar: "التسجيلات حسب الدورة" },
  "admin.overview.revenueOverTime": { en: "Revenue Trend", ar: "اتجاه الإيرادات" },
  "admin.col.name": { en: "Name", ar: "الاسم" },
  "admin.col.email": { en: "Email", ar: "البريد" },
  "admin.col.role": { en: "Role", ar: "الدور" },
  "admin.col.signedUp": { en: "Signed up", ar: "تاريخ التسجيل" },

  "admin.course.intro": { en: "Intro", ar: "تمهيدي" },
  "admin.course.english": { en: "English", ar: "إنجليزي" },
  "admin.course.ielts": { en: "IELTS", ar: "آيلتس" },

  "admin.overview.totalUsers": { en: "Total users", ar: "إجمالي المستخدمين" },
  "admin.overview.totalStudents": { en: "Total students", ar: "إجمالي الطلاب" },
  "admin.overview.activeToday": { en: "Active today", ar: "نشط اليوم" },
  "admin.overview.activeWeek": {
    en: "Active this week",
    ar: "نشط هذا الأسبوع",
  },
  "admin.overview.totalEnrollments": {
    en: "Active enrollments",
    ar: "التسجيلات النشطة",
  },
  "admin.overview.conversion": { en: "Conversion rate", ar: "معدل التحويل" },
  "admin.overview.revenue": { en: "Revenue (30d)", ar: "الإيرادات (30 يوم)" },
  "admin.overview.revenueNote": {
    en: "Stripe not yet wired",
    ar: "لم يُربط Stripe بعد",
  },
  "admin.overview.activeProxyNote": {
    en: "Active = users with signup or enrollment activity in the window (no last-login tracking yet).",
    ar: "النشط = مستخدمون لديهم تسجيل دخول أو تسجيل في الفترة (لا يوجد تتبع لآخر دخول حتى الآن).",
  },
  "admin.overview.tierBreakdown": {
    en: "Active enrollments by tier",
    ar: "التسجيلات النشطة حسب المستوى",
  },
  "admin.overview.noEnrollmentsYet": {
    en: "No enrollments yet.",
    ar: "لا توجد تسجيلات بعد.",
  },
  "admin.overview.signupTrend": {
    en: "Sign-ups (last 30 days)",
    ar: "التسجيلات (آخر 30 يوم)",
  },
  "admin.overview.enrollmentTrend": {
    en: "New enrollments (last 30 days)",
    ar: "التسجيلات الجديدة (آخر 30 يوم)",
  },
  "admin.overview.recentSignups": {
    en: "Recent sign-ups",
    ar: "أحدث التسجيلات",
  },
  "admin.overview.noSignupsYet": {
    en: "No sign-ups yet.",
    ar: "لا توجد تسجيلات بعد.",
  },

  "admin.comm.stubBanner": {
    en: "Email is in stub mode — messages are logged on the server but not delivered until an email provider (e.g. Resend) is configured.",
    ar: "البريد في وضع تجريبي — تُسجل الرسائل على الخادم ولكنها لا تُرسل حتى يُعدّ مزود البريد (مثل Resend).",
  },
  "admin.comm.title": { en: "Send broadcast email", ar: "إرسال بريد جماعي" },
  "admin.comm.audience": { en: "Audience", ar: "المستلمون" },
  "admin.comm.audienceAll": { en: "All users", ar: "جميع المستخدمين" },
  "admin.comm.audienceCourse": { en: "By course", ar: "حسب الدورة" },
  "admin.comm.course": { en: "Course", ar: "الدورة" },
  "admin.comm.subject": { en: "Subject", ar: "الموضوع" },
  "admin.comm.subjectPh": {
    en: "e.g. Welcome to LEXO!",
    ar: "مثال: مرحبًا بك في LEXO!",
  },
  "admin.comm.body": { en: "Message body", ar: "نص الرسالة" },
  "admin.comm.bodyPh": { en: "Write your message…", ar: "اكتب رسالتك…" },
  "admin.comm.send": { en: "Send broadcast", ar: "إرسال" },
  "admin.comm.errMissing": {
    en: "Subject and body are required.",
    ar: "الموضوع ونص الرسالة مطلوبان.",
  },
  "admin.comm.confirm": {
    en: "Send to {n} recipients?",
    ar: "إرسال إلى {n} مستلم؟",
  },
  "admin.comm.sent": {
    en: "Sent {sent}/{total} ({failed} failed).",
    ar: "تم الإرسال {sent}/{total} (فشل {failed}).",
  },

  "admin.expiry.title": {
    en: "Expiry reminders",
    ar: "تذكيرات انتهاء الاشتراك",
  },
  "admin.expiry.windowLabel": { en: "Within next", ar: "خلال" },
  "admin.expiry.days": { en: "days", ar: "يوم" },
  "admin.expiry.empty": {
    en: "No enrollments expiring in this window.",
    ar: "لا توجد اشتراكات تنتهي خلال هذه المدة.",
  },
  "admin.expiry.col.student": { en: "Student", ar: "الطالب" },
  "admin.expiry.col.course": { en: "Course", ar: "الدورة" },
  "admin.expiry.col.tier": { en: "Tier", ar: "الباقة" },
  "admin.expiry.col.expiresAt": { en: "Expires", ar: "ينتهي" },
  "admin.expiry.col.status": { en: "Reminder", ar: "تذكير" },
  "admin.expiry.statusReminded": { en: "Sent", ar: "أُرسل" },
  "admin.expiry.statusPending": { en: "Pending", ar: "بانتظار" },
  "admin.expiry.confirm": {
    en: "Send reminders to {n} students?",
    ar: "إرسال تذكيرات إلى {n} طالب؟",
  },
  "admin.expiry.sendBtn": {
    en: "Send reminders ({n})",
    ar: "إرسال التذكيرات ({n})",
  },
  "admin.expiry.sentMsg": {
    en: "Sent {sent} of {considered} ({skipped} skipped, {failed} failed).",
    ar: "أُرسلت {sent} من {considered} (تخطّي {skipped}، فشل {failed}).",
  },

  "admin.emailLog.title": { en: "Email log", ar: "سجل البريد" },
  "admin.emailLog.empty": {
    en: "No emails logged yet.",
    ar: "لا توجد رسائل مسجلة بعد.",
  },
  "admin.emailLog.refresh": { en: "Refresh", ar: "تحديث" },
  "admin.emailLog.allTypes": { en: "All types", ar: "كل الأنواع" },
  "admin.emailLog.allStatuses": { en: "All statuses", ar: "كل الحالات" },
  "admin.emailLog.statusSent": { en: "Sent", ar: "أُرسل" },
  "admin.emailLog.statusFailed": { en: "Failed", ar: "فشل" },
  "admin.emailLog.col.when": { en: "When", ar: "الوقت" },
  "admin.emailLog.col.type": { en: "Type", ar: "النوع" },
  "admin.emailLog.col.recipient": { en: "Recipient", ar: "المستلم" },
  "admin.emailLog.col.subject": { en: "Subject", ar: "الموضوع" },
  "admin.emailLog.col.status": { en: "Status", ar: "الحالة" },
  "admin.emailLog.type.welcome": { en: "Welcome", ar: "ترحيب" },
  "admin.emailLog.type.enrollment_confirmation": {
    en: "Enrollment confirmation",
    ar: "تأكيد التسجيل",
  },
  "admin.emailLog.type.course_access": {
    en: "Course access",
    ar: "الوصول إلى الدورة",
  },
  "admin.emailLog.type.expiry_reminder": {
    en: "Expiry reminder",
    ar: "تذكير انتهاء",
  },
  "admin.emailLog.type.admin_new_signup": {
    en: "Admin: new signup",
    ar: "إدارة: تسجيل جديد",
  },
  "admin.emailLog.type.admin_new_enrollment": {
    en: "Admin: new enrollment",
    ar: "إدارة: اشتراك جديد",
  },
  "admin.emailLog.type.broadcast": { en: "Broadcast", ar: "بث جماعي" },
  "admin.emailLog.type.email_verification": {
    en: "Email verification",
    ar: "تأكيد البريد",
  },
  "admin.emailLog.type.password_reset": {
    en: "Password reset",
    ar: "استعادة كلمة المرور",
  },

  "admin.courses.totalEnrollments": {
    en: "Active enrollments",
    ar: "التسجيلات النشطة",
  },
  "admin.courses.noEnrollments": {
    en: "No active enrollments yet.",
    ar: "لا توجد تسجيلات نشطة بعد.",
  },

  "admin.faqs.add": { en: "Add FAQ", ar: "إضافة سؤال" },
  "admin.faqs.addTitle": { en: "Add FAQ", ar: "إضافة سؤال" },
  "admin.faqs.editTitle": { en: "Edit FAQ", ar: "تعديل السؤال" },
  "admin.faqs.edit": { en: "Edit", ar: "تعديل" },
  "admin.faqs.delete": { en: "Delete", ar: "حذف" },
  "admin.faqs.confirmDelete": { en: "Delete this FAQ?", ar: "حذف هذا السؤال؟" },
  "admin.faqs.moveUp": { en: "Move up", ar: "تحريك لأعلى" },
  "admin.faqs.moveDown": { en: "Move down", ar: "تحريك لأسفل" },
  "admin.faqs.global": { en: "Global", ar: "عام" },
  "admin.faqs.filter.all": { en: "All scopes", ar: "كل النطاقات" },
  "admin.faqs.filter.global": { en: "Global only", ar: "العام فقط" },
  "admin.faqs.col.scope": { en: "Scope", ar: "النطاق" },
  "admin.faqs.col.question": { en: "Question", ar: "السؤال" },
  "admin.faqs.col.published": { en: "Published", ar: "منشور" },
  "admin.faqs.col.actions": { en: "Actions", ar: "الإجراءات" },
  "admin.faqs.publishedLabel": { en: "Visibility", ar: "الظهور" },
  "admin.faqs.published": { en: "Published", ar: "منشور" },
  "admin.faqs.draft": { en: "Draft", ar: "مسودة" },
  "admin.faqs.publish": { en: "Publish", ar: "نشر" },
  "admin.faqs.unpublish": { en: "Unpublish", ar: "إلغاء النشر" },
  "admin.faqs.questionEn": { en: "Question (EN)", ar: "السؤال (إنجليزي)" },
  "admin.faqs.questionAr": { en: "Question (AR)", ar: "السؤال (عربي)" },
  "admin.faqs.answerEn": { en: "Answer (EN)", ar: "الإجابة (إنجليزي)" },
  "admin.faqs.answerAr": { en: "Answer (AR)", ar: "الإجابة (عربي)" },

  "admin.courses.editTitle": { en: "Edit course", ar: "تعديل الدورة" },
  "admin.courses.edit": { en: "Edit", ar: "تعديل" },
  "admin.courses.titleEn": { en: "Title (EN)", ar: "العنوان (إنجليزي)" },
  "admin.courses.titleAr": { en: "Title (AR)", ar: "العنوان (عربي)" },
  "admin.courses.subtitleEn": {
    en: "Subtitle (EN)",
    ar: "العنوان الفرعي (إنجليزي)",
  },
  "admin.courses.subtitleAr": {
    en: "Subtitle (AR)",
    ar: "العنوان الفرعي (عربي)",
  },
  "admin.courses.order": { en: "Display order", ar: "الترتيب" },

  // ───────────────────────── CERTIFICATES ─────────────────────────
  "certs.section.title": { en: "My Certificates", ar: "شهاداتي" },
  "certs.section.subtitle": {
    en: "Download your bilingual completion certificates.",
    ar: "نزّل شهادات إتمامك الثنائية اللغة.",
  },
  "certs.empty.title": { en: "No certificates yet", ar: "لا توجد شهادات بعد" },
  "certs.empty.body": {
    en: "Once you complete a course your instructor will issue your certificate here.",
    ar: "عند إتمامك دورة سيُصدر لك المدرب الشهادة هنا.",
  },
  "certs.download": { en: "Download PDF", ar: "تنزيل PDF" },
  "certs.col.course": { en: "Course", ar: "الدورة" },
  "certs.col.tier": { en: "Tier", ar: "المستوى" },
  "certs.col.id": { en: "Certificate ID", ar: "رقم الشهادة" },
  "certs.col.completion": { en: "Completed", ar: "تاريخ الإتمام" },
  "certs.col.issued": { en: "Issued", ar: "تاريخ الإصدار" },
  "certs.col.student": { en: "Student", ar: "الطالب" },
  "certs.col.status": { en: "Status", ar: "الحالة" },
  "certs.col.actions": { en: "Actions", ar: "إجراءات" },
  "certs.status.active": { en: "Active", ar: "سارية" },
  "certs.status.revoked": { en: "Revoked", ar: "ملغاة" },
  "admin.tab.certificates": { en: "Certificates", ar: "الشهادات" },
  "admin.certs.search": {
    en: "Search by name, email or certificate ID…",
    ar: "ابحث بالاسم أو البريد أو رقم الشهادة…",
  },
  "admin.certs.issue": { en: "Issue certificate", ar: "إصدار شهادة" },
  "admin.certs.revoke": { en: "Revoke", ar: "إلغاء" },
  "admin.certs.revoke.confirm": {
    en: "Revoke this certificate? Students will no longer be able to download it.",
    ar: "هل تريد إلغاء هذه الشهادة؟ لن يتمكن الطالب من تنزيلها بعد ذلك.",
  },
  "admin.certs.revoke.reason": {
    en: "Reason (optional)",
    ar: "السبب (اختياري)",
  },
  "admin.certs.modal.title": {
    en: "Issue a new certificate",
    ar: "إصدار شهادة جديدة",
  },
  "admin.certs.modal.student": { en: "Student", ar: "الطالب" },
  "admin.certs.modal.studentPh": {
    en: "Search students by name or email…",
    ar: "ابحث عن طالب بالاسم أو البريد…",
  },
  "admin.certs.modal.course": { en: "Course", ar: "الدورة" },
  "admin.certs.modal.tier": { en: "Tier", ar: "المستوى" },
  "admin.certs.modal.completion": {
    en: "Completion date",
    ar: "تاريخ الإتمام",
  },
  "admin.certs.modal.submit": { en: "Issue certificate", ar: "إصدار" },
  "admin.certs.modal.cancel": { en: "Cancel", ar: "إلغاء" },
  "admin.certs.empty": {
    en: "No certificates issued yet.",
    ar: "لم يتم إصدار أي شهادات بعد.",
  },
  "admin.certs.course.intro": { en: "LEXO Intro", ar: "ليكسو للتأسيس" },
  "admin.certs.course.english": {
    en: "LEXO for English",
    ar: "ليكسو للغة الإنجليزية",
  },
  // ───────────────────────── CHECKOUT ─────────────────────────
  "checkout.title": { en: "Complete your enrollment", ar: "أكمل تسجيلك" },
  "checkout.loading": { en: "Loading checkout…", ar: "جاري تحميل صفحة الدفع…" },
  "checkout.notFound": {
    en: "Checkout not available for this tier.",
    ar: "صفحة الدفع غير متوفرة لهذا المستوى.",
  },
  "checkout.alreadyEnrolled": {
    en: "You're already enrolled in this tier — no need to pay again.",
    ar: "أنت مسجَّل بالفعل في هذا المستوى — لا حاجة للدفع مرة أخرى.",
  },
  "checkout.goToDashboard": {
    en: "Go to my dashboard",
    ar: "الذهاب إلى لوحة التحكم",
  },
  "checkout.summary": { en: "Order summary", ar: "ملخّص الطلب" },
  "checkout.course": { en: "Course", ar: "الدورة" },
  "checkout.tier": { en: "Tier", ar: "المستوى" },
  "checkout.total": { en: "Total", ar: "الإجمالي" },
  "checkout.choosePayment": {
    en: "Choose a payment method",
    ar: "اختر وسيلة الدفع",
  },
  "checkout.tabbyLine1": {
    en: "Pay later with Tabby",
    ar: "ادفع لاحقًا مع تابّي",
  },
  "checkout.tabbyLine2": { en: "Use any card", ar: "استخدم أي بطاقة" },
  "checkout.tamaraLine1": { en: "Split it into 4", ar: "قسمها على 4" },
  "checkout.tamaraLine2": {
    en: "payments — no late fees, Sharia-compliant",
    ar: "دفعات - بدون رسوم تأخير، متوافقة مع الشريعة الإسلامية",
  },
  "checkout.payWithTabby": { en: "Pay with Tabby", ar: "ادفع باستخدام تابي" },
  "checkout.payWithTamara": {
    en: "Pay with Tamara",
    ar: "ادفع باستخدام تمارا",
  },
  "checkout.payWithBankTransfer": {
    en: "Pay by bank transfer",
    ar: "ادفع عبر التحويل البنكي",
  },
  "checkout.bankTransferLine1": {
    en: "Bank transfer (IBAN)",
    ar: "تحويل بنكي (آيبان)",
  },
  "checkout.bankTransferLine2": {
    en: "Manual verification by admin",
    ar: "تحقّق يدوي من قِبَل الإدارة",
  },
  "checkout.bankTransfer.title": {
    en: "Transfer to our bank account",
    ar: "حوّل إلى حسابنا البنكي",
  },
  "checkout.bankTransfer.instructions": {
    en: 'Send the exact amount to the IBAN below, then tap "I have transferred". An admin will verify your transfer (usually within one business day) and activate your enrollment by email.',
    ar: 'حوّل المبلغ بالضبط إلى الآيبان أدناه، ثم اضغط "تم التحويل". سيقوم المسؤول بالتحقق من تحويلك (عادةً خلال يوم عمل واحد) وسيتم تفعيل تسجيلك عبر البريد الإلكتروني.',
  },
  "checkout.bankTransfer.amount": { en: "Amount", ar: "المبلغ" },
  "checkout.bankTransfer.bankName": { en: "Bank", ar: "البنك" },
  "checkout.bankTransfer.accountName": {
    en: "Account name",
    ar: "اسم الحساب",
  },
  "checkout.bankTransfer.iban": { en: "IBAN", ar: "الآيبان" },
  "checkout.bankTransfer.swift": { en: "SWIFT / BIC", ar: "سويفت / بيك" },
  "checkout.bankTransfer.copy": { en: "Copy", ar: "نسخ" },
  "checkout.bankTransfer.copied": { en: "Copied", ar: "تم النسخ" },
  "checkout.bankTransfer.iSentIt": {
    en: "I have transferred — notify admin",
    ar: "تم التحويل — أبلغ الإدارة",
  },
  "checkout.bankTransfer.senderLabel": {
    en: "Sender's full name (as on the bank account)",
    ar: "اسم المُرسِل الكامل (كما في الحساب البنكي)",
  },
  "checkout.bankTransfer.senderPlaceholder": {
    en: "e.g. Mohammed Abdullah Al-Ahmad",
    ar: "مثال: محمد عبدالله الأحمد",
  },
  "checkout.bankTransfer.senderHelp": {
    en: "We use this to match your transfer on the bank statement.",
    ar: "نستخدم هذا الاسم لمطابقة تحويلك في كشف الحساب البنكي.",
  },
  "checkout.bankTransfer.senderRequired": {
    en: "Please enter the sender's full name.",
    ar: "يرجى إدخال اسم المُرسِل بالكامل.",
  },
  "checkout.bankTransfer.proofLabel": {
    en: "Payment proof (transfer receipt)",
    ar: "إثبات الدفع (إيصال التحويل)",
  },
  "checkout.bankTransfer.proofPick": {
    en: "Tap to upload screenshot, PDF or document",
    ar: "اضغط لرفع لقطة شاشة أو ملف PDF أو مستند",
  },
  "checkout.bankTransfer.proofHelp": {
    en: "Accepted: JPG, PNG, PDF, DOC, DOCX. Max 10 MB.",
    ar: "المقبول: JPG, PNG, PDF, DOC, DOCX. بحد أقصى 10 ميجابايت.",
  },
  "checkout.bankTransfer.proofRemove": {
    en: "Remove file",
    ar: "إزالة الملف",
  },
  "checkout.bankTransfer.proofRequired": {
    en: "Please upload a payment proof file.",
    ar: "يرجى رفع ملف إثبات الدفع.",
  },
  "checkout.bankTransfer.uploading": {
    en: "Uploading…",
    ar: "جاري الرفع…",
  },
  "checkout.bankTransfer.uploadFailed": {
    en: "Upload failed. Please try again.",
    ar: "فشل الرفع. يرجى المحاولة مرة أخرى.",
  },
  "checkout.bankTransfer.fileTooLarge": {
    en: "File is too large (max 10 MB).",
    ar: "حجم الملف كبير جدًا (الحد الأقصى 10 ميجابايت).",
  },
  "checkout.banner.pendingBankTransfer": {
    en: "Your bank transfer was registered. We'll activate your enrollment as soon as an admin verifies the deposit (usually within one business day).",
    ar: "تم تسجيل تحويلك البنكي. سنفعّل تسجيلك بمجرد تحقق المسؤول من الإيداع (عادةً خلال يوم عمل واحد).",
  },
  "checkout.terms": {
    en: "I agree to the Terms of Service and Privacy Policy.",
    ar: "أوافق على شروط الاستخدام وسياسة الخصوصية.",
  },
  "checkout.continue": { en: "Continue to payment", ar: "المتابعة إلى الدفع" },
  "checkout.processing": { en: "Redirecting…", ar: "جاري التحويل…" },
  "checkout.discountInvalid": {
    en: "Your discount code is no longer valid. Please remove it and try again.",
    ar: "رمز الخصم لم يعد صالحًا. يرجى إزالته والمحاولة مرة أخرى.",
  },
  "checkout.error": {
    en: "We couldn't start the checkout. Please try again.",
    ar: "تعذّر بدء عملية الدفع. حاول مرة أخرى.",
  },
  "checkout.providerNotConfigured": {
    en: "This payment provider isn't available yet. Please pick another option or contact support.",
    ar: "وسيلة الدفع هذه غير متاحة حالياً. اختر وسيلة أخرى أو تواصل مع الدعم.",
  },
  "checkout.banner.success": {
    en: "Payment received — your enrollment is now active.",
    ar: "تم استلام الدفع — تم تفعيل تسجيلك.",
  },
  "checkout.banner.failed": {
    en: "Payment failed. You haven't been charged.",
    ar: "فشلت عملية الدفع. لم يتم خصم أي مبلغ.",
  },
  "checkout.banner.cancelled": {
    en: "Payment cancelled.",
    ar: "تم إلغاء عملية الدفع.",
  },
  "checkout.banner.pending": {
    en: "Payment is processing — we'll activate access as soon as it's confirmed.",
    ar: "جاري معالجة الدفع — سنفعّل الاشتراك بمجرد التأكيد.",
  },
  "checkout.secure": {
    en: "Secure checkout · 256-bit TLS",
    ar: "دفع آمن · تشفير TLS بطول 256-bit",
  },

  // ───────────────────────── ADMIN PAYMENTS ─────────────────────────
  "admin.tab.payments": { en: "Payments", ar: "المدفوعات" },
  "admin.payments.title": { en: "Payments", ar: "المدفوعات" },
  "admin.payments.subtitle": {
    en: "All Tabby and Tamara orders across both courses.",
    ar: "جميع طلبات Tabby و Tamara لكلا الدورتين.",
  },
  "admin.payments.search": {
    en: "Search by name, email, or payment ID",
    ar: "ابحث بالاسم أو البريد أو رقم الدفع",
  },
  "admin.payments.filter.all": { en: "All", ar: "الكل" },
  "admin.payments.filter.course": { en: "Course", ar: "الدورة" },
  "admin.payments.filter.provider": { en: "Provider", ar: "وسيلة الدفع" },
  "admin.payments.filter.status": { en: "Status", ar: "الحالة" },
  "admin.payments.col.student": { en: "Student", ar: "الطالب" },
  "admin.payments.col.product": { en: "Course / Tier", ar: "الدورة / المستوى" },
  "admin.payments.col.provider": { en: "Provider", ar: "وسيلة الدفع" },
  "admin.payments.col.amount": { en: "Amount", ar: "المبلغ" },
  "admin.payments.col.status": { en: "Status", ar: "الحالة" },
  "admin.payments.col.created": { en: "Created", ar: "أُنشئ" },
  "admin.payments.empty": {
    en: "No payments yet.",
    ar: "لا توجد مدفوعات بعد.",
  },
  "admin.payments.refresh": { en: "Refresh", ar: "تحديث" },
  "admin.payments.modeBadge": { en: "Mode", ar: "الوضع" },
  "admin.payments.col.actions": { en: "Actions", ar: "إجراءات" },
  "admin.payments.verify": { en: "Verify & activate", ar: "تحقّق وفعّل" },
  "admin.payments.reject": { en: "Reject", ar: "رفض" },
  "admin.payments.verifyConfirm": {
    en: "Mark this bank transfer as verified and activate the student's enrollment?",
    ar: "هل تريد تأكيد هذا التحويل البنكي وتفعيل تسجيل الطالب؟",
  },
  "admin.payments.rejectConfirm": {
    en: "Reject this bank transfer? The student will need to start over.",
    ar: "هل تريد رفض هذا التحويل البنكي؟ سيحتاج الطالب إلى البدء من جديد.",
  },
  "admin.payments.bankTransferPending": {
    en: "Pending bank transfers",
    ar: "تحويلات بنكية بانتظار المراجعة",
  },
  "admin.payments.provider.bank_transfer": {
    en: "Bank transfer",
    ar: "تحويل بنكي",
  },
  "admin.payments.provider.tabby": { en: "Pay in 4", ar: "ادفع على 4 دفعات" },
  "admin.payments.provider.tamara": { en: "Pay in 4", ar: "ادفع على 4 دفعات" },
  "admin.payments.bankSenderName": {
    en: "Sender name",
    ar: "اسم المُرسِل",
  },
  "admin.payments.bankProof": {
    en: "Payment proof",
    ar: "إثبات الدفع",
  },
  "admin.payments.bankProofView": {
    en: "View attachment",
    ar: "عرض المرفق",
  },
  "admin.payments.verifying": { en: "Verifying…", ar: "جاري التحقق…" },
  "admin.payments.rejecting": { en: "Rejecting…", ar: "جاري الرفض…" },
  "admin.payments.rejectionReasonPrompt": {
    en: "Optional: provide a short reason the student will see in the rejection email.",
    ar: "اختياري: اكتب سبباً مختصراً سيظهر للطالب في بريد الرفض.",
  },

  "admin.reports.title": { en: "Reports", ar: "التقارير" },
  "admin.reports.subtitle": {
    en: "Monthly revenue export by payment method.",
    ar: "تقرير إيرادات شهري مفصّل حسب وسيلة الدفع.",
  },
  "admin.reports.from": { en: "From", ar: "من" },
  "admin.reports.to": { en: "To", ar: "إلى" },
  "admin.reports.run": { en: "Run report", ar: "احسب التقرير" },
  "admin.reports.downloadCsv": { en: "Download CSV", ar: "تحميل CSV" },
  "admin.reports.summaryTitle": {
    en: "Summary (captured payments only)",
    ar: "ملخّص (المدفوعات المُحصّلة فقط)",
  },
  "admin.reports.method": { en: "Payment method", ar: "وسيلة الدفع" },
  "admin.reports.transactions": { en: "Transactions", ar: "العمليات" },
  "admin.reports.revenue": { en: "Revenue (SAR)", ar: "الإيراد (ر.س)" },
  "admin.reports.empty": {
    en: "No payments in this date range.",
    ar: "لا توجد مدفوعات في هذا النطاق.",
  },
  "admin.reports.col.date": { en: "Date", ar: "التاريخ" },
  "admin.reports.col.student": { en: "Student", ar: "الطالب" },
  "admin.reports.col.course": { en: "Course / Tier", ar: "الدورة / المستوى" },
  "admin.reports.col.amount": { en: "Amount", ar: "المبلغ" },
  "admin.reports.col.method": { en: "Method", ar: "الوسيلة" },
  "admin.reports.col.status": { en: "Status", ar: "الحالة" },
  "admin.reports.tab": { en: "Reports", ar: "التقارير" },

  "payments.my.title": { en: "My Payments", ar: "مدفوعاتي" },
  "payments.my.subtitle": {
    en: "All your payments and bank-transfer status in one place.",
    ar: "كل مدفوعاتك وحالة التحويل البنكي في مكان واحد.",
  },
  "payments.my.empty": {
    en: "You haven't made any payments yet.",
    ar: "لم تقم بأي عمليات دفع بعد.",
  },
  "payments.my.status.pending": {
    en: "Pending verification",
    ar: "بانتظار التحقق",
  },
  "payments.my.status.captured": { en: "Completed", ar: "مكتمل" },
  "payments.my.status.failed": { en: "Rejected", ar: "مرفوض" },
  "payments.my.status.cancelled": { en: "Cancelled", ar: "أُلغي" },
  "payments.my.status.expired": { en: "Expired", ar: "منتهي الصلاحية" },
  "payments.my.status.created": { en: "Started", ar: "بدأت" },
  "payments.my.status.authorized": { en: "Authorized", ar: "مُعتمد" },
  "payments.my.status.refunded": { en: "Refunded", ar: "مُسترد" },
  "payments.my.rejectionReason": {
    en: "Reason from admin",
    ar: "السبب من المسؤول",
  },
  "payments.my.reupload": { en: "Re-upload proof", ar: "أعد رفع الإثبات" },
  "payments.my.reuploadHint": {
    en: "Upload a new payment proof and we'll send it back to the admin.",
    ar: "ارفع إثباتاً جديداً وسنرسله للمراجعة مجدداً.",
  },
  "payments.my.reuploadSubmit": {
    en: "Submit new proof",
    ar: "إرسال الإثبات الجديد",
  },
  "payments.my.reuploadSuccess": {
    en: "Your new proof was submitted. The admin will review it shortly.",
    ar: "تم إرسال الإثبات الجديد. سيراجعه المسؤول قريباً.",
  },
  "payments.my.viewProof": {
    en: "View current proof",
    ar: "عرض الإثبات الحالي",
  },

  // ───────────────────────── COURSE DETAIL PAGE (public) ─────────────────────────
  "course.detail.back": { en: "Back to courses", ar: "العودة إلى الدورات" },
  "course.detail.heroTagline": {
    en: "Master IELTS with your AI companion. Bilingual lessons, real exam practice, and 24/7 coaches built for your level.",
    ar: "أتقن الأيلتس مع رفيقك الذكي. دروس ثنائية اللغة، تدريب فعلي على الامتحان، ومدرّبون 24/7 مصمَّمون لمستواك.",
  },
  "course.detail.playPreview": { en: "Play preview", ar: "شاهد المعاينة" },
  "course.detail.previewToast": {
    en: "Preview video coming soon — enroll today for full access.",
    ar: "مقطع المعاينة قريباً — سجّل اليوم للحصول على الوصول الكامل.",
  },
  "course.detail.about.title": { en: "About this course", ar: "عن هذه الدورة" },
  "course.detail.about.body1": {
    en: "Built end-to-end for IELTS, this course combines structured vocabulary, smart spaced repetition, and AI coaches for Speaking and Writing — so every minute you study moves you closer to your target band.",
    ar: "صُمّمت هذه الدورة بالكامل للأيلتس، وتجمع بين مفردات منظَّمة، وتكرار متباعد ذكي، ومدرّبين بالذكاء الاصطناعي للمحادثة والكتابة — لتقرّبك كل دقيقة دراسة من النطاق المستهدف.",
  },
  "course.detail.about.body2": {
    en: "Practice with full Listening and Reading mock tests, get instant feedback on your essays, and rehearse Speaking with Churchill, our AI examiner. Everything works in both English and Arabic.",
    ar: "تدرّب على اختبارات استماع وقراءة كاملة، واحصل على تقييم فوري لمقالاتك، وتمرَّن على المحادثة مع تشرشل ممتحننا الذكي. كل شيء يعمل بالعربية والإنجليزية.",
  },
  "course.detail.goals.title": {
    en: "What you'll achieve",
    ar: "ما الذي ستحققه",
  },
  "course.detail.goals.subtitle": {
    en: "Clear, measurable outcomes — not just lessons.",
    ar: "نتائج واضحة وقابلة للقياس — لا مجرد دروس.",
  },
  "course.detail.goal1.title": {
    en: "Hit your target band",
    ar: "اوصل إلى النطاق المستهدف",
  },
  "course.detail.goal1.desc": {
    en: "Move from your current level to a stronger band with weekly structured milestones.",
    ar: "انتقل من مستواك الحالي إلى نطاق أعلى عبر أهداف أسبوعية منظَّمة.",
  },
  "course.detail.goal2.title": {
    en: "Master IELTS vocabulary",
    ar: "أتقن مفردات الأيلتس",
  },
  "course.detail.goal2.desc": {
    en: "Learn 1,400+ exam-relevant words with spaced repetition that locks them into long-term memory.",
    ar: "تعلّم أكثر من 1,400 كلمة مرتبطة بالامتحان مع تكرار متباعد يثبتها في الذاكرة بعيدة المدى.",
  },
  "course.detail.goal3.title": {
    en: "Pass Speaking & Writing",
    ar: "اجتز المحادثة والكتابة",
  },
  "course.detail.goal3.desc": {
    en: "Practice with Churchill (AI examiner) and Orwell (AI writing coach) until your output matches band 6.5+.",
    ar: "تدرّب مع تشرشل (الممتحن الذكي) وأورويل (مدرّب الكتابة الذكي) حتى تطابق مخرجاتك نطاق 6.5 وما فوق.",
  },
  "course.detail.goal4.title": {
    en: "Time the test perfectly",
    ar: "اضبط توقيت الامتحان",
  },
  "course.detail.goal4.desc": {
    en: "Build exam stamina with full-length Listening and Reading mocks scored automatically.",
    ar: "اكتسب لياقة الامتحان عبر اختبارات استماع وقراءة كاملة بتصحيح تلقائي.",
  },
  "course.detail.images.title": { en: "Inside the course", ar: "داخل الدورة" },
  "course.detail.images.subtitle": {
    en: "A glimpse of the modules, coaches, and tools you'll use every day.",
    ar: "لمحة عن الوحدات والمدرّبين والأدوات التي ستستخدمها يومياً.",
  },
  "course.detail.image1.label": {
    en: "Vocabulary trainer",
    ar: "مدرّب المفردات",
  },
  "course.detail.image2.label": { en: "Listening lab", ar: "مختبر الاستماع" },
  "course.detail.image3.label": {
    en: "Mock test results",
    ar: "نتائج الاختبارات",
  },
  "course.detail.image4.label": {
    en: "AI Speaking coach",
    ar: "مدرّب المحادثة الذكي",
  },
  "course.detail.preview.title": { en: "Free preview", ar: "معاينة مجّانيّة" },
  "course.detail.preview.subtitle": {
    en: "Watch a sample lesson and download a study sheet — no login required.",
    ar: "شاهد درساً عيّنة وحمّل ورقة دراسة — بدون تسجيل دخول.",
  },
  "course.detail.preview.video": { en: "Sample lesson", ar: "درس عيّنة" },
  "course.detail.preview.pdf": {
    en: "Download sample PDF",
    ar: "حمّل عيّنة PDF",
  },
  "course.detail.preview.pdfToast": {
    en: "Sample PDF will be available soon. Enroll now for the full library.",
    ar: "ملف PDF العيّنة سيتوفّر قريباً. سجّل الآن للوصول إلى المكتبة الكاملة.",
  },
  "course.detail.faq.title": {
    en: "Frequently asked questions",
    ar: "الأسئلة الشائعة",
  },
  "course.detail.faq.q1": {
    en: "How long do I have access?",
    ar: "ما مدة الوصول؟",
  },
  "course.detail.faq.a1": {
    en: "Each enrollment includes 1 full year of access from the day you pay. Study at your own pace.",
    ar: "كل اشتراك يشمل سنة كاملة من الوصول من تاريخ الدفع. ادرس بالوتيرة التي تناسبك.",
  },
  "course.detail.faq.q2": {
    en: "Is the course in Arabic and English?",
    ar: "هل الدورة بالعربية والإنجليزية؟",
  },
  "course.detail.faq.a2": {
    en: "Yes — every page, lesson, and AI coach response is fully bilingual. Switch the language anytime from the top bar.",
    ar: "نعم — كل صفحة ودرس واستجابة من المدرّب الذكي ثنائية اللغة بالكامل. بدّل اللغة في أي وقت من الشريط العلوي.",
  },
  "course.detail.faq.q3": {
    en: "Can I get a refund?",
    ar: "هل يمكن استرداد المبلغ؟",
  },
  "course.detail.faq.a3": {
    en: "Contact us within 7 days of purchase if the course isn't a fit and we'll refund your payment.",
    ar: "تواصل معنا خلال 7 أيام من الشراء إن لم تكن الدورة مناسبة وسنُعيد لك المبلغ.",
  },
  "course.detail.faq.q4": {
    en: "Do I need a high level to start?",
    ar: "هل أحتاج مستوى عالياً للبدء؟",
  },
  "course.detail.faq.a4": {
    en: "No — Intro starts from A2 and Complete covers A2 → C1. Pick the tier that matches your level.",
    ar: "لا — تمهيدي يبدأ من A2 والشامل يغطي A2 → C1. اختر المستوى الذي يطابق وضعك.",
  },
  "course.detail.faq.q5": {
    en: "What payment methods do you accept?",
    ar: "ما طرق الدفع المتاحة؟",
  },
  "course.detail.faq.a5": {
    en: "Tabby, Tamara, and bank transfer (Al Rajhi). Pay in installments or all at once — your choice.",
    ar: "تابي، تمارا، والتحويل البنكي (الراجحي). ادفع بالتقسيط أو دفعة واحدة — الخيار لك.",
  },
  "course.detail.testimonials.title": {
    en: "What students say",
    ar: "آراء الطلاب",
  },
  "course.detail.t1.name": { en: "Sara A.", ar: "سارة أ." },
  "course.detail.t1.score": { en: "Band 7.5", ar: "نطاق 7.5" },
  "course.detail.t1.quote": {
    en: "I went from band 5.5 to 7.5 in three months. The Speaking coach was a game-changer for my fluency.",
    ar: "ارتفعت من 5.5 إلى 7.5 في ثلاثة أشهر. مدرّب المحادثة غيّر طلاقتي تماماً.",
  },
  "course.detail.t2.name": { en: "Mohammed K.", ar: "محمد ك." },
  "course.detail.t2.score": { en: "Band 7.0", ar: "نطاق 7.0" },
  "course.detail.t2.quote": {
    en: "The vocabulary system actually sticks. After two months I was reading academic articles without a dictionary.",
    ar: "نظام المفردات يثبت فعلاً في الذهن. بعد شهرين صرت أقرأ المقالات الأكاديمية دون قاموس.",
  },
  "course.detail.t3.name": { en: "Layla H.", ar: "ليلى ح." },
  "course.detail.t3.score": { en: "Band 8.0", ar: "نطاق 8.0" },
  "course.detail.t3.quote": {
    en: "Bilingual explanations made every grammar rule click. I aced Reading on my first attempt.",
    ar: "الشروحات ثنائية اللغة جعلت كل قاعدة واضحة. أحرزت نتيجة عالية في القراءة من أول محاولة.",
  },
  "course.detail.reviews.title": {
    en: "Reviews & ratings",
    ar: "التقييمات والمراجعات",
  },
  "course.detail.reviews.subtitle": {
    en: "Share your experience and help other students choose.",
    ar: "شارك تجربتك وساعد الطلاب على الاختيار.",
  },
  "course.detail.reviews.empty": {
    en: "No reviews yet — be the first to write one!",
    ar: "لا توجد مراجعات بعد — كن أول من يكتب واحدة!",
  },
  "course.detail.reviews.rateLabel": { en: "Your rating", ar: "تقييمك" },
  "course.detail.reviews.nameLabel": { en: "Your name", ar: "اسمك" },
  "course.detail.reviews.namePlaceholder": {
    en: "e.g. Ahmed M.",
    ar: "مثال: أحمد م.",
  },
  "course.detail.reviews.commentLabel": { en: "Your review", ar: "مراجعتك" },
  "course.detail.reviews.commentPlaceholder": {
    en: "Tell us what you liked or what could be better…",
    ar: "أخبرنا ما الذي أعجبك أو ما يمكن تحسينه…",
  },
  "course.detail.reviews.submit": { en: "Submit review", ar: "أرسل المراجعة" },
  "course.detail.reviews.thanks": {
    en: "Thanks for your review!",
    ar: "شكراً على مراجعتك!",
  },
  "course.detail.cta.buyNow": { en: "Buy now", ar: "اشترِ الآن" },
  "course.detail.cta.addToCart": { en: "Add to cart", ar: "أضف إلى السلة" },
  "course.detail.cta.added": {
    en: "Added to cart!",
    ar: "تمت الإضافة إلى السلة!",
  },
  "course.detail.cta.price": { en: "150 SAR", ar: "150 ر.س" },
  "course.detail.cta.priceFull": {
    en: "150 SAR · One-time",
    ar: "150 ر.س · دفعة واحدة",
  },
  "course.detail.cta.includes": {
    en: "1 year of full access",
    ar: "سنة كاملة من الوصول الشامل",
  },
  "english.course.cta.launch": {
    en: "Launch my course",
    ar: "افتح دورتي",
  },
  "english.course.cta.launchHint": {
    en: "You're enrolled — open your Lexo English Dashboard",
    ar: "أنت مشترك — افتح لوحة ليكسو للإنجليزي",
  },
  "course.detail.invalid": {
    en: "Course not found.",
    ar: "الدورة غير موجودة.",
  },

  // ───────── ENGLISH COURSE DETAIL (separate from IELTS) ─────────
  "english.course.tier.foundations.name": {
    en: "English Foundations",
    ar: "من التأسيس حتى المتوسط",
  },
  "english.course.tier.foundations.range": { en: "A1 → B1", ar: "A1 → B1" },
  "english.course.tier.foundations.level": {
    en: "Beginner → Intermediate",
    ar: "مبتدئ → متوسط",
  },
  "english.course.tier.foundations.blurb": {
    en: "Build your English from zero — everyday vocabulary, simple grammar, and clear British pronunciation, all explained in Arabic.",
    ar: "ابنِ إنجليزيّتك من الصفر — مفردات يوميّة وقواعد بسيطة ونطق بريطاني واضح، كل ذلك مشروحاً بالعربيّة.",
  },
  "english.course.tier.foundations.f1": {
    en: "Core 2,000 everyday words (CEFR A1–B1)",
    ar: "أهم 2,000 كلمة يوميّة (CEFR A1–B1)",
  },
  "english.course.tier.foundations.f2": {
    en: "Bilingual flashcards with native British audio",
    ar: "بطاقات ثنائيّة اللغة بصوت بريطاني أصلي",
  },
  "english.course.tier.foundations.f3": {
    en: "Phonics, basic grammar & pronunciation drills",
    ar: "الفونيكس وأساسيّات القواعد وتمارين النطق",
  },
  "english.course.tier.foundations.f4": {
    en: "Guided 10-minute daily practice plan",
    ar: "خطة تدريب يوميّة موجّهة في 10 دقائق",
  },

  "english.course.tier.advanced.name": {
    en: "English Advanced",
    ar: "الإنجليزيّة المتقدّمة",
  },
  "english.course.tier.advanced.range": { en: "B1 → C1", ar: "B1 → C1" },
  "english.course.tier.advanced.level": {
    en: "Intermediate → Advanced",
    ar: "متوسط → متقدّم",
  },
  "english.course.tier.advanced.blurb": {
    en: "Reach near-native fluency with academic vocabulary, idioms, complex grammar, and natural-sounding writing.",
    ar: "اقترب من طلاقة المتحدّث الأصلي عبر مفردات أكاديميّة وتعابير اصطلاحيّة وقواعد متقدّمة وكتابة طبيعيّة.",
  },
  "english.course.tier.advanced.f1": {
    en: "Advanced vocabulary 2,500+ (B2 / C1 academic)",
    ar: "مفردات متقدّمة +2,500 (أكاديمي B2 / C1)",
  },
  "english.course.tier.advanced.f2": {
    en: "Idioms, collocations & phrasal verbs",
    ar: "التعابير، المتلازمات اللفظيّة والأفعال المركّبة",
  },
  "english.course.tier.advanced.f3": {
    en: "Complex grammar, writing style & register",
    ar: "قواعد متقدّمة وأسلوب كتابة ومستوى لغويّ مناسب",
  },
  "english.course.tier.advanced.f4": {
    en: "Speaking practice with AI feedback",
    ar: "تدريب محادثة مع تغذية راجعة من الذكاء الاصطناعي",
  },

  "english.course.heroTagline": {
    en: "Bilingual EN ↔ AR · Built for Arabic speakers who want real, lasting fluency.",
    ar: "ثنائي اللغة EN ↔ AR · مصمَّم للناطقين بالعربيّة الذين يريدون طلاقة حقيقيّة دائمة.",
  },
  "english.course.levelEyebrow": { en: "CEFR Path", ar: "مسار CEFR" },

  "english.course.about.body1": {
    en: "LEXO for English is a complete, structured journey from your first English word to near-native fluency. Every definition, example, and grammar tip is presented in both English and Arabic — so you always understand exactly what you're learning.",
    ar: "LEXO للإنجليزيّة رحلة متكاملة ومنظّمة من أول كلمة إنجليزيّة حتى الطلاقة شبه الأصليّة. كل تعريف ومثال وقاعدة معروضة بالإنجليزيّة والعربيّة — لتفهم بالضبط ما تتعلّمه.",
  },
  "english.course.about.body2": {
    en: "Each tier is mapped to the international CEFR framework, so you always know your level and what comes next. Track your progress, practice with bite-sized daily sessions, and unlock units as you grow.",
    ar: "كل مستوى مرتبط بإطار CEFR العالمي، لتعرف دائماً مستواك وما يأتي بعده. تابع تقدّمك ودرّب نفسك بجلسات يوميّة قصيرة وافتح وحدات جديدة كلما تطوّرت.",
  },

  "english.course.goals.subtitle": {
    en: "Real outcomes you can measure — from your first sentence to confident conversations.",
    ar: "نتائج حقيقيّة قابلة للقياس — من أول جملة حتى محادثات بثقة.",
  },
  "english.course.goal1.title": { en: "Speak naturally", ar: "تحدّث بطلاقة" },
  "english.course.goal1.desc": {
    en: "Pronounce words like a native, hold confident conversations, and lose the fear of speaking.",
    ar: "انطق الكلمات كالناطقين الأصليّين، وتحدّث بثقة، وتخلّص من رهبة المحادثة.",
  },
  "english.course.goal2.title": {
    en: "Build a powerful vocabulary",
    ar: "ابنِ مفردات قويّة",
  },
  "english.course.goal2.desc": {
    en: "Master the Oxford word families with audio, examples, and spaced-repetition that makes vocabulary stick.",
    ar: "أتقن مجموعات كلمات أكسفورد مع الصوت والأمثلة والمراجعة المتباعدة التي تثبّت المفردات.",
  },
  "english.course.goal3.title": { en: "Write clearly", ar: "اكتب بوضوح" },
  "english.course.goal3.desc": {
    en: "Construct grammatically correct sentences and well-structured paragraphs in any context.",
    ar: "اكتب جملاً صحيحة قواعديّاً وفقرات منظّمة جيّداً في أي سياق.",
  },
  "english.course.goal4.title": {
    en: "Understand any English",
    ar: "افهم أي إنجليزيّة",
  },
  "english.course.goal4.desc": {
    en: "Train your ear with British and American audio so movies, podcasts, and meetings click.",
    ar: "درّب أذنك بالصوت البريطاني والأمريكي لتفهم الأفلام والبودكاست والاجتماعات بسهولة.",
  },

  "english.course.images.subtitle": {
    en: "A quick look inside the LEXO for English experience.",
    ar: "نظرة سريعة داخل تجربة LEXO للإنجليزيّة.",
  },
  "english.course.image1.label": {
    en: "Vocabulary trainer",
    ar: "مدرّب المفردات",
  },
  "english.course.image2.label": { en: "Listening lab", ar: "مختبر الاستماع" },
  "english.course.image3.label": {
    en: "Pronunciation drills",
    ar: "تمارين النطق",
  },
  "english.course.image4.label": {
    en: "AI Writing coach",
    ar: "مدرّب الكتابة الذكي",
  },

  "english.course.preview.subtitle": {
    en: "Try a sample lesson and download a free vocabulary PDF.",
    ar: "جرّب درساً عيّنة وحمّل ملف مفردات PDF مجّاناً.",
  },

  "english.course.faq.q1": {
    en: "How long do I have access?",
    ar: "ما مدّة الوصول؟",
  },
  "english.course.faq.a1": {
    en: "1 full year of unlimited access to all lessons, audio, and updates from your purchase date.",
    ar: "سنة كاملة من الوصول غير المحدود لكل الدروس والصوتيّات والتحديثات من تاريخ الشراء.",
  },
  "english.course.faq.q2": {
    en: "Is the course bilingual?",
    ar: "هل الدورة ثنائيّة اللغة؟",
  },
  "english.course.faq.a2": {
    en: "Yes — every word, example, and explanation is presented in both English and Arabic.",
    ar: "نعم — كل كلمة ومثال وشرح معروض بالإنجليزيّة والعربيّة معاً.",
  },
  "english.course.faq.q3": {
    en: "Do I need a starting level?",
    ar: "هل أحتاج مستوى ابتدائي؟",
  },
  "english.course.faq.a3": {
    en: "No — Foundations starts from absolute beginner (A1). Pick the tier that matches your current goal.",
    ar: "لا — تبدأ Foundations من المبتدئ المطلق (A1). اختر المستوى الذي يناسب هدفك الحالي.",
  },
  "english.course.faq.q4": {
    en: "Are the audio recordings native?",
    ar: "هل الصوتيّات بأصوات أصليّة؟",
  },
  "english.course.faq.a4": {
    en: "Yes — all audio is recorded by native British speakers, with American variants for select lessons.",
    ar: "نعم — كل الصوتيّات مسجّلة بأصوات بريطانيّة أصليّة، مع نسخة أمريكيّة لبعض الدروس.",
  },
  "english.course.faq.q5": {
    en: "Can I upgrade from Foundations to Advanced?",
    ar: "هل يمكنني الترقية من Foundations إلى Advanced؟",
  },
  "english.course.faq.a5": {
    en: "Yes — upgrade anytime and only pay the price difference.",
    ar: "نعم — ارفع مستواك في أي وقت وادفع الفرق فقط.",
  },

  "english.course.t1.name": { en: "Noor S.", ar: "نور س." },
  "english.course.t1.level": { en: "Reached B2", ar: "وصلت إلى B2" },
  "english.course.t1.quote": {
    en: "I went from struggling with simple sentences to writing work emails confidently in 4 months.",
    ar: "انتقلت من صعوبة الجمل البسيطة إلى كتابة إيميلات العمل بثقة خلال 4 أشهر.",
  },
  "english.course.t2.name": { en: "Ahmad R.", ar: "أحمد ر." },
  "english.course.t2.level": { en: "Reached C1", ar: "وصل إلى C1" },
  "english.course.t2.quote": {
    en: "The AI Writing coach completely changed my essays — my work emails now sound natural and confident.",
    ar: "غيّر مدرّب الكتابة الذكي مقالاتي تماماً — أصبحت إيميلات العمل لديّ طبيعيّة وواثقة.",
  },
  "english.course.t3.name": { en: "Lina M.", ar: "لينا م." },
  "english.course.t3.level": { en: "Reached B1", ar: "وصلت إلى B1" },
  "english.course.t3.quote": {
    en: "The bilingual flashcards finally made vocabulary stick. Best investment I made for my English.",
    ar: "البطاقات ثنائيّة اللغة جعلت المفردات تثبت أخيراً. أفضل استثمار قمت به لإنجليزيّتي.",
  },

  "english.course.cta.priceFull": {
    en: "150 SAR · One-time",
    ar: "150 ر.س · دفعة واحدة",
  },
  "english.course.invalid": {
    en: "English course not found.",
    ar: "دورة الإنجليزيّة غير موجودة.",
  },

  // ───────────────────────── COMMON (extra) ─────────────────────────
  "common.cancel": { en: "Cancel", ar: "إلغاء" },
  "common.save": { en: "Save", ar: "حفظ" },
  "common.delete": { en: "Delete", ar: "حذف" },

  // ───────────────────────── LIVE SESSIONS (student) ─────────────────────────
  "liveSessions.title": { en: "Live Sessions", ar: "الجلسات المباشرة" },
  "liveSessions.subtitle": {
    en: "Join live Zoom classes with your teacher.",
    ar: "انضم إلى الفصول المباشرة عبر زووم مع معلّمك.",
  },
  "liveSessions.empty": {
    en: "No upcoming sessions yet. Check back soon!",
    ar: "لا توجد جلسات قادمة بعد. تابعنا قريباً!",
  },
  "liveSessions.minutes": { en: "min", ar: "دقيقة" },
  "liveSessions.join": { en: "Join", ar: "انضم" },
  "liveSessions.badge.public": { en: "Public", ar: "عامة" },
  "liveSessions.badge.live": { en: "LIVE", ar: "مباشر" },
  "liveSessions.badge.english": { en: "English", ar: "الإنجليزيّة" },
  "liveSessions.badge.ielts": { en: "IELTS", ar: "IELTS" },
  "dashboard.liveSessions.cardTitle": {
    en: "Upcoming live sessions",
    ar: "الجلسات المباشرة القادمة",
  },
  "dashboard.liveSessions.viewAll": { en: "View all", ar: "عرض الكل" },
  "dashboard.liveSessions.none": {
    en: "No live sessions scheduled.",
    ar: "لا توجد جلسات مجدولة.",
  },
  "nav.liveSessions": { en: "Live", ar: "مباشر" },

  // ───────────────────────── LIVE SESSIONS (admin) ─────────────────────────
  "admin.tab.reports": { en: "Reports", ar: "التقارير" },
  "admin.tab.liveSessions": { en: "Live Sessions", ar: "الجلسات المباشرة" },
  "admin.live.subtitle": {
    en: "Schedule, edit, and cancel Zoom live sessions for students.",
    ar: "جدولة وتعديل وإلغاء جلسات زووم المباشرة للطلاب.",
  },
  "admin.live.create": { en: "Schedule new session", ar: "جدولة جلسة جديدة" },
  "admin.live.field.title": { en: "Title", ar: "العنوان" },
  "admin.live.field.description": {
    en: "Description (optional)",
    ar: "الوصف (اختياري)",
  },
  "admin.live.field.audience": { en: "Audience", ar: "الجمهور" },
  "admin.live.audience.public": {
    en: "Public — any signed-in user",
    ar: "عام — أي مستخدم مسجّل",
  },
  "admin.live.audience.course": { en: "Course-restricted", ar: "مقيّد بدورة" },
  "admin.live.field.course": { en: "Course", ar: "الدورة" },
  "admin.live.field.tier": {
    en: "Tier (optional, any if blank)",
    ar: "المستوى (اختياري، أيّ مستوى إذا فارغ)",
  },
  "admin.live.field.startsAt": { en: "Start time", ar: "وقت البداية" },
  "admin.live.field.duration": {
    en: "Duration (minutes)",
    ar: "المدة (دقائق)",
  },
  "admin.live.empty": {
    en: "No sessions yet — schedule the first one above.",
    ar: "لا توجد جلسات بعد — جدول أول جلسة من الأعلى.",
  },
  "admin.live.cancel": { en: "Cancel session", ar: "إلغاء الجلسة" },
  "admin.live.confirmCancel": {
    en: "Cancel this session for everyone?",
    ar: "إلغاء هذه الجلسة للجميع؟",
  },
  "admin.live.cancelled": { en: "Cancelled", ar: "ملغاة" },
  "admin.live.startUrl": { en: "Host link", ar: "رابط المضيف" },
  "admin.live.joinUrl": { en: "Join link", ar: "رابط الانضمام" },

  // ───────────────────────── SUPPORT (student) ─────────────────────────
  "support.title": { en: "Support", ar: "الدعم" },
  "support.subtitle": {
    en: "Open a ticket and we'll get back to you by email and here.",
    ar: "افتح تذكرة وسنردّ عليك بالبريد الإلكتروني وهنا.",
  },
  "support.new": { en: "New ticket", ar: "تذكرة جديدة" },
  "support.new.title": { en: "Create a support ticket", ar: "إنشاء تذكرة دعم" },
  "support.empty": {
    en: "You haven't opened any tickets yet.",
    ar: "لم تفتح أي تذاكر بعد.",
  },
  "support.send": { en: "Send", ar: "إرسال" },
  "support.back": { en: "Back to support", ar: "العودة للدعم" },
  "support.closedNotice": {
    en: "This ticket is closed. Open a new one if you need more help.",
    ar: "هذه التذكرة مغلقة. افتح تذكرة جديدة إذا كنت بحاجة إلى مساعدة أخرى.",
  },
  "support.field.subject": { en: "Subject", ar: "الموضوع" },
  "support.field.category": { en: "Category", ar: "الفئة" },
  "support.field.body": { en: "How can we help?", ar: "كيف يمكننا المساعدة؟" },
  "support.field.attachments": {
    en: "Attachments (max 5)",
    ar: "المرفقات (5 كحد أقصى)",
  },
  "support.reply.placeholder": { en: "Write a reply…", ar: "اكتب ردّك…" },
  "support.status.awaiting_admin": {
    en: "Awaiting admin",
    ar: "بانتظار الإدارة",
  },
  "support.status.awaiting_user": {
    en: "Awaiting your reply",
    ar: "بانتظار ردّك",
  },
  "support.status.resolved": { en: "Resolved", ar: "تم الحل" },
  "support.status.closed": { en: "Closed", ar: "مغلقة" },
  "support.category.general": { en: "General", ar: "عامة" },
  "support.category.billing": { en: "Billing", ar: "الفواتير" },
  "support.category.technical": { en: "Technical", ar: "تقنية" },
  "support.category.course_content": {
    en: "Course content",
    ar: "محتوى الدورة",
  },
  "support.category.account": { en: "Account", ar: "الحساب" },
  "support.role.student": { en: "You", ar: "أنت" },
  "support.role.admin": { en: "Support team", ar: "فريق الدعم" },
  "header.support": { en: "Support", ar: "الدعم" },
  "header.chat": { en: "LEXO Chat", ar: "دردشة لكسو" },
  "header.cart": { en: "Shopping Cart", ar: "سلة التسوّق" },

  "cart.title": { en: "Shopping Cart", ar: "سلة التسوّق" },
  "cart.subtitle": { en: "Review your selected courses", ar: "راجع الدورات المختارة" },
  "cart.empty": { en: "Your cart is empty", ar: "سلة التسوّق فارغة" },
  "cart.emptyHint": {
    en: "Browse our courses and add the ones you like.",
    ar: "تصفّح دوراتنا وأضف ما يناسبك.",
  },
  "cart.loading": { en: "Loading prices…", ar: "جارٍ تحميل الأسعار…" },
  "cart.remove": { en: "Remove", ar: "إزالة" },
  "cart.subtotal": { en: "Subtotal", ar: "المجموع الفرعي" },
  "cart.item": { en: "item", ar: "عنصر" },
  "cart.items": { en: "items", ar: "عناصر" },
  "cart.total": { en: "Total", ar: "الإجمالي" },
  "cart.continueShopping": { en: "Continue shopping", ar: "متابعة التسوّق" },
  "cart.checkout": { en: "Proceed to Checkout", ar: "إتمام الشراء" },
  "cart.checkoutEach": {
    en: "Checkout each course separately:",
    ar: "أتمّ شراء كلّ دورة على حدة:",
  },
  "cart.checkoutItem": { en: "Checkout", ar: "إتمام الشراء" },
  "cart.clearAll": { en: "Clear cart", ar: "إفراغ السلة" },
  "cart.inCart": { en: "In cart ✓", ar: "في السلة ✓" },
  "cart.alreadyInCart": { en: "Already in your cart", ar: "موجود في السلة بالفعل" },
  "cart.discount.label": { en: "Discount code", ar: "كود الخصم" },
  "cart.discount.placeholder": { en: "Enter discount code", ar: "أدخل كود الخصم" },
  "cart.discount.apply": { en: "Apply", ar: "تطبيق" },
  "cart.discount.remove": { en: "Remove", ar: "إزالة" },
  "cart.discount.success": { en: "Discount applied!", ar: "تم تطبيق الخصم!" },
  "cart.discount.invalid": { en: "Invalid or expired discount code", ar: "كود الخصم غير صالح أو منتهي الصلاحية" },
  "cart.discount.savings": { en: "Discount", ar: "الخصم" },
  "cart.addToCart": { en: "Add to Cart", ar: "أضف إلى السلة" },
  "cart.goToCart": { en: "Go to Cart", ar: "انتقل إلى السلة" },
  "cart.reminder.soft": {
    en: "You still have a course waiting in your cart.",
    ar: "لا يزال لديك دورة في السلة.",
  },
  "cart.reminder.strong": {
    en: "You left a course in your cart. Complete your enrollment and continue learning with Lexo.",
    ar: "لديك دورة في السلة لم تكمل تسجيلها. أكمل الآن وابدأ رحلتك في Lexo.",
  },
  "cart.reminder.itemCount": {
    en: "{count} item(s) in your cart",
    ar: "{count} عنصر في السلة",
  },
  "cart.reminder.cta": { en: "Complete Checkout", ar: "أكمل الشراء" },

  // ───────────────────────── SUPPORT (admin) ─────────────────────────
  "admin.tab.support": { en: "Support", ar: "الدعم" },
  "admin.support.subtitle": {
    en: "Read and reply to student tickets.",
    ar: "اقرأ وردّ على تذاكر الطلاب.",
  },
  "admin.support.filter.all": { en: "All", ar: "الكل" },
  "admin.support.empty": {
    en: "No tickets in this view.",
    ar: "لا توجد تذاكر في هذه العرض.",
  },
  "admin.support.from": { en: "From", ar: "من" },
  "admin.support.openThread": { en: "Open thread", ar: "افتح المحادثة" },

  // ───────────────────────── ADMIN DISCOUNT CODES ─────────────────────────
  "admin.tab.discountCodes": { en: "Discount Codes", ar: "أكواد الخصم" },
  "admin.discountCodes.subtitle": { en: "Create and manage discount codes.", ar: "إنشاء وإدارة أكواد الخصم." },
  "admin.discountCodes.create": { en: "Create Discount Code", ar: "إنشاء كود خصم" },
  "admin.discountCodes.code": { en: "Code", ar: "الكود" },
  "admin.discountCodes.codePlaceholder": { en: "e.g. IELTS20", ar: "مثال: IELTS20" },
  "admin.discountCodes.type": { en: "Discount Type", ar: "نوع الخصم" },
  "admin.discountCodes.typePercentage": { en: "Percentage (%)", ar: "نسبة مئوية (%)" },
  "admin.discountCodes.typeFixed": { en: "Fixed Amount (SAR)", ar: "مبلغ ثابت (ر.س)" },
  "admin.discountCodes.value": { en: "Discount Value", ar: "قيمة الخصم" },
  "admin.discountCodes.startDate": { en: "Start Date", ar: "تاريخ البدء" },
  "admin.discountCodes.endDate": { en: "End Date", ar: "تاريخ الانتهاء" },
  "admin.discountCodes.neverExpires": { en: "Never expires", ar: "لا ينتهي" },
  "admin.discountCodes.scope": { en: "Scope", ar: "النطاق" },
  "admin.discountCodes.scopeGeneral": { en: "General (all courses)", ar: "عام (جميع الدورات)" },
  "admin.discountCodes.scopeSpecific": { en: "Specific course/tier", ar: "دورة/مستوى محدد" },
  "admin.discountCodes.course": { en: "Course", ar: "الدورة" },
  "admin.discountCodes.tier": { en: "Tier", ar: "المستوى" },
  "admin.discountCodes.totalUsageLimit": { en: "Total Usage Limit", ar: "حد الاستخدام الكلي" },
  "admin.discountCodes.unlimitedUsage": { en: "Unlimited", ar: "غير محدود" },
  "admin.discountCodes.perUserLimit": { en: "Per-user Limit", ar: "حد لكل مستخدم" },
  "admin.discountCodes.oneTimePerUser": { en: "One-time per user", ar: "مرة واحدة لكل مستخدم" },
  "admin.discountCodes.status": { en: "Status", ar: "الحالة" },
  "admin.discountCodes.active": { en: "Active", ar: "نشط" },
  "admin.discountCodes.inactive": { en: "Inactive", ar: "غير نشط" },
  "admin.discountCodes.totalUsed": { en: "Used", ar: "مستخدم" },
  "admin.discountCodes.actions": { en: "Actions", ar: "إجراءات" },
  "admin.discountCodes.edit": { en: "Edit", ar: "تعديل" },
  "admin.discountCodes.delete": { en: "Delete", ar: "حذف" },
  "admin.discountCodes.save": { en: "Save", ar: "حفظ" },
  "admin.discountCodes.cancel": { en: "Cancel", ar: "إلغاء" },
  "admin.discountCodes.confirmDelete": { en: "Are you sure you want to delete this discount code?", ar: "هل أنت متأكد من حذف كود الخصم هذا؟" },
  "admin.discountCodes.empty": { en: "No discount codes yet.", ar: "لا توجد أكواد خصم بعد." },
  "admin.discountCodes.general": { en: "General", ar: "عام" },
  "admin.discountCodes.specific": { en: "Specific", ar: "محدد" },
  "admin.discountCodes.never": { en: "Never", ar: "لا ينتهي" },
  "admin.discountCodes.selectCourse": { en: "Select course", ar: "اختر الدورة" },
  "admin.discountCodes.selectTier": { en: "Select tier", ar: "اختر المستوى" },
  "admin.discountCodes.courseEnglish": { en: "English", ar: "الإنجليزية" },
  "admin.discountCodes.courseIelts": { en: "IELTS", ar: "آيلتس" },
  "admin.discountCodes.courseIntro": { en: "Intro", ar: "تمهيدي" },
  "admin.discountCodes.firstPurchaseOnly": { en: "First purchase only", ar: "أول عملية شراء فقط" },
  "admin.discountCodes.newUsersOnly": { en: "New users only (< 30 days)", ar: "مستخدمون جدد فقط (أقل من 30 يوم)" },

  // ───────────────────────── CART DISCOUNT DETAIL ─────────────────────────
  "cart.discount.expired": { en: "This discount code has expired", ar: "كود الخصم هذا منتهي الصلاحية" },
  "cart.discount.alreadyUsed": { en: "You have already used this code", ar: "لقد استخدمت هذا الكود بالفعل" },
  "cart.discount.notApplicable": { en: "This code is not applicable to your cart items", ar: "هذا الكود لا ينطبق على عناصر السلة" },
  "cart.discount.usageLimitReached": { en: "This code has reached its usage limit", ar: "وصل هذا الكود لحد الاستخدام" },
  "cart.discount.firstPurchaseOnly": { en: "This code is only valid for first-time purchases", ar: "هذا الكود صالح لأول عملية شراء فقط" },
  "cart.discount.newUsersOnly": { en: "This code is only for new users", ar: "هذا الكود للمستخدمين الجدد فقط" },
  "cart.discount.codeLine": { en: "Discount Code", ar: "كود الخصم" },

  // ───────────────────────── CHECKOUT BACK TO CART ─────────────────────────
  "checkout.backToCart": { en: "Back to Cart", ar: "العودة إلى السلة" },
} as const;

export type TranslationKey = keyof typeof translations;
// Type-check: every entry must have both en and ar
type _CheckEntries = {
  [K in TranslationKey]: (typeof translations)[K] extends Entry ? true : never;
};
type _Check = _CheckEntries[TranslationKey];
const _check: _Check = true;
void _check;
