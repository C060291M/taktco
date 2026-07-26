export function WizardSteps({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div className="flex items-center gap-2 flex-1">
            <div
              className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-xs font-medium ${
                i < currentStep
                  ? "bg-accent text-accent-foreground"
                  : i === currentStep
                  ? "border-2 border-accent text-accent"
                  : "border border-graphite-600 text-graphite-500"
              }`}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${i === currentStep ? "text-white" : "text-graphite-500"}`}>{label}</span>
          </div>
          {i < steps.length - 1 && <div className={`h-px flex-1 ${i < currentStep ? "bg-accent" : "bg-graphite-700"}`} />}
        </div>
      ))}
    </div>
  );
}
