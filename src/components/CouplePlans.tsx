import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const weekdays = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function sameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
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

export function CouplePlans() {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [focusAfterNavigation, setFocusAfterNavigation] = useState<string | null>(null);
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  const today = new Date();
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push(null);
  }

  useEffect(() => {
    if (!focusAfterNavigation) return;
    dayButtonRefs.current.get(focusAfterNavigation)?.focus();
    setFocusAfterNavigation(null);
  }, [focusAfterNavigation, visibleMonth]);

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
    setSelectedDate(nextDate);
    setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setFocusAfterNavigation(dateKey(nextDate));
  }

  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  function moveMonth(offset: number) {
    const nextMonth = new Date(year, month + offset, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(nextMonth);
  }

  function goToToday() {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
    setFocusAfterNavigation(dateKey(now));
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
            const isSelected = sameDay(date, selectedDate);
            const isToday = sameDay(date, today);

            return (
              <button
                ref={(node) => {
                  const key = dateKey(date);
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
                ].filter(Boolean).join(" ")}
                aria-label={formatSelectedDate(date)}
                aria-current={isToday ? "date" : undefined}
                aria-pressed={isSelected}
                onClick={() => setSelectedDate(date)}
                onKeyDown={(event) => handleDayKeyDown(event, date)}
              >
                {day}
              </button>
            );
          })}
        </div>
      </section>

      <section className="plans-selected-day" aria-live="polite">
        <p className="date-kicker">Dia selecionado</p>
        <h2>{formatSelectedDate(selectedDate)}</h2>
        <p>Nenhum plano adicionado para esta data.</p>
      </section>
    </section>
  );
}
