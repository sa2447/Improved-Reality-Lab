import { auth } from "@/auth";
import { getSavedComparison } from "@/lib/saved-comparisons";
import { notFound, redirect } from "next/navigation";

type Params = {
  params: Promise<{ id: string }>;
};

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item))
    .filter((item) => item.trim().length > 0);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

function toStateCodesFromComparisonData(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }

      const stateCode = (item as { stateCode?: unknown }).stateCode;
      return typeof stateCode === "string" ? stateCode : "";
    })
    .filter((item) => item.trim().length > 0);
}

function SnapshotBarChart({
  title,
  labels,
  values,
  valueFormatter,
  negativeClass = "bg-rose-500",
}: {
  title: string;
  labels: string[];
  values: number[];
  valueFormatter: (value: number) => string;
  negativeClass?: string;
}) {
  if (labels.length === 0 || values.length !== labels.length) {
    return null;
  }

  const maxMagnitude = Math.max(...values.map((value) => Math.abs(value)), 0.01);

  return (
    <section className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="space-y-2">
        {labels.map((label, index) => {
          const value = values[index] ?? 0;
          const widthPercent = Math.max(6, (Math.abs(value) / maxMagnitude) * 100);
          const isNegative = value < 0;

          return (
            <div key={`${title}-${label}`} className="flex items-center gap-2">
              <div className="w-14 text-xs font-medium text-zinc-700">{label}</div>
              <div className="h-5 flex-1 rounded bg-zinc-200">
                <div
                  className={`h-5 rounded ${isNegative ? negativeClass : "bg-blue-600"}`}
                  style={{ width: `${widthPercent}%` }}
                  title={`${label}: ${valueFormatter(value)}`}
                />
              </div>
              <div className="w-28 text-right text-xs text-zinc-700">{valueFormatter(value)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default async function SavedComparisonDetailPage({ params }: Params) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  const { id } = await params;

  const record = await getSavedComparison(id).catch(() => null);
  if (!record) {
    notFound();
  }

  const chartData = (record.chartData ?? {}) as Record<string, unknown>;
  const comparisonData = (record.comparisonData ?? {}) as Record<string, unknown>;
  const labels = toStringArray(chartData.labels);
  const coverageRatioSeries = toNumberArray(chartData.coverageRatioSeries);
  const affordabilityGapSeries = toNumberArray(chartData.affordabilityGapSeries);
  const monthlyCostSeries = toNumberArray(chartData.monthlyCostSeries);
  const monthlyIncomeSeries = toNumberArray(chartData.monthlyIncomeSeries);
  const comparedStatesFromRecord = toStringArray(record.comparedStates as unknown);
  const comparedStatesFromComparison = toStateCodesFromComparisonData(comparisonData.states);
  const comparedStates =
    comparedStatesFromRecord.length > 0
      ? comparedStatesFromRecord
      : comparedStatesFromComparison.length > 0
        ? comparedStatesFromComparison
        : labels;
  const questionType =
    typeof comparisonData.questionType === "string" ? comparisonData.questionType : "n/a";
  const mode = typeof comparisonData.mode === "string" ? comparisonData.mode : "n/a";
  const hoursPerWeek =
    typeof comparisonData.hoursPerWeek === "number" ? comparisonData.hoursPerWeek : null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">{record.name}</h1>
      <p className="text-sm text-zinc-600">Saved at {record.createdAt.toISOString()}</p>

      <SnapshotBarChart
        title="Coverage Ratio Graph"
        labels={labels}
        values={coverageRatioSeries}
        valueFormatter={formatScore}
      />

      <SnapshotBarChart
        title="Affordability Gap Graph"
        labels={labels}
        values={affordabilityGapSeries}
        valueFormatter={(value) => `${value < 0 ? "-" : "+"}${formatCurrency(Math.abs(value))}`}
      />

      <SnapshotBarChart
        title="Monthly Cost Graph"
        labels={labels}
        values={monthlyCostSeries}
        valueFormatter={formatCurrency}
      />

      <SnapshotBarChart
        title="Monthly Income Graph"
        labels={labels}
        values={monthlyIncomeSeries}
        valueFormatter={formatCurrency}
      />

      <section className="rounded border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Snapshot Summary</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Compared states</p>
            <p className="mt-1 text-sm font-medium text-zinc-800">
              {comparedStates.length > 0 ? comparedStates.join(", ") : "n/a"}
            </p>
          </div>
          <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Primary state</p>
            <p className="mt-1 text-sm font-medium text-zinc-800">{record.primaryState ?? "n/a"}</p>
          </div>
          <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Affordability score</p>
            <p className="mt-1 text-sm font-medium text-zinc-800">
              {record.affordabilityScore != null ? formatScore(Number(record.affordabilityScore)) : "n/a"}
            </p>
          </div>
          <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Dataset version</p>
            <p className="mt-1 text-sm font-medium text-zinc-800">{record.datasetVersionId ?? "n/a"}</p>
          </div>
          <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Question type</p>
            <p className="mt-1 text-sm font-medium text-zinc-800">{questionType}</p>
          </div>
          <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Calculation mode</p>
            <p className="mt-1 text-sm font-medium text-zinc-800">
              {mode}
              {hoursPerWeek != null ? ` at ${hoursPerWeek} hrs/week` : ""}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
