import { describe, expect, it } from "vitest";
import {
  providerSignatureBoundary,
  trimWithProviderSignatureBoundary,
} from "./ticket-article-signature-test-helpers";

const nestedEnvelope = `
  <div>
    <table><tbody><tr><td>
      <table><tbody><tr><td>
        <table><tbody><tr><td>
          <img src="/inline/company-mark" alt="">
        </td></tr></tbody></table>
        <table><tbody><tr><td>
          <table><tbody>
            <tr><td><img src="/inline/person" alt=""></td></tr>
            <tr><td>Example Person</td></tr>
            <tr><td>Account Executive</td></tr>
            <tr><td>+44 (0) 1234 567890</td></tr>
            <tr><td>
              <a href="https://company.example.test">
                https://company.example.test
              </a>
            </td></tr>
          </tbody></table>
          <table><tbody><tr>
            <td><a href="https://social.example.test/one">
              <img src="/inline/social-one" alt="">
            </a></td>
            <td><a href="https://social.example.test/two">
              <img src="/inline/social-two" alt="">
            </a></td>
            <td><a href="https://social.example.test/three">
              <img src="/inline/social-three" alt="">
            </a></td>
            <td><a href="https://social.example.test/four">
              <img src="/inline/social-four" alt="">
            </a></td>
          </tr></tbody></table>
        </td></tr></tbody></table>
      </td></tr></tbody></table>
      <table><tbody><tr><td>
        This communication and its included files are intended for the addressed
        recipient. If it reached another party unintentionally, it should be
        removed without being retained or distributed further.
      </td></tr></tbody></table>
    </td></tr></tbody></table>
  </div>
`;

const quotedHistory = `
  <div>
    From: Earlier Author &lt;earlier@example.test&gt;<br>
    Sent: Monday, July 20, 2026 10:00<br>
    To: Example Person &lt;person@example.test&gt;<br>
    Subject: Earlier request
  </div>
  <p>Older message content.</p>
`;

describe("nested signature envelope detection", () => {
  it("moves an end-positioned provider marker before the contact envelope", () => {
    const result = trimWithProviderSignatureBoundary(`
      <div>Any update on this inquiry?</div>
      ${nestedEnvelope}
      <div><br></div>
      ${providerSignatureBoundary}
      ${quotedHistory}
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("trimmed-content");
    expect(result.visibleHtml).toContain("Any update on this inquiry?");
    expect(result.visibleHtml).not.toContain("Example Person");
    expect(result.hiddenHtml).toContain("Example Person");
    expect(result.hiddenHtml).toContain("social-three");
    expect(result.hiddenHtml).toContain("addressed");
    expect(result.hiddenHtml).toContain("recipient");
    expect(result.hiddenHtml).toContain("Earlier Author");
  });

  it("does not move the boundary when only a short greeting precedes it", () => {
    const result = trimWithProviderSignatureBoundary(`
      <div>Hello recipient,</div>
      ${nestedEnvelope}
      ${providerSignatureBoundary}
      ${quotedHistory}
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.visibleHtml).toContain("Example Person");
    expect(result.hiddenHtml).toContain("Earlier Author");
  });

  it("preserves a normal provider marker placed before the signature", () => {
    const result = trimWithProviderSignatureBoundary(`
      <p>The requested account update has now been completed.</p>
      ${providerSignatureBoundary}
      ${nestedEnvelope}
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.visibleHtml).toContain("account update");
    expect(result.visibleHtml).not.toContain("Example Person");
    expect(result.hiddenHtml).toContain("Example Person");
  });
});
