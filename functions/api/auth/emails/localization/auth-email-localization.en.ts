
export const AUTH_EMAIL_LOCALIZATION = {
    appName: "Ward Tools",
    confirm: {
        subject: "Ward Tools: confirm your email address",
        title: "Confirm your email address",
        body: "Welcome to Ward Tools!\nPlease confirm your email address with the link below.",
        buttonLabel: "Confirm email",
        buttonNote: "This link expires in 24 hours.",
        footer: "If you did not create an account, you can ignore this email.",
    },
    reset: {
        subject: "Ward Tools: reset your password",
        title: "Reset your password",
        body: "You requested to reset your password.\nUse the link below to set a new password.",
        buttonLabel: "Set new password",
        buttonNote: "This link expires in 24 hours.",
        footer: "If you did not request this, you can ignore this email.",
    },
    invite: {
        subject: `Ward Tools: invitation to {{unitName}}`,
        title: `Invitation to Ward Tools - {{unitName}}`,
        body: "You have been invited to {{unitName}}.\nAccept the invitation using the link below.",
        buttonLabel: "Accept invitation",
        buttonNote: "This link expires in 48 hours.",
        footer: null,
    },
};

type DeepStringLeaves<T> = T extends string ? string : { [K in keyof T]: DeepStringLeaves<T[K]> };

export type AuthEmailLocalization = DeepStringLeaves<typeof AUTH_EMAIL_LOCALIZATION>;
