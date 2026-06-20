import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
import type { Member } from '@shared/types';
const PasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});
type FormValues = z.infer<typeof PasswordSchema>;
interface ResetAdminPasswordDialogProps {
  member: Member;
  onClose: () => void;
  onConfirm: (password: string) => void;
}
const ResetAdminPasswordDialog = ({ member, onClose, onConfirm }: ResetAdminPasswordDialogProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: { password: '' },
  });
  const onSubmit = (values: FormValues) => {
    onConfirm(values.password);
  };
  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Admin Password</DialogTitle>
          <DialogDescription>
            Set a new password for <span className="font-semibold">{member.name}</span>. They will be notified of this change.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Reset Password</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default ResetAdminPasswordDialog;