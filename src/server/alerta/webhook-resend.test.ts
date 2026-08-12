import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { emailsParaSuprimir, verificarAssinaturaSvix } from "./webhook-resend";

function assinar(secret: string, id: string, timestamp: string, body: string): string {
  const chave = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const dig = createHmac("sha256", chave).update(`${id}.${timestamp}.${body}`, "utf8").digest("base64");
  return `v1,${dig}`;
}

describe("verificarAssinaturaSvix", () => {
  const secret = "whsec_" + Buffer.from("chave-de-teste-32bytes!!!!!!").toString("base64");
  const body = '{"type":"email.bounced"}';

  it("aceita assinatura válida dentro da janela", () => {
    const id = "msg_1";
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = assinar(secret, id, timestamp, body);
    expect(verificarAssinaturaSvix(body, { id, timestamp, signature }, secret)).toBe(true);
  });

  it("rejeita assinatura adulterada", () => {
    const id = "msg_1";
    const timestamp = String(Math.floor(Date.now() / 1000));
    expect(
      verificarAssinaturaSvix(
        body,
        { id, timestamp, signature: "v1,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=" },
        secret,
      ),
    ).toBe(false);
  });

  it("rejeita timestamp velho", () => {
    const id = "msg_1";
    const timestamp = String(Math.floor(Date.now() / 1000) - 600);
    const signature = assinar(secret, id, timestamp, body);
    expect(verificarAssinaturaSvix(body, { id, timestamp, signature }, secret)).toBe(false);
  });
});

describe("emailsParaSuprimir", () => {
  it("suprime bounce permanente", () => {
    expect(
      emailsParaSuprimir({
        type: "email.bounced",
        data: { to: ["A@X.com"], bounce: { type: "Permanent" } },
      }),
    ).toEqual(["a@x.com"]);
  });

  it("NÃO suprime bounce temporário", () => {
    expect(
      emailsParaSuprimir({
        type: "email.bounced",
        data: { to: ["a@x.com"], bounce: { type: "Temporary" } },
      }),
    ).toEqual([]);
  });

  it("suprime reclamação e suppression.added", () => {
    expect(emailsParaSuprimir({ type: "email.complained", data: { to: ["b@y.com"] } })).toEqual([
      "b@y.com",
    ]);
    expect(
      emailsParaSuprimir({ type: "suppression.added", data: { email: "C@Z.com" } }),
    ).toEqual(["c@z.com"]);
  });

  it("ignora eventos irrelevantes", () => {
    expect(emailsParaSuprimir({ type: "email.delivered", data: { to: ["a@x.com"] } })).toEqual([]);
  });
});
