/** Check Point credential prompt: username → password → OTP, shared by the TUI and CLI. */

import React, { useState } from "react";
import { Box, Text } from "ink";
import type { Service, Creds } from "../core/services.ts";
import { TextInput } from "./TextInput.tsx";
import { UI } from "./theme.ts";
import { t } from "../core/i18n.ts";

export function CheckpointConnectForm({
  service,
  onSubmit,
  onCancel,
}: {
  service: Service;
  onSubmit: (creds: Creds) => void;
  onCancel: () => void;
}): React.JSX.Element {
  const [step, setStep] = useState<"user" | "password" | "otp">("user");
  const [user, setUser] = useState(service.user ?? "");
  const [password, setPassword] = useState("");

  return (
    <Box flexDirection="column">
      <Text bold color="green">
        {t("🔐 Connect {name}", { name: service.name })}
      </Text>
      <Text color={UI.muted}>{t("Sign in with your corporate credentials and OTP.")}</Text>
      <Box marginTop={1}>
        {step === "user" ? (
          <TextInput
            key="cp-user"
            label={t("Username")}
            initialValue={user}
            placeholder="user"
            onCancel={onCancel}
            onSubmit={(v) => {
              setUser(v);
              setStep("password");
            }}
          />
        ) : step === "password" ? (
          <TextInput
            key="cp-password"
            label={t("Password")}
            mask
            placeholder={t("your password")}
            onCancel={onCancel}
            onSubmit={(v) => {
              setPassword(v);
              setStep("otp");
            }}
          />
        ) : (
          <TextInput
            key="cp-otp"
            label={t("One-time code (OTP)")}
            placeholder={t("6-digit code")}
            onCancel={onCancel}
            onSubmit={(otp) => onSubmit({ user: user || undefined, password, otp: otp || undefined })}
          />
        )}
      </Box>
    </Box>
  );
}
