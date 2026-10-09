// All UI strings, Norwegian bokmål. Keep every user-visible string here.
export const nb = {
  app: {
    name: "Kundeportal",
    studioName: "Studio",
    skipToContent: "Hopp til hovedinnhold",
  },
  common: {
    logout: "Logg ut",
    privacy: "Personvern",
    loading: "Laster …",
    back: "Tilbake",
    unexpectedError: "Noe gikk galt. Prøv igjen, eller ta kontakt hvis det fortsetter.",
  },
  auth: {
    login: {
      title: "Logg inn",
      intro: "Skriv inn e-postadressen din, så sender vi deg en lenke og en kode du kan logge inn med. Du trenger ikke passord.",
      emailLabel: "E-postadresse",
      submit: "Send meg innloggingslenke",
      sending: "Sender …",
      invalidEmail: "Skriv inn en gyldig e-postadresse, for eksempel navn@firma.no.",
      privacyLink: "Les om hvordan vi behandler personopplysninger",
    },
    checkEmail: {
      title: "Sjekk e-posten din",
      body: (email: string) =>
        `Hvis ${email} har tilgang til kundeportalen, har vi sendt en e-post med en lenke og en sekssifret kode.`,
      hint: "Klikk lenken i e-posten, eller skriv inn koden her. Finner du ikke e-posten, sjekk søppelposten.",
      codeLabel: "Sekssifret kode",
      codeHint: "Koden står i e-posten og gjelder i én time.",
      submit: "Logg inn",
      verifying: "Logger inn …",
      invalidCode: "Koden stemmer ikke, eller den er utløpt. Sjekk at du har skrevet riktig, eller be om en ny kode.",
      codeFormat: "Koden består av seks siffer.",
      resend: "Send ny kode",
      resent: "Vi har sendt en ny e-post.",
      wrongEmail: "Bruk en annen e-postadresse",
      rateLimited: "Vent litt før du ber om en ny kode.",
    },
    confirm: {
      title: "Logg inn i kundeportalen",
      body: "Trykk på knappen for å fullføre innloggingen.",
      submit: "Logg inn",
      invalidLink: "Lenken virker ikke lenger. Den kan være brukt eller utløpt. Be om en ny lenke under.",
      newLink: "Be om ny innloggingslenke",
    },
    mfa: {
      title: "Bekreft at det er deg",
      intro: "Skriv inn den sekssifrede koden fra autentiseringsappen din.",
      codeLabel: "Kode fra autentiseringsappen",
      submit: "Bekreft",
      invalidCode: "Koden stemmer ikke. Koden byttes hvert 30. sekund – prøv den som vises nå.",
      factorLabel: "Autentiseringsapp",
    },
    security: {
      title: "Sikkerhet",
      intro: "Administratorkontoen ser alle kundene, så den krever en ekstra kode fra en autentiseringsapp i tillegg til e-post.",
      enrollTitle: "Sett opp autentiseringsapp",
      enrollSteps: [
        "Åpne en autentiseringsapp, for eksempel 1Password, Google Authenticator eller Microsoft Authenticator.",
        "Skann QR-koden, eller skriv inn nøkkelen manuelt.",
        "Skriv inn den sekssifrede koden appen viser.",
      ],
      qrAlt: "QR-kode for å legge til kontoen i en autentiseringsapp",
      secretLabel: "Nøkkel for manuell registrering",
      nameLabel: "Navn på enheten",
      namePlaceholder: "For eksempel Telefon eller 1Password",
      start: "Start oppsett",
      verify: "Bekreft og aktiver",
      factorsTitle: "Aktive autentiseringsapper",
      noFactors: "Ingen autentiseringsapper er satt opp ennå.",
      addAnother: "Legg til en reserveapp",
      recoveryNote: "Sett gjerne opp to apper, for eksempel telefonen og 1Password, så du ikke låses ute hvis du mister den ene.",
      enrolled: "Autentiseringsappen er aktivert.",
    },
  },
  client: {
    noProjects: "Du har ingen prosjekter her ennå.",
    projectsTitle: "Prosjektene dine",
  },
  studio: {
    dashboardTitle: "Oversikt",
    nav: {
      dashboard: "Oversikt",
      clients: "Kunder",
      security: "Sikkerhet",
    },
  },
  privacy: {
    title: "Personvern",
    placeholder: "Personvernerklæringen kommer her.",
  },
} as const;

export const t = nb;
