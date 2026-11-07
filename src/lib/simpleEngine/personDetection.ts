import type { CreateThumbnailInput } from '../../types/simple.ts';

/**
 * Words in a creator request that mean a person appears in the shot.
 * Shared by the engine (interpretUserIntent) and the complementary planners so they
 * can never disagree about whether to draw a person.
 */
export const PERSON_KEYWORDS = /(^|\b)(eu|meu\s*rosto|minha\s*rea[çc][ãa]o|pessoa|homem|mulher|criador|criadora|cara|apresentador|apresentadora|youtuber|selfie|jogador|jogadora|especialista|retrato|entrevistad[oa]|convidad[oa]|streamer|influenciador|influenciadora|garot[oa]|menin[oa]|na\s*m[ãa]o|nas\s*m[ãa]os)(\b|$)/i;

/**
 * Same decision generateSimpleThumbnail makes: a person is in the shot when the request says so,
 * a PESSOA reference was supplied, or face preservation was requested.
 */
export function requestIncludesPerson(
  input: Pick<CreateThumbnailInput, 'videoTitle' | 'ideaDescription' | 'references' | 'preserveFace'>
): boolean {
  if (input.preserveFace) return true;
  if ((input.references || []).some(r => r.role === 'PESSOA')) return true;
  return PERSON_KEYWORDS.test(`${input.videoTitle || ''} ${input.ideaDescription || ''}`);
}
