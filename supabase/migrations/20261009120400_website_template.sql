-- Default "Website" process template, kickoff questionnaire, domain/access form and
-- a starting maintenance plan. This is production data, not demo data.
-- Edit wording and prices freely later; projects keep their own copy of phases and steps.

insert into public.form_definitions (key, title, description, schema) values (
  'kickoff-service-business',
  'Oppstartsskjema',
  'Svarene gir oss det vi trenger for å lage en nettside som passer dere. Skriv fritt – stikkord holder. Du kan lagre underveis og fortsette senere.',
  $json$
  {
    "sections": [
      {
        "title": "Om bedriften",
        "fields": [
          { "key": "what_you_do", "label": "Hva gjør dere?", "kind": "textarea", "required": true },
          { "key": "how_long", "label": "Hvor lenge har dere holdt på?", "kind": "text" },
          { "key": "difference", "label": "Hva skiller dere fra konkurrentene?", "kind": "textarea", "required": true }
        ]
      },
      {
        "title": "Tjenester og priser",
        "fields": [
          { "key": "services", "label": "Hvilke tjenester skal vises på nettsiden?", "help": "Én tjeneste per linje.", "kind": "textarea", "required": true },
          { "key": "show_prices", "label": "Skal priser vises?", "kind": "select", "options": ["Ja", "Nei", "Bare «fra»-priser", "Usikker"] }
        ]
      },
      {
        "title": "Område",
        "fields": [
          { "key": "location", "label": "Hvor holder dere til?", "kind": "text" },
          { "key": "service_area", "label": "Hvilke områder dekker dere?", "kind": "textarea" }
        ]
      },
      {
        "title": "Kunder",
        "fields": [
          { "key": "best_customers", "label": "Hvem er de beste kundene deres?", "kind": "textarea" },
          { "key": "customer_questions", "label": "Hva lurer kundene på før de tar kontakt?", "kind": "textarea" }
        ]
      },
      {
        "title": "Kontakt",
        "fields": [
          { "key": "contact_methods", "label": "Hvordan skal kundene ta kontakt eller bestille?", "kind": "multiselect", "options": ["Telefon", "Kontaktskjema", "E-post", "Bookingsystem", "Annet"] },
          { "key": "contact_details", "label": "Telefonnummer, e-postadresse eller lenke til bookingsystem", "kind": "textarea" }
        ]
      },
      {
        "title": "Mål",
        "fields": [
          { "key": "goals", "label": "Hva skal nettsiden oppnå?", "kind": "textarea", "required": true },
          { "key": "success", "label": "Hvordan vet vi at den fungerer?", "help": "For eksempel flere henvendelser, færre spørsmål på telefon eller flere bestillinger.", "kind": "textarea" }
        ]
      },
      {
        "title": "Nåværende nettside",
        "fields": [
          { "key": "current_url", "label": "Adresse til nåværende nettside", "kind": "url" },
          { "key": "current_works", "label": "Hva fungerer bra i dag?", "kind": "textarea" },
          { "key": "current_not_working", "label": "Hva fungerer ikke?", "kind": "textarea" }
        ]
      },
      {
        "title": "Google-bedriftsprofil",
        "fields": [
          { "key": "gbp_exists", "label": "Har dere en Google-bedriftsprofil?", "kind": "select", "options": ["Ja", "Nei", "Vet ikke"] },
          { "key": "gbp_access", "label": "Hvem har tilgang til den?", "kind": "text" }
        ]
      },
      {
        "title": "Konkurrenter og inspirasjon",
        "fields": [
          { "key": "inspiration", "label": "Lenker til nettsider dere liker, og hva dere liker med dem", "kind": "textarea" },
          { "key": "competitors", "label": "Hvem er de viktigste konkurrentene?", "kind": "textarea" }
        ]
      },
      {
        "title": "Sider",
        "fields": [
          { "key": "pages", "label": "Hvilke sider trenger dere?", "help": "For eksempel Forside, Tjenester, Om oss, Kontakt.", "kind": "textarea" }
        ]
      },
      {
        "title": "Oppdatering",
        "fields": [
          { "key": "self_edit", "label": "Hva tror dere at dere vil endre selv?", "kind": "textarea" },
          { "key": "edit_frequency", "label": "Hvor ofte?", "kind": "select", "options": ["Hver uke", "Hver måned", "Noen ganger i året", "Sjelden"] }
        ]
      },
      {
        "title": "Tidsplan",
        "fields": [
          { "key": "launch_date", "label": "Ønsket lanseringsdato", "kind": "date" },
          { "key": "deadline_driver", "label": "Er det noe som styrer datoen?", "help": "For eksempel sesong, åpning eller kampanje.", "kind": "textarea" }
        ]
      }
    ]
  }
  $json$::jsonb
);

-- Field keys match public.site_details columns (binding = 'site_details').
insert into public.form_definitions (key, title, description, schema, binding) values (
  'domain-and-access',
  'Domene og tilganger',
  'Vi trenger å vite hvor domenet og e-posten deres ligger, slik at ingenting slutter å virke når den nye nettsiden går live. Ikke skriv passord her – de sender du på en annen måte.',
  $json$
  {
    "sections": [
      {
        "title": "Domene",
        "fields": [
          { "key": "domain_name", "label": "Domenenavn", "help": "For eksempel fjordlysror.no", "kind": "text", "required": true },
          { "key": "registrar", "label": "Hvor er domenet registrert?", "help": "For eksempel Domeneshop, One.com eller Webhuset. Vet du ikke, skriv «vet ikke».", "kind": "text", "required": true },
          { "key": "domain_owner", "label": "Hvem eier domenet?", "kind": "select", "options": [ { "value": "client", "label": "Vi (bedriften)" }, { "value": "studio", "label": "Studioet" } ] }
        ]
      },
      {
        "title": "E-post",
        "fields": [
          { "key": "email_provider", "label": "Hvor ligger e-posten deres?", "help": "For eksempel Google Workspace, Microsoft 365 eller hos domeneleverandøren. Dette er viktig: feil endring kan stoppe e-posten.", "kind": "text", "required": true },
          { "key": "dns_provider", "label": "Hvor styres DNS?", "help": "Ofte samme sted som domenet. Vet du ikke, lar du feltet stå tomt.", "kind": "text" }
        ]
      },
      {
        "title": "Tilganger",
        "fields": [
          { "key": "access_notes", "label": "Hvem har tilgang til domenet, e-posten og nåværende nettside?", "help": "Navn og rolle holder. Ikke skriv passord.", "kind": "textarea" },
          { "key": "hosting_provider", "label": "Hvor ligger nåværende nettside?", "help": "For eksempel Wix, Squarespace eller et webhotell.", "kind": "text" },
          { "key": "google_business_profile_url", "label": "Lenke til Google-bedriftsprofilen", "kind": "url" }
        ]
      }
    ]
  }
  $json$::jsonb,
  'site_details'
);

insert into public.maintenance_plans (
  name, description, monthly_price_ore, included_minutes_per_month, includes, response_time, notice_period
) values (
  'Vedlikehold',
  'Trygg drift og små endringer hver måned.',
  149000,
  60,
  array[
    'Oppdateringer av rammeverk og avhengigheter',
    'Sikkerhetskopi og kontroll av at nettsiden virker',
    'Små endringer og justeringer inntil 1 time per måned',
    'Fast kontaktperson'
  ],
  'Svar innen 2 virkedager',
  '1 måned'
);

do $$
declare
  v_template uuid;
  v_phase uuid;
  v_kickoff uuid := (select id from public.form_definitions where key = 'kickoff-service-business');
  v_domain uuid := (select id from public.form_definitions where key = 'domain-and-access');
begin
  insert into public.process_templates (key, name, description)
  values ('website', 'Nettside', 'Design, utvikling og lansering av nettside, med overlevering og vedlikehold.')
  returning id into v_template;

  -- 1. Proposal
  insert into public.template_phases (template_id, position, name, description, step_mode)
  values (v_template, 1, 'Tilbud', 'Vi blir enige om hva som skal lages, og signerer avtalen.', 'sequential')
  returning id into v_phase;
  insert into public.template_steps (phase_id, position, title, description, owner, type, visible_to_client, max_revision_rounds, config) values
    (v_phase, 1, 'Godta tilbudet', 'Les gjennom tilbudet under Dokumenter. Godta det her, eller be om endringer hvis noe bør justeres.', 'client', 'approval', true, null,
      '{"studio_working_text": "Vi gjør klar tilbudet."}'),
    (v_phase, 2, 'Signer avtalen', 'Du får avtalen til signering på e-post. Når den er signert, markerer vi steget som fullført.', 'client', 'task', true, null, '{}'),
    (v_phase, 3, 'Velg vedlikeholdsavtale (valgfritt)', 'Vil du at vi tar oss av oppdateringer og små endringer etter lansering? Se alternativene under Dokumenter og gi beskjed i kommentarfeltet.', 'client', 'task', true, null, '{}'),
    (v_phase, 4, 'Faktura for depositum', 'Vi sender faktura for depositum. Arbeidet starter når den er betalt.', 'studio', 'task', true, null, '{}');

  -- 2. Kickoff
  insert into public.template_phases (template_id, position, name, description, step_mode)
  values (v_template, 2, 'Oppstart', 'Vi blir kjent med bedriften og målene deres.', 'sequential')
  returning id into v_phase;
  insert into public.template_steps (phase_id, position, title, description, owner, type, visible_to_client, form_definition_id, config) values
    (v_phase, 1, 'Oppstartsmøte', 'Vi tar et møte på 45–60 minutter for å gå gjennom prosjektet. Du får en invitasjon fra oss.', 'studio', 'task', true, null, '{}'),
    (v_phase, 2, 'Fyll ut oppstartsskjemaet', 'Svarene hjelper oss å lage en nettside som passer dere. Du kan lagre underveis.', 'client', 'form', true, v_kickoff, '{}');

  -- 3. Content: parallel, so the client can deliver in any order (docs/PLAN.md §6.1)
  insert into public.template_phases (template_id, position, name, description, step_mode)
  values (v_template, 3, 'Innhold', 'Du leverer tekst, bilder, logo og tilganger. Du kan gjøre punktene i den rekkefølgen som passer deg.', 'parallel')
  returning id into v_phase;
  insert into public.template_steps (phase_id, position, title, description, owner, type, visible_to_client, form_definition_id, config) values
    (v_phase, 1, 'Last opp logo', 'Logoen i best mulig kvalitet. Helst SVG, PDF, AI eller EPS (vektorfiler). PNG med gjennomsiktig bakgrunn går også. Har dere flere versjoner, for eksempel liggende og stående, last opp alle.', 'client', 'upload', true, null,
      '{"accept": ["image/svg+xml", "application/pdf", "application/postscript", "application/illustrator", "image/png"], "examples": "logo.svg, logo-hvit.png"}'),
    (v_phase, 2, 'Last opp tekster', 'Tekst til hver side, gjerne ett dokument per side. Word, Google Docs (lastet ned) eller PDF. Det trenger ikke være ferdig formulert – vi hjelper med å stramme opp.', 'client', 'upload', true, null,
      '{"accept": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "application/pdf", "text/plain"], "examples": "forside.docx, tjenester.docx"}'),
    (v_phase, 3, 'Last opp bilder', 'Bilder av dere, lokalene og arbeidet deres. Størst mulig oppløsning, JPG eller PNG – ikke bilder hentet fra Facebook eller nettsiden, de er for små. Skriv gjerne i kommentarfeltet hva bildene viser.', 'client', 'upload', true, null,
      '{"accept": ["image/jpeg", "image/png", "image/webp", "image/heic"], "examples": "team.jpg, prosjekt-1.jpg"}'),
    (v_phase, 4, 'Andre filer (valgfritt)', 'Det du ellers vil ha med: brosjyrer, sertifikater, kundeomtaler eller annet. Ikke nødvendig – hopp over hvis du ikke har noe.', 'client', 'upload', true, null, '{}'),
    (v_phase, 5, 'Domene og tilganger', 'Hvor domenet og e-posten deres ligger, og hvem som har tilgang. Vi trenger dette før lansering så ingenting slutter å virke.', 'client', 'form', true, v_domain, '{}');

  -- 4. Structure
  insert into public.template_phases (template_id, position, name, description, step_mode)
  values (v_template, 4, 'Struktur', 'Vi lager sidekart og skisser som viser hva som skal være hvor.', 'sequential')
  returning id into v_phase;
  insert into public.template_steps (phase_id, position, title, description, owner, type, visible_to_client, max_revision_rounds, config) values
    (v_phase, 1, 'Godkjenn struktur', 'Se gjennom sidekartet og skissene. Godkjenn, eller be om endringer.', 'client', 'approval', true, 2,
      '{"studio_working_text": "Vi jobber med sidekart og skisser."}');

  -- 5. Design
  insert into public.template_phases (template_id, position, name, description, step_mode)
  values (v_template, 5, 'Design', 'Vi designer de viktigste sidene.', 'sequential')
  returning id into v_phase;
  insert into public.template_steps (phase_id, position, title, description, owner, type, visible_to_client, max_revision_rounds, config) values
    (v_phase, 1, 'Godkjenn design', 'Se gjennom designet. Godkjenn, eller be om endringer. Samle gjerne alle tilbakemeldinger i én runde.', 'client', 'approval', true, 2,
      '{"studio_working_text": "Vi jobber med designet."}');

  -- 6. Development
  insert into public.template_phases (template_id, position, name, description, step_mode)
  values (v_template, 6, 'Utvikling', 'Vi bygger nettsiden. Du kan følge med på testlenken.', 'sequential')
  returning id into v_phase;
  insert into public.template_steps (phase_id, position, title, description, owner, type, visible_to_client, max_revision_rounds, config) values
    (v_phase, 1, 'Test og godkjenn nettsiden', 'Åpne testlenken på mobil og PC. Klikk deg rundt, les tekstene og prøv skjemaene. Godkjenn, eller be om endringer.', 'client', 'approval', true, 2,
      '{"studio_working_text": "Vi bygger nettsiden."}');

  -- 7. Launch: studio-only checklist, parallel so items can be ticked in any order
  insert into public.template_phases (template_id, position, name, description, step_mode)
  values (v_template, 7, 'Lansering', 'Vi gjør de siste kontrollene og publiserer nettsiden. Du trenger ikke gjøre noe.', 'parallel')
  returning id into v_phase;
  insert into public.template_steps (phase_id, position, title, description, owner, type, visible_to_client) values
    (v_phase, 1,  'Titler og metabeskrivelser på alle sider, Open Graph-bilde', null, 'studio', 'task', false),
    (v_phase, 2,  '301-videresendinger fra gamle adresser', 'Bare hvis kunden hadde nettside fra før.', 'studio', 'task', false),
    (v_phase, 3,  'Sitemap og robots.txt, Search Console satt opp og sitemap sendt inn', null, 'studio', 'task', false),
    (v_phase, 4,  'Analyse og samtykke til informasjonskapsler riktig satt opp', null, 'studio', 'task', false),
    (v_phase, 5,  'Alle skjemaer testet fra start til slutt, også hvor innsendinger havner', null, 'studio', 'task', false),
    (v_phase, 6,  'Tilgjengelighetssjekk (tastatur, skjermleser, kontrast)', null, 'studio', 'task', false),
    (v_phase, 7,  'Ytelsessjekk på mobil', null, 'studio', 'task', false),
    (v_phase, 8,  'DNS endret uten å ødelegge e-post (MX-poster kontrollert)', null, 'studio', 'task', false),
    (v_phase, 9,  'SSL virker, www og uten www videresender riktig', null, 'studio', 'task', false),
    (v_phase, 10, 'Google-bedriftsprofilen lenker til den nye nettsiden', null, 'studio', 'task', false),
    (v_phase, 11, 'CMS-tilgang satt opp for kunden', 'Hvis relevant.', 'studio', 'task', false),
    (v_phase, 12, 'Nettsiden publiseres', 'Vi publiserer nettsiden og sjekker at alt virker.', 'studio', 'task', true),
    (v_phase, 13, 'Sluttfaktura', 'Vi sender sluttfaktura.', 'studio', 'task', true);

  -- 8. Handover
  insert into public.template_phases (template_id, position, name, description, step_mode)
  values (v_template, 8, 'Overlevering', 'Du får tilgangene, en oversikt over alt som hører til nettsiden, og en kort opplæring.', 'sequential')
  returning id into v_phase;
  insert into public.template_steps (phase_id, position, title, description, owner, type, visible_to_client, max_revision_rounds, config) values
    (v_phase, 1, 'Opplæring', 'Vi viser deg hvordan du endrer innhold på nettsiden selv.', 'studio', 'task', true, null, '{}'),
    (v_phase, 2, 'Overleveringsside', 'Vi gjør klar overleveringssiden med logo, farger, fonter, domene og lenker.', 'studio', 'task', true, null, '{}'),
    (v_phase, 3, 'Bekreft at du har fått tilgangene', 'Sjekk at du kan logge inn der du skal, og marker steget som gjort.', 'client', 'task', true, null, '{}'),
    (v_phase, 4, 'Bekreft vedlikeholdsavtalen', 'Hvis du har valgt vedlikehold: se gjennom avtalen og godkjenn den.', 'client', 'approval', true, null,
      '{"studio_working_text": "Vi gjør klar vedlikeholdsavtalen."}');
end;
$$;
