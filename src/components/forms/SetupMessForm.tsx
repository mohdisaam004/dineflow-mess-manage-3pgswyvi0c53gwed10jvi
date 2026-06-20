import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from '@/lib/api-client';
import type { MessSettings } from '@shared/types';
const SetupMessFormSchema = z.object({
  standardContribution: z.coerce.number().min(0, 'Must be a positive number'),
  reducedContribution: z.coerce.number().min(0, 'Must be a positive number'),
  totalDays: z.coerce.number().int().min(1, 'Must be at least 1 day'),
  resetData: z.boolean().optional(),
});
type FormValues = z.infer<typeof SetupMessFormSchema>;
interface SetupMessFormProps {
  settings?: MessSettings;
  onSuccess: () => void;
}
const SetupMessForm = ({ settings, onSuccess }: SetupMessFormProps) => {
  const queryClient = useQueryClient();
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<FormValues | null>(null);
  const form = useForm({
    resolver: zodResolver(SetupMessFormSchema),
    defaultValues: {
      standardContribution: settings?.standardContribution || 450,
      reducedContribution: settings?.reducedContribution || 250,
      totalDays: settings?.totalDays || 30,
      resetData: false,
    },
  });
  const mutation = useMutation({
    mutationFn: (values: FormValues) => api('/api/mess/init', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: (_, variables) => {
      if (variables.resetData) {
        toast.success('Mess has been reset for the new month!');
      } else {
        toast.success('Mess settings saved successfully!');
      }
      queryClient.invalidateQueries({ queryKey: ['messState'] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
  function onSubmit(values: FormValues) {
    if (values.resetData) {
      setPendingValues(values);
      setConfirmOpen(true);
    } else {
      mutation.mutate(values);
    }
  }
  const handleConfirmReset = () => {
    if (pendingValues) {
      mutation.mutate(pendingValues);
    }
    setConfirmOpen(false);
    setPendingValues(null);
  };
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="standardContribution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Standard Contribution (AED)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 450" {...field} value={field.value === undefined ? '' : String(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reducedContribution"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reduced Contribution (AED)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 250" {...field} value={field.value === undefined ? '' : String(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="totalDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Mess Days</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 30" {...field} value={field.value === undefined ? '' : String(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {settings?.initialized && (
            <FormField
              control={form.control}
              name="resetData"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm bg-amber-50 border-amber-200">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="font-semibold text-amber-800">
                      Start a New Month
                    </FormLabel>
                    <FormDescription className="text-amber-700">
                      Check this to clear all existing expenses and recalculate member contributions based on the new settings. This action cannot be undone.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          )}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </Form>
      <AlertDialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all recorded expenses and reset member balances. This action is irreversible and is intended for starting a new month.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingValues(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReset} className="bg-destructive hover:bg-destructive/90">
              Yes, Reset Mess
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export default SetupMessForm;