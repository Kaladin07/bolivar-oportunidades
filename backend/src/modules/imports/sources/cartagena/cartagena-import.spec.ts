import { describe, expect, it } from 'vitest';
import {
  normalizeCartagenaListing,
  parseCartagenaList,
} from './cartagena-import.js';

// Synthetic fixtures that reproduce the public HTML structure. They are never
// used by the runtime importer or persisted in the database.
const url =
  'https://cartagena.gov.co/convocatorias/fixture-practicas-laborales-99999';
const listing = { url, title: 'CONVOCATORIA FICTICIA DE PRÁCTICAS 2099' };
const detail = `
  <span class="field--name-title">CONVOCATORIA FICTICIA DE PRÁCTICAS LABORALES 2099</span>
  <span class="field--name-created"><time datetime="2099-01-08T09:30:52-05:00">Jan 8, 2099</time></span>
  <div class="field--name-field-fecha-de-cierre"><time datetime="2099-02-21T04:57:53Z">20/02/2099</time></div>`;

describe('Cartagena public listing import', () => {
  it('selects relevant open notices and follows the public pagination link', () => {
    const html = `<div id="views-bootstrap-vista-de-participacion-documental-block-1">
      <div class="card-body"><p class="card-title"><a href="/convocatorias/fixture-practicas-laborales-99999">Convocatoria ficticia de prácticas</a></p><small>Abierta</small></div>
      <div class="card-body"><p class="card-title"><a href="/convocatorias/old-course">Curso de formación</a></p><small>Cerrada</small></div>
      <div class="card-body"><p class="card-title"><a href="/convocatorias/election">Elección de representantes</a></p><small>Abierta</small></div>
    </div><a rel="next" href="?page=1">Next</a>`;
    expect(parseCartagenaList(html)).toEqual({
      listings: [{ url, title: 'Convocatoria ficticia de prácticas' }],
      nextUrl: 'https://cartagena.gov.co/convocatorias?page=1',
    });
  });

  it('keeps only factual metadata and the official application link', () => {
    const item = normalizeCartagenaListing(
      listing,
      detail,
      new Date('2099-01-10T12:00:00Z'),
    );
    expect(item).toMatchObject({
      title: 'CONVOCATORIA FICTICIA DE PRÁCTICAS LABORALES 2099',
      type: 'INTERNSHIP',
      locationPhysical: 'Cartagena, Bolívar',
      sourceUrl: url,
      sourceName: 'Alcaldía de Cartagena',
    });
    expect(item?.closingDate.toISOString()).toBe('2099-02-21T04:57:53.000Z');
    expect(item?.description).not.toContain('PRÁCTICAS LABORALES');
  });

  it('rejects expired notices and links outside the official site', () => {
    expect(
      normalizeCartagenaListing(
        listing,
        detail,
        new Date('2099-03-01T12:00:00Z'),
      ),
    ).toBeNull();
    expect(
      normalizeCartagenaListing(
        {
          ...listing,
          url: 'https://example.com/convocatorias/fixture-practicas-99999',
        },
        detail,
      ),
    ).toBeNull();
  });
});
