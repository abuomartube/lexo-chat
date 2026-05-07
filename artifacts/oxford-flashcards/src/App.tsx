import { Router, Route, Switch, Redirect } from "wouter";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Chat from "@/pages/Chat";
import ChatRoom from "@/pages/ChatRoom";
import ChatDmThread from "@/pages/ChatDmThread";
import ChatLeaderboard from "@/pages/ChatLeaderboard";
import ChatMessages from "@/pages/ChatMessages";
import ChatNotes from "@/pages/ChatNotes";
import ChatShowcase from "@/pages/ChatShowcase";
import NotFound from "@/pages/not-found";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function App() {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return (
    <Router base={base}>
      <Switch>
        <Route path="/">
          <Redirect to="/chat" />
        </Route>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={Signup} />
        <Route path="/chat">
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/showcase" component={ChatShowcase} />
        <Route path="/chat/leaderboard">
          <ProtectedRoute>
            <ChatLeaderboard />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/messages">
          <ProtectedRoute>
            <ChatMessages />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/notes">
          <ProtectedRoute>
            <ChatNotes />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/dm/:threadId">
          <ProtectedRoute>
            <ChatDmThread />
          </ProtectedRoute>
        </Route>
        <Route path="/chat/:roomId">
          <ProtectedRoute>
            <ChatRoom />
          </ProtectedRoute>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}
