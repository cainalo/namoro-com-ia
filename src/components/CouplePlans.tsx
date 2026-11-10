import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, LockKeyhole, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  createCouplePlanEvent,
  listCouplePlanEvents,
  type CouplePlanEvent,
  type PlanEventVisibility,
} from "@/lib/couple-plan-events";

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type EventLoadStatus = "loading" | "ready" | "error" | "database-pending";

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function dateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonth(value: Date, amount: number) {
  const targetMonth = new Date(value.getFullYear(), value.getMonth() + amount, 1);
  const lastDay = new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth() + 1,
    0,
  ).getDate();

  return new Date(
    targetMonth.getFullYear(),
    targetMonth.getMonth(),
    Math.min(value.getDate(), lastDay),
  );
}

function formatSelectedDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
}

function formatEventTime(event: CouplePlanEvent) {
  if (event.all_day || !event.start_time) return "Dia inteiro";
  const start = event.start_time.slice(0, 5);
  if (!event.end_time) return start;
  return `${start}–${event.end_time.slice(0, 5)}`;
}

function isMissingPlanEventsTable(cause: unknown) {
  if (typeof cause !== "object" || cause === null) return false;
  const row = cause as { code?: unknown };
  return row.code === "42P01" || row.code === "PGRST205";
}

export function CouplePlans({ userId }: { userId: string }) {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [focusAfterNavigation, setFocusAfterNavigation] = useState<string | null>(null);
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [events, setEvents] = useState<CouplePlanEvent[]>([]);
  const [eventLoadStatus, setEventLoadStatus] = useState<EventLoadStatus>("loading");
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PlanEventVisibility>("shared");
  const [eventTitle, setEventTitle] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState("");
  const [eventDate, setEventDate] = useState(() => dateKey(new Date()));
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const today = new Date();
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthStart = dateKey(new Date(year, month, 1));
  const monthEnd = dateKey(new Date(year, month + 1, 0));
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  useEffect(() => {
    if (!focusAfterNavigation) return;
    dayButtonRefs.current.get(focusAfterNavigation)?.focus();
    setFocusAfterNavigation(null);
  }, [focusAfterNavigation, visibleMonth]);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      setEventLoadStatus("loading");
      setError(null);

      try {
        const { data: membership, error: membershipError } = await supabase
          .from("couple_members")
          .select("couple_id")
          .eq("user_id", userId)
          .is("ended_at", null)
          .maybeSingle();

        if (membershipError) throw membershipError;
        if (!active) return;

        let activeCoupleId: string | null = null;
        if (membership?.couple_id) {
          const { data: couple, error: coupleError } = await supabase
            .from("couples")
            .select("id, status")
            .eq("id", membership.couple_id)
            .maybeSingle();

          if (coupleError) throw coupleError;
          if (couple?.status === "active") activeCoupleId = couple.id;
        }

        const result = await listCouplePlanEvents(monthStart, monthEnd);
        if (result.error) throw result.error;
        if (!active) return;

        setCoupleId(activeCoupleId);
        if (!activeCoupleId) setVisibility("private");
        setEvents(
          (result.data ?? []).filter(
            (event) =>
              event.visibility === "private" ||
              (event.visibility === "shared" && event.couple_id === activeCoupleId),
          ),
        );
        setEventLoadStatus("ready");
      } catch (cause) {
        if (!active) return;
        setEventLoadStatus(isMissingPlanEventsTable(cause) ? "database-pending" : "error");
      }
    }

    void loadEvents();
    return () => {
      active = false;
    };
  }, [userId, monthStart, monthEnd, refreshKey]);

  useEffect(() => {
    if (!coupleId) return;

    let mounted = true;
    const channel = supabase
      .channel(`couple-plan-events:${coupleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "couple_plan_events",
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          if (mounted) setRefreshKey((current) => current + 1);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [coupleId]);

  const eventCounts = new Map<string, number>();
  for (const event of events) {
    eventCounts.set(event.event_date, (eventCounts.get(event.event_date) ?? 0) + 1);
  }

  const selectedDateKey = dateKey(selectedDate);
  const selectedEvents = events.filter((event) => event.event_date === selectedDateKey);

  function selectDate(date: Date) {
    setSelectedDate(date);
    setEventDate(dateKey(date));
  }

  function moveMonth(offset: number) {
    const nextMonth = new Date(year, month + offset, 1);
    setVisibleMonth(nextMonth);
    selectDate(nextMonth);
  }

  function goToToday() {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    selectDate(now);
    setFocusAfterNavigation(dateKey(now));
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    let nextDate: Date | null = null;

    switch (event.key) {
      case "ArrowLeft":
        nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
        break;
      case "ArrowRight":
        nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
        break;
      case "ArrowUp":
        nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
        break;
      case "ArrowDown":
        nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
        break;
      case "Home": {
        const weekdayOffset = (date.getDay() + 6) % 7;
        nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - weekdayOffset);
        break;
      }
      case "End": {
        const weekdayOffset = (date.getDay() + 6) % 7;
        nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (6 - weekdayOffset));
        break;
      }
      case "PageUp":
        nextDate = shiftMonth(date, -1);
        break;
      case "PageDown":
        nextDate = shiftMonth(date, 1);
        break;
      default:
        return;
    }

    event.preventDefault();
    selectDate(nextDate);
    setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setFocusAfterNavigation(dateKey(nextDate));
  }

  async function handleCreateEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || eventLoadStatus !== "ready") return;

    const normalizedTitle = eventTitle.trim();
    if (!normalizedTitle) {
      setError("Informe um título para o compromisso.");
      return;
    }
    if (visibility === "shared" && !coupleId) {
      setError("Vincule a outra conta antes de compartilhar um compromisso.");
      return;
    }
    if (!allDay && endTime <= startTime) {
      setError("O horário de término precisa ser posterior ao início.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await createCouplePlanEvent({
        ownerId: userId,
        coupleId: visibility === "shared" ? coupleId : null,
        visibility,
        title: normalizedTitle,
        description: description.trim() || null,
        place: place.trim() || null,
        eventDate,
        allDay,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime,
      });

      if (result.error) throw result.error;

      const createdInVisibleMonth = eventDate >= monthStart && eventDate <= monthEnd;
      if (createdInVisibleMonth) {
        setRefreshKey((current) => current + 1);
      }
      setEventTitle("");
      setDescription("");
      setPlace("");
      setNotice("Compromisso guardado.");
    } catch (cause) {
      if (isMissingPlanEventsTable(cause)) {
        setEventLoadStatus("database-pending");
      } else {
        setError("Não foi possível guardar o compromisso. Confira os dados e tente novamente.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="plans-screen" aria-labelledby="plans-title">
      <header className="plans-heading">
        <div>
          <p className="date-kicker">Datas e compromissos</p>
          <h1 id="plans-title">Planos</h1>
        </div>
        <button type="button" className="inline-action" onClick={goToToday}>
          Hoje
        </button>
      </header>

      <section className="plans-calendar" aria-label="Calendário">
        <div className="plans-calendar-toolbar">
          <h2 aria-live="polite">{monthLabel}</h2>
          <div className="plans-calendar-navigation">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="Mês anterior"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label="Próximo mês"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="plans-calendar-grid" aria-label={monthLabel}>
          {weekdays.map((weekday) => (
            <span className="plans-weekday" key={weekday}>
              {weekday}
            </span>
          ))}

          {calendarCells.map((day, index) => {
            if (day === null) {
              return (
                <span
                  className="plans-day-placeholder"
                  aria-hidden="true"
                  key={`empty-${index}`}
                />
              );
            }

            const date = new Date(year, month, day);
            const key = dateKey(date);
            const isSelected = sameDay(date, selectedDate);
            const isToday = sameDay(date, today);
            const eventCount = eventCounts.get(key) ?? 0;

            return (
              <button
                ref={(node) => {
                  if (node) dayButtonRefs.current.set(key, node);
                  else dayButtonRefs.current.delete(key);
                }}
                type="button"
                key={day}
                tabIndex={isSelected ? 0 : -1}
                className={[
                  "plans-day",
                  isToday ? "is-today" : "",
                  isSelected ? "is-selected" : "",
                  eventCount > 0 ? "has-events" : "",
                ].filter(Boolean).join(" ")}
                aria-label={`${formatSelectedDate(date)}${eventCount ? `, ${eventCount} compromisso(s)` : ""}`}
                aria-current={isToday ? "date" : undefined}
                aria-pressed={isSelected}
                onClick={() => selectDate(date)}
                onKeyDown={(event) => handleDayKeyDown(event, date)}
              >
                <span className="plans-day-number">{day}</span>
                {eventCount > 0 && (
                  <span className="plans-day-event-indicator" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {eventLoadStatus === "loading" && (
        <p className="plans-feedback" role="status">Carregando compromissos…</p>
      )}
      {eventLoadStatus === "database-pending" && (
        <div className="plans-feedback" role="status">
          A agenda está aguardando a estrutura de compromissos no banco de dados.
          <button
            type="button"
            className="inline-action"
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            Verificar novamente
          </button>
        </div>
      )}
      {eventLoadStatus === "error" && (
        <div className="plans-feedback">
          <p role="alert">Não foi possível carregar os compromissos.</p>
          <button
            type="button"
            className="inline-action"
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <section className="plans-selected-day" aria-live="polite">
        <div className="plans-selected-day-heading">
          <div>
            <p className="date-kicker">Dia selecionado</p>
            <h2>{formatSelectedDate(selectedDate)}</h2>
          </div>
          {selectedEvents.length > 0 && <span>{selectedEvents.length} compromisso(s)</span>}
        </div>

        {selectedEvents.length === 0 && eventLoadStatus === "ready" ? (
          <p className="plans-no-events">Nenhum compromisso nesta data.</p>
        ) : (
          <div className="plans-event-list">
            {selectedEvents.map((planEvent) => (
              <article className="plans-event-entry" key={planEvent.id}>
                <time>{formatEventTime(planEvent)}</time>
                <div>
                  <h3>{planEvent.title}</h3>
                  {planEvent.description && <p>{planEvent.description}</p>}
                  {planEvent.place && <span>{planEvent.place}</span>}
                </div>
                <span className={planEvent.visibility === "shared" ? "is-shared" : "is-private"}>
                  {planEvent.visibility === "shared" ? "A dois" : "Privado"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>

      {eventLoadStatus === "ready" && (
        <form className="plans-event-composer" onSubmit={handleCreateEvent}>
          <div className="plans-event-composer-heading">
            <CalendarPlus aria-hidden="true" />
            <h2>Novo compromisso</h2>
          </div>

          <label className="plans-field">
            <span>Título</span>
            <input
              type="text"
              value={eventTitle}
              onChange={(event) => setEventTitle(event.target.value)}
              maxLength={120}
              placeholder="Ex.: Passeio no parque"
              required
              disabled={busy}
            />
          </label>

          <label className="plans-field">
            <span>Descrição (opcional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Detalhes do compromisso…"
              disabled={busy}
            />
          </label>

          <label className="plans-field">
            <span>Local (opcional)</span>
            <input
              type="text"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              maxLength={120}
              placeholder="Onde será?"
              disabled={busy}
            />
          </label>

          <div className="plans-event-options">
            <label className="plans-all-day-toggle">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(event) => setAllDay(event.target.checked)}
                disabled={busy}
              />
              <span>Dia inteiro</span>
            </label>

            {!allDay && (
              <div className="plans-time-fields">
                <label className="plans-field">
                  <span>Início</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    required
                    disabled={busy}
                  />
                </label>
                <label className="plans-field">
                  <span>Término</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    required
                    disabled={busy}
                  />
                </label>
              </div>
            )}
          </div>

          <div className="plans-event-footer">
            <label className="plans-field plans-event-date">
              <span>Data</span>
              <input
                type="date"
                value={eventDate}
                onChange={(event) => {
                  setEventDate(event.target.value);
                  const [dateYear, dateMonth, dateDay] = event.target.value.split("-").map(Number);
                  if (dateYear && dateMonth && dateDay) {
                    const nextDate = new Date(dateYear, dateMonth - 1, dateDay);
                    setSelectedDate(nextDate);
                    setVisibleMonth(new Date(dateYear, dateMonth - 1, 1));
                  }
                }}
                required
                disabled={busy}
              />
            </label>

            <div className="memory-visibility-switch" role="group" aria-label="Privacidade do compromisso">
              <button
                type="button"
                className={visibility === "private" ? "is-active" : ""}
                aria-pressed={visibility === "private"}
                disabled={busy}
                onClick={() => setVisibility("private")}
              >
                <LockKeyhole aria-hidden="true" />
                Privado
              </button>
              <button
                type="button"
                className={visibility === "shared" ? "is-active" : ""}
                aria-pressed={visibility === "shared"}
                disabled={!coupleId || busy}
                onClick={() => setVisibility("shared")}
              >
                <Users aria-hidden="true" />
                Compartilhado
              </button>
            </div>

            <button
              type="submit"
              className="primary-action"
              disabled={busy || !eventTitle.trim() || eventLoadStatus !== "ready"}
            >
              {busy ? "Guardando…" : "Guardar compromisso"}
            </button>
          </div>

          <p className="plans-privacy-note">
            {visibility === "private"
              ? "Só você poderá ver este compromisso."
              : "As duas pessoas do casal ativo poderão ver este compromisso."}
          </p>
          {error && <p className="plans-feedback is-error" role="alert">{error}</p>}
          {notice && <p className="plans-feedback is-success" role="status">{notice}</p>}
        </form>
      )}
    </section>
  );
}
