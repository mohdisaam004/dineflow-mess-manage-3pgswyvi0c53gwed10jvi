import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
const PasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Old password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});
type FormValues = z.infer<typeof PasswordSchema>;
interface SuperAdminChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}
const SuperAdminChangePasswordDialog = ({ isOpen, onClose }: SuperAdminChangePasswordDialogProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });
  const { mutate, isPending } = useMutation({
    mutationFn: (values: Pick<FormValues, 'oldPassword' | 'newPassword'>) =>
      api('/api/auth/super-admin/change-password', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success('Password changed successfully.');
      onClose();
      form.reset();
    },
    onError: (err) => {
      toast.error(`Failed to change password: ${(err as Error).message}`);
    },
  });
  const onSubmit = (values: FormValues) => {
    mutate({ oldPassword: values.oldPassword, newPassword: values.newPassword });
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Super Admin Password</DialogTitle>
          <DialogDescription>
            Enter your old and new password to update your credentials.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="oldPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Old Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Changing...' : 'Change Password'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default SuperAdminChangePasswordDialog;