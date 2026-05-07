import type { AvatarTone } from "@/components/chat-ui";

// ---- Users -----------------------------------------------------------------

export type User = {
  id: string;
  name: string;
  letter: string;
  tone: AvatarTone;
  bio?: string;
  level?: "Beginner" | "Intermediate" | "Advanced";
  country?: string;
};

export const USERS: User[] = [
  {
    id: "u1",
    name: "Omar",
    letter: "O",
    tone: "blue",
    level: "Intermediate",
    country: "🇸🇦",
  },
  {
    id: "u2",
    name: "Sara",
    letter: "S",
    tone: "pink",
    level: "Advanced",
    country: "🇪🇬",
  },
  {
    id: "u3",
    name: "James",
    letter: "J",
    tone: "emerald",
    level: "Advanced",
    country: "🇬🇧",
  },
  {
    id: "u4",
    name: "Lina",
    letter: "L",
    tone: "amber",
    level: "Intermediate",
    country: "🇲🇦",
  },
  {
    id: "u5",
    name: "Maya",
    letter: "M",
    tone: "purple",
    level: "Beginner",
    country: "🇯🇴",
  },
  {
    id: "u6",
    name: "Ahmad",
    letter: "A",
    tone: "rose",
    level: "Intermediate",
    country: "🇦🇪",
  },
  {
    id: "u7",
    name: "Kenza",
    letter: "K",
    tone: "indigo",
    level: "Advanced",
    country: "🇩🇿",
  },
  {
    id: "u8",
    name: "Nora",
    letter: "N",
    tone: "blue",
    level: "Beginner",
    country: "🇰🇼",
  },
  {
    id: "u9",
    name: "Yusuf",
    letter: "Y",
    tone: "emerald",
    level: "Intermediate",
    country: "🇹🇷",
  },
  {
    id: "u10",
    name: "Rana",
    letter: "R",
    tone: "pink",
    level: "Intermediate",
    country: "🇶🇦",
  },
  {
    id: "u11",
    name: "Noah",
    letter: "N",
    tone: "purple",
    level: "Advanced",
    country: "🇺🇸",
  },
  {
    id: "u12",
    name: "Emma",
    letter: "E",
    tone: "rose",
    level: "Advanced",
    country: "🇨🇦",
  },
];

export function userById(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}

// ---- Rooms -----------------------------------------------------------------

export type RoomCategory = "speaking" | "voice" | "ielts";
export type RoomIconKey =
  | "mic"
  | "headphones"
  | "graduation"
  | "message"
  | "pen";

export type MockRoom = {
  id: string;
  cat: RoomCategory;
  title: string;
  desc: string;
  online: number;
  tone: AvatarTone;
  iconKey: RoomIconKey;
  about: string;
};

export const MOCK_ROOMS: MockRoom[] = [
  {
    id: "1",
    cat: "speaking",
    title: "Speaking Room - Beginner",
    desc: "تحدث وتدرب على المحادثة اليومية",
    online: 18,
    tone: "blue",
    iconKey: "mic",
    about: "غرفة للمبتدئين. تدرب على عبارات يومية وكوّن جملك بثقة مع زملائك.",
  },
  {
    id: "2",
    cat: "speaking",
    title: "Speaking Room - Intermediate",
    desc: "تطوير الطلاقة وزيادة الثقة",
    online: 18,
    tone: "purple",
    iconKey: "mic",
    about:
      "غرفة مخصصة للمتحدثين بمستوى متوسط. تدرب على المحادثات اليومية، شارك تجاربك، واستخدم مولّد المواضيع لكسر الجمود مع الأعضاء الآخرين.",
  },
  {
    id: "3",
    cat: "voice",
    title: "Voice Only Room",
    desc: "تحدث بصوت فقط بدون كتابة",
    online: 12,
    tone: "emerald",
    iconKey: "headphones",
    about: "غرفة صوتية فقط — استمع وشارك بدون كتابة.",
  },
  {
    id: "4",
    cat: "ielts",
    title: "IELTS Speaking Room",
    desc: "تدرب على أسئلة الـ Speaking خاصة بـ IELTS",
    online: 16,
    tone: "pink",
    iconKey: "graduation",
    about:
      "غرفة مخصصة للتحضير لاختبار IELTS Speaking مع أسئلة مشابهة للاختبار.",
  },
  {
    id: "5",
    cat: "speaking",
    title: "Casual Chat",
    desc: "دردشة حرة في أي موضوع",
    online: 31,
    tone: "rose",
    iconKey: "message",
    about: "دردشة عامة وحرة بدون قيود على الموضوع.",
  },
];

export function getRoomById(id: string | undefined): MockRoom | undefined {
  if (!id) return undefined;
  return MOCK_ROOMS.find((r) => r.id === id);
}

// ---- Per-room "live" metadata (used by both showcase + live screens) -------

export type RoomMeta = {
  unread: number;
  lastActivity: string;
  peek: number[]; // indexes into USERS for the peek-avatar stack
};

export const ROOM_META: Record<string, RoomMeta> = {
  "1": { unread: 0, lastActivity: "now", peek: [7, 3, 0] },
  "2": { unread: 12, lastActivity: "2m", peek: [0, 1, 2] },
  "3": { unread: 0, lastActivity: "live", peek: [0, 1, 2] },
  "4": { unread: 3, lastActivity: "8m", peek: [6, 8, 2] },
  "5": { unread: 47, lastActivity: "1m", peek: [5, 9, 3] },
};

// ---- Recent activity feed (for room details "what's happening" card) -------

export type RoomActivity = {
  id: string;
  userId: string;
  kind: "joined" | "voice" | "reply" | "topic" | "reaction";
  text: string;
  ago: string;
};

export const ROOM_ACTIVITY: Record<string, RoomActivity[]> = {
  "1": [
    {
      id: "a1",
      userId: "u8",
      kind: "joined",
      text: "joined the room",
      ago: "1m",
    },
    {
      id: "a2",
      userId: "u4",
      kind: "voice",
      text: "shared a voice note",
      ago: "3m",
    },
    {
      id: "a3",
      userId: "u1",
      kind: "reply",
      text: "replied to Nora",
      ago: "5m",
    },
  ],
  "2": [
    {
      id: "a1",
      userId: "u7",
      kind: "voice",
      text: "shared a voice note",
      ago: "2m",
    },
    {
      id: "a2",
      userId: "u3",
      kind: "joined",
      text: "joined the room",
      ago: "4m",
    },
    {
      id: "a3",
      userId: "u2",
      kind: "reaction",
      text: "reacted with 🔥",
      ago: "6m",
    },
    {
      id: "a4",
      userId: "u10",
      kind: "reply",
      text: "asked about grammar",
      ago: "8m",
    },
  ],
  "3": [
    {
      id: "a1",
      userId: "u1",
      kind: "voice",
      text: "is speaking now",
      ago: "live",
    },
    {
      id: "a2",
      userId: "u5",
      kind: "joined",
      text: "joined the room",
      ago: "30s",
    },
  ],
  "4": [
    {
      id: "a1",
      userId: "u7",
      kind: "voice",
      text: "did Part 2 (1:48)",
      ago: "5m",
    },
    {
      id: "a2",
      userId: "u3",
      kind: "reply",
      text: "gave Kenza feedback",
      ago: "7m",
    },
    {
      id: "a3",
      userId: "u9",
      kind: "voice",
      text: "answered Part 3",
      ago: "9m",
    },
  ],
  "5": [
    {
      id: "a1",
      userId: "u4",
      kind: "reaction",
      text: "got 6 reactions",
      ago: "1m",
    },
    {
      id: "a2",
      userId: "u3",
      kind: "topic",
      text: "started a topic",
      ago: "4m",
    },
    {
      id: "a3",
      userId: "u5",
      kind: "voice",
      text: "shared a voice note",
      ago: "6m",
    },
  ],
};

// ---- Phrases used by the activity simulator (random new messages) ----------

export const AMBIENT_PHRASES: string[] = [
  "Totally agree with that 👍",
  "Can you say that one more time?",
  "I think it depends on the context honestly",
  "haha same here 😂",
  "Wait, can someone explain?",
  "Let me try — give me a sec ✍️",
  "That's a really good point",
  "I had the same problem last week",
  "Where are you from originally?",
  "Sorry I lost connection for a moment",
  "Could you repeat the last sentence please?",
  "Nice pronunciation 🔥",
  "I'll write it out, easier for me",
  "Anyone up for a quick role-play?",
  "What does 'eventually' actually mean?",
  "I'm a beginner, sorry if I'm slow 🙏",
  "That joke killed me 😂😂",
];

// ---- Participants / voice room sub-data ------------------------------------

export const PARTICIPANTS = USERS.slice(0, 7).map((u) => ({
  letter: u.letter,
  tone: u.tone,
  name: u.name,
}));

export const ROOM_RULES = [
  "تحدث بالإنجليزية فقط داخل الغرفة",
  "احترم بقية المشاركين ولا تقاطعهم",
  "لا تشارك معلومات شخصية",
  "ممنوع الإعلانات أو الروابط الخارجية",
];

export const VOICE_SPEAKERS: {
  letter: string;
  tone: AvatarTone;
  name: string;
  speaking?: boolean;
}[] = [
  { letter: "O", tone: "blue", name: "Omar", speaking: true },
  { letter: "S", tone: "pink", name: "Sara" },
  { letter: "J", tone: "emerald", name: "James" },
];

export const VOICE_LISTENERS: {
  letter: string;
  tone: AvatarTone;
  name: string;
}[] = USERS.slice(3).map((u) => ({
  letter: u.letter,
  tone: u.tone,
  name: u.name,
}));

// ---- Topics & ice-breakers -------------------------------------------------

export const ICE_BREAKERS = [
  "What was the best part of your week?",
  "If you could travel anywhere right now, where would you go?",
  "What's a small thing that made you smile today?",
  "What's your favorite way to learn English?",
  "Describe your perfect weekend in 3 sentences.",
  "What's a skill you want to learn this year?",
  "Coffee or tea — and how do you take it?",
];

export const TOPICS = [
  "Travel & Cultures",
  "Daily Routines",
  "Food & Cooking",
  "Movies & Books",
  "Future Goals",
  "Technology & AI",
  "Sports & Fitness",
  "Music & Hobbies",
];

// ---- Messages --------------------------------------------------------------

export type ChatMsgKind =
  | "incoming"
  | "outgoing"
  | "system"
  | "voice-out"
  | "voice-in"
  | "image-in"
  | "file-in";

export type ChatMsg = {
  id: string;
  kind: ChatMsgKind;
  name?: string;
  letter?: string;
  tone?: AvatarTone;
  time: string;
  text?: string;
  reactions?: number;
  duration?: string;
  host?: boolean;
  imageUrl?: string;
  imageCaption?: string;
  fileName?: string;
  fileSize?: string;
  filePages?: number;
};

export function nowTime(): string {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

// Helper to build an incoming message from a user id
function inMsg(
  id: string,
  userId: string,
  time: string,
  text: string,
  reactions?: number,
): ChatMsg {
  const u = userById(userId)!;
  return {
    id,
    kind: "incoming",
    name: u.name,
    letter: u.letter,
    tone: u.tone,
    time,
    text,
    reactions,
  };
}

function inVoice(
  id: string,
  userId: string,
  time: string,
  duration: string,
): ChatMsg {
  const u = userById(userId)!;
  return {
    id,
    kind: "voice-in",
    name: u.name,
    letter: u.letter,
    tone: u.tone,
    time,
    duration,
  };
}

function outMsg(id: string, time: string, text: string): ChatMsg {
  return { id, kind: "outgoing", time, text };
}

function outVoice(id: string, time: string, duration: string): ChatMsg {
  return { id, kind: "voice-out", time, duration };
}

function sysMsg(id: string, time: string, text: string): ChatMsg {
  return { id, kind: "system", time, text };
}

// Per-room seed conversations — each one is a self-contained "live" feel.

const CONVERSATION_BY_ROOM: Record<string, ChatMsg[]> = {
  // Speaking - Beginner
  "1": [
    inMsg(
      "r1m1",
      "u8",
      "9:58 AM",
      "Hi! I'm new here 👋 is it okay to start?",
      1,
    ),
    inMsg(
      "r1m2",
      "u4",
      "9:59 AM",
      "Welcome Nora! Yes of course, just say hello in English 🙂",
    ),
    inMsg(
      "r1m3",
      "u8",
      "10:01 AM",
      "Okay! My name is Nora and I'm from Kuwait.",
    ),
    inVoice("r1m4", "u4", "10:02 AM", "0:14"),
    inMsg("r1m5", "u1", "10:03 AM", "Nice to meet you Nora! What do you do?"),
    inMsg("r1m6", "u8", "10:05 AM", "I am a student. I study marketing 📚", 2),
    sysMsg("r1m7", "10:06 AM", "Topic suggestion: Daily Routines 💡"),
    inMsg(
      "r1m8",
      "u5",
      "10:08 AM",
      "I usually wake up at 7 and go to the gym 💪",
    ),
  ],

  // Speaking - Intermediate
  "2": [
    {
      ...inMsg(
        "r2m1",
        "u1",
        "10:18 AM",
        "Hi everyone! 👋 Today's topic: Describe a place you visited recently. Take 2 minutes to think then jump in 🎙️",
        7,
      ),
      host: true,
    },
    sysMsg(
      "r2m2",
      "10:18 AM",
      "English only — please switch to text if you can't speak in English yet 🌍",
    ),
    inMsg(
      "r2m3",
      "u2",
      "10:20 AM",
      "Ohhh nice topic! I went to Istanbul last month, the food was unreal 🤤",
      4,
    ),
    inMsg(
      "r2m4",
      "u4",
      "10:21 AM",
      "Same! I was in Marrakech in March — the colors of the souks are something else.",
      2,
    ),
    {
      id: "r2m5",
      kind: "image-in",
      name: "Lina",
      letter: "L",
      tone: "amber",
      time: "10:21 AM",
      imageUrl:
        "https://images.unsplash.com/photo-1597212618440-806262de4f6b?w=600&q=70&auto=format&fit=crop",
      imageCaption: "Sunset at Jemaa el-Fnaa 🌅",
      reactions: 9,
    },
    inMsg(
      "r2m6",
      "u11",
      "10:23 AM",
      "Wow that photo is gorgeous Lina. I've never been to Morocco — adding it to my list 📌",
    ),
    inVoice("r2m7", "u3", "10:24 AM", "0:42"),
    inMsg(
      "r2m8",
      "u6",
      "10:25 AM",
      "James your accent is so smooth, what's your trick? 🔥",
      6,
    ),
    inMsg(
      "r2m9",
      "u3",
      "10:26 AM",
      "Honestly just a lot of shadowing — repeat after podcasts every morning for like 10 minutes.",
      3,
    ),
    {
      id: "r2m10",
      kind: "file-in",
      name: "Emma",
      letter: "E",
      tone: "rose",
      time: "10:27 AM",
      fileName: "travel-vocab-pack.pdf",
      fileSize: "1.2 MB",
      filePages: 8,
      text: "Here's a vocab pack I made for travel topics — 60 words + example sentences ✨",
      reactions: 12,
    },
    outVoice("r2m11", "10:29 AM", "0:23"),
    outMsg(
      "r2m12",
      "10:30 AM",
      "Just shared a quick story about my trip to Salalah — feedback welcome 🙏",
    ),
    inMsg(
      "r2m13",
      "u2",
      "10:31 AM",
      "Loved your intro! Try linking your sentences with 'because' and 'so' to sound more natural.",
      5,
    ),
  ],

  // Voice Only Room (text fallback / preview)
  "3": [
    sysMsg(
      "r3m1",
      "10:00 AM",
      "Welcome to Voice Only — please switch to the audio room 🎙️",
    ),
    inMsg(
      "r3m2",
      "u1",
      "10:02 AM",
      "Just listening today, going to share something soon.",
    ),
  ],

  // IELTS Speaking
  "4": [
    sysMsg(
      "r4m1",
      "9:30 AM",
      "Today's task: Part 2 — Describe a place you'd like to visit.",
    ),
    inMsg(
      "r4m2",
      "u7",
      "9:32 AM",
      "I'll go first. Give me 1 minute to prepare ✍️",
    ),
    inVoice("r4m3", "u7", "9:34 AM", "1:48"),
    inMsg(
      "r4m4",
      "u3",
      "9:36 AM",
      "Great structure Kenza — strong intro and conclusion. Try varying connectors more.",
      5,
    ),
    inMsg(
      "r4m5",
      "u2",
      "9:38 AM",
      "Can someone do Part 3 follow-up questions with me?",
    ),
    outMsg("r4m6", "9:39 AM", "I can! Send the question 🙋"),
    inMsg(
      "r4m7",
      "u2",
      "9:40 AM",
      "Why do people enjoy travelling abroad more than locally?",
    ),
    inVoice("r4m8", "u9", "9:42 AM", "1:12"),
    sysMsg("r4m9", "9:43 AM", "Reminder: aim for 2 mins on Part 2, no less."),
  ],

  // Casual Chat
  "5": [
    inMsg("r5m1", "u6", "8:45 AM", "Good morning everyone ☕"),
    inMsg("r5m2", "u10", "8:46 AM", "Morning Ahmad! What are you up to today?"),
    inMsg(
      "r5m3",
      "u6",
      "8:47 AM",
      "Working from a café today — best decision ever 😄",
      3,
    ),
    inVoice("r5m4", "u5", "8:50 AM", "0:22"),
    inMsg("r5m5", "u9", "8:53 AM", "Maya I love that song! What's it called?"),
    inMsg(
      "r5m6",
      "u5",
      "8:54 AM",
      "It's 'Golden Hour' — perfect morning vibes 🌅",
    ),
    sysMsg(
      "r5m7",
      "8:55 AM",
      "Ice Breaker: What's a small thing that made you smile today?",
    ),
    inMsg("r5m8", "u4", "8:57 AM", "My cat brought me her toy at 6am 😹", 6),
    outMsg("r5m9", "8:58 AM", "haha that's adorable 😍"),
    inMsg(
      "r5m10",
      "u3",
      "9:00 AM",
      "I finally finished a book I've been reading for months 📖",
    ),
  ],
};

export function seedMessages(roomId?: string): ChatMsg[] {
  if (roomId && CONVERSATION_BY_ROOM[roomId]) {
    return [...CONVERSATION_BY_ROOM[roomId]];
  }
  return [...CONVERSATION_BY_ROOM["2"]];
}

// ---- Misc helpers used by chatApi ------------------------------------------

export function randomDuration(): string {
  const sec = 5 + Math.floor(Math.random() * 55);
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function nextMessageId(): string {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
