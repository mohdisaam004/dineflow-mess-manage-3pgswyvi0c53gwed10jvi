import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UtensilsCrossed, User, Shield, KeyRound, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/hooks/use-auth-store';
import { api } from '@/lib/api-client';
import { getDeviceInfo } from '@/lib/utils';
import type { Member, AuditLog } from '@shared/types';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
type LoginAttempt = {
  type: 'super_admin' | 'admin' | 'member';
  member?: Member;
};
export function LoginPage() {
  const navigate = useNavigate();
  const { memberId } = useParams();
  const { login, role: currentRole, member: currentMember } = useAuthStore();
  const [loginAttempt, setLoginAttempt] = useState<LoginAttempt | null>(null);
  const [password, setPassword] = useState('');
  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => api('/api/members'),
  });
  const { mutate: createAuditLog } = useMutation({
    mutationFn: (log: Partial<AuditLog>) => api('/api/audit-logs', { method: 'POST', body: JSON.stringify(log) }),
    onError: (err) => console.error("Failed to create audit log:", err),
  });
  const { mutate: performLogin, isPending: isLoginPending } = useMutation({
    mutationFn: (credentials: { role: 'super_admin' | 'admin', password?: string, memberId?: string }) =>
      api<{ role: 'admin' | 'member', member: Member | null }>('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    onSuccess: (data) => {
      const loggedInMember = data.member;
      const userName = loggedInMember ? loggedInMember.name : 'Super Admin';
      toast.success(`Logged in as ${userName}`);
      login(data.role, loggedInMember || undefined);
      createAuditLog({
        event: 'login',
        userId: loggedInMember?.id || 'super_admin',
        userName: userName,
        deviceInfo: getDeviceInfo(),
      });
      const destination = loggedInMember?.role === 'admin' || !loggedInMember ? '/admin/dashboard' : '/member/dashboard';
      navigate(destination);
    },
    onError: (err) => {
      toast.error(`Login failed: ${(err as Error).message}`);
    }
  });
  useEffect(() => {
    if (currentRole) {
      const destination = currentMember?.role === 'admin' || !currentMember ? '/admin/dashboard' : '/member/dashboard';
      navigate(destination);
    }
  }, [currentRole, currentMember, navigate]);
  const handleLogin = useCallback((member: Member) => {
    if (member.role === 'admin') {
      setLoginAttempt({ type: 'admin', member });
    } else {
      login('member', member);
      toast.success(`Logged in as ${member.name}`);
      createAuditLog({
        event: 'login',
        userId: member.id,
        userName: member.name,
        deviceInfo: getDeviceInfo(),
      });
      navigate('/member/dashboard');
    }
  }, [login, createAuditLog, navigate]);
  useEffect(() => {
    if (memberId && members) {
      const memberToLogin = members.find(m => m.id === memberId);
      if (memberToLogin) {
        handleLogin(memberToLogin);
      }
    }
  }, [memberId, members, handleLogin]);
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginAttempt || !password) return;
    if (loginAttempt.type === 'super_admin') {
      performLogin({ role: 'super_admin', password });
    } else if (loginAttempt.type === 'admin' && loginAttempt.member) {
      performLogin({ role: 'admin', password, memberId: loginAttempt.member.id });
    }
  };
  const handleMemberSelect = (selectedMemberId: string) => {
    const member = members?.find(m => m.id === selectedMemberId);
    if (member) {
      handleLogin(member);
    }
  };
  const renderPasswordForm = () => (
    <form onSubmit={handlePasswordSubmit} className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLoginAttempt(null)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        Logging in as {loginAttempt?.member?.name || 'Super Admin'}
      </div>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="pl-10 h-12"
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full h-12" disabled={isLoginPending}>
        {isLoginPending ? 'Verifying...' : 'Login'}
      </Button>
    </form>
  );
  const renderRoleSelection = () => (
    <div className="space-y-4">
      <Button
        onClick={() => setLoginAttempt({ type: 'super_admin' })}
        className="w-full h-14 text-lg bg-gray-800 hover:bg-gray-900 text-white transition-all duration-300 transform hover:scale-105"
      >
        <Shield className="mr-2 h-5 w-5" />
        Super Admin Login
      </Button>
      <div className="relative">
        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or login as a member</span></div>
      </div>
      {isLoading ? (
        <p className="text-center text-muted-foreground">Loading members...</p>
      ) : (
        <Select onValueChange={handleMemberSelect}>
          <SelectTrigger className="w-full h-12 text-md">
            <SelectValue placeholder="Select your name to login" />
          </SelectTrigger>
          <SelectContent>
            {members?.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                <div className="flex items-center">
                  {member.role === 'admin' ? <Shield className="mr-2 h-5 w-5 text-green-600" /> : <User className="mr-2 h-5 w-5" />}
                  {member.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <Toaster richColors />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="py-8 md:py-10 lg:py-12 flex flex-col items-center justify-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-4 mb-4 shadow-lg">
              <UtensilsCrossed className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800">Baraha Bad Boys Mess</h1>
            <p className="text-muted-foreground mt-2">Effortless Mess Management</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full sm:max-w-md">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Select Your Role</CardTitle>
                <CardDescription className="text-center">Choose your access level to continue.</CardDescription>
              </CardHeader>
              <CardContent>
                {loginAttempt ? renderPasswordForm() : renderRoleSelection()}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
      <footer className="absolute bottom-4 text-center text-muted-foreground/80 text-sm">
        <p>Powered by Ibrahim</p>
      </footer>
    </div>
  );
}