import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentUser,
  signup,
  login,
  logout,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  type SignupRequest,
  type LoginRequest,
  type ForgotPasswordRequest,
  type ResetPasswordRequest,
  type VerifyEmailRequest,
  type PublicUser,
  type MeResponse,
} from "@workspace/api-client-react";

const ME_KEY = ["auth", "me"] as const;

type AuthContextValue = {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  signup: (data: SignupRequest) => Promise<PublicUser>;
  login: (data: LoginRequest) => Promise<PublicUser>;
  logout: () => Promise<void>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<{ message: string }>;
  resetPassword: (data: ResetPasswordRequest) => Promise<{ message: string }>;
  sendVerificationEmail: () => Promise<{ message: string }>;
  verifyEmail: (data: VerifyEmailRequest) => Promise<{ message: string }>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const meQuery = useQuery<MeResponse>({
    queryKey: ME_KEY,
    queryFn: () => getCurrentUser(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const setMe = useCallback(
    (user: PublicUser | null) => {
      qc.setQueryData<MeResponse>(ME_KEY, { user });
    },
    [qc],
  );

  const signupMutation = useMutation({
    mutationFn: (data: SignupRequest) => signup(data),
    onSuccess: (res) => setMe(res.user),
  });
  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onSuccess: (res) => setMe(res.user),
  });
  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      setMe(null);
      qc.clear();
    },
  });
  const forgotMutation = useMutation({
    mutationFn: (data: ForgotPasswordRequest) => forgotPassword(data),
  });
  const resetMutation = useMutation({
    mutationFn: (data: ResetPasswordRequest) => resetPassword(data),
  });
  const sendVerificationMutation = useMutation({
    mutationFn: () => sendVerificationEmail(),
  });
  const verifyEmailMutation = useMutation({
    mutationFn: (data: VerifyEmailRequest) => verifyEmail(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ME_KEY });
    },
  });

  const user = (meQuery.data?.user ?? null) as PublicUser | null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading: meQuery.isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      signup: async (data) => {
        const res = await signupMutation.mutateAsync(data);
        return res.user;
      },
      login: async (data) => {
        const res = await loginMutation.mutateAsync(data);
        return res.user;
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
      forgotPassword: (data) => forgotMutation.mutateAsync(data),
      resetPassword: (data) => resetMutation.mutateAsync(data),
      sendVerificationEmail: () => sendVerificationMutation.mutateAsync(),
      verifyEmail: (data) => verifyEmailMutation.mutateAsync(data),
      refresh: async () => {
        await qc.invalidateQueries({ queryKey: ME_KEY });
      },
    }),
    [
      user,
      meQuery.isLoading,
      signupMutation,
      loginMutation,
      logoutMutation,
      forgotMutation,
      resetMutation,
      sendVerificationMutation,
      verifyEmailMutation,
      qc,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
