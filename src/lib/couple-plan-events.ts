import { supabase } from "@/integrations/supabase/client";

export type PlanEventVisibility = "private" | "shared";

export type CouplePlanEvent = {
  id: string;
  owner_id: string;
  couple_id: string | null;
  visibility: PlanEventVisibility;
  title: string;
  description: string | null;
  place: string | null;
  event_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanEventError = {
  code?: string;
  message: string;
};

type PlanEventListResponse = {
  data: CouplePlanEvent[] | null;
  error: PlanEventError | null;
};

type PlanEventWriteResponse = {
  error: PlanEventError | null;
};

type PlanEventSelection = {
  gte: (column: "event_date", value: string) => PlanEventSelection;
  lte: (column: "event_date", value: string) => PlanEventSelection;
  order: (
    column: "event_date" | "start_time",
    options: { ascending: boolean; nullsFirst?: boolean },
  ) => PlanEventSelection;
  limit: (count: number) => PromiseLike<PlanEventListResponse>;
};

type PlanEventTable = {
  select: (columns: string) => PlanEventSelection;
  insert: (values: {
    owner_id: string;
    couple_id: string | null;
    visibility: PlanEventVisibility;
    title: string;
    description: string | null;
    place: string | null;
    event_date: string;
    all_day: boolean;
    start_time: string | null;
    end_time: string | null;
  }) => PromiseLike<PlanEventWriteResponse>;
};

type PlanEventClient = {
  from: (table: "couple_plan_events") => PlanEventTable;
};

// Adapter temporário até a regeneração oficial dos tipos Supabase.
const planEventClient = supabase as unknown as PlanEventClient;

const planEventColumns =
  "id, owner_id, couple_id, visibility, title, description, place, event_date, all_day, start_time, end_time, created_at, updated_at";

export async function listCouplePlanEvents(startDate: string, endDate: string) {
  return planEventClient
    .from("couple_plan_events")
    .select(planEventColumns)
    .gte("event_date", startDate)
    .lte("event_date", endDate)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true })
    .limit(200);
}

export async function createCouplePlanEvent(input: {
  ownerId: string;
  coupleId: string | null;
  visibility: PlanEventVisibility;
  title: string;
  description: string | null;
  place: string | null;
  eventDate: string;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
}) {
  return planEventClient.from("couple_plan_events").insert({
    owner_id: input.ownerId,
    couple_id: input.coupleId,
    visibility: input.visibility,
    title: input.title,
    description: input.description,
    place: input.place,
    event_date: input.eventDate,
    all_day: input.allDay,
    start_time: input.startTime,
    end_time: input.endTime,
  });
}
