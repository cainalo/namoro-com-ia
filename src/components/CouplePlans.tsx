import { useState } from "react";
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

export function CouplePlans() {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date());

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

  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);

  function moveMonth(offset: number) {
    setVisibleMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function goToToday() {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(now);
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

        <div className="plans-calendar-grid" role="grid" aria-label={monthLabel}>
          {weekdays.map((weekday) => (
            <span className="plans-weekday" role="columnheader" key={weekday}>
              {weekday}
            </span>
          ))}

          {calendarCells.map((day, index) => {
            if (day === null) {
              return (
                <span
                  className="plans-day-placeholder"
                  role="gridcell"
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
                type="button"
                role="gridcell"
                key={day}
                className={[
                  "plans-day",
                  isToday ? "is-today" : "",
                  isSelected ? "is-selected" : "",
                ].filter(Boolean).join(" ")}
                aria-label={formatSelectedDate(date)}
                aria-pressed={isSelected}
                onClick={() => setSelectedDate(date)}
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
