export type ModelPrice = {
  provider: string;
  model: string;
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
  audioUsdPerMinute: number;
};

export type CostableUsage = {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  audioDurationSeconds: number;
};

export function pricingKey(provider: string, model: string) {
  return `${provider.trim().toLowerCase()}:${model.trim().toLowerCase()}`;
}

export function estimateUsageUsd(usage: CostableUsage, price?: ModelPrice) {
  if (!price) return null;
  const input = Math.max(0, Number(usage.inputTokens) || 0)
    * Math.max(0, Number(price.inputUsdPerMillion) || 0) / 1_000_000;
  const output = Math.max(0, Number(usage.outputTokens) || 0)
    * Math.max(0, Number(price.outputUsdPerMillion) || 0) / 1_000_000;
  const audio = Math.max(0, Number(usage.audioDurationSeconds) || 0)
    * Math.max(0, Number(price.audioUsdPerMinute) || 0) / 60;
  return input + output + audio;
}

export function roundCurrency(value: number) {
  return Math.round((Number(value) || 0) * 10000) / 10000;
}
