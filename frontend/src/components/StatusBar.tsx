type Status = "PENDING" | "ANALYSED" | "WORKING" | "COMPLETE";

const steps: { key: Status; label: string }[] = [
  { key: "PENDING", label: "Pending" },
  { key: "ANALYSED", label: "Analysed" },
  { key: "WORKING", label: "In Progress" },
  { key: "COMPLETE", label: "Completed" },
];

export default function StatusBar({ status }: { status: Status }) {
  const activeIndex = steps.findIndex((s) => s.key === status);
  const progressPercent =
    activeIndex <= 0 ? 0 : (activeIndex / (steps.length - 1)) * 100;

  return (
    <div className="mt-4">
      {/* Dots + labels */}
      <div className="flex justify-between relative z-10">
        {steps.map((step, i) => {
          const active = i <= activeIndex;
          const isCurrent = i === activeIndex;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              {/* Dot */}
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300
                  ${active ? "bg-orange-500" : "bg-slate-300"}
                  ${isCurrent ? "animate-pulse scale-110" : ""}
                `}
              />

              {/* Label */}
              <span
                className={`mt-1 text-[11px] font-medium transition-all duration-300
                  ${
                    active
                      ? "text-orange-600 opacity-100 translate-y-0"
                      : "text-slate-400 opacity-70 translate-y-0.5"
                  }
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="relative mt-3 h-[2px] w-full bg-slate-200 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-orange-500 rounded-full
                     transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
