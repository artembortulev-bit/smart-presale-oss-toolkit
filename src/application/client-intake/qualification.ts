import { buildSelectionConstraints } from "@/application/selection/constraints";
import { SelectionInput } from "@/application/selection/types";

import {
  ClientObjectType,
  ClientRequestEstimate,
  ClientRequestSubmission,
} from "@/application/client-intake/types";

export type ClientRequestQualificationSnapshot = {
  parsedRequirements: ReturnType<typeof buildSelectionConstraints>;
  confidence: number;
  warnings: string[];
  summary: string;
};

function mapClientObjectTypeToSelectionObjectType(
  objectType: ClientObjectType,
): SelectionInput["objectType"] {
  if (objectType === "WORKOUT") {
    return "school_sport";
  }

  if (objectType === "PARK_EQUIPMENT") {
    return "park";
  }

  return "playground";
}

function buildQualificationSummary(
  constraints: ClientRequestQualificationSnapshot["parsedRequirements"],
) {
  const parts = [
    constraints.widthM && constraints.lengthM
      ? `размер ${constraints.widthM}x${constraints.lengthM} м`
      : undefined,
    constraints.ageMinYears !== undefined
      ? `возраст ${constraints.ageMinYears}+`
      : undefined,
    constraints.materialPreferences.length > 0
      ? `материалы: ${constraints.materialPreferences.join(", ")}`
      : undefined,
    constraints.usageContexts.length > 0
      ? `сценарий: ${constraints.usageContexts.join(", ")}`
      : undefined,
    constraints.excludedTags.length > 0
      ? `исключения: ${constraints.excludedTags.join(", ")}`
      : undefined,
  ].filter(Boolean);

  return parts.length > 0
    ? `Квалификация: ${parts.join("; ")}.`
    : "Квалификация: данных достаточно для предварительной оценки, но требуется проверка менеджера.";
}

export function buildClientRequestQualificationSnapshot(
  submission: ClientRequestSubmission,
  estimate: ClientRequestEstimate,
): ClientRequestQualificationSnapshot {
  const selectionInput: SelectionInput = {
    objectType: mapClientObjectTypeToSelectionObjectType(submission.objectType),
    widthM: submission.widthM,
    lengthM: submission.lengthM,
    segment: submission.segment,
    budgetRub: submission.targetBudgetRub,
    clientType: [submission.companyName, submission.location].filter(Boolean).join(". "),
    wishes: submission.notes,
    needsDelivery: submission.needsDelivery,
    needsInstallation: submission.needsInstallation,
  };

  const parsedRequirements = buildSelectionConstraints(selectionInput);
  const hasContact = Boolean(submission.email || submission.phone);
  const hasDimensions = Boolean(parsedRequirements.widthM && parsedRequirements.lengthM);
  const hasFreeText = Boolean(submission.notes?.trim());
  const confidence = Math.min(
    0.98,
    Math.max(
      0.35,
      estimate.confidence * 0.65 +
        (hasContact ? 0.08 : 0) +
        (hasDimensions ? 0.14 : 0) +
        (hasFreeText ? 0.08 : 0),
    ),
  );

  return {
    parsedRequirements,
    confidence: Number(confidence.toFixed(3)),
    warnings: parsedRequirements.warnings,
    summary: buildQualificationSummary(parsedRequirements),
  };
}
