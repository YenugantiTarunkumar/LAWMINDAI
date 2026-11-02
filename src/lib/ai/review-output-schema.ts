import { z } from 'zod';

const riskLevelSchema = z.enum(['high', 'medium', 'low']);

const legalReferenceSchema = z.object({
  actName: z.string(),
  section: z.string(),
  relevance: z.string(),
});

const confidenceSchema = z.preprocess((val) => {
  if (typeof val === 'number') {
    const scaled = val > 1 && val <= 100 ? val / 100 : val;
    return Math.max(0, Math.min(1, scaled));
  }
  return val;
}, z.number().min(0).max(1));

const pageNumbersSchema = z.preprocess((val) => {
  if (Array.isArray(val)) {
    return val.filter(
      (item): item is number =>
        typeof item === 'number' && Number.isInteger(item) && item > 0,
    );
  }
  return [];
}, z.array(z.number().int().positive()));

const clauseSchema = z.object({
  clauseTitle: z.string().min(1),
  originalText: z.string(),
  riskLevel: riskLevelSchema,
  issue: z.string(),
  whyItMatters: z.string(),
  potentialConsequences: z.string(),
  recommendedAction: z.string(),
  proposedRevision: z.string(),
  reasoning: z.string(),
  legalReferences: z.array(legalReferenceSchema),
  evidenceLimitations: z.string(),
  confidence: confidenceSchema,
  pageNumbers: pageNumbersSchema,
});

const missingClauseSchema = z.object({
  clauseTitle: z.string().min(1),
  riskLevel: riskLevelSchema,
  whyItMatters: z.string(),
  potentialConsequences: z.string(),
  recommendedAction: z.string(),
  proposedWording: z.string(),
  legalReferences: z.array(legalReferenceSchema),
  evidenceLimitations: z.string(),
});

const ambiguousProvisionSchema = z.object({
  clauseTitle: z.string(),
  originalText: z.string(),
  ambiguity: z.string(),
  possibleInterpretations: z.array(z.string()),
  riskLevel: riskLevelSchema,
  pageNumbers: pageNumbersSchema,
});

export const reviewOutputSchema = z
  .object({
    executiveSummary: z.string().min(1),
    overallRiskLevel: riskLevelSchema,
    clauses: z.array(clauseSchema).max(100),
    draftingQualityScore: z.number().min(1).max(10),
    draftingQualityBreakdown: z
      .object({
        clarity: z.number().min(1).max(10),
        completeness: z.number().min(1).max(10),
        consistency: z.number().min(1).max(10),
        riskAllocation: z.number().min(1).max(10),
        operationalPrecision: z.number().min(1).max(10),
        disputeResolution: z.number().min(1).max(10),
        draftingStructure: z.number().min(1).max(10),
      })
      .strict(),
    draftingQualityNotes: z.string(),
    recommendations: z.array(z.string()),
    contractStrengths: z.array(z.string()),
    missingClauses: z.array(missingClauseSchema).max(30),
    ambiguousProvisions: z.array(ambiguousProvisionSchema).max(100),
    legalReferences: z.array(legalReferenceSchema),
    limitations: z.array(z.string()),
  })
  .strict();
