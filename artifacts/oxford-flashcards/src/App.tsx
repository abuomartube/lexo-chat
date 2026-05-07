import { Router, Route, Switch, Redirect } from "wouter";
import { CURRICULUM_ENABLED } from "@/lib/feature-flags";
import PlatformLanding from "@/pages/PlatformLanding";
import LandingPage from "@/pages/LandingPage";
import IeltsCourse from "@/pages/IeltsCourse";
import FlashcardApp from "@/pages/FlashcardApp";
import DemoFlashcards from "@/pages/DemoFlashcards";
import Signup from "@/pages/Signup";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VerifyEmail from "@/pages/VerifyEmail";
import Dashboard from "@/pages/Dashboard";
import LexoHub from "@/pages/LexoHub";
import LexoTool from "@/pages/LexoTool";
import EnglishStudy from "@/pages/EnglishStudy";
import Checkout from "@/pages/Checkout";
import Cart from "@/pages/Cart";
import CourseDetail from "@/pages/CourseDetail";
import EnglishCourseDetail from "@/pages/EnglishCourseDetail";
import MyPayments from "@/pages/MyPayments";
import AccountSettings from "@/pages/AccountSettings";
import PublicProfile from "@/pages/PublicProfile";
import AdminDashboard from "@/pages/AdminDashboard";
import LiveSessions from "@/pages/LiveSessions";
import Support from "@/pages/Support";
import SupportThread from "@/pages/SupportThread";
import Chat from "@/pages/Chat";
import ChatRoom from "@/pages/ChatRoom";
import ChatMessages from "@/pages/ChatMessages";
import ChatDmThread from "@/pages/ChatDmThread";
import ChatLeaderboard from "@/pages/ChatLeaderboard";
import ChatNotes from "@/pages/ChatNotes";
import ChatShowcase from "@/pages/ChatShowcase";
import ComingSoon from "@/pages/ComingSoon";
import NotFound from "@/pages/not-found";
import ProtectedRoute from "@/components/ProtectedRoute";
import EnglishOnlyRoute from "@/components/EnglishOnlyRoute";
import {
  LexoLegacyHubRedirect,
  LexoLegacyToolRedirect,
} from "@/components/LexoLegacyRedirect";
import { CartProvider } from "@/lib/cart-context";
import { Toaster } from "@/components/ui/toaster";
import AbandonedCartBanner from "@/components/AbandonedCartBanner";
import { useAbandonedCartSync } from "@/hooks/useAbandonedCartSync";

function CartSyncRunner() {
  useAbandonedCartSync();
  return null;
}

const baseRaw = import.meta.env.BASE_URL || "/";
const base =
  baseRaw.endsWith("/") && baseRaw.length > 1
    ? baseRaw.slice(0, -1)
    : baseRaw === "/"
      ? ""
      : baseRaw;

export default function App() {
  return (
    <CartProvider>
    <CartSyncRunner />
    <Router base={base}>
      <AbandonedCartBanner />
      <Switch>
        <Route path="/" component={PlatformLanding} />
        <Route path="/english" component={LandingPage} />
        <Route path="/ielts" component={IeltsCourse} />
        <Route path="/course/ielts/:tier" component={CourseDetail} />
        <Route path="/course/english/:tier" component={EnglishCourseDetail} />
        <Route path="/cart" component={Cart} />
        <Route path="/demo" component={DemoFlashcards} />
        <Route path="/app" component={FlashcardApp} />

        <Route path="/signup" component={Signup} />
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/verify-email" component={VerifyEmail} />

        <Route path="/dashboard">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>

        {/* Lexo for English dashboard — gated to active English enrollments
            (admins bypass). Renamed from /dashboard/lexo in phase-2 L5 to
            make English-only scope explicit. */}
        <Route path="/dashboard/english">
          <ProtectedRoute>
            <EnglishOnlyRoute>
              <LexoHub />
            </EnglishOnlyRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/english/study">
          <ProtectedRoute>
            <EnglishOnlyRoute>
              <EnglishStudy />
            </EnglishOnlyRoute>
          </ProtectedRoute>
        </Route>
        <Route path="/dashboard/english/:tool">
          <ProtectedRoute>
            <EnglishOnlyRoute>
              <LexoTool />
            </EnglishOnlyRoute>
          </ProtectedRoute>
        </Route>

        {/* Backward-compat: /dashboard/lexo[/:tool] → /dashboard/english[/:tool] */}
        <Route path="/dashboard/lexo">
          <LexoLegacyHubRedirect />
        </Route>
        <Route path="/dashboard/lexo/:tool">
          <LexoLegacyToolRedirect />
        </Route>

        <Route path="/checkout/:course/:tier">
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        </Route>

        <Route path="/payments">
          <ProtectedRoute>
            <MyPayments />
          </ProtectedRoute>
        </Route>

        <Route path="/account-settings">
          <ProtectedRoute>
            <AccountSettings />
          </ProtectedRoute>
        </Route>

        <Route path="/u/:userId">
          <ProtectedRoute>
            <PublicProfile />
          </ProtectedRoute>
        </Route>

        {/* Live sessions are part of the heavy curriculum/training stack
            being temporarily hidden. Route+component preserved; flip
            CURRICULUM_ENABLED to re-enable. */}
        <Route path="/live-sessions">
          {CURRICULUM_ENABLED ? (
            <ProtectedRoute>
              <LiveSessions />
            </ProtectedRoute>
          ) : (
            <Redirect to="/dashboard" replace />
          )}
        </Route>

        <Route path="/support">
          <ProtectedRoute>
            <Support />
          </ProtectedRoute>
        </Route>
        <Route path="/support/:id">
          <ProtectedRoute>
            <SupportThread />
          </ProtectedRoute>
        </Route>

        <Route path="/chat">
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/r/:slug">
          <ProtectedRoute>
            <ChatRoom />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/messages">
          <ProtectedRoute>
            <ChatMessages />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/dm/:id">
          <ProtectedRoute>
            <ChatDmThread />
          </ProtectedRoute>
        </Route>
        <Route path="/chat-showcase" component={ChatShowcase} />
        <Route path="/chat/leaderboard">
          <ProtectedRoute>
            <ChatLeaderboard />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/notes">
          <ProtectedRoute>
            <ChatNotes />
          </ProtectedRoute>
        </Route>

        <Route path="/free-lessons">
          <ComingSoon
            titleKey="comingSoon.freeLessons.title"
            descKey="comingSoon.freeLessons.desc"
          />
        </Route>
        <Route path="/assessment">
          <ComingSoon
            titleKey="comingSoon.assessment.title"
            descKey="comingSoon.assessment.desc"
          />
        </Route>
        <Route path="/affiliate">
          <ComingSoon
            titleKey="comingSoon.affiliate.title"
            descKey="comingSoon.affiliate.desc"
          />
        </Route>
        <Route path="/admin">
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
      <Toaster />
    </Router>
    </CartProvider>
  );
}
