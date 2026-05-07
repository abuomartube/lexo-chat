import {
  Bell,
  Globe,
  Lock,
  Mic,
  Moon,
  CreditCard,
  HelpCircle,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { Header, Card, BottomNav, ChatScrollBg } from "@/components/chat-ui";

type RowProps = {
  icon: React.ReactNode;
  label: string;
  value?: string;
  toggle?: boolean;
  on?: boolean;
  tone?: "default" | "danger";
};

function SettingRow({
  icon,
  label,
  value,
  toggle,
  on,
  tone = "default",
}: RowProps) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-2">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center ring-1 ${
          tone === "danger"
            ? "bg-rose-500/15 ring-rose-500/30 text-rose-300"
            : "bg-white/5 ring-white/10 text-slate-300"
        }`}
      >
        {icon}
      </div>
      <span
        className={`flex-1 text-[12px] font-semibold ${
          tone === "danger" ? "text-rose-300" : "text-white"
        }`}
      >
        {label}
      </span>
      {value && (
        <span className="text-[11px] text-slate-400 font-medium">{value}</span>
      )}
      {toggle && (
        <span
          className={`w-9 h-5 rounded-full p-0.5 flex items-center transition-colors ${
            on ? "bg-purple-500/80" : "bg-white/10"
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-4" : ""
            }`}
          />
        </span>
      )}
      {!toggle && !value && (
        <ChevronLeft size={14} className="text-slate-500" />
      )}
    </div>
  );
}

export function SettingsTile() {
  return (
    <>
      <Header
        title="الإعدادات"
        subtitle={
          <span className="text-[10px] text-slate-400">
            إدارة حسابك وتفضيلاتك
          </span>
        }
      />
      <ChatScrollBg className="px-4 pt-3 pb-3 space-y-2.5">
        <Card title="عام">
          <SettingRow
            icon={<Globe size={13} />}
            label="اللغة"
            value="العربية"
          />
          <SettingRow
            icon={<Moon size={13} />}
            label="المظهر الداكن"
            toggle
            on
          />
          <SettingRow icon={<Bell size={13} />} label="الإشعارات" toggle on />
        </Card>

        <Card title="المحادثات">
          <SettingRow
            icon={<Mic size={13} />}
            label="الميكروفون"
            value="افتراضي"
          />
          <SettingRow
            icon={<Globe size={13} />}
            label="English Only nudge"
            toggle
            on
          />
        </Card>

        <Card title="الحساب">
          <SettingRow icon={<Lock size={13} />} label="كلمة المرور" />
          <SettingRow
            icon={<CreditCard size={13} />}
            label="الاشتراك"
            value="Pro · 247 يوم"
          />
          <SettingRow
            icon={<Bell size={13} />}
            label="الإشعارات غير المقروءة"
            value="8 جديدة"
          />
          <SettingRow icon={<HelpCircle size={13} />} label="المساعدة والدعم" />
          <SettingRow
            icon={<LogOut size={13} />}
            label="تسجيل الخروج"
            tone="danger"
          />
        </Card>

        <div className="text-center text-[10px] text-slate-500 pt-1 pb-2">
          LEXO · Phase 1 · v0.1.0
        </div>
      </ChatScrollBg>
      <BottomNav active="profile" />
    </>
  );
}
