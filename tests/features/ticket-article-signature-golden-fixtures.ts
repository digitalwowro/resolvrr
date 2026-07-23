import {
  providerContainerEnd,
  providerContainerStart,
  type SignatureGoldenFixture,
} from "./ticket-article-signature-golden-support";

export {
  materializeSignatureGoldenFixture,
} from "./ticket-article-signature-golden-support";

/**
 * Synthetic, provider-neutral shapes for signature regressions.
 *
 * Add future production failures here after replacing names, addresses, links,
 * identifiers, and prose. Expectations describe semantic boundaries rather
 * than detector internals so implementations can evolve without weakening the
 * safety contract.
 */
export const signatureGoldenFixtures: SignatureGoldenFixture[] = [
  {
    name: "body link followed by an isolated terminal contact table",
    html: `
      <p>Hello recipient,</p>
      <p>Complete the request at <a href="https://portal.example.test/task">the account portal</a>.</p>
      <p>Please also confirm whether the record belongs to the expected customer.</p>
      <p>Cu stimă,</p>
      <table><tbody><tr><td>
        <strong>Example Agent | Partner Operations</strong><br>
        Example Product — customer solutions<br>
        <a href="https://company.example.test">company.example.test</a>
      </td></tr></tbody></table>
    `,
    expected: {
      collapsed: true,
      hiddenKind: "signature",
      visibleContains: ["account portal", "expected customer", "Cu stimă"],
      hiddenContains: ["Example Agent", "company.example.test"],
    },
  },
  {
    name: "embedded business image before a rich-media signature and quote",
    html: `
      <p>Hello team,</p>
      <p>The invoice does not match the requested account change.</p>
      <p><img src="/inline/business-document" alt="Account document"></p>
      <p>Please use the identifiers above when correcting the record.</p>
      <table><tbody>
        <tr>
          <td><img src="/inline/company-mark" alt=""></td>
          <td><img src="/inline/person" alt=""></td>
          <td><strong>Example Person</strong><br>Solutions Engineer<br>
            +1 (555) 010-1200<br>
            <a href="https://company.example.test">company.example.test</a>
          </td>
        </tr>
        <tr><td colspan="3">
          <a href="https://social.example.test/one"><img src="/inline/social-one" alt=""></a>
          <a href="https://social.example.test/two"><img src="/inline/social-two" alt=""></a>
          <a href="https://social.example.test/three"><img src="/inline/social-three" alt=""></a>
        </td></tr>
        <tr><td colspan="3">
          This communication is intended only for the addressed recipient.
          Remove it if it reached you unintentionally.
        </td></tr>
      </tbody></table>
      <div>From: Earlier Author &lt;earlier@example.test&gt;<br>
        Sent: Monday, July 20, 2026 10:00<br>
        To: Example Person &lt;person@example.test&gt;<br>
        Subject: Earlier request
      </div>
      <p>Earlier message content.</p>
    `,
    expected: {
      collapsed: true,
      hiddenKind: "trimmed-content",
      visibleContains: [
        "invoice does not match",
        "/inline/business-document",
        "identifiers above",
      ],
      hiddenContains: ["Example Person", "addressed recipient", "Earlier Author"],
    },
  },
  {
    name: "single inline quote followed by new authored content",
    html: `
      <p>Hello recipient,</p>
      <p>&gt; A selected sentence from the earlier message.</p>
      <p>How many deployments are planned during the next quarter?</p>
      <p>Please complete the required training before requesting access.</p>
      <p>--</p>
      <div>Regards,<br>Example Agent<br>
        <a href="https://company.example.test">company.example.test</a>
      </div>
    `,
    expected: {
      collapsed: true,
      hiddenKind: "signature",
      visibleContains: [
        "selected sentence",
        "How many deployments",
        "required training",
      ],
      hiddenContains: ["Example Agent", "company.example.test"],
    },
  },
  {
    name: "substantive prose before a nested terminal contact card",
    html: `
      <div>Hello recipient,</div>
      <div>
        <p>The approved record is available in the account portal.</p>
        <p>Could you confirm whether it belongs to the expected customer?</p>
        <p>We look forward to your reply.</p>
        <p>Arbitrary sign-off,</p>
        <div><table><tbody><tr><td></td><td>
          <strong>Example Agent | Customer Operations</strong><br>
          Example Product — customer solutions<br>
          <a href="https://company.example.test">company.example.test</a><br>
          <img src="/inline/company-mark" alt="">
        </td></tr></tbody></table></div>
      </div>
    `,
    expected: {
      collapsed: true,
      hiddenKind: "signature",
      visibleContains: [
        "approved record",
        "expected customer",
        "Arbitrary sign-off",
      ],
      hiddenContains: ["Example Agent", "/inline/company-mark"],
    },
  },
  {
    name: "overbroad provider container refined to its terminal contact card",
    hint: "provider-container",
    html: `
      <p>Hello recipient,</p>
      ${providerContainerStart}<div>
        <p>Here is the updated account data in our systems.</p>
        <p>The registered organization and contact details now match the request.</p>
        <p><img src="/inline/business-evidence" alt="Updated record"></p>
        <p>Could you confirm that everything is correct?</p>
        <p>Regards,</p>
        <table><tbody><tr><td>
          <strong>Example Agent | Channel Operations</strong><br>
          Example Product — infrastructure solutions<br>
          <a href="https://company.example.test">company.example.test</a><br>
          <img src="/inline/company-mark" alt="">
        </td></tr></tbody></table>
      </div>${providerContainerEnd}
    `,
    expected: {
      collapsed: true,
      hiddenKind: "signature",
      visibleContains: [
        "updated account data",
        "registered organization",
        "/inline/business-evidence",
        "everything is correct",
        "Regards",
      ],
      hiddenContains: ["Example Agent", "/inline/company-mark"],
    },
  },
  {
    name: "short message before an image contact signature and disclaimer",
    html: `
      <p>Hello team,</p>
      <p>The requested change is complete.</p>
      <p>Arbitrary sign-off</p>
      <div>
        <strong>Example Person | Client Executive</strong><br>
        <strong>Mobile: +1 (555) 010-1200</strong><br>
        <a href="mailto:person@example.test">person@example.test</a>
        <div><img src="/inline/large-company-logo" alt="Company"></div>
      </div>
      <p>This communication is intended only for the addressed recipient. If it
        reached another party unintentionally, it must not be read, retained,
        distributed, or used and should be removed from that system.</p>
    `,
    expected: {
      collapsed: true,
      hiddenKind: "signature",
      visibleContains: ["requested change is complete", "Arbitrary sign-off"],
      hiddenContains: [
        "Example Person",
        "/inline/large-company-logo",
        "addressed recipient",
      ],
    },
  },
];
