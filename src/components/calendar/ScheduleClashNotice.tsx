import { Alert, Button } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { isAxiosError } from "axios";

export interface ScheduleClash {
  message: string;
  suggested: Dayjs | null;
}

// The backend refuses a booking that clashes with the person's calendar (or a
// duplicate on the same lead) with 409 + errors.dueDate, and - for a busy
// person - errors.suggestedDueDate: their next free time.
export function scheduleClashFrom(err: unknown): ScheduleClash | null {
  if (!isAxiosError<{ message?: string; errors?: { dueDate?: string[]; suggestedDueDate?: string[] } }>(err)) return null;
  if (err.response?.status !== 409 || !err.response.data.errors?.dueDate) return null;
  const suggestion = err.response.data.errors.suggestedDueDate?.[0];
  return { message: err.response.data.message ?? err.response.data.errors.dueDate[0], suggested: suggestion ? dayjs(suggestion) : null };
}

// Shown in the scheduling forms in place of an error toast - says what clashes
// and offers the next free time in one click.
export function ScheduleClashNotice({ clash, onUseSuggested }: { clash: ScheduleClash; onUseSuggested: (time: Dayjs) => void }) {
  return (
    <Alert
      type="warning"
      showIcon
      style={{ marginTop: 12 }}
      title="This time is already taken"
      description={clash.message}
      action={
        clash.suggested ? (
          <Button size="small" type="primary" onClick={() => onUseSuggested(clash.suggested!)}>
            Use {clash.suggested.format("h:mm A")}
          </Button>
        ) : undefined
      }
    />
  );
}
