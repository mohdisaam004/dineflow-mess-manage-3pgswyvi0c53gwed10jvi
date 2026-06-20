import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
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
import { toLocalDateString, formatPeriodLabel } from '@shared/mess-utils';
import type { MessSettings } from '@shared/types';

const SetupMessFormSchema = z.object({
  standardContribution: z.coerce.number().min(0, 'Must be a positive number'),
  reducedContribution: z.coerce.number().min(0, 'Must be a positive number'),
  totalDays: z.coerce.number().int().min(1, 'Must be at least 1 day'),
  cycleStartDate: z.string().min(1, 'Cycle start date is required'),
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
      cycleStartDate: settings?.cycleStartDate || toLocalDateString(),
      resetData: false,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => api('/api/mess/init', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: (_, variables) => {
      if (variables.resetData) {
        toast.success('New mess cycle started successfully!');
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

  const currentPeriodLabel = settings?.currentPeriod
    ? formatPeriodLabel(settings.currentPeriod)
    : 'Not started';

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {settings?.initialized && (
            <div className="rounded-md border p-4 bg-slate-50 text-sm space-y-1">
              <p><span className="font-medium">Current cycle:</span> {currentPeriodLabel}</p>
              {settings.cycleStartDate && (
                <p><span className="font-medium">Cycle started:</span> {format(new Date(settings.cycleStartDate + 'T00:00:00'), 'PPP')}</p>
              )}
              <p><span className="font-medium">Days in cycle:</span> {settings.totalDays}</p>
            </div>
          )}
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
                <FormLabel>Total Mess Days (this cycle)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 30" {...field} value={field.value === undefined ? '' : String(field.value)} />
                </FormControl>
                <FormDescription>Number of days in the current billing cycle.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cycleStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cycle Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>When the current mess cycle begins (used for remaining-day calculations).</FormDescription>
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
                      Start a New Cycle
                    </FormLabel>
                    <FormDescription className="text-amber-700">
                      Archives current expenses under the active period, resets all member days to the new total, and recalculates contributions. This cannot be undone.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          )}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : settings?.initialized ? 'Update Settings' : 'Initialize Mess'}
          </Button>
        </form>
      </Form>
      <AlertDialog open={isConfirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new mess cycle?</AlertDialogTitle>
            <AlertDialogDescription>
              Current expenses will be archived under <strong>{settings?.currentPeriod ? formatPeriodLabel(settings.currentPeriod) : 'the current period'}</strong>.
              All member days will reset and contributions will be recalculated. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingValues(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReset} className="bg-destructive hover:bg-destructive/90">
              Yes, Start New Cycle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SetupMessForm;
