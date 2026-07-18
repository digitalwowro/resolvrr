import { describe, expect, it } from "vitest";
import { zammadOutboundBody } from "@/providers/zammad/outbound-signature";

const signature = {
  contextVersion: "reviewed-v1",
  renderedHtml: '<p><strong>Agent</strong><br><img src="data:image/png;base64,AQID"></p>',
  source: "zammad" as const,
};

describe("Zammad outbound signature composition", () => {
  it("converts a plain reply to HTML and appends the reviewed signature", () => {
    expect(zammadOutboundBody({
      body: "Hello\nCustomer",
      bodyFormat: "plain",
      signature,
    })).toEqual({
      body: '<p>Hello<br>Customer</p><div><br></div><div class="js-signatureMarker"><p><strong>Agent</strong><br><img src="data:image/png;base64,AQID"></p></div>',
      contentType: "text/html",
    });
  });

  it("keeps unsigned plain replies as text/plain", () => {
    expect(zammadOutboundBody({ body: "Hello", bodyFormat: "plain" })).toEqual({
      body: "Hello",
      contentType: "text/plain",
    });
  });

  it("places a forward signature before the forwarded message", () => {
    const result = zammadOutboundBody({
      body: "Please review",
      bodyFormat: "plain",
      conversationHistoryHtml: "<blockquote>Conversation history</blockquote>",
      signature,
    });
    expect(result.body.indexOf("js-signatureMarker")).toBeLessThan(
      result.body.indexOf("Conversation history"),
    );
  });
});
