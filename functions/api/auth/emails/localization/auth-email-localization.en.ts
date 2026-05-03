
export const AUTH_EMAIL_LOCALIZATION = {
    confirm: {
        subject: "Please confirm your email address",
        title: "Please confirm your email address",
        intro: "Welcome to Ward Tools!",
        body: "Please confirm your email address with the link below.",
        buttonLabel: "Confirm email",
        footer: "If you did not create an account, you can ignore this email.",
    },
    reset: {
        subject: "Reset your password",
        title: "Reset your password",
        intro: "You requested to reset your password.",
        body: "Use the link below to set a new password.",
        buttonLabel: "Set new password",
        footer: "If you did not request this, you can ignore this email.",
    },
    invite: {
        subject: `Invitation to Ward Tools - {{unitName}}`,
        title: `Invitation to Ward Tools - {{unitName}}`,
        intro: `You have been invited to {{unitName}}.`,
        body: "Accept the invitation using the link below.",
        buttonLabel: "Accept invitation",
        footer: "This link expires in 48 hours.",
    },
};

type DeepStringLeaves<T> = T extends string ? string : { [K in keyof T]: DeepStringLeaves<T[K]> };

export type AuthEmailLocalization = DeepStringLeaves<typeof AUTH_EMAIL_LOCALIZATION>;
