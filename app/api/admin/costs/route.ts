import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { costSettings, modelPricing, settings } from "../../../../db/schema";
import {
  errorResponse,
  nowIso,
  requirePlatformOwner,
  type Provider,
} from "../../../../lib/sol";

const providers: Provider[] = ["openai", "google", "anthropic"];

async function currentModels() {
  const db = await getDb();
  const config = await db.select().from(settings).where(eq(settings.id, 1)).get();
  return [
    { provider: "openai" as const, model: config?.openaiModel ?? "" },
    { provider: "google" as const, model: config?.googleModel ?? "" },
    { provider: "anthropic" as const, model: config?.anthropicModel ?? "" },
    { provider: "openai" as const, model: "gpt-4o-mini-transcribe" },
  ];
}

export async function GET(request: Request) {
  try {
    await requirePlatformOwner(request);
    const db = await getDb();
    const [config, savedPricing, models] = await Promise.all([
      db.select().from(costSettings).where(eq(costSettings.id, 1)).get(),
      db.select().from(modelPricing).all(),
      currentModels(),
    ]);
    const pricing = models.map(({ provider, model }) => {
      const saved = savedPricing.find((item) => item.provider === provider && item.model === model);
      return saved ?? {
        provider,
        model,
        inputUsdPerMillion: 0,
        outputUsdPerMillion: 0,
        audioUsdPerMinute: 0,
        updatedAt: null,
      };
    });
    return Response.json({
      usdToBrl: config?.usdToBrl ?? 5.5,
      pricing,
      updatedAt: config?.updatedAt ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requirePlatformOwner(request);
    const payload = await request.json() as {
      usdToBrl?: number;
      pricing?: Array<{
        provider?: string;
        model?: string;
        inputUsdPerMillion?: number;
        outputUsdPerMillion?: number;
        audioUsdPerMinute?: number;
      }>;
    };
    const usdToBrl = Number(payload.usdToBrl);
    if (!Number.isFinite(usdToBrl) || usdToBrl <= 0 || usdToBrl > 20) {
      return Response.json({ error: "Informe uma cotação válida do dólar." }, { status: 400 });
    }
    const rows = (payload.pricing ?? []).map((item) => ({
      provider: String(item.provider ?? "").trim() as Provider,
      model: String(item.model ?? "").trim(),
      inputUsdPerMillion: Number(item.inputUsdPerMillion),
      outputUsdPerMillion: Number(item.outputUsdPerMillion),
      audioUsdPerMinute: Number(item.audioUsdPerMinute),
    }));
    if (rows.some((row) => (
      !providers.includes(row.provider)
      || !row.model
      || [row.inputUsdPerMillion, row.outputUsdPerMillion, row.audioUsdPerMinute]
        .some((value) => !Number.isFinite(value) || value < 0 || value > 1000)
    ))) {
      return Response.json({ error: "Revise os preços informados para os modelos." }, { status: 400 });
    }
    const db = await getDb();
    const updatedAt = nowIso();
    await db.insert(costSettings).values({ id: 1, usdToBrl, updatedAt }).onConflictDoUpdate({
      target: costSettings.id,
      set: { usdToBrl, updatedAt },
    }).run();
    for (const row of rows) {
      await db.insert(modelPricing).values({ ...row, updatedAt }).onConflictDoUpdate({
        target: [modelPricing.provider, modelPricing.model],
        set: {
          inputUsdPerMillion: row.inputUsdPerMillion,
          outputUsdPerMillion: row.outputUsdPerMillion,
          audioUsdPerMinute: row.audioUsdPerMinute,
          updatedAt,
        },
      }).run();
    }
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
