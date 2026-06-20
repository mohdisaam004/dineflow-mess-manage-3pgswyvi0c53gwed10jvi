import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import type { Member } from '@shared/types';
const MemberFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['standard', 'reduced']),
  contribution: z.coerce.number().min(0, 'Contribution must be a positive number').optional(),
  days: z.coerce.number().int().min(0, 'Must be a positive number').optional(),
});
type FormValues = z.infer<typeof MemberFormSchema>;
interface MemberFormProps {
  member?: Member;
  onSuccess: () => void;
}
const MemberForm = ({ member, onSuccess }: MemberFormProps) => {
  const queryClient = useQueryClient();
  const isEditMode = !!member;
  const form = useForm({
    resolver: zodResolver(MemberFormSchema),
    defaultValues: {
      name: member?.name || '',
      type: member?.type || 'standard',
      contribution: member?.contribution,
      days: member?.days,
    },
  });
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const endpoint = isEditMode ? `/api/members/${member.id}` : '/api/members';
      const method = isEditMode ? 'PUT' : 'POST';
      return api(endpoint, { method, body: JSON.stringify(values) });
    },
    onSuccess: () => {
      toast.success(`Member ${isEditMode ? 'updated' : 'added'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['messState'] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to save member: ${error.message}`);
    },
  });
  function onSubmit(values: z.infer<typeof MemberFormSchema>) {
    mutation.mutate(values);
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a member type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="reduced">Reduced</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Days</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 30" {...field} value={field.value === undefined ? '' : String(field.value)} />
              </FormControl>
              <FormDescription>
                Contribution is auto-calculated based on this. Leave blank for the full month.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        {isEditMode && (
          <FormField
            control={form.control}
            name="contribution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contribution (AED)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 450" {...field} value={field.value === undefined ? '' : String(field.value)} />
                </FormControl>
                <FormDescription>
                  This is a manual override. The contribution will be recalculated if you change Type or Days.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : (isEditMode ? 'Update Member' : 'Save Member')}
        </Button>
      </form>
    </Form>
  );
};
export default MemberForm;