import { describe, expect, it } from "vitest";
import { trimArticleBodyHtml } from
  "@/features/workspace/components/ticket-article-body-trim";

describe("article signature candidate containment", () => {
  it("keeps message prose outside a nested terminal contact table", () => {
    const result = trimArticleBodyHtml(`
      Hello recipient,
      <div><br></div>
      <div>
        Please review the approved record at
        <a href="https://portal.example.test/records/ABC123">
          https://portal.example.test/records/ABC123
        </a>.
        Could you confirm whether it belongs to the expected account?
        <br><br>
        We look forward to your reply.
        <br>
        <div><br></div>
        <div>Arbitrary sign-off,</div>
        <div><br></div>
        <div>
          <br>
          <table cellspacing="0" cellpadding="0" border="0">
            <tbody><tr>
              <td><br></td>
              <td>
                <div>
                  <strong>Example Agent | Customer Operations</strong><br>
                  <strong>Example Product</strong> — customer solutions
                </div>
                <div>
                  <strong>W:</strong>
                  <a href="https://company.example.test">
                    https://company.example.test
                  </a>
                </div>
                <div><img src="/inline/company-mark" alt=""></div>
              </td>
            </tr></tbody>
          </table>
          <br>
        </div>
      </div>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("signature");
    expect(result.visibleHtml).toContain("approved record");
    expect(result.visibleHtml).toContain("expected account");
    expect(result.visibleHtml).toContain("We look forward");
    expect(result.visibleHtml).toContain("Arbitrary sign-off");
    expect(result.visibleHtml).not.toContain("Example Agent");
    expect(result.hiddenHtml).toContain("Example Agent");
    expect(result.hiddenHtml).toContain("company-mark");
  });

  it("fails open when a generic linked wrapper would leave only a greeting", () => {
    const result = trimArticleBodyHtml(`
      Hello recipient,
      <div><br></div>
      <div>
        Review
        <a href="https://portal.example.test">
          https://portal.example.test
        </a>
        and then visit
        <a href="https://status.example.test">
          https://status.example.test
        </a>
        for the current status. Both links are ordinary message content.
      </div>
    `);

    expect(result.collapsed).toBe(false);
    expect(result.visibleHtml).toContain("ordinary message content");
  });

  it("collapses a terminal multi-table contact signature before quoted history", () => {
    const result = trimArticleBodyHtml(`
      <div>
        <p>Hello team,</p>
        <p>Could you confirm whether the account details are correct?</p>
        <p>Thank you</p>
        <p><br></p>
        <table>
          <tbody>
            <tr>
              <td><img src="/inline/company-mark" alt=""></td>
              <td><img src="/inline/divider" alt=""></td>
              <td><strong>Example Person<br>Account Executive</strong></td>
            </tr>
            <tr>
              <td colspan="3">
                D: +44 (0) 1234 567890 ·
                <a href="mailto:person@example.test">person@example.test</a> ·
                <a href="https://company.example.test">www.company.example.test</a>
                <a href="https://social.example.test/one"><img src="/inline/social-one" alt=""></a>
                <a href="https://social.example.test/two"><img src="/inline/social-two" alt=""></a>
              </td>
            </tr>
          </tbody>
        </table>
        <table><tbody><tr><td>
          <a href="https://company.example.test">
            <img src="/inline/brand-banner" alt="">
          </a>
        </td></tr></tbody></table>
        <table><tbody><tr><td>
          This communication and its included files are intended only for the
          addressed recipient. If it reached another party unintentionally,
          it should be removed without being retained or distributed further.
        </td></tr></tbody></table>
        <p><br></p>
        <div>
          From: Earlier Author &lt;earlier@example.test&gt;<br>
          Sent: Monday, July 20, 2026 10:00<br>
          To: Example Person &lt;person@example.test&gt;<br>
          Subject: Earlier request
        </div>
        <p>Older message content.</p>
      </div>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("trimmed-content");
    expect(result.visibleHtml).toContain("account details are correct");
    expect(result.visibleHtml).toContain("Thank you");
    expect(result.visibleHtml).not.toContain("Example Person");
    expect(result.hiddenHtml).toContain("Example Person");
    expect(result.hiddenHtml).toContain("brand-banner");
    expect(result.hiddenHtml).toContain("addressed recipient");
    expect(result.hiddenHtml).toContain("Earlier Author");
  });

  it("does not absorb message content after a contact-table sequence", () => {
    const result = trimArticleBodyHtml(`
      <p>Please review the account record.</p>
      <p><br></p>
      <table><tbody>
        <tr>
          <td><img src="/inline/company-mark" alt=""></td>
          <td><img src="/inline/person" alt=""></td>
          <td><strong>Example Person<br>Account Executive</strong></td>
        </tr>
        <tr><td colspan="3">
          D: +44 (0) 1234 567890 ·
          <a href="mailto:person@example.test">person@example.test</a> ·
          <a href="https://company.example.test">www.company.example.test</a>
        </td></tr>
      </tbody></table>
      <table><tbody><tr><td><img src="/inline/banner" alt=""></td></tr></tbody></table>
      <p>This required instruction follows the tables and must remain visible.</p>
      <div>
        From: Earlier Author &lt;earlier@example.test&gt;<br>
        Sent: Monday, July 20, 2026 10:00<br>
        To: Example Person &lt;person@example.test&gt;<br>
        Subject: Earlier request
      </div>
      <p>Older message content.</p>
    `);

    expect(result.collapsed).toBe(true);
    if (!result.collapsed) return;
    expect(result.hiddenKind).toBe("quoted-reply");
    expect(result.visibleHtml).toContain("Example Person");
    expect(result.visibleHtml).toContain("required instruction");
    expect(result.hiddenHtml).toContain("Earlier Author");
  });
});
