import type { AuthEmailLocalization } from "./auth-email-localization.en";

export const AUTH_EMAIL_LOCALIZATION: AuthEmailLocalization = {
    appName: "Gemeinde Tools",
    confirm: {
        subject: "Gemeinde Tools: E-Mail-Adresse bestätigen",
        title: "E-Mail-Adresse bestätigen",
        body: "Willkommen bei Gemeinde Tools!\nBitte bestätigen Sie Ihre E-Mail-Adresse mit dem folgenden Link:",
        buttonLabel: "E-Mail bestätigen",
        buttonNote: "Dieser Link ist 24 Stunden gültig.",
        footer: "Falls Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren.",
    },
    reset: {
        subject: "Gemeinde Tools: Passwort zurücksetzen",
        title: "Passwort zurücksetzen",
        body: "Sie haben ein Zurücksetzen Ihres Passworts angefordert.\nNutzen Sie den folgenden Link, um ein neues Passwort festzulegen.",
        buttonLabel: "Neues Passwort festlegen",
        buttonNote: "Dieser Link ist 24 Stunden gültig.",
        footer: "Falls Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren.",
    },
    invite: {
        subject: `Gemeinde Tools: Einladung zu {{unitName}}`,
        title: `Einladung zu Gemeinde Tools - {{unitName}}`,
        body: "Sie wurden zu {{unitName}} eingeladen.\nNehmen Sie die Einladung mit dem folgenden Link an.",
        buttonLabel: "Einladung annehmen",
        buttonNote: "Dieser Link ist 48 Stunden gültig.",
        footer: null,
    },
};
