import { describe, expect, it } from "vitest";
import { trimArticleBodyHtml } from "@/features/workspace/components/ticket-article-body-trim";

describe("precision-first article signature detection", () => {
  it("keeps the full message and sign-off before a terminal signature table", () => {
    const result = trimArticleBodyHtml(`
      <div><div>
        <p>Hello,</p>
        <p>Please complete the form at <a href="https://portal.example.test/register">the registration portal</a> and send the requested information.</p>
        <p>Could you also confirm whether the account is already listed in your system?</p>
        <p>Cu stimă,</p>
        <br><br>
        <table><tbody><tr><td>
          <div><strong>Example Agent | Partner Team</strong></div>
          <div><strong>Example Product</strong> — customer solutions</div>
          <div><strong>W:</strong> <a href="https://company.example.test">company.example.test</a></div>
        </td></tr></tbody></table><br>
      </div></div>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("signature");
    expect(result.visibleHtml).toContain("registration portal");
    expect(result.visibleHtml).toContain("Could you also confirm");
    expect(result.visibleHtml).toContain("Cu stimă,");
    expect(result.visibleHtml).not.toContain("Example Agent");
    expect(result.hiddenHtml).toContain("Example Agent");
  });

  it("keeps arbitrary Unicode sign-offs visible before structural signatures", () => {
    const result = trimArticleBodyHtml(`
      <p>本文には複数の言語を使用できます。</p>
      <p>よろしくお願いいたします。</p>
      <br><br>
      <address>
        <div>Example Agent</div>
        <div>Customer Operations</div>
        <div>agent@example.test</div>
      </address>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.visibleHtml).toContain("よろしくお願いいたします。");
    expect(result.hiddenHtml).toContain("Example Agent");
  });

  it("collapses a contact-card table even when a short reply is smaller", () => {
    const result = trimArticleBodyHtml(`
      <div>
        <div>I sent the invitation. Please confirm receipt.</div>
        <div>Arbitrary sign-off</div>
        <div>
          <table><tbody><tr><td></td><td>
            <div><strong>Example Agent | Customer Operations</strong></div>
            <div><strong>Example Product</strong> — service team</div>
            <div><strong>W:</strong> <a href="https://company.example.test">https://company.example.test</a></div>
          </td></tr></tbody></table>
        </div>
      </div>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.visibleHtml).toContain("Please confirm receipt");
    expect(result.visibleHtml).toContain("Arbitrary sign-off");
    expect(result.visibleHtml).not.toContain("Example Agent");
    expect(result.hiddenHtml).toContain("Example Agent");
  });

  it("prefers an earlier compact contact block over a quoted marker", () => {
    const result = trimArticleBodyHtml(`
      <div>
        <div>The available times are listed above.</div>
        <div>Arbitrary sign-off</div>
        <div>
          <strong>Example Person | Client Executive</strong><br>
          <strong>+1 (555) 867-5309</strong><br>
          <u>person@example.test</u>
        </div>
        <div>Earlier author<br><span data-resolvrr-signature-boundary="explicit"></span></div>
        <div>Older signature content with enough text to keep the disclosure useful.</div>
      </div>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.visibleHtml).toContain("Arbitrary sign-off");
    expect(result.visibleHtml).not.toContain("Example Person");
    expect(result.hiddenHtml).toContain("Example Person");
    expect(result.hiddenHtml).toContain("Older signature content");
  });

  it("does not treat multiple message links as a signature", () => {
    const result = trimArticleBodyHtml(`
      <p>Review <a href="https://docs.example.test/a">document A</a>.</p>
      <p>Then submit <a href="https://portal.example.test/b">form B</a>.</p>
      <p>Send the confirmation to agent@example.test when complete.</p>
    `);

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("document A");
    expect(result.visibleHtml).toContain("form B");
  });

  it("does not collapse a nonterminal linked business table", () => {
    const result = trimArticleBodyHtml(`
      <p>Please review this account.</p><br><br>
      <table><tbody><tr><td><a href="https://account.example.test">Account record</a></td><td>Pending</td></tr></tbody></table>
      <p>The table is part of the message and this paragraph must remain visible.</p>
    `);

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("Account record");
    expect(result.visibleHtml).toContain("must remain visible");
  });

  it("fails open for a terminal table without contact evidence", () => {
    const result = trimArticleBodyHtml(`
      <p>Here is the requested summary.</p><br><br>
      <table><tbody>
        <tr><th>Item</th><th>Status</th></tr>
        <tr><td>Migration</td><td>Complete</td></tr>
        <tr><td>Validation</td><td>Complete</td></tr>
      </tbody></table>
    `);

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("Migration");
  });

  it("keeps compact notification content visible when it dominates the message", () => {
    const result = trimArticleBodyHtml(`
      <p>Account notification</p><br>
      <table><tbody><tr><td>
        <div><strong>A customer initiated a workflow that requires review.</strong></div>
        <div><a href="https://portal.example.test/review">Open the workflow</a></div>
        <div>Reference: 12345</div>
      </td></tr></tbody></table>
    `);

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("Open the workflow");
  });

  it("keeps emphasized contact details inside an ongoing message visible", () => {
    const result = trimArticleBodyHtml(`
      <p><strong>Call +1 (555) 123-4567 or email agent@example.test for the incident.</strong></p>
      <p>This paragraph continues the authored message after those contact details.</p>
    `);

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("continues the authored message");
  });

  it("keeps terminal linked data tables visible", () => {
    const result = trimArticleBodyHtml(`
      <p>This detailed review explains why each project item must remain visible. It contains enough surrounding prose that a simple size ratio alone must not classify the following business table as a signature.</p><br>
      <table><tbody>
        <tr><th>Item</th><th>Link</th></tr>
        <tr><td>Migration</td><td><a href="https://project.example.test/a">Review</a></td></tr>
        <tr><td>Validation</td><td>Complete</td></tr>
      </tbody></table>
    `);

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("Migration");
  });

  it("prefers an explicit boundary over earlier linked content", () => {
    const result = trimArticleBodyHtml(`
      <p>Use <a href="https://one.example.test">one</a> and <a href="https://two.example.test">two</a> to complete the work.</p>
      <p>Arbitrary sign-off</p>
      <span data-resolvrr-signature-boundary="explicit"></span>
      <div>Example Agent<br>Customer Operations<br>agent@example.test</div>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.visibleHtml).toContain("one");
    expect(result.visibleHtml).toContain("Arbitrary sign-off");
    expect(result.hiddenHtml).toContain("Example Agent");
  });
});
