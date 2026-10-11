import { describe, expect, it } from 'vitest';
import {
  normalizeCartagenaListing,
  parseCartagenaList,
} from './cartagena-import.js';

const url = 'https://cartagena.gov.co/convocatorias/mi-primera-chamba-15668';
const listing = { url, title: 'MI PRIMERA CHAMBA PRIMER SEMESTRE 2027...' };
const detail = `
  <span class="field--name-title">CONVOCATORIA MI PRIMERA CHAMBA PRIMER SEMESTRE 2027 PARA PRÁCTICAS LABORALES</span>
  <span class="field--name-created"><time datetime="2026-10-08T09:30:52-05:00">Oct 8, 2026</time></span>
  <div class="field--name-field-fecha-de-cierre"><time datetime="2026-11-21T04:57:53Z">20/11/2026</time></div>`;

describe('Cartagena public listing import', () => {
  it('selects relevant open notices and follows the public pagination link', () => {
    const html = `<div id="views-bootstrap-vista-de-participacion-documental-block-1">
      <div class="card-body"><p class="card-title"><a href="/convocatorias/mi-primera-chamba-15668">Mi Primera Chamba</a></p><small>Abierta</small></div>
      <div class="card-body"><p class="card-title"><a href="/convocatorias/old-course">Curso de formación</a></p><small>Cerrada</small></div>
      <div class="card-body"><p class="card-title"><a href="/convocatorias/election">Elección de representantes</a></p><small>Abierta</small></div>
    </div><a rel="next" href="?page=1">Next</a>`;
    expect(parseCartagenaList(html)).toEqual({
      listings: [{ url, title: 'Mi Primera Chamba' }],
      nextUrl: 'https://cartagena.gov.co/convocatorias?page=1',
    });
  });

  it('keeps only factual metadata and the official application link', () => {
    const item = normalizeCartagenaListing(
      listing,
      detail,
      new Date('2026-10-10T12:00:00Z'),
    );
    expect(item).toMatchObject({
      title: 'Mi Primera Chamba — prácticas laborales, primer semestre de 2027',
      type: 'INTERNSHIP',
      locationPhysical: 'Cartagena, Bolívar',
      sourceUrl: url,
      sourceName: 'Alcaldía de Cartagena',
    });
    expect(item?.closingDate.toISOString()).toBe('2026-11-21T04:57:53.000Z');
    expect(item?.description).not.toContain('PRÁCTICAS LABORALES');
  });

  it('rejects expired notices and links outside the official site', () => {
    expect(
      normalizeCartagenaListing(
        listing,
        detail,
        new Date('2026-12-01T12:00:00Z'),
      ),
    ).toBeNull();
    expect(
      normalizeCartagenaListing(
        {
          ...listing,
          url: 'https://example.com/convocatorias/mi-primera-chamba-15668',
        },
        detail,
      ),
    ).toBeNull();
  });
});
