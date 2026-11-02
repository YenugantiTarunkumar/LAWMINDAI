import { describe, expect, it } from 'vitest';
import {
  DRAFT_TEMPLATES,
  getMissingRequiredFields,
} from '../src/lib/legal-drafting/types';

describe('legal drafting templates', () => {
  it('defines required fields for each supported draft type', () => {
    expect(DRAFT_TEMPLATES.length).toBeGreaterThan(0);

    for (const template of DRAFT_TEMPLATES) {
      expect(template.fields.some(({ required }) => required)).toBe(true);
      expect(
        getMissingRequiredFields(
          template.id,
          Object.fromEntries(
            template.fields.map(({ key, required }) => [key, required ? '' : '']),
          ),
        ).length,
      ).toBeGreaterThan(0);
    }
  });

  it('clears required-field errors when supplied values are non-empty', () => {
    expect(
      getMissingRequiredFields('nda', {
        disclosingParty: 'Party A',
        receivingParty: 'Party B',
        purpose: 'Evaluate a possible transaction',
        information: 'Commercial information',
      }),
    ).toEqual([]);
  });
});
