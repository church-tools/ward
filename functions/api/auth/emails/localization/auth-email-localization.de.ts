import type { AuthEmailLocalization } from "./auth-email-localization.en";

export const AUTH_EMAIL_LOCALIZATION: AuthEmailLocalization = {
    confirm: {
        subject: "Bitte bestätigen Sie Ihre E-Mail-Adresse",
        title: "Bitte bestätigen Sie Ihre E-Mail-Adresse",
        intro: "Willkommen bei Gemeinde Tools!",
        body: "Bitte bestätigen Sie Ihre E-Mail-Adresse mit dem folgenden Link:",
        buttonLabel: "E-Mail bestätigen",
        footer: "Falls Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren.",
    },
    reset: {
        subject: "Setzen Sie Ihr Passwort zurück",
        title: "Setzen Sie Ihr Passwort zurück",
        intro: "Sie haben ein Zurücksetzen Ihres Passworts angefordert.",
        body: "Nutzen Sie den folgenden Link, um ein neues Passwort festzulegen.",
        buttonLabel: "Neues Passwort festlegen",
        footer: "Falls Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren.",
    },
    invite: {
        subject: `Einladung zu Gemeinde Tools - {{unitName}}`,
        title: `Einladung zu Gemeinde Tools - {{unitName}}`,
        intro: `Sie wurden zu {{unitName}} eingeladen.`,
        body: "Nehmen Sie die Einladung mit dem folgenden Link an.",
        buttonLabel: "Einladung annehmen",
        footer: "Der Link ist 48 Stunden gueltig.",
    },
};
